                                                           
                                             
                                 
                                                               
                                  
                                                   
                                           
                      
  
             
                                                                
                                                                              
                                                         
                                                               
                              
                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { voidSproutChoice, voidSproutRecycleEvents, voidSproutFilter } from './SFD-018'        
import { topOfDeck } from '../../src/keywords/insight'
import { isUnitDefId } from '../cardKinds'
import { CARD_CATEGORIES } from '../cardCategories'

export const SFD_041_CARD_EFFECT =
  '当我移动时，展示你主牌堆顶部的一张牌。如果是一张装备牌，则抽取该卡牌，否则将其回收。'
export const VEN_033_CARD_EFFECT =
  '当我移动时，展示你主牌堆顶部的一张牌。如果是一张单位牌，则抽取该卡牌。' +
  '否则，将其放入你的废牌堆并给予我在本回合内{{S}}+2。'

export const VEN_033_MIGHT = 2           

                                              
export const isEquipmentDef = (defId: string | undefined): boolean =>
  defId !== undefined && CARD_CATEGORIES[defId] === 'equipment'

   
                                 
                                           
                                                     
   
export function makeMoveRevealTrigger(opts: {
  readonly defId: string
  readonly selfOid: ObjId
  readonly controller: PlayerId
  readonly wants: (defId: string | undefined) => boolean
  readonly onMiss: (top: ObjId, selfOid: ObjId, controller: PlayerId) => readonly GameEvent[]
}): Trigger {
  return compileTrigger({
    id: `${opts.defId}:moveReveal:${opts.selfOid}`, rawId: true, sourceDefId: opts.defId,
    event: 'unitMoved',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】移动时」
    nextChoice: (state, _ev, chosen) => voidSproutChoice(state, opts.controller, chosen), // ★748 兽苗前置
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
                                                     
                                             
      const rec = voidSproutRecycleEvents(state, opts.controller, chosen)
      const shown = voidSproutFilter(chosen, state, opts.controller, topOfDeck(state, opts.controller, 1))
      const top = shown[0]
      if (top === undefined) return [...rec]                   
                                                   
      const reveal = { kind: 'revealed', player: opts.controller, cards: [top] } as GameEvent
      if (opts.wants(state.objects[top]?.defId)) {
        return [...rec, reveal, { kind: 'draw', player: opts.controller, count: 1 } as GameEvent]
      }
      return [...rec, reveal, ...opts.onMiss(top, opts.selfOid, opts.controller)]
    },
  }, opts.selfOid, opts.controller)
}

                                        
export function makeSmithMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeMoveRevealTrigger({
    defId: 'SFD-041', selfOid, controller,
    wants: isEquipmentDef,
                                                                           
    onMiss: (top) => [{ kind: 'recycle', player: controller, objs: [top] } ],
  })
}

                                            
export function makePoroWardenMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeMoveRevealTrigger({
    defId: 'VEN-033', selfOid, controller,
    wants: isUnitDefId,
    onMiss: (top, self) => [
      { kind: 'zoneChange', obj: top, to: `discard:${controller}` as ZoneId } ,
      {
        kind: 'addEffect',
        effect: {
          id: `VEN-033:might:${self}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { oid: string }) => x.oid === (self as string),
          modification: { kind: 'addMight', delta: VEN_033_MIGHT },
        },
      } ,
    ],
  })
}

export const SFD_041: Card = {
  id: 'SFD-041', cardNo: 'SFD·041/221', name: '学徒铁匠', category: 'unit',
  domains: ['green'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动时展示顶牌:装备则抽,否则回收(makeSmithMoveTrigger)' }],
}

export const VEN_033: Card = {
  id: 'VEN-033', cardNo: 'VEN·033', name: '帕卡监护者', category: 'unit',
  domains: ['green'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动时展示顶牌:单位则抽,否则进废牌堆且我本回合+2(makePoroWardenMoveTrigger)' }],
}
