                       
  
                                                         
                                         
                                                 
  
                                              
                                                           
                                                               
                                                                
                       
                                                              
                                              
  
                                                                 
                                                      
                                                                    
                                                              
                                                
                                                                

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { zonesByKind } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'
import { moveUnitEvents } from './enemy-move'

                                                               
                                                      
export const OGN_293_CARD_EFFECT = '当你据守此处时，如果你在此拥有至少七名单位，则你赢得游戏胜利。'

                            
export const OGN_293_UNITS = 7

   
                                                        
                                                                                                        
                                                                            
                                    
                                                                           
                                                                       
                                
   
export function makeGrandPlazaTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-293:${bfZoneId}:${controller}`, rawId: true, sourceDefId: 'OGN-293',
    event: 'hold', by: 'you',
    when: [
      { kind: 'eventAtBattlefield', zone: bfZoneId },
      { kind: 'eventPlayerIs', side: 'you' },
      { kind: 'custom', test: (_ev, state): boolean => unitsHereOf(state, bfZoneId, controller) >= OGN_293_UNITS },
    ],
    effect: (): readonly GameEvent[] => [{ kind: 'winGame', player: controller } as GameEvent],
  }, null, controller)
}

                               
export function unitsHereOf(state: GameState, bfZoneId: string, player: PlayerId): number {
  return (state.zones[bfZoneId as ZoneId]?.contents ?? [])
    .map((oid) => state.objects[oid])
    .filter((o) => o !== undefined && isUnit(o) && o.controller === player).length
}

export const OGN_293: Card = {
  id: 'OGN-293', cardNo: 'OGN·293/298', name: '宏伟广场', category: 'battlefield',
  domains: ['colorless'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守此处且在此有≥7名单位 → 直接获胜(makeGrandPlazaTrigger)' }],
}

                                                              
export const UNL_105_CARD_EFFECT = '当我移动时，你可以选择将一名位于此处且战力低于我的敌方单位移动到另一处战场。'

const UNL_105_VICTIM = 'challengerVictim'
const UNL_105_DEST = 'challengerDest'

                                                 
export function ogn105Victims(state: GameState, selfOid: ObjId, controller: PlayerId): string[] {
  const me = state.objects[selfOid]
  if (!me) return []
  const myMight = effectiveMight(me).reference
  return Object.values(state.objects)
    .filter((o) =>
      o.oid !== selfOid
      && isUnit(o)
      && (o.zone as string) === (me.zone as string)                             
      && o.controller !== controller                               
      && effectiveMight(o).reference < myMight)                                  
    .map((o) => o.oid as string)
    .sort()
}

                                                    
export function otherBattlefields(state: GameState, victimOid: string): string[] {
  const v = state.objects[victimOid as ObjId]
  if (!v) return []
  return zonesByKind(state, 'battlefield')
    .map((z) => z.id as string)
    .filter((z) => z !== (v.zone as string))
}

export function makeUnl105MoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'UNL-105-shove',
    event: 'unitMoved',
    by: 'any',
    mayChoose: true, // §383.3.a「你可以选择」
    when: [{ kind: 'subjectIsSelf' }], // 「当**我**移动时」——与追踪者(别人移动)正好相反
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
               
      if (chosen[UNL_105_VICTIM] === undefined) {
        const foes = ogn105Victims(state, selfOid, controller)
        if (foes.length === 0) return null                     
        return {
          itemId: `trig:UNL-105:${selfOid}`, controller, key: UNL_105_VICTIM,
          prompt: '气势逼人的挑战者:把此处哪一名(战力低于我的)敌方单位踢走?',
          isTarget: true, // ★1782 将一名位于此处且战力低于我的敌方单位移动到另一处战场
          candidates: foes.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
        }
      }
                          
      if (chosen[UNL_105_DEST] !== undefined) return null
      const dests = otherBattlefields(state, chosen[UNL_105_VICTIM]!)
      if (dests.length === 0) return null
      return {
        itemId: `trig:UNL-105:${selfOid}`, controller, key: UNL_105_DEST,
        prompt: '气势逼人的挑战者:把它移动到哪一处【战场】?',
        candidates: dests.map((z) => ({ id: z, label: z })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] =>
      moveUnitEvents(state, chosen?.[UNL_105_VICTIM], chosen?.[UNL_105_DEST]),
  }, selfOid, controller)
}

export const UNL_105: Card = {
  id: 'UNL-105', cardNo: 'UNL-105/219', name: '气势逼人的挑战者', category: 'unit',
  domains: ['orange'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我移动时可把此处战力低于我的一名敌方单位踢到另一处战场(makeUnl105MoveTrigger)' }],
}

             
export const LONGTAIL34_DEFIDS: readonly string[] = ['OGN-293', 'UNL-105']
