                                                                      
                                             
          
            
                    
  
                                                                   
                                                                          
                                                       
  
                                                             
                                                                     
                                                              
                                                            
                                                  
                                                             
                                                           
                                                           
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const VEN_168_CARD_EFFECT = '{{急速}}\n{{强攻2}}\n当你打出我时，弃置两张手牌。'

                            
export const VEN_168_DISCARD = 2
                                 
export const VEN_168_KEYS: readonly string[] = ['d1', 'd2']

                                
export function discardCandidates(
  state: GameState, player: PlayerId, chosen: Readonly<Record<string, string>>,
): readonly ObjId[] {
  const taken = new Set(VEN_168_KEYS.map((k) => chosen[k]).filter((x): x is string => x !== undefined))
  const hand = state.zones[`hand:${player}` as ZoneId]?.contents ?? []
  return hand.filter((oid) => !taken.has(oid as string))
}

                       
export function makeJinx168Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-168:${selfOid}`, rawId: true,
    sourceDefId: 'VEN-168',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】时」
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
                                             
      for (const key of VEN_168_KEYS) {
        if (chosen[key] !== undefined) continue
        const cands = discardCandidates(state, controller, chosen)
        if (cands.length === 0) return null
        return {
          itemId: `trig:VEN-168:${selfOid}`,
          controller,
          key,
          prompt: `金克丝:弃置手牌(第 ${VEN_168_KEYS.indexOf(key) + 1} / ${VEN_168_DISCARD} 张)`,
          candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const picked = VEN_168_KEYS
        .map((k) => (chosen ?? {})[k])
        .filter((x): x is string => x !== undefined)
        // 结算这一刻再筛一次:选完到结算之间那张牌可能已经不在手里了
        .filter((oid) => (state.zones[`hand:${controller}` as ZoneId]?.contents ?? []).includes(oid as ObjId))
                                                                                 
      return picked.map((oid): GameEvent => ({
        kind: 'zoneChange', obj: oid as ObjId, to: `discard:${controller}` as ZoneId,
      } as GameEvent))
    },
  }, selfOid, controller)
}

export const VEN_168: Card = {
  id: 'VEN-168', cardNo: 'VEN·168', name: '金克丝', category: 'unit',
  domains: ['red'], energy: 3, power: 4, keywords: ['急速', '强攻2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '印刷[急速][强攻2];打出时弃置两张手牌(makeJinx168Trigger)' }],
}
