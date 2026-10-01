import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { withShangeCopies } from '../../src/effects/shange'

                                                     
                                                       
                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, defId: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)
const gear = (oid: string, defId: string, host: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {},
  status: { attachedTo: asObjId(host) },
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const SPECS: readonly { key: string; oncePerTurn?: boolean }[] = [{ key: 'SFD-050:sand', oncePerTurn: true }, { key: 'SFD-050:other' }]

describe('★★★★★★★ withShangeCopies(L290)', () => {
  test('★★★★★★无尚歌=原样(引用不变);一尚歌=每条技能×2(复制份 key 带 :shange:1);两尚歌=×3', () => {
    const az = unit('az', 'SFD-050')
    const s0 = scene([az])
    expect(withShangeCopies(s0, az, SPECS), '★零复制走原引用(零改动兼容)').toBe(SPECS)
    const s1 = scene([az, gear('s1', 'SFD-059', 'az')])
    const one = withShangeCopies(s1, az, SPECS)
    expect(one).toHaveLength(4)
    expect(one.map((s) => s.key)).toEqual(['SFD-050:sand', 'SFD-050:other', 'SFD-050:sand:shange:1', 'SFD-050:other:shange:1'])
                                                                  
    expect(one[2]!.oncePerTurn, '★复制份保留 oncePerTurn(各自一回合一次)').toBe(true)
    const s2 = scene([az, gear('s1', 'SFD-059', 'az'), gear('s2', 'SFD-059', 'az')])
    expect(withShangeCopies(s2, az, SPECS)).toHaveLength(6)
  })

  test('★★★★★★反例:别的武装不算;贴别人的尚歌不算;无技能单位复制不出', () => {
    const az = unit('az', 'SFD-050')
    const other = unit('ot', 'U-plain')
    const s = scene([az, other, gear('x1', 'SFD-090', 'az'), gear('s1', 'SFD-059', 'ot')])
    expect(withShangeCopies(s, az, SPECS), '★SFD-090 不是尚歌;贴 ot 的不罩 az').toBe(SPECS)
    expect(withShangeCopies(s, other, []), '★无技能 ⇒ 空照旧').toEqual([])
  })
})
