                                                                      
                                        
                                     
                                   
  
                                               
                                      
                            
                                                       
                                                            
                                                              
  
                  
                                             
                                                           
                                                            
                                           
                                                   
                             
  
                                                           
                                                          
                                  
                                                   
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { enemyUnitsOnField, moveUnitEvents } from './enemy-move'

export const SFD_129_CARD_EFFECT =
  '{{回响2}}（你可以选择支付此额外费用，以重复此法术效果。）\n将一名敌方单位移动到其控制者的其他单位所在的一处位置。'

                            
export const SFD_129_DEST_KEY = 'baitDest'

   
                                                                   
                                                                              
   
const echoCopyKey = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)

   
                                         
                                              
                                                 
   
export function baitDestinations(state: GameState, unitOid: string): string[] {
  const me = state.objects[unitOid as ObjId]
  if (me === undefined) return []
  const here = me.zone as string
  const zones = new Set<string>()
  for (const o of Object.values(state.objects)) {
                                                         
                                                              
                                                         
                                                               
    if ((o.oid as string) === unitOid) continue
    if (o.controller !== me.controller) continue               
    if (!isUnit(o)) continue
    const k = state.zones[o.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') continue                       
    if ((o.zone as string) === here) continue                    
    zones.add(o.zone as string)
  }
  return [...zones].sort()
}

export const SFD_129_SPEC: PlaySpec = {
  defId: 'SFD-129', cardNo: 'SFD·129/221', name: '诱饵', kind: 'spell',
  cost: { mana: 2 },
  echo: { mana: 2 }, // §820 [回响2]:额外费用,付了就再执行一次(引擎侧的事)
  keywords: [], // ★[回响N] 不是印刷关键词横幅那条路,这里必须留空
  target: 'custom',
                                                                       
                                                                           
  choiceTiming: 'confirm',
  legalTargets: (state, controller): string[] => enemyUnitsOnField(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target, echoTimes }) => (state, chosen) => {
    if (target === undefined) return null
    const dests = baitDestinations(state, target)
    if (dests.length === 0) return null                          
                                                                
    for (let c = 0; c <= (echoTimes ?? 0); c++) {
      const key = echoCopyKey(SFD_129_DEST_KEY, c)
      if (chosen[key] !== undefined) continue                
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key,
        prompt: '诱饵:把这名敌方单位移动到哪一处(它同伴所在的位置)?',
        candidates: dests.map((z) => ({ id: z, label: z })),
      }
    }
    return null
  },
  makeResolve: ({ target, echoIndex }) => (state, chosen): readonly GameEvent[] => {
                                                              
    const to = (chosen ?? {})[echoCopyKey(SFD_129_DEST_KEY, echoIndex ?? 0)]
                                            
                                   
    if (target === undefined || to === undefined) return []
    if (!baitDestinations(state, target).includes(to)) return []
    return moveUnitEvents(state, target, to)
  },
}

export const SFD_129: Card = {
  id: 'SFD-129', cardNo: 'SFD·129/221', name: '诱饵', category: 'spell',
  domains: ['purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '把一名敌方单位挪到它同伴所在的位置(SFD_129_SPEC)' }],
}
