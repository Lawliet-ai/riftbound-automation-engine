                                                                       
                                                                    
                                      
                 
                                     
               
  
                                                 
                                                  
                                           
                                                           
                                             
                                       
                                                                
                                                                          
                                                                   
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'

export const UNL_103_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
  + '从下列中选择一个 —\n'
  + '— 从对手的废牌堆里总共选择最多三张牌。让其拥有者将其回收。\n'
  + '— 抽一张牌。'

const PICKS = ['pick1', 'pick2', 'pick3'] as const

                                         
export function foeDiscardCards(state: GameState, controller: PlayerId): string[] {
  const out: string[] = []
  for (const p of state.players) {
    if (p === controller) continue
    for (const oid of state.zones[`discard:${p}` as never]?.contents ?? []) out.push(oid as string)
  }
  return out
}

export const UNL_103_SPEC: PlaySpec = {
  defId: 'UNL-103', cardNo: 'UNL-103/219', name: '处置命令', kind: 'spell',
  cost: { mana: 2 }, // ㊶ cardCosts 实测 2 法力 **0 pip**
  keywords: ['反应'],
  target: 'none',
  legalTargets: (): string[] => [],
  choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.3】列表模式 + 回收目标都在打出时(确认期)选
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                      
    if (chosen['mode'] === undefined) {
      return {
        itemId: `spell:${movedCardOid}:UNL-103`, controller, key: 'mode',
        prompt: '处置命令:选择一个 — 回收对手废牌堆最多三张 / 抽一张牌',
        candidates: [
          { id: 'recycle', label: '从对手的废牌堆里总共选择最多三张牌回收' },
          { id: 'draw', label: '抽一张牌' },
        ],
      }
    }
    if (chosen['mode'] !== 'recycle') return null
                                           
    const taken = PICKS.map((k) => chosen[k]).filter((x): x is string => x !== undefined)
    if (taken.includes('stop')) return null
    const next = PICKS.find((k) => chosen[k] === undefined)
    if (next === undefined) return null         
    const cands = foeDiscardCards(state, controller).filter((oid) => !taken.includes(oid))
    if (cands.length === 0) return null                 
    return {
      itemId: `spell:${movedCardOid}:UNL-103`, controller, key: next,
      prompt: `处置命令:选第 ${taken.length + 1} 张要回收的牌(最多三张,可停止)`,
      isTarget: true, // ★1782 从对手的废牌堆里总共选择最多三张牌
      candidates: [
        ...cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        { id: 'stop', label: '不再选(「最多」三张)' },
      ],
    }
  },
  makeResolve:
    ({ controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    if (chosen?.['mode'] === 'draw') {
      return [{ kind: 'draw', player: controller, count: 1 } as GameEvent]
    }
    if (chosen?.['mode'] !== 'recycle') return []             
                                                  
    const pool = new Set(foeDiscardCards(state, controller))
    const picks = PICKS.map((k) => chosen?.[k])
      .filter((x): x is string => x !== undefined && x !== 'stop' && pool.has(x))
    const byOwner = new Map<string, ObjId[]>()
    for (const oid of picks) {
      const owner = state.objects[oid as ObjId]?.owner as string | undefined
      if (owner === undefined) continue
      byOwner.set(owner, [...(byOwner.get(owner) ?? []), oid as ObjId])
    }
    return [...byOwner.entries()].map(([player, objs]) =>
      ({ kind: 'recycle', player: player as PlayerId, objs } as GameEvent))
  },
}

export const UNL_103: Card = {
  id: 'UNL-103', cardNo: 'UNL-103/219', name: '处置命令', category: 'spell',
  domains: ['orange'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '二选一:回收对手废牌堆最多3张(按拥有者分组)/抽一张(UNL_103_SPEC)' }],
}
