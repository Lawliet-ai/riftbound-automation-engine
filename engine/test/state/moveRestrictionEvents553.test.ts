import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { restrictedMoveEvent } from '../../src/state/moveRestriction'

                                      
  
                                                                 
                                                              
                                                    
                                                                              
                                                       
                                                       
  
                         
                                                              
                                                      
                         
                                             
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'OGN-012', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    ...extra,
  } as unknown as GameObject
}

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

                                                
const withLimit = (s: GameState, oid: string, ...limits: string[]): GameState => {
  const o = s.objects[asObjId(oid)]!
  return {
    ...s,
    objects: { ...s.objects, [oid]: { ...o, derived: { ...o.derived, restrictions: limits } } },
  } as GameState
}

                                                                
const movePair = (oid: string, from: string, to: string): GameEvent[] => [
  { kind: 'zoneChange', obj: asObjId(oid), to: asZoneId(to) } as GameEvent,
  { kind: 'unitMoved', unit: asObjId(oid), player: P1, from: asZoneId(from), to: asZoneId(to) } as GameEvent,
]
const zoneOf = (s: GameState, oid: string): string | undefined =>
  s.objects[asObjId(oid)]?.zone as string | undefined

describe('🔴🔴🔴★★★★★★553【B2b】独立发事件点也吃移动限制了', () => {
  test('🔴🔴🔴★★★★★★【承重】直发 zoneChange+unitMoved 回基地 ⇒ 被挡,单位一步没动', () => {
    const s = withLimit(scene([obj('u')]), 'u', 'moveToBase')
    const after = applyEvents(s, movePair('u', BF0, `base:${P1}`), {}).state
    expect(zoneOf(after, 'u'), '★★★还在原来那处战场(改之前这里会变成基地)').toBe(BF0)
  })

  test('🔴🔴🔴★★★★★★【承重·刀2 专盯】unitMoved【信号】也必须挡掉,不能只挡 zoneChange', () => {
                                                            
                                                        
                                           
                            
    const s = withLimit(scene([obj('u')]), 'u', 'moveToBase')
    const res = applyEvents(s, movePair('u', BF0, `base:${P1}`), {})
    expect(res.events.map((e) => e.kind), '★★★两条都不该落地').not.toContain('unitMoved')
    expect(res.events.map((e) => e.kind)).not.toContain('zoneChange')
                     
    const free = applyEvents(scene([obj('u')]), movePair('u', BF0, `base:${P1}`), {})
    expect(free.events.map((e) => e.kind), '★对照:正常移动两条都落地').toEqual(
      expect.arrayContaining(['zoneChange', 'unitMoved']))
  })

  test('🔴★★★★★★对照组:没有限制时同一对事件照常把它挪走', () => {
    const s = scene([obj('u')])
    const after = applyEvents(s, movePair('u', BF0, `base:${P1}`), {}).state
    expect(zoneOf(after, 'u'), '★没限制就该动').toBe(`base:${P1}`)
  })

  test("🔴★★★★★'move' 全禁 ⇒ 连战场→战场也挡", () => {
    const s = withLimit(scene([obj('u')]), 'u', 'move')
    expect(zoneOf(applyEvents(s, movePair('u', BF0, BF1), {}).state, 'u')).toBe(BF0)
                                          
    const half = withLimit(scene([obj('u')]), 'u', 'moveToBase')
    expect(zoneOf(applyEvents(half, movePair('u', BF0, BF1), {}).state, 'u'), '⚠️ 别锁多').toBe(BF1)
  })

  test('🔴🔴🔴★★★★★★【§446.2 边界】进废牌堆**不是移动** ⇒ 哪怕全禁移动也照进', () => {
                                     
                                        
                                          
    const s = withLimit(scene([obj('u')]), 'u', 'move')
    const after = applyEvents(s, [
      { kind: 'zoneChange', obj: asObjId('u'), to: asZoneId(`discard:${P1}`) } as GameEvent,
    ], {}).state
    expect(zoneOf(after, 'u'), '★★★§124 跨界换 oid ⇒ 旧 oid 查不到了,正说明它真的走了').toBeUndefined()
    expect((after.zones[asZoneId(`discard:${P1}`)]?.contents ?? []).length, '★★★躺进了废牌堆').toBe(1)
  })

  test('🔴🔴★★★★★★【§446.2 边界】打出落地(手牌→战场)**不是移动** ⇒ 不挡', () => {
    const inHand = obj('u', { zone: asZoneId(`hand:${P1}`) })
    const s = withLimit(scene([inHand]), 'u', 'move')
    const after = applyEvents(s, [
      { kind: 'zoneChange', obj: asObjId('u'), to: asZoneId(BF0) } as GameEvent,
    ], {}).state
    expect((after.zones[asZoneId(BF0)]?.contents ?? []).length, '★★★照样落得了地').toBe(1)
  })

  test('🔴🔴★★★★★★【门① 边界】限制挂在【装备】上时不挡 —— 三张限制卡说的都是「单位」', () => {
    const gear = obj('g', { baseTypes: ['equipment'] as never, baseMight: 0 })
    const s = withLimit(scene([gear]), 'g', 'move')
    const after = applyEvents(s, movePair('g', BF0, BF1), {}).state
    expect(zoneOf(after, 'g'), '★装备的场上→场上(贴附随动那类)不该被这道闸误伤').toBe(BF1)
  })

  test('🔴🔴🔴★★★★★★挡下移动【不短路整批】—— 同批后面的事件照常落地(被撤销 ≠ 被无视)', () => {
    const s = withLimit(scene([obj('u', { status: { dormant: true } as never })]), 'u', 'move')
    const after = applyEvents(s, [
      ...movePair('u', BF0, BF1),
      { kind: 'statusChange', target: asObjId('u'), key: 'dormant', value: false } as GameEvent,
    ], {}).state
    expect(zoneOf(after, 'u'), '移动那半被挡').toBe(BF0)
    expect(after.objects[asObjId('u')]!.status['dormant'], '★★★后半句「变为活跃」照发').toBe(false)
  })

  test('🔴★★★★★判据本身:三道门逐条(单位 / 两端都是位置 / restrictions)', () => {
    const s = withLimit(scene([obj('u')]), 'u', 'moveToBase')
    expect(restrictedMoveEvent(s, asObjId('u'), `base:${P1}`), '三道门都过 ⇒ 挡').toBe(true)
    expect(restrictedMoveEvent(s, asObjId('u'), BF1), '门③ 不成立(只锁基地)').toBe(false)
    expect(restrictedMoveEvent(s, asObjId('u'), `discard:${P1}`), '门② 不成立(终点不是位置)').toBe(false)
    expect(restrictedMoveEvent(s, undefined, `base:${P1}`), '没给 oid').toBe(false)
    expect(restrictedMoveEvent(s, asObjId('u'), undefined), '没给终点').toBe(false)
  })
})
