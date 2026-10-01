                                                                       
                                                                    
                                                   
                                                
  
               
                                                                                
                                                      
                                                                 
                                          
                                                            
                                                              
                                                                 
                                                            
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { CostMod } from '../../src/game/costPipeline'
import { ANIMAL_TAGS } from './animal-tags'
import { objectCardTags } from '../cardTagQuery'
import { CARD_COSTS } from '../cardCosts'
import { CARD_CATEGORIES } from '../cardCategories'
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const UNL_168_CARD_EFFECT =
  '如果你选择的单位为“鸟类”、“猫科”、“犬形”或“魄罗”属性，则此法术费用减少{{2}}。\n'
  + '从你的废牌堆中打出一名费用不高于{{2}}且不高于{{A}}的单位，无视其费用。'

export const UNL_168_DISCOUNT = 2
export const UNL_168_TO = 'loyaltyTo'               

   
                                      
                                                                     
   
export function loyaltyCostMods(
  state: GameState, _player: PlayerId, defId: string,
  ctx?: { readonly target?: string },
): readonly CostMod[] {
  if (defId !== 'UNL-168') return []
  const t = ctx?.target
  if (t === undefined) return []
  const o = state.objects[t as ObjId]
  if (!o) return []
                                            
  const hit = [...objectCardTags(o)].some((tag) => ANIMAL_TAGS.has(tag))
  return hit ? [{ kind: 'reduce', part: 'mana', mana: UNL_168_DISCOUNT, source: 'UNL-168 忠诚不渝' } as CostMod] : []
}

                                                               
export function loyaltyTargets(state: GameState, controller: PlayerId): string[] {
  const out: string[] = []
  for (const oid of state.zones[`discard:${controller}` as never]?.contents ?? []) {
    const o = state.objects[oid]
    if (!o) continue
    if (CARD_CATEGORIES[o.defId] !== 'unit') continue              
    const c = CARD_COSTS[o.defId]
    if (c === undefined) continue
                                                      
                                                              
                                                                   
                                                                        
                                                                               
                                     
                                                                         
                                                                     
                                                                
    if (c.mana > 2 || c.pips > 1) continue               
                                                                              
                                                          
                                                                          
                                                                     
                                                                         
    out.push(oid as string)
  }
  return out.sort()
}

export const UNL_168_SPEC: PlaySpec = {
  defId: 'UNL-168', cardNo: 'UNL-168/219', name: '忠诚不渝', kind: 'spell',
  cost: { mana: 2, pips: [['yellow']] }, // ㊶ cardCosts 实测 2 法力 1 黄 pip
  keywords: [],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => loyaltyTargets(state, controller),
                                                                              
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (target === undefined || chosen[UNL_168_TO] !== undefined) return null
      const o = state.objects[target as ObjId]
      if (!o || (o.zone as string) !== `discard:${controller}`) return null                                               
      return playFromEffectChoice(state, controller, o.defId, {
        itemId: `spell:${movedCardOid}:UNL-168`, controller, key: UNL_168_TO, prompt: '忠诚不渝:把它打出到哪里?',
      }, chosen)
    },
  makeResolve:
    ({ controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    if (target === undefined) return []
    const o = state.objects[target as ObjId]
                                         
    if (!o || (o.zone as string) !== `discard:${controller}`) return []
                                                                                  
                                                                                                  
                                                                                                  
                                                                           
    const x = optionalExtraResolve(state, controller, o.defId, UNL_168_TO, chosen)
    const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[UNL_168_TO], x.grant)
    if (dest === undefined) return []
    return [...x.pre, { kind: 'playFree', obj: target as ObjId, player: controller, to: dest, ...x.flags } as GameEvent, ...x.post]                                                     
  },
}

export const UNL_168: Card = {
  id: 'UNL-168', cardNo: 'UNL-168/219', name: '忠诚不渝', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '所选单位带四动物标签之一则本法术减2;从废牌堆免费打出费用≤2且≤A的单位(UNL_168_SPEC)' }],
}
