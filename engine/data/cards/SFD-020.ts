                                                                       
                                                      
                                                    
                                                                
                                                          
                                                                
                                                           
                                                                 
                                                                     
                                                   
                                               
                                                              
                                                               
                                                             
  
                                                   
                                                        
                                                              
                                                               
                                                                         
  
                                     
                                                                                            
                                                                                  
                                                                
                                                                               
                                                            
                                                                     
                                                                   
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'                       
import type { GameState } from '../../src/state/gameState'
import { payFromState } from '../../src/game/economy'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { wonBattle } from './won-battle-triggers'                   
import { GOLD_TOKEN } from './gear-triggers'                  

                                                        
export const SFD_020_CARD_EFFECT =
  '当我赢得战斗时，打出一个休眠的“金币”装备指示物。\n当我进攻或防守时，你可以选择支付{{红色}}。若如此做，则让我在本回合内{{S}}+2。'

                                    
export const SFD_020_BONUS = 2

                                     
export function makeDravenWonBattleTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-020:wonBattle:${selfOid}`, rawId: true, sourceDefId: 'SFD-020',
    event: 'battleEnd',
    by: 'any', // 谁发起的战斗都算(与 won-battle 那族同口径)
    when: [{ kind: 'custom', test: (ev: GameEvent): boolean => wonBattle(ev, selfOid, controller) }],
    effect: (): readonly GameEvent[] => [{
      kind: 'spawnToken', spec: GOLD_TOKEN, zone: `base:${controller}` as ZoneId, owner: controller,
      dormant: true, // 「**休眠的**」——装备指示物落成 tapped(★611 的分野)
    } ],
  }, selfOid, controller)
}

   
                                                    
                                                
  
                                            
                                                       
                                                        
                                       
                                                         
                                                           
                                              
                                                                      
                                                
                                                       
                                                               
                                                                 
                                                 
                                                                             
                                                         
   
                                                       
export const SFD_020_COST: Cost = { pips: [['red']] }
export function makeDravenPumpTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const effect = compileEffect({
    then: [{
      op: 'addMight', target: { ref: 'self' }, delta: SFD_020_BONUS,
      duration: 'thisTurn', // 「**本回合内**」——不是永久
      id: `SFD-020:${selfOid}`,
    }],
  })
  return (['attack', 'defend'] as const).map((event) => compileTrigger({
    id: `SFD-020:${event}:${selfOid}`, rawId: true, sourceDefId: 'SFD-020',
    abilityKey: `SFD-020:pump:${selfOid}`, // ★★★ 一卡多时机共用一个 abilityKey(★610 的反面)
    event, by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻或防守时」
    mayChoose: true, // §383.3.a「你可以选择」
                                                                   
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, SFD_020_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller))
}

const draven = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '德莱文', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '赢得战斗打出休眠金币;进攻或防守时可付红色本回合[S]+2(两条触发共用 abilityKey)' }],
})
                                                  
export const SFD_020: Card = draven('SFD-020', 'SFD·020/221')
