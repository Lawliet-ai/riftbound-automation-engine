                                                                         
                                       
                                     
                         
                                                     
                                                
                                                                 
                                                            
                                                            
                                                                
                                                     
                                                      
                                                                        
                                                      
import { onField } from './activated-batch2'                                   
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { isEquipment, isUnit } from '../../src/state/cardTypes'

export const OGN_244_CARD_EFFECT =
  '每名玩家分别选择两名单位、两件装备、两枚符文和自己的两张手牌。'
  + '回收其余的单位、装备、符文和手牌。'

                                  
export const JUDGMENT_KEEP = 2
const CATS = ['unit', 'gear', 'rune', 'hand'] as const
type Cat = typeof CATS[number]

                                                               
                                                                      
                       
const fielded = onField

                                             
function catPool(state: GameState, cat: Cat, player: PlayerId): readonly ObjId[] {
  if (cat === 'hand') return [...(state.zones[`hand:${player}` as ZoneId]?.contents ?? [])].sort()
  return Object.values(state.objects)
    .filter((o) => fielded(state, o)
      && (cat === 'unit' ? isUnit(o)
        : cat === 'gear' ? isEquipment(o)
        : o.defId.startsWith('rune:')))
    .map((o) => o.oid).sort()
}

const prefixOf = (p: PlayerId, cat: Cat): string => `judg:${p}:${cat}:`

export const OGN_244_SPEC: PlaySpec = {
  defId: 'OGN-244', cardNo: 'OGN·244/298', name: '圣裁之刻', kind: 'spell',
  cost: { mana: 7, pips: [['yellow'], ['yellow']] }, // ㊶ 7费 2黄pip(cardCosts 实测)
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                                      
      for (const p of state.players) {
        for (const cat of CATS) {
          const ask = multiSelectChoice({
            itemId: `spell:${movedCardOid}:OGN-244`, controller: p, prefix: prefixOf(p, cat),
            prompt: `圣裁之刻:${p} 选择留下的${cat === 'unit' ? '两名单位' : cat === 'gear' ? '两件装备' : cat === 'rune' ? '两枚符文' : '自己的两张手牌'}`,
            doneLabel: '就这些', max: JUDGMENT_KEEP,
                                                                                 
                                                                
                                                                     
            minPicks: JUDGMENT_KEEP,
            candidates: (st: GameState) => catPool(st, cat, p)
              .map((oid) => ({ id: oid as string, label: st.objects[oid]?.defId ?? (oid as string) })),
          })
          const q = ask(state, chosen)
          if (q !== null) return q
        }
      }
      return null
    },
  makeResolve:
    ({ controller: _c }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const events: GameEvent[] = []
                                                                  
      for (const cat of ['unit', 'gear', 'rune'] as const) {
        const pool = catPool(state, cat, state.players[0]!)
        const kept = new Set<string>()
        for (const p of state.players) {
          for (const oid of multiSelectPicked(chosen ?? {}, prefixOf(p, cat))) {
            if (pool.includes(oid as ObjId)) kept.add(oid as string)
          }
        }
        const byOwner = new Map<string, ObjId[]>()
        for (const oid of pool) {
          if (kept.has(oid as string)) continue
          const owner = state.objects[oid]?.owner as string | undefined
          if (owner === undefined) continue
          byOwner.set(owner, [...(byOwner.get(owner) ?? []), oid])
        }
        for (const [player, objs] of byOwner) events.push({ kind: 'recycle', player: player as PlayerId, objs } as GameEvent)
      }
                                                  
      for (const p of state.players) {
        const pool = catPool(state, 'hand', p)
        const kept = new Set(multiSelectPicked(chosen ?? {}, prefixOf(p, 'hand')).filter((oid) => pool.includes(oid as ObjId)))
        const rest = pool.filter((oid) => !kept.has(oid as string))
        if (rest.length > 0) events.push({ kind: 'recycle', player: p, objs: [...rest] } as GameEvent)
      }
      return events
    },
}

export const OGN_244: Card = {
  id: 'OGN-244', cardNo: 'OGN·244/298', name: '圣裁之刻', category: 'spell',
  domains: ['yellow'], energy: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每人分别留两单位/两装备/两符文(不限己方)+自己两手牌;其余全回收(OGN_244_SPEC)' }],
}
