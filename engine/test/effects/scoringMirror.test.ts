import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { Trigger } from '../../src/dsl/trigger'
import { mirrorScoringTriggers } from '../../src/effects/scoringMirror'
import { makeHuntTriggers } from '../../src/keywords/hunt'
import { detectTriggers } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'
import { experienceOf } from '../../src/keywords/level'

                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `U-${id}`, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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
  return { ...base, objects, zones }
}
                                                 
function holdOnly(sourceOid: string): Trigger {
  return {
    id: `fake-hold:${sourceOid}`,
    sourceOid: asObjId(sourceOid),
    controller: P1,
    event: 'hold',
    filter: (ev) => ev.kind === 'hold' && ev.battlefield === BF0,
    effect: (_s, ev) => (ev.kind === 'hold' ? [{ kind: 'gainPoint' as const, player: P1, amount: 1 }] : []),
  }
}

describe('互映的作用域:只映【我的】规则文本', () => {
  test('单位自己的据守触发 → 补出一条征服触发', () => {
    const s = scene(obj('u'))
    const added = mirrorScoringTriggers(s, [holdOnly('u')], [asObjId('u')])
    expect(added).toHaveLength(1)
    expect(added[0]!.event).toBe('conquer')
  })

  test('§718.3 贴在我身上的武装注入的触发也算"我的"', () => {
    const gear = obj('g', { baseTypes: ['equipment'], status: { attachedTo: asObjId('u') } })
    const s = scene(obj('u'), gear)
    const added = mirrorScoringTriggers(s, [holdOnly('g')], [asObjId('u')])
    expect(added).toHaveLength(1)                              
  })

  test('别的单位的触发不映(按 sourceOid 判,不按控制者)', () => {
    const s = scene(obj('u'), obj('other'))
    expect(mirrorScoringTriggers(s, [holdOnly('other')], [asObjId('u')])).toHaveLength(0)
  })

  test('没有穿戴者 → 什么都不映', () => {
    const s = scene(obj('u'))
    expect(mirrorScoringTriggers(s, [holdOnly('u')], [])).toHaveLength(0)
  })
})

describe('互映后的触发真能在新时机响应', () => {
  test('据守触发被映成征服触发:一次征服使其结算', () => {
    const s = scene(obj('u'))
    const all = [holdOnly('u'), ...mirrorScoringTriggers(s, [holdOnly('u')], [asObjId('u')])]
    const ev = { kind: 'conquer', player: P1, battlefield: BF0 } as const
    const items = detectTriggers(s, ev, all, P1)
    expect(items).toHaveLength(1)                      
    const after = applyEvents(s, items[0]!.resolve(s, {}, items[0]!)).state
    expect(after.scores[P1]).toBe(1)                       
  })
})

describe('§823.1.b 狩猎本就两边都有 → 互映不翻倍', () => {
  test('狩猎2 + 阿瑞昂:一次征服仍然只给 2 经验', () => {
    const s = scene(obj('hunter', { baseKeywords: ['狩猎2'] }))
    const base = makeHuntTriggers(s)
    expect(base).toHaveLength(2)             
    const added = mirrorScoringTriggers(s, base, [asObjId('hunter')])
    expect(added).toHaveLength(0)                          
    const ev = { kind: 'conquer', player: P1, battlefield: BF0 } as const
    const items = detectTriggers(s, ev, [...base, ...added], P1)
    let out = s
    for (const it of items) out = applyEvents(out, it.resolve(out, {}, it)).state
    expect(experienceOf(out, P1)).toBe(2)        
  })
})
