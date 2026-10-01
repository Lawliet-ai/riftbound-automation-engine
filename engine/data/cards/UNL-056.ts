                                                               
                                                                    
                                   
                                                
                      
  
                                                  
                                                                                  
                                                                             
                                                                           
                                                       
  
                                
                                                               
                                                                 
                                                                 
                                                               
                                                          
  
                                               
                                                                      
                                                
                                                       
                                                          
  
                                               
                                                    
                                                                  
                                                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { selfBattlefield } from '../../src/state/selfHere'
import { grantKeywordEvent, pumpEvent } from './activated-batch'
import { BARRIER_KEYWORD } from './group-passives'                  

export const UNL_056_CARD_EFFECT =
  '当我进攻或防守时，让你在此处的另一名单位在本回合内获得{{S}}+3和{{壁垒}}。（其在战斗中首先承担伤害。）'

                     
export const UNL_056_PUMP = 3
                   
export const UNL_056_PICK_KEY = 'yuumiAlly'

   
                                    
                                           
   
export function yuumiAllies(state: GameState, selfOid: ObjId, controller: PlayerId): string[] {
  const here = selfBattlefield(state, selfOid)
  if (here === undefined) return []                                 
  return Object.values(state.objects)
    .filter((o) => isUnit(o)
      && o.controller === controller            
      && (o.zone as string) === here            
      && (o.oid as string) !== (selfOid as string))             
    .map((o) => o.oid as string)
    .sort()
}

export function makeYuumi056Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return (['attack', 'defend'] as const).map((event) => compileTrigger({
    id: `UNL-056:${event}:${selfOid}`, rawId: true, sourceDefId: 'UNL-056',
                                                             
                                                 
    abilityKey: `UNL-056:buff:${selfOid}`,
    event, by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻或防守时」
    nextChoice: (state, _ev, chosen) => {
      if (chosen[UNL_056_PICK_KEY] !== undefined) return null
      const cands = yuumiAllies(state, selfOid, controller)
      if (cands.length === 0) return null                               
      return {
        itemId: `trig:UNL-056:${event}:${selfOid}`,
        controller,
        key: UNL_056_PICK_KEY,
        prompt: `悠米:让你在此处的哪一名【其他】单位本回合 {S}+${UNL_056_PUMP} 并获得[壁垒]?`,
        isTarget: true, // ★1782 让你在此处的另一名单位…
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[UNL_056_PICK_KEY]
                                                    
      if (pick === undefined || !yuumiAllies(state, selfOid, controller).includes(pick)) return []
      return [
        pumpEvent(`UNL-056:pump:${selfOid}`, pick, UNL_056_PUMP),
        grantKeywordEvent(`UNL-056:barrier:${selfOid}`, pick, BARRIER_KEYWORD), // 缺省 'thisTurn'
      ]
    },
  }, selfOid, controller))
}

export const UNL_056: Card = {
                                                            
  id: 'UNL-056', cardNo: 'UNL-056/219', name: '悠米', category: 'unit',
  domains: ['green'], energy: 3, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我进攻或防守时,让此处另一名友方单位本回合+3并获得[壁垒](makeYuumi056Triggers)' }],
}
