                                                                
                                                                              
  
                                           
                                                            
                                                               

import type { PlayerId } from '../state/ids'
import type { GameState } from '../state/gameState'
import type { ClientView } from './project'
import type { LogEntry } from './journal'
import { InteractiveGame, type BlockedPlay, type InteractiveAction, type Pending, type InteractiveSnapshot } from '../session/interactiveGame'
import { fingerprint, type Recording } from '../replay/recordedGame'

export type Seat = PlayerId | 'spectator'

                                                                     
const SPECTATOR_VIEWER = '__spectator__'

   
                                           
                                         
  
                   
                                              
                                                 
                                         
                                   
                                               
  
                     
                                                
                                            
                                                          
                                             
                                  
   
export interface RollState {
                                         
  readonly dice: Readonly<Record<string, number>>
                                                
  readonly designated?: PlayerId
                           
  readonly chosen?: 'first' | 'second'
                                        
  readonly rerolls: number
                           
  readonly done: boolean
}

                                                                 
export type RoomAction =
  | { readonly kind: 'ROLL_DICE'; readonly player: PlayerId }
  | { readonly kind: 'CHOOSE_ORDER'; readonly player: PlayerId; readonly order: 'first' | 'second' }

export function isRoomAction(a: { kind: string }): a is RoomAction {
  return a.kind === 'ROLL_DICE' || a.kind === 'CHOOSE_ORDER'
}

export interface RoomView {
  readonly code: string
  readonly seat: Seat
  readonly view: ClientView             
  readonly pending: Pending             
                                            
  readonly legalActions: readonly InteractiveAction[]
  readonly seatsFilled: number
                                          
  readonly log: readonly LogEntry[]
                                    
  readonly logSeq: number
                                            
  readonly blocked: readonly BlockedPlay[]
                                                            
  readonly mulliganSubmitted: boolean
     
                                                 
                                      
     
  readonly roll: RollState
                                             
  readonly canUndo: boolean
}

export interface SubmitResult {
  readonly ok: boolean
  readonly error?: string
}

                                         
export class Room {
  readonly code: string
  private game: InteractiveGame
     
                                              
                                                          
                                           
                                                    
     
  private rec: { initial: GameState; actions: InteractiveAction[]; marks: Record<string, string> } | null = null
                    
  private readonly seats = new Map<PlayerId, string>()
                                           
  private readonly decks = new Map<PlayerId, string>()
     
                                               
                                                    
     
  private readonly tokens = new Map<PlayerId, string>()
     
                                               
                                                         
                                          
     
  private seenTick = 0
  private readonly seatSeen = new Map<PlayerId, number>()
     
                                                 
                      
                                                      
                                                       
                                                  
                                                    
                                     
                                         
     
  private readonly mullBuf = new Map<PlayerId, readonly string[]>()
     
                                          
    
                                                        
                                              
    
                                         
                                   
                                       
                                      
                                
     
     
                                                   
                                                     
                                                     
     
  private undoStack: { readonly by: PlayerId; readonly snap: InteractiveSnapshot }[] = []
  private static readonly UNDO_DEPTH = 12

                                         
  private roll: RollState = { dice: {}, rerolls: 0, done: false }
                                                 
  private rollSeed = 0x2545f491
     
                     
                                                         
                                       
                                           
     
  private needRoll = false

                            
  enableRoll(): void {
    this.needRoll = true
  }

     
                                       
    
                                              
                                
    
                                                
                                                   
                                                         
                                              
                                              
                                         
                                      
                                                                    
     
  private botSeat: PlayerId | undefined

                                           
  markBot(seat: PlayerId): void {
    this.botSeat = seat
  }

                                                     
  hasBot(): boolean {
    return this.botSeat !== undefined
  }
                                                      
  private static readonly LIVE_WINDOW = 4

     
                           
                                                           
                                           
     
  reclaim(connId: string, token: string): { seat: Seat } | { error: string } {
    for (const [seat, t] of this.tokens) {
      if (t !== token) continue
      const cur = this.seats.get(seat)
      const seen = this.seatSeen.get(seat)
                                                
      const seatLive = cur !== undefined && cur !== connId && seen !== undefined && (this.seenTick - seen) < Room.LIVE_WINDOW
      if (seatLive) return { error: '这个座位有人正在用' }
      this.seats.set(seat, connId)
      return { seat }
    }
    return { error: '这个座位认不回来了' }
  }

  tokenOf(seat: PlayerId): string | undefined {
    return this.tokens.get(seat)
  }

  issueToken(seat: PlayerId, token: string): void {
    if (!this.tokens.has(seat)) this.tokens.set(seat, token)
  }

  constructor(code: string, game: InteractiveGame) {
    this.code = code
    this.game = game
    this.startRecording()                                
  }

     
                      
                                                          
     
  replaceGame(game: InteractiveGame): void {
    this.mullBuf.clear()                
    this.undoStack = []                                
    this.game = game
    this.startRecording()               
  }

                                                        
  finishRoll(game: InteractiveGame): void {
    this.mullBuf.clear()
    this.game = game
    this.startRecording()               
  }

                                        
  rematch(makeGame: (decks: Readonly<Record<string, string | undefined>>) => InteractiveGame): void {
    const picked: Record<string, string | undefined> = {}
    for (const p of this.seatIds()) picked[p] = this.decks.get(p)
    this.game = makeGame(picked)
    this.startRecording()               
  }

                                                    
  deckPicks(): Readonly<Record<string, string | undefined>> {
    const picked: Record<string, string | undefined> = {}
    for (const p of this.seatIds()) picked[p] = this.decks.get(p)
    return picked
  }

  setDeck(seat: PlayerId, deckId: string | undefined): void {
    if (deckId) this.decks.set(seat, deckId)
  }

  deckOf(seat: PlayerId): string | undefined {
    return this.decks.get(seat)
  }

                                                  
  join(connId: string): Seat {
    const existing = this.seatOf(connId)
    if (existing) return existing
    for (const p of this.game.state.players) {
      if (!this.seats.has(p)) {
        this.seats.set(p, connId)
        return p
      }
    }
    return 'spectator'
  }

                        
  seatIds(): readonly PlayerId[] {
    return [...this.seats.keys()]
  }

  seatOf(connId: string): PlayerId | undefined {
    for (const [seat, id] of this.seats) if (id === connId) return seat
    return undefined
  }

                               
  connections(): string[] {
    return [...this.seats.values()]
  }

  isFull(): boolean {
    return this.seats.size >= this.game.state.players.length
  }

  isOver(): boolean {
    return this.game.state.winner !== null
  }

                                     
  viewFor(connId: string, sinceSeq = 0): RoomView {
    const seat = this.seatOf(connId) ?? 'spectator'
    if (seat !== 'spectator') this.seatSeen.set(seat, ++this.seenTick)                            
                                                           
                                                  
    const viewer = seat === 'spectator' ? (SPECTATOR_VIEWER as PlayerId) : seat
    const pending = this.game.pending()
                                                              
                                                                    
                                                      
    const canAct = seat !== 'spectator' && pending.mode !== 'gameover' && pending.player === seat
      && !this.rollPending()
    return {
      code: this.code,
      seat,
      view: this.game.view(viewer),
      pending,
      legalActions: canAct ? this.game.legalActions(seat) : [],
      seatsFilled: this.seats.size,
      log: this.game.journal.projectFor(viewer, sinceSeq),
      logSeq: this.game.journal.length,
      blocked: seat === 'spectator' ? [] : this.game.blockedFor(seat),
      mulliganSubmitted: seat !== 'spectator' && this.mullBuf.has(seat), // ★753
                                                
      roll: this.needRoll ? this.roll : { ...this.roll, done: true },
      canUndo: seat !== 'spectator' && this.canUndo(seat), // ★768
    }
  }

                                                              
                                             
  private rollOne(): number {
    let a = (this.rollSeed + 0x6d2b79f5) | 0
    this.rollSeed = a
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (((t ^ (t >>> 14)) >>> 0) % 6) + 1
  }

                            
  rollState(): RollState {
    return this.roll
  }

                                             
  rollPending(): boolean {
    return this.needRoll && !this.roll.done
  }

     
                          
                                                
                                                         
                                       
     
  private doRoll(seat: PlayerId): SubmitResult {
    if (!this.needRoll) return { ok: false, error: '这局不需要掷骰' }
    if (this.roll.done) return { ok: false, error: '先后手已经定了' }
    if (this.roll.dice[seat as string] !== undefined) return { ok: true }      
    const dice = { ...this.roll.dice, [seat as string]: this.rollOne() }
    const seats = this.game.state.players
    const all = seats.every((p) => dice[p as string] !== undefined)
    if (!all) { this.roll = { ...this.roll, dice }; return { ok: true } }
    const [a, b] = seats as [PlayerId, PlayerId]
    const va = dice[a as string]!, vb = dice[b as string]!
    if (va === vb) {
                                         
      this.roll = { dice: {}, rerolls: this.roll.rerolls + 1, done: false }
      return { ok: true }
    }
    this.roll = { ...this.roll, dice, designated: va > vb ? a : b, done: false }
    return { ok: true }
  }

     
                                 
                                     
     
  private doChooseOrder(seat: PlayerId, order: 'first' | 'second'): SubmitResult {
    if (this.roll.done) return { ok: false, error: '先后手已经定了' }
    if (!this.roll.designated) return { ok: false, error: '还没掷出指定玩家' }
    if (this.roll.designated !== seat) return { ok: false, error: '只有点数大的那位能选先后手(§407.1)' }      
    this.roll = { ...this.roll, chosen: order, done: true }
    return { ok: true }
  }

                                     
  starterFromRoll(): PlayerId | undefined {
    const { designated, chosen, done } = this.roll
    if (!done || !designated || !chosen) return undefined
    if (chosen === 'first') return designated
    return this.game.state.players.find((p) => p !== designated)
  }

                                             
  canUndo(seat: Seat): boolean {
    if (seat === 'spectator') return false
    const top = this.undoStack[this.undoStack.length - 1]
    if (!top) return false
    if (top.by !== seat) return false                                   
    if (this.game.pending().mode === 'gameover') return false              
    return true
  }

     
                    
                                             
     
  undo(connId: string): SubmitResult {
    const seat = this.seatOf(connId)
    if (!seat) return { ok: false, error: '观战者不可操作' }
    if (!this.canUndo(seat)) {
      const top = this.undoStack[this.undoStack.length - 1]
      if (top && top.by !== seat) return { ok: false, error: '上一步不是你走的,撤不了' }
      return { ok: false, error: '没有可以撤回的动作' }
    }
    const top = this.undoStack.pop()!
                         
                                                     
                                                           
                                                                               
                                                                   
                                                             
                                    
                                                                     
                                            
                                                                    
                                          
    this.game.journal.note(this.game.state.turn, { kind: 'undo', player: seat })
    this.game.restore(top.snap)
    this.mullBuf.clear()
    return { ok: true }
  }

                                                             
  submitRoom(connId: string, action: RoomAction): SubmitResult {
    const seat = this.seatOf(connId)
    if (!seat) return { ok: false, error: '观战者不可操作' }
    if (!this.isFull()) return { ok: false, error: '等待对手加入' }
    if (action.player !== seat) return { ok: false, error: `座位 ${seat} 不可提交 ${action.player} 的动作` }
    if (action.kind === 'ROLL_DICE') return this.doRoll(seat)
    return this.doChooseOrder(seat, action.order)
  }

     
                                                                      
                                                      
     
  private startRecording(): void {
    const s = this.game.state
    this.rec = s.chain.length === 0 ? { initial: s, actions: [], marks: {} } : null
  }

     
                                                                 
                                                   
                                     
     
  private applyRecorded(action: InteractiveAction): boolean {
    const before = this.game.state
    this.game.apply(action)
    const changed = this.game.state !== before
                                                              
                                                          
                                                                                     
                                                    
                                
                                                        
                                                           
                           
    if (this.rec) {
      this.rec.actions.push(action)
                                                          
      if (this.rec.actions.length % 10 === 0) {
        this.rec.marks[String(this.rec.actions.length)] = fingerprint(this.game)
      }
    }
    return changed
  }

                                      
  exportRecording(note?: string): Recording | null {
    if (!this.rec || this.rec.actions.length === 0) return null
    return {
      version: 1,
      seed: 0, // 房间不持有建局种子(它在 server 侧);初始态快照已足够重放
      initial: this.rec.initial,
      actions: [...this.rec.actions],
      checkpoints: { ...this.rec.marks, [String(this.rec.actions.length)]: fingerprint(this.game) },
      ...(note !== undefined ? { note } : {}),
    }
  }

  submit(connId: string, action: InteractiveAction): SubmitResult {
    const seat = this.seatOf(connId)
    if (!seat) return { ok: false, error: '观战者不可操作' }
                                            
                                        
    if (!this.isFull() && action.kind !== 'CONCEDE') return { ok: false, error: '等待对手加入' }
                                                      
    if (this.rollPending() && action.kind !== 'CONCEDE') return { ok: false, error: '还没决定先后手' }
    if (action.player !== seat) return { ok: false, error: `座位 ${seat} 不可提交 ${action.player} 的动作` }
                                                
    if (this.game.pending().mode === 'mulligan' && action.kind === 'MULLIGAN') {
      const mull = this.bufferMulligan(seat, action.put)
      if (mull) return mull
      return { ok: true }
    }
                                           
    const before = this.game.snapshot()                                                     
    const changed = this.applyRecorded(action)                                   
                                                        
    if (changed && seat !== this.botSeat) {
                                             
      this.undoStack.push({ by: seat, snap: before })
      if (this.undoStack.length > Room.UNDO_DEPTH) this.undoStack.shift()
    }
    return { ok: true }
  }

     
                                        
                                                    
                                                           
     
  private bufferMulligan(seat: PlayerId, put: readonly string[]): SubmitResult | null {
    const hand = this.game.state.zones[`hand:${seat}` as never]?.contents ?? []
    if (put.length > 2) return { ok: false, error: '最多搁置两张(§117.1)' }
    if (new Set(put).size !== put.length) return { ok: false, error: '搁置牌不可重复' }
    if (put.some((o) => !(hand as readonly string[]).includes(o))) {
      return { ok: false, error: '搁置牌必须来自你自己的手牌' }
    }
    this.mullBuf.set(seat, put)
                                                      
    const order = [...(this.game.state.mulliganQueue ?? [])]
    if (!order.every((p) => this.mullBuf.has(p))) return null              
    for (const p of order) {
      const before = (this.game.state.mulliganQueue ?? []).length
      this.applyRecorded({ kind: 'MULLIGAN', player: p, put: this.mullBuf.get(p) ?? [] })
                                             
      if ((this.game.state.mulliganQueue ?? []).length === before) {
        this.applyRecorded({ kind: 'MULLIGAN', player: p, put: [] })
      }
    }
    this.mullBuf.clear()
    return null
  }
}

                                                   
export class RoomManager {
  private readonly rooms = new Map<string, Room>()
  private tokenSeed = 1

  constructor(
    private readonly newGame: () => InteractiveGame,
    private readonly genCode: () => string,
  ) {}

                                 
  private newToken(): string {
    return `t${(this.tokenSeed++ * 2654435761 + Date.now()).toString(36)}${Math.floor(Date.now() % 100000).toString(36)}`
  }

                                              
  reclaim(connId: string, code: string, token: string): { seat: Seat; code: string } | { error: string } {
    const room = this.rooms.get(code)
    if (!room) return { error: '房间不存在' }
    const r = room.reclaim(connId, token)
    if ('error' in r) return r
    return { seat: r.seat, code }
  }

                                                              
  createRoom(connId: string, makeGame?: () => InteractiveGame, deck?: string): { code: string; seat: Seat; token?: string } {
    let code = this.genCode()
    while (this.rooms.has(code)) code = this.genCode()        
    const room = new Room(code, (makeGame ?? this.newGame)())
    this.rooms.set(code, room)
    if (deck !== undefined) room.enableRoll()                      
    const seat = room.join(connId)
    if (seat !== 'spectator') {
      room.setDeck(seat, deck)
      room.issueToken(seat, this.newToken())
    }
    return { code, seat, ...(seat !== 'spectator' ? { token: room.tokenOf(seat) } : {}) }
  }

     
                              
                                                     
     
  joinRoom(connId: string, code: string, deck?: string, rebuild?: (decks: Readonly<Record<string, string | undefined>>) => InteractiveGame | null): { seat: Seat; token?: string } | { error: string } {
    const room = this.rooms.get(code)
    if (!room) return { error: '房间不存在' }
                                          
                                               
    if (room.isFull() && !room.seatOf(connId)) return { error: '这桌已经坐满了' }
    const seat = room.join(connId)
    if (seat !== 'spectator') {
      room.setDeck(seat, deck)
      room.issueToken(seat, this.newToken())
      if (room.isFull() && rebuild) {
        const picked: Record<string, string | undefined> = {}
        for (const p of room.seatIds()) picked[p] = room.deckOf(p)
        const g = rebuild(picked)
        if (g) room.replaceGame(g)
      }
      return { seat, token: room.tokenOf(seat) }
    }
    return { seat }
  }

                                                     
  exportRecording(code: string, note?: string): Recording | null {
    return this.rooms.get(code)?.exportRecording(note) ?? null
  }

                                            
  isOver(code: string): boolean {
    return this.rooms.get(code)?.isOver() ?? false
  }

  submit(connId: string, code: string, action: InteractiveAction): SubmitResult {
    const room = this.rooms.get(code)
    if (!room) return { ok: false, error: '房间不存在' }
    return room.submit(connId, action)
  }

                        
  undo(connId: string, code: string): SubmitResult {
    const room = this.rooms.get(code)
    if (!room) return { ok: false, error: '房间不存在' }
    return room.undo(connId)
  }

                                                        
  markBot(code: string, seat: PlayerId): void {
    this.rooms.get(code)?.markBot(seat)
  }

                                   
  hasBot(code: string): boolean {
    return this.rooms.get(code)?.hasBot() ?? false
  }


     
                                            
                                                    
                                             
     
  submitRoom(connId: string, code: string, action: RoomAction,
    build: (decks: Readonly<Record<string, string | undefined>>, starter: PlayerId) => InteractiveGame | null): SubmitResult {
    const room = this.rooms.get(code)
    if (!room) return { ok: false, error: '房间不存在' }
    const r = room.submitRoom(connId, action)
    if (!r.ok) return r
    const starter = room.starterFromRoll()
    if (starter) {
      const g = build(room.deckPicks(), starter)
      if (g) room.finishRoll(g)
    }
    return r
  }

                                          
  rematch(connId: string, code: string, makeGame: (decks: Readonly<Record<string, string | undefined>>) => InteractiveGame): SubmitResult {
    const room = this.rooms.get(code)
    if (!room) return { ok: false, error: '房间不存在' }
    if (!room.seatOf(connId)) return { ok: false, error: '观战者不可操作' }
    if (!room.isOver()) return { ok: false, error: '这一局还没结束' }
    room.rematch(makeGame)
    return { ok: true }
  }

  viewFor(connId: string, code: string, sinceSeq = 0): RoomView | { error: string } {
    const room = this.rooms.get(code)
    if (!room) return { error: '房间不存在' }
    return room.viewFor(connId, sinceSeq)
  }

                              
  connectionsOf(code: string): string[] {
    return this.rooms.get(code)?.connections() ?? []
  }

  has(code: string): boolean {
    return this.rooms.has(code)
  }
}
