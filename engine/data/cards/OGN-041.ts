                                                                      
                                                      
                                                
                                            
  
          
                                                             
                                                             
                                                                        
  
                                         
                                                                                         
                          
                                            
                                                       
                                        
                                                 
  
                                              
                                          
                                             
import { splitPoolBoost } from './damage-boost'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { selfBattlefield } from '../../src/state/selfHere'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { multiSelectPicked } from '../../src/loop/multiSelect'
import { enemyUnitsAt, splitDamageChoice, splitDamageEvents, targetableSplitPool } from './damage-split'

export const OGN_041_CARD_EFFECT =
  '{{法盾2}}（对手必须额外支付{{A}}{{A}}才能将我选为法术或技能的目标。）\n'
  + '当我进攻时，对此处的敌方单位造成共计5点伤害，可在多名敌方单位之间分摊。'

                               
export const OGN_041_TOTAL = 5
                                                   
export const OGN_041_KEYWORDS: readonly string[] = ['法盾2']

const prefixOf = (selfOid: ObjId): string => `OGN-041:hit:${selfOid}`

                                                                
export function makeVolibear041Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-041:attack:${selfOid}`
  const prefix = prefixOf(selfOid)
  return compileTrigger({
    id, rawId: true, sourceDefId: 'OGN-041',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」
    nextChoice: (state, _ev, chosen) => splitDamageChoice({
      itemId: id,
      controller,
      prefix,
                                                            
      prompt: `沃利贝尔:把共计${OGN_041_TOTAL + splitPoolBoost(state, selfOid as string, controller as string, enemyUnitsAt(state, selfBattlefield(state, selfOid), controller)[0])}点伤害分摊给此处的敌方单位(每次1点)`,
      budget: OGN_041_TOTAL + splitPoolBoost(state, selfOid as string, controller as string, enemyUnitsAt(state, selfBattlefield(state, selfOid), controller)[0]),
                                                        
                                                         
                                                               
                               
                                                                
                                                                          
                                                                         
                                                        
      isTarget: true,
      candidates: (st) => enemyUnitsAt(st, selfBattlefield(st, selfOid), controller),
    })(state, chosen),
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      if (!state.objects[selfOid]) return []                              
                                                                           
      const bf = selfBattlefield(state, selfOid)
      const here = new Set(enemyUnitsAt(state, bf, controller))
                                                 
                                                                  
                                                                               
                                                                    
      const landed = targetableSplitPool(state, controller, multiSelectPicked(chosen, prefix).filter((oid) => here.has(oid)))
                                                                                   
                                                                 
                                                                
      return [...splitDamageEvents({
        picks: landed,
        budget: OGN_041_TOTAL + splitPoolBoost(state, selfOid as string, controller as string, [...here][0]), // ★895 池预加(结算时现算)
        sourcePlayer: controller,
        source: selfOid as string, // ★这张的来源是【我自己】(阿尔法突袭是那名被选中的单位)
      })]
    },
  }, selfOid, controller)
}

export const OGN_041: Card = {
  id: 'OGN-041', cardNo: 'OGN·041/298', name: '沃利贝尔', category: 'unit',
  domains: ['red'], energy: 10, power: 9, keywords: [...OGN_041_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[法盾2]§809 对手额外付{A}{A}才能选我为目标(通用求值)' },
    { kind: 'passive', describe: '进攻时对此处的敌方单位造成共计5点伤害、可分摊(makeVolibear041Trigger)' },
  ],
}

export const OGN_041A: Card = { ...OGN_041, id: 'OGN-041a', cardNo: 'OGN·041a/298' }
