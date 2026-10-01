                                                                            
                                             
  
            
                                            
                                                       
                                                               
  
                                                     
                                                                
                                  
                                                
  
                                                           
                             
                                       
                                                                 
                                   

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { isEquipment, isUnit } from '../../src/state/cardTypes'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const SFD_035_CARD_EFFECT =
  '当我据守一处战场时，你可以选择让你废牌堆里的一名单位或一件装备返回你的手牌。'

   
                                             
                                                                   
                                            
   
export function retrievableFromDiscard(
  state: GameState, controller: PlayerId, only?: 'unit',
): readonly ObjId[] {
  const discard = state.zones[`discard:${controller}` as ZoneId]
  if (!discard) return []
  return discard.contents.filter((oid) => {
    const o = state.objects[oid]
    if (!o) return false
    return only === 'unit' ? isUnit(o) : (isUnit(o) || isEquipment(o))
  })
}

export function makeGladeWardenTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                             
                                                                 
                                         
  return compileTrigger({
    id: 'SFD-035-recover',
    event: 'hold',
    by: 'you',
    activeZone: ['battlefield'],
    mayChoose: true, // §383.3.a「你可以选择」——注意这张【没有费用】,可选性就是全部
    when: [{ kind: 'selfAtEventBattlefield' }],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['card'] !== undefined) return null
      const cands = retrievableFromDiscard(state, controller).map((oid) => ({
        id: oid as string,
        label: state.objects[oid]?.defId ?? (oid as string),
      }))
      if (cands.length === 0) return null                         
      return {
        itemId: `trig:SFD-035-recover:${selfOid}`,
        controller,
        key: 'card',
        prompt: '幽径守卫:让废牌堆里的一名单位或一件装备返回你的手牌',
        isTarget: true, // ★1782 让你废牌堆里的一名单位或一件装备返回你的手牌
        candidates: cands,
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.['card'] as ObjId | undefined
                              
      if (!pick || !retrievableFromDiscard(state, controller).includes(pick)) return []
      return [{ kind: 'zoneChange', obj: pick, to: `hand:${controller}` as ZoneId }]
    },
  }, selfOid, controller)
}

export const SFD_035: Card = {
  id: 'SFD-035',
  cardNo: 'SFD·035/221',
  name: '幽径守卫',
  category: 'unit',
  domains: ['green'],
  energy: 6,
  power: 6,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '据守时可让废牌堆里的一名单位或一件装备回手(makeGladeWardenTrigger)' },
  ],
}
