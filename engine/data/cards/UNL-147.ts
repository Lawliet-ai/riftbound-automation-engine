                                                                       
                              
                                             
                                                
                       
                        
  
                                                 
                                                                         
                                                              
                                         
                                                               
                                                                       
                                                         
import { passiveDefId } from '../passiveIdentity'                                      
import type { Card } from '../../src/dsl/card'
import { variantSiblings } from '../variantAlias'                             
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import type { StaticEffect } from '../../src/effects/continuousView'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { isUnit } from '../../src/state/cardTypes'

export const UNL_147_CARD_EFFECT =
  '打出我时，如果场上没有“男爵巢穴”，则将一个“男爵巢穴”战场指示物添置到场上。'
  + '若如此做，则我于“男爵巢穴”进场。（它具有“单位可从任意位置移动到此处”的效果。）\n'
  + '我无法被敌方法术和技能选作目标。\n'
  + '其他友方单位获得{{S}}+2。'

export const BARON_NEST_DEFID = 'token:男爵巢穴'
export const BARON_NEST_ZONE = 'battlefield:token:巢穴:1'
                                          
                                                  
                                                     
                                                                      
                                                        
const BARON_IDS: ReadonlySet<string> = new Set([
  ...variantSiblings('UNL-147'), ...variantSiblings('UNL-238'),
])

                                                           
export function nestOnField(state: GameState): boolean {
  return Object.values(state.battlefieldCards ?? {}).some((bc) => bc.defId === BARON_NEST_DEFID)
}

                                          
export function makeBaronPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-147-nest:${selfOid}`, rawId: true, sourceDefId: 'UNL-147',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state: GameState): readonly GameEvent[] => {
                                                  
      if (nestOnField(state)) return []
      return [
        { kind: 'addBattlefieldZone', zoneId: BARON_NEST_ZONE as ZoneId, defId: BARON_NEST_DEFID, owner: controller } as GameEvent,
                                                                   
                                                                       
        { kind: 'zoneChange', obj: selfOid, to: BARON_NEST_ZONE as ZoneId, entry: true } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

   
                                                            
                                                                 
                                                                
   
export function baronPassives(obj: GameObject, state: GameState): readonly StaticEffect[] {
  if (!BARON_IDS.has(passiveDefId(obj))) return []
  void state
  return [
    {
      id: `UNL-147:untarget:${obj.oid as string}`, duration: 'permanent', fromPassive: true, timestamp: 0,
      predicate: (x: GameObject) => x.oid === obj.oid,
      modification: { kind: 'addRestriction', restriction: NO_ENEMY_TARGET },
    },
    {
      id: `UNL-147:aura:${obj.oid as string}`, duration: 'permanent', fromPassive: true, timestamp: 0,
      predicate: (x: GameObject, st: GameState) => {
        const k = st.zones[x.zone]?.kind
        return (k === 'battlefield' || k === 'base') && isUnit(x)
          && x.controller === obj.controller && x.oid !== obj.oid              
      },
      modification: { kind: 'addMight', delta: 2 },
    },
  ] as StaticEffect[]
}

export const UNL_147: Card = {
  id: 'UNL-147', cardNo: 'UNL-147/219', name: '纳什男爵', category: 'unit',
  domains: ['purple'], energy: 10, power: 12, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时添置男爵巢穴并于其进场;敌方不可选我;其他友方+2(makeBaronPlayTrigger/baronPassives)' }],
}
