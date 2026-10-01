                                                        
                                                       

import type { ClientView, ProjectedObject } from '../../engine/src/net/project'
import { cardImg, cardMeta, cardName, cardThumb, DOMAIN, keywordTip, nameifyCodes, renderCardText } from './cards'
import { cardDetailHtml, cardDetailStyles } from './cardDetail'
import { fxStyles } from './fx'                                  
import { renderLog, type LogEntry } from './log'
import { attachIndex, ensureGearStyles, equipButtonText, gearStackHtml, gearStackZ, isEquipAction, type AttachIndex } from './gear'

export interface UIAction { kind: string; player?: string; [k: string]: unknown }
   
                                                                           
                                                   
                                               
   
export interface UIPending { mode: string; player?: string; winner?: string; chainDepth?: number; request?: { key: string; prompt: string; candidates: { id: string; label: string }[]; sourceDefId?: string }; duel?: { kind: 'combat' | 'noncombat'; battlefield: string; passes: number; needed: number } }
export interface BlockedPlay { oid: string; defId: string; reason: string; detail: string; costMana?: number; costPips?: readonly string[]; haveMana?: number }
                                                           
export interface RollLike {
  dice: Readonly<Record<string, number>>
  designated?: string
  chosen?: 'first' | 'second'
  rerolls: number
  done: boolean
}

export interface RoomViewLike { code: string; seat: string; view: ClientView; pending: UIPending; legalActions: UIAction[]; seatsFilled: number; log?: readonly LogEntry[]; blocked?: readonly BlockedPlay[]; mulliganSubmitted?: boolean; roll?: RollLike; canUndo?: boolean }

                                                  
const PHASE_CN: Record<string, string> = {
  awaken: '唤醒', start: '回合开始', summon: '召出符文', draw: '抽牌', main: '主阶段', ending: '回合结束',
}

                              
function zoneNamer(view: ClientView): (z: string | undefined) => string {
  return (z) => {
    if (!z) return '某处'
    if (z.startsWith('base:')) return z.endsWith(':shared') ? '基地' : '基地'
    if (z.startsWith('hand:')) return '手牌'
    if (z.startsWith('discard')) return '废牌堆'
    if (z.startsWith('exile')) return '放逐区'
    if (z.startsWith('battlefield')) {
      const def = view.battlefieldCards?.[z]
      return def ? cardName(def) : `战场${Number(z.split(':').pop()) + 1}`
    }
    return z
  }
}

                               
                                                        
                                                  

                                                         
function targetOidsFor(rv: RoomViewLike, oid: string | null): Set<string> {
  const out = new Set<string>()
  if (!oid) return out
  for (const a of rv.legalActions) {
    if (a.oid !== oid && a.cardOid !== oid) continue
    const t = a.target as string | undefined
    if (typeof a.to === 'string') out.add(a.to)               
    if (typeof a.battlefield === 'string') out.add(a.battlefield)
    if (!t) continue
    if (t.startsWith('back:') || t.startsWith('weak:')) out.add(t.slice(5))
    else if (t.startsWith('swap:')) { const [, x, y] = t.split(':'); if (x) out.add(x); if (y) out.add(y) }
    else out.add(t)
  }
  return out
}

                                        
let actIndex: UIAction[] = []
let mulliganSel = new Set<string>()
let selectedOid: string | null = null
let openZone: string | null = null                       
let confirmConcede = false                    
                                                                    
let autoPassGet: () => boolean = () => true
let autoPassSet: (on: boolean) => void = () => {}
export function bindAutoPass(get: () => boolean, set: (on: boolean) => void): void {
  autoPassGet = get; autoPassSet = set
}
function autoPassOn(): boolean { return autoPassGet() }
let hlRefs = new Set<string>()                          
let hlTimer: number | undefined
let lastMode = ''
   
                                            
                                   
                                 
                                                                   
                                                                  
   
let equipPick: { oid: string; ability: string; target?: string } | null = null

const ZONE_CN: Record<string, string> = { discard: '废牌堆', exile: '放逐区', heroZone: '英雄区', mainDeck: '主牌堆', runeDeck: '符文牌堆' }

   
                                                  
                                             
                                                      
   
function actionableOidsOf(rv: RoomViewLike): Set<string> {
  const out = new Set<string>()
  for (const a of rv.legalActions) {
    for (const k of ['oid', 'cardOid', 'discardOid'] as const) {
      const v = a[k]
      if (typeof v === 'string') out.add(v)
    }
  }
  return out
}

                                               
function zoneBrowser(rv: RoomViewLike): string {
  if (!openZone) return ''
  const z = rv.view.zones[openZone]
  const kind = openZone.split(':')[0] ?? ''
  const owner = openZone.split(':')[1] === rv.seat ? '你的' : '对手的'
                                                         
                                                                                 
                                                
  const actionable = actionableOidsOf(rv)
  const contents = z?.contents ?? []
  const cards = contents.map((oid) => cardEl(rv.view.objects[oid], oid, 'sz-hand',
    { clickable: actionable.has(oid), selected: selectedOid === oid })).join('')
  const hot = contents.filter((oid) => actionable.has(oid)).length
                                                  
                                           
                      
                                                            
  return `<div class="overlay zonebrowse" data-zone-close="1"><div class="panel wide" data-zone-keep="1">
    <h2>${owner}${ZONE_CN[kind] ?? kind}(${contents.length})</h2>
    ${hot ? `<p class="zb-hint">亮起的 ${hot} 张此刻可以直接从这里打出(§829 流转等)——点一下选中,再在下方面板里确认。</p>` : ''}
    <div class="zone-grid">${cards || '<i class="lane-empty">空</i>'}</div>
    <button class="btn ghost" data-zone-close="1">关闭</button>
  </div></div>`
}

function act(a: UIAction): number { return actIndex.push(a) - 1 }
                                                           
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

                                                                             
   
                                            
                                                 
                                                
                                          
   
const FAN_SPAN = 56                 
const FAN_STEP = 9                            
function fanStyle(i: number, n: number): string {
  if (n <= 1) return '--rot:0deg;--arc-t:0;--zi:1'
  const c = (n - 1) / 2
  const t = (i - c) / c                      
  const step = Math.min(FAN_STEP, FAN_SPAN / (n - 1))
  const rot = (i - c) * step
                                                           
  return `--rot:${rot.toFixed(2)}deg;--arc-t:${(t * t).toFixed(3)};--zi:${i + 1}`
}


   
                                          
  
                                              
                                  
                                                     
                                  
  
                                                           
   
                                                                 
function isRuneObj(o: { defId?: string } | undefined): boolean {
  return o?.defId?.startsWith('rune:') === true
}

   
                                                 
                                                                            
                                                                                              
                                                
                                    
   
function restrictionLabel(r: string): string {
  if (r === 'move') return '⛓ 无法移动'
  if (r === 'moveToBase') return '⛓ 无法移动到基地'
  if (r === 'enemyMove') return '⛓ 无法被敌方法术和技能移动'
  if (r === 'combatDamage') return '⛓ 无法造成战斗伤害'
  if (r === 'enemyTarget') return '⛓ 对手无法将其选为目标'
  if (r === 'ready') return '⛓ 无法变为活跃'
  if (r === '瞬息不触发') return '⛓ 瞬息不触发'
  if (r.startsWith('moveBy:')) {
    const who = r.slice('moveBy:'.length)
    const mine = hovRv?.seat === who
    return `⛓ ${mine ? '你' : '对手'}本回合无法移动此牌`
  }
  return `⛓ 受限:${r}`
}

function appliedTags(o: ProjectedObject | undefined): string[] {
  const st = o as (ProjectedObject & { tapped?: boolean; dormant?: boolean; standbyFresh?: boolean;
    counters?: Record<string, number> }) | undefined
  if (!st) return []
  const out: string[] = []
  if (st.stunned) out.push('💫 眩晕(本回合无法造成战斗伤害)')
  if (st.dormant) out.push('😴 休眠')
                                            
                                                          
                                                    
                                                                  
                                                                  
                                                       
                                                                  
                                      
  if (st.tapped) out.push(isRuneObj(st) ? '↻ 已横置(产过 1 点法力)' : '😴 休眠')
  if (st.standbyFresh) out.push('🔒 本回合刚布置(§811.1.b 下回合才可打出)')
  for (const [k, v] of Object.entries(st.counters ?? {})) {
    if (k === 'buff') out.push(v > 1 ? `✦ 增益 ×${v}` : '✦ 增益')
    else if (k === 'empower') out.push(v > 1 ? `⚡ 已强化 ×${v}` : '⚡ 已强化')
    else out.push(v > 1 ? `● ${k} ×${v}` : `● ${k}`)
  }
  for (const r of st.restrictions ?? []) out.push(restrictionLabel(r))            
  return out
}

   
                            
                                                    
                                                                  
                   
   
function mightReading(defId: string | undefined, o: ProjectedObject | undefined):
  { cur: number; base: number | null; delta: number } | null {
  if (!o || o.might === undefined || o.might === null) return null
  const base = cardMeta(defId)?.power ?? null
  const cur = o.might
  return { cur, base, delta: base === null ? 0 : cur - base }
}

function cardEl(o: ProjectedObject | undefined, oid: string, size: string, opts: { clickable?: boolean; selected?: boolean; badge?: string; targetable?: boolean; plain?: boolean; style?: string; faceDown?: boolean } = {}): string {
  const st = o as (ProjectedObject & { tapped?: boolean; standbyFresh?: boolean; dormant?: boolean }) | undefined
  const cls = `card ${size}${opts.clickable ? ' clickable' : ''}${opts.selected ? ' selected' : ''}${opts.targetable ? ' targetable' : ''}`
    + `${st?.tapped ? ' is-tapped' : ''}${st?.dormant ? ' is-dormant' : ''}${st?.stunned ? ' is-stunned' : ''}${hlRefs.has(oid) ? ' lg-hl' : ''}`
  const styleAttr = opts.style ? ` style="${opts.style}"` : ''                     
  if (!o || o.hidden || oid === 'hidden') {
    return `<div class="${cls} back"${styleAttr} title="面朝下/不可见"><div class="back-swirl">❖</div></div>`
  }
                                                          
                                                      
                                                          
                      
  if (opts.faceDown) {
    const nm = cardName(o.defId ?? '?')
    return `<div class="${cls} is-facedown"${opts.plain ? '' : ` data-card="${oid}"`} data-def="${esc(o.defId ?? '?')}"${styleAttr}
      title="面朝下的待命牌:${esc(nm)}(只有你看得见)">
      <div class="back-swirl">❖</div>
      <span class="fd-name">${esc(nm)}</span>
      ${opts.badge ? `<span class="corner">${opts.badge}</span>` : ''}
    </div>`
  }
  const defId = o.defId ?? '?'
  const name = cardName(defId)
  const src = cardImg(defId)
                                                      
  const img = src ? `<img src="${src}" alt="${esc(name)}" draggable="false" onerror="this.parentElement.classList.add('noimg');this.remove()"/>` : ''
  const mightBadge = o.might !== undefined && o.might !== null && (o.zone?.startsWith('battlefield') || o.zone?.startsWith('base'))
    ? `<span class="might${(o.damage ?? 0) > 0 ? ' hurt' : ''}">${o.might}${(o.damage ?? 0) > 0 ? `<i>-${o.damage}</i>` : ''}</span>` : ''
                                                             
  const kwChips = (o.keywords ?? []).filter((k) => !k.startsWith('反应') && !k.startsWith('迅捷'))
    .map((k) => `<b class="kwchip" title="${esc(keywordTip(k))}">${esc(k.slice(0, 1))}${/\d/.test(k) ? k.replace(/\D/g, '') : ''}</b>`).join('')
                                                   
                                                       
  const tags = appliedTags(o)
  const tagBadge = tags.length
    ? `<span class="tagbadge" title="${esc(tags.join('\n'))}">${tags.length}</span>` : ''
  const marks: string[] = []
  if (st?.standbyFresh) marks.push('🔒')                                            
  if (o.faceDown) marks.push('🫥')
  if ((o.restrictions ?? []).length) marks.push('⛓')
                                                   
                                                                    
                                                   
  const dataOid = opts.plain ? '' : ` data-card="${oid}"`
                                                      
  return `<div class="${cls}"${dataOid}${styleAttr} data-def="${esc(defId)}" title="${esc(name)}">
    <div class="txtcard"><b>${esc(name)}</b></div>
    ${img}
    ${mightBadge}
    ${tagBadge}
    ${kwChips ? `<span class="kwrow">${kwChips}</span>` : ''}
    ${marks.length ? `<span class="marks">${marks.join('')}</span>` : ''}
    ${opts.badge ? `<span class="corner">${opts.badge}</span>` : ''}
  </div>`
}

   
                           
                                                          
   
   
                                           
                                                               
                                                               
                                        
                              
   
function matBaseRow(rv: RoomViewLike, player: string, mine: boolean, tg: Set<string>): string {
  const { view } = rv
  const one = (zid: string, lab: string, badge: string): string => {
    const z = view.zones[zid]
    const oid = z?.contents[0]
                                          
                                     
    const card = oid ? cardEl(view.objects[oid], oid, 'sz-hero', { clickable: mine, badge }) : '<div class="slot-empty"></div>'
    return `<div class="matslot"><span class="ms-lab">${lab}</span>${card}</div>`
  }
  const deckN = view.zones[`mainDeck:${player}`]?.contents.length ?? 0
  return `<div class="matrow base">
    ${one(`heroZone:${player}`, '英雄', '英雄')}
    ${one(`legend:${player}`, '传奇', '传奇')}
    <div class="matzone wide" data-zoneanchor="base:${player}"><span class="mz-lab">基地 BASE</span>
      <div class="mz-cards">${baseCards(view, player, mine, tg) || '<i class="mz-empty">空</i>'}</div></div>
  </div>`
}

   
                                           
                                             
                                               
   
function pileColumn(rv: RoomViewLike, player: string): string {
  const { view } = rv
  const deckN = view.zones[`mainDeck:${player}`]?.contents.length ?? 0
  const disc = view.zones[`discard:${player}`]?.contents.length ?? 0
  return `<div class="pilecol">
    ${pileEl('mainDeck', player, '主牌堆', deckN, { back: true, big: true, danger: deckN <= 3,
      tip: deckN <= 3 ? '牌库快空了:§431 抽不到牌会燃尽,白送对手 1 分' : '主牌堆剩余' })}
    ${pileEl('discard', player, '废牌堆', disc, { link: true, big: true, tip: '点开查看废牌堆(公开信息)',
      ...(topOf(view, `discard:${player}`) ? { topDefId: topOf(view, `discard:${player}`)! } : {}) })}
  </div>`
}

function matRuneRow(rv: RoomViewLike, player: string, mine: boolean): string {
  const { view } = rv
  const base = view.zones[`base:${player}`]?.contents ?? []
  const runes = base.filter((oid) => view.objects[oid]?.defId?.startsWith('rune:'))
  const active = runes.filter((oid) => (view.objects[oid] as { tapped?: boolean } | undefined)?.tapped !== true).length
                                             
                                       
                                    
                                          
  return `<div class="matrow rune">
    <div class="matslot bare">${pileEl('exile', player, '放逐', view.zones[`exile:${player}`]?.contents.length ?? 0, { link: true, big: true, tip: '点开查看放逐区',
      ...(topOf(view, `exile:${player}`) ? { topDefId: topOf(view, `exile:${player}`)! } : {}) })}</div>
    <div class="matslot bare runedeck-slot">${pileEl('runeDeck', player, '符文堆', view.zones[`runeDeck:${player}`]?.contents.length ?? 0, { back: true, big: true, tip: '符文牌堆剩余' })}
      ${mine ? `<div class="res-under">${resChips(view)}</div>` : ''}</div>
    <div class="matzone runezone"><span class="mz-lab">符文 <b>${active}</b>/<span>${runes.length}</span> 张活跃</span>
      <div class="mz-cards rn-stack" style="--n:${Math.max(runes.length, 1)}">${runeCards(view, player) || '<i class="mz-empty">无</i>'}</div></div>
    <div class="matgap"></div>
  </div>`
}

   
                                               
                                           
                   
                                                  
   
function resChips(view: ClientView): string {
  const cap = (view as { runes?: Record<string, number> }).runes ?? {}
  const pool = (view as { pool?: { mana: number; energy: Record<string, number> } }).pool
  const active = (view as { activeRunes?: number }).activeRunes ?? 0
  const poolMana = pool?.mana ?? 0
  const poolE = Object.entries(pool?.energy ?? {}).filter(([, v]) => v > 0)
  const poolETotal = poolE.reduce((a, [, v]) => a + v, 0)
                                                 
                                    
                             
  const pip = (d: string, v: number, cls = ''): string =>
    `<b class="pip ${cls}" style="--dc:${DOMAIN[d]?.color ?? '#888'}">${DOMAIN[d]?.name ?? d} ${v}</b>`

                                                
                                  
                                               
                              
                                              
  void cap; void view
                                                      
                                                     
                                            
                                           
  return `<div class="res-title">符文池</div>
    <div class="res-line${poolMana > 0 ? ' hot' : ''}"
      title="符文池里已经产出来的法力(横置符文产的就是法力 §164.2.a)。§167 主阶段开始与回合结束会全部清空,不花就浪费了">
      法力数量:<b>${poolMana}</b></div>
    <div class="res-line${poolETotal > 0 ? ' hot' : ''}"
      title="符文池里已经产出来的符能,按颜色分。同样会在 §167 两个时点清空">
      符能数量:<b>${poolETotal}</b>${poolE.length ? ` <span class="res-cols">${poolE.map(([d, v]) => pip(d, v, 'lit')).join('')}</span>` : ''}</div>`
}

   
                            
                                                                
                                                               
   
function topOf(view: ClientView, zone: string): string | undefined {
  const c = view.zones[zone]?.contents ?? []
  const top = c[c.length - 1]
  if (!top || top === 'hidden') return undefined
  return view.objects[top]?.defId
}

                      
function pileEl(kind: string, player: string, label: string, count: number, opts: { back?: boolean; link?: boolean; danger?: boolean; tip?: string; big?: boolean; topDefId?: string } = {}): string {
  const empty = count === 0
                                          
                                                 
                                  
  const faceArt = !opts.back && opts.topDefId ? (cardThumb(opts.topDefId) ?? cardImg(opts.topDefId)) : null
                                                  
                                    
  const faceTop = faceArt
    ? `<div class="pile-card face"><img src="${faceArt}" alt="" onerror="this.remove()"></div>`
    : `<div class="pile-card${opts.back ? ' back' : ' face'}"></div>`
  const layers = opts.big && !empty
    ? `<div class="pile-card l3${opts.back ? ' back' : ' face'}"></div><div class="pile-card l2${opts.back ? ' back' : ' face'}"></div>${faceTop}`
    : empty ? '<div class="pile-slot"></div>' : faceTop
                                                           
                                                      
                                                                 
  const hov = faceArt && opts.topDefId ? ` data-hover-def="${esc(opts.topDefId)}"` : ''
  return `<div class="pile${opts.big ? ' big' : ''}${opts.danger ? ' danger' : ''}${empty ? ' empty' : ''}" data-pile="${kind}:${player}"${opts.link && !empty ? ` data-zone="${kind}:${player}"` : ''}${hov} title="${esc(opts.tip || label)}">
    <div class="pile-stack">${layers}${opts.big ? `<b class="pile-big-n">${count}</b>` : ''}</div>
    <span class="pile-lab">${label}</span>${opts.big ? '' : `<b class="pile-n">${count}</b>`}
  </div>`
}

                                       
function runeZone(view: ClientView, player: string): string {
  const cards = runeCards(view, player)
  const active = (view.zones[`base:${player}`]?.contents ?? []).filter((oid) => {
    const o = view.objects[oid]
    return o?.defId?.startsWith('rune:') && (o as { tapped?: boolean }).tapped !== true
  }).length
  const total = (view.zones[`base:${player}`]?.contents ?? []).filter((oid) => view.objects[oid]?.defId?.startsWith('rune:')).length
  return `<div class="runezone" title="符文区:横置的符文已产过法力(§164.2.a);活跃 ${active}/${total}">
    <span class="rz-lab">符文区 <b>${active}</b>/<span>${total}</span></span>
    <div class="rz-cards">${cards || '<i class="rz-empty">无</i>'}</div>
  </div>`
}

function runeCards(view: ClientView, player: string): string {
  const base = view.zones[`base:${player}`]
  if (!base) return ''
  const cards: string[] = []
  for (const oid of base.contents) {
    const o = view.objects[oid]
    if (!o?.defId?.startsWith('rune:')) continue
    const d = o.defId.slice(5)
    const info = DOMAIN[d]
    const tapped = (o as { tapped?: boolean }).tapped === true
                                                     
                                                   
                                                            
    const art = cardThumb(o.defId)
    cards.push(`<div class="card sz-rune rune-face${tapped ? ' is-tapped' : ''}" data-card="${oid}"
      style="--dc:${info?.color ?? '#888'}"
      title="${info?.name ?? d}符文${tapped ? ' · 已横置(产过 1 点法力)' : ' · 活跃'}">
      ${art ? `<img class="rn-art" src="${art}" alt="" onerror="this.remove()">` : ''}
      <span class="rn-name">${info?.name ?? d}</span></div>`)
  }
  return cards.join('')
}

   
                                                      
                                         
                                                                 
                                                      
                                                      
                                                       
                                               
   
function seatCue(rv: RoomViewLike, player: string, mine: boolean): string {
  const { view, pending } = rv
  const who = mine ? '你' : '对手'
  const cues: string[] = []
                                    
  if ((pending.mode === 'window' || pending.mode === 'choice') && pending.player === player) {
    cues.push(`<span class="cue prio" title="§312 现在轮到${who}行动(打反应/抉择/让过);别人在等${who}">▸ 该${who}了</span>`)
  }
  if (view.focus === player) {
    cues.push(`<span class="cue focus" title="§313 ${who}持有焦点(法术对决期间)。§313.4 没有优先权时,光有焦点也不能行动">◎ 焦点</span>`)
  }
  return cues.join('')
}

   
                                          
                              
                                                     
   
function seatStrip(view: ClientView, player: string, mine: boolean): string {
  const n = (kind: string): number => view.zones[`${kind}:${player}`]?.contents.length ?? 0
  const deck = n('mainDeck')
  const burn = deck <= 3
                                             
                                           
  const pile = (kind: string, label: string, count: number, opts: { back?: boolean; link?: boolean; danger?: boolean; tip?: string } = {}): string => {
    const empty = count === 0
    return `<div class="pile${opts.danger ? ' danger' : ''}${empty ? ' empty' : ''}"${opts.link && !empty ? ` data-zone="${kind}:${player}"` : ''} title="${esc(opts.tip || label)}">
      <div class="pile-stack">${empty ? '<div class="pile-slot"></div>' : `<div class="pile-card${opts.back ? ' back' : ' face'}"></div>`}</div>
      <span class="pile-lab">${label}</span><b class="pile-n">${count}</b>
    </div>`
  }
  const parts = [
    pile('mainDeck', '牌库', deck, { back: true, danger: burn, tip: burn ? '牌库快空了:§431 抽不到牌会燃尽,白送对手 1 分' : '主牌堆剩余' }),
    pile('runeDeck', '符文', n('runeDeck'), { back: true, tip: '符文牌堆剩余' }),
    pile('discard', '废牌堆', n('discard'), { link: true, tip: '点开查看废牌堆(公开信息)' }),
    pile('exile', '放逐', n('exile'), { link: true, tip: '点开查看放逐区' }),
  ]
  const heroN = n('heroZone')                                              
  if (heroN > 0) parts.push(pile('heroZone', '英雄区', heroN, { link: true, tip: '英雄区:开局的选定英雄(§103.2)在此' }))
  if (mine) {
    const runes = (view as { runes?: Record<string, number> }).runes ?? {}
    const energy = Object.entries(runes).filter(([, v]) => v > 0)
      // ⚠️ 别写成 "P2":那是官方缩写 [P] 加数量,但在双人局里会被读成"玩家2"。用中文域名最不容易误读
      .map(([d, v]) => `<b class="pip" style="--dc:${DOMAIN[d]?.color ?? '#888'}" title="${DOMAIN[d]?.name ?? d}符能:每枚活跃符文可回收产 1 点本色符能(§164.2.b)">${DOMAIN[d]?.name ?? d} ${v}</b>`).join('')
    const pool = (view as { pool?: { mana: number; energy: Record<string, number> } }).pool
    const active = (view as { activeRunes?: number }).activeRunes ?? 0
    const poolE = Object.values(pool?.energy ?? {}).reduce((a, b) => a + b, 0)
    parts.push(`<span class="chip mana-chip" title="可用法力 = 符文池里的纯法力 ${pool?.mana ?? 0} + 活跃符文 ${active} 枚(每枚横置产 1 点法力 §164.2.a)">◈ 法力 <b>${view.mana}</b></span>`)
    if (energy) parts.push(`<span class="chip" title="每枚符文可回收产 1 点本域符能(§164.2.b);回收会把它送回符文牌堆底">符能 ${energy}</span>`)
                                                      
    if ((pool?.mana ?? 0) + poolE > 0) {
      parts.push(`<span class="chip pool-chip" title="符文池里已经浮动出来的资源(法力+符能):§167 在主阶段开始与回合结束会清空,不花就浪费了。活跃符文不受此影响">符文池 <b>${(pool?.mana ?? 0) + poolE}</b> ⏳</span>`)
    }
  }
  return `<div class="seatstrip">${parts.join('')}</div>`
}

   
                                         
                                               
                                
                                                 
                                      
                                               
   
function stackedCardEl(view: ClientView, oid: string, size: string, idx: AttachIndex,
  opts: { clickable?: boolean; targetable?: boolean } = {}, tg: Set<string> = new Set()): string {
  const gears = idx.onHost.get(oid) ?? []
  if (gears.length === 0) return cardEl(view.objects[oid], oid, size, opts)
  const n = gears.length + 1
  const parts = [cardEl(view.objects[oid], oid, size, { ...opts, style: gearStackZ(0, n) })]
  gears.forEach((g, i) => parts.push(cardEl(view.objects[g], g, size, {
    clickable: opts.clickable, targetable: tg.has(g), style: gearStackZ(i + 1, n),
  })))
  return gearStackHtml(parts)
}

                       
function baseCards(view: ClientView, player: string, mine: boolean, tg: Set<string> = new Set()): string {
  const base = view.zones[`base:${player}`]
  if (!base) return ''
  const idx = attachIndex(view)
  return base.contents.filter((oid) => {
    const o = view.objects[oid]
    if (idx.hostOf.has(oid)) return false                           
    return oid === 'hidden' || !(o?.defId?.startsWith('rune:'))
  }).map((oid) => stackedCardEl(view, oid, 'sz-field', idx, { clickable: mine, targetable: tg.has(oid) }, tg)).join('')
}

           
function legendCards(view: ClientView, player: string, mine: boolean): string {
  const z = view.zones[`legend:${player}`]
                                                                       
                               
  const hz = view.zones[`heroZone:${player}`]
  const legend = z && z.contents.length ? z.contents.map((oid) => cardEl(view.objects[oid], oid, 'sz-field', { clickable: mine, badge: '传奇' })).join('') : ''
  const hero = hz && hz.contents.length ? hz.contents.map((oid) => cardEl(view.objects[oid], oid, 'sz-field', { clickable: mine, badge: '英雄' })).join('') : ''
  if (!legend && !hero) return ''
  return `<div class="legend-slot">${legend}${hero}</div>`
}

function bfIndex(zoneId: string): string { return zoneId.split(':').pop() ?? '0' }

                                        
   
                                                
                                                              
                                              
                                                             
                                                  
                               
   
function standbyCell(view: ClientView, oids: readonly string[], cap: number, mine: boolean, bfId: string): string {
  const cells: string[] = []
  for (let i = 0; i < cap; i++) {
    const oid = oids[i]
    if (oid) {
      const o = view.objects[oid]
      const fresh = (o as { standbyFresh?: boolean } | undefined)?.standbyFresh === true
      cells.push(cardEl(o, oid, 'sz-field', { clickable: mine, faceDown: mine, badge: fresh ? '🔒' : '🫥' }))
    } else {
      cells.push(`<i class="sb-empty" title="§811.1.b 待命位:把牌盖着放在这里,下回合起可以 0 费翻开打出">🫥<span>待命位</span></i>`)
    }
  }
  return `<div class="sb-cell${mine ? ' mine' : ''}"${mine ? ` data-standbyanchor="${bfId}"` : ''}>${cells.join('')}</div>`
}

function battlefieldPanel(rv: RoomViewLike, bfId: string, tg: Set<string> = new Set()): string {
  const { view, seat } = rv
  const z = view.zones[bfId]!
  const opp = view.players.find((p) => p !== seat) ?? 'P?'
  const gearIdx = attachIndex(view)
                                                        
  const units = z.contents.filter((oid) => !gearIdx.hostOf.has(oid)).map((oid) => ({ oid, o: view.objects[oid] }))
  const mineUnits = units.filter((u) => u.o?.controller === seat)
  const oppUnits = units.filter((u) => u.o?.controller !== seat)
                                                     
                                                                 
                                            
  const sb = view.zones[`standby:shared:${bfIndex(bfId)}`]
  const sbAll = sb?.contents ?? []
                                                         
  const sbMine = sbAll.filter((oid) => { const o = view.objects[oid]; return !!o && !o.hidden && o.controller === seat })
  const sbFoe = sbAll.filter((oid) => !sbMine.includes(oid))
  const attack = rv.legalActions.find((a) => a.kind === 'ATTACK' && a.battlefield === bfId)
  const n = Number(bfIndex(bfId)) + 1
  const bfDef = (view as { battlefieldCards?: Record<string, string> }).battlefieldCards?.[bfId]
  const bfName = bfDef ? cardName(bfDef) : `战场 ${n}`
                                                
  const scored = (view as { scoredThisTurn?: Record<string, readonly string[]> }).scoredThisTurn ?? {}
  const scoredBy = Object.entries(scored).find(([, list]) => list.includes(bfId))?.[0]
  const lock = scoredBy ? `<span class="bf-lock" title="§470 本回合此处已由${scoredBy === seat ? '你' : '对手'}得过分,本回合不会再得分">✔ 本回合已计分</span>` : ''
                                           
  const ctrl = (view as { battlefieldControl?: Record<string, string | null> }).battlefieldControl?.[bfId] ?? null
  const flag = ctrl === seat
    ? `<span class="bf-flag mine" title="你控制此处:此处只有你的单位。§315.2.b.2 在【你的】下个回合开始的计分步,你会据守它得 1 分">▲ 你控制</span>`
    : ctrl
      ? `<span class="bf-flag foe" title="对手控制此处。§315.2.b.2 在【对手的】下个回合开始时,他会据守它得 1 分">▼ 对手控制</span>`
      : `<span class="bf-flag none" title="无人控制:此处没有单位,或双方都有单位">◇ 无人控制</span>`
  const cap = sb?.capacity ?? 1
                                       
  const bfArt = bfDef ? cardImg(bfDef) : null
  return `<div class="bf${tg.has(bfId) ? ' bf-target' : ''}${ctrl === seat ? ' bf-mine' : ctrl ? ' bf-foe' : ''}${hlRefs.has(bfId) ? ' lg-hl' : ''}" data-zoneanchor="${bfId}"${bfArt ? ` style="--bf-art:url('${bfArt}')"` : ''}>
    <div class="bf-head"><span class="bf-name" ${bfDef ? `data-card-def="${esc(bfDef)}"` : ''} title="${bfDef ? '点击查看这张战场卡' : ''}">⚔ ${bfName}</span>
      ${flag}
      ${lock}
      ${attack ? `<button class="btn attack" data-act="${act(attack)}">发起战斗</button>` : ''}
      ${sb ? `<span class="sb-count" title="§107.3.a 待命位容量 ${cap};待命区是战场的子区域">🫥 待命 ${sbAll.length}/${cap}</span>` : ''}
    </div>
    ${bfDef ? `<div class="bf-card ${Number(bfIndex(bfId)) === 0 ? 'left' : 'right'}"
      data-card-def="${esc(bfDef)}" title="${esc(cardName(bfDef))} —— 点开看全文">
      <img src="${cardImg(bfDef) ?? ''}" alt="${esc(cardName(bfDef))}" onerror="this.remove()">
    </div>` : ''}
    <div class="bf-lanes">
      <div class="bf-lane opp-lane">${sb ? standbyCell(view, sbFoe, cap, false, bfId) : ''}${oppUnits.map((u) => stackedCardEl(view, u.oid, 'sz-field', gearIdx, { targetable: tg.has(u.oid) }, tg)).join('') || '<i class="lane-empty">—</i>'}</div>
      <div class="bf-vs">⚔</div>
      <div class="bf-lane my-lane">${sb ? standbyCell(view, sbMine, cap, true, bfId) : ''}${mineUnits.map((u) => stackedCardEl(view, u.oid, 'sz-field', gearIdx, { clickable: true, targetable: tg.has(u.oid) }, tg)).join('') || '<i class="lane-empty">—</i>'}</div>
    </div>
  </div>`
}

const CHAIN_KIND_CN: Record<string, string> = { spell: '法术', triggered: '触发式技能', activated: '主动技能', ability: '技能', unit: '单位', equipment: '装备', resource: '获得资源的技能' }

   
                                   
                                          
                                       
                                                      
                                                          
   
   
                                         
                                       
  
                                               
                                              
  
                                                             
                                                     
                                                    
                      
   
function chainOverlay(rv: RoomViewLike, passAct: UIAction | undefined): string {
  const items = (rv.view as { chain?: readonly { id: string; controller: string; kind: string; status: string; defId?: string; target?: string }[] }).chain ?? []
                                       
                                                
                                                      
  const inWindow = rv.pending.mode === 'window' && rv.pending.player === rv.seat
  if (items.length === 0 && !inWindow) return ''
  const { view, seat, pending } = rv
  const pendingN = items.filter((i) => i.status === 'pending').length
  const confirmed = items.filter((i) => i.status === 'confirmed')
  const nextResolve = confirmed[confirmed.length - 1]                          
  const rows = items.map((it, i) => {
    const who = it.controller === seat ? '你' : '对手'
    const nm = it.defId
      ? (it.kind === 'triggered' ? `${cardName(it.defId)} · 技能` : cardName(it.defId))
      : (CHAIN_KIND_CN[it.kind] ?? it.kind)
    const isNext = nextResolve && it.id === nextResolve.id
    const img = it.defId ? cardThumb(it.defId) : null
                                          
    const tgt = it.target ? view.objects[it.target]?.defId : undefined
    const st = it.status === 'pending' ? '待确认' : isNext ? '下一个结算 ▲' : '已确认'
    return `<div class="ci ${it.status}${isNext ? ' next' : ''}">
      <i class="ci-n">${i + 1}</i>
      ${img ? `<img class="ci-art" src="${img}" alt="" onerror="this.remove()">` : ''}
      <span class="ci-main">
        <b>${esc(nm)}</b>
        <i class="ci-sub">${who}的${CHAIN_KIND_CN[it.kind] ?? it.kind}${tgt ? ` → 指向〈${esc(cardName(tgt))}〉` : ''}</i>
      </span>
      <i class="ci-st">${st}</i>
    </div>`
  }).join('')
                            
  const why = pending.mode === 'window' && nextResolve && nextResolve.controller !== seat && nextResolve.defId
    ? `对手打出了〈${esc(cardName(nextResolve.defId))}〉,现在轮到你回应`
    : items.length === 0 ? '现在给你一次回应的机会 —— 不打就让过'
    : pendingN > 0 ? '链上还有项目等着确认' : '双方都让过就开始结算'
  const note = pendingN > 0
    ? `<b class="warn">链上还有 ${pendingN} 项待确认 —— 在它们确认完之前,什么都不会结算(§337)</b>`
    : '双方连续让过才会结算,而且一次只结算最上面那一项(§339.1 / §340.1);结算完还会再开一次窗口(§340.4)'
                                    
  const reactN = rv.legalActions.filter((a) => a.kind !== 'PASS').length
  const h = passHint(rv)
  const foot = passAct
    ? `<div class="ch-foot">
        <button id="rb-bigbtn" class="ch-pass" data-hotkey="a" data-act="${act(passAct)}" title="${esc(h.tip)}(快捷键:空格 或 A)">
          <b>让过</b><i>${esc(h.label.replace(/^让过 ▶\s*/, '').replace(/^[(（]|[)）]$/g, '') || '把优先权交回去')}</i>
        </button>
        <span class="ch-react ${reactN > 0 ? 'has' : 'none'}">${reactN > 0
          ? `你手上有 <b>${reactN}</b> 个可以现在做的动作 —— 点亮的牌都能打`
          : '你手上没有可响应的牌'}</span>
        <button class="ch-passall${passAllArmed ? ' on' : ''}" data-passall="1"
          title="${passAllArmed
            ? '已开启:这条链剩下的每一次反应窗口都自动让过。再点一下关掉。'
            : '这条链剩下的反应我都不打了 —— 后续每次轮到我都自动让过,链清空后自动关闭。'}">
          ${passAllArmed ? '✔ 全部让过中' : '⏩ 本轮全部让过'}</button>
      </div>`
    : ''
  return `<div class="chainov">
    <div class="ch-head"><span class="ch-title">⛓ 正在结算链</span><span class="ch-why">${why}</span></div>
    <div class="ch-list">${rows}</div>
    <div class="ch-note">${note}</div>
    ${foot}
  </div>`
}

   
                                 
                                          
                                                
   
function passHint(rv: RoomViewLike): { label: string; tip: string } {
                            
                                    
                                                           
                                        
                                                 
                                                        
                                                              
                                                                
  const duel = rv.pending.duel
  if (duel) {
    const at = zoneNamer(rv.view)(duel.battlefield)
    if (duel.passes + 1 >= duel.needed) {
                                          
      return duel.kind === 'combat'
        ? { label: '让过 ▶(对决将关闭 → 结算战斗伤害)', tip: `对手已让过;你再让过就关闭〈${at}〉的战斗法术对决,进入战斗伤害步(§348.1 → §465)` }
        : { label: '让过 ▶(对决将关闭 → 判定征服)', tip: `对手已让过;你再让过就关闭〈${at}〉的法术对决,由仅剩单位的一方确立控制并判征服(§348.2.a / §348.2.a.1)` }
    }
                                
    return { label: '让过 ▶(焦点交给对手)', tip: `你让过后焦点交给对手,〈${at}〉的对决继续;要双方【依次各让过一次】才关闭(§347.2.b / §347.2.a)` }
  }
  const v = rv.view as { chain?: readonly { status: string; defId?: string }[]; feprPasses?: number }
  const items = v.chain ?? []
  const confirmed = items.filter((i) => i.status === 'confirmed')
  const next = confirmed[confirmed.length - 1]
  const others = rv.view.players.length - 1
  const oppPassed = (v.feprPasses ?? 0) >= others
  if (items.some((i) => i.status === 'pending')) {
    return { label: '让过 ▶', tip: '链上还有待确认的项目,让过不会结算任何东西(§337)' }
  }
  if (oppPassed && next) {
    const nm = next.defId ? cardName(next.defId) : '链顶项目'
    return { label: `让过 ▶(〈${nm}〉将结算)`, tip: `对手已让过;你再让过就进入结算,先结算最后确认的〈${nm}〉(§340.1)` }
  }
  return { label: '让过 ▶(等对手回应)', tip: '§339.1 要双方连续让过才结算;你让过后对手仍可加项目' }
}

   
                                     
                                        
                                           
                                                             
                                     
                                                 
   
function lastPointHint(rv: RoomViewLike, winTarget: number): string {
  const { view, seat } = rv
  const mine = view.scores[seat] ?? 0
  if (mine < winTarget - 1) return ''
  const scored = (view as { scoredThisTurn?: Record<string, readonly string[]> }).scoredThisTurn ?? {}
  const mineScored = scored[seat] ?? []
  const bfs = Object.keys(view.zones).filter((z) => z.startsWith('battlefield'))
  const allScored = bfs.length > 0 && bfs.every((b) => mineScored.includes(b))
  return `<span class="lastpoint${allScored ? ' ok' : ''}" title="§471.1.b.1 只限制征服得分;据守不受限。§472 判胜在清理时检查,还要求分数高于所有对手">
    ${allScored
      ? '🔓 最后一分已解锁:本回合每个战场都得过分,征服可以拿下最后一分'
      : `🔒 最后一分锁着:你 ${mine} 分,此时靠<b>征服</b>得分会改成抽一张牌,除非本回合在<b>每个</b>战场都得过分(现 ${mineScored.length}/${bfs.length})`}
  </span>`
}

   
            
                                
                                           
                                              
   
function endTurnWarnings(rv: RoomViewLike): string[] {
  const v = rv.view as ClientView & { pool?: { mana: number; energy: Record<string, number> }; battlefieldControl?: Record<string, string | null> }
  const out: string[] = []
  const poolMana = v.pool?.mana ?? 0
  const poolEnergy = Object.values(v.pool?.energy ?? {}).reduce((a, b) => a + b, 0)
  if (poolMana + poolEnergy > 0) {
    out.push(`符文池里还有 ${poolMana ? `${poolMana} 点法力` : ''}${poolMana && poolEnergy ? '、' : ''}${poolEnergy ? `${poolEnergy} 点符能` : ''}没花 —— 回合结束会清空(§167)`)
  }
                                         
  const scored = (v as { scoredThisTurn?: Record<string, readonly string[]> }).scoredThisTurn?.[rv.seat] ?? []
  for (const [bf, ctrl] of Object.entries(v.battlefieldControl ?? {})) {
    if (ctrl !== rv.seat || scored.includes(bf)) continue
    const def = v.battlefieldCards?.[bf]
    out.push(`你控制${def ? cardName(def) : bf}且本回合未在此得分 —— 守住它,你的下个回合开始 +1 分`)
  }
  return out
}

                               
function combatBar(view: ClientView, seat: string): string {
  const c = (view as { lastCombat?: {
    battlefield: string; attacker: string; defender: string; attackerMight: number; defenderMight: number
    units: { defId: string; side: string; might: number; stunned: boolean; died: boolean }[]
    outcome: string; conquered: string | null
  } }).lastCombat
  if (!c) return ''
  const bfDef = (view as { battlefieldCards?: Record<string, string> }).battlefieldCards?.[c.battlefield]
  const bfName = bfDef ? cardName(bfDef) : `战场${Number(bfIndex(c.battlefield)) + 1}`
  const side = (s: string): string => c.units.filter((u) => u.side === s).map((u) =>
    `<span class="cu${u.died ? ' dead' : ''}${u.stunned ? ' stun' : ''}">${cardName(u.defId)} ${u.might}${u.died ? ' ☠' : ''}${u.stunned ? ' 💫' : ''}</span>`).join('') || '<i>—</i>'
  const meAtk = c.attacker === seat
  const verdict = c.outcome === 'noResult' ? '未分胜负(打不穿/两败)'
    : (c.outcome === 'attackerWins') === meAtk ? '你赢下了这场战斗' : '对手赢下了这场战斗'
  const conq = c.conquered ? `<b class="${c.conquered === seat ? 'good' : 'bad'}">${c.conquered === seat ? '你' : '对手'}征服了 ${bfName}</b>` : ''
  return `<div class="combat-bar">
    <div class="cb-head">⚔ 上一场战斗 · ${bfName} — ${verdict} ${conq}</div>
    <div class="cb-row"><span class="cb-tag ${meAtk ? 'me' : 'foe'}">进攻 ${c.attackerMight}</span>${side('attacker')}</div>
    <div class="cb-row"><span class="cb-tag ${meAtk ? 'foe' : 'me'}">防守 ${c.defenderMight}</span>${side('defender')}</div>
  </div>`
}

                          
function actionMenu(rv: RoomViewLike, oid: string): string {
  const { view } = rv
  const mine = rv.legalActions.filter((a) => a.oid === oid || a.cardOid === oid || a.discardOid === oid)
  if (mine.length === 0) return ''
                                                 
                           
                                           
                                                  
                               
  const recKws = (view.objects[oid]?.keywords ?? []).filter((k) => k.startsWith('流转'))
  const recIdx = new Set(mine.map((a) => a.recursionIndex).filter((i) => i !== undefined))
  const recTag = (i: number): string => (recKws.length === recIdx.size && recKws[i] ? `[${recKws[i]}]` : '[流转]')
  const label = (a: UIAction): string => {
    const t = a.target as string | undefined
    const tLabel = t ? (t.startsWith('play:') ? '链上法术' : t.startsWith('battlefield') ? `战场${Number(bfIndex(t)) + 1}` : t.startsWith('base:') ? '基地' : t.startsWith('back:') ? `弹回${cardName(view.objects[t.slice(5)]?.defId)}` : t.startsWith('weak:') ? `${cardName(view.objects[t.slice(5)]?.defId)} -2` : t.startsWith('swap:') ? (()=>{const [,a2,b2]=t.split(':');return `${cardName(view.objects[a2!]?.defId)}⇄${cardName(view.objects[b2!]?.defId)}`})() : cardName(view.objects[t]?.defId)) : ''
    switch (a.kind) {
      case 'PLAY_UNIT': return `打出 → ${String(a.to).startsWith('base') ? '基地' : `战场${Number(bfIndex(String(a.to))) + 1}`}`
      case 'PLAY_CARD': return `施放${a.echo ? '(回响)' : ''}${a.recursionIndex !== undefined ? ` · 从废牌堆${recTag(Number(a.recursionIndex))}` : ''}${tLabel ? ` → ${tLabel}` : ''}`
      case 'PLACE_STANDBY': return `🫥 盖着放到战场${Number(bfIndex(String(a.battlefield))) + 1}(待命)· ${a.free ? '免费' : a.alt ? '改付 1 法力' : '付 1 点任意符能'}`
      case 'PLAY_STANDBY': return `⚡ 翻开打出(0 费)${tLabel ? ` → ${tLabel}` : ''}`
      case 'MOVE': return `➡ 移动到 ${String(a.to).startsWith('base') ? '基地' : `战场${Number(bfIndex(String(a.to))) + 1}`}(变休眠)`
      case 'MOVE_GROUP': return `➡ 一起移动 ${(a.oids as string[]).length} 名单位(§144.3 算一次行动)`
                                                                                  
      case 'ACTIVATE': return `${renderCardText(String(a.label ?? a.ability))}${tLabel ? ` → ${tLabel}` : ''}${a.discardOid ? `(弃${cardName(view.objects[a.discardOid as string]?.defId)})` : ''}`
      default: return a.kind
    }
  }
                                               
                                                  
                                    
                                                            
  const equipGroups = new Map<string, UIAction[]>()
  const plain: UIAction[] = []
  for (const a of mine) {
    if (!isEquipAction(a)) { plain.push(a); continue }
    const k = String(a.ability)
    const list = equipGroups.get(k) ?? []
    list.push(a)
    equipGroups.set(k, list)
  }
  const equipBtns = [...equipGroups.entries()].map(([k, list]) =>
    `<button class="btn gear-btn" data-equip="${esc(oid)}|${esc(k)}"
      title="§818.1.c.2 装配 = 支付费用后把这件武装贴附到【你控制的一名单位】上;点了再选单位">🔧 ${renderCardText(equipButtonText(list[0]!.label as string | undefined, k))}</button>`)
  return [...equipBtns, ...plain.map((a) => `<button class="btn" data-act="${act(a)}">${label(a)}</button>`)].join('')
}

   
                  
                                      
                                              
                              
   
function equipPickOverlay(rv: RoomViewLike): string {
  const { view, seat } = rv
  const pick = equipPick!
  const all = rv.legalActions.filter((a) => isEquipAction(a) && a.oid === pick.oid && a.ability === pick.ability)
  const gearOid = pick.oid
  const gearDefId = view.objects[gearOid]?.defId
  const head = `<div class="eqpick-gear">要装配的武装:<b>${esc(cardName(gearDefId))}</b>
    <span>· ${renderCardText(equipButtonText(all[0]?.label as string | undefined, pick.ability))}</span></div>`

                                
  if (pick.target) {
    const vars = all.filter((a) => a.target === pick.target)
    const varLabel = (a: UIAction): string => {
      const bits: string[] = []
                                                                
      const xc = a.extraChoice as string | undefined
      if (xc) bits.push(view.objects[xc] ? `额外费用:${cardName(view.objects[xc]?.defId)}` : `额外费用:${xc}`)
      const cc = a.costChoice as string | undefined
      if (cc) bits.push(`减费方式:${cc}`)
      const d = a.discardOid as string | undefined
      if (d) bits.push(`弃置:${cardName(view.objects[d]?.defId)}`)
      return bits.join(' · ') || '照常支付'
    }
    return `<div class="overlay"><div class="panel">
      <h2>🔧 装配 → ${esc(cardName(view.objects[pick.target]?.defId))}</h2>
      ${head}
      <p class="eqpick-hint">这条装配还有额外费用要选(§204.1.b);选好即支付并结算。</p>
      <div class="eqvar" data-kbgroup="1">${vars.map((a) => `<button class="btn primary" data-act="${act(a)}">${esc(varLabel(a))}</button>`).join('')}</div>
      <button class="btn ghost eqpick-back" data-equip-back="1">← 换一个单位</button>
      ${overlayFooter(rv)}
    </div></div>`
  }

                                                 
  const byTarget = new Map<string, UIAction[]>()
  for (const a of all) {
    const t = String(a.target ?? '')
    const list = byTarget.get(t) ?? []
    list.push(a)
    byTarget.set(t, list)
  }
  const cards = [...byTarget.entries()].map(([t, list]) => {
    const o = view.objects[t]
    const nm = o ? cardName(o.defId) : t
                                 
    const attr = list.length === 1 ? `data-act="${act(list[0]!)}"` : `data-equip-target="${esc(t)}"`
    return `<button class="choice-card" ${attr} title="${esc(nm)}">
      ${cardEl(o, t, 'sz-choice', { plain: true })}<span class="cc-name">${esc(nm)}</span></button>`
  })
  return `<div class="overlay"><div class="panel${cards.length ? ' wide' : ''}">
    <h2>🔧 装配给哪名单位?</h2>
    ${head}
    <p class="eqpick-hint">§818.1.c.2「支付[费用]:将此装备贴附到【你控制的一名单位】上。」
      —— 传奇不是单位,所以不在下面。</p>
    <div class="choice-list cards" data-kbgroup="1">${cards.join('') || '<i class="lane-empty">此刻没有可装配的单位</i>'}</div>
    <button class="btn ghost eqpick-back" data-equip-back="1">← 取消</button>
    ${overlayFooter(rv)}
  </div></div>`
}

   
                                          
                                            
   
function inspectPanel(rv: RoomViewLike, oid: string): string {
  const { view } = rv
  const o = view.objects[oid]
  const defId = o?.defId ?? oid.replace(/^def:/, '')
  const marks: string[] = []
  const st = o as (ProjectedObject & { tapped?: boolean; standbyFresh?: boolean; dormant?: boolean }) | undefined
  if (st?.stunned) marks.push('💫 眩晕(§423:战斗伤害步不贡献战力,但击杀仍需其全部战力的致命伤害)')
  if (st?.dormant) marks.push('😴 休眠(本回合打出/移动过)')
                                                            
  if (st?.tapped) marks.push(isRuneObj(st) ? '↻ 已横置(产过 1 点法力)' : '😴 休眠')
  if (st?.standbyFresh) marks.push('🔒 本回合刚布置(§811.1.b 下回合起才可打出)')
  if ((o?.restrictions ?? []).length) marks.push((o!.restrictions ?? []).map(restrictionLabel).join(' · '))            
                                                          
                                                                    
  const idx = attachIndex(view)
  const hostOid = idx.hostOf.get(oid)                
  const groupHost = hostOid ?? oid
  const gearOids = idx.onHost.get(groupHost) ?? []
  const hostName = cardName(view.objects[groupHost]?.defId)
                                             
  const detailOf = (id: string, extraMarks: readonly string[] = []): string => {
    const x = view.objects[id]
    return cardDetailHtml(x?.defId ?? id.replace(/^def:/, ''), {
      ...(x?.might !== undefined && x.might !== null ? { might: x.might } : {}),
      ...(x?.damage ? { damage: x.damage } : {}),
      ...(x?.keywords ? { keywords: x.keywords } : {}),
      marks: [...(id === oid ? marks : []), ...extraMarks],
    })
  }
  const detail = gearOids.length === 0
    ? cardDetailHtml(defId, {
        ...(o?.might !== undefined && o.might !== null ? { might: o.might } : {}),
        ...(o?.damage ? { damage: o.damage } : {}),
        ...(o?.keywords ? { keywords: o.keywords } : {}),
        marks,
      })
    : `<div class="ins-pair">
        ${detailOf(groupHost, ['🔧 §818.3 配装:身上有武装,战力已含 §137.3 战力加成'])}
        ${gearOids.map((g) => `<div class="ins-pair-sep">↳ 贴附于此的武装</div>${
          detailOf(g, [`🔗 此刻装配于〈${hostName}〉`])}`).join('')}
      </div>`
  const acts = actionMenu(rv, oid)
                                     
  const blk = rv.blocked?.find((b) => b.oid === oid)
  const why = blk
    ? `<div class="ins-why"><b>现在打不出</b><span>${esc(blk.detail)}</span>${
        blk.reason === 'cost'
          ? `<span class="ins-cost">需要 ${blk.costMana ?? 0} 法力${(blk.costPips ?? []).length ? ` + 符能 ${(blk.costPips ?? []).map((x) => (x === '*' ? '任意' : DOMAIN[x]?.name ?? x)).join('、')}` : ''};你现在有 ${blk.haveMana ?? 0} 法力</span>`
          : ''
      }</div>`
    : ''
  return `<div class="inspect"><div class="ins-card">${detail}</div>
    <div class="ins-acts">
      ${acts ? `<div class="ins-acts-t">可做的:</div>${acts}` : (why ? '' : '<div class="ins-none">此刻对它没有可做的动作</div>')}
      ${why}
    </div>
    <button class="btn ghost ins-close" data-close="1">收起</button>
  </div>`
}

   
                                
                                            
                    
   
   
        
                                                
                                                  
                
                                               
                             
   
function overlayFooter(rv: RoomViewLike): string {
  if (rv.seatsFilled >= 2) return ''
  return `<div class="ov-foot">
    <span class="ov-code" title="点击复制">房间码 <b data-copy="${rv.code}">${rv.code}</b></span>
    <button class="btn" data-copy="${rv.code}">📋 复制</button>
    <button class="btn ghost" data-leave="1">退出房间</button>
    <span class="ov-hint">把房间码发给对手,让他在另一个标签页"加入"</span>
  </div>`
}

   
                                      
  
                                      
                                                                   
                                                                    
                                                       
   
const devBot = (): boolean => new URLSearchParams(location.search).get('dev') === '1'

                                              
function waitJoinOverlay(rv: RoomViewLike): string {
                                   
  const botBtn = devBot()
    ? `<button class="btn dev-bot" data-bot="1" title="开发者:一个人试卡牌时用,对面是个只会让过和结束回合的傀儡">一个人先练手 · 叫傀儡对手进来</button>`
    : ''
  return `<div class="overlay"><div class="panel">
    <h2>⏳ 等对手加入</h2>
    <p>把下面的房间码发给对手,他在另一个标签页点"加入"即可开打。</p>
    <div class="big-code" data-copy="${rv.code}">${rv.code}</div>
    <p style="font-size:12px">(点房间码可复制;对手进来后自动开始)</p>
    ${botBtn}
    ${overlayFooter(rv)}
  </div></div>`
}

   
                                                       
                                           
                                                          
   
function gameOverOverlay(rv: RoomViewLike): string {
  const { view, seat, pending } = rv
  const won = pending.winner === seat
  const conceded = (view as { concededBy?: string }).concededBy
  const wt = (view as { winTarget?: number }).winTarget ?? 8
  const myScore = view.scores[seat] ?? 0
  const oppSeat = view.players.find((p) => p !== seat) ?? ''
  const oppScore = view.scores[oppSeat] ?? 0
  const why = conceded
    ? (conceded === seat ? '你认输了(§650)' : '对手认输了(§650)')
    : `${won ? '你' : '对手'}的分数达到 ${wt} 分,在清理步骤判定获胜(§472)`
  return `<div class="overlay"><div class="panel">
    <h2 class="go-t">${won ? '🏆 你赢了' : '💀 你输了'}</h2>
    <div class="go-score"><b class="${won ? 'good' : ''}">你 ${myScore}</b><i>:</i><b class="${won ? '' : 'bad'}">对手 ${oppScore}</b><small>/${wt}</small></div>
    <p class="go-why">${why}</p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:6px">
      <button class="btn primary big" data-rematch="1">再来一局(同样的牌组)</button>
      <button class="btn ghost" data-leave="1">回大厅</button>
    </div>
    <p class="go-hint">右边的战报是这一局的完整记录,可以往回翻。</p>
  </div></div>`
}

                           
function mulliganOverlay(rv: RoomViewLike): string {
  const { view, seat } = rv
                                                                      
                                               
                                         
  if (rv.mulliganSubmitted === true) {
    return `<div class="overlay"><div class="panel"><h2>♻ 手牌调度</h2>
      <p>已确认 ✓ 等对手调度完就开局。</p>${overlayFooter(rv)}</div></div>`
  }
  const hand = view.zones[`hand:${seat}`]?.contents ?? []
  const cards = hand.map((oid) => cardEl(view.objects[oid], oid, 'sz-hand', { clickable: true, selected: mulliganSel.has(oid) })).join('')
  const put = [...mulliganSel]
  const full = put.length >= 2
                                                             
  const drawNote = view.activePlayer === seat
    ? '<p class="mull-note">确认后你会按 §315.4.b 抽 1 张,手牌变成 5 张——不是出错了。</p>'
    : '<p class="mull-note">你是后手:轮到你的回合时才抽牌,另外 §485.7 你首次召出符文会多 1 枚。</p>'
  return `<div class="overlay"><div class="panel wide">
    <h2>♻ 手牌调度</h2>
    <p>点选最多两张换掉(放牌堆底,补抽等量);不换直接确认。已选 ${put.length}/2${full ? ' —— <b class="mull-full">已选满,再点只能取消已选的</b>' : ''}</p>
    ${drawNote}
    <div class="hand-row mull">${cards}</div>
    <button class="btn primary big" data-hotkey="space" data-mulligan="1">${put.length ? `换掉 ${put.length} 张` : '全部保留'} ✓</button>
    ${overlayFooter(rv)}
  </div></div>`
}

   
                                         
                                          
  
                                              
                                         
                                
                                                     
                          
  
                                       
                        
   
function chainLane(rv: RoomViewLike, tg: Set<string> = new Set()): string {
  const { view, seat } = rv
  const items = (view as { chain?: readonly { id: string; controller: string; kind: string; status: string; defId?: string; cardOid?: string }[] }).chain ?? []
  const withCard = items.filter((it) => it.cardOid && it.defId)
  if (withCard.length === 0) return '<div class="chainlane empty" data-chainslot="1"></div>'
  const cards = withCard.map((it) => {
    const mine = it.controller === seat
    const o = it.cardOid ? view.objects[it.cardOid] : undefined
                                                   
                                                          
                                             
                                         
    const el = o
      ? cardEl(o, it.cardOid!, 'sz-field', { targetable: tg.has(it.cardOid!) })
      : `<div class="card sz-field"><div class="txtcard"><b>${esc(cardName(it.defId!))}</b></div>
         <img src="${cardImg(it.defId!) ?? ''}" alt="" onerror="this.parentElement.classList.add('noimg');this.remove()"></div>`
    return `<div class="cl-item ${mine ? 'mine' : 'foe'}${it.status === 'pending' ? ' pending' : ''}"
      title="${mine ? '你' : '对手'}打出的〈${esc(cardName(it.defId!))}〉,正在结算链上等待">
      ${el}<i class="cl-who">${mine ? '你' : '对手'}</i></div>`
  }).join('')
  return `<div class="chainlane" data-chainslot="1">
    <span class="cl-lab">正在结算</span>${cards}</div>`
}

   
                                            
                                
  
               
                                                        
                                           
                                         
                                  
                                                
   
function rollOverlay(rv: RoomViewLike): string {
  const { seat, view } = rv
  const roll = rv.roll!
  const opp = view.players.find((p) => p !== seat) ?? 'P?'
  const my = roll.dice[seat as string]
  const their = roll.dice[opp]
  const iRolled = my !== undefined
  const bothRolled = iRolled && their !== undefined
  const iAmDesignated = roll.designated === seat

  const die = (v: number | undefined, who: string, mine: boolean): string =>
    `<div class="die-box${mine ? ' mine' : ''}${v === undefined ? ' waiting' : ''}">
      <div class="die${v === undefined ? ' rolling' : ''}">${v === undefined ? '?' : DIE_FACES[v - 1]}</div>
      <span class="die-who">${who}</span>
      ${v === undefined ? '<i class="die-hint">等待…</i>' : `<i class="die-val">${v} 点</i>`}</div>`

  let action: string
  if (!iRolled) {
    action = `<button class="btn primary big" data-roll="1">🎲 掷骰子</button>
      <p class="roll-note">双方同时掷,点数大的那位决定先手还是后手(§407.1/§407.2)</p>`
  } else if (!bothRolled) {
    action = `<p class="roll-note">你掷了 <b>${my}</b> 点,等对手…</p>`
  } else if (!roll.designated) {
    action = `<p class="roll-note warn">平局,重掷一次</p><button class="btn primary big" data-roll="1">🎲 再掷</button>`
  } else if (iAmDesignated) {
    action = `<p class="roll-note ok">你的点数大 —— 由你决定先手还是后手</p>
      <div class="roll-pick" data-kbgroup="1">
        <button class="btn primary big" data-order="first"><b>我先手</b><i>先开始行动</i></button>
        <button class="btn big" data-order="second"><b>我后手</b><i>§485.7 第一个召出阶段多召一枚符文</i></button>
      </div>`
  } else {
    action = `<p class="roll-note">对手点数大,正在由他决定先手还是后手…</p>`
  }

  return `<div class="overlay"><div class="panel">
    <h2>🎲 决定先后手</h2>
    ${roll.rerolls > 0 ? `<p class="roll-note dim">已经平局重掷 ${roll.rerolls} 次</p>` : ''}
    <div class="die-row">${die(my, '你', true)}<span class="die-vs">VS</span>${die(their, '对手', false)}</div>
    ${action}
    ${overlayFooter(rv)}
  </div></div>`
}

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

               
function choiceOverlay(rv: RoomViewLike): string {
  const { pending, seat, view } = rv
  const req = pending.request!
                                    
  if (pending.player !== seat) return `<div class="toast">◆ 对手抉择中…</div>`
                                            
  const cardy = req.candidates.some((c) => (view.objects[c.id] ?? view.objects[c.id.replace(/^(back|weak):/, '')]) !== undefined
    || /^(battlefield|base|standby|discard|exile|hand|mainDeck|runeDeck|legend|heroZone):/.test(c.id))
  return `<div class="overlay"><div class="panel${cardy ? ' wide' : ''}">
    <!-- ★779 抉择文案走 renderCardText:{{横置}} 这类标记渲染成带 §条款 tooltip 的 chip。
         以前这里是纯 esc,data 层写的 [S]/{1}/{A} 就原样怼到玩家脸上 —— 委托人:
         「不要用代号来表示,整个游戏过程中不要出现任何代号」。 -->
    <!-- ★901 委托人体例(08-24 原话):「你就应该直接写是否触发英雄单位效果,然后效果是什么…
         你不要写额外的那种自己翻译的解释,所有的卡牌都是。」
         · 通用确认问(「是否执行这条触发式技能?」)⇒ 换成「是否触发〈卡名〉的技能?」;
         · 凡带 sourceDefId 的问,一律附【卡面原文】块(照抄 cardPool 原文,renderCardText 渲染
           {{}} 标记,不做二次翻译)——引擎 prompt 里我们自己写的解释降为操作指引,权威=原文。 -->
    <h2>◆ ${(() => {
      const sd = req.sourceDefId
      if (sd && /是否执行这条触发式技能/.test(req.prompt)) return `是否触发〈${esc(cardName(sd))}〉的技能?`
      return renderCardText(nameifyCodes(req.prompt))
    })()}</h2>
    ${(() => {
      const sd = req.sourceDefId
      if (!sd) return ''
      const txt = cardMeta(sd)?.text ?? ''
      if (!txt) return ''
      return `<div class="choice-cardtext"><span class="cct-name">〈${esc(cardName(sd))}〉卡面原文</span>${renderCardText(txt)}</div>`
    })()}
    ${cardy ? '<p class="choice-hint">悬停卡牌,右侧面板会显示大图和全文;点击卡牌即确认选择。</p>' : ''}
    <div class="choice-list${cardy ? ' cards' : ''}" data-kbgroup="1">${req.candidates.map((c) => {
      const o = view.objects[c.id] ?? view.objects[c.id.replace(/^(back|weak):/, '')]
      const nm = o ? cardName(o.defId) : ''
      if (o) {
                                 
                                                    
                                                         
        const note = (c as { note?: string }).note
        return `<button class="choice-card" data-act="${act({ kind: 'CHOOSE', player: seat, key: req.key, answer: c.id })}">
          ${cardEl(o, c.id, 'sz-choice', { plain: true })}<span class="cc-name">${esc(nm || c.label)}</span>${
          note ? `<span class="cc-note">${esc(note)}</span>` : ''}</button>`
      }
                                                         
                                                                               
                                         
                                                                   
      const zone = zoneNamer(view)
      if (/^(battlefield|base|standby|discard|exile|hand|mainDeck|runeDeck|legend|heroZone):/.test(c.id)) {
        const bfDef = (view as { battlefieldCards?: Record<string, string> }).battlefieldCards?.[c.id]
        const img = bfDef ? cardImg(bfDef) : null
        return `<button class="choice-card choice-zone" data-act="${act({ kind: 'CHOOSE', player: seat, key: req.key, answer: c.id })}"
          title="${esc(bfDef ? '这处战场的战场卡' : '')}">
          ${img ? `<img class="cz-img" src="${img}" alt="">` : '<span class="cz-noimg">◆</span>'}
          <span class="cc-name">${esc(zone(c.id))}</span></button>`
      }
                                                              
                                                    
                                                                
      const csd = (c as { sourceDefId?: string }).sourceDefId
      if (csd) {
                                                               
                                                                           
                                            
                                                  
        return `<button class="choice-card" data-act="${act({ kind: 'CHOOSE', player: seat, key: req.key, answer: c.id })}">
          <div class="card sz-choice" data-hover-def="${esc(csd)}" title="${esc(cardName(csd))}">
            <div class="txtcard"><b>${esc(cardName(csd))}</b></div>
            ${cardImg(csd) ? `<img src="${esc(cardImg(csd)!)}" alt="${esc(cardName(csd))}" draggable="false"
              onerror="this.parentElement.classList.add('noimg');this.remove()"/>` : ''}
          </div><span class="cc-name">${esc(cardName(csd))}</span></button>`
      }
      return `<button class="btn primary choice-item" data-act="${act({ kind: 'CHOOSE', player: seat, key: req.key, answer: c.id })}">${renderCardText(nameifyCodes(c.label))}</button>`
    }).join('')}</div>
    ${overlayFooter(rv)}
  </div></div>`
}

export function renderBoard(rv: RoomViewLike): string {
  actIndex = []
  ensureGearStyles()                                           
  hovRv = rv                
  const { view, seat, pending } = rv
  if (pending.mode !== lastMode) { selectedOid = null; equipPick = null; if (pending.mode !== 'mulligan') mulliganSel = new Set() ; lastMode = pending.mode }
                                                       
                                  
  if (equipPick && !rv.legalActions.some((a) => isEquipAction(a) && a.oid === equipPick!.oid && a.ability === equipPick!.ability)) equipPick = null
  const opp = view.players.find((p) => p !== seat) ?? 'P?'
  const myTurn = view.activePlayer === seat
  const oppHandN = view.zones[`hand:${opp}`]?.contents.length ?? 0
  const myHand = view.zones[`hand:${seat}`]?.contents ?? []
  const bfs = Object.keys(view.zones).filter((z) => z.startsWith('battlefield')).sort()
  const tg = targetOidsFor(rv, selectedOid)            
  const chain = view.zones['chain:shared']?.contents ?? []

  const passAct = rv.legalActions.find((a) => a.kind === 'PASS')
  const endAct = rv.legalActions.find((a) => a.kind === 'END_TURN')

  let statusLine = ''
  if (pending.mode === 'gameover') statusLine = `<span class="st gameover">🏆 ${pending.winner === seat ? '你赢了!' : '对手获胜'}</span>`
  else if (pending.mode === 'window') {
                                            
    const items = (view as { chain?: readonly { controller: string; status: string; defId?: string; kind: string; target?: string }[] }).chain ?? []
    const top = items[items.length - 1]
    const why = top
      ? `${top.controller === seat ? '你' : '对手'}${top.kind === 'triggered' ? '的技能触发' : `打出〈${cardName(top.defId)}〉`}${top.target && view.objects[top.target] ? ` → 指向〈${cardName(view.objects[top.target]?.defId)}〉` : ''}`
      : ''
    statusLine = pending.player === seat
      ? `<span class="st window">⚡ ${why ? `${why},` : ''}轮到你响应</span>`
      : `<span class="st wait">⚡ ${why ? `${why},` : ''}等对手响应…</span>`
  }
  else if (pending.mode === 'choice') statusLine = pending.player === seat ? `<span class="st window">◆ 请做出选择</span>` : `<span class="st wait">◆ 等对手抉择…</span>`
  else if (pending.mode === 'action') statusLine = myTurn ? `<span class="st go">▶ 你的回合 · 点卡片出招</span>` : `<span class="st wait">⏳ 对手回合…</span>`

  const actionableOids = actionableOidsOf(rv)
  const overlay =
    rv.seatsFilled < 2 ? waitJoinOverlay(rv)                               
    : rv.roll && !rv.roll.done ? rollOverlay(rv)                          
    : pending.mode === 'mulligan' ? mulliganOverlay(rv)
    : pending.mode === 'choice' ? choiceOverlay(rv)
    : pending.mode === 'gameover' ? gameOverOverlay(rv)
    : equipPick ? equipPickOverlay(rv)                                        
    : ''
                                              
  const concedeAsk = confirmConcede && pending.mode !== 'gameover'
    ? `<div class="overlay top"><div class="panel">
        <h2>确认认输?</h2>
        <p>§650 玩家随时可以认输。认输后这一局立刻判对手获胜,不能反悔。<br/>
        只是想暂时离开的话,点"退出"——房间还在,回来还能接着打。</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn" style="background:#b91c1c" data-concede="1">确认认输</button>
          <button class="btn ghost" data-cancel-concede="1">再想想</button>
        </div>
      </div></div>`
    : ''

  const wt = (view as { winTarget?: number }).winTarget ?? 8
  const turnNo = (view as { turn?: number }).turn ?? 1
                                                  
                                                         
  const phaseCn = PHASE_CN[view.phase] ?? view.phase
  void phaseCn
  return `<div class="rb-row"><div class="table">
    <div class="topbar">
      <span class="room">房间 <b data-copy="${rv.code}" title="点击复制">${rv.code}</b>${rv.seatsFilled < 2 ? ' · 等对手加入…' : ''}</span>
      <div class="topmid">
        ${scoreboard(rv, wt)}
        <span class="turnbox">第 <b>${turnNo}</b> 回合 · <b class="${myTurn ? 'me' : 'foe'}">${myTurn ? '你的回合' : '对手回合'}</b></span>
      </div>
      ${lastPointHint(rv, wt)}
      ${statusLine}
    </div>
    <div class="side opp">
      <div class="opphand">${Array.from({ length: Math.min(oppHandN, 14) }, () => '<div class="card sz-mini back"><div class="back-swirl">❖</div></div>').join('')}<span class="cnt">对手手牌 <b>${oppHandN}</b></span>${seatCue(rv, opp, false)}</div>
      ${matRuneRow(rv, opp, false)}
      ${matBaseRow(rv, opp, false, tg)}
      ${pileColumn(rv, opp)}
    </div>
    ${chainLane(rv, tg)}
    <div class="bfs">${bfs.map((bf) => battlefieldPanel(rv, bf, tg)).join('')}</div>
    ${combatBar(view, seat)}
    ${chainOverlay(rv, passAct)}
    <div class="hovbig" id="rb-hovprev" aria-hidden="true"></div>
    <div class="side me">
      ${matBaseRow(rv, seat, true, tg)}
      ${matRuneRow(rv, seat, true)}
      ${pileColumn(rv, seat)}
      <div class="hand-wrap">
        <div class="hand-row fan">${myHand.map((oid, i) => cardEl(view.objects[oid], oid, 'sz-hand',
          { clickable: actionableOids.has(oid), selected: selectedOid === oid, style: fanStyle(i, myHand.length) })).join('') || '<i class="lane-empty">手牌空</i>'}</div>
        <span class="hand-lab" title="手牌张数">${myHand.length}</span>${seatCue(rv, seat, true)}</div>
    </div>

    ${selectedOid ? inspectPanel(rv, selectedOid) : ''}
    ${zoneBrowser(rv)}
    ${overlay}
    ${concedeAsk}
  </div>${logRail(rv, `<div class="dock">
    <div class="dock-row1"><span class="legend-key" tabindex="0">ⓘ 图例<span class="legend-pop">😴休眠 ${['壁垒', '坚守', '法盾', '待命', '伏击', '回响'].map((k) => `<b title="${esc(keywordTip(k))}">${k}</b>`).join(' ')} 💫眩晕 ☠阵亡</span></span>
      <span class="dock-mini">
        <button class="btn ghost" data-undo="1"${rv.canUndo ? '' : ' disabled'}
          title="${rv.canUndo
            ? '撤回你的上一步。⚠️ 规则里没有撤回,这是模拟器的便利功能 —— 对手在战报里看得见。'
            : '现在撤不了:只能撤【你自己走的最后一步】,而且对手一旦行动过就不能再撤了。开局调度也不在撤回范围内。'}">↶ 撤回${rv.canUndo ? '' : '<i class="undo-off">不可</i>'}</button>
        <button class="btn ghost" data-autopass="1" title="${autoPassOn()
          ? '自动让过:开。只在【你自己发起的结算链、对手已让过、轮回到你】时替你点让过 —— 这种局面下让过不放弃任何回应机会。战斗与法术对决的反应窗口、以及对手发起的链,一律照常停下来问你。点此关闭。'
          : '自动让过:关。每一个反应窗口都会停下来等你决定。点此开启(只在你自己发起、对手已让过的链上生效,战斗窗口永远会问你)。'}">⚡ 自动让过 <i class="ap-state">${autoPassOn() ? '开' : '关'}</i></button>
        <button class="btn ghost" data-concede-ask="1" title="§650 玩家随时可以认输;认输后立刻判对手获胜">认输</button>
        <button class="btn ghost" data-leave="1" title="只是离开这个界面,房间还在,回来还能接着打">退出</button>
      </span>
    </div>
    <div class="dock-btns">${bigButton(rv, passAct, endAct)}</div>
  </div>`)}</div>`
}

   
                                        
                                     
                                                 
   
function scoreboard(rv: RoomViewLike, wt: number): string {
  const { view, seat } = rv
  const opp = view.players.find((p) => p !== seat) ?? 'P?'
  const my = view.scores[seat] ?? 0
  const os = view.scores[opp] ?? 0
  const pips = (n: number, side: 'me' | 'foe'): string =>
    Array.from({ length: wt }, (_, i) => {
      const idx = side === 'me' ? i : wt - 1 - i               
      const on = idx < n
      const last = idx === wt - 1
      return `<i class="sb-pip ${side}${on ? ' on' : ''}${last && n === wt - 1 ? ' lock' : ''}"></i>`
    }).join('')
  const lockTip = (n: number, who: string): string =>
    n === wt - 1 ? ` · ${who}已到 ${wt - 1} 分:末分锁生效,征服单个战场不再得分(§471.1.b),据守不受限` : ''
  return `<span class="scoreboard" title="先得 ${wt} 分者胜(§472 在清理步判定)${lockTip(my, '你')}${lockTip(os, '对手')}">
    <b class="sb-num me">${my}</b><span class="sb-pips">${pips(my, 'me')}</span>
    <span class="sb-goal">${wt}</span>
    <span class="sb-pips">${pips(os, 'foe')}</span><b class="sb-num foe">${os}</b>
  </span>`
}

   
                                              
                                                  
                                                   
   
function bigButton(rv: RoomViewLike, passAct: UIAction | undefined, endAct: UIAction | undefined): string {
  const { pending, seat } = rv
  if (pending.mode === 'gameover' || pending.mode === 'mulligan') return ''
                                                    
                                                       
  const chainLen = ((rv.view as { chain?: readonly unknown[] }).chain ?? []).length
  if (passAct && chainLen > 0) return ''
  if (passAct) {
    const h = passHint(rv)
    return `<button id="rb-bigbtn" class="bigbtn go" data-hotkey="a" data-act="${act(passAct)}" title="${esc(h.tip)}(快捷键:空格 或 A)">${h.label}</button>`
  }
  if (endAct) {
    const warns = endTurnWarnings(rv)
    return `<button id="rb-bigbtn" class="bigbtn end" data-act="${act(endAct)}" data-hotkey="s" title="${esc(warns.join('\n') || '进入结束阶段')}(快捷键:空格 或 S)">结束回合 ⏭${warns.length ? ` <i class="warn-dot">${warns.length}</i>` : ''}</button>`
  }
  if (pending.mode === 'choice' && pending.player === seat) return `<button id="rb-bigbtn" class="bigbtn wait" disabled>◆ 请先做出选择</button>`
  return `<button id="rb-bigbtn" class="bigbtn wait" disabled>⏳ 等对手</button>`
}

   
                                          
                             
   
function logRail(rv: RoomViewLike, dock = ''): string {
  const lines = renderLog(rv.log ?? [], { seat: rv.seat, zoneName: zoneNamer(rv.view) })
  const body = lines.length === 0
    ? '<div class="lg-empty">对局开始后,这里会逐条记下发生了什么</div>'
    : lines.slice(-200).map((l) => {
      if (l.tone === 'banner') return `<div class="lg-banner">${esc(l.text)}</div>`
                                                  
      const refs = [...(l.oids ?? []), ...(l.battlefield ? [l.battlefield] : [])]
      const clickable = refs.length > 0
      return `<div class="lg-line lg-${l.tone}${clickable ? ' lg-click' : ''}"${clickable ? ` data-logrefs="${esc(refs.join(','))}"` : ''}>${esc(l.text)}</div>`
    }).join('')
                                                      
                                      
                                                    
                                    
  return `<div class="lograil">
    <div class="lg-head">战报</div><div class="lg-body" id="lg-body">${body}</div>
    ${dock}</div>`
}

   
                    
                                                     
                                             
                                     
   
export function restoreHoverPreview(): void {
  const el = document.getElementById('rb-hovprev')
  if (!el) return
  el.innerHTML = hovPrevHtml
  el.classList.toggle('on', hovPrevHtml !== '')
}

                                        
let hovPrevHtml = ''
let hovPrevKey = ''
let hovRv: RoomViewLike | null = null

                                          
function buildHovPrev(defId: string, oid: string | undefined): string {
  const o = oid && hovRv ? hovRv.view.objects[oid] : undefined
  const st = o as (ProjectedObject & { tapped?: boolean; standbyFresh?: boolean; dormant?: boolean }) | undefined
                                                   
  const marks = appliedTags(o)
  return cardDetailHtml(defId, {
    ...(o?.might !== undefined && o.might !== null ? { might: o.might } : {}),
    ...(o?.damage ? { damage: o.damage } : {}),
    ...(o?.keywords ? { keywords: o.keywords } : {}),
    marks,
  })
}

                                                             
   
                    
                                                                            
                                                                  
                                                                         
                                
   
function copyText(s: string): boolean {
  let ok = false
  try {
    const ta = document.createElement('textarea')
    ta.value = s
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    ok = document.execCommand('copy')
    ta.remove()
  } catch { /* 落到 clipboard */ }
                                                  
  try { if (navigator.clipboard && window.isSecureContext) void navigator.clipboard.writeText(s).catch(() => {}) } catch { /* ignore */ }
  return ok
}

                                                                 
let copyToastTimer: number | undefined
function flashCopied(_el: HTMLElement, ok: boolean): void {
  let el = document.getElementById('rb-copytoast')
  if (!el) { el = document.createElement('div'); el.id = 'rb-copytoast'; document.body.appendChild(el) }
  el.textContent = ok ? '✓ 房间码已复制,发给牌友即可' : '复制失败,请手动选中房间码复制'
  el.className = `rb-copytoast show${ok ? '' : ' fail'}`
  window.clearTimeout(copyToastTimer)
  copyToastTimer = window.setTimeout(() => { el!.className = 'rb-copytoast' }, 1800)
}

                                                   
                                                        
                                                           
let dragging = false
let pointerHeld = false                                     
let suppressClick = false
let boundOnAction: ((a: UIAction) => void) | null = null
let boundRerender: (() => void) | null = null
                                          
let boundOnRoll: ((a: UIAction) => void) | null = null
   
                                              
                                      
  
                                                  
                                 
                                               
               
   

let passAllArmed = false
                                
let boundOnUndo: (() => void) | null = null

   
                  
                                                  
                                          
                                            
   
export function syncPassAll(chainLen: number, inWindow: boolean): boolean {
  if (chainLen === 0 && !inWindow) passAllArmed = false
  return passAllArmed
}
let ghostEl: HTMLElement | null = null
                                            
let dropMenuTitle = ''
let dropMap = new Map<Element, UIAction[]>()
let hotEl: Element | null = null
let deniedOid: string | null = null
                                          
let srcCenter = { x: 0, y: 0 }
let lastPt = { x: 0, y: 0 }
let rafId = 0                                

                                      
export function boardDragging(): boolean { return dragging || pointerHeld }

                                                
let noteTimer: number | undefined
function flashNote(text: string): void {
  let el = document.getElementById('rb-dragtoast')
  if (!el) { el = document.createElement('div'); el.id = 'rb-dragtoast'; el.className = 'rb-toast'; document.body.appendChild(el) }
  el.textContent = text
  el.classList.add('show')
  window.clearTimeout(noteTimer)
  noteTimer = window.setTimeout(() => el!.classList.remove('show'), 2600)
}

                                         
function dragActionsFor(oid: string): UIAction[] {
  if (!hovRv) return []
  const kinds = new Set(['PLAY_UNIT', 'PLAY_CARD', 'PLACE_STANDBY', 'PLAY_STANDBY', 'MOVE'])
  return hovRv.legalActions.filter((a) => kinds.has(String(a.kind)) && (a.cardOid === oid || a.oid === oid))
}

                                                  
function dropTargetsFor(a: UIAction): Element[] {
  const zoneEl = (z: string): Element | null => document.querySelector(`[data-zoneanchor="${CSS.escape(z)}"]`)
  const k = String(a.kind)
  if (k === 'PLAY_UNIT' || k === 'MOVE') { const el = zoneEl(String(a.to)); return el ? [el] : [] }
                                                    
                                                 
                                                         
                                                        
                                             
  if (k === 'PLACE_STANDBY') { const el = document.querySelector(`[data-standbyanchor="${CSS.escape(String(a.battlefield))}"]`); return el ? [el] : [] }
                                                       
                                                
                     
                                                            
                                        
                                                 
                           
                                            
                                           
                                             
                         
                                                   
                                          
  const table = document.querySelector('.table')
  return table ? [table] : Array.from(document.querySelectorAll('[data-zoneanchor]'))
}

let arrowSvg: SVGSVGElement | null = null
let arrowFrom: { x: number; y: number } | null = null

                                                              
function makeArrow(from: { x: number; y: number }): void {
  const NS = 'http://www.w3.org/2000/svg'
  arrowSvg = document.createElementNS(NS, 'svg')
  arrowSvg.id = 'rb-arrow'
  arrowSvg.setAttribute('width', String(window.innerWidth))
  arrowSvg.setAttribute('height', String(window.innerHeight))
  const marker = document.createElementNS(NS, 'marker')
  marker.id = 'rb-arrowhead'
  marker.setAttribute('markerWidth', '9'); marker.setAttribute('markerHeight', '9')
  marker.setAttribute('refX', '6'); marker.setAttribute('refY', '4.5'); marker.setAttribute('orient', 'auto')
  const tip = document.createElementNS(NS, 'polygon')
  tip.setAttribute('points', '0 0, 9 4.5, 0 9')
  marker.appendChild(tip)
  const defs = document.createElementNS(NS, 'defs')
  defs.appendChild(marker)
  const path = document.createElementNS(NS, 'path')
  path.id = 'rb-arrowpath'
  path.setAttribute('marker-end', 'url(#rb-arrowhead)')
  arrowSvg.appendChild(defs)
  arrowSvg.appendChild(path)
  document.body.appendChild(arrowSvg)
  arrowFrom = from
}

function updateArrow(x: number, y: number, hot: boolean): void {
  const path = document.getElementById('rb-arrowpath')
  if (!path || !arrowFrom) return
  const { x: sx, y: sy } = arrowFrom
  const mx = (sx + x) / 2, my = Math.min(sy, y) - 64
  path.setAttribute('d', `M ${sx} ${sy} Q ${mx} ${my} ${x} ${y}`)
  arrowSvg?.classList.toggle('hot', hot)
}

                                     
function isTargetedDrag(acts: UIAction[]): boolean {
  return acts.some((a) => {
    const k = String(a.kind)
    if (k !== 'PLAY_CARD' && k !== 'PLAY_STANDBY') return false
    const t = a.target as string | undefined
    return !!t && !t.startsWith('battlefield') && !t.startsWith('base:')
  })
}

function startDrag(cardNode: HTMLElement, acts: UIAction[], ev: PointerEvent): void {
  dragging = true
  dropMap = new Map()
  dropMenuTitle = cardName(cardNode.getAttribute('data-def') ?? '')
  for (const a of acts) {
    for (const el of dropTargetsFor(a)) {
      const list = dropMap.get(el) ?? []
      list.push(a)
      dropMap.set(el, list)
    }
  }
  for (const el of dropMap.keys()) el.classList.add('droppable')
  document.body.classList.add('rb-dragging')                  
                                                        
                                                    
                               
  const spellLike = acts.some((a) => String(a.kind) === 'PLAY_CARD' || String(a.kind) === 'PLAY_STANDBY')
  if (spellLike && acts.length > 0) {
    const tip = document.createElement('div')
    tip.id = 'rb-dragtip'
    tip.textContent = '松手视为打出'
    document.body.appendChild(tip)
  }
  const srcRect = cardNode.getBoundingClientRect()
  srcCenter = { x: srcRect.left + srcRect.width / 2, y: srcRect.top + srcRect.height / 2 }
  cardNode.classList.add('drag-src')
  ghostEl = cardNode.cloneNode(true) as HTMLElement
  ghostEl.classList.add('drag-ghost')
                                                               
  ghostEl.classList.remove('drag-src', 'is-tapped', 'is-dormant', 'lg-hl',
    'selected', 'targetable', 'droppable', 'drop-hot')
  ghostEl.removeAttribute('data-card')
  ghostEl.removeAttribute('id')
                                                  
                                                         
                                                          
                                                    
                                       
  ghostEl.style.setProperty('--ghost-w', `${cardNode.offsetWidth}px`)
  ghostEl.style.setProperty('--ghost-h', `${cardNode.offsetHeight}px`)
  if (acts.length === 0) ghostEl.classList.add('denied')                       
                                                                    
  ghostEl.style.setProperty('--gx', `${ev.clientX}px`)
  ghostEl.style.setProperty('--gy', `${ev.clientY}px`)
  document.body.appendChild(ghostEl)
  if (isTargetedDrag(acts)) {
    const r = cardNode.getBoundingClientRect()
    makeArrow({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }
  moveDrag(ev)
}

function moveDrag(ev: PointerEvent): void {
  if (!ghostEl) return
                                                                 
                                                      
                                     
  lastPt = { x: ev.clientX, y: ev.clientY }
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      rafId = 0
      if (!ghostEl) return
      ghostEl.style.setProperty('--gx', `${lastPt.x}px`)
      ghostEl.style.setProperty('--gy', `${lastPt.y}px`)
    })
  }
  const hit = document.elementFromPoint(ev.clientX, ev.clientY)
  let next: Element | null = hit ? hit.closest('.droppable') : null
                                                          
  if (next && !dropMap.has(next)) next = null
  if (next !== hotEl) {
    hotEl?.classList.remove('drop-hot')
    hotEl = next
    hotEl?.classList.add('drop-hot')
  }
                                           
  ghostEl.classList.toggle('no-target', hotEl === null && !ghostEl.classList.contains('denied'))
  if (arrowSvg) updateArrow(ev.clientX, ev.clientY, hotEl !== null)
}

function endDrag(ev: PointerEvent): void {
  const target = hotEl
  const acts = target ? dropMap.get(target) ?? [] : []
  const wasDenied = deniedOid
  for (const el of dropMap.keys()) el.classList.remove('droppable', 'drop-hot')
  document.querySelectorAll('.drag-src').forEach((el) => el.classList.remove('drag-src'))
  document.body.classList.remove('rb-dragging')
  document.getElementById('rb-dragtip')?.remove()        
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
                                                    
  if (ghostEl && acts.length === 0) {
    const g = ghostEl
    g.classList.add('returning')
    g.style.setProperty('--gx', `${srcCenter.x}px`)
    g.style.setProperty('--gy', `${srcCenter.y}px`)
    window.setTimeout(() => g.remove(), 200)
  } else ghostEl?.remove()
  ghostEl = null
  arrowSvg?.remove(); arrowSvg = null; arrowFrom = null
  hotEl = null; dropMap = new Map(); dragging = false; deniedOid = null
  suppressClick = true
  window.setTimeout(() => { suppressClick = false }, 0)
                                                    
                                             
                             
  if (acts.length === 1 && String(acts[0]!.kind) !== 'PLACE_STANDBY') { runOrGroup(acts[0]!, ev.clientX, ev.clientY); return }
  if (acts.length >= 1) {
    const where = target?.closest('.bf')?.querySelector('.bf-name')?.textContent?.trim()
      ?? (target?.getAttribute('data-zoneanchor')?.startsWith('base:') ? '基地' : '')
    if (where) dropMenuTitle = `${dropMenuTitle} → ${where.replace(/^⚔\s*/, '')}`
    dropDisambig(acts, ev.clientX, ev.clientY); return
  }
  if (wasDenied) {
    const blk = hovRv?.blocked?.find((b) => b.oid === wasDenied)
    flashNote(blk ? `现在打不出:${blk.detail}` : '这张牌现在没有可执行的动作')
  }
  boundRerender?.()                     
}

                                                     
   
                             
                               
                                              
                                                         
                                                       
                                                              
                                                               
   
let rallyTo: string | null = null
let rallyOids: string[] = []

                               
function rallyMates(): UIAction[] {
  if (!hovRv || !rallyTo) return []
  return hovRv.legalActions.filter((a) => a.kind === 'MOVE' && a.to === rallyTo && !rallyOids.includes(String(a.oid)))
}

function rallyClear(): void {
  rallyTo = null
  rallyOids = []
  document.getElementById('rb-rally')?.remove()
  boundRerender?.()
}

                                            
function markRally(): void {
  document.querySelectorAll('.rally-on').forEach((el) => el.classList.remove('rally-on'))
  if (!rallyTo) return
  for (const oid of rallyOids) {
    document.querySelector(`[data-card="${oid}"]`)?.classList.add('rally-on')
  }
}

                                 
function rallyPrompt(): void {
  document.getElementById('rb-rally')?.remove()
  if (!rallyTo || !hovRv) return
  const to = rallyTo
  const toName = to.startsWith('base') ? '基地' : `战场${Number(bfIndex(to)) + 1}`
  const names = rallyOids.map((o) => cardName(hovRv!.view.objects[o]?.defId ?? '?'))
  const left = rallyMates().length

  const box = document.createElement('div')
  box.id = 'rb-rally'
  box.innerHTML = `<div class="dm-head">集结中 → ${toName}
      <i>§144.3 同时宣告算一次行动,各自从哪来都行;对手只有一次反应机会</i></div>
    <div class="ry-list">${names.map((n) => `<span class="ry-tag">${esc(n)}</span>`).join('')}</div>
    <div class="ry-tip">${left > 0
      ? `场上还有 <b>${left}</b> 名单位可以一起过去 —— 选「继续挑」后直接把它拖到${toName}。`
      : '场上已经没有别的单位能过去了。'}</div>`

  if (left > 0) {
    const more = document.createElement('button')
    more.className = 'btn ghost'
    more.textContent = `继续挑下一名(还有 ${left} 名可动)`
    more.onclick = () => { box.remove() }                               
    box.appendChild(more)
  }

  const go = document.createElement('button')
  go.className = 'btn primary'
  go.textContent = rallyOids.length === 1
    ? `就它一个,移动到${toName}`
    : `开始移动:${rallyOids.length} 名单位一起过去(都变休眠)`
  go.onclick = () => {
    const oids = [...rallyOids]
    const dest = to
    box.remove()
    rallyTo = null
    rallyOids = []
    if (oids.length === 1) {
      const one = hovRv?.legalActions.find((a) => a.kind === 'MOVE' && a.to === dest && String(a.oid) === oids[0])
      if (one) { boundOnAction?.(one); return }
                                                         
                                                        
                                             
      flashNote('这次移动没能出发:多半是有触发正在结算(或时机已过)。等结算完再拖一次。')
      return
    }
    boundOnAction?.({ kind: 'MOVE_GROUP', player: hovRv!.seat, oids, to: dest } as unknown as UIAction)
  }
  box.appendChild(go)

  const cancel = document.createElement('button')
  cancel.className = 'btn ghost'
  cancel.textContent = '取消这次集结'
  cancel.onclick = () => rallyClear()
  box.appendChild(cancel)
  document.body.appendChild(box)
}

   
                                       
                                                          
   
function runOrGroup(a: UIAction, _x: number, _y: number): void {
  if (String(a.kind) === 'MOVE') {
    const to = String(a.to)
    if (rallyTo !== null && rallyTo !== to) {
      flashNote(`这次集结的目的地是${rallyTo.startsWith('base') ? '基地' : `战场${Number(bfIndex(rallyTo)) + 1}`} —— 一次行动只能去一处(§144.3)`)
      return
    }
    if (rallyTo === null) { rallyTo = to; rallyOids = [String(a.oid)] }
    else if (!rallyOids.includes(String(a.oid))) rallyOids.push(String(a.oid))
    boundRerender?.()
    rallyPrompt()
    return
  }
  boundOnAction?.(a)
}

function dropDisambig(acts: UIAction[], x: number, y: number): void {
  document.getElementById('rb-dropmenu')?.remove()
  const box = document.createElement('div')
  box.id = 'rb-dropmenu'
  box.style.left = `${Math.min(x, window.innerWidth - 200)}px`
  box.style.top = `${Math.min(y, window.innerHeight - 40 * acts.length)}px`
                                          
  if (dropMenuTitle) {
    const h = document.createElement('div')
    h.className = 'dm-head'
    h.textContent = dropMenuTitle
    box.appendChild(h)
  }
                                                 
  const ordered = [...acts].sort((a, b) => rankAct(a) - rankAct(b))
  for (const a of ordered) {
    const b = document.createElement('button')
    const isStandby = String(a.kind) === 'PLACE_STANDBY'
    b.className = `btn dm-item${isStandby ? ' ghost' : ''}`
    const { main, sub } = (hovRv ? targetPickLabel(a, hovRv.view) : null) ?? dragActLabel2(a)
    b.innerHTML = `<b>${main}</b>${sub ? `<i>${sub}</i>` : ''}`
    b.onclick = (e) => { box.remove(); runOrGroup(a, (e as MouseEvent).clientX, (e as MouseEvent).clientY) }
    box.appendChild(b)
  }
  const cancel = document.createElement('button')
  cancel.className = 'btn ghost'
  cancel.textContent = '算了'
  cancel.onclick = () => { box.remove(); boundRerender?.() }
  box.appendChild(cancel)
  document.body.appendChild(box)
}

                                  
function rankAct(a: UIAction): number {
  const k = String(a.kind)
  if (k === 'PLAY_UNIT' || k === 'PLAY_CARD') return 0
  if (k === 'MOVE') return 1
  if (k === 'PLACE_STANDBY') return 2
  return 3
}

   
                                
                                              
                                                
                                 
   
                                                             
function targetPickLabel(a: UIAction, view: ClientView): { main: string; sub: string } | null {
  const k = String(a.kind)
  if (k !== 'PLAY_CARD' && k !== 'PLAY_STANDBY') return null
  const t = a.target as string | undefined
  if (!t) return { main: '⚡ 直接施放(无需目标)', sub: '这张牌不用选目标' }
  if (t.startsWith('battlefield')) return { main: `⚡ 指向 战场${Number(bfIndex(t)) + 1}`, sub: '目标是这处战场本身' }
  if (t.startsWith('base:')) return { main: '⚡ 指向 基地', sub: '目标是基地' }
  const bare = t.startsWith('weak:') || t.startsWith('back:') ? t.slice(t.indexOf(':') + 1) : t
  const o = view.objects[bare]
  const nm = o ? cardName(o.defId) : bare
  const whose = o?.controller ? (o.controller === (view as { seat?: string }).seat ? '你的' : '对手的') : ''
  return { main: `⚡ 指向〈${esc(nm)}〉`, sub: `${whose}单位${t.startsWith('weak:') ? ' · 削弱' : t.startsWith('back:') ? ' · 弹回' : ''}` }
}

function costText(c: unknown): string {
  const cc = c as { mana?: number; pips?: readonly (readonly string[])[] } | undefined
  if (!cc) return ''
  const parts: string[] = []
  if (cc.mana && cc.mana > 0) parts.push(`${cc.mana} 法力`)
  const pips = cc.pips ?? []
  if (pips.length > 0) {
                                          
    const bag = new Map<string, number>()
    for (const p of pips) {
      const key = p.length === 0 ? '' : [...p].sort().join('/')
      bag.set(key, (bag.get(key) ?? 0) + 1)
    }
    for (const [key, n] of bag) {
      const name = key === ''
        ? '任意'
        : key.split('/').map((d) => DOMAIN[d as keyof typeof DOMAIN]?.name ?? d).join('或')
      parts.push(`${n} 点${name}符能`)
    }
  }
  return parts.join(' + ')
}

                                         
function actCardName(a: UIAction): string {
  const oid = String(a.oid ?? a.cardOid ?? '')
  const def = hovRv?.view.objects[oid]?.defId
  return def ? cardName(def) : '这张牌'
}

   
                             
                                                  
                                             
           
                            
                                                     
                                                        
                              
   
function dragActLabel2(a: UIAction): { main: string; sub: string } {
  const k = String(a.kind)
  const nm = actCardName(a)
  const due = costText((a as { due?: unknown }).due)
  const pay = due ? `需支付 ${due}` : '无需支付费用'

  if (k === 'PLAY_UNIT') {
    if (a.haste) return { main: `⚡ 触发「${nm}」急速`, sub: `${pay} · 以活跃状态进场` }
    if (a.bonus) return { main: `⚔ 打出「${nm}」· 付额外费用`, sub: pay }
    return { main: `⚔ 打出「${nm}」`, sub: pay }
  }
  if (k === 'PLACE_STANDBY') {
    if (a.free) return { main: `🫥 待命布置「${nm}」`, sub: '无需支付费用' }
    if (a.alt) return { main: `🫥 待命布置「${nm}」· 改付替代费用`, sub: pay }
    return { main: `🫥 待命布置「${nm}」`, sub: pay }
  }
  if (k === 'MOVE') return { main: '➡ 移动到这里', sub: '移动后变为休眠' }
  if (k === 'PLAY_CARD') {
    if (a.echo) return { main: `♻ 触发「${nm}」回响`, sub: `${pay} · 从废牌堆施放,结算后放逐` }
    if (a.altCost) return { main: `⚡ 施放「${nm}」· 改付替代费用`, sub: pay }
    if (a.bonus) return { main: `⚡ 施放「${nm}」· 付额外费用`, sub: pay }
    return { main: `⚡ 施放「${nm}」`, sub: pay }
  }
  if (k === 'ACTIVATE') {
    const lab = String((a as { label?: string }).label ?? '')
    return { main: `✦ 触发「${nm}」${lab ? `${lab}` : '技能'}`, sub: pay }
  }
  return { main: k, sub: '' }
}

                                                           
let selDropMap = new Map<Element, UIAction[]>()
function markSelectedDrops(): void {
  selDropMap = new Map()
  if (dragging) return                  
  document.querySelectorAll('.droppable').forEach((el) => el.classList.remove('droppable'))
  if (!selectedOid) return
  for (const a of dragActionsFor(selectedOid)) {
    for (const el of dropTargetsFor(a)) {
      const l = selDropMap.get(el) ?? []
      l.push(a)
      selDropMap.set(el, l)
      el.classList.add('droppable')
    }
  }
}

let longPressTimer: number | undefined

export function bindBoard(root: HTMLElement, seat: string, onAction: (a: UIAction) => void, onLeave: () => void, rerender: () => void, onRematch?: () => void, onRoll?: (a: UIAction) => void, onUndo?: () => void): void {
  boundOnAction = onAction
  boundOnRoll = onRoll ?? null
  boundOnUndo = onUndo ?? null
  boundRerender = rerender
  markSelectedDrops()
  markRally()                                  
  root.onpointerdown = (e): void => {
    if (e.button !== 0 || dragging) return
    const cardNode = (e.target as HTMLElement).closest('.card[data-card]') as HTMLElement | null
    if (!cardNode) return
    if (hovRv?.pending.mode === 'mulligan') return                
    const oid = cardNode.dataset.card!
                                                   
    if (e.pointerType === 'touch' && cardNode.dataset.def) {
      const defId = cardNode.dataset.def
      const ox = e.clientX, oy = e.clientY
      window.clearTimeout(longPressTimer)
      longPressTimer = window.setTimeout(() => {
        hovPrevKey = `${defId}|${oid}`
        hovPrevHtml = buildHovPrev(defId, oid)
        const el = document.getElementById('rb-hovprev')
                                                    
                                                     
        if (el) { el.innerHTML = hovPrevHtml; el.classList.add('on') }
        const dismiss = (): void => {
          hovPrevKey = ''; hovPrevHtml = ''
          document.getElementById('rb-hovprev')?.classList.remove('on')
          document.removeEventListener('pointerdown', dismiss)
        }
        window.setTimeout(() => document.addEventListener('pointerdown', dismiss), 0)
      }, 500)
      const cancelLp = (ev2: PointerEvent): void => {
        if (ev2.type === 'pointermove' && Math.hypot(ev2.clientX - ox, ev2.clientY - oy) < 8) return
        window.clearTimeout(longPressTimer)
        document.removeEventListener('pointermove', cancelLp)
        document.removeEventListener('pointerup', cancelLp)
      }
      document.addEventListener('pointermove', cancelLp)
      document.addEventListener('pointerup', cancelLp)
    }
    const acts = dragActionsFor(oid)
    const inHand = cardNode.closest('.hand-row') !== null
    if (acts.length === 0 && !inHand) return                        
    e.preventDefault()                              
    pointerHeld = true
    if (acts.length === 0) deniedOid = oid
    try { root.setPointerCapture(e.pointerId) } catch { /* 老浏览器没有也能用 */ }
    const sx = e.clientX, sy = e.clientY
    const onMove = (ev: PointerEvent): void => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      if (!dragging) startDrag(cardNode, acts, ev)
      else moveDrag(ev)
    }
    const onUp = (ev: PointerEvent): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      try { root.releasePointerCapture(ev.pointerId) } catch { /* ignore */ }
      pointerHeld = false
      if (dragging) endDrag(ev)
      else deniedOid = null
    }
                                                         
                                                        
                                               
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }
  root.onclick = (e): void => {
    if (suppressClick) return                                          
                                 
    const dz = (e.target as HTMLElement).closest('.droppable')
    if (dz && selDropMap.has(dz)) {
      const dacts = selDropMap.get(dz)!
      selectedOid = null
                                             
      if (dacts.length === 1) runOrGroup(dacts[0]!, e.clientX, e.clientY)
      else dropDisambig(dacts, e.clientX, e.clientY)
      return
    }
    const t = (e.target as HTMLElement).closest('[data-act],[data-equip],[data-equip-target],[data-equip-back],[data-card],[data-card-def],[data-zone],[data-zone-close],[data-zone-keep],[data-close],[data-mulligan],[data-roll],[data-order],[data-passall],[data-autopass],[data-undo],[data-leave],[data-copy],[data-concede-ask],[data-concede],[data-cancel-concede],[data-rematch],[data-bot],[data-logrefs]') as HTMLElement | null
    if (!t) { if (selectedOid || openZone) { selectedOid = null; openZone = null; rerender() } return }
    if (t.dataset.logrefs !== undefined) {
                                              
      hlRefs = new Set(t.dataset.logrefs.split(',').filter(Boolean))
      window.clearTimeout(hlTimer)
      hlTimer = window.setTimeout(() => { hlRefs = new Set(); rerender() }, 2000)
      rerender()
      return
    }
    if (t.dataset.zoneClose !== undefined) { openZone = null; rerender(); return }
                                                
                                                   
    if (t.dataset.zoneKeep !== undefined) return
    if (t.dataset.concedeAsk !== undefined) { confirmConcede = true; rerender(); return }
    if (t.dataset.cancelConcede !== undefined) { confirmConcede = false; rerender(); return }
    if (t.dataset.concede !== undefined) { confirmConcede = false; onAction({ kind: 'CONCEDE', player: seat }); return }
    if (t.dataset.rematch !== undefined) { onRematch?.(); return }
                                                                        
                                                                
    if (t.dataset.bot !== undefined) {
      const base = (localStorage.getItem('riftbound.server') ?? 'http://127.0.0.1:5180') + '/api'
      const btn = t as HTMLButtonElement
      btn.disabled = true
      btn.textContent = '傀儡入座中…'
      void fetch(`${base}/bot`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
                                                
                                        
        body: JSON.stringify({
          code: (document.querySelector('.big-code') as HTMLElement | null)?.dataset.copy ?? hovRv?.code,
        }),
      }).catch(() => { btn.disabled = false; btn.textContent = '叫傀儡失败 · 再试一次' })
      return
    }
                                           
    if (t.dataset.equip !== undefined) {
      const [o, ab] = t.dataset.equip.split('|')
      equipPick = o && ab ? { oid: o, ability: ab } : null
      rerender()
      return
    }
    if (t.dataset.equipTarget !== undefined) { // 这个单位还有变体要问 ⇒ 进第三步
      if (equipPick) equipPick = { oid: equipPick.oid, ability: equipPick.ability, target: t.dataset.equipTarget }
      rerender()
      return
    }
    if (t.dataset.equipBack !== undefined) { // 有 target 就退回选单位,否则整条取消
      equipPick = equipPick?.target ? { oid: equipPick.oid, ability: equipPick.ability } : null
      rerender()
      return
    }
    if (t.dataset.act !== undefined) {
      const a = actIndex[Number(t.dataset.act)]
      selectedOid = null
      equipPick = null                    
      openZone = null                                                
                                                  
      if (a) runOrGroup(a, e.clientX, e.clientY)
      return
    }
    if (t.dataset.autopass !== undefined) { // ★927 自动让过开关
      autoPassSet(!autoPassGet())
      boundRerender?.()
      return
    }
    if (t.dataset.undo !== undefined) { // ★768 撤回
      boundOnUndo?.()
      return
    }
    if (t.dataset.passall !== undefined) { // ★768 本轮全部让过(纯客户端意图)
      passAllArmed = !passAllArmed
      if (passAllArmed) {
                                   
        const pass = hovRv?.legalActions.find((a) => a.kind === 'PASS')
        if (pass) { boundOnAction?.(pass); return }
      }
      rerender()
      return
    }
    if (t.dataset.roll !== undefined) { // ★767 掷骰
      boundOnRoll?.({ kind: 'ROLL_DICE', player: seat })
      return
    }
    if (t.dataset.order !== undefined) { // ★767 指定玩家选先手/后手(§407.1)
      boundOnRoll?.({ kind: 'CHOOSE_ORDER', player: seat, order: t.dataset.order })
      return
    }
    if (t.dataset.mulligan !== undefined) {
      const put = [...mulliganSel]
      mulliganSel = new Set()
      onAction({ kind: 'MULLIGAN', player: seat, put })
      return
    }
    if (t.dataset.cardDef !== undefined) { // 战场卡等没有 oid 的对象:用 def: 前缀走同一个检视面板
      selectedOid = `def:${t.dataset.cardDef}`
      rerender()
      return
    }
    if (t.dataset.zone !== undefined) { openZone = openZone === t.dataset.zone ? null : t.dataset.zone; rerender(); return }
    if (t.dataset.card !== undefined) {
      const oid = t.dataset.card
      if (lastMode === 'mulligan') {
        if (mulliganSel.has(oid)) mulliganSel.delete(oid)
        else if (mulliganSel.size < 2) mulliganSel.add(oid)
      } else {
        selectedOid = selectedOid === oid ? null : oid
      }
      rerender()
      return
    }
    if (t.dataset.copy !== undefined) {
      flashCopied(t, copyText(t.dataset.copy))
      return
    }
    if (t.dataset.close !== undefined) { selectedOid = null; rerender(); return }
    if (t.dataset.leave !== undefined) { onLeave(); return }
  }
                                                      
                                         
                                           
    
                                                          
                                                           
                                               
                                                     
                            
    
                                 
                                                            
                                             
  const KB_FOCUS = 'kb-focus'
                                                
                                                        
                                                               
                                                            
  const kbChoices = (): HTMLButtonElement[] =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[data-kbgroup] button:not([disabled])'))
  const kbMove = (dir: 1 | -1): boolean => {
    const list = kbChoices()
    if (list.length === 0) return false
    const at = list.findIndex((b) => b.classList.contains(KB_FOCUS))
                                              
    const next = at < 0 ? (dir === 1 ? 0 : list.length - 1) : (at + dir + list.length) % list.length
    for (const b of list) b.classList.remove(KB_FOCUS)
    list[next]?.classList.add(KB_FOCUS)
    list[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    return true
  }
  const clickHotkey = (key: string): boolean => {
    const b = document.querySelector<HTMLButtonElement>(`[data-hotkey="${key}"]:not([disabled])`)
    if (!b) return false
    b.click()
    return true
  }
  document.onkeydown = (e): void => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
                                         
    const el = e.target as HTMLElement | null
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return

    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') { if (kbMove(1)) e.preventDefault(); return }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') { if (kbMove(-1)) e.preventDefault(); return }

    if (e.code === 'Space' || e.code === 'Enter') {
                                         
      const focused = document.querySelector<HTMLButtonElement>(`[data-kbgroup] button.${KB_FOCUS}`)
      if (focused && !focused.disabled) { e.preventDefault(); focused.click(); return }
                                                          
                                                                      
                                                           
                                                          
                                                       
                                           
                                   
      const cands = [
        document.getElementById('rb-bigbtn') as HTMLButtonElement | null,
        document.querySelector<HTMLButtonElement>('[data-hotkey="space"]'),
      ]
      const b = cands.find((x): x is HTMLButtonElement => x !== null && !x.disabled)
      if (b) { e.preventDefault(); b.click() }
      return
    }

    if (e.code === 'KeyA') { if (clickHotkey('a')) e.preventDefault(); return }
    if (e.code === 'KeyS') { if (clickHotkey('s')) e.preventDefault(); return }
    if (e.code === 'KeyD' || e.code === 'Escape') {
                                              
      const focused = document.querySelector<HTMLButtonElement>(`[data-kbgroup] button.${KB_FOCUS}`)
      if (focused) { focused.classList.remove(KB_FOCUS); e.preventDefault(); return }
      if (selectedOid !== null || openZone !== null || equipPick !== null) {
        selectedOid = null; openZone = null; equipPick = null
        e.preventDefault(); rerender()
      }
    }
  }
                                                                       
                                                                   
  let hovTimer: number | undefined
  root.onmouseover = (e): void => {
    const t = (e.target as HTMLElement).closest('[data-def],[data-card-def],[data-hover-def]') as HTMLElement | null
    window.clearTimeout(hovTimer)
    if (!t) return
    const defId = t.dataset.def ?? t.dataset.cardDef ?? t.dataset.hoverDef
    if (!defId) return
    const key = `${defId}|${t.dataset.card ?? ''}`
    if (key === hovPrevKey) return
    const oid = t.dataset.card
    hovTimer = window.setTimeout(() => {
      hovPrevKey = key
      hovPrevHtml = buildHovPrev(defId, oid)
      const el = document.getElementById('rb-hovprev')
      if (el) { el.innerHTML = hovPrevHtml; el.classList.add('on') }
    }, 150)
  }
                                   
                                
  root.onmouseout = (e): void => {
    if (dragging) return                                      
    const to = (e as MouseEvent).relatedTarget as HTMLElement | null
    if (to && to.closest('[data-def],[data-card-def],[data-hover-def]')) return              
    window.clearTimeout(hovTimer)
    hovPrevKey = ''
    hovPrevHtml = ''                                          
    document.getElementById('rb-hovprev')?.classList.remove('on')
  }
}

export const boardStyles = `
  /* ★1016 键盘焦点:方向键选中的那一项。用 outline 不用 border —— 这是信息不是装饰(★768)。 */
  [data-kbgroup] button.kb-focus{outline:3px solid #fbbf24;outline-offset:2px;border-radius:8px}

  /* 牌桌接管整个视口:抵消 index.html 的 body padding 与 #app 限宽(开发者UI仍保留原样式) */
  body:has(.rb-shell){padding:0}
  #app:has(.rb-shell){max-width:none}
  .rb-shell{height:100dvh;display:flex;flex-direction:column;gap:4px;box-sizing:border-box;padding:5px 8px;user-select:none}
  /* ★757 起:底部几何的唯一真相源(三处底部魔数各写各的必然失配)。
     ★760 更新:--dock-h 已随 dock 收进战报栏而删除;现在底部只由 --hand-h 与 --hand-sink 决定,
     --hand-peek(露出多少)与 --bottom-band(牌桌 padding-bottom)都从这两个算出来。
     ⚠️ 这三档尺寸是【搜出来的可行解】,不是随手填的:约束是「牌垫不被压 且 战场不内部滚动」。
        改任何一个之前,先开右上角的「⚙ 布局」面板拖一遍看那行派生量 —— 它会告诉你还有没有余量。 */
  /* 尺寸只有 *-base 三档在媒体查询里定义;这里把它们映射成实际使用的变量,
     .side.opp 再按比例覆盖同名变量(见下)。 */
  .rb-shell{--rune-w:var(--rune-w-base);--rune-h:var(--rune-h-base);
    --hero-w:var(--hero-w-base);--hero-h:var(--hero-h-base);
    /* ★768 表面层次(委托人:「条条框框太多了,删掉所有的条和框,用颜色深浅来代替」)。
       牌桌不再靠线分区,靠明度差分区:越靠近你的、越该被看见的区域越亮。
       ⚠️ 只替换【装饰性】边框。功能性描边一条都不能删 —— 选中金框、可打出光边、
          可指定目标、危险色警示,那些是信息不是装饰(它们走 outline / box-shadow,不是 border)。 */
    --bfcard-w:96px;--bfcard-h:134px;  /* 战场卡(旋转 90° 后视觉上是 134 宽 96 高) */
    /* ★775 召出的符文卡与符文堆【同尺寸】(委托人:「你改了符文堆的卡图大小,
       你同时也要改召唤出来的符文卡的大小呀」)。两者都取传奇档 —— 它们本来就是同一种牌。 */
    --rune-w:var(--hero-w);--rune-h:var(--hero-h);
    --rune-peek:calc(var(--rune-w) * .42);  /* ★774 叠起来时每张至少露这么宽 */
    --sf1:#ffffff08;   /* 最浅一层:牌垫格子 */
    --sf2:#ffffff0d;   /* 中间层:分区容器 */
    --sf3:#00000033;   /* 下沉层:牌堆槽、空位这类"凹进去"的东西 */
    --rail-w:300px;--hand-sink:47px;--fan-arc:29px;--hand-overlap:-26px;
    --hand-peek:calc(var(--hand-h) - var(--hand-sink));--bottom-band:var(--hand-peek);
    /* ★765 这一档的数值是【委托人自己用布局面板调出来再导出的】,不是我拍的。改之前先问他。 */
    --hand-w:135px;--hand-h:189px;--field-w:66px;--field-h:92px;--mini-w:30px;--mini-h:42px;
    --rune-w-base:78px;--rune-h-base:109px;--hero-w-base:112px;--hero-h-base:157px;
    --lane-h:calc(var(--field-h) + 12px);--mat-card-h:var(--hero-h);--mat-h:calc(var(--mat-card-h) + 8px)}
  /* ★757 矮屏(笔记本 720/768)整体降一档:实测 1280×720 下按大尺寸排,内容 622px
     远超可用 526px,我方牌垫被挤进底部悬浮带、可达率只剩 12%。尺寸走变量,一处改全身跟。 */
  @media (max-height: 900px){
    .chainov{top:6%;max-height:52vh;padding:10px 12px}
    .ch-pass{min-width:200px;min-height:48px}
    .ch-pass b{font-size:17px}
    .rb-shell{--rune-w-base:68px;--rune-h-base:95px;--hero-w-base:100px;--hero-h-base:140px;
      --hand-w:102px;--hand-h:142px;--field-w:52px;--field-h:72px;--mini-w:26px;--mini-h:36px;
      --hand-sink:40px;--fan-arc:18px;--hand-overlap:-30px}
  }
  @media (max-height: 760px){
    /* ★759 空间预算(1280x720 实测):可用 533px 要分给 对手侧+战场+我方侧。
       牌垫一侧 = 传奇行(hero-h+16) + 符文行(rune-h+16);两侧对称 ⇒ 侧高×2 + 战场 = 533。
       hero 95 / rune 56 ⇒ 侧高 183、两侧 366、战场 167 ⇒ 战场卡 78×2 + padding 刚好装下。
       ⚠️ 改这三个变量前先按这条式子算一遍,否则会把战场区压成 0(★757 已经踩过一次)。 */
    .rb-shell{--rune-w-base:42px;--rune-h-base:58px;--hero-w-base:59px;--hero-h-base:82px;
      --hand-w:90px;--hand-h:126px;--field-w:43px;--field-h:60px;
      --hand-sink:38px;--fan-arc:14px;--hand-overlap:-32px}
    .table{padding-top:6px}
    .topbar{padding:3px 12px}
  }
  .hovprev,.lg-body{user-select:text} /* 牌桌禁选中(拖拽不打架),读卡文/翻战报仍可复制 */
  .rb-shell > .rb-row{flex:1;min-height:0}
  .rb-row{display:flex;gap:8px;min-height:0}
  .rb-row > .table{flex:1;min-width:0;height:auto;max-height:none}
  /* 右栏:上=悬停预览(P1),下=战报,常驻永不折叠 */
  .lograil{width:var(--rail-w);flex-shrink:0;display:flex;flex-direction:column;
    background:#1a1610e6;border-radius:12px;overflow:hidden}
  /* ★756 中央悬停大图:鼠标停在任意一张卡上 → 牌桌中央淡入大图+全文,移开即收。
     ⚠️ pointer-events:none —— 它盖在牌桌上,绝不能挡住底下的卡(拖拽命中靠 elementFromPoint)。 */
  .hovbig{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(.96);z-index:70;
    width:min(430px,42vw);max-height:74vh;overflow:hidden;padding:14px 16px;border-radius:16px;
    background:#0b1120f5;border:1px solid var(--gold-dim);box-shadow:0 24px 70px #000e,0 0 0 1px #0006;
    opacity:0;visibility:hidden;pointer-events:none;transition:opacity .13s ease-out,transform .13s ease-out}
  .hovbig.on{opacity:1;visibility:visible;transform:translate(-50%,-50%) scale(1)}
  .hovbig .card-detail{flex-direction:row;min-width:0;width:100%;gap:14px;align-items:flex-start}
  .hovbig .cd-art{width:190px;flex-shrink:0}
  .hovbig .cd-body{min-width:0}
  .hovbig .cd-body h3{font-size:17px}
  .hovbig .cd-text{font-size:13px;line-height:1.7}
  .hovbig .cd-flavor{display:none}
  .hp-hint{color:#475569;font-size:12px;text-align:center;padding:22px 8px;line-height:1.8}
  /* 大按钮(P2):一处优先权,文案随状态变,空格触发 */
  .bigbtn{min-width:190px;height:36px;border-radius:18px;font-size:14px;font-weight:700;border:0;cursor:pointer;
    padding:0 22px;margin-left:auto;box-shadow:0 4px 18px #0009;transition:transform .08s,box-shadow .08s,filter .12s}
  .bigbtn:hover{transform:translateY(-1px);filter:brightness(1.12)}
  /* ★773 主按钮 = 桌边的黄铜件,不是霓虹灯。
     渐变从"上亮下暗"走(金属受光),再压一道内高光 + 一道深色底边,做出厚度。 */
  .bigbtn.go{background:linear-gradient(180deg,#c9993c,#8a6417);color:#1a1409;
    box-shadow:inset 0 1px 0 #f0d68e88,inset 0 -2px 0 #5d420f,var(--sh-card);font-weight:700}
  .bigbtn.go:hover{background:linear-gradient(180deg,#dcac48,#9a7220)}
  .bigbtn.end{background:linear-gradient(180deg,#7d6a4a,#4e412a);color:#f0e6d2;
    box-shadow:inset 0 1px 0 #cbb98d55,inset 0 -2px 0 #332a1b,var(--sh-card)}
  .bigbtn.end:hover{background:linear-gradient(180deg,#8d7a56,#5a4c31)}
  .bigbtn.wait{background:#16233b;color:#5b7290;cursor:default;box-shadow:none}
  .bigbtn.wait:hover{transform:none;filter:none}
  .bigbtn .warn-dot{margin-left:6px}
  /* 比分板:双侧计分珠相向点亮,中间是目标分 */
  .scoreboard{display:flex;align-items:center;gap:7px;padding:2px 12px;border-radius:99px;
    background:#0d182ecc;border:1px solid var(--line)}
  .sb-num{font-size:19px;font-weight:800;min-width:22px;text-align:center}
  .sb-num.me{color:#4ade80}.sb-num.foe{color:#f87171}
  .sb-goal{font-size:10px;color:#8ea7ba;border:1px solid #8ea7ba55;border-radius:99px;padding:0 6px;line-height:15px}
  .sb-pips{display:flex;gap:3px;align-items:center}
  .sb-pip{width:9px;height:9px;border-radius:50%;border:1px solid #46618a;background:transparent;box-sizing:border-box}
  .sb-pip.me.on{background:#4ade80;border-color:#4ade80;box-shadow:0 0 6px #4ade8088}
  .sb-pip.foe.on{background:#f87171;border-color:#f87171;box-shadow:0 0 6px #f8717188}
  .sb-pip.lock{animation:pipLock 1.2s ease-in-out infinite;border-color:#fde047}
  @keyframes pipLock{0%,100%{box-shadow:0 0 2px #fde04744}50%{box-shadow:0 0 10px #fde047cc}}
  /* 拖拽出牌(P3):绿框=合法落点(炉石惯例),实心亮=当前悬停落点 */
  /* ★752 拖拽 CSS 已整块挪到 boardStyles 末尾 —— 放这里会被下面 .card{position:relative} 压掉 */
  #rb-dropmenu{position:fixed;z-index:310;display:flex;flex-direction:column;gap:6px;background:#0f172af2;
    border:1px solid #334155;border-radius:10px;padding:8px;box-shadow:0 10px 30px #000c}
  /* P4 目标箭头:绿=悬在合法目标上,黄=还在找 */
  #rb-arrow{position:fixed;inset:0;z-index:290;pointer-events:none}
  #rb-arrow path{fill:none;stroke:#eab308;stroke-width:4.5;stroke-linecap:round;stroke-dasharray:2 9}
  #rb-arrow polygon{fill:#eab308}
  #rb-arrow.hot path{stroke:#34d399;stroke-dasharray:none}
  #rb-arrow.hot polygon{fill:#34d399}
  .lg-head{padding:7px 12px;font-size:12px;letter-spacing:2px;color:#94a3b8;background:#111c31;flex-shrink:0}
  .lg-body{flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:3px;font-size:12px;line-height:1.55}
  .lg-line{color:#cbd5e1}
  .lg-me{color:#86efac}.lg-foe{color:#fca5a5}.lg-sys{color:#fdba74}
  .lg-banner{margin:8px 0 4px;padding:3px 0;text-align:center;font-size:11px;color:#7dd3fc;border-top:1px solid #1e293b;border-bottom:1px solid #1e293b}
  .lg-click{cursor:pointer;border-radius:5px;padding:0 4px;margin:0 -4px}
  .lg-click:hover{background:#1e293b88}
  .card.lg-hl{outline:3px solid #fde047;outline-offset:1px;box-shadow:0 0 16px #fde04788;animation:hlPulse 1s ease-out}
  .bf.lg-hl{border-color:#fde047aa;box-shadow:0 0 18px #fde04744 inset}
  @keyframes hlPulse{0%{outline-color:#fde047;box-shadow:0 0 22px #fde047cc}100%{outline-color:#fde047aa}}
  .lg-empty{color:#475569;font-size:12px;text-align:center;padding:20px 6px}
  /* 提交被拒的浮条:此前 submit 的返回值被丢掉,点了没反应=牌手判定界面卡死然后反复点 */
  .rb-toast{position:fixed;left:50%;bottom:76px;transform:translateX(-50%) translateY(12px);z-index:200;
    background:#7f1d1def;border:1px solid #f8717188;color:#fecaca;padding:9px 20px;border-radius:99px;font-size:13px;
    box-shadow:0 8px 26px #000a;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s}
  .rb-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  .rb-copytoast{position:fixed;left:50%;top:24px;transform:translateX(-50%) translateY(-8px);z-index:210;
    background:#065f46f0;border:1px solid #34d399;color:#d1fae5;padding:8px 18px;border-radius:99px;font-size:13px;
    box-shadow:0 8px 26px #000a;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s}
  .rb-copytoast.fail{background:#7f1d1df0;border-color:#f87171;color:#fecaca}
  .rb-copytoast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  /* 大厅 */
  .panel.lobby{width:min(720px,94vw)}
  .lobby-t{font-size:28px;margin-bottom:2px}
  .lobby-s{margin-bottom:18px}
  .lobby-cols{display:flex;gap:12px;text-align:left}
  .lobby-box{flex:1;background:#1e293b55;border:1px solid #1e293b;border-radius:10px;padding:14px}
  .lobby-h{display:flex;align-items:baseline;gap:8px;margin-bottom:10px;color:#e2e8f0}
  .lobby-h small{color:#94a3b8;font-size:12px}
  .lobby-hint{margin-top:8px;font-size:11px;color:#64748b}
  /* ★767 掷骰屏 */
  .die-row{display:flex;align-items:center;justify-content:center;gap:22px;margin:18px 0 14px}
  .die-vs{font-size:13px;color:#64748b;letter-spacing:.14em}
  .die-box{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:96px}
  .die{width:76px;height:76px;border-radius:14px;display:grid;place-items:center;font-size:46px;line-height:1;
    background:#0f172a;border:2px solid #334155;color:#e2e8f0;box-shadow:0 8px 24px #0008}
  .die-box.mine .die{border-color:#6366f1;color:#c7d2fe}
  .die.rolling{animation:dieshake .5s ease-in-out infinite;color:#475569;font-size:34px}
  @keyframes dieshake{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-5px) rotate(4deg)}}
  .die-who{font-size:12px;color:#94a3b8}
  .die-val{font-size:13px;font-style:normal;color:#fde047;font-weight:600}
  .die-hint{font-size:11px;font-style:normal;color:#64748b}
  .roll-note{font-size:12.5px;color:#94a3b8;line-height:1.6;margin:8px 0}
  .roll-note.ok{color:#86efac}.roll-note.warn{color:#fbbf24}.roll-note.dim{color:#64748b;font-size:11px}
  .roll-pick{display:flex;gap:12px;justify-content:center;margin-top:6px}
  .roll-pick .btn{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:190px;padding:12px 16px}
  .roll-pick .btn b{font-size:16px}
  .roll-pick .btn i{font-size:11px;font-style:normal;opacity:.8;font-weight:400}
  /* ★762 先后手改成服务端随机之后,原来那两行「建房=你先手/加入=你后手」就成了假话。
     换成中性文案 + 这一条说明 —— 玩家最先想知道的就是「谁先手」。 */
  .lobby-fair{margin-top:12px;padding:8px 12px;border-radius:8px;font-size:11.5px;line-height:1.6;
    color:#93c5fd;background:#0369a11a;border:1px solid #0369a144}
  .lobby-err{color:#fca5a5;margin-top:10px;min-height:16px}
  /* 服务端拒绝牌组时逐条摊开的违规(§103/§485);code 是规则号,便于对着规则书查 */
  .lobby-viol{margin:6px 0 0;padding-left:18px;text-align:left;font-size:12px;color:#fdba74;line-height:1.6}
  .lobby-viol code{color:#fca5a5;margin-right:4px}
  .lobby-foot{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;color:#475569;margin-top:10px}
  .srv.up{color:#4ade8099}.srv.down{color:#f87171}
  .srv-addr{opacity:.7}
  .srv-fix{color:#fbbf24}
  .srv-fix code{background:#0f172a;border:1px solid #334155;border-radius:5px;padding:1px 6px;color:#7dd3fc}
  .codebox{flex:1;text-transform:uppercase;letter-spacing:6px;text-align:center;font-size:18px;padding:8px;border-radius:8px;background:#0f172a;color:#7dd3fc;border:1px solid #334155;min-width:0}
  .devscene{margin-top:12px;width:100%;padding:6px;border-radius:8px;background:#0f172a;color:#94a3b8;border:1px solid #334155;font-size:12px}
  /* 赛前三步流程(选牌组 → 选定英雄 → 开打;学 MALO 练习室的分步式) */
  .pregame{text-align:left;margin-bottom:14px}
  .pg-steps{display:flex;align-items:center;gap:8px;font-size:12px;color:#5b7290;margin-bottom:12px;letter-spacing:.04em}
  .pg-steps b{color:var(--gold);font-weight:700}
  .pg-steps b.on{color:var(--gold)}
  .pg-steps i{font-style:normal;opacity:.5}
  .pg-deckline{font-size:13px;color:var(--tx-soft);margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .pg-deckline b{color:var(--tx)}
  .pg-rule{font-size:12px;line-height:1.7;color:#7dd3fc;background:#0b213a;border-left:3px solid #38bdf8;
    border-radius:0 8px 8px 0;padding:8px 12px;margin:0 0 12px}
  .pg-note{font-size:11px;color:#8ea7ba;margin:10px 0 0;line-height:1.6}
  .pg-empty{color:#f87171;font-size:13px;padding:16px;text-align:center;border:1px dashed #7f1d1d;border-radius:8px}
  .pg-next{width:100%;margin-top:12px}
  .pg-btns{display:flex;gap:10px;align-items:center;margin-top:14px}
  .pg-btns .btn.primary{flex:1}
  .pg-mini{padding:1px 10px;font-size:11px;border-radius:99px}
  /* 英雄卡选择:大卡图 + 选中金框(选定英雄是整局的脸面,不能画成一行小字)
     ⚠️ 这一族【必须用字面色,不许用 var(--gold)/var(--line) 这些 token】。
        ★771 实测的坑:设计 token 定义在 .rb-shell 上(见下方那条 --gold 的声明),
        而大厅【不在 .rb-shell 里面】—— 于是 border:2px solid var(--line) 整条属性
        "在计算值阶段失效",回落到初值 border-style:none ⇒ 选中的金框【一根线都画不出来】,
        选中与未选中只差一个几乎看不见的深色底。委托人原话:「完全看不出是否选中了」。
        同页的 .dp-card 一直是字面色,所以选牌组那一步的绿框从来没坏过 —— 照它写。 */
  .hero-row{display:flex;gap:12px;flex-wrap:wrap}
  .hero-card{flex:0 0 auto;width:132px;display:flex;flex-direction:column;align-items:center;gap:6px;
    background:#0f172a;border:2px solid #334155;border-radius:12px;padding:8px;cursor:pointer;
    font:inherit;color:#94a3b8;transition:border-color .12s,transform .12s,box-shadow .12s}
  .hero-card img{width:100%;aspect-ratio:5/7;object-fit:cover;border-radius:7px;display:block;
    opacity:.55;filter:saturate(.5);transition:opacity .12s,filter .12s}
  .hero-card:hover{border-color:#7dd3fc;transform:translateY(-2px)}
  .hero-card:hover img{opacity:.8;filter:none}
  .hero-card.on{border-color:#e3b341;background:#2a2109;color:#fde68a;
    box-shadow:0 0 0 3px #e3b34133,0 0 18px #e3b34140}
  .hero-card.on img{opacity:1;filter:none}
  .hero-card.on b{color:#fde68a}
  .hero-card b{font-size:12px;text-align:center;line-height:1.35}
  .hc-tick{font-size:10px;font-style:normal;font-weight:700;color:#1a1405;background:#e3b341;
    border-radius:99px;padding:2px 9px;letter-spacing:.5px}
  .deckpick{text-align:left;margin-bottom:16px}
  .dp-t{font-size:12px;color:#94a3b8;letter-spacing:2px;margin-bottom:8px}
  .dp-row{display:flex;gap:10px;flex-wrap:wrap}
  .dp-card{flex:1;min-width:220px;display:flex;flex-direction:column;gap:3px;text-align:left;cursor:pointer;
    background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px 14px;color:#94a3b8;font:inherit;font-size:11px}
  .dp-card b{font-size:15px;color:#e2e8f0}
  .dp-card:hover{border-color:#475569}
  .dp-card.on{border-color:#4ade80aa;background:#14532d22;box-shadow:0 0 14px #4ade8022}
  .dp-card.on b{color:#86efac}
  .dp-dom{display:flex;gap:8px;align-items:center;margin-top:2px}
  .dp-dom i{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:3px}
  .dp-warn{color:#fbbf24;margin-top:4px}
  /* 结算屏 */
  .go-t{font-size:30px;margin-bottom:8px}
  .go-score{font-size:22px;color:#cbd5e1;margin-bottom:10px}
  .go-score i{opacity:.4;margin:0 8px;font-style:normal}
  .go-score small{opacity:.5;font-size:13px;margin-left:6px}
  .go-why{color:#94a3b8;margin-bottom:4px}
  .go-hint{font-size:11px;color:#475569;margin-top:12px}
  .reclaim{display:block;width:100%;margin-top:12px;border-color:#38bdf855;color:#7dd3fc}
  /* ── ★773 设计 token · 实体桌游隐喻 ────────────────────────────────
     ⚠️ 这一组颜色【不是拍脑袋定的】,是对 1228 张官方卡图做程序化取色得来的
        (每域采样 45 张单域卡,按饱和度×明度加权;脚本思路见桌面《视觉规范草案》)。
     取出来三条事实,直接决定了下面的值:
     ① 六个域的**卡框识别色完全一致** = #a06010 / #d0a040 / #e0b040 一组古铜金(仿烫金印刷)。
        我们原来的高亮色是 #e3b341(琥珀)/ #facc15(Tailwind yellow-400)—— 那是为屏幕设计的
        高饱和黄,并排看官方那组像金属、我们那个像塑料。**金色在这个界面上无处不在
        (区域标签/比分/选中/可打出/战场名),换掉它等于一次性抽掉一层廉价感。**
     ② 官方卡面**不靠颜色区分域**(费用宝石也是金的,靠符号形状区分)。
        但屏幕上没有"拿起来看"这回事,域色仍要保留 —— 只是饱和度要压下来,
        让它们像"做旧的染料"而不是六个发光按钮。
     ③ 插画整体是**暗色暖调**(色相主峰 15°~45°)。所以桌面底色不能是原来那种冷海军蓝:
        冷底压暖画会显脏。换成中性偏暖的深褐黑。
     ⚠️ 发光**保留**(委托人拍板:实体质感与发光反馈两边的优点都要)——
        但光的颜色跟着金走,不再是蓝色霓虹,这样它读起来像"烛光打在烫金上"而不是"LED"。 */
  .rb-shell{
    /* 桌面与层次:靠明度分层,不靠边框 */
    --nv-0:#14110d;--nv-1:#1c1813;--nv-2:#241f18;--pan-0:#221c15;--pan-1:#2b241b;
    /* 文字:暖白,不用纯白 */
    --tx:#ece4d6;--tx-soft:#c3b6a1;--tx-dim:#8b7f6d;
    --line:#d8b87a1f;--line-hi:#d8b87a3d;
    /* 古铜金四阶 —— 直接取自官方卡框 */
    --gold:#d0a040;--gold-dim:#90702066;--gold-deep:#a06010;--gold-hi:#e0b040;
    --good:#5f8a4e;--bad:#a8443a;--warn:#c8892e;
    /* 实体物件的影子:短而硬,不是弥散光晕 */
    --sh-card:0 3px 6px #0000007a;--sh-lift:0 8px 16px #00000099}
  /* ★773 桌面 = 一块毡。
     ⚠️ 实体感的关键不是颜色,是【表面不完美】—— 一层 3% 的斜纹噪点,成本几乎为零,
        但"塑料感"会立刻掉一大半。**只铺桌面这一层**:牌垫/卡牌/面板上都不铺,纹理叠纹理会脏。
     原来那圈 1200px 的径向渐变是"数字界面"的做法(舞台灯),实体桌面没有那种光,已去掉。 */
  .table{display:flex;flex-direction:column;gap:5px;height:calc(100dvh - 80px);overflow:hidden;color:var(--tx);font-size:14px;position:relative;
    border-radius:12px;padding:12px 14px calc(var(--bottom-band) + 8px);
    background-color:var(--nv-0);
    background-image:repeating-linear-gradient(48deg,#ffffff06 0 1px,#00000000 1px 3px),
                     repeating-linear-gradient(-42deg,#00000012 0 1px,#00000000 1px 4px);
    box-shadow:inset 0 0 120px #00000059}
  /* 分区小标题的统一体例:全大写/字距/琥珀金(riftatlas 的做法,信息层级一眼可辨) */
  .lab{font-size:10px;letter-spacing:.14em;color:var(--gold);text-transform:uppercase;opacity:.85}
  .topbar{display:flex;align-items:center;gap:16px;padding:5px 14px;border-radius:10px;flex-shrink:0;
    background:linear-gradient(180deg,var(--pan-1),var(--pan-0));box-shadow:0 2px 12px #00000059}
  .topbar .room{font-size:11px;letter-spacing:.1em;color:var(--tx-dim);text-transform:uppercase}
  .topbar .room b{letter-spacing:3px;color:var(--gold);font-size:15px;cursor:pointer}
  .turnbox{font-size:12px;color:var(--tx-soft)}.turnbox b{color:var(--tx)}
  .score{font-size:17px}.score i{opacity:.5;margin:0 4px}.score .me{color:#4ade80}.score small{opacity:.5}
  .st{margin-left:auto;padding:3px 12px;border-radius:99px;font-size:13px}
  .st.window{background:#facc1522;color:#fde047;border:1px solid #facc1555;animation:pulse 1.2s infinite}
  .st.go{background:#4ade8022;color:#86efac;border:1px solid #4ade8044}
  .st.wait{background:#33415555;color:#94a3b8}.st.gameover{background:#f8717122;color:#fca5a5}
  @keyframes pulse{50%{opacity:.6}}
  .opp-zone,.my-zone{display:flex;flex-direction:column;gap:6px;flex-shrink:0}
  .my-cue{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cue{font-size:11px;border-radius:99px;padding:2px 9px;cursor:help}
  .cue.prio{color:#86efac;background:#14532d66;border:1px solid #4ade8066;animation:pulse 1.3s infinite}
  .cue.focus{color:#c7d2fe;background:#3730a355;border:1px solid #6366f166}
  .hand-backs{display:flex;gap:2px;align-items:center;min-height:34px}.hand-backs .cnt{margin-left:8px;opacity:.6}
  /* 基地:牌垫上印好的分区,虚线内框 + 左上角标签 */
  .base-row{display:flex;gap:7px;align-items:center;min-height:auto;padding:7px 12px;border-radius:10px;position:relative;flex-shrink:0;overflow-x:auto;
    background:linear-gradient(180deg,#ffffff06,#00000018);border:1px solid var(--line);box-shadow:inset 0 1px 12px #0006}
  .base-row::before{content:'基地';position:sticky;left:0;flex-shrink:0;padding:2px 7px;border-radius:99px;
    font-size:9px;letter-spacing:.14em;color:var(--gold);background:var(--nv-1);border:1px solid var(--gold-dim)}
  .gems{display:flex;gap:3px;margin-left:8px}.gem{width:12px;height:12px;border-radius:3px;display:inline-block;box-shadow:0 0 6px #fff3 inset,0 1px 2px #0008;transition:transform .2s,filter .2s}
  /* 符文卡:域色卡面(符文没有卡图,自绘) */
  .card.sz-rune{--cw:var(--rune-w);--ch:var(--rune-h);width:var(--cw);height:var(--ch);
    flex-shrink:0;position:relative;transition:transform .12s,box-shadow .12s}
  .rune-face .rn-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit}
  /* 有图时缩写退成左上角小标,靠 :has 判断——没图的旧样式原样留着 */
  .rune-face:has(.rn-art) .rn-abbr{position:absolute;top:1px;left:2px;font-size:9px;z-index:1}
  .rune-face:has(.rn-art) .rn-name{display:none}
  .rune-face{background:linear-gradient(160deg,var(--dc),#0b1a3d);border:1px solid #ffffff33;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:default}
  .rune-face .rn-abbr{font-size:13px;font-weight:700;color:#fff;text-shadow:0 1px 3px #000a;line-height:1}
  .rune-face .rn-name{font-size:7px;color:#ffffffcc;letter-spacing:.04em}
  .rune-face.is-tapped{filter:brightness(.55) saturate(.6)}
  /* 符文区:牌垫上独立的一块 */
  .runezone{display:flex;flex-direction:column;gap:3px;padding:4px 8px;border-radius:9px;flex-shrink:0;
    background:#00000026;border:1px solid var(--line)}
  .rz-lab{font-size:9px;letter-spacing:.1em;color:var(--gold);white-space:nowrap}
  .rz-lab b{color:var(--tx);font-size:12px}.rz-lab span{color:var(--tx-dim)}
  .rz-cards{display:flex;gap:3px;align-items:center;min-height:42px}
  .rz-empty{color:var(--tx-dim);font-size:10px;font-style:normal}
  .mana{margin-left:auto;font-size:15px;color:#7dd3fc}.mana b{font-size:18px}
  .legend-slot{display:flex;border-right:1px solid #1e293b;padding-right:6px;margin-right:2px}
  /* ★757 战场区是牌桌的主体,必须优先拿空间:
     ⚠️ 上一版改成 flex:1 1 0;min-height:0 直接被两侧牌垫挤成 0 高(实测 bfs 高=0、
     战场高=2px,战场整个看不见)。现在给足保底,并让两侧牌垫去收缩。 */
  /* ★775 两处战场顶宽,中间只留一道细缝(战场卡改到各自战场内部之后,中缝不用再留位置)。 */
  /* ★777 保底高度回来了。★775 改「两处战场顶宽」时把它删成了 min-height:0 ——
     后果实测:1280×720 下 .bfs 只分到 138px,而每处战场要装【两条车道】(对手侧+我方侧,
     各 min-height = --lane-h + 18 ≈ 102),我方那条整个溢到框外,单位卡画在战场区下面
     36px 的地方,看上去就是「移过去的单位不见了」。上面 ★757 那条注释记的正是同一个坑。
     两条固定车道(--lane-h*2 + 头条 = 226)在 1280×720 下要不回来:牌垫行改成可收缩会被直接
     压成 0 高(英雄/牌堆整排消失),给 .table 开 overflow-y:auto 则把高度解算整个搞崩
     (clientHeight 塌成一小条、scrollHeight 溢出 1235px)。两条都实测过、都已撤。
     成立的解是【车道不设固定下限,两条平分战场区的高度,卡按可用高度收】——
     矮屏卡小一点,总好过卡画到框外看不见。 */
  /* ⚠️ grid-template-rows:1fr 不是装饰:不写它,这个 grid 就只有一条 auto 行,
     两处战场的高度=各自内容高(实测 81px),战场区分到的 168px 有一半是空的,
     而车道被挤到 23px、卡片被 max-height 压成一条 10px 的片。 */
  .bfs{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr;gap:6px;flex:1 1 auto;
    min-height:calc(var(--lane-h) + 96px)}
  /* 战场:中央对战区,战场卡美术做底纹;控制方以顶部一条光带表达 */
  .bf{border-radius:16px;padding:0;display:flex;flex-direction:column;min-height:0;overflow:visible;position:relative;transition:box-shadow .18s;
    background:linear-gradient(180deg,#ffffff0d,#00000026)}
  .bf::after{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:var(--line-hi);z-index:2}
  /* 战场卡美术底纹:压得很暗只留氛围,不抢单位卡的可读性 */
  /* 只取卡面上半的美术区并轻模糊:纯氛围,绝不让卡面规则文字透出来当噪点 */
  /* ★770 战场区【不再】拿战场卡的美术当底纹(委托人:「不要用卡牌的图画作为底色……太乱了」)。
     那层底纹本来是想给氛围,但战场卡现在已经以实卡形式摆在旁边了 —— 同一张画出现两次,
     一次还是糊的,只会让单位卡更难读。改成纯粹的深浅分层。 */
  .bf::before{content:'';position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(180deg,#ffffff0a,#00000014)}
  .bf > *{position:relative;z-index:1}
  .bf.bf-mine::after{background:linear-gradient(90deg,#4ade8000,#4ade80cc,#4ade8000)}
  .bf.bf-foe::after{background:linear-gradient(90deg,#f8717100,#f87171cc,#f8717100)}
  .bf-head{display:flex;align-items:center;gap:9px;font-size:12px;color:var(--tx-soft);padding:7px 10px;
    background:linear-gradient(180deg,#00000055,#00000000)}
  .bf-name{font-size:13px;color:var(--gold);letter-spacing:.02em}
  /* ★768 战场卡摆成【横置实卡】贴在两处战场的外侧边缘(委托人:
     「现在如果想看到具体战场效果,需要把鼠标移动到战场左上角,点击战场名称才可以,不要这样。
       战场卡牌横置放置在两个战场的左右边缘,对于整个浏览器来说是相对居中」)。
     两处战场是并排的 grid,所以「外侧」= 第一处贴左、第二处贴右;
     两张卡因此对称地落在整个牌桌的左右两端,视觉上相对浏览器居中。
     ⚠️ 战场卡的美术是【横版】的,竖着放会把两边裁掉 —— 所以整张卡旋转 90° 贴边,
        既是原始比例,又不占中间的对战空间。
     ⚠️ .bf 的 overflow 因此必须放开(原来是 auto,会把贴到边界外的这张卡裁没)。 */
  /* ⚠️ 居中要相对【车道区】而不是整个 .bf —— .bf 顶上还有一条标题栏(战场名/控制旗/待命计数),
     按 .bf 的 50% 算出来会偏下半个标题栏的高度(委托人:「战场牌的高度位置没有居中于战场区间」)。
     标题栏是 .bf-head,高度约 34px ⇒ 把中心往上提半个标题栏。 */
  .bf-card{position:absolute;top:calc(50% + 17px);z-index:3;cursor:pointer;
    width:var(--bfcard-w);height:var(--bfcard-h);border-radius:8px;overflow:hidden;
    box-shadow:0 6px 20px #000a;transition:transform .16s,box-shadow .16s;
    transform-origin:center}
  /* ★774 战场卡放进两个战场【之间的那条区间】,**不压在任何一个战场上**
     (委托人:「我是说放在战场区间,你现在压在了两个战场上」)。
     做法:整张卡移出战场盒子的边界 —— 第一处的卡完全落在它右侧的缝里、第二处的落在它左侧的缝里,
     两张在中缝内并排。位移量 100% 表示「整个身子都出去」,不再是 46% 那种半压半出。
     ⚠️ 中缝因此必须能装下两张横置卡的宽度(= 2 × --bfcard-h + 间隔),见 .bfs 的 gap。 */
  /* ★775 战场卡在【各自战场的内部】,靠中缝那一侧(委托人:「两边的战场是顶宽的,
     中间有细小的分割。然后左右两张战场卡分别放到两个战场里面,你现在是在外面」)。
     ⚠️ 位移仍必须用 px:transform 的 % 是按元素【未旋转】的宽度(--bfcard-w=96)算的,
        旋转 90° 后视觉宽度是 --bfcard-h(134),两者不是一回事 —— 这个坑上一轮踩过。
        往内收的量 = 半个视觉宽 - 半个元素宽 + 8px 边距,让整张卡完全落在战场框内。 */
  .bf-card{--bf-in:calc(var(--bfcard-h) / 2 - var(--bfcard-w) / 2 + 8px);top:calc(50% + 17px)}
  .bf-card.left{right:0;transform:translate(calc(var(--bf-in) * -1),-50%) rotate(-90deg)}
  .bf-card.right{left:0;transform:translate(var(--bf-in),-50%) rotate(90deg)}
  .bf-card:hover{box-shadow:0 10px 30px #000d;z-index:8}
  .bf-card.left:hover{transform:translate(calc(var(--bf-in) * -1),-50%) rotate(-90deg) scale(1.05)}
  .bf-card.right:hover{transform:translate(var(--bf-in),-50%) rotate(90deg) scale(1.05)}
  .bf-card img{width:100%;height:100%;object-fit:cover;display:block}
  .sb-count{margin-left:auto;font-size:11px;opacity:.85;flex-shrink:0}
  /* ★758 已产/可产两栏:已产的会蒸发,给它高亮 */
  .chip.pool-chip.hot{background:#f59e0b22;border-color:#f59e0b88;color:#fde68a}
  .pip.lit{box-shadow:0 0 0 1px #fde68a99}
  /* ★758 拖拽菜单:主标题 + 一句后果,两行一条 */
  #rb-dropmenu{min-width:300px;max-width:min(420px,92vw)}
  /* ★777 集结浮层。挂 body,所以一律用字面色(--sf1 之流声明在 .rb-shell 上,这里取不到)。 */
  #rb-rally{position:fixed;z-index:320;right:18px;bottom:96px;display:flex;flex-direction:column;gap:7px;
    min-width:280px;max-width:min(360px,90vw);padding:11px;border-radius:12px;
    background:#181410f7;border:1px solid #d8b87a5c;box-shadow:0 12px 34px #000000b3;backdrop-filter:blur(6px)}
  #rb-rally .dm-head{font-size:12.5px;color:#ece4d6;padding:1px 3px 7px;border-bottom:1px solid #d8b87a1f}
  #rb-rally .dm-head i{display:block;font-style:normal;font-size:10.5px;color:#8b7f6d;margin-top:3px;line-height:1.4}
  #rb-rally .ry-list{display:flex;flex-wrap:wrap;gap:5px}
  #rb-rally .ry-tag{font-size:11px;padding:3px 8px;border-radius:7px;color:#f0d9a0;background:#3a2c14;border:1px solid #d8b87a3d}
  #rb-rally .ry-tip{font-size:11px;color:#8b7f6d;line-height:1.45}
  #rb-rally .ry-tip b{color:#e0b040}
  /* 已入队的单位:金边 + 待出发角标 */
  .rally-on{outline:2px solid #e0b040;outline-offset:1px;box-shadow:0 0 14px #e0b04066!important}
  .rally-on::after{content:"待出发";position:absolute;left:50%;top:-9px;transform:translateX(-50%);
    font-size:9px;line-height:1;padding:3px 6px;border-radius:6px;white-space:nowrap;z-index:9;
    color:#14110d;background:#e0b040;font-weight:700}
  #rb-dropmenu .dm-head{font-size:11px;color:#94a3b8;padding:2px 6px 6px;border-bottom:1px solid var(--line);margin-bottom:4px}
  #rb-dropmenu .dm-item{display:block;width:100%;text-align:left;white-space:normal;line-height:1.35;padding:8px 10px}
  #rb-dropmenu .dm-item b{display:block;font-size:13px;font-weight:600}
  #rb-dropmenu .dm-item i{display:block;font-size:11px;font-style:normal;opacity:.68;margin-top:3px}
  /* ★758 战场车道里的待命格。⚠️ .bf-lane 是 overflow-x:auto,格子必须 flex-shrink:0 */
  .sb-cell{display:flex;gap:6px;align-items:center;flex-shrink:0;
    padding:0 8px;margin-right:4px;border-radius:10px;background:var(--sf3)}
  .sb-empty{width:var(--field-w);height:var(--field-h);flex-shrink:0;
    border-radius:10px;background:var(--sf3);display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:3px;font-size:16px;color:#64748b;opacity:.55}
  .sb-empty span{font-size:9px;letter-spacing:.05em;font-style:normal}
  .sb-cell.mine.drop-ok .sb-empty{border-color:#facc15;border-style:solid;opacity:.9;background:#facc1512}
  /* 面朝下的待命牌:牌背 + 自己才看得见的小字卡名 */
  .card.is-facedown{background:linear-gradient(150deg,#1e3a8a,#0b1120);border:1px solid #ffffff2e;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
  .card.is-facedown .back-swirl{font-size:22px;color:#93c5fd88}
  .card.is-facedown .fd-name{font-size:9px;color:#cbd5e1;max-width:92%;text-align:center;line-height:1.2;
    text-shadow:0 1px 3px #000}
  .sb-empty{opacity:.4;font-style:normal}
  /* 两条车道:上=对手在此处的单位,下=你的。中间一条分隔线代表战场本身(实体桌上就是这么摆) */
  /* ★756 战场改【上下分侧】(委托人 2026-08-19:一处战场里我方和对方不该左右并排,
     应该像实体牌桌那样隔着中线上下对峙)。对手在上、中线在中、我方在下。 */
  .bf-lanes{display:flex;flex-direction:column;flex:1;min-height:0}
  /* ★757 车道高度=卡高 117 + 上下 padding 14(审查高危:92px 车道 + overflow-y:hidden
     把 84×117 的卡上下各切掉 17px,战力角标/状态标记正好在被切的那两条里) */
  .bf-lane{display:flex;gap:8px;align-items:center;padding:6px 10px;flex:1 1 0;min-width:0;min-height:0;
    position:relative;overflow-x:auto;overflow-y:visible}
  /* ★777 车道矮到装不下整张卡时,卡跟着收(而不是溢出到战场框外)。
     只收高度会让 62:87 的卡面变胖 —— 但卡图是 object-fit:cover,压的是裁切不是拉伸,
     而且这只在矮窗口触发;真按比例连宽度一起收会撞上「横置时宽高互换」那套写法(★踩过)。 */
  .bf-lane .card.sz-field{max-height:100%}
  /* ★776 单位【从中心向外排开】,待命区落在战场牌的【另一侧】。
     委托人:「两个战场的待命区应该分别在战场牌左右两侧,然后打出的单位默认是从中心向外去排开。」
     战场牌贴在各自战场的**内缘**(靠中缝),所以:
     · 左边那处战场 → 内容整体靠右(挨着中缝),待命格被 row-reverse 推到最左(= 战场牌的另一侧);
     · 右边那处战场 → 内容整体靠左,待命格推到最右。
     两处因此镜像对称,单位从中间往两边长,待命区永远不会被战场牌压住。 */
  .bf-lane{justify-content:flex-start;align-items:center}
  .bfs > .bf:first-child .bf-lane{flex-direction:row-reverse;justify-content:flex-start;
    padding-right:calc(var(--bfcard-h) + 14px)}
  .bfs > .bf:last-child .bf-lane{flex-direction:row;justify-content:flex-start;
    padding-left:calc(var(--bfcard-h) + 14px)}
  /* 中线:一条贯穿的分割线,而不是一个挤在中间的 ⚔ 字 */
  .bf-vs{position:relative;height:0;border-top:1px solid #f8fafc1f;margin:0 10px;flex-shrink:0;
    color:transparent;font-size:0;padding:0}
  .bf-vs::after{content:'⚔';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    font-size:11px;color:#94a3b855;background:var(--nv-1);padding:0 7px;letter-spacing:2px}
  .opp-lane{background:linear-gradient(180deg,#f8717112,transparent)}
  .my-lane{background:linear-gradient(0deg,#4ade8012,transparent);border-top:1px dashed var(--line)}

  .lane-empty{opacity:.25;font-style:normal;margin:auto}
  .combat-bar{background:#7f1d1d1f;border:1px solid #b91c1c44;border-radius:8px;padding:4px 10px;font-size:11px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;flex-shrink:0}
  .cb-head{color:#fca5a5;font-size:13px}
  .cb-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cb-tag{padding:1px 8px;border-radius:99px;font-size:11px}
  .cb-tag.me{background:#14532d88;color:#86efac}.cb-tag.foe{background:#7f1d1d88;color:#fca5a5}
  .cu{padding:1px 7px;border-radius:6px;background:#1e293b;color:#cbd5e1}
  .cu.dead{text-decoration:line-through;opacity:.55;background:#450a0a}
  .cu.stun{outline:1px solid #a78bfa66}
  .good{color:#86efac}.bad{color:#fca5a5}
  .card.targetable{outline:2px dashed #38bdf8;outline-offset:1px;box-shadow:0 0 12px #38bdf866;animation:tgPulse 1.4s infinite}
  @keyframes tgPulse{50%{box-shadow:0 0 4px #38bdf833}}
  .bf.bf-target{border-color:#38bdf8aa;box-shadow:0 0 16px #38bdf844 inset}
  /* ★758 结算链悬浮面板。⚠️ absolute 挂 .table(它是 position:relative),
     不能 fixed+left:50% —— 右侧战报栏会让视口居中恒偏右 155px(★757 踩过)。
     层级 76:压过悬停大图(70)与检视面板(75),让位给调度/抉择/认输弹层(80/90)。 */
  /* ★766 链位区:牌桌上的一条窄带,靠右(= 对手符文区右侧那块空白),
     法术打出后就躺在这儿,结算或让过之后再飞进废牌堆。空的时候只占一点高度、不留空洞。 */
  /* ★770 法术打出区挪到【废牌堆左侧】(委托人:「法术牌需要有一个打出位置,就给它放到弃牌区左侧吧」)。
     动线也对:法术在这儿结算,结算完就近飞进右边的废牌堆。
     ⚠️ absolute 挂 .table(它是 position:relative),right 对齐到牌堆竖列的左边缘;
        牌堆列宽 = 传奇档卡宽 + 内边距,所以这里跟着 --hero-w 算,不写死。 */
  .chainlane{position:absolute;right:calc(var(--hero-w) + 26px);top:50%;transform:translateY(-50%);
    z-index:6;display:flex;flex-direction:column;align-items:center;gap:6px;
    padding:0;transition:opacity .18s}
  .chainlane:not(.empty){padding:8px 10px;border-radius:12px;background:#78350f33;
    box-shadow:0 8px 26px #0007}
  .chainlane.empty{opacity:0;pointer-events:none}
  /* ★771 拖着法术的时候这块必须显形 —— 它是法术唯一的落点,隐形的落点等于没有落点。
     ⚠️ 拖拽期间也要能被 elementFromPoint 命中,所以 pointer-events 一并放开。 */
  /* ★775 法术现在拖到哪都能松手 ⇒ 打出区不再需要在拖拽时"亮出靶子"。
     整张桌子成了落点,所以高亮也不能用平常那套(把整块牌桌刷亮会晃眼)——
     只在桌沿给一圈很淡的内发光,表示"这儿可以放"。 */
  /* ★776 拖法术时的提示条:浮在牌桌上方居中,不挡手也不挡落点 */
  #rb-dragtip{position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:310;
    pointer-events:none;font-size:13px;letter-spacing:.06em;padding:8px 18px;border-radius:99px;
    color:#1a1409;background:linear-gradient(180deg,#dcac48,#a87f22);
    box-shadow:inset 0 1px 0 #f6e2a5aa,0 8px 22px #00000073;
    animation:tipin .16s ease-out}
  @keyframes tipin{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}
  .table.droppable{box-shadow:inset 0 0 0 2px #d0a04033,inset 0 0 60px #d0a04014}
  .table.drop-hot{box-shadow:inset 0 0 0 2px #d0a04066,inset 0 0 70px #d0a04022}
  .cl-lab{font-size:10px;letter-spacing:.08em;color:#fdba74;white-space:nowrap}
  .cl-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;
    animation:clpop .22s ease-out}
  @keyframes clpop{from{opacity:0;transform:scale(.82) translateY(-8px)}to{opacity:1;transform:none}}
  .cl-item.pending .card{outline:2px solid #fbbf24aa;outline-offset:1px}
  .cl-item.foe .card{outline:2px solid #f8717166;outline-offset:1px}
  .cl-who{font-size:9px;font-style:normal;color:#94a3b8}
  .chainov{position:absolute;left:50%;transform:translateX(-50%);top:9%;z-index:76;
    width:min(560px,86%);max-height:46vh;display:flex;flex-direction:column;gap:8px;
    padding:12px 14px;border-radius:14px;
    background:linear-gradient(180deg,#1c1207f5,#0b1120fa);border:1px solid #b45309aa;
    box-shadow:0 20px 60px #000c,0 0 0 1px #00000040;animation:chslide .25s ease-out}
  @keyframes chslide{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}
  .chainov .ch-head{display:flex;flex-direction:column;gap:2px}
  .chainov .ch-title{font-size:15px;font-weight:700;color:#fdba74;letter-spacing:.02em}
  .chainov .ch-why{font-size:12px;color:#e2e8f0}
  .chainov .ch-list{display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:0}
  .chainov .ch-note{font-size:11px;color:#94a3b8;line-height:1.5}
  .chainov .ch-note .warn{color:#fbbf24;font-weight:600}
  .ci{display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:10px;
    background:#1e293bcc;border:1px solid #33415588}
  .ci-n{width:18px;height:18px;flex-shrink:0;border-radius:50%;background:#334155;color:#cbd5e1;
    display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-style:normal}
  .ci-art{width:34px;height:47px;flex-shrink:0;border-radius:4px;object-fit:cover}
  .ci-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .ci-main b{font-size:13px;color:#fdba74;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ci-sub{font-size:10px;color:#94a3b8;font-style:normal}
  .ci-st{font-size:10px;font-style:normal;flex-shrink:0;opacity:.85}
  .ci.pending{border-color:#fbbf2488;background:#78350f44}
  .ci.pending .ci-st{color:#fbbf24}
  .ci.next{border-color:#4ade80aa;box-shadow:0 0 12px #4ade8033}
  .ci.next .ci-st{color:#86efac;font-weight:600}
  /* 让过:委托人说右下角那颗太不起眼 —— 这里是 LoR 大圆钮的量级 */
  .ch-foot{display:flex;align-items:center;gap:12px;padding-top:2px;border-top:1px solid #ffffff14}
  .ch-pass{min-width:220px;min-height:54px;flex-shrink:0;cursor:pointer;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    border-radius:10px;border:0;color:#1a1409;
    background:linear-gradient(180deg,#c9993c,#8a6417);
    box-shadow:inset 0 1px 0 #f0d68e88,inset 0 -2px 0 #5d420f,var(--sh-lift)}
  .ch-pass:hover{background:linear-gradient(180deg,#dcac48,#9a7220)}
  .ch-pass b{font-size:19px;font-weight:700;letter-spacing:.08em}
  .ch-pass i{font-size:10.5px;font-style:normal;opacity:.82;font-weight:400}
  .ch-react{font-size:11.5px;line-height:1.5}
  .ch-react.has{color:#7dd3fc}.ch-react.has b{color:#bae6fd;font-size:14px}
  /* ★769 「一起移动」面板 */
  .mg-block{margin-top:10px;padding:8px 10px;border-radius:10px;background:var(--sf1)}
  .mg-head{font-size:11.5px;color:#cbd5e1;margin-bottom:6px}
  .mg-head b{color:#fde047}
  .mg-head i{display:block;font-style:normal;font-size:10px;color:#64748b;margin-top:2px}
  .mg-chips{display:flex;flex-wrap:wrap;gap:6px}
  .mg-chip{display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;
    padding:3px 8px 3px 3px;border-radius:8px;color:#cbd5e1;background:#0f172a;border:1px solid #33415566}
  .mg-chip img{width:20px;height:28px;object-fit:cover;border-radius:3px}
  .mg-chip:hover{background:#1e293b;color:#fff}
  .mg-chip.on{background:#4c1d95;border-color:#7c3aed;color:#ddd6fe}
  .mg-go{margin-top:8px;width:100%;font-size:12.5px}
  .mg-hint{display:block;margin-top:6px;font-size:10.5px;color:#64748b;font-style:normal}
  .ch-passall{margin-left:auto;flex-shrink:0;cursor:pointer;font-size:11.5px;padding:7px 12px;
    border-radius:9px;color:#cbd5e1;background:#1e293b;border:1px solid #33415588}
  .ch-passall:hover{background:#334155;color:#fff}
  .ch-passall.on{background:#4c1d95;border-color:#7c3aed;color:#ddd6fe}
  .ch-react.none{color:#94a3b8}
  /* ★756 手牌改成【浮在屏幕底部】的悬浮条(委托人:像现代卡牌游戏那样),
     不再是牌桌流里的一行。牌桌底部留出 hand 的空间靠 .table 的 padding-bottom。 */
  /* ★757 手牌条(审查三连修):
     ①以【牌桌】居中而不是视口 —— 右边 300px 战报栏会让视口居中恒偏右 155px;
     ②给回横向滚动 —— 原来 overflow:visible 时 14 张就飞出屏幕且滚不动;
     ③露出高度收敛到 --hand-peek,卡向下沉一截(像炉石/LoR 那样从屏幕底缘冒出来),
       hover 时整张抬起来看全 —— 这样底部只吃 118px 而不是 167px,腾出的空间还给牌垫。 */
  /* ★758 手牌下沉到视口底缘之外(委托人:底部可以出屏),扇形排开。
     wrap 贴 bottom:0 与 dock 重叠 —— dock 的 z-index(70)高于手牌(60),
     于是那条按钮栏正好压住扇形的下沿,视觉上就是"牌插在屏幕底边里"。
     省下的一层 dock 高度直接还给牌桌(--bottom-band 不再叠加 dock-h)。 */
  .hand-wrap{position:fixed;left:8px;right:calc(var(--rail-w) + 16px);bottom:0;z-index:60;
    display:flex;align-items:flex-end;justify-content:center;gap:0;
    padding:34px 16px 0;pointer-events:none;height:var(--hand-peek);box-sizing:border-box;
    background:linear-gradient(180deg,#00000000 0%,#02061799 45%,#020617e6 100%)}
  /* ⚠️ 命中面只给【卡本身】:手牌条为了容纳 hover 抬起,box 会向上溢出到牌垫区域,
     若整条 pointer-events:auto,我方符文行就被一片看不见的空白吃掉(实测可达率 0%)。 */
  .hand-row{display:flex;gap:0;align-items:flex-end;pointer-events:none;
    max-width:100%;overflow-x:auto;overflow-y:visible;padding-top:30px;scrollbar-width:thin}
  /* 扇形:overflow 必须放开,否则旋转出去的两端会被裁掉;张数多时才给横向滚动 */
  .hand-row.fan{overflow:visible;padding-top:44px}
  .hand-row > .card{pointer-events:auto}
  .hand-row.mull{min-height:150px;justify-content:center;gap:8px}
  /* 手牌叠压排布:相邻卡互相压住一点,像手里捏着一把牌 */
  .hand-row > .card.sz-hand{margin-left:var(--hand-overlap);transform-origin:50% 120%}
  .hand-row > .card.sz-hand:first-child{margin-left:0}
  .hand-row.mull > .card.sz-hand{margin-left:0}
  /* ★758 扇形:旋转角 --rot 与弧高 --arc 由 fanStyle() 下发;--hand-sink 是整把牌沉出屏的量。
     ⚠️ transform 留在 CSS 里(内联 transform 会让下面的 :hover 永远失效)。 */
  .hand-row.fan > .card.sz-hand{
    transform:translateY(calc(var(--hand-sink) + var(--arc-t,0) * var(--fan-arc))) rotate(var(--rot,0deg));
    z-index:var(--zi,1)}
  /* 悬停:拉平 + 抬起 + 放大 + 压过邻卡 */
  .hand-row.fan > .card.sz-hand:hover{
    transform:translateY(calc(var(--hand-sink) - 96px)) rotate(0deg) scale(1.12);
    z-index:40;box-shadow:0 18px 44px #000d}
  .hand-row:not(.fan) > .card.sz-hand{transform:translateY(30px)}
  .hand-row:not(.fan) > .card.sz-hand:hover{transform:translateY(-22px) scale(1.1);z-index:20;
    box-shadow:0 18px 40px #000d}
  .hand-row.mull > .card.sz-hand{transform:none}
  .hand-lab-wrap{pointer-events:auto;display:flex;align-items:flex-end}
  /* ★756 手牌计数改成悬浮条右下角的小圆牌(竖排文字标签在悬浮条里很别扭) */
  .hand-lab{align-self:flex-end;margin:0 0 6px 14px;pointer-events:auto;
    min-width:26px;height:26px;padding:0 8px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;
    font-size:13px;font-weight:700;color:var(--tx);background:#0f172acc;border:1px solid var(--gold-dim)}
  .mull-note{font-size:12px;color:#7dd3fc !important;background:#0369a122;border-radius:8px;padding:6px 12px;display:inline-block}
  .mull-full{color:#fbbf24}
  .card{position:relative;border-radius:10px;overflow:hidden;background:#1e293b;box-shadow:0 3px 12px #000b;flex-shrink:0}
  .card img{width:100%;height:100%;object-fit:cover;display:block}
  .card.sz-hand{--cw:var(--hand-w);--ch:var(--hand-h);width:var(--cw);height:var(--ch);transition:transform .14s,box-shadow .14s}
  /* ★756 悬停放大改由 .hand-row > .card:hover 统一管(见底部悬浮手牌那块);
     这里只保留「可打出」的描边。打不出的牌压暗但仍可悬停看大图。 */
  /* ★757 可打出用 box-shadow 画光边,把 outline 这条通道整条让给
     选中/可指定目标/战报高亮(审查高危:0-3-0 的常亮描边把 0-2-0 的 .card.selected 金框压没了,
     调度界面点没点中根本看不出来,而调度不可撤销) */
  /* ★773 可打出:光【留着】(委托人拍板两边优点都要),但改成古铜金 —— 读起来像
     烛光打在烫金上,而不是 LED。同时给一点点抬起:实体对局里标记一张牌是把它推出来,
     光负责"看得见",抬起负责"像真的"。 */
  .card.sz-hand.clickable{box-shadow:0 0 0 1.5px #d0a04099,0 0 10px #d0a04033,var(--sh-card)}
  .card.sz-hand.clickable:hover{box-shadow:0 0 0 2px #e0b040,0 0 18px #d0a04055,var(--sh-lift)}
  /* ★768 打不出的手牌压得更明显(委托人:「当卡牌资源无法打出某些手牌的时候,
     这些手牌可以稍微给一个灰色的遮罩」)。原来只有一层压暗,扇形叠压之后几乎看不出差别 ——
     现在压暗 + 一层灰罩,一眼能分出「现在能打的」和「打不了的」。
     ⚠️ 悬停时把罩子撤掉:打不出的牌照样要能看清卡面(玩家常常就是想确认它为什么打不出)。 */
  /* ⚠️ 限定在 .hand-row 之内:压暗+灰罩说的是「这张现在打不出」,这句话只有【手牌】里成立。
     区域浏览器(废牌堆/放逐区)是公开区查看,把里面的卡也罩灰,牌手读到的是"这堆卡坏了"
     (委托人:点开废牌堆之后,这些卡牌不要有灰色遮罩,就正常显示)。 */
  .hand-row > .card.sz-hand:not(.clickable){filter:brightness(.55) saturate(.6)}
  .hand-row > .card.sz-hand:not(.clickable)::after{content:'';position:absolute;inset:0;z-index:3;
    pointer-events:none;border-radius:inherit;background:#0f172a66}
  .hand-row.fan > .card.sz-hand:not(.clickable):hover{filter:none}
  .hand-row.fan > .card.sz-hand:not(.clickable):hover::after{background:transparent}
  .card.sz-field{--cw:var(--field-w);--ch:var(--field-h);width:var(--cw);height:var(--ch);transition:outline-color .12s,transform .12s}
  /* ★757 牌垫(英雄/传奇/基地/符文/废牌堆)里的卡是周边信息,不该和战场单位一样大 —
     实测单边牌垫吃掉 242px,把战场和我方区一起挤爆。0-3-0 压过上面的 0-2-0。 */
  /* ★768 基地里的卡与基地区同高(委托人:「基地中打出的卡牌太小了,
     它可以和基地同样的高度,无论是横置还是竖置」)。
     基地行的高度本来就由传奇/英雄那一档撑着,所以基地里的单位取同一档,整行齐平。
     ⚠️ 横置的卡外框宽高互换(实体牌横过来就是变矮变宽),那是姿态不是尺寸问题。 */
  .side .card.sz-field{--cw:var(--hero-w);--ch:var(--hero-h)}
  .card.sz-field.clickable:hover{outline:2px solid #7dd3fc;outline-offset:1px}
  .card.sz-mini{--cw:var(--mini-w);--ch:var(--mini-h);width:var(--cw);height:var(--ch)}
  /* 抉择候选:可读大卡,悬停放大到全卡看清(委托人:点了直接确认,应能悬停看大图) */
  .card.sz-choice{width:100%;max-width:132px;aspect-ratio:132/184;height:auto}
  .choice-card:hover .card.sz-choice{outline:2px solid #7dd3fc;outline-offset:1px}
  .card.clickable{cursor:pointer;outline:1px solid #33415588}
  .card.selected{outline:3px solid #facc15;box-shadow:0 0 14px #facc1588}
  .card.back{background:repeating-linear-gradient(135deg,#1e1b4b,#1e1b4b 6px,#312e81 6px,#312e81 12px)}
  .back-swirl{display:flex;align-items:center;justify-content:center;height:100%;color:#818cf8;font-size:14px}
  /* 文字卡铺在底层(绝对定位),卡图盖在上面;图 404 时 onerror 撤掉 img 自然露出名字 */
  .txtcard{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:4px;text-align:center;font-size:11px;background:linear-gradient(160deg,#334155,#1e293b);color:#cbd5e1}
  .card img{position:relative;z-index:1}
  .might{position:absolute;right:2px;bottom:2px;background:#0f172aee;border:1px solid #64748b;border-radius:6px;padding:0 5px;font-size:13px;font-weight:700;color:#e2e8f0}
  .might.hurt{color:#fca5a5;border-color:#f87171}.might i{font-style:normal;font-size:10px;color:#f87171}
  .marks{position:absolute;left:2px;top:2px;font-size:12px;text-shadow:0 1px 2px #000}
  .corner{position:absolute;left:0;top:0;background:#facc15;color:#1c1917;font-size:9px;padding:0 4px;border-radius:0 0 6px 0;font-weight:700}
  .btn{background:linear-gradient(180deg,#5b4a2e,#3d3120);color:#f0e6d2;border:0;border-radius:7px;
    padding:7px 14px;font-size:13px;cursor:pointer;box-shadow:inset 0 1px 0 #ffffff14,var(--sh-flat, 0 1px 2px #00000066)}
  .btn:hover{background:linear-gradient(180deg,#6b5837,#493b27)}
  .btn.primary{background:linear-gradient(180deg,#c9993c,#8a6417);color:#1a1409;font-weight:700;
    box-shadow:inset 0 1px 0 #f0d68e88,inset 0 -2px 0 #5d420f}
  .btn.primary:hover{background:linear-gradient(180deg,#dcac48,#9a7220)}
  .btn:hover{filter:brightness(1.15)}
  .btn.attack{background:#b91c1c}.btn.pass{background:#a16207;font-size:15px;padding:9px 22px}
  .btn.end{background:#334155}.btn.ghost{background:#0000;border:1px solid #334155;color:#94a3b8}
  .btn.primary{background:#059669}.btn.big{font-size:16px;padding:10px 26px}
  /* ★756 dock 钉在视口底部一条:牌桌加了 padding-bottom 给悬浮手牌让位后,
     dock 若还留在流里会被顶出屏幕(实测 y=806 > 视口 720,「结束回合」直接点不到)。
     手牌悬浮条因此上移(bottom:44px),两者分层不重叠。 */
  /* ★758 dock 不再横贯屏幕底:横条会把扇形手牌的下半截整条挡掉(实测中间那张只剩 50% 可点),
     而它左边那串关键词图例并不值这个位置。改成【战报栏正下方】的浮岛 ——
     宽度与 .lograil 对齐(300px + 8px 边距),正好落在 .hand-wrap 的 right:316px 之外,
     于是底部中央完全让给手牌。窄屏(战报栏隐藏)时回落成居中浮岛。 */
  /* ★759 dock 收进【战报栏底部】,不再是浮在上面的岛。
     两次教训摞在一起:横贯底条会挡住扇形手牌(★758),300px 浮岛又装不下按钮
     (实测内容宽 349 > 可用 298,「结束回合」右缘溢出 50px 被切掉),而且它悬在战报栏上
     还会盖掉 90px 的战报。收进右栏当一节 = 三个问题一起没了:宽度自适应、不盖任何东西、
     底部中央整条继续留给手牌。
     两行:上行放图例与认输/退出这些低频项,下行让主按钮独占整宽 —— 它是每回合都要点的那颗。 */
  .dock{flex-shrink:0;box-sizing:border-box;
    display:flex;align-items:center;gap:6px;flex-wrap:wrap;
    padding:8px 10px;background:#111c31}
  .dock-row1{display:flex;align-items:center;gap:8px;width:100%}
  .dock-row1 .dock-mini{margin-left:auto;display:flex;gap:6px}
  .dock-mini .btn{font-size:11px;padding:3px 9px}
  .undo-off{font-style:normal;font-size:9px;opacity:.6;margin-left:3px}
  .dock-mini .btn[disabled]{opacity:.45;cursor:not-allowed}
  .legend-key{position:relative;font-size:11px;color:#94a3b8;white-space:nowrap;cursor:help;flex-shrink:0}
  .legend-key .legend-pop{display:none;position:absolute;left:0;bottom:calc(100% + 8px);z-index:5;
    width:max-content;max-width:280px;white-space:normal;line-height:1.9;
    background:#0f172af8;border:1px solid var(--line);border-radius:10px;padding:8px 10px;box-shadow:0 10px 30px #000c}
  .legend-key:hover .legend-pop,.legend-key:focus-visible .legend-pop{display:block}
  .legend-key b{color:#93c5fd;font-weight:600;cursor:help;border-bottom:1px dotted #93c5fd55}
  ${cardDetailStyles}
  ${fxStyles}
  .dock-btns{width:100%;display:flex;gap:8px;align-items:center}
  .dock-btns > *{flex:1 1 auto;min-width:0}
  /* 主按钮撑满这一行:min-width 交给 flex 管,别再写死 190px 顶出容器 */
  .dock-btns .bigbtn{min-width:0;width:100%;height:42px;font-size:15px}
  /* 检视面板:卡面全文 + 场上状态 + 此刻能做的动作,合成一个交互 */
  .inspect{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--bottom-band) + 10px);z-index:75;display:flex;gap:16px;align-items:flex-start;
    background:#0f172af8;border:1px solid #facc1555;border-radius:14px;padding:14px 16px;box-shadow:0 12px 40px #000d;max-width:min(94%,900px);max-height:62vh;overflow:auto}
  .ins-card{flex:1;min-width:0}
  .ins-acts{display:flex;flex-direction:column;gap:6px;width:210px;flex-shrink:0}
  .ins-acts .btn{text-align:left;white-space:normal;line-height:1.4}
  .ins-acts-t{font-size:11px;color:#facc15;letter-spacing:1px}
  .ins-none{font-size:12px;color:#64748b;max-width:150px}
  .ins-why{display:flex;flex-direction:column;gap:4px;background:#78350f28;border:1px solid #b4530955;border-radius:8px;padding:8px 10px;font-size:12px;color:#fbbf24}
  .ins-why b{color:#fde047}
  .ins-why span{color:#cbd5e1;line-height:1.5}
  .ins-cost{color:#fdba74 !important}
  .ins-close{align-self:flex-start}
  /* ── 官方分区牌垫的一侧:基地行 + 符文行(每个分区都有印在垫子上的标签) ── */
  /* ★757 牌垫改为可收缩(原 flex-shrink:0 死撑 258+213=471px,把战场区挤没了);
     内部 .mz-cards 自带 overflow-x,收缩不会丢内容 */
  /* ★759 一侧牌垫 = 左边两行(传奇/基地 + 符文/资源) + 右边一根跨两行的牌堆竖列。
     牌堆竖列独立出来的两个好处:主牌堆与废牌堆的"上下"关系表达出来了(委托人要的),
     而且它不再把所在行撑高(实测废牌堆曾把符文行从 77 撑到 100)。 */
  /* ★760 牌垫【按需、不被压】,战场吃剩余。
     ★757 那次是反的(牌垫 flex-shrink:0 死撑 471px 把战场挤没),于是改成了可收缩;
     但改完之后战场的 min-height 变成硬的,轮到牌垫被压 —— 实测我方两行需要 203px 只拿到 179,
     卡片直接叠在一起。两次都错在「谁该让位」没定死。
     现在定死:牌垫是刚性的(它的高度 = 卡尺寸,压了就是重叠),战场是弹性的
     (它的下限交给 .bf-lane 的 min-height,卡不会被裁,超出部分内部滚动)。
     ⚠️ 于是卡尺寸就成了唯一的空间闸 —— 调大卡片前先看布局面板里那行「战场保底」。 */
  /* ★790【委托人 2026-08-24】「英雄那一行那一整行,总共有英雄、传奇、基地、卡组这四个部件,
     跟下面的部件间隔稍微大一点点,现在太紧密了。」⇒ 行间距 2px → 9px(只动纵向,列间距不变)。 */
  .side{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px 6px;flex-shrink:0;min-height:0;
    align-content:start}
  .side .matrow{grid-column:1}
  /* ★774 牌堆列【顶对齐】,让主牌堆与同排的传奇卡中心线一致
     (委托人:「主牌堆高度……中心线也应该是一致的」)。
     原来是整列垂直居中,于是主牌堆的中心比传奇低了 21px(实测)—— 那正是「看着没对齐」的量。
     ⚠️ 对手侧是镜像:它的第一行是符文行,所以改成底对齐(见下面的 .side.opp 覆盖)。 */
  .side .pilecol{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:2px;
    align-items:center;justify-content:flex-start;
    padding:0;background:none}
  .side.opp .pilecol{justify-content:flex-end}
  .pilecol-small{display:flex;gap:6px;align-items:flex-end}
  /* 对手手牌背那一条也在第一列 */
  .side .opphand{grid-column:1}
  .side.opp{grid-template-rows:auto auto auto}
  .side.opp .pilecol{grid-row:1 / span 3}
  /* ★759 非对称:对手侧整体缩一档。
     实测 1280x720 只有 527px 分给「对手牌垫 + 战场 + 我方牌垫」,
     两侧对称的话各需 219px,战场只剩 89px —— 装不下两条车道(2x78+12=168)。
     取舍很清楚:你会细读自己的符文和牌堆,不会去细读对手的。
     所以对手侧只保留「认得出是谁、数得清有几张」的尺寸,省下的全给我方与战场。
     ⚠️ 这是变量覆盖,不是新写一套样式 —— 改尺寸仍然只改 .rb-shell 那三档。 */
  .side.opp{flex-direction:column;
    --hero-w:calc(var(--hero-w-base) * .66);--hero-h:calc(var(--hero-h-base) * .66);
    --rune-w:calc(var(--rune-w-base) * .72);--rune-h:calc(var(--rune-h-base) * .72)}
  /* ★775 符文行按【顶边】对齐:三个东西(放逐/符文堆/符文卡)现在同尺寸,
     顶对齐才在一条基线上;底部那两行说明是绝对定位的,不参与对齐。 */
  .matrow{display:flex;gap:5px;align-items:stretch}
  .matrow.rune{align-items:flex-start}
  .matzone{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:0;
    padding:1px 8px 2px;border-radius:10px;background:var(--sf1)}
  .mz-lab{position:absolute;top:1px;left:6px;z-index:3;pointer-events:none;
    font-size:8px;letter-spacing:.06em;color:var(--gold);white-space:nowrap;
    padding:0 4px;border-radius:3px;background:#020617cc}
  .mz-lab b{color:var(--tx);font-size:12px}.mz-lab span{color:var(--tx-dim)}
  .mz-cards{display:flex;gap:5px;align-items:center;overflow-x:auto;overflow-y:hidden;min-height:var(--mat-h)}
  /* ★759 符文区(委托人:那一行整体变高一点,不需要占满横向,只要 1/3;
     符文超过容器就堆叠摆放)。
     ⚠️ 堆叠量不写死:用 margin 的百分比是相对【父容器宽度】算的,于是
        margin-left: min(0px, (100% - n*卡宽) / (n-1))
     天然做到「装得下就平铺、装不下才按需重叠」,张数从 1 到 12 都不用改代码。 */
  /* ★768 符文区收窄一档,让它更早开始堆叠(委托人:「已经拥有的符文牌并没有堆叠摆放,
     所以现在占地面积很大」;「符文牌现在多了之后,会盖住右侧的已生产费用那一段文字」)。
     宽度封顶之后,rn-stack 的那条 min() 公式会自动把它们压成一叠。 */
  /* ★770 符文区:去掉底框、宽度真的跟着张数走(委托人:「还是有底框,且不是自适应的,
     三张符文的时候符文就盖过底框」)。
     ⚠️ 上一版用 clamp 定死了一个宽度区间 —— 张数少时框太宽、张数多时卡溢出框,两头不讨好。
        现在改成【由内容撑开】(fit-content),框永远正好包住那几张卡。 */
  /* ★775 符文区:一个框都不要(委托人:「召唤出来的符文卡牌,底部也不要有框了」),
     「多少张活跃」那行文字挪到**底部**、与第一张符文卡左对齐。
     ⚠️ 文字是【额外的、独立的】一层,不参与这块区域的尺寸计算(委托人明确要求)——
        所以用 order 把它排到最后,并且不给它任何背景/边框。 */
  .matrow.rune .runezone{flex:0 1 auto;width:fit-content;max-width:52%;min-width:0;
    background:none;border:0;padding:0;margin-left:64px;display:flex;flex-direction:column;gap:2px}
  .matrow.rune .runezone .mz-lab{order:2;position:static;background:none;padding:0;margin:4px 0 0;
    align-self:flex-start;font-size:10.5px;color:var(--tx-dim)}
  .matrow.rune .runezone .mz-cards{order:1}
  .matrow.rune .mz-cards{min-height:calc(var(--rune-h) + 6px);gap:0;overflow:visible}
  /* ⚠️ 公式里的每张实占宽必须算上边框:卡是 1px 边框且没有 border-box,
     offsetWidth = --rune-w + 2。漏掉这 2px,12 张就会溢出 20px(实测过)。
     min(4px, …) 让张数少时保留 4px 正常间距,多到装不下才转负重叠。 */
  /* ★774 堆叠要【数得清几张】(委托人:「召出的符文现在堆叠太紧密了,根本看不清几张」)。
     原来的公式只保证「不溢出容器」,张数一多就把露出宽度压到几像素。
     现在给一条下限:每张至少露出 --rune-peek(卡宽的 40%),宁可整叠横向溢出一点
     ——容器本来就是 overflow:visible,而「看得清」比「不越界」重要。 */
  .rn-stack > .card.sz-rune + .card.sz-rune{
    margin-left:max(
      calc(var(--rune-peek) - var(--rune-w)),
      min(4px, calc((100% - var(--n) * (var(--rune-w) + 2px)) / (var(--n) - 1)))
    )}
  /* 悬停把被压住的那张抬出来看全 */
  .rn-stack > .card.sz-rune:hover{transform:translateY(-4px) scale(1.06);z-index:5;
    box-shadow:0 8px 20px #000b}
  .mz-empty{color:var(--tx-dim);font-size:10px;font-style:normal}
  .matslot{position:relative;display:flex;flex-direction:column;gap:0;align-items:center;justify-content:flex-end;
    flex-shrink:0;padding:2px 5px 3px;border-radius:10px;background:var(--sf1)}
  .matslot.res{flex-direction:row;align-items:center;justify-content:center;gap:5px;
    background:none;border:0;padding:0 4px;flex-wrap:nowrap}
  /* ★768 「已产 / 可产」挪到符文牌堆正下方 —— 它讲的就是符文的事,放在符文堆脚下最合理,
     也不再会被越来越多的符文卡挤掉。 */
  .runedeck-slot{align-items:center}
  /* ★775 那两行「已产出」是【额外的、独立的】一层,**不占流**
     (委托人:「每个区域的大小不要看底部的文字描述部分,它应该是独立的、额外的区域」)。
     ⚠️ 它原来是流内元素,把符文堆整格往上顶了 —— 于是符文堆比旁边的放逐区高出一截,
        看起来就是「没对平」。改成绝对定位挂在牌堆下方之后,两个堆自然齐平。 */
  /* ⚠️ 这两行比符文堆那一格【宽得多】(「已产出符文数量:0」约 110px,格子只有 59px),
     绝对定位之后会横着盖到右边的符文区标签上 —— 实测撞了。
     所以给它单独一条基线:仍挂在符文堆下方,但符文区整体右移让出这段宽度(见 .runezone 的 margin)。 */
  .res-under{position:absolute;top:100%;left:0;margin-top:4px;z-index:2;
    display:flex;flex-direction:column;gap:2px;align-items:flex-start;white-space:nowrap}
  /* ★790 符文池小标题:比两行数字略暗一档,只做归属提示,不抢视线 */
  /* ★791【开发期 · 上线摘除】傀儡对手按钮:次级样式,不与房间码抢注意力 */
  .btn.dev-bot{margin-top:10px;background:transparent;border:1px dashed var(--bd);color:var(--tx-dim);
    font-size:12px;padding:6px 12px;letter-spacing:.02em}
  .btn.dev-bot:hover:not(:disabled){border-style:solid;color:var(--tx)}
  .btn.dev-bot:disabled{opacity:.5;cursor:default}
  /* ★810【委托人 2026-08-24 拍板】被施加标签的计数徽章:
     「卡图的画面部分,就是中间那一块,你用一个圆角矩形,或者是一个像是手机 APP 的角标一样,
       给一个数字一或者二,一就表示有一个标签,二就表示有两个,然后鼠标悬停会显示这两个标签都是什么。」
     ⇒ 定位在卡图画面中央偏上,不压住右下角的战力角标,也不压住左上的关键词方章。 */
  .tagbadge{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);z-index:4;
    min-width:16px;height:16px;padding:0;border-radius:5px;
    background:#f59e0bee;border:1px solid #fde68a;color:#1c1917;
    font-size:11px;font-weight:800;line-height:16px;text-align:center;
    box-shadow:0 1px 4px #0008;pointer-events:auto;cursor:help;
    /* ⚠️ 防拉伸:对手车道在窄屏下会被压成【高度 0】的容器(★790 记过的既有布局问题),
       那时 flex 会把徽章拉成一个 62×45 的大黄块糊在车道上(实测)。
       固定住宽高、禁止 flex 伸缩,0 高容器里它只是被裁掉,不会撑爆。 */
    flex:0 0 auto;box-sizing:border-box;max-width:22px;max-height:22px;overflow:hidden}
  /* ⚠️ 牌桌上的卡只有 39-60px 宽,战力角标钉在右下角 —— 徽章必须【缩小 + 上移】,
     否则会压住战力(实测 25×17 居中时 3/4 的卡都盖住了)。委托人要的是「画面中间那一块」,
     38% 仍在画面里、又给右下角让开位置。 */
  .card.sz-field .tagbadge{min-width:13px;height:13px;line-height:13px;font-size:9px;border-radius:4px}
  /* ⚠️ 横置/休眠的卡【不能】藏徽章 —— 它们照样可能带别的标签,而且「已横置」本身就是徽章要报的一项。
     (曾一时手滑写了 display:none,当场撤回。) */
  .res-title{font-size:10px;color:var(--tx-dim);opacity:.75;letter-spacing:.08em;line-height:1.6}
  .res-line{font-size:10.5px;color:var(--tx-dim);white-space:nowrap;line-height:1.5}
  .res-line b{color:var(--tx-soft);font-size:12px;margin-left:1px}
  .res-line.hot{color:var(--gold)}
  .res-line.hot b{color:var(--gold-hi)}
  .res-cols{display:inline-flex;gap:3px;margin-left:4px;vertical-align:middle}
  /* 两个牌堆只靠间隔分开,不各自套底色方块 */
  .matslot.bare{background:none;padding:0;position:relative;align-self:flex-start}
  .matrow.rune .matslot.bare + .matslot.bare{margin-left:10px}
  /* ★760 牌垫标签改成【叠在格子左上角】而不是占一行。
     每行为标签白付 13px,两行两侧就是 52px —— 那正好是「传奇放大」与「战场不滚动」
     之间差的那一口气。改完 hero 能留在 95px 且战场无需内部滚动(实测)。 */
  .ms-lab{position:absolute;top:1px;left:4px;z-index:3;pointer-events:none;
    font-size:8px;letter-spacing:.06em;color:var(--gold);white-space:nowrap;
    padding:0 3px;border-radius:3px;background:#020617cc}
  /* ★765 空位与卡【同尺寸】(委托人:英雄区打出英雄之后,英雄区不要缩小)。
     原来写死 45x62,英雄一上场那格就塌成小方块,整行跟着抖一下、
     旁边的传奇也跟着移位 —— 位置是玩家的肌肉记忆,不该因为区里有没有牌而变。 */
  .slot-empty{width:var(--hero-w);height:var(--hero-h);border-radius:10px;background:var(--sf3)}
  /* 对手手牌背 */
  .opphand{display:flex;gap:2px;align-items:center;min-height:20px}
  .opphand .cnt{margin-left:8px;font-size:11px;color:var(--tx-dim);letter-spacing:.06em}
  .opphand .cnt b{color:var(--tx);font-size:13px}
  /* 牌堆:真实卡背叠层(实体桌上这些就是一摞牌,不是文字标签) */
  /* ★765 牌堆尺寸不再是一组独立变量,而是【跟着它旁边那类卡走】(委托人:
     「主牌堆大小应该跟传奇卡一致,废牌堆大小也是」「符文堆高度跟符文区一致,
     放逐区和符文堆高度一致」)。
     少两个变量,也少一处会漂移的耦合 —— 牌堆本来就该看起来像"一摞那种牌"。
     大牌堆(主牌堆/废牌堆)= 传奇/英雄档;小牌堆(符文堆/放逐)= 符文档。 */
  .pile.big .pile-stack{width:var(--hero-w);height:var(--hero-h)}
  .pile:not(.big) .pile-stack{width:var(--rune-w);height:var(--rune-h)}
  /* ★774 大牌堆的【牌背本身】与传奇卡同高,且**中心线对齐**
     (委托人:「主牌堆高度,我是说牌背那个卡图的高度应该和传奇卡一致。中心线也应该是一致的」)。
     ⚠️ 光把 .pile-stack 设成 --hero-h 还不够:.pile 是 flex column、底下还挂着一行标签,
        标签把整块往上顶,于是牌背的中心比传奇卡高出半行 —— 看起来就是「没对齐」。
        解法:标签改成绝对定位压在牌背底部(不占流),这样 .pile 的高度就等于牌背高度,
        中心线自然与同排的传奇卡一致。
     ⚠️ 叠层的位移也收小:原来 3px/6px 是按小牌堆定的,放到传奇尺寸上显得散。 */
  .pile.big{height:var(--hero-h);justify-content:flex-start}
  .pile.big .pile-card{border-radius:8px;box-shadow:0 2px 8px #0009}
  .pile.big .pile-card.l2{transform:translate(2px,-2px);opacity:.72}
  .pile.big .pile-card.l3{transform:translate(4px,-4px);opacity:.48}
  .pile-big-n{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;
    font-size:20px;font-weight:700;color:#fff;text-shadow:0 2px 6px #000,0 0 14px #000c;pointer-events:none}
  .pile.big.empty .pile-slot{width:var(--hero-w);height:var(--hero-h);border-radius:7px;
    border:1px dashed var(--line);background:#00000022}
  .pile.big.danger .pile-big-n{color:#fca5a5}
  .pile.big{position:relative}
  /* ★775 标签压在牌背底部、**不占流** —— 委托人:「每个区域的大小不要看底部的文字描述部分,
     它应该是独立的、额外的区域」。这样牌堆的高度就等于牌背高度,同排的东西才对得齐。 */
  .pile.big .pile-lab{position:absolute;left:50%;bottom:2px;transform:translateX(-50%);z-index:3;
    font-size:8px;margin:0;line-height:1.3;padding:0 4px;border-radius:3px;background:#14110dcc;
    color:var(--tx-dim);white-space:nowrap}
  .matgap{flex:1 1 auto;min-width:0}
  /* 传奇与英雄:全局各一张、整局都在看 —— 自己一档尺寸 */
  .card.sz-hero{--cw:var(--hero-w);--ch:var(--hero-h);width:var(--cw);height:var(--ch);
    transition:outline-color .12s,transform .12s}
  .card.sz-hero:hover{transform:translateY(-3px) scale(1.04);z-index:3;box-shadow:0 10px 26px #000b}
  .pile{display:flex;flex-direction:column;align-items:center;gap:2px;position:relative}
  .pile[data-zone]{cursor:pointer}
  .pile-stack{position:relative;width:22px;height:31px}
  .pile-card{position:absolute;inset:0;border-radius:4px;box-shadow:2px 2px 0 #00000055,4px 4px 0 #00000033}
  .pile-card.back{background:repeating-linear-gradient(135deg,#1e2f5c,#1e2f5c 3px,#2a3f74 3px,#2a3f74 6px);border:1px solid #4a6299}
  /* ★766 卡面朝上:铺最上面那张的缩略图。没图(或还没有牌)时退回一层素底,不再是纯空方块 */
  .pile-card.face{background:#1e293b;border:1px solid #ffffff26;overflow:hidden}
  .pile-card.face img{width:100%;height:100%;object-fit:cover;display:block}
  .pile-slot{position:absolute;inset:0;border-radius:4px;border:1px dashed var(--line);background:#0000001f}
  .pile-lab{font-size:9px;color:var(--tx-dim);letter-spacing:.06em;white-space:nowrap}
  .pile-n{font-size:12px;color:var(--tx);line-height:1}
  .pile.empty .pile-n{color:var(--tx-dim)}
  .pile.danger .pile-card.back{border-color:var(--bad);box-shadow:0 0 10px #f8717166,2px 2px 0 #00000055}
  .pile.danger .pile-n{color:var(--bad)}
  .pile[data-zone]:hover .pile-card{transform:translateY(-2px)}
  /* 席位信息条:牌堆区 + 自己的资源 */
  .seatstrip{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-left:auto}
  .chip{font-size:11px;color:var(--tx-dim);background:#00000033;border:1px solid var(--line);border-radius:99px;padding:3px 10px}
  .chip b{color:var(--tx);font-size:13px}
  .chip.zonelink{cursor:pointer}.chip.zonelink:hover{border-color:#38bdf888;color:#cbd5e1}
  .chip.danger{border-color:#f8717188;color:#fca5a5;background:#7f1d1d33}
  .chip.mana-chip b{color:var(--gold);font-size:15px}
  .chip.pool-chip{border-color:#fbbf2455;color:#fbbf24}.chip.pool-chip b{color:#fde047}
  .pip{display:inline-block;margin-left:3px;padding:0 5px;border-radius:5px;color:#0b1120;background:var(--dc);font-size:11px}
  .zone-grid{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-height:56vh;overflow:auto;padding:6px 0 12px}
  /* 关键词单字方章(60px 的卡上 emoji 认不出) */
  .kwrow{position:absolute;right:2px;top:2px;display:flex;flex-direction:column;gap:2px}
  .kwchip{font-size:9px;line-height:1.25;background:#1e3a5fdd;color:#93c5fd;border-radius:3px;padding:0 3px;cursor:help}
  /* 状态用姿态:横置转 90°、休眠倾斜、眩晕斜纹。⚠️ 眩晕【不划掉战力数字】——
     §423.1.c 击杀眩晕单位仍需其全部战力的致命伤害,划掉会让牌手少分伤害 */
  /* 横置(§164.2.a 产法力 / §145 技能费)与休眠(§414.1.a「旋转90度…横置于你面前」):
     两者的实体表达都是躺倒 90°。外框宽高互换 + 内容旋转——只转 transform 不换外框的话,
     旋转后的牌会压住旁边的牌;实体桌上横置是【占横向位置】的。委托人四测:"没有横置的表现"=休眠没躺倒。 */
  /* ⚠️ 躺倒这一档【依赖 --cw/--ch】,所以只能给定尺寸的档位用(sz-hand/field/mini/rune/hero 都定义了)。
     抉择候选 sz-choice 是【等分自适应】档(width:100%+aspect-ratio),没有这两个变量 ⇒
     width:var(--ch) 整条失效退回 auto,而下一条又把它的子元素全改成 absolute(没有在流内容了)
     ⇒ 收缩包裹算出 0 宽、aspect-ratio 再把高算成 0 ⇒ 整张候选卡塌成 0×0,只剩下面那行卡名。
     这正是"从待命翻开爆裂球果、选休眠单位时四个候选全没卡图"的真因(实测 getBoundingClientRect 0×0)。
     候选列表要的是【看清是哪张牌】、且四张必须等高对齐,不是复刻横置姿态 ⇒ 这一档不换外框不旋转,
     状态照旧由 ::after 角标('横置'/'休眠')与压暗滤镜表达。 */
  /* ★901「横置绕中心」真因:★777 给 .bf-lane .card.sz-field 的 max-height:100% 在矮车道里
     把互换外框(宽--ch 高--cw)压塌,而内容尺寸固定 ⇒ 溢出外框、旋转中心失锚(视觉=贴底/压线)。
     两版等比缩方案(aspect-ratio / container 查询)都被 flex 与 containment 的交互搞脏了实测值
     ⇒ 收束为最小修:**横置/休眠档不吃车道压缩**(下一条豁免)——它躺倒后高只有 --cw(84),
     本来就比竖卡(117)矮 28%,矮车道装它绰绰有余;外框恒定,旋转中心天然恒为中心。 */
  .card.is-tapped:not(.sz-choice),.card.is-dormant:not(.sz-choice){width:var(--ch);height:var(--cw);flex-shrink:0}
  .bf-lane .card.sz-field.is-tapped,.bf-lane .card.sz-field.is-dormant{max-height:none}
  .card.is-tapped:not(.sz-choice) > *,.card.is-dormant:not(.sz-choice) > *{position:absolute;left:50%;top:50%;width:var(--cw);height:var(--ch);
    transform:translate(-50%,-50%) rotate(90deg);transform-origin:center;transition:transform .18s}
  .card.is-tapped::after,.card.is-dormant::after{position:absolute;right:2px;bottom:1px;z-index:5;
    font-size:8px;color:#0b1a3d;background:var(--gold);border-radius:3px;padding:0 3px;letter-spacing:.04em}
  .card.is-tapped::after{content:'横置'}
  .card.is-dormant::after{content:'休眠'}
  .card.is-dormant{filter:brightness(.78) saturate(.85)}
  .card.is-stunned::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;
    background:repeating-linear-gradient(45deg,#a78bfa22,#a78bfa22 5px,#0000 5px,#0000 10px);outline:1px solid #a78bfa88}
  .bf-lock{font-size:10px;color:#fbbf24;background:#78350f44;border-radius:99px;padding:1px 7px}
  .bf-flag{font-size:10px;border-radius:99px;padding:1px 8px;cursor:help}
  .bf-flag.mine{color:#86efac;background:#14532d55;border:1px solid #4ade8055}
  .bf-flag.foe{color:#fca5a5;background:#7f1d1d55;border:1px solid #f8717155}
  .bf-flag.none{color:#94a3b8;background:#33415544;border:1px solid #47556955}
  .bf.bf-mine{border-color:#4ade8044}
  .bf.bf-foe{border-color:#f8717144}
  .lastpoint{font-size:11px;color:#fbbf24;background:#78350f33;border:1px solid #b4530955;border-radius:8px;padding:2px 10px;cursor:help;max-width:44%}
  .lastpoint.ok{color:#86efac;background:#14532d33;border-color:#4ade8055}
  .lastpoint b{color:#fde047}
  .warn-dot{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;
    background:#fbbf24;color:#1c1917;font-size:10px;font-weight:700;font-style:normal;margin-left:5px}
  .bf-name{cursor:pointer}.bf-name:hover{color:#86efac}
  /* 安全居中:panel 用 margin:auto 而不是 align-items:center——内容比视口高时后者会把顶部推到不可达区,前者配 overflow:auto 可滚到每个角落 */
  /* ★757 层级重排(审查高危):原来 overlay(50) < 手牌(60) < dock(70),
     调度/结算/等对手这些模态弹层被底部两条浮层压住 —— 弹层开着还能点底下的手牌,
     同一副手牌出现两个入口。现在 弹层(80/90) > dock(70) > 手牌(60)。 */
  .overlay{position:absolute;inset:0;background:#070b14cc;display:flex;z-index:80;border-radius:14px;overflow:auto;padding:12px}
  .overlay.soft{background:#070b1466;pointer-events:none}
  /* 弹层开着时底部浮层一律收起(审查:调度屏同一副手牌显示两遍,浮层那份点了没反馈) */
  .rb-shell:has(.overlay:not(.soft)) .chainov,
  .rb-shell:has(.overlay:not(.soft)) .hand-wrap{display:none}
  /* ★759 dock 已收进战报栏、不再压任何东西 ⇒ 弹层期间不必收起(收了反而看不到"轮到谁") */
  .overlay.top{z-index:90}
  /* 区域浏览器开着时:检视面板(75)与悬停大图(70)本来都压在遮罩(80)底下 ——
     表现就是"点废牌堆里的卡没反应"。只抬这一档,调度/抉择/结算那几个弹层原样不动。 */
  .table:has(.overlay.zonebrowse) .inspect{z-index:85}
  .table:has(.overlay.zonebrowse) .hovbig{z-index:95}
  .zb-hint{margin:0 0 6px;text-align:center;font-size:12px;color:#7dd3fc}
  .panel{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:22px 28px;text-align:center;max-width:90%;margin:auto}
  .panel.wide{width:720px}
  .panel h2{margin:0 0 10px;font-size:19px;color:#e2e8f0}
  .panel p{color:#94a3b8;margin:0 0 14px}
  .choice-list{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto}
  /* 卡牌候选:单行不换行、按钮等分收缩——行高有界,页脚永远排在卡下面(此前 50vh 上限+溢出可见,页脚会叠在第三张卡上,点卡实际点到"退出房间") */
  .choice-list.cards{flex-direction:row;flex-wrap:nowrap;justify-content:center;gap:14px;overflow:visible;max-height:none;padding:18px 6px 6px}
  .choice-list.cards .choice-card{flex:1 1 0;min-width:0;max-width:132px}
  .choice-item{display:flex;align-items:center;gap:10px;text-align:left}
  .choice-cardtext{margin:6px 0 10px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;
    background:#0b1a3d55;font-size:12px;line-height:1.7;color:#cbd5e1;white-space:pre-wrap}
  .choice-cardtext .cct-name{display:block;font-size:11px;color:var(--gold);margin-bottom:3px;letter-spacing:.05em}
  .choice-hint{color:#7dd3fc !important;font-size:12px}
  .choice-card{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;cursor:pointer;padding:0;font:inherit}
  /* ★784 区域类候选(选战场/选基地):战场按战场卡的横版卡图渲染,与牌桌上那张对得上 */
  .choice-zone .cz-img{width:132px;height:80px;object-fit:cover;border-radius:9px;
    border:1px solid var(--line-hi);box-shadow:var(--sh-card)}
  .choice-zone .cz-noimg{width:132px;height:80px;display:flex;align-items:center;justify-content:center;
    border-radius:9px;border:1px dashed var(--line-hi);color:var(--tx-dim);font-size:22px}
  .choice-zone:hover .cz-img,.choice-zone:hover .cz-noimg{border-color:var(--gold);box-shadow:var(--sh-lift)}
  .choice-card .cc-name{font-size:12px;color:#cbd5e1}
  .choice-card:hover .cc-name{color:#7dd3fc}
  .toast{position:absolute;left:50%;transform:translateX(-50%);top:56px;z-index:60;background:#0f172af0;border:1px solid #6366f199;color:#c7d2fe;padding:6px 16px;border-radius:99px;font-size:13px;box-shadow:0 4px 16px #0008}
  .ov-foot{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid #1e293b}
  .ov-code b{font-size:18px;letter-spacing:4px;color:#7dd3fc;cursor:pointer}
  .ov-hint{width:100%;font-size:12px;color:#94a3b8}
  .big-code{font-size:48px;letter-spacing:12px;font-weight:700;color:#7dd3fc;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:14px 10px;margin:8px 0;cursor:pointer;user-select:all}
  .big-code:hover{background:#1e293b}
  .topbar .room b{cursor:pointer}
  /* ★770 比分与回合居中(委托人:「关于得分第几回合,在画面顶部居中」)。
     房间码留在左边、状态提示留在右边,中间这一坨是对局里唯一需要随时扫一眼的信息。 */
  .topmid{position:absolute;left:50%;transform:translateX(-50%);
    display:flex;align-items:center;gap:14px;pointer-events:none}
  .topmid > *{pointer-events:auto}
  .topbar{position:relative}
  /* 窄窗兜底:战报栏是 272px 固定宽,窗口太窄时会把牌桌挤出去。逐档收窄、极窄直接藏。 */
  @media (max-width: 900px){ .rb-shell{--rail-w:200px} }
  /* ★759 窄屏藏战报栏时,dock 是跟着一起藏的 —— 那就没有「结束回合」了。
     把它单独拎回屏幕底部横条(此档手牌条的 right 已回到 8px,两者靠 z-index 分层)。 */
  @media (max-width: 680px){
    /* ★760 战报栏真正消失是在这一档(不是 1100)——手牌的右边界到这里才该回到 8px */
    .hand-wrap{right:8px}
    .rb-row > .lograil{display:none;}
    .rb-row > .lograil:has(.dock){display:flex;width:auto;position:fixed;left:8px;right:8px;bottom:8px;
      background:transparent;border:none;z-index:70}
    .rb-row > .lograil:has(.dock) .lg-head,
    .rb-row > .lograil:has(.dock) .lg-body{display:none}
    .rb-row > .lograil:has(.dock) .dock{border-radius:12px;border:1px solid var(--line);
      background:linear-gradient(180deg,#0b1120f0,#020617fa);box-shadow:0 10px 30px #000a}
  }
  @media (max-width: 1100px){
    .bfs{grid-template-columns:1fr}
    .hovbig{width:min(360px,86vw)}
    /* ★757 ⚠️ 必须写成一条:原来这里 padding-bottom 在前、padding 简写在后,
       简写把单边值整个抹掉(与 ★752 的 .drag-ghost 同款层叠事故)。
       以后改这个元素的任何一边,都在这一条里改。 */
    .table{padding:8px 8px calc(var(--bottom-band) + 6px)}
    .hand-wrap{padding-top:26px}
    .legend-key{display:none} /* 窄屏优先保按钮可点 */
    .topbar{flex-wrap:wrap;gap:8px}
    .st{margin-left:0}
    .panel.wide{width:94vw}
  }

  /* ══════════════════════════════════════════════════════════════════════
     ★752 拖拽出牌 —— ⚠️这一整块必须留在 boardStyles 的【最末尾】。
     原来它写在 :1273(即 .card{position:relative} 之前),两者特异度同为 0-1-0,
     后写的赢 ⇒ 幽灵卡实际拿到 position:relative,被排进文档流、掉到首屏下方
     约 250px 处,人眼看不见 —— 表现就是「拖动时卡不跟手」。层叠顺序即正确性,
     以后往 boardStyles 加样式一律加在这一块【之前】。
     ══════════════════════════════════════════════════════════════════════ */
  .card[data-card]{touch-action:none;-webkit-user-drag:none}
  .card[data-card].clickable{cursor:grab}
  body.rb-dragging,body.rb-dragging .card{cursor:grabbing}

  /* 幽灵卡:全场唯一跟手的元素。位置只驱动 --gx/--gy(合成层,不触发布局) */
  .card.drag-ghost{
    position:fixed !important;left:0 !important;top:0 !important;margin:0 !important;
    width:var(--ghost-w,86px) !important;height:var(--ghost-h,120px) !important;
    transform:translate3d(var(--gx,-999px),var(--gy,-999px),0)
              translate(-50%,-56%) rotate(var(--gtilt,4deg)) scale(1.06) !important;
    transition:none !important;pointer-events:none !important;
    z-index:300;border-radius:10px;overflow:hidden;
    box-shadow:0 26px 54px #000e,0 0 0 1px #7dd3fc66 !important;
    filter:none !important;opacity:1 !important;will-change:transform;
  }
  .card.drag-ghost img{width:100%;height:100%;object-fit:cover;display:block}
  .card.drag-ghost.no-target{filter:saturate(.4) brightness(.78) !important;
    box-shadow:0 26px 54px #000e,0 0 0 2px #f8717199 !important}
  .card.drag-ghost.denied{filter:grayscale(.85) brightness(.68) !important;
    box-shadow:0 26px 54px #000e,0 0 0 2px #f87171 !important}
  .card.drag-ghost.returning{
    transition:transform .19s cubic-bezier(.2,.75,.3,1),opacity .19s ease-out !important;
    opacity:.1 !important}

  /* 源卡:留个半透明的坑,别让手牌塌陷跳位 */
  .card.drag-src{opacity:.26 !important;filter:grayscale(.45) !important}

  /* 落点高亮:卡当落点时要压过 .card.clickable/.targetable/.selected */
  .droppable{outline:2px dashed #34d399cc;outline-offset:2px;border-radius:10px}
  .card.droppable{outline:2px dashed #34d399cc !important;outline-offset:2px;
    box-shadow:0 0 14px #34d39977 !important}
  .drop-hot{outline:3px solid #34d399;outline-offset:2px}
  .card.drop-hot{outline:3px solid #34d399 !important;outline-offset:2px;
    animation:dropPulse .85s ease-in-out infinite}
  .bf.drop-hot,.matzone.drop-hot{background-color:#34d3991f !important}
  @keyframes dropPulse{0%,100%{box-shadow:0 0 16px #34d39999}50%{box-shadow:0 0 32px #34d399ee}}

  /* 拖拽中:非落点整体压暗,让绿框跳出来 */
  /* ★776 拖法术时【整屏不再变暗】(委托人明确要求)。
     压暗原本是为了指出「哪儿能放」,但法术现在拖到哪都能松手 —— 压暗就成了纯粹的干扰。
     ⚠️ 只在【落点不是整张牌桌】时才压暗:拖单位/装备仍然需要"这儿能放那儿不能"的提示。
        判据用 .table 自己有没有被标成落点。 */
  body.rb-dragging:not(:has(.table.droppable)) .card:not(.droppable):not(.drag-ghost):not(.drag-src){
    filter:brightness(.6) saturate(.5);transition:filter .12s}
  body.rb-dragging:not(:has(.table.droppable)) .bf:not(.droppable),
  body.rb-dragging:not(:has(.table.droppable)) .matzone:not(.droppable){
    filter:brightness(.72);transition:filter .12s}
`
