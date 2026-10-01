import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { compileCard, type Ability, type Card } from '../src/dsl/card'
import { resolveSelector } from '../src/dsl/selector'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const vanilla: Card = {
  id: 'v', cardNo: 'X-001', name: '素单位', category: 'unit', domains: ['red'],
  energy: 2, power: 3, keywords: ['据守'], playModes: [{ kind: 'standard' }], abilities: [],
}

describe('Card schema + compileCard 路由五类能力', () => {
  test('香草卡编译:各子系统为空', () => {
    const c = compileCard(vanilla)
    expect(c.staticEffects).toHaveLength(0)
    expect(c.triggers).toHaveLength(0)
    expect(c.shields).toHaveLength(0)
  })
  test('static/triggered/replacement/activated/passive 各归其位', () => {
    const abilities: Ability[] = [
      { kind: 'static', effect: { id: 's', duration: 'permanent', fromPassive: true, predicate: () => true, modification: { kind: 'grantKeyword', keyword: '迅捷' } } },
      { kind: 'triggered', trigger: { id: 't', sourceOid: null, controller: P1, event: 'damage', effect: () => [] } },
      { kind: 'replacement', shield: { id: 'r', source: null, controller: P1, intercepts: 'gainPoint', predicate: () => true, rewrite: () => null } },
      { kind: 'activated', cost: { energy: 1 }, effect: () => [] },
      { kind: 'passive', describe: '仅对手回合可打出' },
    ]
    const c = compileCard({ ...vanilla, abilities })
    expect(c.staticEffects).toHaveLength(1)          
    expect(c.triggers).toHaveLength(1)            
    expect(c.shields).toHaveLength(1)          
    expect(c.activated).toHaveLength(1)
    expect(c.passives).toHaveLength(1)
  })
})

describe('Selector 解析', () => {
  function withUnits(): GameState {
    const mk = (oid: string, ctrl: typeof P1, zone: string): GameObject => ({
      oid: asObjId(oid), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 3, damage: 0, counters: {}, status: {},
    })
    const objs = [mk('mine', P1, 'battlefield:shared:0'), mk('theirs', P2, 'battlefield:shared:0'), mk('myhand', P1, 'hand:P1')]
    const objects: Record<string, GameObject> = {}
    const base = createInitialState([P1, P2])
    const zones = { ...base.zones }
    for (const o of objs) {
      objects[o.oid] = o
      const z = zones[o.zone]!
      zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return { ...base, objects, zones }
  }
  test('战场上你控制的单位', () => {
    const s = withUnits()
    const r = resolveSelector(s, { type: 'unit', zone: 'battlefield', controller: 'you' }, P1)
    expect(r).toEqual([asObjId('mine')])
  })
  test('战场上对手控制的单位', () => {
    const s = withUnits()
    const r = resolveSelector(s, { type: 'unit', zone: 'battlefield', controller: 'opponent' }, P1)
    expect(r).toEqual([asObjId('theirs')])
  })
  test('count 限制数量', () => {
    const s = withUnits()
    const r = resolveSelector(s, { type: 'unit', zone: 'battlefield', count: 1 }, P1)
    expect(r).toHaveLength(1)
  })
})
