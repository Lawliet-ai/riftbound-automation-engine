import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers } from '../../data/registry'

                                           
                                                           
                                            
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, defId: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 6, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
const rektonTriggers = (s: GameState) =>
  activeTriggers(s).filter((t) => t.sourceDefId === 'VEN-019' || (t.id as string).includes('VEN-019'))

describe('★★★★★★★ 尚歌复制触发(QA L184)', () => {
  test('★★★★★★无尚歌 1 份;一尚歌 2 份(复制份 id 带 :shange:1);两尚歌 3 份(=QA 3尚歌4技能同律)', () => {
    const rk = unit('rk', 'VEN-019')
    expect(rektonTriggers(scene([rk]))).toHaveLength(1)
    const one = rektonTriggers(scene([rk, gear('s1', 'SFD-059', 'rk')]))
    expect(one, '★1 印刷+1 复制').toHaveLength(2)
    expect(one.filter((t) => (t.id as string).endsWith(':shange:1')), '★复制份 id 可区分').toHaveLength(1)
    expect(rektonTriggers(scene([rk, gear('s1', 'SFD-059', 'rk'), gear('s2', 'SFD-059', 'rk')])), '★两尚歌=3 份').toHaveLength(3)
  })

  test('★★★★★★反例:别的武装不复制;贴在别人身上的尚歌不算;无触发的单位贴尚歌不凭空产', () => {
    const rk = unit('rk', 'VEN-019')
    const plain = unit('pl', 'U-plain')
    const s = scene([rk, plain, gear('x1', 'SFD-090', 'rk'), gear('s1', 'SFD-059', 'pl')])
    expect(rektonTriggers(s), '★SFD-090 不是尚歌;贴 plain 的尚歌不罩雷克顿').toHaveLength(1)
    expect(activeTriggers(s).filter((t) => (t.id as string).includes('pl') && (t.id as string).includes('shange')),
      '★plain 无印刷触发 ⇒ 复制不出').toHaveLength(0)
  })
})
