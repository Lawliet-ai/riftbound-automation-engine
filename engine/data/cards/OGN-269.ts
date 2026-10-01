                                                                        
                                                    
                                             
                                                
                                                
                           
                           
  
                                            
                                                         
                                                                       
                  
                                                
                                                  
                                              
                                            
                                                          
                                                      
                                                        
                                            
                                                      
                                                           
                                                               
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { hasBuff, consumeBuffInState } from '../../src/keywords/buff'
import { payFromState } from '../../src/game/economy'
import { clearDamageDormantRecall } from '../../src/state/recall'

export const OGN_269_CARD_EFFECT =
  '如果一名拥有增益且受你控制的单位被摧毁，则你可以选择支付{{A}}、让我变为休眠状态'
  + '并消耗该单位身上的增益，以此改为移除该单位所受伤害，让其进入休眠状态，并将其召回。'
  + '（把该单位送回基地，此行动不算作移动。）\n'
  + '当你征服一处战场时，让我变为活跃状态。'

                                                        
export const OGN_269_COST: Cost = { pips: [[]] }
                                                              
const SETT_IDS = new Set(['OGN-269', 'OGN-310', 'OGN-310*'])

                                                  
function readySettOf(state: GameState, controller: PlayerId): ObjId | null {
  for (const o of Object.values(state.objects)) {
    if (SETT_IDS.has(o.defId) && o.controller === controller && o.status.tapped !== true) return o.oid
  }
  return null
}

   
                                                         
                                                           
   
export function settSave(state: GameState, oid: ObjId): GameState | null {
  const dying = state.objects[oid]
  if (dying === undefined || !isUnit(dying)) return null
  if (!hasBuff(dying)) return null                      
  const sett = readySettOf(state, dying.controller)                       
  if (sett === null) return null
                                                 
  const paid = payFromState(state, dying.controller, OGN_269_COST)
  if (!paid.ok) return null
                                                         
  let s = paid.state
  const so = s.objects[sett]!
  s = { ...s, objects: { ...s.objects, [sett]: { ...so, status: { ...so.status, tapped: true } } } }
                                               
  s = consumeBuffInState(s, oid)
                                       
  return clearDamageDormantRecall(s, oid)
}

                                                  
export function makeSettReadyTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-269-ready:${selfOid}`, rawId: true, sourceDefId: 'OGN-269',
    event: 'conquer',
    by: 'you',
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // ㊼ ★712 双保险
    effect: (state: GameState): readonly GameEvent[] => {
      const self = state.objects[selfOid]
      if (!self) return []
                                      
      return [{ kind: 'statusChange', target: selfOid, key: 'tapped', value: false } as GameEvent]
    },
  }, selfOid, controller)
}

export const OGN_269: Card = {
  id: 'OGN-269', cardNo: 'OGN·269/298', name: '腕豪', category: 'legend',
  domains: ['orange', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '有增益的友方单位被摧毁⇒可付{A}+休眠我+耗增益改为救回(settSave·replaceDestroy第七条);征服⇒我变活跃(makeSettReadyTrigger)' },
  ],
}
