                                                             
                                                                     
                                           
                                                
  
          
                                                                        
                                                            
                                                                     
                                                                          
                                                                       

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { printedCost } from './play-from-deck'
import { scoredHere } from './scored-here'
import { CARD_CATEGORIES } from '../cardCategories'

export const VEN_113_CARD_EFFECT =
  '当你打出我时，{{燃烧2}}。（将你主牌堆顶部的两张牌放入你的废牌堆。）\n' +
  '当我征服一处战场时，给予你废牌堆中的一个法术在本回合内等同于其费用的{{流转}}。'

                              
export const VEN_113_BURN = 2

                                                                                     
                                                                                
                                                                                                                  
                                                                                

                       
export function makeKennenBurnTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-113:burn:${selfOid}`, rawId: true, sourceDefId: 'VEN-113',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
                                                   
                                                                
                                                  
                                                                       
                                                                                  
                                                                                       
                   
    effect: (): readonly GameEvent[] => [
      { kind: 'burn', player: controller, count: VEN_113_BURN } as GameEvent,
    ],
  }, selfOid, controller)
}

                      
export function mySpellsInDiscard(state: GameState, controller: PlayerId): readonly string[] {
  return (state.zones[`discard:${controller}` as ZoneId]?.contents ?? [])
    .filter((oid) => {
      const d = state.objects[oid]?.defId
      return d !== undefined && CARD_CATEGORIES[d] === 'spell'
    })
    .map((oid) => oid as string)
}

                                                   
export function makeKennenRecursionTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-113:conquer:${selfOid}`, rawId: true, sourceDefId: 'VEN-113',
    event: 'conquer', by: 'you',
    when: [{ kind: 'custom', test: (ev, state) => scoredHere(state, selfOid, ev, ['conquer']) }],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['spell'] !== undefined) return null
      const cands = mySpellsInDiscard(state, controller)
      if (cands.length === 0) return null                            
      return { itemId: `VEN-113:conquer:${selfOid}`, controller, key: 'spell',
        prompt: '凯南:给予你废牌堆中的一个法术本回合流转(费用等同其印刷费)',
        isTarget: true, // ★1782 给予你废牌堆中的一个法术…流转
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 获得流转` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const card = chosen?.['spell']
      const o = card !== undefined ? state.objects[card as ObjId] : undefined
      if (!o) return []
      return [{ kind: 'grantRecursion', card: card as ObjId, cost: printedCost(o.defId) } as GameEvent]
    },
  }, selfOid, controller)
}

export function makeKennen113Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeKennenBurnTrigger(selfOid, controller), makeKennenRecursionTrigger(selfOid, controller)]
}

export const VEN_113: Card = {
  id: 'VEN-113', cardNo: 'VEN·113', name: '凯南', category: 'unit',
  domains: ['purple'], energy: 3, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '打出时燃烧2(makeKennenBurnTrigger)' },
    { kind: 'passive', describe: '征服时给废牌堆一个法术本回合等费[流转](makeKennenRecursionTrigger;第二十一本账)' },
  ],
}

export const VEN_113A: Card = { ...VEN_113, id: 'VEN-113a', cardNo: 'VEN·113a' }
