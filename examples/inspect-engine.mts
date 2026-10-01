// 指标复算：从公开副本的真实运行时模块统计登记口径，并用 TypeScript 类型检查器
// 读取协议联合类型。所有计数都来自真实导入或类型检查器，脚本内不硬编码任何数字。
//
// 运行（仓库根，依赖已安装）：
//   server/node_modules/.bin/tsx examples/inspect-engine.mts
//
// 输出为 JSON，字段可对照 docs/METRICS.md。

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// TypeScript 编译器由公开副本 engine 的依赖提供（相对路径，不含机器绝对路径）。
const ts = (await import('../engine/node_modules/typescript/lib/typescript.js')).default

import { CARD_POOL } from '../ui-dev/src/data/cardPool.ts'
import { VARIANT_GROUPS } from '../engine/data/variantAliases.ts'
import { CARD_CATEGORIES } from '../engine/data/cardCategories.ts'
import { PLAY_SPECS, TRIGGER_FACTORIES, activatedFor } from '../engine/data/registry.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..')

const ids = Object.keys(CARD_POOL)

let selectableWithActivated = 0
let activatedSpecsSum = 0
for (const id of ids) {
  const specs = activatedFor(id)
  if (specs.length > 0) selectableWithActivated++
  activatedSpecsSum += specs.length
}

// —— 用类型检查器读取联合类型的 `kind` 字面量 ——
const program = ts.createProgram({
  rootNames: [
    resolve(REPO_ROOT, 'engine/src/loop/events.ts'),
    resolve(REPO_ROOT, 'engine/src/session/interactiveGame.ts'),
  ],
  options: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
    strict: false,
  },
})
const checker = program.getTypeChecker()

function unionKindLiterals(relPath: string, typeName: string): string[] {
  const source = program.getSourceFile(resolve(REPO_ROOT, relPath))
  if (!source) throw new Error(`找不到源文件：${relPath}`)
  let alias: import('../engine/node_modules/typescript/lib/typescript.js').TypeAliasDeclaration | undefined
  ts.forEachChild(source, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) alias = node
  })
  if (!alias) throw new Error(`找不到类型别名：${typeName}`)
  const rootType = checker.getTypeAtLocation(alias.type)
  const kinds = new Set<string>()
  const visit = (t: import('../engine/node_modules/typescript/lib/typescript.js').Type): void => {
    if (t.isUnion()) {
      for (const member of t.types) visit(member)
      return
    }
    const kindProp = t.getProperty('kind')
    if (!kindProp) return
    const kindType = checker.getTypeOfSymbolAtLocation(kindProp, alias!)
    if (kindType.isStringLiteral()) kinds.add(kindType.value)
    else if (kindType.isUnion()) {
      for (const m of kindType.types) if (m.isStringLiteral()) kinds.add(m.value)
    }
  }
  visit(rootType)
  return [...kinds].sort()
}

const gameEventKinds = unionKindLiterals('engine/src/loop/events.ts', 'GameEvent')
const interactiveActionKinds = unionKindLiterals(
  'engine/src/session/interactiveGame.ts',
  'InteractiveAction',
)

const result = {
  card_pool_keys: ids.length,
  card_pool_playable_true: ids.filter((id) => CARD_POOL[id]!.playable).length,
  card_categories_keys: Object.keys(CARD_CATEGORIES).length,
  variant_groups_keys: Object.keys(VARIANT_GROUPS).length,
  variant_groups_distinct: new Set(
    Object.values(VARIANT_GROUPS).map((g) => [...g].sort().join('|')),
  ).size,
  play_specs_keys: Object.keys(PLAY_SPECS).length,
  trigger_factories_keys: Object.keys(TRIGGER_FACTORIES).length,
  selectable_ids_with_activated_specs: selectableWithActivated,
  activated_specs_sum: activatedSpecsSum,
  game_event_kinds: gameEventKinds.length,
  interactive_action_kinds: interactiveActionKinds.length,
  game_event_kind_list: gameEventKinds,
  interactive_action_kind_list: interactiveActionKinds,
}

console.log(JSON.stringify(result, null, 2))
