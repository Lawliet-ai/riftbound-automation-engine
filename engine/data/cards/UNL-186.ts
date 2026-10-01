                                                                 
                                               
                                       
                                
  
                                                   
                                                        
                                                          
                                                
                                                             
                                                                       
                                                                                    
                                                
  
                                                          
                                                             
                                                 
                                                  
  
                                                 
                                                             
                                                                                      
                                                                 
                                                                                     
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { isUnit } from '../../src/state/cardTypes'                                                  
import type { ChoiceRequest } from '../../src/loop/chain'
import type { CostMod } from '../../src/game/costPipeline'
import { effectiveMight } from '../../src/state/might'

export const UNL_186_CARD_EFFECT =
  '摧毁战场上的一名单位。然后，如果该单位不高于3{{S}}，则进行一次：' +
  '你可以选择支付{{A}}，以此将此牌从废牌堆中打出。'

                                  
export const UNL_186_TARGET = 'wellspringVictim'
                                
export const UNL_186_MIGHT_CAP = 3

   
                                 
                                                        
                                                                                                                  
   
export function wellspringTargets(state: GameState): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => state.zones[o.zone]?.kind === 'battlefield' && isUnit(o))                                   
    .map((o) => o.oid)
    .sort()
}

export const UNL_186_SPEC: PlaySpec = {
  defId: 'UNL-186', cardNo: 'UNL-186/219', name: '涌泉之恨',
  kind: 'spell',
  cost: { mana: 4, pips: [['red', 'purple']] }, // 卡面 4 法力 + 一枚【红或紫】pip(㊶ 双色单 pip)
  keywords: [],
                                                               
                                                                   
  choiceTiming: 'confirm',
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[UNL_186_TARGET] !== undefined) return null
      const cands = wellspringTargets(state)
      if (cands.length === 0) return null                            
      return {
        itemId: `spell:${movedCardOid}:UNL-186`, controller, key: UNL_186_TARGET,
        prompt: '涌泉之恨:摧毁战场上的哪一名单位',
        isTarget: true, // ★1782 摧毁战场上的一名单位
        candidates: cands.map((oid) => ({
          id: oid as string,
          label: `${state.objects[oid]?.defId ?? oid}@${state.objects[oid]?.zone ?? '?'}`,
        })),
      }
    },
  makeResolve:
    ({ controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[UNL_186_TARGET]
      if (pick === undefined || !wellspringTargets(state).includes(pick as ObjId)) return []
      const victim = state.objects[pick as ObjId]!
                                                     
      const small = effectiveMight(victim).actual <= UNL_186_MIGHT_CAP
      return [
        { kind: 'destroy', target: pick as ObjId, sourcePlayer: controller } as GameEvent,
                                                   
        ...(small ? [{ kind: 'grantPlayFromDiscard', player: controller, defId: 'UNL-186' } as GameEvent] : []),
      ]
    },
}

   
                                       
                                                       
                                                    
   
export function wellspringPlaySources(state: GameState, player: PlayerId): readonly ObjId[] {
  if ((state.playFromDiscardGrants?.[player]?.['UNL-186'] ?? 0) <= 0) return []
  const zone = state.zones[`discard:${player}` as ZoneId]
  return (zone?.contents ?? []).filter((oid) => state.objects[oid]?.defId === 'UNL-186')
}

   
                                                            
                                                             
                                                                          
                                                                        
   
export function wellspringCostMods(
  defId: string, ctx?: { readonly fromZone?: string },
): readonly CostMod[] {
  if (defId !== 'UNL-186') return []
  if (ctx?.fromZone !== 'discard') return []
  return [
    { kind: 'zero', part: 'total', source: 'UNL-186 涌泉之恨(改付{A})' },
    { kind: 'increase', part: 'pips', pips: 1, source: 'UNL-186 涌泉之恨(改付{A})' },
  ]
}

export const UNL_186: Card = {
  id: 'UNL-186', cardNo: 'UNL-186/219', name: '涌泉之恨', category: 'spell',
  domains: ['red', 'purple'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '摧毁战场上一名单位;若其不高于3[S],则获得一次付{A}从废牌堆打出此牌的机会' }],
}
