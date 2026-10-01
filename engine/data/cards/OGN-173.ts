                                                                     
                                        
                             
                            
  
                                                      
                                                        
                                                                        
                                                 
                                                         
  
                                                    
                                                      
                                                 
                                                                   
                                                                
                                                                 
                                                       
  
                                                             
                                                            
                                                            
                                                 
                                
  
                                                
                                               
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ObjId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'
import { askMoveDestination, moveUnitEvents } from './enemy-move'

export const OGN_173_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n移动一名友方单位，然后让其变为活跃状态。'

                            
export const OGN_173_DEST_KEY = 'windDest'

   
                                                                   
                                                                              
   
const echoCopyKey = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)

export const OGN_173_SPEC: PlaySpec = {
  defId: 'OGN-173', cardNo: 'OGN·173/298', name: '驭风而行', kind: 'spell',
  cost: { mana: 2, pips: [['purple']] },
                                                     
  keywords: ['迅捷'],
  target: 'custom',
                                                                     
                                                                
                                 
  choiceTiming: 'confirm',
                                                                      
  legalTargets: (state, controller): string[] =>
    fieldedUnits(state, { of: controller, friendly: true }) as string[],
  makeNextChoice: ({ movedCardOid, controller, target, echoTimes }) => (state, chosen) => {
                                                                
    for (let c = 0; c <= (echoTimes ?? 0); c++) {
      const q = askMoveDestination({
        state, chosen, key: echoCopyKey(OGN_173_DEST_KEY, c), itemId: `play:${movedCardOid}`, controller, target,
        prompt: '驭风而行:把这名友方单位移动到哪里?',
      })
      if (q !== null) return q
    }
    return null
  },
  makeResolve: ({ target, echoIndex }) => (state, chosen): readonly GameEvent[] => {
    if (target === undefined) return []
    const o = state.objects[target as ObjId]
    if (o === undefined) return []
    return [
                                    
      ...moveUnitEvents(state, target, (chosen ?? {})[echoCopyKey(OGN_173_DEST_KEY, echoIndex ?? 0)]),
                          
      { kind: 'statusChange', target: o.oid, key: 'dormant', value: false } as GameEvent,
    ]
  },
}

export const OGN_173: Card = {
  id: 'OGN-173', cardNo: 'OGN·173/298', name: '驭风而行', category: 'spell',
  domains: ['purple'], energy: 2, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动一名友方单位,然后让它变为活跃(OGN_173_SPEC)' }],
}
