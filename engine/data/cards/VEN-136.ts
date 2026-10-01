                                                                          
                                                                     
                                                   
                                            
                                      
  
                     
                                                                    
                                                   
                                                                  
                                                                       
  
                                                                     
                                                                   
                                                                           
  
                                                  
                                                            
                                                                   
                            
                                                                 
                                                                                    
                                   
                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isEmpowered } from '../../src/keywords/empower'
import { mightBelowSelfHere } from './group-passives'

                                                                      
export const AMBESSA_DEFIDS: readonly string[] = ['VEN-136', 'VEN-136a']

export const VEN_136_CARD_EFFECT =
  '{{强化1黄色黄色}}（支付{{1}}和{{黄色}}{{黄色}}：强化我。仅在未强化时可用。）\n'
  + ' {{已强化>}} 我获得{{强攻2}}。（如果我是进攻方，则{{S}}+2。）\n'
  + ' {{已强化>}} 当我进攻时，摧毁此处一名战力低于我的敌方单位。'

   
            
                                                          
                                                      
   
export const VEN_136_KEYWORDS: readonly string[] = ['强化1黄色黄色']
                           
export const AMBESSA_PICK = 'ambessaKill'

   
                                      
                                                             
   
export function makeAmbessaAttackTrigger(defId: string, selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'destroy', target: { ref: 'chosen', key: AMBESSA_PICK } }],
  })
  return compileTrigger({
    id: `${defId}:attack:${selfOid}`, rawId: true, sourceDefId: defId,
    event: 'attack',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当**我**进攻时」——别人进攻不算
                                                             
    additionalCondition: (state: GameState) => isEmpowered(state.objects[selfOid]),
    choose: {
      key: AMBESSA_PICK,
      prompt: '安蓓萨:摧毁此处一名战力低于我的敌方单位',
      selector: {
        type: 'unit', zone: 'battlefield', atSelfZone: true, controller: 'opponent', isTarget: true,
                                                              
                                                                
        filter: (obj: GameObject, state: GameState): boolean => {
          const self = state.objects[selfOid]
          return self !== undefined && mightBelowSelfHere('enemy')(obj, self, state)
        },
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                             
export const AMBESSA_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(AMBESSA_DEFIDS.map((id) => [id, (oid: ObjId, ctrl: PlayerId) => [makeAmbessaAttackTrigger(id, oid, ctrl)]]))

                         
export const AMBESSA_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(AMBESSA_DEFIDS.map((id) => [id, VEN_136_KEYWORDS]))

const makeCard = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '安蓓萨', category: 'unit', // 英雄单位 → unit
  domains: ['yellow'], energy: 5, power: 5, keywords: [...VEN_136_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化1黄色黄色] §827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '[已强化>] 获得[强攻2](empowered-passives 的关键词表)' },
    { kind: 'passive', describe: '[已强化>] 进攻时摧毁此处战力低于我的敌方单位(makeAmbessaAttackTrigger)' },
  ],
})
export const VEN_136: Card = makeCard('VEN-136', 'VEN·136')
export const VEN_136A: Card = makeCard('VEN-136a', 'VEN·136a')
export const AMBESSA_CARDS: readonly Card[] = [VEN_136, VEN_136A]
