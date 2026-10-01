import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { banishInState, banishedBy } from '../../src/actions/banish'
import { applyEvents } from '../../src/loop/reduce'

                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(zone),
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
  return { ...base, activePlayer: P1, objects, zones }
}
const exileOf = (s: GameState, p = P1): readonly string[] => s.zones[`exile:${p}`]!.contents

describe('§427.1/§427.2 放逐 = 从任意区域直接搬进放逐区', () => {
  test('从战场放逐 → 人进放逐区,原区不再有它', () => {
    const s = banishInState(scene(obj('u', BF0)), asObjId('u'))
    expect(exileOf(s)).toHaveLength(1)
    expect(s.zones[BF0]!.contents).toHaveLength(0)
  })

  test('§427.1「任意其他区域」:从废牌堆也能放逐(绝念"放逐我"正是这条路)', () => {
    const s = banishInState(scene(obj('u', `discard:${P1}`)), asObjId('u'))
    expect(exileOf(s)).toHaveLength(1)
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(0)
  })

  test('§108.6.a 进的是【拥有者】的放逐区,不是放逐者的', () => {
    const theirs = obj('u', BF0, { owner: P2, controller: P1 })           
    const s = banishInState(scene(theirs), asObjId('u'))
    expect(exileOf(s, P2)).toHaveLength(1)
    expect(exileOf(s, P1)).toHaveLength(0)
  })

  test('§124 跨界换新 oid:放逐区里的不是原来那个 oid', () => {
    const s = banishInState(scene(obj('u', BF0)), asObjId('u'))
    expect(exileOf(s)).not.toContain('u')
    expect(s.objects['u' as never]).toBeUndefined()
  })

  test('物件已不在 → 无操作,不抛错', () => {
    const s0 = scene()
    expect(banishInState(s0, asObjId('nope'))).toBe(s0)
  })
})

describe('★§427.2.a/b 放逐不是摧毁、也不是弃置', () => {
  test('放逐带绝念的单位 → 绝念【不】触发(它没被摧毁)', () => {
    const s0 = scene(obj('u', BF0, { baseKeywords: ['绝念'] }))
    const s = applyEvents(s0, [{ kind: 'banish', target: asObjId('u') }], {
      lastRitesEffect: () => [{ kind: 'draw', player: P1, count: 1 }],
    }).state
    expect(exileOf(s)).toHaveLength(1)         
    expect(s.chain).toHaveLength(0)          
  })

  test('放逐【不】经废牌堆中转(§427.2「直接从原位置放置到放逐区域」)', () => {
    const s = applyEvents(scene(obj('u', BF0)), [{ kind: 'banish', target: asObjId('u') }]).state
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(0)
  })
})

describe('§427.3 账本按【放逐者实例】记', () => {
  test('给了放逐者 → 记账,查得回来', () => {
    const s = banishInState(scene(obj('u', BF0), obj('src', BF0)), asObjId('u'), asObjId('src'))
    expect(banishedBy(s, asObjId('src'))).toHaveLength(1)
    expect(banishedBy(s, asObjId('src'))[0]).toBe(exileOf(s)[0])                  
  })

  test('不给放逐者 → 只搬不记(账本保持空)', () => {
    const s = banishInState(scene(obj('u', BF0)), asObjId('u'))
    expect(s.banishLedger).toEqual({})
  })

  test('同一个放逐者放逐多张 → 累加进同一本账', () => {
    let s = scene(obj('a', BF0), obj('b', BF0), obj('src', BF0))
    s = banishInState(s, asObjId('a'), asObjId('src'))
    s = banishInState(s, asObjId('b'), asObjId('src'))
    expect(banishedBy(s, asObjId('src'))).toHaveLength(2)
  })

  test('★§427.3.a 两张【同名】卡各记各的账,互相引用不到', () => {
                                
    const z1 = obj('z1', BF0, { defId: 'SFD-090' })
    const z2 = obj('z2', BF0, { defId: 'SFD-090' })
    let s = scene(obj('a', BF0), obj('b', BF0), z1, z2)
    s = banishInState(s, asObjId('a'), asObjId('z1'))
    s = banishInState(s, asObjId('b'), asObjId('z2'))
    expect(banishedBy(s, asObjId('z1'))).toHaveLength(1)
    expect(banishedBy(s, asObjId('z2'))).toHaveLength(1)
    expect(banishedBy(s, asObjId('z1'))).not.toEqual(banishedBy(s, asObjId('z2')))
  })

  test('没放逐过任何东西的物件:查出来是空,不是 undefined', () => {
    expect(banishedBy(scene(), asObjId('src'))).toEqual([])
  })
})

describe('banishedBy 读时校验:离开放逐区就不再算数', () => {
  test('被放逐的牌又被打出(离开放逐区)→ 不再列入', () => {
    let s = banishInState(scene(obj('u', BF0), obj('src', BF0)), asObjId('u'), asObjId('src'))
    const landed = exileOf(s)[0]!
    expect(banishedBy(s, asObjId('src'))).toHaveLength(1)
                   
    s = applyEvents(s, [{ kind: 'zoneChange', obj: landed as never, to: asZoneId(BF0) }]).state
    expect(banishedBy(s, asObjId('src'))).toEqual([])
  })
})

describe('banish 事件走 applyEvents 全通道', () => {
  test('事件带 by → 同样记账', () => {
    const s = applyEvents(scene(obj('u', BF0), obj('src', BF0)), [
      { kind: 'banish', target: asObjId('u'), by: asObjId('src') },
    ]).state
    expect(banishedBy(s, asObjId('src'))).toHaveLength(1)
  })
})
