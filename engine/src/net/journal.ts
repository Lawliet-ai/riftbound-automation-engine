                                       
        
                                                                   
                                                   
                                                        

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameEvent } from '../loop/events'

export interface LogEntry {
  readonly seq: number
  readonly turn: number
     
                                                                 
    
                                                         
                                                                             
                                                              
                                                        
                                      
                                                              
     
  readonly kind: GameEvent['kind'] | 'combatEnd' | 'duelEnd' | 'undo'
                                      
  readonly player?: PlayerId
  readonly oid?: string
  readonly defId?: string
  readonly targetOid?: string
  readonly targetDefId?: string
  readonly amount?: number
     
                                                                 
                                                              
                                    
     
  readonly experience?: number
  readonly zoneFrom?: string
  readonly zoneTo?: string
  readonly battlefield?: string
                                         
  readonly outcome?: 'attackerWins' | 'defenderWins' | 'noResult'
  readonly conquered?: PlayerId
  readonly attackerMight?: number
  readonly defenderMight?: number
                                                                                
  readonly result?: string
                                      
  readonly note?: string
                                           
  readonly hiddenFrom?: readonly PlayerId[]
}

                                         
const LOGGED: ReadonlySet<GameEvent['kind']> = new Set([
  'damage', 'destroy', 'destroyed', 'zoneChange', 'gainPoint', 'draw', 'stun', 'playUnit', 'playSpell',
  'summonRune', 'recycle', 'gainResource', 'spend', 'negate', 'insight', 'seize',
  'spawnToken', 'winGame', 'startPhase', 'duelStart', 'hold', 'conquer', 'freeStandby', 'gearManaFree', 'removeDamage', 'playSpellFromZone', 'revealed', 'defend',
                                                                  
                                                                          
                               
  'unitMoved',
                                                            
                                                      
                                                        
  'burn',
                                                                       
                                                                         
                              
  'banish',
                                                                    
                                                                
  'changeController', 'recall',
                                                                    
  'attach', 'detach',
                                                                 
  'standbyPlaced',
                                                                       
  'empower', 'disempower', 'extraTurn',
                                                                           
  'statusChange', 'addBattlefieldZone', 'replaceBattlefieldCard',
                                                        
                                                                  
  'playFree',
])

                                                           
function identityVisibility(zoneId: string | undefined): 'all' | 'owner' | 'none' {
  if (!zoneId) return 'all'
  const kind = zoneId.split(':')[0]
  if (kind === 'hand') return 'owner'
  if (kind === 'standby') return 'owner'                     
  if (kind === 'mainDeck' || kind === 'runeDeck') return 'none'
  return 'all'
}

function hiddenFrom(state: GameState, zoneId: string | undefined, owner: PlayerId | undefined): readonly PlayerId[] | undefined {
  const vis = identityVisibility(zoneId)
  if (vis === 'all') return undefined
  if (vis === 'none') return state.players
  return state.players.filter((p) => p !== owner)
}

   
                                     
                                                     
                       
   
function toEntry(ev: GameEvent, before: GameState, known: ReadonlyMap<string, string>): Omit<LogEntry, 'seq' | 'turn'> | null {
  if (!LOGGED.has(ev.kind)) return null
     
                                                                       
                                                       
                                 
     
  const defOf = (oid: string | undefined): string | undefined =>
    oid === undefined ? undefined : (before.objects[oid]?.defId ?? known.get(oid))
  switch (ev.kind) {
    case 'damage': {
      const t = before.objects[ev.target]
                                                                  
                                        
                                                                
                                                               
                                                                    
                                                             
                                                       
                                                                              
      return { kind: ev.kind, player: t?.controller, targetOid: ev.target, targetDefId: defOf(ev.target),
        amount: ev.amount, oid: ev.source, defId: defOf(ev.source),
        ...(ev.combat === true ? { combat: true } : {}) }
    }
    case 'destroy': {
      const t = before.objects[ev.target]
      return { kind: ev.kind, player: t?.controller, oid: ev.target, defId: defOf(ev.target) }
    }
                                                                                 
                                                                                             
    case 'destroyed':
      return { kind: 'destroy', player: ev.victim.controller, oid: ev.victim.oid, defId: ev.victim.defId }
    case 'zoneChange': {
      const o = before.objects[ev.obj]
      const owner = o?.owner
      return {
        kind: ev.kind, player: o?.controller ?? owner, oid: ev.obj, defId: ev.defId ?? o?.defId,
        zoneFrom: ev.from ?? o?.zone, zoneTo: ev.to,
        ...(hiddenFrom(before, ev.to, owner) ? { hiddenFrom: hiddenFrom(before, ev.to, owner)! } : {}),
      }
    }
    case 'gainPoint': return { kind: ev.kind, player: ev.player, amount: ev.amount }
    case 'draw': return { kind: ev.kind, player: ev.player, amount: ev.count }
    case 'stun': {
      const t = before.objects[ev.target]
      return { kind: ev.kind, player: t?.controller, targetOid: ev.target, targetDefId: defOf(ev.target) }
    }
    case 'playUnit': {
      const o = before.objects[ev.unit]
      return { kind: ev.kind, player: ev.player, oid: ev.unit, defId: defOf(ev.unit), zoneTo: o?.zone }
    }
    case 'playSpell':
      return { kind: ev.kind, player: ev.player, oid: ev.cardOid, defId: defOf(ev.cardOid) }
    case 'summonRune': return { kind: ev.kind, player: ev.player, amount: ev.count }
    case 'recycle': return { kind: ev.kind, player: ev.player, amount: ev.objs.length, hiddenFrom: before.players }
                                              
                                                                                    
                                                            
                                                                       
                                   
    case 'gainResource': return { kind: ev.kind, player: ev.player,
      amount: (ev.mana ?? 0) + (ev.duelMana ?? 0) + Object.values(ev.energy ?? {}).reduce((a, b) => a + b, 0)
        + (ev.restricted ? ev.restricted.mana + Object.values(ev.restricted.energy).reduce((a, b) => a + b, 0) : 0),
      ...(ev.experience ? { experience: ev.experience } : {}) }
                                                                            
                                                           
                                                          
                                             
                                                              
                                                                                 
                                                         
    case 'spend': return { kind: ev.kind, player: ev.player, amount: (ev.cost.mana ?? 0) + (ev.cost.pips?.length ?? 0),
      ...(ev.experience ? { experience: ev.experience } : {}) }
                                                                                  
                                                             
                                                                
                                                  
                                                                             
                                                       
    case 'negate': {
      const item = before.chain.find((c) => c.id === ev.target)
      const d = defOf(item?.cardOid as string | undefined)
                                                                                 
                                             
      return { kind: ev.kind, targetOid: ev.target, ...(d === undefined ? {} : { defId: d }) }
    }
    case 'insight': return { kind: ev.kind, player: ev.player, amount: ev.count, hiddenFrom: before.players.filter((p) => p !== ev.player) }
    case 'seize': {
                                                           
      const item = before.chain.find((c) => c.id === String(ev.target))
      const d = defOf(item?.cardOid as string | undefined) ?? defOf(String(ev.target))
      return { kind: ev.kind, player: ev.newController, targetOid: ev.target, ...(d === undefined ? {} : { defId: d }) }
    }
    case 'spawnToken': return { kind: ev.kind, player: ev.owner, defId: ev.spec.defId, zoneTo: ev.zone }
    case 'winGame': return { kind: ev.kind, player: ev.player }
    case 'startPhase': return { kind: ev.kind, player: ev.player }
    case 'duelStart': return { kind: ev.kind, battlefield: ev.battlefield }
    case 'hold': return { kind: ev.kind, player: ev.player, battlefield: ev.battlefield }
                                                            
                                               
                                                     
                                                           
                                                     
                                     
    case 'conquer': return { kind: ev.kind, player: ev.player, battlefield: ev.battlefield,
      ...(ev.wasOpen === true ? { wasOpen: true } : {}),
      ...(ev.nth !== undefined && ev.nth > 1 ? { nth: ev.nth } : {}) }
                                                                  
    case 'unitMoved': return { kind: ev.kind, player: ev.player, oid: ev.unit, defId: defOf(ev.unit),
      zoneFrom: ev.from, zoneTo: ev.to }
    case 'freeStandby': return { kind: ev.kind, player: ev.player }
    case 'burn': return { kind: ev.kind, player: ev.player, amount: ev.count }
    case 'banish': return { kind: ev.kind, targetOid: ev.target, defId: defOf(ev.target) }
    case 'playFree': return { kind: ev.kind, player: ev.player, oid: ev.obj, defId: defOf(ev.obj) }
                                                                           
                                                                  
                                                                    
                                                                                                  
                                
                                                                 
                                  
    case 'attach': return { kind: ev.kind, player: ev.player, oid: ev.obj, defId: defOf(ev.obj), targetOid: ev.to, targetDefId: defOf(ev.to) }
                                                            
                                                                     
                                                                           
    case 'standbyPlaced': return { kind: ev.kind, player: ev.player, oid: ev.card, defId: defOf(ev.card),
      battlefield: ev.battlefield, hiddenFrom: before.players.filter((p) => p !== ev.player) }
                                                                    
                                                                  
                                                                 
                                                                                  
                                                             
                                                                  
    case 'empower':
    case 'disempower': {
      const t = before.objects[ev.target]
      return { kind: ev.kind, player: t?.controller, targetOid: ev.target, targetDefId: defOf(ev.target) }
    }
    case 'extraTurn': return { kind: ev.kind, player: ev.player }
                                                                
                                                             
                                                           
                                                                            
                                                    
                                                                                       
                                                                         
                                                             
    case 'statusChange': {
      const t = before.objects[ev.target]
      return { kind: ev.kind, player: t?.controller, targetOid: ev.target, targetDefId: defOf(ev.target),
        note: `${ev.key}=${String(ev.value)}` }
    }
    case 'addBattlefieldZone': return { kind: ev.kind, player: ev.owner, defId: ev.defId, battlefield: ev.zoneId }
    case 'replaceBattlefieldCard': return { kind: ev.kind, player: ev.owner, defId: ev.defId, battlefield: ev.zoneId }
    case 'detach': return { kind: ev.kind, oid: ev.obj, defId: defOf(ev.obj) }
    case 'changeController': return { kind: ev.kind, player: ev.player, targetOid: ev.target, defId: defOf(ev.target) }
    case 'recall': return { kind: ev.kind, targetOid: ev.target, defId: defOf(ev.target) }
    case 'gearManaFree': return { kind: ev.kind, player: ev.player }
    case 'removeDamage': return { kind: ev.kind, targetOid: ev.target }
    case 'playSpellFromZone': return { kind: ev.kind, player: ev.player, oid: ev.card }
    case 'revealed': return { kind: ev.kind, player: ev.player, amount: ev.cards.length }
    case 'defend': {
      const u = ev.unit ? before.objects[ev.unit] : undefined
      if (!ev.unit) return null                          
      return { kind: ev.kind, player: ev.player ?? u?.controller, oid: ev.unit, defId: u?.defId, battlefield: ev.battlefield }
    }
    default: return null
  }
}

                                                             
export class Journal {
  private readonly entries: LogEntry[] = []
  private seq = 0
                                                                      
  private readonly known = new Map<string, string>()
                                                                   
  private readonly loggedDestroy = new Set<string>()

     
                                                              
                                      
     
  observe(state: GameState): void {
    for (const [oid, o] of Object.entries(state.objects)) if (!this.known.has(oid)) this.known.set(oid, o.defId)
  }

                                       
  record(ev: GameEvent, before: GameState): void {
    this.observe(before)
    if (ev.kind === 'zoneChange' && ev.defId) this.known.set(ev.obj, ev.defId)
    const partial = toEntry(ev, before, this.known)
    if (!partial) return
    if (partial.kind === 'destroy' && partial.oid !== undefined) {
      if (this.loggedDestroy.has(partial.oid)) return
      this.loggedDestroy.add(partial.oid)
    }
    this.entries.push({ seq: ++this.seq, turn: before.turn, ...partial })
  }

     
                                                           
                                                        
                                      
     
  note(turn: number, entry: Omit<LogEntry, 'seq' | 'turn'>): void {
    if (entry.kind === 'destroy' && entry.oid !== undefined) { // ★1071 替换信号路手写的 destroy 也走同一份去重
      if (this.loggedDestroy.has(entry.oid)) return
      this.loggedDestroy.add(entry.oid)
    }
    this.entries.push({ seq: ++this.seq, turn, ...entry })
  }

                                                     
  projectFor(viewer: PlayerId, sinceSeq = 0): readonly LogEntry[] {
    const out: LogEntry[] = []
    for (const e of this.entries) {
      if (e.seq <= sinceSeq) continue
      if (e.hiddenFrom?.includes(viewer)) {
        const { defId: _d, targetDefId: _t, ...rest } = e
        out.push(rest)
      } else {
        out.push(e)
      }
    }
    return out
  }

  get length(): number {
    return this.entries.length
  }
}
