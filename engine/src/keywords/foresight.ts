                                                         
  
                                      
                                                          
                                          
                             
                                    
                                                 
                                                     
                                       
                                                
               
                                                 
                                  
                                          
  
                                                     
                                                        
  
                                                                
                                         
  
                                              
                                           

import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import type { ObjId, PlayerId } from '../state/ids'
import { DEFAULT_INSIGHT, topOfDeck } from './insight'
import type { Trigger } from '../dsl/trigger'
                                                                       
import { passiveDefId } from '../../data/passiveIdentity'
import type { GameEvent } from '../loop/events'

export const FORESIGHT = '预知'

                                                           
                                                                                
                                                     
                                                           

   
                                
                                             
   
export function foresightTriggerCount(keywords: readonly string[] | undefined): number {
  return (keywords ?? []).filter((k) => k === FORESIGHT).length
}

                                                 
export const FORESIGHT_INSIGHT_AMOUNT = DEFAULT_INSIGHT

   
                                    
                                           
                          
                                                        
   
export function foresightPeek(state: GameState, player: PlayerId): ObjId | undefined {
  return topOfDeck(state, player, FORESIGHT_INSIGHT_AMOUNT)[0]
}

   
                                                          
                       
  
                                                        
                                                          
  
                                                         
                                           
                                                   
                                   
   
export function makeForesightTriggers(
  state: GameState,
     
                                                               
                                                  
                                                                
     
  sourcesOf: (o: GameObject) => readonly string[],
): Trigger[] {
  const out: Trigger[] = []
  for (const o of Object.values(state.objects)) {
    const kind = state.zones[o.zone]?.kind
    if (kind !== 'base' && kind !== 'battlefield') continue                    
    const kws = sourcesOf(o)
    const n = foresightTriggerCount(kws)
    if (n === 0) continue
    const selfOid = o.oid
    const controller = o.controller
    for (let i = 0; i < n; i++) {
      out.push({
        id: `foresight:${i}:${selfOid}`,
        sourceOid: selfOid,
        sourceDefId: passiveDefId(o),
        controller,
        event: 'playUnit',
        by: 'you',
        activeZone: ['base', 'battlefield'],
        filter: (ev) => ev.kind === 'playUnit' && ev.unit === selfOid,
        nextChoice: (s, _ev, chosen) => {
          if (chosen.recycle !== undefined) return null
          const top = foresightPeek(s, controller)
          if (top === undefined) return null                                     
          const label = s.objects[top]?.defId ?? String(top)
          return {
            itemId: `trig:foresight:${i}:${selfOid}`,
            controller,
            key: 'recycle',
            prompt: `预知:牌堆顶是〈${label}〉,是否回收到牌堆底?`,
            candidates: [{ id: 'no', label: '保留在牌堆顶' }, { id: 'yes', label: '回收到牌堆底' }],
          }
        },
        effect: (_s, _ev, chosen): readonly GameEvent[] =>
                                                 
                                                  
          chosen?.recycle === 'yes'
            ? [{ kind: 'insight', player: controller, count: DEFAULT_INSIGHT, recycleAll: true }]
            : [],
      })
    }
  }
  return out
}
