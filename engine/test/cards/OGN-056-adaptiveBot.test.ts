import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { destroyableEquipment } from '../../data/cards/OGN-056'
import { buffCount } from '../../src/keywords/buff'

                                                   
                                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function bot(oid = 'b', zone = BF0): GameObject {
  const s = specLookup('OGN-056')
  return {
    oid: asObjId(oid), defId: 'OGN-056', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {},
  }
}
function gear(oid: string, controller = P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'OGN-101', owner: controller, controller,
    zone: asZoneId(`base:${controller}`), baseMight: 0, baseKeywords: [],
    baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
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
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                                    
function conquerAt(st: GameState, battlefield: string, pick?: string, player = P1): GameState {
  let s = landAndEnqueueTriggers(st, [{ kind: 'conquer', player, battlefield }], activeTriggers, player, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = pick ? { gear: pick } : {}
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('前提', () => {
  test('这张卡是单位,3 战力(specLookup 拿得到)', () => {
    expect(cardKind('OGN-056')).toBe('unit')
    expect(specLookup('OGN-056').baseMight).toBe(3)
  })

  test('真 registry 收得到它的征服触发', () => {
    expect(activeTriggers(scene([bot()])).some((t) => t.sourceOid === asObjId('b'))).toBe(true)
  })
})

describe('★候选集:场上任意装备(卡文没写敌我)', () => {
  test('★对手的装备也在候选里——卡文没限"友方",不能自作主张只给友方', () => {
    const st = scene([bot(), gear('g1', P1), gear('g2', P2)])
    const c = destroyableEquipment(st)
    expect(c).toContain(asObjId('g1'))
    expect(c).toContain(asObjId('g2'))
  })

  test('单位不在候选里(只拆装备)', () => {
    const st = scene([bot(), gear('g1')])
    expect(destroyableEquipment(st)).not.toContain(asObjId('b'))
  })
})

describe('★征服后:选了装备就拆掉换增益', () => {
  test('★选中装备 → 它被摧毁,机器人拿到 1 个增益', () => {
    const s = conquerAt(scene([bot(), gear('g1')]), BF0, 'g1')
    expect(s.objects['g1']).toBeUndefined()        
    expect(buffCount(s.objects['b']!)).toBe(1)
  })

  test('★不选 → 不拆也不拿(§383.3.a「你可以选择」)', () => {
    const s = conquerAt(scene([bot(), gear('g1')]), BF0)
    expect(s.objects['g1']).toBeDefined()
    expect(buffCount(s.objects['b']!)).toBe(0)
  })

  test('★场上没有装备 → 整条效果不执行,不能白拿增益', () => {
    const s = conquerAt(scene([bot()]), BF0)
    expect(buffCount(s.objects['b']!)).toBe(0)
  })

  test('★征服的是别处战场 → 不触发(§471.2.a 在被征服的战场上)', () => {
    const s = conquerAt(scene([bot('b', BF0), gear('g1')]), BF1, 'g1')
    expect(s.objects['g1']).toBeDefined()
    expect(buffCount(s.objects['b']!)).toBe(0)
  })

  test('★征服者是对手 → 不触发', () => {
    const s = conquerAt(scene([bot(), gear('g1')]), BF0, 'g1', P2)
    expect(s.objects['g1']).toBeDefined()
    expect(buffCount(s.objects['b']!)).toBe(0)
  })
})
