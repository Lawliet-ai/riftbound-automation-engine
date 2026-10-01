import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { makeForesightTriggers } from '../../src/keywords/foresight'
import { detectTriggers } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'

                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`

function obj(id: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(BASE),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], deckN = 3): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let s: GameState = { ...base, objects, zones }
  for (let i = 0; i < deckN; i++) {
    const id = `deck${i}`
    const c = obj(id, { zone: asZoneId(`mainDeck:${P1}`), defId: `CARD${i}` })
    const dz = s.zones[`mainDeck:${P1}`]!
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [dz.id]: { ...dz, contents: [...dz.contents, asObjId(id)] } } }
  }
  return s
}
                               
                                                                   
const kwOf = (map: Record<string, readonly string[]>) => (o: { defId: string }): readonly string[] => map[o.defId] ?? []

describe('§817.1.c 触发条件=常驻牌进场', () => {
  test('带预知的牌进场 → 产出一个触发', () => {
    const s = scene([obj('u')])
    const trigs = makeForesightTriggers(s, kwOf({ 'D-u': ['预知'] }))
    expect(trigs).toHaveLength(1)
    const items = detectTriggers(s, { kind: 'playUnit', unit: asObjId('u'), player: P1 }, trigs, P1)
    expect(items).toHaveLength(1)
  })

  test('别的牌进场不触发我的预知("此牌"=自己)', () => {
    const s = scene([obj('u'), obj('other')])
    const trigs = makeForesightTriggers(s, kwOf({ 'D-u': ['预知'] }))
    const items = detectTriggers(s, { kind: 'playUnit', unit: asObjId('other'), player: P1 }, trigs, P1)
    expect(items).toHaveLength(0)
  })

  test('没有预知的牌不产触发', () => {
    expect(makeForesightTriggers(scene([obj('u')]), kwOf({}))).toHaveLength(0)
  })

  test('§817.2 多个预知【分别触发】(与灵便"只算第一个"相反)', () => {
    const s = scene([obj('u')])
    expect(makeForesightTriggers(s, kwOf({ 'D-u': ['预知', '预知'] }))).toHaveLength(2)
  })
})

describe('§817.2.a 每次触发玩家自选是否回收', () => {
  const setup = () => {
    const s = scene([obj('u')])
    const t = makeForesightTriggers(s, kwOf({ 'D-u': ['预知'] }))[0]!
    return { s, t }
  }

  test('先问选择:提示里写出看到的那张牌', () => {
    const { s, t } = setup()
    const req = t.nextChoice!(s, { kind: 'playUnit', unit: asObjId('u'), player: P1 }, {})
    expect(req).not.toBeNull()
    expect(req!.prompt).toContain('CARD2')                     
    expect(req!.candidates.map((c) => c.id).sort()).toEqual(['no', 'yes'])
  })

  test('选"回收" → 发洞察事件,那张牌进牌堆底', () => {
    const { s, t } = setup()
    const before = s.zones[`mainDeck:${P1}`]!.contents.length
    const evs = t.effect(s, { kind: 'playUnit', unit: asObjId('u'), player: P1 }, { recycle: 'yes' })
    expect(evs).toHaveLength(1)
    const after = applyEvents(s, evs).state
    const deck = after.zones[`mainDeck:${P1}`]!
    expect(deck.contents.length).toBe(before)               
                                                        
    expect(after.objects[deck.contents[0]!]!.defId).toBe('CARD2')
  })

  test('选"不回收" → 不产生任何事件(看牌不改变状态,别白跑一次清理)', () => {
    const { s, t } = setup()
    expect(t.effect(s, { kind: 'playUnit', unit: asObjId('u'), player: P1 }, { recycle: 'no' })).toEqual([])
  })

  test('§436.4/§436.4.a 牌堆空:不问选择、不燃尽', () => {
    const s = scene([obj('u')], 0)
    const t = makeForesightTriggers(s, kwOf({ 'D-u': ['预知'] }))[0]!
    expect(t.nextChoice!(s, { kind: 'playUnit', unit: asObjId('u'), player: P1 }, {})).toBeNull()
    expect(t.effect(s, { kind: 'playUnit', unit: asObjId('u'), player: P1 }, {})).toEqual([])
  })

  test('§817.2.b 不回收时,两次预知看到【同一张】牌', () => {
    const s = scene([obj('u')])
    const [t1, t2] = makeForesightTriggers(s, kwOf({ 'D-u': ['预知', '预知'] }))
    const ev = { kind: 'playUnit' as const, unit: asObjId('u'), player: P1 }
                                
    const s1 = applyEvents(s, t1!.effect(s, ev, { recycle: 'no' })).state
    expect(t2!.nextChoice!(s1, ev, {})!.prompt).toContain('CARD2')
  })
})
