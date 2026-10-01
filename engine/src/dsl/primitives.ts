                                                         
                                                                               
                                                     

import type { StaticEffect } from '../effects/continuousView'
import type { GameEvent } from '../loop/events'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'

export interface CollectedOps {
  readonly events: GameEvent[]
  readonly effects: Omit<StaticEffect, 'timestamp'>[]
  readonly wins: PlayerId[]
}

                                              
export interface PrimitiveApi {
                    
  damage(target: ObjId, amount: number, source?: ObjId): void
                                 
  gainPoint(player: PlayerId, amount: number): void
                                  
  move(obj: ObjId, to: ZoneId): void
                         
  destroy(target: ObjId): void
                                  
  setStatus(target: ObjId, key: string, value: boolean): void
                                                 
  applyRestriction(effect: Omit<StaticEffect, 'timestamp'>): void
                                            
  winGame(player: PlayerId): void
}

export function createPrimitiveApi(): { api: PrimitiveApi; ops: CollectedOps } {
  const events: GameEvent[] = []
  const effects: Omit<StaticEffect, 'timestamp'>[] = []
  const wins: PlayerId[] = []
  const api: PrimitiveApi = {
    damage: (target, amount, source) => {
      events.push(source !== undefined ? { kind: 'damage', target, amount, source } : { kind: 'damage', target, amount })
    },
    gainPoint: (player, amount) => events.push({ kind: 'gainPoint', player, amount }),
    move: (obj, to) => events.push({ kind: 'zoneChange', obj, to }),
    destroy: (target) => events.push({ kind: 'destroy', target }),
    setStatus: (target, key, value) => events.push({ kind: 'statusChange', target, key, value }),
    applyRestriction: (effect) => effects.push(effect),
    winGame: (player) => wins.push(player),
  }
  return { api, ops: { events, effects, wins } }
}
