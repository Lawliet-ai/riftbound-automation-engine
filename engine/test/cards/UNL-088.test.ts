import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { runEscapeHatch } from '../../src/dsl/escapeHatch'
import { runTurn } from '../../src/goldfish/singleSeat'
import {
  palaceStartCheck,
  palaceWinPredicate,
  UNL_088,
  UNL_088_CARD_EFFECT,
  battlefieldUnitCount,
} from '../../data/cards/UNL-088'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function u(id: string, zone: string): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: P1, controller: P1, zone: asZoneId(zone), baseMight: 1, damage: 0, counters: {}, status: {} }
}
                               
function build(units: [string, string][], handCount: number): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const add = (o: GameObject) => {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const [id, z] of units) add(u(id, z))
  for (let i = 0; i < handCount; i++) add(u(`h${i}`, 'hand:P1'))
  return { ...base, objects, zones }
}

describe('WIN_GAME 原语卡无关(合成中性探针)', () => {
  test('任意卡经 api.winGame → 立即胜(原语通用,不绑倾颓宫殿)', () => {
    const s = createInitialState([P1, P2])
    const { state } = runEscapeHatch(s, (api) => api.winGame(P1), null)
    expect(state.winner).toBe(P1)
  })
})

describe('倾颓宫殿 UNL-088 谓词 = 全场合计4单位 + 手牌4(DK-49 头号硬伤)', () => {
  test('全场合计恰4单位(跨2战场)+ 手牌4 → 满足', () => {
    const s = build([['a', 'battlefield:shared:0'], ['b', 'battlefield:shared:0'], ['c', 'battlefield:shared:1'], ['d', 'battlefield:shared:1']], 4)
    expect(battlefieldUnitCount(s, P1)).toBe(4)
    expect(palaceWinPredicate(s, P1)).toBe(true)
  })
  test('🔴每战场4=共8单位(错读)→ 不满足(证合计非每战场)', () => {
    const s = build([
      ['a', 'battlefield:shared:0'], ['b', 'battlefield:shared:0'], ['c', 'battlefield:shared:0'], ['d', 'battlefield:shared:0'],
      ['e', 'battlefield:shared:1'], ['f', 'battlefield:shared:1'], ['g', 'battlefield:shared:1'], ['h', 'battlefield:shared:1'],
    ], 4)
    expect(battlefieldUnitCount(s, P1)).toBe(8)
    expect(palaceWinPredicate(s, P1)).toBe(false)          
  })
  test('单位或手牌数不对 → 不满足', () => {
    expect(palaceWinPredicate(build([['a', 'battlefield:shared:0'], ['b', 'battlefield:shared:0'], ['c', 'battlefield:shared:1']], 4), P1)).toBe(false)       
    expect(palaceWinPredicate(build([['a', 'battlefield:shared:0'], ['b', 'battlefield:shared:0'], ['c', 'battlefield:shared:1'], ['d', 'battlefield:shared:1']], 5), P1)).toBe(false)       
  })
})

describe('§315.2.a.1 触发早于抽牌,满足即锁定', () => {
  test('runTurn 开始步骤检定命中 → 立即胜,不再抽牌(手牌仍4)', () => {
    const s = build([['a', 'battlefield:shared:0'], ['b', 'battlefield:shared:0'], ['c', 'battlefield:shared:1'], ['d', 'battlefield:shared:1']], 4)
    const after = runTurn(s, {}, (st) => palaceStartCheck(st, P1))
    expect(after.winner).toBe(P1)
    expect(after.zones['hand:P1']!.contents).toHaveLength(4)              
  })
})

describe('用勘误文本非 API 错译', () => {
  test('cardEffect 为"各处战场上有且仅有四名单位"(合计),非"每处战场"', () => {
    expect(UNL_088_CARD_EFFECT).toContain('各处战场上有且仅有四名单位')
    expect(UNL_088_CARD_EFFECT).not.toContain('每处战场')
    expect(UNL_088.cardNo).toBe('UNL-088/219')
  })
})
