                                                  
  
                                                  
        
                                            
                                                   
                                                        
                                                      
                                                                  
  
                                              
                                                            
                                                                 

import type { GameState } from '../state/gameState'
import type { GameEvent } from '../loop/events'
import type { Trigger } from '../dsl/trigger'
import type { ObjId } from '../state/ids'
import { attachedTo } from '../state/attach'

               
const MIRROR: Readonly<Record<'conquer' | 'hold', 'conquer' | 'hold'>> = { conquer: 'hold', hold: 'conquer' }

                                     
function asTiming(ev: GameEvent, timing: 'conquer' | 'hold'): GameEvent {
  if (ev.kind !== 'conquer' && ev.kind !== 'hold') return ev
  return { kind: timing, player: ev.player, battlefield: ev.battlefield } as GameEvent
}

   
                                                      
                                                      
   
function belongsToUnit(state: GameState, t: Trigger, unitOid: ObjId): boolean {
  if (t.sourceOid === null) return false
  if (t.sourceOid === unitOid) return true
  const src = state.objects[t.sourceOid]
  return !!src && attachedTo(src) === unitOid
}

   
                                                       
                       
  
                                               
                                    
                                         
   
export function mirrorScoringTriggers(
  state: GameState,
  triggers: readonly Trigger[],
  mirroredUnits: readonly ObjId[],
     
                                                                     
                                                            
                                                                 
     
  only?: 'conquer' | 'hold',
): Trigger[] {
  if (mirroredUnits.length === 0) return []
  const out: Trigger[] = []
  for (const unitOid of new Set(mirroredUnits)) {
    const mine = triggers.filter((t) => belongsToUnit(state, t, unitOid))
                                     
    const covered = new Set(mine.map((t) => `${t.event}|${t.abilityKey ?? t.id}`))
    for (const t of mine) {
      if (t.event !== 'conquer' && t.event !== 'hold') continue
      if (only !== undefined && t.event !== only) continue                        
      const to = MIRROR[t.event]
      const key = `${to}|${t.abilityKey ?? t.id}`
      if (covered.has(key)) continue                    
      covered.add(key)
      const from = t.event
                                                                                                                         
                                                                                                           
      if (triggers.some((x) => x.id === `mirror:${to}:${t.id}`)) continue
      out.push({
        ...t,
        id: `mirror:${to}:${t.id}`,
        event: to,
                                                
        ...(t.filter ? { filter: (ev: GameEvent, s: GameState) => t.filter!(asTiming(ev, from), s) } : {}),
        ...(t.nextChoice
          ? { nextChoice: (s: GameState, ev: GameEvent, chosen: Readonly<Record<string, string>>) => t.nextChoice!(s, asTiming(ev, from), chosen) }
          : {}),
        effect: (s: GameState, ev: GameEvent, chosen?: Readonly<Record<string, string>>) => t.effect(s, asTiming(ev, from), chosen),
      })
    }
  }
  return out
}
