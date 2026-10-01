import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { couldPayWithReactionGains, canPayFromState } from '../../src/game/economy'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'

                                                                   
  
                                                     
                     
                                                                               
                                        
                                                              
                                                                       
                                                          
                                     
                                                    
  
                                           
                                                                        
                                                              
                                           
                                                         
                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`
const M1: Cost = { mana: 1 } as Cost
const M2: Cost = { mana: 2 } as Cost
const BLUE2: Cost = { mana: 0, pips: [['blue'], ['blue']] } as Cost

                                                         
const spec = (key: string, tap: boolean, gain: { mana?: number; energy?: Record<string, number> }): ActivatedSpec => ({
  key, cost: {}, keywords: ['反应'], fastResolve: true, tapSelf: tap,
  makeResolve: ({ controller }: { controller: string }) => () =>
    [{ kind: 'gainResource', player: controller, ...gain }],
} as unknown as ActivatedSpec)

                                              
function board(defIds: readonly string[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objs = defIds.map((defId, i) => ({
    oid: asObjId(`u${i}`), defId, owner: P1, controller: P1, zone: asZoneId(BASE),
    baseMight: 1, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject))
  const base = s.zones[asZoneId(BASE)]!
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones: { ...s.zones, [BASE]: { ...base, contents: objs.map((o) => o.oid) } },
    runePools: { ...s.runePools, [P1]: { mana: 0, runes: {} } },
  } as unknown as GameState
}

const provider = (table: Record<string, readonly ActivatedSpec[]>) =>
  (defId: string): readonly ActivatedSpec[] => table[defId] ?? []

describe('★1193 谓词的产出累加:同一物件的 [横置] 技能互斥', () => {
  test('★★★★【前提自证】池子确实是 0,一分钱也付不出', () => {
    expect(canPayFromState(board(['A']), P1, M1)).toBe(false)
  })

  test('★★★★★【别推广过头】一条 tapSelf 技能 ⇒ 照样凑得出它那一份', () => {
    const st = board(['A'])
    const p = provider({ A: [spec('a', true, { mana: 1 })] })
    expect(couldPayWithReactionGains(st, P1, M1, p), '★收紧不能把正常的一份也收掉').toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【互斥·法力】同一物件两条 tapSelf(各产 1)⇒ 凑不出 2', () => {
    const st = board(['A'])
    const p = provider({ A: [spec('a', true, { mana: 1 }), spec('b', true, { mana: 1 })] })
    expect(
      couldPayWithReactionGains(st, P1, M2, p),
      '★★横置一次只能激活一条 —— 求和就是印钞方向的偏宽',
    ).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【互斥·符能通道同理】两条 tapSelf 各产 1 蓝 ⇒ 凑不出 2 蓝', () => {
    const st = board(['A'])
    const p = provider({ A: [spec('a', true, { energy: { blue: 1 } }), spec('b', true, { energy: { blue: 1 } })] })
    expect(couldPayWithReactionGains(st, P1, BLUE2, p), '★两个通道要同一口径,别只修法力那半').toBe(false)
    expect(
      couldPayWithReactionGains(st, P1, { mana: 0, pips: [['blue']] } as Cost, p),
      '★但一枚蓝仍然凑得出',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【尚歌场景·本轮靶心】同一条技能被复制成两份 ⇒ 仍只算一份', () => {
    const st = board(['A'])
                                                               
    const printed = spec('UNL-093:mana', true, { mana: 1 })
    const copy = spec('UNL-093:mana:shange:1', true, { mana: 1 })
    const p = provider({ A: [printed, copy] })
    expect(
      couldPayWithReactionGains(st, P1, M2, p),
      '★★这正是「不修互斥就补尚歌层会开印钞口」的那一档',
    ).toBe(false)
    expect(couldPayWithReactionGains(st, P1, M1, p), '★一份仍然算得出').toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐【只收紧 tapSelf 那一族】两条【非】tapSelf ⇒ 照样求和到 2', () => {
    const st = board(['A'])
    const p = provider({ A: [spec('a', false, { mana: 1 }), spec('b', false, { mana: 1 })] })
    expect(
      couldPayWithReactionGains(st, P1, M2, p),
      '★★不横置自己的技能之间没有互斥 —— 收紧不许波及它们',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【物件之间仍求和】两个物件各一条 tapSelf ⇒ 凑得出 2', () => {
    const st = board(['A', 'B'])
    const p = provider({ A: [spec('a', true, { mana: 1 })], B: [spec('b', true, { mana: 1 })] })
    expect(
      couldPayWithReactionGains(st, P1, M2, p),
      '★★互斥是【物件内】的:两个物件各横置各的,两份都拿得到',
    ).toBe(true)
  })

  test('⭐⭐⭐⭐⭐⭐【混合】同物件一条 tapSelf + 一条非 tapSelf ⇒ 两份都算', () => {
    const st = board(['A'])
    const p = provider({ A: [spec('a', true, { mana: 1 }), spec('b', false, { mana: 1 })] })
    expect(couldPayWithReactionGains(st, P1, M2, p), '★非横置那条不占横置名额').toBe(true)
  })
})
