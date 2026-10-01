                                                                  
                                              
                            
                                                          
  
                                             
                                                          
                                                                                    
                                                                               
                                                                     
                                                                        
                                         
                                                                      
                                                                              
                                                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { experienceOf } from '../../src/keywords/level'
import { isUnit } from '../../src/state/cardTypes'

export const UNL_164_CARD_EFFECT =
  '你可以选择消耗3经验，作为打出我的额外费用。\n'
  + '当你打出我时，每名玩家必须摧毁自己的一名单位。如果你支付了我的额外费用，则你无需以此方式摧毁一名单位。'

                              
export const UNL_164_XP = 3

                                                                    
export const UNL_164_EXTRA_COST: PlayExtraCost = {
  label: `消耗${UNL_164_XP}经验(打出我的可选额外费用:你将无需摧毁自己的单位)`,
                                       
  available: (state, player) => experienceOf(state, player) >= UNL_164_XP,
  payEvents: (_state, player): readonly GameEvent[] => [
                                                         
    { kind: 'spend', player, cost: {}, experience: UNL_164_XP } as GameEvent,
  ],
}

                                          
const unitsOf = (state: GameState, p: PlayerId): readonly { readonly id: string; readonly label: string }[] =>
  Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return (k === 'battlefield' || k === 'base') && o.controller === p && isUnit(o)
    })
    .map((o) => ({ id: o.oid as string, label: o.defId }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

const pickKeyOf = (p: string): string => `kill:${p}`

                                            
export function makeInspectorTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                      
  const mustAnswer = (state: GameState, ev: GameEvent, p: PlayerId): boolean => {
    const paid = (ev as { bonus?: boolean }).bonus === true
    if (p === controller && paid) return false                  
    return unitsOf(state, p).length > 0                  
  }
  return compileTrigger({
    id: `UNL-164:play:${selfOid}`, rawId: true, sourceDefId: 'UNL-164',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    nextChoice: (state, ev, chosen): ChoiceRequest | null => {
      for (const p of state.players) {
        if (!mustAnswer(state, ev, p)) continue
        const key = pickKeyOf(p as string)
        if (chosen[key] !== undefined) continue            
        return {
          itemId: `trig:UNL-164:${selfOid}`,
          controller: p, // ★逐人问:谁的单位谁选(423 套路)
          key,
          prompt: '安全检查员:你必须摧毁自己的一名单位',
          candidates: unitsOf(state, p), // 「必须」⇒ 无 skip 档
        }
      }
      return null
    },
    effect: (state, ev, chosen): readonly GameEvent[] => {
      const out: GameEvent[] = []
      for (const p of state.players) {
        if (!mustAnswer(state, ev, p)) continue
        const pick = chosen?.[pickKeyOf(p as string)]
        if (pick === undefined) continue                      
                                                                        
                                                   
                                                       
        if (!unitsOf(state, p).some((c) => c.id === pick)) continue
                                                   
        out.push({ kind: 'destroy', target: pick as ObjId, sourcePlayer: p } as GameEvent)
      }
      return out
    },
  }, selfOid, controller)
}

export const UNL_164: Card = {
  id: 'UNL-164', cardNo: 'UNL-164/219', name: '安全检查员', category: 'unit',
  domains: ['yellow'], energy: 5, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可选消耗3经验作额外费;打出我时每名玩家必须摧毁自己一名单位,付了费的我免(makeInspectorTrigger)' }],
}
