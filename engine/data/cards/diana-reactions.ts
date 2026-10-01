                                                               
                                           
                                                         
                                                        
                                 

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                                 
import { fieldedUnits } from './activated-batch'                 

export const OGN_172_CARD_EFFECT = '{{迅捷}}（可在你的回合或法术对决中打出。）\n让一名战场上的单位返回其所属的手牌。'
export const VEN_052_CARD_EFFECT = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n选择一个效果 —\n- 让一名友方单位返回其所属的手牌。\n- 给予一名敌方单位在本回合内{{S}}-2。'
export const OGN_104_CARD_EFFECT = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n让一名友方单位返回其所属的手牌，然后让其拥有者召出一枚休眠的符文。'
export const SFD_087_CARD_EFFECT = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n抽三张牌。'

                         
export function battlefieldUnits(state: GameState): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                           
                                                                          
                                                      
      if (o && isUnitDefId(o.defId) && isUnit(o)) out.push(oid)
    }
  }
  return out
}

                                                                                    
   
                                                   
  
                                                       
                                                                                    
                                                                   
                                                         
                                                                     
                                                                                        
                                                
                                                 
                                                     
                                             
                                          
  
                                                                 
                                                                 
                                                                            
                                                                                   
                                                              
                                                                          
                                             
                                                                           
                                                              
                                                      
                                                                   
                                                                
                                                                
                                                        
                                                                 
                                                    
                                              
                                                          
  
                                                   
                                                    
                                                                               
                                                          
                                                                                       
                                               
                                                                         
                                                                                          
                                                                                       
                                               
                                                                             
                                                                 
                                                                   
                                                              
                                        
                                                                
                                                  
                                                        
                                                 
   
export function friendlyUnits(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true }).map((o) => o as string)
}

export const OGN_172: Card = {
  id: 'OGN-172', cardNo: 'OGN·172/298', name: '责退', category: 'spell', domains: ['purple'],
  energy: 2, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '弹回一名战场上单位(PlaySpec 于 registry)' }],
}
                                                              
                                            
                                      
                                                                                
export const VEN_035_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n选择一个效果 —\n' +
  '- 强化一名单位。回合结束时，解除其强化。\n- 解除一名{{已强化}}单位的强化。在回合结束时，强化该单位。'
export const VEN_035: Card = {
  id: 'VEN-035', cardNo: 'VEN·035', name: '念化盈虚', category: 'spell', domains: ['green'],
  energy: 3, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '二选一:强化+回合末解除/解除+回合末强化(PlaySpec 于 registry;empowerFlipAtTurnEnd)' }],
}
export const VEN_052: Card = {
  id: 'VEN-052', cardNo: 'VEN·052', name: '惑心转意', category: 'spell', domains: ['blue'],
  energy: 1, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '二选一:友方返手/敌方-2S(PlaySpec 于 registry)' }],
}
export const OGN_104: Card = {
  id: 'OGN-104', cardNo: 'OGN·104/298', name: '择日再战', category: 'spell', domains: ['blue'],
  energy: 1, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '友方返手+召休眠符文(PlaySpec 于 registry)' }],
}
export const SFD_087: Card = {
  id: 'SFD-087', cardNo: 'SFD·087/221', name: '先知之兆', category: 'spell', domains: ['blue'],
  energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '抽三张牌(PlaySpec 于 registry)' }],
}
