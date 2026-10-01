                                       
                                                                    
                                                                           
                                                                 

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import { valuedKeywordTotal } from '../effects/valuedKeyword'
import type { StaticEffect } from '../effects/continuousView'
import { stateWithPassives } from '../effects/liveKeywords'
import { currentKeywords } from '../state/object'
import { safePredicate } from '../effects/safePredicate'

                                                        
export function deflectValue(obj: GameObject): number {
  const kws = currentKeywords(obj)
  let total = 0
  for (const k of kws) {
    if (k === '法盾') total += 1                     
    else if (k.startsWith('法盾')) {
      const n = Number.parseInt(k.slice(2), 10)
      if (!Number.isNaN(n)) total += n       
    }
  }
  return total
}

   
                                                  
                                                                  
   
export function deflectSurcharge(
  state: GameState,
  targetOid: ObjId,
  caster: PlayerId,
  suppressed = false,
): number {
  if (suppressed) return 0
  const o = state.objects[targetOid]
  if (!o || o.controller === caster) return 0          
                                                                                                                     
  return valuedKeywordTotal(stateWithPassives(state), o, '法盾', safePredicate)                                                                                                
}

   
                                                   
                                          
   
export function totalDeflectSurcharge(
  state: GameState,
  targetSelections: readonly ObjId[],
  caster: PlayerId,
): number {
  return targetSelections.reduce((sum, oid) => sum + deflectSurcharge(state, oid, caster), 0)
}
