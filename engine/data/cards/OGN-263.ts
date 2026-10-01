                                           
                                                             
                                                  
                                                                      
                                                      

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { moveObjectInState } from '../../src/state/mutations'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import { isUnit } from '../../src/state/cardTypes'
import { HERO_TAG } from '../heroTags'
import { resolveImplDefId } from '../variantAlias'
import { returnToOwnerHand } from './enter-triggers-batch'

export const OGN_263_CARD_EFFECT =
  '你可以选择支付{{1}}来正面朝下放置一张带有{{待命}}属性的卡牌，而不是支付{{A}}。\n' +
  '支付{{1}}，{{横置}}：将你拥有的一张位于英雄区域或场上的提莫单位牌放入你的手牌。'

                                                 
export const SWIFT_SCOUT_STANDBY_COST = { energy: 1 } as const                     

                                                                        
                                                                
                                                              
                                             


                                                              
                                                                           
                                           
                                                 
                                              
                                                                         
                                                    
                                                            


                                                             
                                           
                                                                       
                                                                 
                                                                                             
                                                                   
  
                               
                                                       
                                                        
                                                                          
                                                            
                                                      
                             

                               
export const SWIFT_SCOUT_HERO_TAG = '提莫'

   
                                                            
                                                                  
                                                   
   
export function isTeemoUnitDef(defId: string): boolean {
  return HERO_TAG[resolveImplDefId(defId, (x) => x in HERO_TAG)] === SWIFT_SCOUT_HERO_TAG
}

                                           
const SWIFT_SCOUT_ZONES = new Set(['heroZone', 'base', 'battlefield'])

                                        
export function swiftScoutTargets(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return o.owner === controller && k !== undefined && SWIFT_SCOUT_ZONES.has(k)
        && isUnit(o) && isTeemoUnitDef(o.defId)
    })
    .map((o) => o.oid as string)
    .sort()
}

export const OGN_263_SPEC: ActivatedSpec = {
  key: 'OGN-263:recall-teemo',
  label: '支付 1 法力并{{横置}}:把一张提莫单位牌放回手牌',
  cost: { mana: 1 },
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, controller): string[] => swiftScoutTargets(state, controller),
  makeResolve: ({ target }) => (state): readonly GameEvent[] => returnToOwnerHand(state, target),
}

export const OGN_263: Card = {
  id: 'OGN-263',
  cardNo: 'OGN·263/298',
  name: '迅捷斥候',
  category: 'legend', // 传奇
  domains: ['blue', 'purple'], // 灵光+混沌(CN库核对,2026-07-20;原误标green)
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
                                                       
    { kind: 'activated', cost: { energy: 1, tap: true }, effect: () => [] },
  ],
}
