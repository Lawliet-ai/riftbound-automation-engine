                                                                        
                                                                    
                                               
                                                               
  
                                              
                                                              
                                                                     
                 
                                                                                
                   
                                                        
                                                               
                                              
                                                      
                                                                        
                                                            
import { tappedRuneOids } from './tapped-runes'                    
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { CARD_CATEGORIES } from '../cardCategories'
import { pumpEvent } from './activated-batch'

export const UNL_080_CARD_EFFECT =
  '当我移动时，抽一张牌，然后弃置一张手牌。随后，根据被弃置卡牌的类型，执行以下效果：\n'
  + '*法术 — 抽一张牌。\n*装备 — 让最多两枚符文变为活跃状态。\n*单位 — 让我本回合内{{S}}+3。'

export const UNL_080_DISCARD = 'hweiDiscard'
export const UNL_080_RUNES = ['hweiRune1', 'hweiRune2'] as const
export const UNL_080_STOP = 'stop'
export const UNL_080_PUMP = 3

                                                   
                                                                      
                                                                       
                                                    
                                                
                                             
const tappedRunes = tappedRuneOids

                                                   
export function makeHweiPaintItem(selfOid: ObjId, controller: PlayerId): ChainItem {
  const id = `UNL-080-embed-paint:${selfOid}`
  return {
    id, controller, kind: 'triggered', status: 'pending', sourceDefId: 'UNL-080',
    nextChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      const hand = state.zones[`hand:${controller}` as never]?.contents ?? []
      if (chosen[UNL_080_DISCARD] === undefined) {
        if (hand.length === 0) return null                      
        return {
          itemId: id, controller, key: UNL_080_DISCARD,
          prompt: '彗:弃置一张手牌(按其类型执行后续效果)',
          candidates: hand.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          // 「弃置一张手牌」是指示,没写「可以」⇒ 必选无 skip 档
        }
      }
                                                       
      const picked = state.objects[chosen[UNL_080_DISCARD] as ObjId]
      if (picked === undefined || CARD_CATEGORIES[picked.defId] !== 'equipment') return null
      const taken = UNL_080_RUNES.map((k) => chosen[k]).filter((x): x is string => x !== undefined)
      if (taken.includes(UNL_080_STOP)) return null
      const next = UNL_080_RUNES.find((k) => chosen[k] === undefined)
      if (next === undefined) return null         
      const cands = tappedRunes(state, controller).filter((oid) => !taken.includes(oid))
      if (cands.length === 0) return null
      return {
        itemId: id, controller, key: next,
        prompt: `彗:选第 ${taken.length + 1} 枚要变为活跃的符文(最多两枚,可停止)`,
        isTarget: true, // ★1782 让最多两枚符文变为活跃状态
        candidates: [
          ...cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
          { id: UNL_080_STOP, label: '不再选(「最多」两枚)' },
        ],
      }
    },
    resolve: (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const card = chosen?.[UNL_080_DISCARD]
      if (card === undefined) return []                     
      const hand = state.zones[`hand:${controller}` as never]?.contents ?? []
      if (!hand.includes(card as ObjId)) return []                  
      const o = state.objects[card as ObjId]
      const out: GameEvent[] = [
        { kind: 'zoneChange', obj: card as ObjId, to: asZoneId(`discard:${controller}`) } as GameEvent, // 弃置
      ]
      const cat = o === undefined ? undefined : CARD_CATEGORIES[o.defId]
      if (cat === 'spell') {
        out.push({ kind: 'draw', player: controller, count: 1 } as GameEvent)              
      } else if (cat === 'equipment') {
                                                 
        const pool = new Set(tappedRunes(state, controller))
        for (const k of UNL_080_RUNES) {
          const r = chosen?.[k]
          if (r !== undefined && r !== UNL_080_STOP && pool.has(r)) {
            out.push({ kind: 'statusChange', target: r as ObjId, key: 'tapped', value: false } as GameEvent)
          }
        }
      } else if (cat === 'unit') {
                                               
        if (state.objects[selfOid] !== undefined) out.push(pumpEvent('UNL-080:pump', selfOid as string, UNL_080_PUMP))
      }
      return out
    },
  }
}

export function makeHweiMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-080:moved:${selfOid}`, rawId: true, sourceDefId: 'UNL-080',
    event: 'unitMoved', by: 'any', // 谁让我动的都算(卡文没写「你」,㊼ UNL-115)
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】移动时」
    effect: (state): readonly GameEvent[] => [
      { kind: 'draw', player: controller, count: 1 } as GameEvent, // 「抽一张牌」先落地
      { kind: 'enqueueItem', item: makeHweiPaintItem(selfOid, controller) } as GameEvent, // 「然后弃置+分型」
    ],
  }, selfOid, controller)
}

export const UNL_080: Card = {
  id: 'UNL-080', cardNo: 'UNL-080/219', name: '彗', category: 'unit',
  domains: ['blue'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当我移动时抽1;内嵌:弃1按类型分型(法术抽1/装备两符文活跃/单位我+3)(makeHweiMoveTrigger)' }],
}
