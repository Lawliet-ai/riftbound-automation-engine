                                     
  
                                                           
                                           
                                              
  
          
                                                             
                                                                             
                                         
  
                                                      
                                                  
                                              
                                                      
                           
  
                              
                                                        
                                                               
                                                     
                                          
                                                 
                                                                    
                                                   
                                                              
                                                                        
                                              
                                                                               
                                                                     
                                                       
                                                   

import {
  emptyDraft, addToMain, removeFromMain, canAddToMain, canAddBattlefield, draftEntries, draftSummary,
  addToSide, removeFromSide, canAddToSide, sideEntries,
  canAddRune, addToRune, removeFromRune, runeEntries,
  battlefieldEntries, removeBattlefield,
  draftToDeck, costCurve, CURVE_MAX, type DeckDraft, type DraftEntry,
} from '../../engine/src/game/deckDraft'
import type { Deck } from '../../engine/src/game/setup'
import { encodeDeck, decodeDeck } from '../../engine/src/game/deckCode'
import { deckFacts, runeIdOf, kindOf } from '../../engine/data/registry'

                                                    
const DECODE_OPTS = { runeIdOf, kindOf }

import { RUNE_DECK_SIZE, BATTLEFIELDS_1V1 } from '../../engine/src/game/deckLegality'
import { buildImportReport, type ImportReport } from '../../engine/src/game/deckImportReport'
import { CARD_FACTS } from '../../engine/data/cardFacts'
import { CARD_POOL, type PoolCard } from './data/cardPool'
import { cardThumb, cardImg } from './cards'                
import { cardDetailHtml, cardDetailStyles } from './cardDetail'
import type { CardMeta } from './data/cardMeta'
import { deckRows, getDeck, putDeck, deleteDeck, newDeckId, migrateLegacyDecks } from './deckLibrary'
import { DEV } from './online'

   
                                                
                                              
   
const POOL_LIST: readonly PoolCard[] = Object.values(CARD_POOL)
                                                           
const POOL_TOTAL = POOL_LIST.length

   
                                                             
                                                    
                                           
                                              
                                                 
                                        
                                         
                                                          
                                                                
   
const FAMILIES: readonly { readonly v: string; readonly types: readonly string[] }[] = [
  { v: '单位', types: ['单位', '英雄单位', '专属单位', '指示物单位'] },
  { v: '法术', types: ['法术', '专属法术'] },
  { v: '装备', types: ['装备', '专属装备'] },
  { v: '战场', types: ['战场'] },
  { v: '传奇', types: ['传奇'] },
  { v: '符文', types: ['符文'] },
]

   
                                   
                                                 
                                                  
                                                   
   
function assertFamiliesCoverPool(): void {
  const covered = new Set(FAMILIES.flatMap((f) => f.types))
  const missing = [...new Set(POOL_LIST.map((c) => c.type))].filter((t) => !covered.has(t))
  if (missing.length > 0) {
    console.error(`[deckBuilder] 类型大类没盖住卡池:${missing.join('、')}——这些卡在类型筛里够不着,请补进 FAMILIES`)
  }
}
assertFamiliesCoverPool()

   
                                 
                                         
                                          
   
const SUBTYPES: readonly { readonly v: string; readonly label: string; readonly hit: (c: PoolCard) => boolean }[] = [
  { v: 'hero', label: '英雄单位', hit: (c) => c.type === '英雄单位' },
  { v: 'sig', label: '专属', hit: (c) => c.type.startsWith('专属') },
  { v: 'token', label: '指示物单位', hit: (c) => c.type === '指示物单位' },
]

   
                                                               
                                 
                                                             
                                                         
                                                                        
                                              
   
const DOMAINS: readonly { readonly v: string; readonly label: string }[] = [
  { v: 'red', label: '炽烈' }, { v: 'green', label: '翠意' }, { v: 'blue', label: '灵光' },
  { v: 'orange', label: '摧破' }, { v: 'purple', label: '混沌' }, { v: 'yellow', label: '序理' },
  { v: 'colorless', label: '无色' },
]
                                                           
const COLORLESS = 'colorless'

   
              
                                                      
                                                                                         
                                                 
                                                            
                                         
   
const RARITIES: readonly string[] = ['普通', '不凡', '稀有', '史诗', '异画']

                                                       
const BUCKET_MAX = 7

   
                        
                                              
   
function countBy(pick: (c: PoolCard) => readonly string[]): readonly { readonly v: string; readonly n: number }[] {
  const m = new Map<string, number>()
  for (const c of POOL_LIST) for (const v of pick(c)) if (v !== '') m.set(v, (m.get(v) ?? 0) + 1)
                           
  return [...m.entries()].map(([v, n]) => ({ v, n })).sort((a, b) => b.n - a.n || a.v.localeCompare(b.v, 'zh'))
}
   
                                    
                                             
                                         
   
const TAG_OPTIONS = countBy((c) => c.tag.split('|'))
                                                                  
const REGION_OPTIONS = countBy((c) => [c.region])
                                               
const SERIES_OPTIONS = countBy((c) => [c.no.split('-')[0] ?? ''])

   
      
                                          
                                                    
                                                       
                                                   
   
const SORTS = ['卡号', '费用↑', '费用↓', '战力↑', '战力↓', '名称', '稀有度'] as const
type SortKey = (typeof SORTS)[number]

                                                       
const PAGE_SIZE = 120

   
                           
                                              
                                              
                                              
                                      
   
const WIP_KEY = 'riftbound.builder.wip.v1'
interface Wip { readonly deckId: string; readonly name: string; readonly dirty: boolean; readonly text: string }

   
           
                                                      
                                                
                                    
   
interface Filters {
  query: string
                                    
  family: string
                                                   
  subtypes: Set<string>
                                                         
  domains: Set<string>
     
                         
                                                   
                                           
                                              
                                                 
                                                  
     
  withColorless: boolean
                                                                       
  cost: number | null
                                                                   
  power: number | null
                                                              
  tags: Set<string>
  regions: Set<string>
  rarities: Set<string>
                          
  series: Set<string>
}

const emptyFilters = (): Filters => ({
  query: '', family: '', subtypes: new Set<string>(), domains: new Set<string>(),
  withColorless: true, cost: null, power: null,
  tags: new Set<string>(), regions: new Set<string>(), rarities: new Set<string>(), series: new Set<string>(),
})

   
                    
                                     
   
interface Picker { open: '' | 'tag' | 'region'; query: string }

interface BuilderState {
                                                 
  draft: DeckDraft
                                                     
  deckId: string
                                                      
  name: string
                                                              
  dirty: boolean
  f: Filters
  picker: Picker
  sort: SortKey
     
              
                                                        
                                      
     
  page: number
                                        
  detail: string | null
}

                            
let importErrors: readonly string[] = []

   
                                                
                                                          
                                          
   
let importReport: ImportReport | null = null

   
                                                                  
                                                                           
                                                           
                                                     
   
const REPORT_DEPS = {
  known: (id: string): boolean => CARD_FACTS[id] !== undefined,
  kindOf, runeIdOf, facts: deckFacts,
}

function readWip(): Wip | null {
  try {
    const raw = localStorage.getItem(WIP_KEY)
    if (raw === null) return null
    const w = JSON.parse(raw) as Partial<Wip>
    if (typeof w.text !== 'string' || typeof w.deckId !== 'string') return null
    return { deckId: w.deckId, text: w.text, name: typeof w.name === 'string' ? w.name : '未命名牌组', dirty: w.dirty === true }
  } catch { return null }
}

   
                                           
                                          
   
function bootEditor(): Pick<BuilderState, 'draft' | 'deckId' | 'name' | 'dirty'> {
  migrateLegacyDecks()                                    
  const wip = readWip()
  if (wip) {
    const r = decodeDeck(wip.text, DECODE_OPTS)
    if (r.ok) return { draft: r.draft, deckId: wip.deckId, name: r.name ?? wip.name, dirty: wip.dirty }
    importErrors = r.errors.map((e) => `工作区存档第 ${e.line} 行:${e.reason}(${e.text})`)
  }
  const first = deckRows()[0]
  if (first) {
    const r = decodeDeck(first.text, DECODE_OPTS)
    if (r.ok) return { draft: r.draft, deckId: first.id, name: r.name ?? first.name, dirty: false }
    importErrors = [...importErrors, ...r.errors.map((e) => `牌组〈${first.name}〉第 ${e.line} 行:${e.reason}(${e.text})`)]
  }
  return { draft: emptyDraft(), deckId: newDeckId(), name: '新牌组', dirty: false }
}

const st: BuilderState = {
  ...bootEditor(),
  f: emptyFilters(),
  picker: { open: '', query: '' },
  sort: '卡号',
  page: 0,
  detail: null,
}

                                                      
const currentText = (): string => encodeDeck(st.draft, st.name.trim() === '' ? '未命名牌组' : st.name.trim())

                                               
function writeWip(): void {
  try {
    localStorage.setItem(WIP_KEY, JSON.stringify({ deckId: st.deckId, name: st.name, dirty: st.dirty, text: currentText() } satisfies Wip))
  } catch { /* 隐私模式/配额满 */ }
}

                                             
function touch(): void {
  st.dirty = true
  writeWip()
}

                                          
function saveCurrent(): void {
  const name = st.name.trim() === '' ? '未命名牌组' : st.name.trim()
  st.name = name
  putDeck(st.deckId, currentText(), name)
  st.dirty = false
  writeWip()
}

                                              
function openDeck(id: string): void {
  const row = getDeck(id)
  if (!row) return
  const r = decodeDeck(row.text, DECODE_OPTS)
  if (!r.ok) {
    importErrors = r.errors.map((e) => `牌组〈${row.name}〉第 ${e.line} 行:${e.reason}(${e.text})`)
    return
  }
  st.draft = r.draft
  st.deckId = row.id
  st.name = r.name ?? row.name
  st.dirty = false
  importErrors = []
  writeWip()
}

                                                 
const confirmDiscard = (): boolean => !st.dirty || confirm(`〈${st.name}〉有未保存的改动,确定放弃?`)

   
                                                                 
                                                    
                                                              
                        
   
function poolMeta(no: string): CardMeta | null {
  const c = CARD_POOL[no]
  if (!c) return null
  return {
    name: c.name, sub: c.sub, type: c.type, domains: c.domains,
    energy: c.energy, power: c.power, tag: c.tag, region: c.region,
    text: c.text, flavor: '', errata: '',
  }
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

                                                 
const tagsOf = (c: PoolCard): readonly string[] => (c.tag === '' ? [] : c.tag.split('|'))
                                            
const seriesOf = (c: PoolCard): string => c.no.split('-')[0] ?? ''

   
                                          
                                             
                                         
   
const inBucket = (v: number | null, bucket: number): boolean =>
  v !== null && (bucket >= BUCKET_MAX ? v >= BUCKET_MAX : v === bucket)

   
                                        
               
                                                 
                                                      
   
const cmpNullable = (a: number | null, b: number | null, desc: boolean): number => {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return desc ? b - a : a - b
}
                                                       
const rarityRank = (c: PoolCard): number => {
  const i = RARITIES.indexOf(c.rarity)
  return i < 0 ? RARITIES.length : i
}

   
                  
                                         
                                                 
   
function poolMatches(): {
  readonly shown: readonly PoolCard[]
  readonly total: number
  readonly page: number
  readonly pages: number
} {
  const f = st.f
  const q = f.query.trim().toLowerCase()
  const hit = POOL_LIST
    .filter((c) => {
      if (f.family === '') return true
      const fam = FAMILIES.find((x) => x.v === f.family)
      return fam ? fam.types.includes(c.type) : true
    })
    // 细分之间取【或】:勾"英雄单位"+"专属"要的是这两拨的并集,取交集只会得到空集
    .filter((c) => (f.subtypes.size === 0 ? true : SUBTYPES.some((s) => f.subtypes.has(s.v) && s.hit(c))))
    .filter((c) => {
      if (f.domains.size === 0) return true
                                                   
      if (c.domains.some((d) => f.domains.has(d))) return true
                                                                
      return f.withColorless && c.domains.includes(COLORLESS)
    })
    .filter((c) => (f.cost === null ? true : inBucket(c.energy, f.cost)))
    .filter((c) => (f.power === null ? true : inBucket(c.power, f.power)))
    .filter((c) => (f.tags.size === 0 ? true : tagsOf(c).some((t) => f.tags.has(t))))
    .filter((c) => (f.regions.size === 0 ? true : f.regions.has(c.region)))
    .filter((c) => (f.rarities.size === 0 ? true : f.rarities.has(c.rarity)))
    .filter((c) => (f.series.size === 0 ? true : f.series.has(seriesOf(c))))
    .filter((c) =>
      q === '' ? true : c.no.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q),
    )
  const sorted = [...hit].sort((a, b) => {
    switch (st.sort) {
      case '费用↑': return cmpNullable(a.energy, b.energy, false) || a.no.localeCompare(b.no)
      case '费用↓': return cmpNullable(a.energy, b.energy, true) || a.no.localeCompare(b.no)
      case '战力↑': return cmpNullable(a.power, b.power, false) || a.no.localeCompare(b.no)
      case '战力↓': return cmpNullable(a.power, b.power, true) || a.no.localeCompare(b.no)
      case '名称': return a.name.localeCompare(b.name, 'zh') || a.no.localeCompare(b.no)
      case '稀有度': return rarityRank(a) - rarityRank(b) || a.no.localeCompare(b.no)
      default: return a.no.localeCompare(b.no)
    }
  })
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
                                                         
                                         
  const page = Math.min(Math.max(0, st.page), pages - 1)
  return { shown: sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), total: sorted.length, page, pages }
}

   
                                     
                                       
                                   
                                   
  
                                             
                                          
  
                                                    
                                                                                    
                                                                  
                                          
                                                                  
                                                                
                           
                                                   
                                                
                                                    
   
function poolLane(c: PoolCard): { readonly lane: 'bf' | 'rune' | 'main'; readonly id: string } {
  if (c.type === '战场') return { lane: 'bf', id: c.no }
  if (c.type === '符文') return { lane: 'rune', id: runeIdOf(c.no) ?? '' }
  return { lane: 'main', id: c.no }
}

function cardRow(c: PoolCard): string {
                                     
  const { lane, id } = poolLane(c)
  const chk = lane === 'bf' ? canAddBattlefield(st.draft, id, deckFacts)
    : lane === 'rune' ? (id === '' ? { ok: false, blockedBy: [] } : canAddRune(st.draft, id, deckFacts))
    : canAddToMain(st.draft, id, deckFacts)
  const why = chk.ok ? '' : chk.blockedBy.map((v) => `${v.rule} ${v.detail}`).join('；')
     
                               
                                                 
     
  const ok = chk.ok && c.playable && !(lane === 'rune' && id === '')
     
          
                                                        
                                        
     
  const n = lane === 'bf' ? st.draft.battlefields.filter((x) => x === id).length
    : lane === 'rune' ? (st.draft.runeDeck ?? []).filter((x) => x === id).length
    : st.draft.mainDeck.filter((x) => x === id).length
  const thumb = cardThumb(c.no) ?? ''
  const full = cardImg(c.no) ?? ''
  const label = `${c.name}${c.sub ? `·${c.sub}` : ''}`
  const attr = lane === 'bf' ? 'addbf' : lane === 'rune' ? 'addrune' : 'add'
  const tip = !c.playable
    ? `${label}:引擎还没实现这张卡的效果,带进对局会卡住 ⇒ 暂时不能加入牌组`
    : lane === 'rune' && id === ''
      ? `${label}:引擎认不出这张符文卡是什么色 ⇒ 加不了(请补 data/cards/token-cards-535.ts 的 RUNE_CARD_COLORS)`
      : why || `${lane === 'bf' ? '加入战场位' : lane === 'rune' ? '加入符文牌堆' : '加入主牌堆'}:${label}${c.energy === null ? '' : `(${c.energy}费)`}`
  return `<div class="pc-wrap${lane === 'bf' ? ' bf' : ''}" title="${esc(tip)}">
    <button class="pc${lane === 'bf' ? ' bf' : ''}${ok ? '' : ' off'}" data-${attr}="${esc(id)}" ${ok ? '' : 'disabled'}>
      <span class="pc-txt">${esc(label)}</span>
      <img src="${thumb}" alt="${esc(label)}" loading="lazy" decoding="async" draggable="false"
        onerror="if(this.dataset.f){this.closest('.pc').classList.add('noimg');this.remove()}else{this.dataset.f='1';this.src='${full}'}"/>
      ${n > 0 ? `<i class="pc-n">×${n}</i>` : ''}
      ${c.playable ? '' : '<i class="pc-wip">未实现</i>'}
      <i class="pc-plus">${ok ? '＋' : '✕'}</i>
    </button>
    <span class="pc-cap" data-detail="${c.no}" title="看卡面详情">
      <b>${esc(label)}</b>
      <small>${c.no}${c.energy === null ? '' : ` · ${c.energy}费`}${c.power === null ? '' : ` · ${c.power}战力`}</small>
    </span>
    ${sideBtn(c)}
  </div>`
}

   
                                  
                                                      
                             
                                     
   
function sideBtn(c: PoolCard): string {
  if (c.type === '战场' || c.type === '符文' || c.type === '传奇') return ''
  const chk = canAddToSide(st.draft, c.no, deckFacts)
  const n = (st.draft.side ?? []).filter((x) => x === c.no).length
  const why = chk.ok ? '加入备牌(§601.1.c,最多 10 张)' : chk.blockedBy.map((v) => `${v.rule} ${v.detail}`).join('；')
  return `<button class="pc-side${chk.ok && c.playable ? '' : ' off'}" data-addside="${c.no}"
    ${chk.ok && c.playable ? '' : 'disabled'} title="${esc(why)}">备${n > 0 ? `·${n}` : ''}</button>`
}

   
        
                                                
                                     
   
function curveHtml(): string {
  const c = costCurve(st.draft, (no) => CARD_POOL[no]?.energy ?? undefined)
  if (c.total === 0) return ''
  const peak = Math.max(1, ...c.buckets.map((b) => b.count))
  const bars = c.buckets.map((b) => {
    const h = Math.round((b.count / peak) * 42)
    return `<div class="cv-col"><small>${b.count || ''}</small>
      <div class="cv-bar" style="height:${h}px"></div>
      <small class="cv-x">${b.cost === CURVE_MAX ? '7+' : b.cost}</small></div>`
  }).join('')
  return `<div class="cv">
    <div class="cv-t">费用曲线</div>
    <div class="cv-bars">${bars}</div>
    ${c.unknown > 0 ? `<small class="cv-warn">其中 ${c.unknown} 张查不到费用,未计入曲线</small>` : ''}
  </div>`
}

   
                                                
                             
   
function deckSection(
  label: string, rows: readonly DraftEntry[], delAttr: string,
  opts: { readonly total?: string; readonly wide?: boolean; readonly extra?: string; readonly empty?: string } = {},
): string {
  if (rows.length === 0 && opts.empty === undefined) return ''
  const n = rows.reduce((s, e) => s + e.count, 0)
  const body = rows.map((e) => `<div class="dk-row">
      <button class="dk-del" data-${delAttr}="${esc(e.defId)}" title="移除一张">－</button>
      ${opts.wide
        ? `<span class="dk-bfthumb"><img src="${cardThumb(e.defId) ?? ''}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"/></span>`
        : `<img class="dk-thumb" src="${cardThumb(e.defId) ?? ''}" alt="" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'"/>`}
      <b class="dk-n">${e.count}</b>
      <span class="dk-name" data-detail="${esc(e.defId)}">${esc(e.name)}</span>
    </div>`).join('') || `<small class="dk-empty">${esc(opts.empty ?? '')}</small>`
  return `<section class="dk-sec">
    <h4 class="dk-h"><b>${esc(label)}</b><i>${opts.total ?? n}</i></h4>
    ${opts.extra ?? ''}
    ${body}
  </section>`
}

   
                    
                                                                           
                                                      
                                         
                                                  
   
const MAIN_GROUPS: readonly { readonly kind: string; readonly label: string }[] = [
  { kind: 'unit', label: '单位' },
  { kind: 'spell', label: '法术' },
  { kind: 'equipment', label: '装备' },
]

function mainSections(): string {
  const entries = draftEntries(st.draft, deckFacts)
  const bucket = new Map<string, DraftEntry[]>()
  for (const e of entries) {
    const k = deckFacts(e.defId).kind ?? '?'
    const key = MAIN_GROUPS.some((g) => g.kind === k) ? k : '其他'
    const cur = bucket.get(key)
    if (cur) cur.push(e); else bucket.set(key, [e])
  }
                                       
                                                  
  const known = MAIN_GROUPS.map((g) => deckSection(g.label, bucket.get(g.kind) ?? [], 'del', { empty: '(还没有)' })).join('')
  const other = deckSection('其他(引擎认不出类别)', bucket.get('其他') ?? [], 'del')
  return known + other
}

                                                           
function runeQuickAdd(): string {
  const btns = DOMAINS.filter((d) => d.v !== COLORLESS).map((d) => {
    const id = `rune:${d.v}`
                                                
    const chk = canAddRune(st.draft, id, deckFacts)
    const why = chk.ok ? `加一枚${d.label}符文` : chk.blockedBy.map((v) => `${v.rule} ${v.detail}`).join('；')
    return `<button class="rq rq-${d.v}${chk.ok ? '' : ' off'}" data-rune="${d.v}" ${chk.ok ? '' : 'disabled'} title="${esc(why)}">${esc(d.label)}</button>`
  }).join('')
  return `<div class="rq-row">${btns}
    <button class="rq rq-clr" data-runeclear="1" title="清空符文牌堆">清空</button></div>`
}


   
                                     
                                    
                                      
                                   
                                           
                                                                  
   
function importReportHtml(): string {
  const r = importReport
  if (r === null) return ''
  const quota = r.quota.length === 0 ? '' : `<div class="ir-quota">${r.quota.map((q) => q.registered
    ? `<span class="ir-q ${q.ok ? 'ok' : 'bad'}" title="${esc(q.rule)}">${esc(q.label)} <b>${q.have}</b>/${q.need}</span>`
    : `<span class="ir-q none" title="${esc(q.rule)} —— 这份牌表没写这一段,引擎不校验它">${esc(q.label)} 未登记</span>`
  ).join('')}</div>`
  const issues = (list: readonly ImportReport['blocking'][number][], cls: string): string => list.length === 0 ? ''
    : `<ul class="ir-list ${cls}">${list.map((i) => `<li>${i.line !== undefined ? `<code>第 ${i.line} 行</code> ` : ''}${esc(i.message)}${i.text ? `<i class="ir-src">${esc(i.text)}</i>` : ''}</li>`).join('')}</ul>`
  const head = r.blocking.length > 0
    ? `<p class="ir-head bad">✕ 导不进去 —— 下面 ${r.blocking.length} 个问题得先解决</p>`
    : `<p class="ir-head ok">✔ 可以导入${r.name ? ` · 牌组名〈${esc(r.name)}〉` : ''}${r.warnings.length > 0 ? ` · ${r.warnings.length} 条提醒` : ''}</p>`
  return `<div class="ir-box">${head}${quota}${issues(r.blocking, 'bad')}${issues(r.warnings, 'warn')}</div>`
}

function deckPanel(): string {
  const sum = draftSummary(st.draft, deckFacts)
  const runeN = st.draft.runeDeck?.length ?? 0
  const status = sum.legal
    ? '<span class="dk-ok">✔ 合法,可开局</span>'
    : `<span class="dk-bad">还差 ${sum.needed} 张 · ${sum.violations.length} 条问题</span>`
  const viol = sum.violations.map((v) => `<li><code>${v.rule}</code> ${esc(v.detail)}</li>`).join('')
     
                                                
                                                              
                                                
                                            
     
  const devStart = DEV && sum.legal
    ? `<button id="startSame" class="dk-start" title="开发者:单机试跑,双方同一副牌">▶ 本地试玩(双方同一副)</button>`
    : ''
  return `<div class="dk-panel">
    <div class="dk-top">
      <div class="dk-count"><b>${sum.total}</b><small>主牌堆</small></div>
      <div class="dk-status">${status}${devStart}</div>
    </div>
    ${curveHtml()}
    ${mainSections()}
    ${deckSection('符文', runeEntries(st.draft, deckFacts), 'delrune', {
      total: `${runeN}/${RUNE_DECK_SIZE}`,
      extra: runeQuickAdd(),
      empty: '还没配符文 —— 上面按色加,或在卡池里筛「符文」按卡加',
    })}
    ${deckSection('战场', battlefieldEntries(st.draft, deckFacts), 'delbf', {
      total: `${st.draft.battlefields.length}/${BATTLEFIELDS_1V1}`,
      wide: true,
      empty: '还没选战场 —— 卡池里筛「战场」大类',
    })}
    ${sidePanel()}
    ${viol ? `<ul class="dk-viol">${viol}</ul>` : ''}
  </div>`
}

   
                                                          
                                          
                                                               
                                    
   
function sidePanel(): string {
  const side = st.draft.side ?? []
  return `${deckSection('备牌', sideEntries(st.draft, deckFacts), 'delside', {
    total: `${side.length}/10`,
    extra: '<small class="dk-note">§601.1.c · 同名张数与主牌堆<b>合并计算</b>(§403.3)</small>',
    empty: '还没配备牌 —— 卡池里每张卡下面的「备」可以加',
  })}`
}

                                    
function topBar(): string {
  const rows = deckRows()
  const inLib = rows.some((r) => r.id === st.deckId)
  const opts = rows.map((r) => `<option value="${esc(r.id)}" ${r.id === st.deckId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')
                                     
  const draftOpt = inLib ? '' : `<option value="${esc(st.deckId)}" selected>${esc(st.name)}(未保存)</option>`
  return `<div class="db-top">
    <button id="back-online" class="sec db-back">← 返回大厅</button>
    <span class="db-lab">牌组库</span>
    <select id="deckSel" class="db-sel" title="切换到另一副牌组">${draftOpt}${opts}
      <option value="__new">＋ 新建牌组</option></select>
    <input id="deckName" class="db-name" value="${esc(st.name)}" placeholder="牌组名称" title="改名后按「保存」生效">
    <button id="save" class="db-save" ${st.dirty ? '' : 'disabled'}>💾 保存</button>
    <button id="saveAs" class="sec">另存为</button>
    <button id="del" class="sec db-danger" title="从牌组库里删掉这一副">🗑 删除</button>
    <span class="db-state ${st.dirty ? 'on' : ''}">${st.dirty ? '● 有未保存的改动' : `✔ 已保存${inLib ? '' : '(空牌组)'}`}</span>
  </div>`
}

                                         
function setupPanel(): string {
  const legends = POOL_LIST.filter((c) => c.type === '传奇')
  const legOpts = ['<option value="">(未选传奇)</option>']
    .concat(legends.map((c) => `<option value="${c.no}" ${st.draft.legend === c.no ? 'selected' : ''}>${esc(c.name)}</option>`))
    .join('')
                                                        
  const tag = st.draft.legend ? (CARD_POOL[st.draft.legend]?.hero ?? '') : ''
  const heroes = POOL_LIST.filter((c) => c.type === '英雄单位' && (tag === '' || c.hero === tag))
  const heroOpts = ['<option value="">(未选定英雄)</option>']
    .concat(heroes.map((c) => `<option value="${c.no}" ${st.draft.hero === c.no ? 'selected' : ''}>${esc(c.name)}</option>`))
    .join('')
  return `<div class="db-setup">
    <span class="db-lab">传奇</span><select id="leg" class="db-sel">${legOpts}</select>
    <span class="db-lab">选定英雄</span><select id="hero" class="db-sel">${heroOpts}</select>
    <span class="db-spacer"></span>
    <button class="sec" id="exp">导出牌表</button>
    <button class="sec" id="imp">导入牌表</button>
    <button class="sec db-danger" id="clr">清空牌组</button>
    ${importErrors.length > 0 ? `<ul class="db-err">${importErrors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
    <textarea id="code" rows="5" class="db-code" style="display:none"></textarea>
    <div id="imp-report">${importReportHtml()}</div>
  </div>`
}

                                               
function fgroup(
  label: string,
  attr: string,
  items: readonly { readonly v: string; readonly text: string; readonly on: boolean; readonly tip?: string }[],
  extra = '',
): string {
  const btns = items
    .map((it) =>
                                                 
                                                        
      `<button class="fb${it.on ? '' : ' sec'}" data-${attr}="${esc(it.v)}"${
        it.tip ? ` title="${esc(`${it.text} · ${it.tip}`)}"` : ''}>${esc(it.text)}</button>`,
    )
    .join('')
  return `<span class="fgrp"><span class="flab">${esc(label)}</span>${btns}${extra}</span>`
}

                                                
const bucketItems = (cur: number | null): readonly { v: string; text: string; on: boolean }[] =>
  [0, 1, 2, 3, 4, 5, 6, BUCKET_MAX].map((n) => ({
    v: String(n), text: n === BUCKET_MAX ? `${BUCKET_MAX}+` : String(n), on: cur === n,
  }))

   
                                             
                                                              
                                       
                                                                                 
                                   
   
function pickerHtml(
  kind: 'tag' | 'region',
  label: string,
  opts: readonly { readonly v: string; readonly n: number }[],
  picked: ReadonlySet<string>,
): string {
  const open = st.picker.open === kind
                                       
  const chips = [...picked]
    .map((v) => `<button class="fb chip" data-${kind}="${esc(v)}" title="点掉这个${esc(label)}">${esc(v)} ×</button>`)
    .join('')
  const toggle = `<button class="fb${open ? '' : ' sec'}" data-pick="${kind}">${esc(label)}${
    picked.size > 0 ? ` (${picked.size})` : ''} ${open ? '▴' : '▾'}</button>`
  if (!open) return `<span class="fgrp">${toggle}${chips}</span>`
  const q = st.picker.query.trim().toLowerCase()
  const list = opts.filter((o) => q === '' || o.v.toLowerCase().includes(q))
  const rows = list
    .map((o) => `<button class="fopt${picked.has(o.v) ? ' on' : ''}" data-${kind}="${esc(o.v)}">
      <span class="fck">${picked.has(o.v) ? '✓' : ''}</span>${esc(o.v)}<i>${o.n}</i></button>`)
    .join('')
  return `<span class="fgrp">${toggle}${chips}
    <div class="fpanel">
      <input id="pickq" class="fsearch" placeholder="搜${esc(label)}" value="${esc(st.picker.query)}">
      <div class="fopts">${rows || `<small style="color:#888">没有匹配的${esc(label)}</small>`}</div>
      <div style="text-align:right;margin-top:4px">
        ${picked.size > 0 ? `<button class="fb sec" data-${kind}="__clear">清除</button>` : ''}
        <button class="fb sec" data-pickclose="1">收起</button>
      </div>
    </div></span>`
}

                                          
function activeFilterCount(): number {
  const f = st.f
  return (f.query.trim() === '' ? 0 : 1) + (f.family === '' ? 0 : 1) + f.subtypes.size + f.domains.size
    + (f.cost === null ? 0 : 1) + (f.power === null ? 0 : 1)
    + f.tags.size + f.regions.size + f.rarities.size + f.series.size
                                            
                                                
                                                  
    + (f.withColorless ? 0 : 1)
}

   
                          
                                            
                                      
   
function filterPanel(total: number): string {
  const f = st.f
  const rowType = `<div class="frow">${
    fgroup('类型', 'fam', [
      { v: '', text: '全部', on: f.family === '' },
      ...FAMILIES.map((x) => ({ v: x.v, text: x.v, on: f.family === x.v })),
    ])
  }${
    fgroup('细分', 'sub', SUBTYPES.map((s) => ({
      v: s.v, text: s.label, on: f.subtypes.has(s.v),
      tip: '细分之间取并集,与上面的大类取交集',
    })))
  }</div>`
  const rowDomain = `<div class="frow">${
    fgroup('域', 'dom', DOMAINS.map((d) => ({ v: d.v, text: d.label, on: f.domains.has(d.v) })),
      f.domains.size > 0 ? '<button class="fb sec" data-dom="__clear">清除</button>' : '')
  }${
    fgroup('', 'cless', [{
      v: '1', text: '＋无色', on: f.withColorless,
                                               
      tip: '选了域时,无色卡是否一并显示。全池 67 张无色(含全部 63 张战场),关掉后选单色会看不到战场',
    }])
  }</div>`
  const rowNum = `<div class="frow">${
    fgroup('费用', 'cost', bucketItems(f.cost),
      f.cost !== null ? '<button class="fb sec" data-cost="__clear">不限</button>' : '')
  }${
    fgroup('战力', 'pow', bucketItems(f.power),
      f.power !== null ? '<button class="fb sec" data-pow="__clear">不限</button>' : '')
  }</div>`
  const rowMisc = `<div class="frow">${
    fgroup('稀有度', 'rar', RARITIES.map((r) => ({ v: r, text: r, on: f.rarities.has(r) })))
  }${
    fgroup('系列', 'ser', SERIES_OPTIONS.map((s) => ({ v: s.v, text: s.v, on: f.series.has(s.v), tip: `${s.n} 张` })))
  }</div>`
  const rowPick = `<div class="frow">
    ${pickerHtml('tag', '标签', TAG_OPTIONS, f.tags)}
    ${pickerHtml('region', '地区', REGION_OPTIONS, f.regions)}
  </div>`
  const n = activeFilterCount()
  const rowTop = `<div class="frow">
    <input id="q" class="fsearch" style="width:220px" placeholder="搜索卡号/卡名/卡文" value="${esc(f.query)}">
    <span class="fgrp"><span class="flab">排序</span><select id="sort" class="fsel">${
      SORTS.map((k) => `<option ${k === st.sort ? 'selected' : ''}>${k}</option>`).join('')}</select></span>
    <button class="fb${n > 0 ? '' : ' sec'}" id="clearf"${n > 0 ? '' : ' disabled'}>清空筛选${n > 0 ? ` (${n})` : ''}</button>
    <span class="fhit">命中 <b>${total}</b> 张 / 共 ${POOL_TOTAL} 张</span>
  </div>`
  return `<div class="fbox">${rowTop}${rowType}${rowDomain}${rowNum}${rowMisc}${rowPick}</div>`
}

   
                                  
                                          
                                              
                                             
   
function pagerHtml(page: number, pages: number, where: 'top' | 'bottom'): string {
  if (pages <= 1) return ''
  const nav = `<span class="fnav">
    <button class="fb sec" data-page="0" ${page === 0 ? 'disabled' : ''}>« 首页</button>
    <button class="fb sec" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>‹ 上一页</button>
    <span class="flab">第 ${page + 1}/${pages} 页</span>
    <button class="fb sec" data-page="${page + 1}" ${page >= pages - 1 ? 'disabled' : ''}>下一页 ›</button>
    <button class="fb sec" data-page="${pages - 1}" ${page >= pages - 1 ? 'disabled' : ''}>末页 »</button>
  </span>`
  return where === 'top'
    ? `<div class="fcount">每页 ${PAGE_SIZE} 张 ${nav}</div>`
    : `<div class="fcount" style="justify-content:center;margin-top:10px">${nav}</div>`
}

export interface BuilderDeps {
  readonly app: HTMLElement
  readonly modeBar: () => string
  readonly wireModes: () => void
                                                                  
  readonly startFromDecks: (deckA: Deck, deckB: Deck) => void
                                     
  readonly gotoOnline?: () => void
}

                                           
function commit(deps: BuilderDeps): void {
  touch()
  renderDeckBuilder(deps)
}

   
                                            
                                                 
   
function setFilter(deps: BuilderDeps, mut: (f: Filters) => void): void {
  mut(st.f)
  st.page = 0
  renderDeckBuilder(deps)                 
}
                                     
function toggleIn(s: Set<string>, v: string): void {
  if (v === '__clear') s.clear()
  else if (s.has(v)) s.delete(v)
  else s.add(v)
}
                                
const pickBucket = (cur: number | null, v: string): number | null =>
  v === '__clear' || String(cur) === v ? null : Number(v)

   
                  
                                                             
                                      
                                     
   
function focusMemo(): () => void {
  const el = document.activeElement
  if (!(el instanceof HTMLInputElement) || el.id === '') return () => undefined
  const { id, selectionStart, selectionEnd } = el
  return () => {
    const next = document.getElementById(id)
    if (!(next instanceof HTMLInputElement)) return
    next.focus()
                                               
    if (next.type === 'text' && selectionStart !== null) {
      next.setSelectionRange(selectionStart, selectionEnd ?? selectionStart)
    }
  }
}

export function renderDeckBuilder(deps: BuilderDeps): void {
  const { app } = deps
  const restoreFocus = focusMemo()
  const { shown, total, page, pages } = poolMatches()
  app.innerHTML = `
    <div class="db-shell">
      ${DEV ? deps.modeBar() : ''                                }
      ${topBar()}
      ${setupPanel()}
      <div class="db-main">
        <div class="db-pool">
          ${filterPanel(total)}
          ${pagerHtml(page, pages, 'top')}
          ${shown.length > 0
            ? `<div class="pool-grid">${shown.map(cardRow).join('')}</div>${pagerHtml(page, pages, 'bottom')}`
            : `<div class="db-none">没有符合条件的卡——按「清空筛选」回到全部 ${POOL_TOTAL} 张</div>`}
        </div>
        <aside class="db-side">
          ${st.detail ? `<div class="db-detail">${cardDetailHtml(st.detail, {}, poolMeta(st.detail))}
            <button class="sec" id="closeDetail">收起详情</button></div>` : ''}
          ${deckPanel()}
        </aside>
      </div>
    </div>
    <style>${cardDetailStyles}${builderStyles}</style>`

  const backOnline = document.getElementById('back-online')
  if (backOnline) backOnline.onclick = () => { if (confirmDiscard()) deps.gotoOnline?.() }        
  deps.wireModes()

                      
  app.querySelector<HTMLSelectElement>('#deckSel')?.addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement
    const v = sel.value
    if (!confirmDiscard()) { renderDeckBuilder(deps); return }                   
    if (v === '__new') {
      st.draft = emptyDraft()
      st.deckId = newDeckId()
      st.name = '新牌组'
      st.dirty = false
      importErrors = []
      writeWip()
    } else openDeck(v)
    renderDeckBuilder(deps)
  })
  const nameInput = app.querySelector<HTMLInputElement>('#deckName')
  nameInput?.addEventListener('input', () => {
    st.name = nameInput.value
    commit(deps)                               
  })
  app.querySelector<HTMLButtonElement>('#save')?.addEventListener('click', () => { saveCurrent(); renderDeckBuilder(deps) })
  app.querySelector<HTMLButtonElement>('#saveAs')?.addEventListener('click', () => {
    const name = prompt('另存为新牌组,取个名字:', `${st.name} 副本`)
    if (name === null || name.trim() === '') return              
    st.name = name.trim()
    st.deckId = newDeckId()                                 
    saveCurrent()
    renderDeckBuilder(deps)
  })
  app.querySelector<HTMLButtonElement>('#del')?.addEventListener('click', () => {
    if (!confirm(`删除牌组〈${st.name}〉?删了找不回来。`)) return
    deleteDeck(st.deckId)
    const next = deckRows()[0]
    if (next) openDeck(next.id)
    else { st.draft = emptyDraft(); st.deckId = newDeckId(); st.name = '新牌组'; st.dirty = false; writeWip() }
    renderDeckBuilder(deps)
  })

  const q = app.querySelector<HTMLInputElement>('#q')
  q?.addEventListener('input', () => setFilter(deps, (f) => { f.query = q.value }))
                         
  app.querySelectorAll<HTMLButtonElement>('[data-fam]').forEach((b) => {
    b.addEventListener('click', () => {
      const v = b.dataset['fam']!
      setFilter(deps, (f) => { f.family = f.family === v ? '' : v })
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-sub]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => toggleIn(f.subtypes, b.dataset['sub']!)))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-cless]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => { f.withColorless = !f.withColorless }))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-pow]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => { f.power = pickBucket(f.power, b.dataset['pow']!) }))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-rar]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => toggleIn(f.rarities, b.dataset['rar']!)))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-ser]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => toggleIn(f.series, b.dataset['ser']!)))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => toggleIn(f.tags, b.dataset['tag']!)))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-region]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => toggleIn(f.regions, b.dataset['region']!)))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) => {
    b.addEventListener('click', () => {
      const kind = b.dataset['pick'] as 'tag' | 'region'
                                               
      st.picker = st.picker.open === kind ? { open: '', query: '' } : { open: kind, query: '' }
      renderDeckBuilder(deps)                       
    })
  })
  app.querySelector<HTMLButtonElement>('[data-pickclose]')?.addEventListener('click', () => {
    st.picker = { open: '', query: '' }
    renderDeckBuilder(deps)
  })
  const pq = app.querySelector<HTMLInputElement>('#pickq')
                                                      
  pq?.addEventListener('input', () => { st.picker = { ...st.picker, query: pq.value }; renderDeckBuilder(deps) })
  app.querySelector<HTMLButtonElement>('#clearf')?.addEventListener('click', () => {
                                              
    st.f = emptyFilters()
    st.picker = { open: '', query: '' }
    st.page = 0
    renderDeckBuilder(deps)
  })
  app.querySelectorAll<HTMLButtonElement>('[data-page]').forEach((b) => {
    b.addEventListener('click', () => {
      st.page = Number(b.dataset['page'])
      renderDeckBuilder(deps)                                   
    })
  })
  app.querySelector<HTMLSelectElement>('#leg')?.addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value
    st.draft = { ...st.draft, ...(v ? { legend: v } : { legend: undefined }) }
    commit(deps)
  })
  app.querySelector<HTMLSelectElement>('#hero')?.addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value
    st.draft = { ...st.draft, ...(v ? { hero: v } : { hero: undefined }) }
    commit(deps)
  })
  app.querySelectorAll<HTMLButtonElement>('[data-addbf]').forEach((b) => {
    b.addEventListener('click', () => {
      const no = b.dataset['addbf']!
      if (!canAddBattlefield(st.draft, no, deckFacts).ok) return
      st.draft = { ...st.draft, battlefields: [...st.draft.battlefields, no] }
      commit(deps)
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-delbf]').forEach((b) => {
    b.addEventListener('click', () => {
      st.draft = removeBattlefield(st.draft, b.dataset['delbf']!)
      commit(deps)
    })
  })
                                                    
                                                
  app.querySelectorAll<HTMLButtonElement>('[data-rune]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = `rune:${b.dataset['rune']}`
      if (!canAddRune(st.draft, id, deckFacts).ok) return             
      st.draft = addToRune(st.draft, id)
      commit(deps)
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-addrune]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset['addrune']!
      if (id === '' || !canAddRune(st.draft, id, deckFacts).ok) return
      st.draft = addToRune(st.draft, id)
      commit(deps)
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-delrune]').forEach((b) => {
    b.addEventListener('click', () => {
      st.draft = removeFromRune(st.draft, b.dataset['delrune']!)
      commit(deps)
    })
  })
  app.querySelector<HTMLSelectElement>('#sort')?.addEventListener('change', (e) => {
    st.sort = (e.target as HTMLSelectElement).value as SortKey
                                                 
    st.page = 0
    renderDeckBuilder(deps)
  })
  app.querySelectorAll<HTMLButtonElement>('[data-dom]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => toggleIn(f.domains, b.dataset['dom']!)))
  })
  app.querySelectorAll<HTMLButtonElement>('[data-cost]').forEach((b) => {
    b.addEventListener('click', () => setFilter(deps, (f) => { f.cost = pickBucket(f.cost, b.dataset['cost']!) }))
  })
  app.querySelectorAll<HTMLElement>('[data-detail]').forEach((el) => {
    el.addEventListener('click', () => {
      st.detail = el.dataset['detail'] ?? null
      renderDeckBuilder(deps)          
    })
  })
  app.querySelector<HTMLButtonElement>('#closeDetail')?.addEventListener('click', () => {
    st.detail = null
    renderDeckBuilder(deps)
  })
  app.querySelector<HTMLButtonElement>('#startSame')?.addEventListener('click', () => {
    const r = draftToDeck(st.draft, deckFacts, st.name)
    if (!r.ok) { renderDeckBuilder(deps); return }
    deps.startFromDecks(r.deck, r.deck)               
  })
  app.querySelector<HTMLButtonElement>('#exp')?.addEventListener('click', () => {
    const ta = app.querySelector<HTMLTextAreaElement>('#code')!
    ta.style.display = 'block'
    ta.value = currentText()
    ta.select()
  })
                                  
    
                                                         
                                                                  
                                                        
                                                        
                                                       
                                                                     
    
                                                          
                                                           
  const impBtn = app.querySelector<HTMLButtonElement>('#imp')
  const refreshReport = (text: string): void => {
    importReport = text.trim() === '' ? null : buildImportReport(text, REPORT_DEPS)
    const box = app.querySelector<HTMLDivElement>('#imp-report')
    if (box) box.innerHTML = importReportHtml()
    if (!impBtn) return
    const blocked = importReport !== null && importReport.blocking.length > 0
    impBtn.disabled = blocked
    impBtn.textContent = importReport === null ? '导入牌表' : blocked ? '✕ 有问题,导不了' : '✔ 确认导入'
  }
  app.querySelector<HTMLTextAreaElement>('#code')?.addEventListener('input', (e) => {
    refreshReport((e.target as HTMLTextAreaElement).value)
  })
  if (impBtn) impBtn.addEventListener('click', () => {
    const ta = app.querySelector<HTMLTextAreaElement>('#code')!
    if (ta.style.display === 'none') {
      ta.style.display = 'block'; ta.value = ''; ta.focus()
      importReport = null; refreshReport('')
      return
    }
    const r = buildImportReport(ta.value, REPORT_DEPS)
    importReport = r
                                                
                                               
                          
                                                                         
                                            
                                               
    if (!r.ok || r.draft === null) {
      const box = app.querySelector<HTMLDivElement>('#imp-report')
      if (box) box.innerHTML = importReportHtml()
      impBtn.disabled = r.blocking.length > 0
      impBtn.textContent = r.blocking.length > 0 ? '✕ 有问题,导不了' : '导入牌表'
      return
    }
    importErrors = []
    st.draft = r.draft
    if (r.name) st.name = r.name                        
    commit(deps)
  })
  app.querySelector<HTMLButtonElement>('#clr')?.addEventListener('click', () => {
    if (!confirm('清空当前牌组的全部内容?(牌组库里已保存的版本不受影响,直到你再按保存)')) return
    st.draft = emptyDraft()
    importErrors = []
    commit(deps)
  })
  app.querySelector<HTMLButtonElement>('[data-runeclear]')?.addEventListener('click', () => {
    st.draft = { ...st.draft, runeDeck: [] }
    commit(deps)
  })
  app.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((b) => {
    b.addEventListener('click', () => {
                                      
      if (!canAddToMain(st.draft, b.dataset['add']!, deckFacts).ok) return
      st.draft = addToMain(st.draft, b.dataset['add']!)
      commit(deps)
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => {
    b.addEventListener('click', () => {
      st.draft = removeFromMain(st.draft, b.dataset['del']!)
      commit(deps)
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-addside]').forEach((b) => {
    b.addEventListener('click', () => {
                                          
      if (!canAddToSide(st.draft, b.dataset['addside']!, deckFacts).ok) return
      st.draft = addToSide(st.draft, b.dataset['addside']!)
      commit(deps)
    })
  })
  app.querySelectorAll<HTMLButtonElement>('[data-delside]').forEach((b) => {
    b.addEventListener('click', () => {
      st.draft = removeFromSide(st.draft, b.dataset['delside']!)
      commit(deps)
    })
  })
                                                       
  restoreFocus()
}

   
                                              
  
                                                 
                                              
                                        
                                                 
                            
                                                
                                                            
                                   
   
const builderStyles = `
  /* 构建器接管更宽的版面:#app 的 960px 上限是给开发者UI那几屏定的,
     卡池在 960px 里一行只放得下 5-6 张,右边再挂一栏牌组就没法看了 */
  #app:has(.db-shell){max-width:1580px}
  .db-shell{--bg:#0d121c;--panel:#151d2b;--panel2:#1b2534;--line:#ffffff14;--line2:#ffffff26;
    --tx:#e6edf7;--dim:#8fa1b8;--acc:#38bdf8;--acc2:#0ea5e9;--ok:#4ade80;--bad:#fca5a5;--gold:#fbbf24;
    background:var(--bg);color:var(--tx);border-radius:18px;padding:14px 16px 22px;
    display:flex;flex-direction:column;gap:12px}
  .db-shell small{color:var(--dim)}

  /* ── 按钮基调(只在构建器内生效)── */
  .db-shell button{font:inherit;font-size:13px;padding:5px 12px;border-radius:9px;border:1px solid transparent;
    background:var(--acc2);color:#04121c;font-weight:600;cursor:pointer;
    transition:background .14s,border-color .14s,transform .1s,opacity .14s}
  .db-shell button:hover{opacity:1;background:#38bdf8}
  .db-shell button.sec{background:#ffffff0d;color:var(--tx);border-color:var(--line2);font-weight:500}
  .db-shell button.sec:hover{background:#ffffff1a}
  .db-shell button[disabled]{opacity:.38;cursor:not-allowed;transform:none}
  .db-shell button.db-danger{color:#fca5a5;border-color:#7f1d1d66;background:#7f1d1d22}
  .db-shell button.db-danger:hover{background:#7f1d1d44}
  .db-shell select,.db-shell input,.db-shell textarea{font:inherit;font-size:13px;color:var(--tx);
    background:#0b111b;border:1px solid var(--line2);border-radius:9px;padding:5px 9px}
  .db-shell select:focus,.db-shell input:focus,.db-shell textarea:focus{outline:2px solid #38bdf866;outline-offset:0}

  /* ── 顶部工具条:牌组库 ── */
  .db-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-radius:13px;
    background:linear-gradient(180deg,#ffffff0f,#ffffff05);border:1px solid var(--line)}
  .db-back{flex-shrink:0}
  .db-lab{font-size:11px;color:var(--dim);letter-spacing:.06em}
  .db-sel{min-width:150px;max-width:240px}
  .db-name{width:190px;font-weight:600}
  .db-save{min-width:92px}
  .db-state{margin-left:auto;font-size:12px;color:var(--dim);white-space:nowrap}
  .db-state.on{color:var(--gold)}
  /* ── 第二行:传奇 / 选定英雄 / 导入导出 ── */
  .db-setup{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;border-radius:13px;
    background:#ffffff08;border:1px solid var(--line)}
  .db-spacer{flex:1}
  .db-err{width:100%;margin:4px 0 0;padding-left:18px;color:#fca5a5;font-size:12px}
  /* ★1017 导入三层校验。三层用【颜色 + 位置】分,不加边框(★768 表面层次:靠明度分区)。 */
  .ir-box{width:100%;margin:6px 0 0;font-size:12px}
  .ir-head{margin:0 0 5px;font-weight:600}
  .ir-head.ok{color:#86efac}
  .ir-head.bad{color:#fca5a5}
  /* ① 配额:一眼扫过去的数字条,tabular-nums 让 40/40 与 8/10 对齐 */
  .ir-quota{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
  .ir-q{padding:2px 8px;border-radius:6px;background:#1f2937;color:#cbd5e1;font-variant-numeric:tabular-nums}
  .ir-q b{font-weight:700}
  .ir-q.ok{background:#14532d;color:#bbf7d0}
  .ir-q.bad{background:#3f1d1d;color:#fecaca}
  /* 未登记 = 引擎不校验这一项,别画成"差了多少" */
  .ir-q.none{background:#1f2937;color:#94a3b8;font-style:italic}
  .ir-list{margin:0 0 6px;padding-left:18px;line-height:1.6}
  .ir-list.bad{color:#fca5a5}
  .ir-list.warn{color:#fcd34d}
  /* 原文那一行:等宽小字,人能对着牌表找 */
  .ir-src{display:block;margin-top:1px;color:#94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-style:normal;font-size:11px}
  /* 导不进去时按钮明确变灰 —— 判据来自引擎,不是这里另判一套 */
  #imp:disabled{opacity:.5;cursor:not-allowed}
  .db-code{width:100%;margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}

  /* ── 主体:左卡池 / 右牌组 ── */
  .db-main{display:grid;grid-template-columns:minmax(0,1fr) 352px;gap:16px;align-items:start}
  @media (max-width:1080px){ .db-main{grid-template-columns:1fr} }
  .db-pool{min-width:0}
  .db-side{position:sticky;top:10px;max-height:calc(100dvh - 26px);overflow:auto;
    display:flex;flex-direction:column;gap:10px;scrollbar-width:thin}
  .db-detail{padding:10px;border-radius:13px;background:var(--panel);border:1px solid var(--line)}
  .db-none{padding:26px 12px;text-align:center;color:var(--dim);font-size:13px;
    border:1px dashed var(--line2);border-radius:13px}

  /* ── 筛选区 ── 控件密度刻意压小:维度多,照全局按钮的内边距铺会占掉半屏 */
  .db-shell .fbox{border:1px solid var(--line);border-radius:13px;padding:8px 10px;margin-bottom:10px;background:var(--panel)}
  .db-shell .frow{display:flex;flex-wrap:wrap;align-items:center;gap:5px 14px;margin:4px 0}
  /* position:relative 是给 .fpanel 定位用的锚点 */
  .db-shell .fgrp{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:4px}
  .db-shell .flab{font-size:11px;color:var(--dim);margin-right:2px;letter-spacing:.05em}
  .db-shell .fb{font-size:12px;padding:3px 9px;border-radius:8px;line-height:1.5;font-weight:500}
  .db-shell .fb.sec{background:#ffffff0a}
  .db-shell .fb.chip{background:var(--acc2);border-color:var(--acc2);color:#04121c;font-weight:600}
  .db-shell .fsearch{font-size:12px;padding:4px 9px}
  .db-shell .fsel{font-size:12px;padding:3px 6px}
  /* 多选下拉浮层:必须 absolute + 不透明底。用 static 会把下面整片卡池网格顶下去,
     每开一次下拉卡都整体位移一大截,点起来根本对不准 */
  .db-shell .fpanel{position:absolute;top:100%;left:0;z-index:20;margin-top:5px;width:236px;padding:7px;
    border:1px solid var(--line2);border-radius:11px;background:#101827;box-shadow:0 14px 34px #000b}
  .db-shell .fopts{max-height:230px;overflow:auto;display:flex;flex-direction:column;gap:1px;margin-top:5px}
  .db-shell .fopt{display:flex;align-items:center;gap:6px;width:100%;text-align:left;font-size:12px;
    padding:4px 7px;border-radius:7px;border:1px solid transparent;background:transparent;
    color:inherit;cursor:pointer;font-weight:400}
  .db-shell .fopt:hover{background:#ffffff14}
  .db-shell .fopt.on{background:#0ea5e92e;border-color:var(--acc2)}
  .db-shell .fck{width:12px;flex-shrink:0;color:var(--acc);font-style:normal}
  .db-shell .fopt i{margin-left:auto;font-style:normal;color:var(--dim);font-size:11px}
  .db-shell .fcount{display:flex;flex-wrap:wrap;align-items:center;gap:7px;font-size:12px;color:var(--dim);margin-bottom:8px}
  /* 命中数推到第一行最右,和左边的搜索/排序/清空拉开 */
  .db-shell .fhit{margin-left:auto;font-size:12px;color:var(--dim)}
  .db-shell .fhit b{color:var(--acc);font-size:14px}
  .db-shell .fnav{display:flex;flex-wrap:wrap;align-items:center;gap:4px}

  /* ── 卡池网格 ── */
  .pool-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:16px 12px;
    align-content:start;align-items:start}
  .pc-wrap{display:flex;flex-direction:column;gap:5px;min-width:0}
  /* ① 战场卡横着展示:它的美术是横版印在竖版卡面里的(与 board.ts 的 .bf-card 同一处理),
     竖着放会把两边裁掉。占两格宽,高度才与旁边的竖版卡接近,一行不会高低错落 */
  .pc-wrap.bf{grid-column:span 2}
  /* 窄屏只排得下一列时不能再 span 2:那会凭空造出一列隐式网格,整片卡池横向溢出 */
  @media (max-width:420px){ .pc-wrap.bf{grid-column:auto} }
  .db-shell .pc{position:relative;width:100%;aspect-ratio:744/1040;padding:0;border:1px solid var(--line);
    border-radius:11px;overflow:hidden;background:#0a1018;cursor:pointer;display:block;font-weight:400;
    transition:transform .14s,box-shadow .14s,border-color .14s}
  .db-shell .pc:hover{background:#0a1018}
  .db-shell .pc.bf{aspect-ratio:1040/744}
  .pc img{width:100%;height:100%;object-fit:cover;display:block}
  /* 旋转 -90°(逆时针):现场比对过两个方向,只有这个方向卡名与卡号在左下角是正的 */
  .pc.bf img{position:absolute;left:50%;top:50%;width:calc(100% * 744 / 1040);height:auto;
    aspect-ratio:744/1040;transform:translate(-50%,-50%) rotate(-90deg)}
  /* 卡名兜底:图没到位/加载中时垫在底下,图一盖上就看不见了。
     ⚠️ 这【不是】常态标签 —— 常态标签是卡格下面那行 .pc-cap(委托人反馈②) */
  .pc-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    padding:6px;font-size:11px;line-height:1.35;color:#93a4bb;text-align:center}
  .db-shell .pc:hover{transform:translateY(-4px);box-shadow:0 14px 30px #000c;border-color:#38bdf877;z-index:2}
  .db-shell .pc.off{cursor:not-allowed;filter:grayscale(.75) brightness(.5)}
  .db-shell .pc.off:hover{transform:none;box-shadow:none;border-color:var(--line)}
  /* ② 卡名常驻在卡格【下方】,不再是卡中间的灰字 */
  .pc-cap{display:flex;flex-direction:column;gap:1px;cursor:pointer;min-width:0;line-height:1.25}
  .pc-cap b{font-size:12px;font-weight:600;color:#d7e3f2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pc-cap small{font-size:10px;color:#75879f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pc-cap:hover b{color:var(--acc)}
  /* 已选份数角标 */
  .pc-n{position:absolute;left:5px;top:5px;background:var(--acc2);color:#04121c;font-style:normal;
    font-size:11px;font-weight:800;padding:1px 6px;border-radius:9px;box-shadow:0 2px 6px #000a}
  .pc-wip{position:absolute;left:5px;bottom:5px;background:#7f1d1dee;color:#fecaca;font-style:normal;
    font-size:9px;padding:1px 5px;border-radius:5px}
  /* 加/禁角标:hover 才显形,别一直糊在卡面上 */
  .pc-plus{position:absolute;right:5px;bottom:5px;width:22px;height:22px;border-radius:50%;
    background:#0f172aee;color:#7dd3fc;font-style:normal;font-size:13px;line-height:22px;text-align:center;
    opacity:0;transition:opacity .14s}
  .db-shell .pc:hover .pc-plus{opacity:1}
  .db-shell .pc.off .pc-plus{color:#f87171}
  /* ★763 备牌:卡格底下那颗小按钮 */
  .db-shell .pc-side{align-self:flex-start;font-size:10px;padding:1px 7px;border-radius:6px;font-weight:500;
    color:#c4b5fd;background:#4c1d9533;border:1px solid #6d28d966}
  .db-shell .pc-side:hover:not(.off){background:#4c1d9566;color:#ddd6fe}
  .db-shell .pc-side.off{opacity:.3;cursor:not-allowed}

  /* ── 右栏:牌组 ── */
  .dk-panel{padding:12px;border-radius:14px;background:var(--panel);border:1px solid var(--line)}
  .dk-top{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .dk-count{display:flex;flex-direction:column;align-items:center;line-height:1;flex-shrink:0;
    padding:6px 12px;border-radius:11px;background:#ffffff0d}
  .dk-count b{font-size:22px;color:var(--acc)}
  .dk-count small{font-size:10px;color:var(--dim);margin-top:3px}
  .dk-status{display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-size:12px}
  .dk-ok{color:var(--ok);font-weight:600}
  .dk-bad{color:var(--gold)}
  .dk-start{font-size:12px}
  .dk-sec{margin-top:12px}
  .dk-h{display:flex;align-items:baseline;gap:8px;margin:0 0 5px;padding-bottom:4px;
    border-bottom:1px solid var(--line)}
  .dk-h b{font-size:12px;font-weight:700;letter-spacing:.1em;color:#c3d2e4}
  .dk-h i{margin-left:auto;font-style:normal;font-size:11px;color:var(--acc);font-weight:700}
  .dk-note{display:block;font-size:10.5px;color:var(--dim);margin:0 0 4px}
  .dk-note b{color:var(--gold)}
  .dk-empty{display:block;font-size:11px;color:#64748b;padding:3px 0}
  .dk-row{display:flex;gap:7px;align-items:center;padding:2px 4px;border-radius:8px}
  .dk-row:hover{background:#ffffff0d}
  .db-shell .dk-del{padding:0;width:19px;height:19px;line-height:1;flex-shrink:0;border-radius:6px;
    font-size:13px;font-weight:700;background:#ffffff0d;color:#94a3b8;border:1px solid var(--line2)}
  .db-shell .dk-del:hover{background:#7f1d1d55;color:#fecaca}
  .dk-n{font-size:12px;color:var(--acc);flex-shrink:0;min-width:14px;text-align:right}
  .dk-thumb{width:26px;height:36px;object-fit:cover;border-radius:5px;flex-shrink:0;background:#0a1018}
  /* ⑤ 战场也要列出来,而且缩略图同样是横的 */
  .dk-bfthumb{position:relative;width:44px;height:31px;border-radius:5px;overflow:hidden;flex-shrink:0;background:#0a1018}
  .dk-bfthumb img{position:absolute;left:50%;top:50%;width:calc(100% * 744 / 1040);height:auto;
    aspect-ratio:744/1040;transform:translate(-50%,-50%) rotate(-90deg)}
  .dk-name{font-size:12px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dk-name:hover{color:var(--acc)}
  .dk-viol{margin:10px 0 0;padding-left:18px;font-size:11.5px;color:var(--gold)}
  .dk-viol code{color:#fde68a;font-size:11px}
  /* 六色符文快捷键:按钮颜色就是它加的那个色,不必再读文字 */
  .rq-row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
  .db-shell .rq{font-size:11px;padding:2px 9px;border-radius:7px;font-weight:600;
    color:#04121c;border:1px solid transparent}
  .db-shell .rq.off{opacity:.3;cursor:not-allowed}
  .db-shell .rq-red{background:#ef4444}.db-shell .rq-green{background:#22c55e}
  .db-shell .rq-blue{background:#3b82f6}.db-shell .rq-orange{background:#f97316}
  .db-shell .rq-purple{background:#a855f7}.db-shell .rq-yellow{background:#eab308}
  .db-shell .rq-clr{background:#ffffff0d;color:var(--dim);border-color:var(--line2);font-weight:500}

  /* 费用曲线 */
  .cv{padding:8px 10px;border-radius:11px;background:#ffffff08}
  .cv-t{font-size:11px;color:var(--dim);margin-bottom:4px;letter-spacing:.05em}
  .cv-bars{display:flex;align-items:flex-end;gap:3px;height:66px}
  .cv-col{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1}
  .cv-col small{font-size:10px;color:var(--dim)}
  .cv-bar{width:70%;max-width:16px;background:linear-gradient(180deg,#7dd3fc,#0ea5e9);border-radius:3px 3px 0 0}
  .cv-x{color:#64748b}
  .cv-warn{display:block;color:var(--gold);font-size:10.5px;margin-top:3px}
`
