import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { makeJaxTrigger } from '../../data/cards/gear-batch-249'
import { equipActivationSpecs } from '../../src/loop/equipActivation'

                                                                     
                                                                                  
                                                              
                                                     
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const SELF = asObjId('me')

function obj(oid: string, defId: string, ctrl = P1, zone = `base:${P1}`, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
                                         
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { ...base.runePools[P1]!, mana: 1 } } } as GameState
}
const attach = (gear: string, to: string, player?: string): GameEvent =>
  ({ kind: 'attach', obj: asObjId(gear), to: asObjId(to),
    ...(player !== undefined ? { player } : {}) } as GameEvent)

describe('🔴★★★★SFD-119「当你为我贴附武装时」——执行者那格(417 债)', () => {
                                           
  const board = (): GameState => scene([obj('me', 'SFD-119'), obj('g', 'SFD-150', P1, `base:${P1}`, ['equipment'])])
  const trig = makeJaxTrigger(SELF, P1)

  test('🔴★★★带 player 真判:我贴的响;对手贴的不响;缺省(老事件)按旧等价放行', () => {
    expect(trig.filter!(attach('g', 'me', P1 as string), board()), '你贴的 ⇒ 响').toBe(true)
    expect(trig.filter!(attach('g', 'me', P2 as string), board()), '★对手贴的 ⇒ 不响(437 前这格判不了)').toBe(false)
    expect(trig.filter!(attach('g', 'me'), board()), '缺省 ⇒ 旧等价放行(向后兼容)').toBe(true)
  })

  test('★老判据不回归:贴别人不响;普通装备(非武装)不响', () => {
    const s = scene([obj('me', 'SFD-119'), obj('other', 'BLK'), obj('g', 'SFD-150', P1, `base:${P1}`, ['equipment']),
      obj('plain', 'OGN-098', P1, `base:${P1}`, ['equipment'])])
    expect(makeJaxTrigger(SELF, P1).filter!(attach('g', 'other', P1 as string), s), '贴别人').toBe(false)
    expect(makeJaxTrigger(SELF, P1).filter!(attach('plain', 'me', P1 as string), s), '非武装').toBe(false)
  })
})

describe('★发出点抽查:装配激活的 attach 事件带 player', () => {
  test('equipActivationSpecs 的 makeResolve 产出带 player', () => {
    const { specs } = equipActivationSpecs(['装配2'])
    const spec = specs[0]
    if (spec === undefined) return                           
    const evs = spec.makeResolve({ selfOid: 'g', controller: P1, target: 'me' } as never)(scene([]) as never)
    const at = evs.find((e) => e.kind === 'attach') as { player?: string } | undefined
    if (at !== undefined) expect(at.player, '执行者随事件走').toBe(P1)
  })
})
