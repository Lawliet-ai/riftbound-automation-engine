                                                                 
                                 
                                 
  
                             
                                                              
                                  
                                     
                                      
                                      
                     
  
            
                                                          
                                                       
                                            
                                                         
                                         
                                          

import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { ownUnitsOnField } from './once-per-turn'
import { isUnit } from '../../src/state/cardTypes'
import { isFieldedKind, zoneCategory } from '../../src/state/zones'

export const VEN_090_CARD_EFFECT = '每名玩家选择一个受自己控制的单位。摧毁其余的单位。'

                                                          
export const VEN_090_PREFIX = 'ven090:keep'

                                               
export function allUnitsOnField(state: GameState): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return isFieldedKind(k) && isUnit(o)
    })
    .map((o) => o.oid as string)
    .sort()
}

                                    
function keptOids(state: GameState, chosen: Readonly<Record<string, string>>): ReadonlySet<string> {
  const kept = new Set<string>()
  for (const p of state.players) {
    const pick = chosen[`${VEN_090_PREFIX}:${p as string}`]
                                                   
                                                       
                                      
                                                      
    if (pick !== undefined && state.objects[pick as ObjId]) kept.add(pick)
  }
  return kept
}

export const VEN_090_SPEC: PlaySpec = {
                                                             
                                                                                           
                                                  
                                                          
  defId: 'VEN-090',
  cardNo: 'VEN·090',
  name: '末日决斗',
  kind: 'spell',
  keywords: [],
  cost: { mana: 8, pips: [['orange'], ['orange'], ['orange']] }, // 卡面 8 法力 + 三枚橙 pip(㊶)
  target: 'none', // 两个选择都走问链
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid }: { movedCardOid: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      for (const p of state.players) {
        const key = `${VEN_090_PREFIX}:${p as string}`
        if (chosen[key] !== undefined) continue                 
        const cands = ownUnitsOnField(state, p)
        if (cands.length === 0) continue                         
        return {
          itemId: movedCardOid,
          controller: p, // ★「**每名**玩家」——这一问由【他自己】答
          key,
          prompt: '末日决斗:选择一个你控制的单位保下来(其余的单位全被摧毁)',
          candidates: cands.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
        }
      }
      return null        
    },
  makeResolve:
    () =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const kept = keptOids(state, chosen ?? {})
      return allUnitsOnField(state)
        .filter((oid) => !kept.has(oid))
        .map((oid) => ({ kind: 'destroy', target: oid as ObjId } as GameEvent))
    },
}

export const VEN_090: Card = {
  id: 'VEN-090', cardNo: 'VEN·090', name: '末日决斗', category: 'spell',
  domains: ['orange'], energy: 8, power: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每名玩家各留一个自己的单位,其余全摧毁(VEN_090_SPEC)' }],
}
