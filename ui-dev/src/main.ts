                                             
                                                         
import { GameSession, type SessionAction } from '../../engine/src/session/gameSession'
import { InteractiveGame, type InteractiveAction } from '../../engine/src/session/interactiveGame'
import { vegasReactionDemo, discardCounterDemo, seizeReflectDemo, servitorCopyDemo, militaristCombatDemo } from '../../engine/data/demoScenes'
import { activeTriggers, handPlaySpecs } from '../../engine/data/registry'
import type { GameState } from '../../engine/src/state/gameState'
import type { PlayerId } from '../../engine/src/state/ids'
import type { ClientView, ProjectedObject } from '../../engine/src/net/project'
import { startOnline, DEV } from './online'
import { cardName, renderCardText } from './cards'
import { renderDeckBuilder } from './deckBuilder'
import { setupGame, type Deck } from '../../engine/src/game/setup'
import { specLookup } from '../../engine/data/decks'
import { makeRng } from '../../engine/src/util/rng'

const app = document.getElementById('app')!
type IGMode = 'vegas' | 'discard' | 'seize' | 'servitor' | 'militarist'
                                                            
type BuiltMode = 'mydeck'
type Mode = IGMode | BuiltMode | 'blank' | 'online' | 'builder'
const IG_DEPS = { getTriggers: activeTriggers, handPlaySpecs }
const SCENES: Record<IGMode, () => GameState> = { vegas: vegasReactionDemo, discard: discardCounterDemo, seize: seizeReflectDemo, servitor: servitorCopyDemo, militarist: militaristCombatDemo }
                                                     
let mode: Mode = DEV ? 'vegas' : 'online'
let session = new GameSession()
let ig = new InteractiveGame(vegasReactionDemo(), IG_DEPS)
const log: string[] = []

                                                     
function nm(defId?: string): string { return defId ? cardName(defId) : '' }
function bfLabel(id: string): string {
                                                             
                                                        
  const n = Number(id.split(':').pop())
  if (Number.isFinite(n)) return `战场 ${n + 1}`
  return id.startsWith('base:') ? '基地' : id
}

function unitChip(view: ClientView, oid: string): string {
  const o = view.objects[oid] as ProjectedObject | undefined
  if (!o || o.hidden) return `<span class="hidden-card" title="面朝下/不可见"></span>`
  const cls = o.controller === 'P1' ? 'u-p1' : 'u-p2'
  const dmg = o.damage ? ` <small>(${o.damage}伤)</small>` : ''
  const kw = (o.keywords ?? []).length ? ` <small>[${(o.keywords ?? []).join(' ')}]</small>` : ''
  const badges = [
    o.stunned ? '<span class="badge stun">眩晕</span>' : '',
    (o.restrictions ?? []).some((r) => r === 'move' || r.startsWith('moveBy:')) ? '<span class="badge nomove">禁移动</span>' : '', // ★902 含指名限制
  ].join('')
  return `<span class="unit ${cls}" title="${o.oid}">${o.controller}·${nm(o.defId)} ${o.might}⚔${dmg}${kw}${badges}</span>`
}

function modeBar(): string {
  const b = (m: Mode, label: string) => `<button class="${mode === m ? '' : 'sec'}" data-mode="${m}">${label}</button>`
  return `<div class="actions" style="margin-bottom:8px">${b('online', '🌐 熟人房联机')} ${b('vegas', '真卡·薇古丝')} ${b('discard', '真卡·遗弃反制')} ${b('seize', '真卡·灵魂折镜')} ${b('servitor', '真卡·赐面守侍')} ${b('militarist', '真卡·军事家(战斗)')} ${b('blank', '白板对拼')} ${b('builder', '🃏 卡组构建器')}</div>`
}

function boardHtml(view: ClientView): string {
  return Object.values(view.zones).filter((z) => z.kind === 'battlefield')
    .map((z) => `<div class="bf"><h3>${bfLabel(z.id)}</h3>${z.contents.map((o) => unitChip(view, o)).join('') || '<small style="color:#aaa">空</small>'}</div>`)
    .join('')
}

                                                               
function blankActionLabel(a: SessionAction): string {
  switch (a.kind) {
    case 'PLAY_UNIT': return `打出 → ${bfLabel(a.to)}`
    case 'MOVE_UNIT': return `游走 → ${bfLabel(a.to)}`
    case 'ATTACK': return `⚔ 进攻 ${bfLabel(a.battlefield)}`
    case 'END_TURN': return '结束回合 ▶'
  }
}
function renderBlank(): void {
  const active = session.state.activePlayer as PlayerId
  const view = session.view(active)
  const acts = session.legalActions(active)
  const winBanner = view.winner ? `<div class="win">🏆 ${view.winner} 赢得对局!</div>` : ''
  const activeHand = (view.zones[`hand:${active}`]?.contents ?? []).map((o) => unitChip(view, o)).join('') || '<small style="color:#aaa">无</small>'
  const actIndex: SessionAction[] = []
  const btn = (a: SessionAction, sec = false) => `<button class="${sec ? 'sec' : ''}" data-act="${actIndex.push(a) - 1}">${blankActionLabel(a)}</button>`
  const play = acts.filter((a) => a.kind === 'PLAY_UNIT') as Extract<SessionAction, { kind: 'PLAY_UNIT' }>[]
  const handOids = [...new Set(play.map((a) => a.oid))]
  const playRows = handOids.map((oid) => `<div>打出 ${unitChip(view, oid)} → ${play.filter((a) => a.oid === oid).map((a) => btn(a, true)).join(' ')}</div>`).join('')
  const moveRow = acts.filter((a) => a.kind === 'MOVE_UNIT').slice(0, 12).map((a) => btn(a, true)).join(' ')
  const attackRow = acts.filter((a) => a.kind === 'ATTACK').map((a) => btn(a)).join(' ')
  const endRow = acts.filter((a) => a.kind === 'END_TURN').map((a) => btn(a)).join(' ')
  app.innerHTML = `
    <h1>符文战场 · 开发者UI</h1>${modeBar()}
    <div class="sub">白板对拼 · 引擎跑客户端,走 project 脱敏 + 合法动作白名单</div>${winBanner}
    <div class="bar"><span>回合 <b>${view.activePlayer}</b></span><span>阶段 <b>${view.phase}</b></span><span>优先权 <b>${view.priority ?? '—'}</b></span><span>比分 <b>P1 ${view.scores['P1'] ?? 0}</b>:<b>P2 ${view.scores['P2'] ?? 0}</b></span></div>
    <div class="board">${boardHtml(view)}</div>
    <div class="hand"><b>你的手牌(${active})</b>:${activeHand}</div>
    <div class="actions-wrap"><div style="margin:8px 0 4px;color:#888;font-size:12px">合法动作(${active}):</div>${playRows}<div>${moveRow}</div><div>${attackRow}</div><div class="actions">${endRow} <button class="sec" id="reset">重开</button></div></div>
    <div class="log">${log.slice(-8).join('\n')}</div>`
  app.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((b) => {
    b.onclick = () => { const a = actIndex[Number(b.dataset.act)]!; log.push(`${session.state.activePlayer} ${blankActionLabel(a)}`); session.apply(a); render() }
  })
  wireCommon(() => { session = new GameSession(); log.length = 0 })
}

                                                                        
function targetLabel(t: string | undefined, view: ClientView): string {
  if (!t) return ''
  if (t.startsWith('play:')) return ' →〔链上法术〕'
  const o = view.objects[t]
  return o ? ` → ${nm(o.defId)}` : ` → ${t}`
}
function igActionLabel(a: InteractiveAction, view: ClientView, req?: { candidates: readonly { id: string; label: string }[] }): string {
  switch (a.kind) {
    case 'CONCEDE': return '🏳 认输'
    case 'PLAY_UNIT': return `打出单位 → ${bfLabel(a.to)}`
    case 'PLAY_CARD': { const o = view.objects[a.cardOid]; return `打出 ${nm(o?.defId)}${targetLabel(a.target, view)}` }
    case 'ATTACK': return `⚔ 发起战斗 ${bfLabel(a.battlefield)}`
    case 'CHOOSE': return req?.candidates.find((c) => c.id === a.answer)?.label ?? a.answer
    case 'PASS': return '让过(不反应)▶'
    case 'END_TURN': return '结束回合 ▶'
    case 'MOVE': return `➡ 移动(变休眠)`
                                                          
    case 'MOVE_GROUP': return `➡ 一起移动 ${a.oids.length} 名单位(变休眠)`
    case 'MULLIGAN': return a.put.length === 0 ? '✋ 全部保留' : `♻ 换掉 ${a.put.map((o) => nm(view.objects[o]?.defId)).join('+')}`
    case 'PLACE_STANDBY': return `🫥 盖着放(待命) ${nm(view.objects[a.oid]?.defId)} → ${bfLabel(a.battlefield)} · ${a.free ? '免费' : a.alt ? '改付 1 法力' : '付 1 点任意符能'}`
    case 'PLAY_STANDBY': return `⚡ 翻开打出(0 费) ${nm(view.objects[a.oid]?.defId)}${a.target ? ` → ${nm(view.objects[a.target]?.defId)}` : ''}`
    case 'ACTIVATE': return `🔧 ${nm(view.objects[a.oid]?.defId)}·${a.ability}${a.target ? ` → ${view.objects[a.target] ? nm(view.objects[a.target]?.defId) : a.target}` : ''}${a.discardOid ? `(弃${nm(view.objects[a.discardOid]?.defId)})` : ''}`
  }
}
const SUB: Record<IGMode | BuiltMode, string> = {
  mydeck: '', // ⚠️ 运行时由 startFromDecks 按实际对阵填(见 mydeckSub);写死会像第83/89轮那样描述一个不存在的局面
  vegas: '真卡·薇古丝(UNL-150):对手打出单位→眩晕该单位+本回合不可移动。每个反应窗口都停下问。',
  discard: '真卡·遗弃(UNL-131 反应):无效化一个法术并返回其拥有者手牌+洞察。P1 灼击 P2 单位 → P2 可用遗弃反制。',
  seize: '真卡·灵魂折镜(VEN-152 反应):选法力费≤4的法术,付[A]夺控并重选其目标,否则无效化。P1 灼击 → P2 可夺控改打 P1 自己。',
  servitor: '真卡·赐面守侍(UNL-081):打出→打2映像→"进行一次:它们变复制体"(独立内嵌触发,经反应窗口)→映像变1[M]待命瞬息复制体。',
  militarist: '真卡·军事家(OGN-121 战斗):P2发起战斗→军事家(P1防守)防守触发→反应窗口→结算时选此处敌方单位集火(顶5每张待命1伤)。',
}
function renderIG(): void {
  const p = ig.pending()
  const decider = (p.mode === 'gameover' ? 'P1' : p.player) as PlayerId
  const view = ig.view(decider)
  const acts = ig.legalActions(decider)
  const req = p.mode === 'choice' ? p.request : undefined
  const actIndex: InteractiveAction[] = []
                                                                          
                                           
  const btn = (a: InteractiveAction, sec = false) => `<button class="${sec ? 'sec' : ''}" data-act="${actIndex.push(a) - 1}">${renderCardText(igActionLabel(a, view, req))}</button>`

  let banner = ''
  if (p.mode === 'window') banner = `<div class="win" style="background:#fde68a;color:#78350f">⚡ 反应窗口 · 结算链上有 ${p.chainDepth} 项 · 轮到 <b>${p.player}</b> 让过或打反应</div>`
  else if (p.mode === 'choice') banner = `<div class="win" style="background:#c7d2fe;color:#3730a3">◆ 结算期选择 · <b>${p.player}</b>:${renderCardText(p.request.prompt)}</div>`
  else if (p.mode === 'action') banner = `<div class="sub">行动阶段 · 回合玩家 <b>${p.player}</b></div>`
  else if (p.mode === 'mulligan') banner = `<div class="win" style="background:#bbf7d0;color:#14532d">♻ 手牌调度(§117)· 轮到 <b>${p.player}</b></div>`
  else banner = `<div class="win">🏆 ${p.winner} 胜</div>`

  const chooseRow = acts.filter((a) => a.kind === 'CHOOSE').map((a) => btn(a)).join(' ')
  const playRows = (acts.filter((a) => a.kind === 'PLAY_UNIT' || a.kind === 'PLAY_CARD'))
    .map((a) => `<div>${btn(a, true)}</div>`).join('')
  const attackRow = acts.filter((a) => a.kind === 'ATTACK').map((a) => btn(a)).join(' ')
  const passRow = acts.filter((a) => a.kind === 'PASS' || a.kind === 'MULLIGAN' || a.kind === 'PLACE_STANDBY' || a.kind === 'PLAY_STANDBY' || a.kind === 'ACTIVATE').map((a) => btn(a, a.kind !== 'PASS')).join(' ')
  const endRow = acts.filter((a) => a.kind === 'END_TURN').map((a) => btn(a)).join(' ')
  const hand = (view.zones[`hand:${decider}`]?.contents ?? []).map((o) => unitChip(view, o)).join('') || '<small style="color:#aaa">无</small>'
  const chainRow = view.zones['chain:shared']?.contents?.length
    ? `<div class="hand"><b>结算链</b>:${(view.zones['chain:shared']!.contents).map((o) => unitChip(view, o)).join(' ')}</div>` : ''

  app.innerHTML = `
    <h1>符文战场 · 开发者UI</h1>${modeBar()}
    <div class="sub">${mode === 'mydeck' ? mydeckSub : SUB[mode as IGMode]}</div>
    ${banner}
    <div class="bar"><span>回合 <b>${view.activePlayer}</b></span><span>阶段 <b>${view.phase}</b></span><span>法力 <b>${view.mana}</b></span><span>优先权 <b>${view.priority ?? '—'}</b></span><span>待决 <b>${p.mode}</b> · 视角 <b>${decider}</b></span></div>
    <div class="board">${boardHtml(view)}</div>
    ${chainRow}
    <div class="hand"><b>手牌(${decider})</b>:${hand}</div>
    <div class="actions-wrap"><div style="margin:8px 0 4px;color:#888;font-size:12px">合法动作(${decider}):</div>${chooseRow ? `<div class="actions" style="margin-bottom:6px">${chooseRow}</div>` : ''}${playRows}<div class="actions">${attackRow} ${passRow} ${endRow} <button class="sec" id="reset">重开</button></div></div>
    <div class="log">${log.slice(-12).join('\n')}</div>`
  app.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((b) => {
    b.onclick = () => { const a = actIndex[Number(b.dataset.act)]!; log.push(`${decider} · ${igActionLabel(a, view, req)}`); ig.apply(a); render() }
  })
  wireCommon(() => { ig = new InteractiveGame(SCENES[mode as IGMode](), IG_DEPS); log.length = 0 })
}

function switchMode(m: Mode): void {
  mode = m
  ;(window as unknown as { __mode?: string }).__mode = m
  log.length = 0
  if (m === 'blank') session = new GameSession()
  // mydeck 的局面来自构建器,不能拿 SCENES 重建(那会把玩家搭的牌组冲掉)
  else if (m !== 'online' && m !== 'builder' && m !== 'mydeck') ig = new InteractiveGame(SCENES[m](), IG_DEPS)
  render()
}

function wireModes(): void {
  app.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((b) => {
    b.onclick = () => switchMode(b.dataset.mode as Mode)
  })
}

function wireCommon(reset: () => void): void {
  const r = document.getElementById('reset')
  if (r) r.onclick = () => { reset(); render() }
  wireModes()
}

   
                                               
                                                    
   
                                                       
let mydeckSub = ''

function startFromDecks(deckA: Deck, deckB: Deck): void {
  mydeckSub = deckA === deckB
    ? `用【卡组构建器】搭的牌组开的局:双方都用〈${deckA.name}〉(先验手感)。合法性已由 draftToDeck 把关。`
    : `用【卡组构建器】搭的牌组开的局:P1〈${deckA.name}〉 vs P2〈${deckB.name}〉。合法性已由 draftToDeck 把关。`
  const { state } = setupGame(deckA, deckB, specLookup, makeRng(Number(String(state0Seed())) || 1))
  ig = new InteractiveGame(state, IG_DEPS)
  log.length = 0
  mode = 'mydeck'                                     
  render()
}
                                                  
function state0Seed(): number { return 20260806 }

function render(): void {
  ;(window as unknown as { __mode?: string }).__mode = mode
  if (mode === 'online') startOnline({ app, modeBar, boardHtml, unitChip, nm, bfLabel, wireModes, gotoBuilder: () => { mode = 'builder'; render() } })        
  else if (mode === 'builder') renderDeckBuilder({ app, modeBar, wireModes, startFromDecks, gotoOnline: () => { mode = 'online'; render() } })        
  else if (mode === 'blank') renderBlank()
  else renderIG()
}
render()
