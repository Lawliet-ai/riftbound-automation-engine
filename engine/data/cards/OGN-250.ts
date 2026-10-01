                                                                
                                                            
                                                 
                       
  
                          
                                        
                                            
                                               
                                                 
                                                       
                                                                                       
                                                           
                                                 
                                                     
  
                      
                                                                      
                                        
                                                     
                                                                
                                                                  
                                             
  
                              
                                                    
                                                
                                                  
                                                    
                                                              
                                                        
                                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { zonesByKind } from '../../src/state/gameState'
import { effectiveMight } from '../../src/state/might'
import { enemyUnitsAt } from './damage-split'                      
import { moveUnitEvents } from './enemy-move'
import { baseAlliesOf } from './OGN-270'                                                                                       

export const OGN_250_CARD_EFFECT =
  '选择你基地中的一名友方单位，对一处战场上的所有敌方单位造成等同于该友方单位战力的伤害，然后将该友方单位移动到此战场。'

                   
export const OGN_250_BF_KEY = 'thunderBf'

   
                        
  
                                          
  
                                                                                         
                                                            
  
                                                    
                              
                     
                                                                                                        
                                                                                    
                                                                                                
                                               
                                                                      
                                                                                 
                                    
                                                                            
                                                            
                                        
  
                                                  
                                                          
                                                                                
                                                               
                                                  
                                                       
                                                                              
                                                                         
   
export function thunderMovers(state: GameState, controller: PlayerId): string[] {
  return baseAlliesOf(state, controller as string)
}

                                       
export function thunderBattlefields(state: GameState): string[] {
  return zonesByKind(state, 'battlefield').map((z) => z.id as string).sort()
}

                                                     
export function thunderTargetLive(state: GameState, controller: PlayerId, target: string | undefined): boolean {
  return target !== undefined && thunderMovers(state, controller).includes(target)
}

export const OGN_250_SPEC: PlaySpec = {
  defId: 'OGN-250', cardNo: 'OGN·250/298', name: '天声震落', kind: 'spell',
                                                                       
                                                            
  cost: { mana: 6, pips: [['red'], ['orange']] },
  keywords: [],
                                                                    
                                                             
  choiceTiming: 'confirm',
                                                          
                                                    
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => thunderMovers(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) => (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
    if (chosen[OGN_250_BF_KEY] !== undefined) return null
                                                
    if (!thunderTargetLive(state, controller, target)) return null
    const bfs = thunderBattlefields(state)
    if (bfs.length === 0) return null                        
    return {
      itemId: `play:${movedCardOid}`,
      controller,
      key: OGN_250_BF_KEY,
      prompt: '天声震落:对哪一处战场上的所有敌方单位造成伤害?(然后把那名单位移过去)',
      isTarget: true, // ★1781 §355.7:「对一处战场上的所有敌方单位造成…伤害」
      candidates: bfs.map((z) => ({ id: z, label: z })),
    }
  },
  makeResolve: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) => (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                        
    if (!thunderTargetLive(state, controller, target)) return []
    const bf = (chosen ?? {})[OGN_250_BF_KEY]
    if (bf === undefined || !thunderBattlefields(state).includes(bf)) return []
                                                      
    const amount = effectiveMight(state.objects[target as ObjId]!).reference
    const out: GameEvent[] = []
                                                       
    for (const foe of enemyUnitsAt(state, bf, controller)) {
      out.push({
        kind: 'damage', target: foe as ObjId, amount,
                                                           
        source: movedCardOid as ObjId, sourcePlayer: controller,
      } )
    }
                                              
                                                                         
    out.push(...moveUnitEvents(state, target, bf))
    return out
  },
}

export const OGN_250: Card = {
  id: 'OGN-250', cardNo: 'OGN·250/298', name: '天声震落', category: 'spell',
  domains: ['red', 'orange'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '基地一名友方的战力打某处全部敌方,然后把它移过去(OGN_250_SPEC)' }],
}
