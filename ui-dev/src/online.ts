                                                                  
                                                                             

import type { ClientView, ProjectedObject } from '../../engine/src/net/project'
import { renderBoard, bindBoard, boardDragging, boardStyles, type RoomViewLike, restoreHoverPreview, syncPassAll, bindAutoPass } from './board'
import { autoPassVerdict } from '../../engine/src/net/autoPass'
import type { LogEntry } from './log'
import { cardImg, cardName, DOMAIN } from './cards'
import { decodeDeck } from '../../engine/src/game/deckCode'
import { encodeCustomPick } from '../../engine/src/game/deckPick'                              
import { runeIdOf, kindOf } from '../../engine/data/registry'        

                                                    
const DECODE_OPTS = { runeIdOf, kindOf }
import { CARD_POOL } from './data/cardPool'                    
import { deckRows, getDeck } from './deckLibrary'                      
import { mountUiTuner } from './uiTuner'                              
import { planFx, runFx, cancelFx } from './fx'                
import { withPayChoice } from './payChoice'                              

const SERVER = (localStorage.getItem('riftbound.server') ?? 'http://127.0.0.1:5180') + '/api'
                                            
export const DEV = new URLSearchParams(location.search).get('dev') === '1'

type Seat = 'P1' | 'P2' | 'spectator'
interface Pending { mode: 'action' | 'window' | 'choice' | 'mulligan' | 'gameover'; player?: string; winner?: string; chainDepth?: number; request?: { key: string; prompt: string; candidates: { id: string; label: string }[] } }
interface InteractiveAction { kind: string; player?: string; [k: string]: unknown }
interface RoomView { code: string; seat: Seat; view: ClientView; pending: Pending; legalActions: InteractiveAction[]; seatsFilled: number; log?: LogEntry[]; logSeq?: number; blocked?: { oid: string; defId: string; reason: string; detail: string; costMana?: number; costPips?: string[]; haveMana?: number }[]; mulliganSubmitted?: boolean }

export interface OnlineDeps {
  readonly app: HTMLElement
  readonly modeBar: () => string
  readonly boardHtml: (v: ClientView) => string
  readonly unitChip: (v: ClientView, oid: string) => string
  readonly nm: (defId?: string) => string
  readonly bfLabel: (id: string) => string
  readonly wireModes: () => void
                                                   
  readonly gotoBuilder?: () => void
}

function connId(): string {
  let id = sessionStorage.getItem('riftbound.connId')
  if (!id) { id = 'c' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('riftbound.connId', id) }
  return id
}

                          
let serverUp = true

async function api(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const opt: RequestInit = body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}
  try {
    const r = await fetch(SERVER + path, opt)
    serverUp = true
    return await r.json()
  } catch {
                                                
                                             
    serverUp = false
    return { error: '连不上对战服务端' }
  }
}

                                                               
interface WireViolation { rule?: string; detail?: string }

const escHtml = (t: string): string =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

   
        
                                         
                                         
                              
   
function showLobbyError(msg: string, violations?: readonly WireViolation[]): void {
  const box = document.getElementById('lobbymsg')
  if (!box) return
  const list = (violations ?? [])
    .map((v) => `<li><code>${escHtml(v.rule ?? '')}</code> ${escHtml(v.detail ?? '')}</li>`)
    .join('')
  box.innerHTML = `<div>${escHtml(msg)}</div>${list ? `<ul class="lobby-viol">${list}</ul>` : ''}`
}

let state: { code: string; seat: Seat; token?: string } | null = null
   
          
                                                                
                                                                  
                                                      
   
function saveRoom(): void {
  if (state) {
    sessionStorage.setItem('riftbound.room', JSON.stringify(state))
    if (state.token) localStorage.setItem('riftbound.last', JSON.stringify(state))
  } else {
    sessionStorage.removeItem('riftbound.room')
  }
}
                                                                         
function loadRoom(): { code: string; seat: Seat; token?: string } | null {
  try { const raw = sessionStorage.getItem('riftbound.room'); if (raw) state = JSON.parse(raw) } catch { /* ignore */ }
  return state
}
function lastSeat(): { code: string; seat: Seat; token?: string } | null {
  try { const raw = localStorage.getItem('riftbound.last'); return raw ? JSON.parse(raw) : null } catch { return null }
}
let lastView: RoomView | null = null
let polling = false
                                                   
let lastHtml = ''
                                                       
let autoPassTimer = 0
                                                   
let prevViewForFx: ClientView | null = null
let deps: OnlineDeps

               
                                                          
let logEntries: LogEntry[] = []
let logCursor = 0

function resetLog(): void { logEntries = []; logCursor = 0 }

function mergeLog(v: RoomView): void {
  if (!v.log?.length) return
  for (const e of v.log) if (e.seq > logCursor) logEntries.push(e)
  logCursor = v.logSeq ?? logCursor
  if (logEntries.length > 600) logEntries = logEntries.slice(-400)           
}

   
                           
                                               
                                                       
                                                    
   
const GONE_LIMIT = 3
let goneStreak = 0

                                       
async function fetchView(code: string): Promise<RoomView | null> {
  const v = (await api(`/view?connId=${connId()}&code=${code}&sinceSeq=${logCursor}`)) as unknown as RoomView | { error: string }
  if ('error' in v) {
                                                 
    if (String(v.error).includes('房间不存在')) {
      goneStreak++
      if (goneStreak < GONE_LIMIT) {
        toast(`暂时联系不上房间 ${code}(${goneStreak}/${GONE_LIMIT})…还在重试`)
        return null
      }
      goneStreak = 0
      state = null
      lastView = null
      resetLog()
      saveRoom()
      renderLobby()
      toast('这个房间已经不在了,回到大厅')
    }
    return null
  }
  goneStreak = 0
  mergeLog(v)
  return v
}

                                                     
let toastTimer: number | undefined
function toast(msg: string): void {
  let el = document.getElementById('rb-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'rb-toast'
    document.body.appendChild(el)
  }
  el.className = 'rb-toast show'
  el.textContent = msg
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { el!.className = 'rb-toast' }, 2600)
}

   
                                  
                                                           
                                                       
                                                         
                                           
   
function renderReconnecting(code: string): void {
  if (!document.getElementById('board-css')) {
    const st = document.createElement('style'); st.id = 'board-css'; st.textContent = boardStyles; document.head.appendChild(st)
  }
  deps.app.innerHTML = `
    <div class="table" style="min-height:70vh;align-items:center;justify-content:center">
      <div class="panel lobby">
        <h2 class="lobby-t">⚔ 符文战场</h2>
        <p class="lobby-s">正在回到房间 <b>${escHtml(code)}</b> …</p>
      </div>
    </div>`
}

                                                 
async function resumeRoom(): Promise<void> {
  const code = state?.code
  if (!code) return
  const v = await fetchView(code)
  if (v && state) { lastView = v; renderGame() }
}

export function startOnline(d: OnlineDeps): void {
  deps = d
  mountUiTuner()                                        
  state = null
  lastView = null
  goneStreak = 0
  const resumed = loadRoom()                
                                                              
  if (resumed) { renderReconnecting(resumed.code); void resumeRoom() } else { renderLobby() }
                                       
                                                   
  void loadDecks().then(() => { if (!lastView && !state) renderLobby() })
  if (!polling) { polling = true; poll() }
}

async function poll(): Promise<void> {
  for (;;) {
    await new Promise((r) => setTimeout(r, 800))
    if ((window as unknown as { __mode?: string }).__mode !== 'online') { polling = false; return }
    if (!state) continue
    try {
      const v = await fetchView(state.code)
      if (!v) continue
      lastView = v
      renderGame()
    } catch { /* 网络抖动:下一拍重试 */ }
  }
}

function labelAction(a: InteractiveAction, view: ClientView, req?: Pending['request']): string {
  switch (a.kind) {
    case 'PLAY_UNIT': return `打出单位 → ${deps.bfLabel(String(a.to))}`
    case 'PLAY_CARD': { const o = view.objects[String(a.cardOid)]; const t = a.target ? (String(a.target).startsWith('play:') ? ' →〔链上法术〕' : ` → ${deps.nm(view.objects[String(a.target)]?.defId)}`) : ''; return `打出 ${deps.nm((o as ProjectedObject | undefined)?.defId)}${t}` }
    case 'ATTACK': return `⚔ 发起战斗 ${deps.bfLabel(String(a.battlefield))}`
    case 'CHOOSE': return req?.candidates.find((c) => c.id === a.answer)?.label ?? String(a.answer)
    case 'MULLIGAN': { const put = (a as unknown as { put: string[] }).put; return put.length === 0 ? '✋ 全部保留' : `♻ 换掉 ${put.map((o) => deps.nm(view.objects[o]?.defId)).join('+')}` }
    case 'PLACE_STANDBY': { const x = a as unknown as { oid: string; battlefield: string; alt?: boolean; free?: boolean }; return `🫥 盖着放(待命) ${deps.nm(view.objects[x.oid]?.defId)} → ${deps.bfLabel(x.battlefield)} · ${x.free ? '免费' : x.alt ? '改付 1 法力' : '付 1 点任意符能'}` }
    case 'PLAY_STANDBY': { const x = a as unknown as { oid: string; target?: string }; const t = x.target ? ` → ${deps.nm(view.objects[x.target]?.defId)}` : ''; return `⚡ 翻开打出(0 费) ${deps.nm(view.objects[x.oid]?.defId)}${t}` }
    case 'ACTIVATE': { const x = a as unknown as { oid: string; ability: string; target?: string; discardOid?: string }; const t = x.target ? ` → ${view.objects[x.target] ? deps.nm(view.objects[x.target]?.defId) : x.target}` : ''; const d = x.discardOid ? `(弃${deps.nm(view.objects[x.discardOid]?.defId)})` : ''; return `🔧 ${deps.nm(view.objects[x.oid]?.defId)}·${x.ability}${t}${d}` }
    case 'PASS': return '让过(不反应)▶'
    case 'END_TURN': return '结束回合 ▶'
    default: return a.kind
  }
}

interface DeckInfo {
  id: string; name: string; cards: number; runes: number; legend: string; battlefields: number; domains: string[]
                                                  
  heroOptions?: string[]
  defaultHero?: string
                                      
  custom?: boolean
}
let decks: DeckInfo[] = []
   
                                                  
                                       
                                            
                                              
   
function autoPassPref(): boolean { return localStorage.getItem('riftbound.autopass') !== 'off' }
bindAutoPass(() => autoPassPref(), (on) => setAutoPassPref(on))
function setAutoPassPref(on: boolean): void {
  localStorage.setItem('riftbound.autopass', on ? 'on' : 'off')
}

let pickedDeck = localStorage.getItem('riftbound.deck') ?? ''
                                    
let pickedHero: Record<string, string> = {}
try { pickedHero = JSON.parse(localStorage.getItem('riftbound.hero') ?? '{}') } catch { pickedHero = {} }
                                                                   
                                                          
                                           
let pregameStep: 'deck' | 'room' = 'deck'

   
                                       
                                                             
                                                       
                                                       
   
const builderText = (deckId: string): string | null => getDeck(deckId)?.text ?? null
                                          
const MY_PREFIX = 'mydeck:'

   
                          
                       
                                                             
                                      
                                     
                                                                          
                                                        
                                             
   
function deckPick(): string {
  const hero = curHero()
  if (pickedDeck.startsWith(MY_PREFIX)) {
    const text = builderText(pickedDeck.slice(MY_PREFIX.length))
    return text ? encodeCustomPick(text, hero) : ''                       
  }
  return hero ? `${pickedDeck}|${hero}` : pickedDeck
}

async function loadDecks(): Promise<void> {
  try {
    const d = (await api('/decks')) as unknown as DeckInfo[]
                                                               
                                                       
    decks = Array.isArray(d) ? d : []
                                            
    for (const row of deckRows()) {
      const text = row.text
      if (!text) continue
                                               
                                                           
      const d = decodeDeck(text, DECODE_OPTS)
      if (!d.ok) continue                         
                                                             
                                                
                                                            
                                           
      const legendHero = CARD_POOL[d.draft.legend ?? '']?.hero ?? ''
      const heroOptions = [...new Set(d.draft.mainDeck)].filter((no) => {
        const c = CARD_POOL[no]
        return c !== undefined && c.type === '英雄单位' && legendHero !== '' && c.hero === legendHero
      })
      decks.push({
        id: `${MY_PREFIX}${row.id}`,
        name: `${row.name}(自搭)`,
        cards: d.draft.mainDeck.length,
        runes: (d.draft.runeDeck ?? []).length,
        legend: d.draft.legend ?? '',
        battlefields: d.draft.battlefields.length,
        domains: [],
        heroOptions,
        ...(d.draft.hero && heroOptions.includes(d.draft.hero) ? { defaultHero: d.draft.hero } : {}),
        custom: true,
      })
    }
                                           
                                                        
    if (decks.length > 0 && !decks.some((x) => x.id === pickedDeck)) pickedDeck = decks[0]!.id
  } catch { /* 服务端没起来:大厅照样显示,建房时会报错 */ }
}

              
function curDeck(): DeckInfo | undefined {
  return decks.find((d) => d.id === pickedDeck)
}

                                          
function curHero(): string | undefined {
  const d = curDeck()
  if (!d) return undefined
  return pickedHero[d.id] ?? d.defaultHero ?? d.heroOptions?.[0]
}

   
                                      
                                                      
   
function deckStep(): string {
  if (decks.length === 0) return ''
  return `<div class="pregame">
    <div class="pg-steps"><b class="on">1 选牌组</b><i>→</i><span>2 开打</span></div>
    <div class="dp-row">${decks.map((d) => `
      <button class="dp-card${d.id === pickedDeck ? ' on' : ''}" data-deck="${d.id}">
        <b>${d.name}</b>
        <span>${d.cards} 张主牌 · ${d.runes} 枚符文</span>
        <span>传奇 ${cardName(d.legend)} · ${d.battlefields} 张战场三选一</span>
        <span class="dp-dom">${d.domains.map((x) => `<i style="background:${DOMAIN[x]?.color ?? '#888'}"></i>${DOMAIN[x]?.name ?? x}`).join('')}</span>
        ${d.cards < 40
          ? `<span class="dp-warn">⚠ ${d.custom ? '这副自搭牌组' : '演示牌组'}只有 ${d.cards} 张,${d.custom ? '不足 §103.2 要求的 40 张,服务端会拒绝开局' : '十几回合就会抽空(§431 燃尽白送对手 1 分)'}</span>`
          : ''}
      </button>`).join('')}</div>
    <button id="toroom" class="btn primary big pg-next">去开打 →</button>
    <div style="text-align:center;margin-top:10px">
      <button id="tobuilder" class="sec" style="font-size:13px">🃏 卡组构建器 —— 用 1016 张全卡池自己搭一副</button>
    </div>
  </div>`
}

                                                
                                            

                                            
function roomStep(): string {
  const d = curDeck()
  const h = curHero()
  return `<div class="pregame">
    <div class="pg-steps"><span>1 选牌组</span><i>→</i><b class="on">2 开打</b></div>
    <div class="pg-deckline">出战 <b>${d ? d.name : '—'}</b>${h ? ` · 选定英雄 <b>${cardName(h)}</b>` : ''}
      <button id="backdeck2" class="btn ghost pg-mini">改</button></div>
    <div class="lobby-cols">
      <div class="lobby-box">
        <div class="lobby-h"><b>建房</b><small>拿房间码给对手</small></div>
        <button id="create" class="btn primary big" style="width:100%">建房,拿房间码 →</button>
        <div class="lobby-hint">建好后把房间码发给牌友</div>
      </div>
      <div class="lobby-box">
        <div class="lobby-h"><b>加入</b><small>输对手给你的房间码</small></div>
        <div style="display:flex;gap:8px">
          <input id="code" maxlength="4" placeholder="房间码" class="codebox" />
          <button id="join" class="btn" style="background:#0369a1">加入 →</button>
        </div>
        <div class="lobby-hint">输入牌友给你的 4 位房间码</div>
      </div>
    </div>
    <div class="lobby-fair">🎲 先后手由服务端随机决定,与谁建房无关(§115「公平随机方式」);
      后手方在自己第一个召出阶段会多召一枚符文(§485.7)</div>
  </div>`
}

function wirePregame(): void {
  document.querySelectorAll<HTMLElement>('[data-deck]').forEach((b) => {
    b.onclick = () => {
      pickedDeck = b.dataset.deck!
      localStorage.setItem('riftbound.deck', pickedDeck)
      renderLobby()
    }
  })
  const toRoom = document.getElementById('toroom')
  if (toRoom) toRoom.onclick = () => { pregameStep = 'room'; renderLobby() }
  const toBuilder = document.getElementById('tobuilder')
  if (toBuilder) toBuilder.onclick = () => deps.gotoBuilder?.()        
  const back2 = document.getElementById('backdeck2')
  if (back2) back2.onclick = () => { pregameStep = 'deck'; renderLobby() }
}

function renderLobby(): void {
  if (!document.getElementById('board-css')) {
    const st = document.createElement('style'); st.id = 'board-css'; st.textContent = boardStyles; document.head.appendChild(st)
  }
  deps.app.innerHTML = `
    ${DEV ? `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${deps.modeBar()}</div>` : ''}
    <div class="table" style="min-height:70vh;align-items:center;justify-content:center">
      <div class="panel lobby">
        <h2 class="lobby-t">⚔ 符文战场</h2>
        <p class="lobby-s">熟人房联机 · 开两个标签页,或两台机器各开一个</p>
        ${pregameStep === 'deck' ? deckStep() : roomStep()}
        ${DEV ? `<select id="scene" class="devscene"><option value="deck">真游戏·牌组开局</option><option value="discard">演示·遗弃反制</option><option value="vegas">演示·薇古丝</option><option value="seize">演示·灵魂折镜</option><option value="servitor">演示·赐面守侍</option><option value="militarist">演示·军事家战斗</option><option value="blank">演示·白板对拼</option></select>` : ''}
        ${(() => { const l = lastSeat(); return l?.token ? `<button id="reclaim" class="btn ghost reclaim">↩ 回到上一局(房间 ${l.code})</button>` : '' })()}
        <div id="lobbymsg" class="lobby-err"></div>
        <small class="lobby-foot">
          <span class="srv ${serverUp ? 'up' : 'down'}">${serverUp ? '● 服务端已连接' : '● 连不上服务端'}</span>
          ${serverUp ? `<span class="srv-addr">${SERVER}</span>` : `<span class="srv-fix">在项目目录跑 <code>npm --prefix server start</code>(端口 5180),然后刷新本页</span>`}
        </small>
      </div>
    </div>`
  if (DEV) deps.wireModes()
  wirePregame()
  const scene = (): string => (document.getElementById('scene') as HTMLSelectElement | null)?.value ?? 'deck'
  const createBtn = document.getElementById('create')
  if (createBtn) createBtn.onclick = async () => {
    const r = (await api('/create', { connId: connId(), scene: scene(), deck: deckPick() })) as { code?: string; seat?: Seat; token?: string; error?: string; violations?: WireViolation[] }
    if (r.error || !r.code) { renderLobby(); showLobbyError(r.error ?? '建房失败', r.violations); return }
    state = { code: r.code, seat: r.seat!, ...(r.token ? { token: r.token } : {}) }
    saveRoom()
  }
  const joinBtn = document.getElementById('join')
  if (joinBtn) joinBtn.onclick = async () => {
    const code = (document.getElementById('code') as HTMLInputElement).value.toUpperCase().trim()
    const r = (await api('/join', { connId: connId(), code, deck: deckPick() })) as { seat?: Seat; token?: string; error?: string; violations?: WireViolation[] }
    if (r.error) { showLobbyError(r.error, r.violations); return }
    state = { code, seat: r.seat!, ...(r.token ? { token: r.token } : {}) }
    saveRoom()
  }
  const back = document.getElementById('reclaim')
  if (back) back.onclick = async () => {
    const last = lastSeat()
    if (!last?.token) return
    const r = (await api('/reclaim', { connId: connId(), code: last.code, token: last.token })) as { seat?: Seat; error?: string }
    if (r.error) {
      localStorage.removeItem('riftbound.last')                   
      renderLobby()                             
      const msg = document.getElementById('lobbymsg')
      if (msg) msg.textContent = `${r.error}——你可以直接输房间码加入`
      return
    }
    state = { code: last.code, seat: r.seat!, token: last.token }
    resetLog()
    saveRoom()
  }
}

function renderGame(): void {
  const v = lastView
  if (!v || !state) return
                                                             
  if (boardDragging()) return
                                     
  if (!document.getElementById('board-css')) {
    const st = document.createElement('style'); st.id = 'board-css'; st.textContent = boardStyles; document.head.appendChild(st)
  }
                                             
                         
    
                                           
                                          
                                                 
                                                         
                                              
                                                       
  const chainLen = ((v.view as { chain?: readonly unknown[] }).chain ?? []).length
  const passAll = syncPassAll(chainLen, v.pending.mode === 'window')
  const onlyPass = v.legalActions.length === 1 && v.legalActions[0]?.kind === 'PASS'
  const canPass = v.legalActions.some((a) => a.kind === 'PASS')
                                                  
                                                                
                                  
  const scoped = autoPassPref() && canPass && autoPassVerdict({
    view: v.view, seat: v.seat, pendingMode: v.pending.mode,
    pendingPlayer: (v.pending as { player?: typeof v.seat }).player,
  }).auto
  if (v.pending.mode === 'window' && v.pending.player === v.seat && (onlyPass || (passAll && canPass) || scoped)) {
    if (autoPassTimer === 0) {
      const code = state!.code
      const seat = v.seat
      const turn = v.view.turn ?? 0
      autoPassTimer = window.setTimeout(() => {
        autoPassTimer = 0
        void (async () => {
                                                  
          if (!lastView || lastView.pending.mode !== 'window' || lastView.pending.player !== seat) return
          const stillOnlyPass = lastView.legalActions.length === 1 && lastView.legalActions[0]?.kind === 'PASS'
          const stillCanPass = lastView.legalActions.some((a) => a.kind === 'PASS')
                                                            
          const stillScoped = autoPassPref() && stillCanPass && autoPassVerdict({
            view: lastView.view, seat, pendingMode: lastView.pending.mode,
            pendingPlayer: (lastView.pending as { player?: typeof seat }).player,
          }).auto
          if (!stillOnlyPass && !(passAll && stillCanPass) && !stillScoped) return
                                                       
          logEntries.push({ seq: logCursor + 0.5, turn, kind: 'clientNote',
            note: passAll ? '⏩ 本轮全部让过:自动让过'
              : stillOnlyPass ? '⚡ 反应窗口:你手上没有可响应的牌,已自动让过'
                : '⚡ 这条链是你发起的、对手已让过,已自动让过进结算(可在设置里关掉)' })
          await api('/submit', { connId: connId(), code, action: { kind: 'PASS', player: seat } })
          const nv = await fetchView(code)
          if (nv) { lastView = nv; renderGame() }
        })()
      }, 600)
    }
    // 不 return —— 让这一帧画出来
  } else if (autoPassTimer !== 0) {
    window.clearTimeout(autoPassTimer); autoPassTimer = 0
  }
                                        
                                                         
                                           
  const prevLog = document.getElementById('lg-body')
  const wasPinned = !prevLog || prevLog.scrollHeight - prevLog.scrollTop - prevLog.clientHeight < 24
  const prevTop = prevLog?.scrollTop ?? 0
  const devBar = DEV ? `<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">${deps.modeBar()}</div>` : ''
  const html = `<div class="rb-shell">${devBar}${renderBoard({ ...(v as unknown as RoomViewLike), log: logEntries, blocked: v.blocked ?? [] })}</div>`
                       
                                                            
                                                               
                                                              
                                       
                                                             
                            
  if (html === lastHtml) return
                                                               
                                         
  planFx(prevViewForFx, v.view, v.seat, !!document.querySelector('.overlay'), boardDragging())
  prevViewForFx = v.view
  lastHtml = html
  deps.app.innerHTML = html
                                                  
                                                   
                                                 
  restoreHoverPreview()
  runFx()                           
  if (DEV) deps.wireModes()
  const logBody = document.getElementById('lg-body')
  if (logBody) logBody.scrollTop = wasPinned ? logBody.scrollHeight : prevTop
  bindBoard(
    deps.app,
    v.seat,
    async (a) => {
                                                      
                                                                 
      const act = await withPayChoice(a, v.view, v.seat)
      if (!act) { renderGame(); return }
      const r = (await api('/submit', { connId: connId(), code: state!.code, action: { player: v.seat, ...act } })) as { ok?: boolean; error?: string }
      if (r?.ok === false) toast(r.error ?? '这一步没有被接受')
      const nv = await fetchView(state!.code)
      if (nv) { lastView = nv; renderGame() }
    },
    () => { state = null; lastView = null; prevViewForFx = null; cancelFx(); resetLog(); saveRoom(); renderLobby() },
    () => renderGame(),
    async () => {
      const r = (await api('/rematch', { connId: connId(), code: state!.code })) as { ok?: boolean; error?: string }
      if (r?.ok === false) { toast(r.error ?? '开不了新的一局'); return }
      resetLog()             
      const nv = await fetchView(state!.code)
      if (nv) { lastView = nv; renderGame() }
    },
                                     
                             
    async (a) => {
      const r = (await api('/roll', { connId: connId(), code: state!.code, action: { player: v.seat, ...a } })) as { ok?: boolean; error?: string }
      if (r?.ok === false) toast(r.error ?? '这一步没有被接受')
      const nv = await fetchView(state!.code)
      if (nv) { lastView = nv; renderGame() }
    },
                                              
                                                         
                                                           
                                                                     
                                            
                                                  
                                          
    async () => {
      const r = (await api('/undo', { connId: connId(), code: state!.code })) as { ok?: boolean; error?: string }
      if (r?.ok === false) { toast(r.error ?? '现在撤不了'); return }
      const nv = await fetchView(state!.code)
      if (nv) { lastView = nv; renderGame() }
    },
  )
}
