                                                               
                                    
                                             
  
       
                                         
                                                           
                                                        
                                      
                                      
                                                           
                                         
                                                                     
                                
                                                                                 
                                                       
                                                         
                                      
                                                             
                                       
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'

export const OGN_227_CARD_EFFECT =
  '当你作为进攻方时，如果战斗以平局告终，则召回双方所有单位。' +
  '（把该单位送回基地，此行动不算作移动。平局将在造成战斗伤害后结算。）'

                                                      
export function unitsToRecall(state: GameState): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => isUnit(o) && state.zones[o.zone]?.kind === 'battlefield')
    .map((o) => o.oid)
}

                                         
export function attackerDrewBattle(ev: GameEvent, controller: PlayerId): boolean {
  if (ev.kind !== 'battleEnd') return false
  const e = ev as unknown as { attacker: PlayerId; outcome: string }
  return e.attacker === controller && e.outcome === 'noResult'
}

export function makeSolariCrestTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-227:draw:${selfOid}`, rawId: true, sourceDefId: 'OGN-227',
    event: 'battleEnd',
    by: 'any', // 「当**你**作为进攻方时」由 attacker 判,不靠批次 actor(㊵)
    when: [{ kind: 'custom', test: (ev) => attackerDrewBattle(ev, controller) }],
                                                                           
                                                                                            
                                                                    
                                                                    
                                                              
                                                       
                                       
                                                               
                                                                        
                                                           
                                                             
                                         
    effect: (state: GameState): readonly GameEvent[] =>
      unitsToRecall(state).map((oid) => ({ kind: 'recall', target: oid } as GameEvent)),
  }, selfOid, controller)
}

export const OGN_227: Card = {
  id: 'OGN-227', cardNo: 'OGN·227/298', name: '烈阳徽记', category: 'equipment',
  domains: ['yellow'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我方进攻的战斗打成平局时召回双方所有单位(makeSolariCrestTrigger)' }],
}
