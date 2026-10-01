                                                                   
                                          
                                          
                   
  
                                                  
                                                
                       
                                                            
                                                      
                                                                        
                            
                                                          
                                                 
                  
                                                                                               
                                                                                     
                                                                                                       
                                                           
                                              
                                   
                                                    
                                          
import type { Card } from '../../src/dsl/card'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { topOfDeck } from '../../src/keywords/insight'

export const SFD_018_CARD_EFFECT =
  '当你要展示某个牌堆的卡牌时，先查看其顶部的第一张牌，你可以选择将其回收。然后继续展示这些卡牌。'

export const VOID_SPROUT_KEY = 'voidSprout'

                                                     
function hasSprout(state: GameState, revealer: PlayerId): boolean {
  return Object.values(state.objects).some((o) => {
    if (o.defId !== 'SFD-018' || o.controller !== revealer) return false
    const k = state.zones[o.zone]?.kind
    return k === 'battlefield' || k === 'base'
  })
}

   
                                               
                                                            
   
export function voidSproutChoice(
  state: GameState, revealer: PlayerId, chosen: Readonly<Record<string, string>>,
  topOverride?: ObjId, // ★749 宿主的「逻辑顶」(如 diana 家洞察后的顶);缺省=物理顶
): ChoiceRequest | null {
  if (chosen[VOID_SPROUT_KEY] !== undefined) return null
  if (!hasSprout(state, revealer)) return null
  const top = topOverride ?? topOfDeck(state, revealer, 1)[0]
  if (top === undefined) return null
  const name = state.objects[top]?.defId ?? (top as string)
  return {
    itemId: `voidSprout:${revealer}`, controller: revealer, key: VOID_SPROUT_KEY,
    prompt: `虚空兽苗:展示前先查看牌堆顶 —— 是【${name}】,将其回收?`,
    candidates: [{ id: 'recycle', label: '回收(§416 牌堆底)' }, { id: 'keep', label: '保留原位' }],
  }
}

                                                   
export function voidSproutRecycleEvents(
  state: GameState, revealer: PlayerId, chosen: Readonly<Record<string, string>> | undefined,
  topOverride?: ObjId,
): readonly GameEvent[] {
  if (chosen?.[VOID_SPROUT_KEY] !== 'recycle') return []
  const top = topOverride ?? topOfDeck(state, revealer, 1)[0]
  if (top === undefined) return []
  return [{ kind: 'recycle', player: revealer, objs: [top] } ]
}

                                                      
export function voidSproutFilter(
  chosen: Readonly<Record<string, string>> | undefined,
  state: GameState, revealer: PlayerId, cards: readonly ObjId[],
  topOverride?: ObjId,
): readonly ObjId[] {
  if (chosen?.[VOID_SPROUT_KEY] !== 'recycle') return cards
  const top = topOverride ?? topOfDeck(state, revealer, 1)[0]
  return top === undefined ? cards : cards.filter((c) => c !== top)
}

export const SFD_018: Card = {
  id: 'SFD-018', cardNo: 'SFD·018/221', name: '虚空兽苗', category: 'unit',
  domains: ['red'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你要展示牌堆时:先看顶一张可选回收,再继续展示(voidSprout 三件套,8 宿主接线)' }],
}
