// 本地展示数据适配器（仅展示层，不触碰引擎卡逻辑）。
//
// 读入一份 JSON，把你自备的卡牌正文 / 风味 / 勘误与关键词说明合并到当前展示表的
// 副本里，生成可核查的三份 TypeScript 文件。它不改源码、不下载图片、不联网。
//
// 运行（仓库根，依赖已安装）：
//   server/node_modules/.bin/tsx examples/prepare-display-data.ts \
//     --input examples/display-data.example.json \
//     --out-dir .local/display-data
//
// 输入 JSON：
//   {
//     "cards":    [ { "id": "OGN-006", "text": "…", "flavor": "…", "errata": "…" } ],
//     "keywords": [ { "name": "急速", "text": "…" } ]
//   }
//   - 卡牌 id 必须已存在于 CARD_POOL 或 CARD_META；
//   - flavor / errata 只在 CARD_META 中存在；
//   - 关键词 name 必须已存在于 KEYWORD_META。
//
// 只改变 JSON 里出现的字段，其余对象与字段原样保留。生成物先人工核对 diff，
// 再由使用者自行执行单独拷贝到 ui-dev/src/data（本脚本不会写入源码目录）。

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// TypeScript 编译器由公开副本 engine 的依赖提供（相对路径，不含机器绝对路径）。
import ts from '../engine/node_modules/typescript/lib/typescript.js'

import { CARD_POOL, type PoolCard } from '../ui-dev/src/data/cardPool.ts'
import { CARD_META, type CardMeta } from '../ui-dev/src/data/cardMeta.ts'
import { KEYWORD_META, type KeywordMeta } from '../ui-dev/src/data/keywordMeta.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')
const SOURCE_DATA_DIR = resolve(REPO_ROOT, 'ui-dev/src/data')

const SOURCES = {
  cardPool: { file: 'cardPool.ts', interfaceName: 'PoolCard', constName: 'CARD_POOL', table: CARD_POOL as Record<string, unknown> },
  cardMeta: { file: 'cardMeta.ts', interfaceName: 'CardMeta', constName: 'CARD_META', table: CARD_META as Record<string, unknown> },
  keywordMeta: { file: 'keywordMeta.ts', interfaceName: 'KeywordMeta', constName: 'KEYWORD_META', table: KEYWORD_META as Record<string, unknown> },
} as const

function fail(message: string): never {
  console.error(`[prepare-display-data] 失败：${message}`)
  process.exit(1)
}

// —— 参数 ——
function parseArgs(argv: readonly string[]): { input: string; outDir: string } {
  let input: string | undefined
  let outDir = '.local/display-data'
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--input') input = argv[++i]
    else if (a === '--out-dir') outDir = argv[++i] ?? outDir
    else fail(`未知参数：${a}`)
  }
  if (!input) fail('缺少 --input <JSON 路径>')
  return { input, outDir }
}

const { input, outDir } = parseArgs(process.argv.slice(2))

const outDirResolved = resolve(process.cwd(), outDir)
if (outDirResolved === SOURCE_DATA_DIR) {
  fail(`--out-dir 不能等于源展示目录 ${SOURCE_DATA_DIR}；请输出到别处，核对 diff 后再自行拷贝`)
}

const inputPath = resolve(process.cwd(), input)
let raw: string
try {
  raw = readFileSync(inputPath, 'utf8')
} catch (e) {
  fail(`读不到输入文件 ${inputPath}：${String(e)}`)
}

let parsed: unknown
try {
  parsed = JSON.parse(raw)
} catch (e) {
  fail(`输入 JSON 解析失败：${String(e)}`)
}
if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
  fail('输入 JSON 顶层必须是对象')
}
const doc = parsed as { cards?: unknown; keywords?: unknown }

const cardsInput = doc.cards ?? []
const keywordsInput = doc.keywords ?? []
if (!Array.isArray(cardsInput)) fail('cards 必须是数组')
if (!Array.isArray(keywordsInput)) fail('keywords 必须是数组')

// —— 用类型检查器无关的 parser/printer 抽取源 interface 与类型注解 ——
function extractSourceParts(sourceFile: string, interfaceName: string, constName: string): { iface: string; typeAnnotation: string } {
  const abs = resolve(SOURCE_DATA_DIR, sourceFile)
  const sf = ts.createSourceFile(abs, readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  let iface = ''
  let typeAnnotation = ''
  sf.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      iface = printer.printNode(ts.EmitHint.Unspecified, node, sf)
    }
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === constName && decl.type) {
          typeAnnotation = printer.printNode(ts.EmitHint.Unspecified, decl.type, sf)
        }
      }
    }
  })
  if (!iface) fail(`源文件 ${sourceFile} 里找不到 interface ${interfaceName}`)
  if (!typeAnnotation) fail(`源文件 ${sourceFile} 里找不到 ${constName} 的类型注解`)
  return { iface, typeAnnotation }
}

// —— 深拷贝基线并合并 ——
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
const cardPool = structuredClone(CARD_POOL) as Record<string, Mutable<PoolCard>>
const cardMeta = structuredClone(CARD_META) as Record<string, Mutable<CardMeta>>
const keywordMeta = structuredClone(KEYWORD_META) as Record<string, Mutable<KeywordMeta>>

const changed: string[] = []

for (const entry of cardsInput) {
  if (typeof entry !== 'object' || entry === null) fail('cards 项必须是对象')
  const row = entry as Record<string, unknown>
  const id = row.id
  if (typeof id !== 'string' || id.length === 0) fail('cards 项缺少字符串 id')
  const inPool = Object.prototype.hasOwnProperty.call(cardPool, id)
  const inMeta = Object.prototype.hasOwnProperty.call(cardMeta, id)
  if (!inPool && !inMeta) fail(`未知卡牌 id "${id}"：必须已存在于 CARD_POOL 或 CARD_META`)
  if (row.text !== undefined) {
    if (typeof row.text !== 'string') fail(`卡牌 "${id}" 的 text 必须是字符串`)
    if (inPool) cardPool[id]!.text = row.text
    if (inMeta) cardMeta[id]!.text = row.text
    changed.push(`${id}.text`)
  }
  if (row.flavor !== undefined) {
    if (!inMeta) fail(`卡牌 "${id}" 不在 CARD_META 中，没有 flavor 字段`)
    if (typeof row.flavor !== 'string') fail(`卡牌 "${id}" 的 flavor 必须是字符串`)
    cardMeta[id]!.flavor = row.flavor
    changed.push(`${id}.flavor`)
  }
  if (row.errata !== undefined) {
    if (!inMeta) fail(`卡牌 "${id}" 不在 CARD_META 中，没有 errata 字段`)
    if (typeof row.errata !== 'string') fail(`卡牌 "${id}" 的 errata 必须是字符串`)
    cardMeta[id]!.errata = row.errata
    changed.push(`${id}.errata`)
  }
}

for (const entry of keywordsInput) {
  if (typeof entry !== 'object' || entry === null) fail('keywords 项必须是对象')
  const row = entry as Record<string, unknown>
  const name = row.name
  if (typeof name !== 'string' || name.length === 0) fail('keywords 项缺少字符串 name')
  if (!Object.prototype.hasOwnProperty.call(keywordMeta, name)) {
    fail(`未知关键词 "${name}"：必须已存在于 KEYWORD_META`)
  }
  if (typeof row.text !== 'string') fail(`关键词 "${name}" 的 text 必须是字符串`)
  keywordMeta[name]!.text = row.text
  changed.push(`${name}.text`)
}

// —— 渲染输出（interface 原样来自 printer，正文用 JSON.stringify 安全编码）——
function render(sourceKey: keyof typeof SOURCES, data: Record<string, unknown>): string {
  const s = SOURCES[sourceKey]
  const { iface, typeAnnotation } = extractSourceParts(s.file, s.interfaceName, s.constName)
  return [
    '// 由 examples/prepare-display-data.ts 生成：仅展示层数据，不参与引擎卡逻辑。',
    '// 使用前请备份 ui-dev/src/data 并核对 diff，再自行执行单独拷贝。',
    '',
    iface,
    '',
    `export const ${s.constName}: ${typeAnnotation} = ${JSON.stringify(data, null, 2)}`,
    '',
  ].join('\n')
}

mkdirSync(outDirResolved, { recursive: true })
writeFileSync(resolve(outDirResolved, 'cardPool.ts'), render('cardPool', cardPool))
writeFileSync(resolve(outDirResolved, 'cardMeta.ts'), render('cardMeta', cardMeta))
writeFileSync(resolve(outDirResolved, 'keywordMeta.ts'), render('keywordMeta', keywordMeta))

console.log('[prepare-display-data] 已生成：')
for (const f of ['cardPool.ts', 'cardMeta.ts', 'keywordMeta.ts']) {
  console.log(`  ${relative(process.cwd(), resolve(outDirResolved, f))}`)
}
console.log(`[prepare-display-data] 共修改字段 ${changed.length} 项：${changed.join(', ') || '（无）'}`)
console.log('[prepare-display-data] 下一步：先 diff 核对，再自行拷贝到 ui-dev/src/data；本工具不改源码、不下载图片、不联网。')
