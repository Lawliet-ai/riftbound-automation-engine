                                                                       
                                                                    
                                      
                                              
                              
  
                                                
                                                                  
                                                           
                           
                                                         
                                                            
                                                              
                                             
                                                                    
                                                                  
                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { topOfDeck } from '../../src/keywords/insight'

export const VEN_156_CARD_EFFECT =
  '查看你主牌堆顶部的三张牌。你可以选择指定其中一张，并抽取该卡牌。将其余卡牌放进你的废牌堆。\n'
  + '{{流转2A}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

export const VEN_156_LOOK = 3
export const VEN_156_PICK = 'thunderPick'
export const VEN_156_SKIP = 'skip'

export const VEN_156_SPEC: PlaySpec = {
  defId: 'VEN-156', cardNo: 'VEN·156', name: '奥义！雷铠', kind: 'spell',
  cost: { mana: 1 }, // ㊶ cardCosts 实测 1 法力 **0 pip**
  keywords: ['流转2A'], // §829 引擎通道解析(替代费,不是又一条效果)
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[VEN_156_PICK] !== undefined) return null
      const top = topOfDeck(state, controller, VEN_156_LOOK)
      if (top.length === 0) return null                
      return {
        itemId: `spell:${movedCardOid}:VEN-156`, controller, key: VEN_156_PICK,
        prompt: `奥义!雷铠:指定顶${VEN_156_LOOK}张之一抽取(其余进废牌堆)`,
        candidates: [
          ...top.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: VEN_156_SKIP, label: '不指定(三张全进废牌堆)' }, // 「你可以选择」
        ],
      }
    },
  makeResolve:
    ({ controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                   
      const top = topOfDeck(state, controller, VEN_156_LOOK)
      if (top.length === 0) return []
      const pick = chosen?.[VEN_156_PICK]
                                                                               
                                            
      const taken = pick !== undefined && pick !== VEN_156_SKIP && top.includes(pick as ObjId)
      const out: GameEvent[] = []
                                         
      if (taken) out.push({ kind: 'zoneChange', obj: pick as ObjId, to: asZoneId(`hand:${controller}`) } as GameEvent)
                                  
      for (const oid of top) {
        if (taken && (oid as string) === pick) continue
        out.push({ kind: 'zoneChange', obj: oid, to: asZoneId(`discard:${controller}`) } as GameEvent)
      }
      return out
    },
}

export const VEN_156: Card = {
  id: 'VEN-156', cardNo: 'VEN·156', name: '奥义！雷铠', category: 'spell',
  domains: ['purple', 'yellow'], energy: 1, keywords: ['流转2A'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '查顶3指定一张进手,其余进废;[流转2A](VEN_156_SPEC)' }],
}
