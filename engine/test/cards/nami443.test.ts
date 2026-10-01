import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKind, playBonusFor } from '../../data/registry'
import {
  UNL_052, UNL_052_CARD_EFFECT, UNL_052_EXTRA_COST, makeNamiPlayTrigger, makeNamiHoldTrigger,
} from '../../data/cards/play-extra-cost'

                                    
                                                 
                                                              
                                                                            
                                                            
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('nami')

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, opts: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    ...opts,
  } as GameObject
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
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const run = (s: GameState, evs: readonly GameEvent[]): GameState => applyEvents(s, evs, {}).state

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('3费0pip 绿 3S;额外费表行 = 一枚绿 pip、无 required 无 events(收益走触发 ㉙)', () => {
    expect(CARD_COSTS['UNL-052']).toEqual({ mana: 3, pips: 0, colors: ['green'] })
    expect(cardKind('UNL-052')).toBe('unit')
    expect(UNL_052.power, '上游实测 3S').toBe(3)
    expect(playBonusFor('UNL-052'), 'registry 汇总口拿得到').toBe(UNL_052_EXTRA_COST)
    expect(UNL_052_EXTRA_COST.required, '「你可以选择」= 可选').toBeUndefined()
    expect(UNL_052_EXTRA_COST.cost).toEqual({ mana: 0, pips: [['green']] })
    expect(UNL_052_EXTRA_COST.events, '收益不占 events').toBeUndefined()
    expect(UNL_052_CARD_EFFECT).toContain('眩晕')
  })
})

describe('🔴★★★★句②:付了额外费 ⇒ 眩晕一名敌方单位', () => {
  const trig = makeNamiPlayTrigger(SELF, P1)
  const board = (): GameState => scene([
    obj('nami', 'UNL-052', P1, BF0),
    obj('foe', 'BLK', P2, BF0),
    obj('mate', 'BLK', P1, BF0),
  ])
  const played = (bonus: boolean | undefined): GameEvent =>
    ({ kind: 'playUnit', unit: SELF, player: P1, ...(bonus !== undefined ? { bonus } : {}) } as GameEvent)

  test('🔴★★★判据:ev.bonus===true 才响(没付不响)', () => {
    expect(trig.filter!(played(true), board())).toBe(true)
    expect(trig.filter!(played(undefined), board()), '没付额外费不响').toBe(false)
  })

  test('🔴★★★候选只有敌方;effect = stun', () => {
    const req = trig.nextChoice!(board(), played(true), {})
    expect(req!.candidates.map((c) => c.id), '友方/自己不进候选').toEqual(['foe'])
    expect(trig.effect!(board(), played(true), { foe: 'foe' })).toEqual([{ kind: 'stun', target: 'foe' }])
  })
})

describe('🔴★★★★句③+第二十本账:据守授予 →「下一次打出单位」ready+buff', () => {
  test('🔴★★据守触发发 grantNextUnitReadyBuff;reducer 写账累加', () => {
    const trig = makeNamiHoldTrigger(SELF, P1)
    const s = scene([obj('nami', 'UNL-052', P1, BF0)])
    const hold = { kind: 'hold', player: P1, battlefield: BF0 } as GameEvent
    expect(trig.filter!(hold, s), '我据守的那处才响').toBe(true)
    const evs = trig.effect!(s, hold, {})
    expect(evs).toEqual([{ kind: 'grantNextUnitReadyBuff', player: P1 }])
    const s2 = run(run(s, evs), evs)
    expect(s2.nextUnitReadyBuffThisTurn?.[P1], '两次授予累加').toBe(2)
  })

  test('🔴★★★消费:有额度时打出单位 ⇒ dormant 清 + buff+1 + 额度全清', () => {
    let s = scene([obj('u', 'BLK', P1, BF0, { status: { dormant: true } })])
    s = { ...s, nextUnitReadyBuffThisTurn: { [P1]: 2 } } as GameState
    const s2 = run(s, [{ kind: 'playUnit', unit: asObjId('u'), player: P1 } as GameEvent])
    const u = s2.objects['u']!
    expect(u.status.dormant, '变为活跃').not.toBe(true)
    expect(u.counters['buff'], '给予增益(幂等 ⇒ 只 +1)').toBe(1)
    expect(s2.nextUnitReadyBuffThisTurn?.[P1], '额度全部用掉').toBe(0)
  })

  test('🔴★★装备打出不吃授予(「一名单位」);别的玩家打出也不吃', () => {
    let s = scene([
      obj('g', 'SFD-150', P1, BF0, { baseTypes: ['equipment'], status: { dormant: true } }),
      obj('fu', 'BLK', P2, BF0, { status: { dormant: true } }),
    ])
    s = { ...s, nextUnitReadyBuffThisTurn: { [P1]: 1 } } as GameState
    const afterGear = run(s, [{ kind: 'playUnit', unit: asObjId('g'), player: P1 } as GameEvent])
    expect(afterGear.nextUnitReadyBuffThisTurn?.[P1], '装备不吃,额度还在').toBe(1)
    expect(afterGear.objects['g']!.counters['buff']).toBeUndefined()
    const afterFoe = run(s, [{ kind: 'playUnit', unit: asObjId('fu'), player: P2 } as GameEvent])
    expect(afterFoe.nextUnitReadyBuffThisTurn?.[P1], 'P2 打出不吃 P1 的授予').toBe(1)
    expect(afterFoe.objects['fu']!.status.dormant, 'P2 的单位不被弄活跃').toBe(true)
  })

  test('★无额度时打出单位一切照旧(账本不背新 bug)', () => {
    const s = scene([obj('u', 'BLK', P1, BF0, { status: { dormant: true } })])
    const s2 = run(s, [{ kind: 'playUnit', unit: asObjId('u'), player: P1 } as GameEvent])
    expect(s2.objects['u']!.status.dormant).toBe(true)
    expect(s2.objects['u']!.counters['buff']).toBeUndefined()
  })
})

describe('★★★★★★★ 口径改判(★461 立 → ★1156【缺陷 121】翻面):指示物单位**也**吃「下一次打出」账', () => {
  test('🔴🔴🔴★★★★★账挂着时 spawnToken 出的**单位**被点活跃、额度被清(§185.2.d 指示物单位属于单位)', () => {
                                                 
                                                                        
                                               
                                                             
                                                      
                                                  
                                             
                                                                              
                                                                 
    let s = scene([])
    s = { ...s, nextUnitReadyBuffThisTurn: { [P1]: 1 } } as GameState
    const after = applyEvents(s, [{ kind: 'spawnToken',
      spec: { defId: 'token:精灵', baseMight: 3, baseTypes: ['unit'], baseKeywords: [] },
      zone: asZoneId(`base:${P1}`), owner: P1 } as GameEvent], {}).state
    const tok = Object.values(after.objects).find((o) => o.defId === 'token:精灵')
    expect(tok, '指示物出来了').toBeTruthy()
    expect(tok!.status.dormant, '★吃到授予 ⇒ 「变为活跃」压过 §359.2.c 的默认休眠').toBeUndefined()
    expect(tok!.counters['buff'], '★授予还带一个增益').toBe(1)
    expect(after.nextUnitReadyBuffThisTurn?.[P1], '★额度用掉').toBe(0)
  })
})
