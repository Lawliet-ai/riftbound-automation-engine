import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { makeNimbleTriggers, withImpliedKeywords } from '../../src/keywords/nimble'
import { detectTriggers } from '../../src/dsl/trigger'

                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, defId: string, zone: string, ctrl = P1, types: GameObject['baseTypes'] = ['unit']): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}
                                          
const kw = (o: { defId: string }): readonly string[] =>
  o.defId === 'NIMBLE-G' ? ['装配黄色', '灵便'] : o.defId === 'NIMBLE2-G' ? ['灵便', '灵便'] : []
const playEv = (oid: string) => ({ kind: 'playUnit' as const, unit: asObjId(oid), player: P1 })

describe('§819.1.b 权限蕴含:灵便自带[反应]', () => {
  test('印着灵便没印反应 → 补出反应', () => {
    expect(withImpliedKeywords(['灵便'])).toContain('反应')
  })

  test('两个都印了 → 不重复', () => {
    expect(withImpliedKeywords(['灵便', '反应']).filter((k) => k === '反应')).toHaveLength(1)
  })

  test('没灵便 → 原样返回,不凭空给反应', () => {
    expect(withImpliedKeywords(['装配黄色'])).toEqual(['装配黄色'])
  })
})

describe('§819.1.d 触发:打出即贴到你控制的一名单位', () => {
  test('带灵便的装备 → 一条触发;打出它就响', () => {
    const s = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']), obj('u', 'PLAIN', BF0))
    const trigs = makeNimbleTriggers(s, kw)
    expect(trigs).toHaveLength(1)
    expect(detectTriggers(s, playEv('g'), trigs, P1)).toHaveLength(1)
  })

  test('★§819.2 两个灵便仍然只有【一条】触发(与百炼"分别触发"相反)', () => {
    const s = scene(obj('g', 'NIMBLE2-G', `base:${P1}`, P1, ['equipment']))
    expect(makeNimbleTriggers(s, kw)).toHaveLength(1)
  })

  test('没灵便的卡不产触发', () => {
    expect(makeNimbleTriggers(scene(obj('g', 'PLAIN', `base:${P1}`)), kw)).toHaveLength(0)
  })
})

describe('贴附目标:§819.1.d「你控制的一名单位」', () => {
  const t = (s: GameState) => makeNimbleTriggers(s, kw)[0]!

  test('列出己方场上单位', () => {
    const s = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']), obj('u', 'PLAIN', BF0))
    const req = t(s).nextChoice!(s, playEv('g'), {})!
    expect(req.candidates.map((c) => c.id)).toEqual(['u'])
  })

  test('★卡文没写"可以"⇒ 候选里【没有】"不贴"这个选项', () => {
    const s = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']), obj('u', 'PLAIN', BF0))
    const req = t(s).nextChoice!(s, playEv('g'), {})!
    expect(req.candidates.map((c) => c.id)).not.toContain('skip')
  })

  test('★对手的单位不是合法目标(按 controller 判,不是 owner)', () => {
    const s = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']), obj('t', 'PLAIN', BF0, P2))
    expect(t(s).nextChoice!(s, playEv('g'), {})).toBeNull()
  })

  test('★装备不能当灵便的贴附目标(原文"一名单位")', () => {
    const s = scene(
      obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']),
      obj('g2', 'PLAIN', `base:${P1}`, P1, ['equipment']),
    )
    expect(t(s).nextChoice!(s, playEv('g'), {})).toBeNull()
  })

  test('一个合法目标都没有 → 不问、也不产事件(不入空转项目)', () => {
    const s = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']))
    expect(t(s).nextChoice!(s, playEv('g'), {})).toBeNull()
    expect(t(s).effect(s, playEv('g'), {})).toEqual([])
  })

  test('选中 → 产出贴附事件', () => {
    const s = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']), obj('u', 'PLAIN', BF0))
    expect(t(s).effect(s, playEv('g'), { nimble: 'u' })).toEqual([{ kind: 'attach', obj: 'g', to: 'u', player: P1 }])             
  })

  test('结算时目标已离场 → 无操作', () => {
    const s0 = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']), obj('u', 'PLAIN', BF0))
    const gone = scene(obj('g', 'NIMBLE-G', `base:${P1}`, P1, ['equipment']))
    expect(t(s0).effect(gone, playEv('g'), { nimble: 'u' })).toEqual([])
  })
})
