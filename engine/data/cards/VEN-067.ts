                                                                      
                                             
                                         
  
                                                         
                                                    
                                                        
                                                           
  
                        
                                         
                                             
                                                        
                                                   
                                                              
                                                                       
                                                                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit, isEquipment } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'

export const VEN_067_CARD_EFFECT = '在你的主阶段开始时，你可以选择摧毁另外三个友方单位或装备，以此获得1分。'

                                       
export const VEN_067_SACRIFICE = 3
export const VEN_067_POINT = 1
                                 
export const VEN_067_KEYS: readonly string[] = ['s1', 's2', 's3']

   
                                      
                                                      
  
                                                                               
                                                                      
                                                              
                                                     
                                                
   
export function otherFriendlyUnitsOrGear(
  state: GameState, controller: PlayerId, selfOid: ObjId, chosen: Readonly<Record<string, string>>,
): readonly ObjId[] {
  const taken = new Set(VEN_067_KEYS.map((k) => chosen[k]).filter((x): x is string => x !== undefined))
  return Object.values(state.objects)
    .filter((o) => o.oid !== selfOid         
      && o.controller === controller         
      && (isUnit(o) || isEquipment(o))            
      && onField(state, o)
      && !taken.has(o.oid as string))
    .map((o) => o.oid)
    .sort()
}

                                             
export function makeStarBottle067Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-067:${selfOid}`, rawId: true,
    sourceDefId: 'VEN-067',
    event: 'mainPhaseStart',
    by: 'you', // ①「**你的**主阶段」
    mayChoose: true, // §383.3.a 卡文以「你可以选择」开头
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      for (const key of VEN_067_KEYS) {
        if (chosen[key] !== undefined) continue
        const cands = otherFriendlyUnitsOrGear(state, controller, selfOid, chosen)
                                                
        if (cands.length === 0) return null
        return {
          itemId: `trig:VEN-067:${selfOid}`,
          controller,
          key,
          prompt: `瓶中星海:摧毁另外的友方单位或装备(第 ${VEN_067_KEYS.indexOf(key) + 1} / ${VEN_067_SACRIFICE} 个)`,
          candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const picked = VEN_067_KEYS
        .map((k) => (chosen ?? {})[k])
        .filter((x): x is string => x !== undefined)
        // 结算这一刻再筛一次:选完到结算之间那个可能已经不在场上了
        .filter((oid) => {
          const o = state.objects[oid as ObjId]
          return o !== undefined && onField(state, o)
        })
                                               
      if (picked.length < VEN_067_SACRIFICE) return []
      return [
        ...picked.map((oid): GameEvent => ({ kind: 'destroy', target: oid as ObjId, sourcePlayer: controller } as GameEvent)),
        { kind: 'gainPoint', player: controller, amount: VEN_067_POINT } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const VEN_067: Card = {
  id: 'VEN-067', cardNo: 'VEN·067', name: '瓶中星海', category: 'equipment',
  domains: ['blue'], energy: 10, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我的主阶段开始时可摧毁另外三个友方单位/装备换 1 分(makeStarBottle067Trigger)' }],
}
