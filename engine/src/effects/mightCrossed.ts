                                                                   
                                            
                                   
                                                                    
                                                                    
                                                          
                                                               
                                                  
                                                            
import type { GameState } from '../state/gameState'
import type { GameEvent } from '../loop/events'
import type { ObjId } from '../state/ids'
import { isUnit } from '../state/cardTypes'

                                                 
export function collectMightCrossed(before: GameState, after: GameState): GameEvent[] {
  const out: GameEvent[] = []
  for (const [oid, o] of Object.entries(after.objects)) {
    if (!isUnit(o)) continue
    const afterKind = after.zones[o.zone]?.kind
    if (afterKind !== 'battlefield' && afterKind !== 'base') continue
    const beforeObj = before.objects[oid as ObjId]
    if (!beforeObj) continue                                    
    const beforeKind = before.zones[beforeObj.zone]?.kind
    if (beforeKind !== 'battlefield' && beforeKind !== 'base') continue                  
    const fromMight = beforeObj.derived?.might ?? beforeObj.baseMight
    const toMight = o.derived?.might ?? o.baseMight
    if (toMight > fromMight) {
      out.push({ kind: 'mightCrossed', unit: oid as ObjId, controller: o.controller, from: fromMight, to: toMight } as GameEvent)
    }
  }
  return out
}
