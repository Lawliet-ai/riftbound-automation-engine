                                                                      
                                        
                                                  
  
                 
                                                                                 
                                                          
                                                  
                                                            
                                                           
                    
  
                   
                                                      
                                                            
                                        
                                                  
                                                                                   
                                                    
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                                   
import { grantKeywordEvent } from './activated-batch'
import { selfBattlefield } from '../../src/state/selfHere'                                   
import { spendExperienceCost } from './spend-xp-buff-self'

export const UNL_126_CARD_EFFECT = '消耗3经验：你在此处的单位在本回合内获得{{游走}}。'
                                       
export const UNL_126_XP = 3
export const UNL_126_KEYWORD = '游走'

   
                                                        
                
                                                       
   
export function kraken126Targets(state: GameState, selfOid: ObjId, controller: PlayerId): ObjId[] {
                                                                   
                                                 
                                          
                                                         
                                                              
                                                           
                                                                    
                                                           
                                                                        
                                 
                                                            
                                                                                     
                                                                            
  const hereId = selfBattlefield(state, selfOid)
  const here = hereId === undefined ? undefined : state.zones[hereId as ZoneId]
  if (!here) return []                                       
  return here.contents.filter((oid) => {
    const o = state.objects[oid]
                                                                   
                                                        
                                                                   
                                     
    return !!o && o.controller === controller && isUnitDefId(o.defId) && isUnit(o)
  })
}

export const UNL_126_ACTIVATED: ActivatedSpec = {
  key: 'UNL-126:roam',
  label: `[消耗${UNL_126_XP}经验] 你在此处的单位本回合获得[${UNL_126_KEYWORD}]`,
  cost: {}, // 冒号前没有资源费
  target: 'none',
  extraCost: spendExperienceCost(UNL_126_XP), // §730.2 非资源额外费用(㊼ 只此一处定义)
  makeResolve: ({ selfOid, controller }) => (state): readonly GameEvent[] =>
    kraken126Targets(state, selfOid as ObjId, controller)
      // 「**本回合内**」⇒ 缺省时限 thisTurn
      .map((oid) => grantKeywordEvent(`UNL-126:roam:${selfOid}`, oid as string, UNL_126_KEYWORD)),
}

export const UNL_126: Card = {
  id: 'UNL-126', cardNo: 'UNL-126/219', name: '巨牙海兽', category: 'unit',
                                                         
  domains: ['purple'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '消耗3经验:此处我方单位本回合获[游走](UNL_126_ACTIVATED)' }],
}
