import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { canPayFromState } from '../../src/game/economy'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import { activeTriggers } from '../../data/registry'
import { cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { POWERFUL_MIN_MIGHT } from '../../data/cards/conditional-self-passives'
import { SFD_180, SFD_180_COST, makeFioraDuelTrigger } from '../../data/cards/SFD-180'

                                                         
                                                   
                                                         
  
           
                                                         
                                                               
                                                            
                                                                        
                                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('fio')

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
                                                             
const yellowRune = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, who, `base:${who}`, { baseTypes: ['rune'] } as Partial<GameObject>), defId: 'rune:yellow' } as GameObject)

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

const trig = makeFioraDuelTrigger(SELF, P1)
const mc = (unit: string, from: number, to: number, controller: PlayerId = P1): GameEvent =>
  ({ kind: 'mightCrossed', unit: asObjId(unit), controller, from, to } as unknown as GameEvent)
const fio = (): GameObject => obj('fio', P1, BF0, { defId: 'SFD-180' } as Partial<GameObject>)

describe('★★★★★★★ ①触发条件(㊼ SFD-205 姿势)', () => {
                                                    
                                                                 
                                                              
                                              
  test('★★★★★★我方 4→5 响;敌方 4→5 不响;5→6 不响(§709);4→9 响;缺字段不响', () => {
    const s = scene([fio(), yellowRune('r0', P1)])
    expect(checkTrigger(trig, mc('u', 4, 5), s, P1)).toBe(true)
    expect(checkTrigger(trig, mc('e', 4, 5, P2), s, P2), '★「你控制的」⇒ 敌方不响').toBe(false)
    expect(checkTrigger(trig, mc('u', 5, 6), s, P1), '★已是强力 ⇒ 没有「变为」').toBe(false)
    expect(checkTrigger(trig, mc('u', 4, 9), s, P1)).toBe(true)
    expect(POWERFUL_MIN_MIGHT, '★阈值钉字面量').toBe(5)
    expect(SFD_180_COST, '★{{黄色}}=一枚黄色单色符能,无法力').toEqual({ mana: 0, pips: [['yellow']] })
  })
})

describe('★★★★★★★ ②③付费可选+让其活跃', () => {
                                        
                                                          
                                                                 
                                                                       
                                                          
                                                      
                                             
  test('★★★★★★可选走确认阶段;费用先付=basePerform 在确认阶段就扣走了{黄色};effect 只剩让其活跃', () => {
    const s = scene([fio(), obj('u', P1, BF0, { status: { dormant: true } } as Partial<GameObject>), yellowRune('r1', P1)])
    expect(trig.mayChoose, '★★§383.3.a「你可以选择」在效果开头 ⇒ 确认阶段问').toBe(true)
    expect(trig.nextChoice, '★★旧的结算期二选已经不在了').toBeUndefined()
    const paid = trig.basePerform!(s, mc('u', 4, 5), {})
    expect(paid, '★★付得起 ⇒ 返回付完的 state').not.toBeNull()
    expect(canPayFromState(paid!, P1, SFD_180_COST), '★★★费用先付:确认阶段那一枚黄符能已经被扣走了').toBe(false)
    const evs = trig.effect(paid!, mc('u', 4, 5), {}) as unknown as readonly { kind: string, target?: string, key?: string, value?: boolean }[]
    expect(evs.map((e) => e.kind), '★effect 只剩收益那一半').toEqual(['statusChange'])
    expect(evs[0], '★「让**其**」=事件那名单位变活跃').toMatchObject({ kind: 'statusChange', target: 'u', key: 'dormant', value: false })
  })

                                                                 
                                                                  
  test('★★★★★★防御:付不起(无符文)⇒ 连触发都不入链、basePerform 也返 null;「其」已离场 ⇒ 不发 statusChange', () => {
    const poor = scene([fio(), obj('u', P1, BF0)])
    expect(checkTrigger(trig, mc('u', 4, 5), poor, P1), '★付不起 ⇒ 触发根本不入链(§383.3.b.1 视为未触发)').toBe(false)
    expect(trig.basePerform!(poor, mc('u', 4, 5), {}), '★★就算硬闯到确认阶段,费用也付不出 ⇒ null').toBeNull()
    const gone = scene([fio(), yellowRune('r1', P1)])
    const evs = trig.effect(gone, mc('u', 4, 5), {}) as unknown as readonly { kind: string }[]
    expect(evs.filter((e) => e.kind === 'statusChange'), '★「其」结算时已离场 ⇒ 没得让').toEqual([])
  })
})

                                                
                                                                       
                                                                         
                                                           
describe('★★★★★★★ ★1446 缺陷 194:那一问真的挪到确认阶段了', () => {
  test('★★★advanceFepr 停下来问,而且问的时候项目还是 pending', () => {
    const s = scene([fio(), obj('u', P1, BF0, { status: { dormant: true } } as Partial<GameObject>), yellowRune('r1', P1)])
    const fired = landAndEnqueueTriggers(s, [mc('u', 4, 5)], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind, '★★★确认阶段就问了,不是先进 FEPR 优先权轮').toBe('choice')
    expect(step.state.chain.some((i) => i.status === 'pending'), '★★★问的时候项目还没确认').toBe(true)
  })
})

describe('★ 前提:登记(正典折叠+单位三件套)', () => {
  test('★★★★★3费黄 3[S]、unit、双号一组、keywords 双号空、Card 进 CARDS(specLookup 有肉)', () => {
    expect(CARD_COSTS['SFD-180']).toEqual({ mana: 3, pips: 0, colors: ['yellow'] })
    expect(cardKind('SFD-180')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-180']).toEqual(['SFD-180', 'SFD-180a'])
    for (const no of ['SFD-180', 'SFD-180a']) expect(cardKeywords(no), no).toEqual([])
    expect(SFD_180.power, '★印刷 3[S](上游实测)').toBe(3)
  })
})
