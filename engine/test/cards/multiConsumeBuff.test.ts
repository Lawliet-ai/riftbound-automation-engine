import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { buffCount } from '../../src/keywords/buff'
import { MULTI_SELECT_DONE, multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { makeAlbusTrigger, OPEN_ACTION_SPEC } from '../../data/cards/buff-consumers'

                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(id: string, buffs = 0, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0,
    counters: buffs > 0 ? { buff: buffs } : {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], runes = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let s: GameState = { ...base, activePlayer: P1, phase: 'main', objects, zones }
  for (let i = 0; i < runes; i++) {
    const rid = `rune${i}`
    const r: GameObject = {
      oid: asObjId(rid), defId: 'RUNE', owner: P1, controller: P1, zone: asZoneId(`runeDeck:${P1}`),
      baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
    }
    const dz = s.zones[`runeDeck:${P1}`]!
    s = { ...s, objects: { ...s.objects, [rid]: r }, zones: { ...s.zones, [dz.id]: { ...dz, contents: [...dz.contents, asObjId(rid)] } } }
  }
  return s
}

describe('多选原语:反复追问一次一个', () => {
  const ask = multiSelectChoice({
    itemId: 'i1', controller: P1, prefix: 'p', prompt: '选几个',
    candidates: (st) => Object.values(st.objects).filter((o) => buffCount(o) > 0).map((o) => ({ id: o.oid as string, label: o.oid as string })),
  })

  test('★"够了"选项【一开始就在】——"任意数量"含零个', () => {
    const req = ask(scene([unit('a', 1)]), {})
    expect(req!.candidates.map((c) => c.id)).toContain(MULTI_SELECT_DONE)
  })

  test('第一次问 key=p0,选完之后问 p1', () => {
    const s = scene([unit('a', 1), unit('b', 1)])
    expect(ask(s, {})!.key).toBe('p0')
    expect(ask(s, { p0: 'a' })!.key).toBe('p1')
  })

  test('★已选过的不再出现在候选里(否则能对同一个连点)', () => {
    const s = scene([unit('a', 1), unit('b', 1)])
    const req = ask(s, { p0: 'a' })!
    expect(req.candidates.map((c) => c.id)).not.toContain('a')
    expect(req.candidates.map((c) => c.id)).toContain('b')
  })

  test('答"够了" → 收尾,不再追问', () => {
    expect(ask(scene([unit('a', 1), unit('b', 1)]), { p0: MULTI_SELECT_DONE })).toBeNull()
  })

  test('候选选空了 → 自动收尾,不问一个只剩"够了"的空问题', () => {
    expect(ask(scene([unit('a', 1)]), { p0: 'a' })).toBeNull()
  })

  test('multiSelectPicked 按序取回,遇"够了"即止', () => {
    expect(multiSelectPicked({ p0: 'a', p1: 'b', p2: MULTI_SELECT_DONE, p3: 'c' }, 'p')).toEqual(['a', 'b'])
    expect(multiSelectPicked({}, 'p')).toEqual([])
  })

  test('max 到顶即收尾', () => {
    const capped = multiSelectChoice({
      itemId: 'i1', controller: P1, prefix: 'p', prompt: 'x', max: 1,
      candidates: () => [{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }],
    })
    expect(capped(scene([]), { p0: 'a' })).toBeNull()
  })
})

describe('阿不思 OGN-230:每消耗一个增益召出一枚休眠符文', () => {
  const trig = () => makeAlbusTrigger(asObjId('albus'), P1)
  const playEv = { kind: 'playUnit' as const, unit: asObjId('albus'), player: P1 }

  test('消耗两个 → 召出两枚休眠符文,两个单位各少一枚增益', () => {
    const s = scene([unit('albus'), unit('a', 1), unit('b', 1)], 5)
    const evs = trig().effect(s, playEv, { albusBuff0: 'a', albusBuff1: 'b', albusBuff2: MULTI_SELECT_DONE })
    const after = applyEvents(s, evs).state
    expect(buffCount(after.objects['a' as never])).toBe(0)
    expect(buffCount(after.objects['b' as never])).toBe(0)
    expect(after.zones[`base:${P1}`]!.contents).toHaveLength(2)
                          
    for (const oid of after.zones[`base:${P1}`]!.contents) {
      expect(after.objects[oid]!.status.tapped).toBe(true)
    }
  })

  test('★一个都不消耗 → 不产生任何事件(零个是合法选择)', () => {
    const s = scene([unit('albus'), unit('a', 1)], 5)
    expect(trig().effect(s, playEv, { albusBuff0: MULTI_SELECT_DONE })).toEqual([])
  })

  test('打出【别的】单位不触发', () => {
    const t = trig()
    expect(t.filter!({ kind: 'playUnit', unit: asObjId('other'), player: P1 }, scene([]))).toBe(false)
  })

  test('§702.2.b.2 消耗事件带 by:控制者,消耗不到对手的', () => {
    const s = scene([unit('albus'), unit('t', 1, { controller: P2 })], 5)
    const evs = trig().effect(s, playEv, { albusBuff0: 't', albusBuff1: MULTI_SELECT_DONE })
    const after = applyEvents(s, evs).state
    expect(buffCount(after.objects['t' as never])).toBe(1)        
  })
})

describe('公开行动 OGN-153:消耗→活跃,然后【给所有友方单位】增益', () => {
  const resolve = (s: GameState, chosen: Record<string, string>) =>
    OPEN_ACTION_SPEC.makeResolve({ movedCardOid: 'card', controller: P1 })(s, chosen)

  test('费用按推导裁定:mana=energy 5,pip 数=returnEnergy 2', () => {
    expect(OPEN_ACTION_SPEC.cost).toEqual({ mana: 5, pips: [['orange'], ['orange']] })
  })

  test('选中的单位:增益被消耗、变为活跃', () => {
    const s = scene([unit('a', 1, { status: { dormant: true } }), unit('b', 0)])
    const after = applyEvents(s, resolve(s, { openAct0: 'a', openAct1: MULTI_SELECT_DONE })).state
    expect(after.objects['a' as never]!.status.dormant).toBe(false)
  })

  test('★卡文"然后"的顺序:先消耗、后普发 ⇒ 被消耗那个【又拿回】增益(既活跃又带增益)', () => {
    const s = scene([unit('a', 1, { status: { dormant: true } })])
    const after = applyEvents(s, resolve(s, { openAct0: 'a', openAct1: MULTI_SELECT_DONE })).state
    expect(after.objects['a' as never]!.status.dormant).toBe(false)
    expect(buffCount(after.objects['a' as never])).toBe(1)            
  })

  test('没被选中的友方单位也拿到增益("所有友方单位")', () => {
    const s = scene([unit('a', 1), unit('b', 0)])
    const after = applyEvents(s, resolve(s, { openAct0: 'a', openAct1: MULTI_SELECT_DONE })).state
    expect(buffCount(after.objects['b' as never])).toBe(1)
  })

  test('敌方单位不吃普发', () => {
    const s = scene([unit('a', 1), unit('t', 0, { controller: P2 })])
    const after = applyEvents(s, resolve(s, { openAct0: 'a', openAct1: MULTI_SELECT_DONE })).state
    expect(buffCount(after.objects['t' as never])).toBe(0)
  })

  test('一个都不选 → 仍然普发增益(前半段可选,后半段不是)', () => {
    const s = scene([unit('a', 0), unit('b', 0)])
    const after = applyEvents(s, resolve(s, { openAct0: MULTI_SELECT_DONE })).state
    expect(buffCount(after.objects['a' as never])).toBe(1)
    expect(buffCount(after.objects['b' as never])).toBe(1)
  })
})
