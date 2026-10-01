import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { applyEvents } from '../../src/loop/reduce'
import {
  ephemeralDestroyEvents, runEphemeralStep, isEphemeralImmune, EPHEMERAL_IMMUNE, hasEphemeral,
} from '../../src/keywords/ephemeral'
import {
  UNL_090, UNL_090A, UNL_090_KEYWORDS, GROUP_PASSIVE_DEFIDS, GROUP_PASSIVE_BATCH_DEFIDS,
} from '../../data/cards/group-passives'

                                                                
                                                                  
  
                                                          
                                                  
  
                                                     
                                                                               
const P1 = asPlayerId('P1')           
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

                                              
const eph = (oid: string, who: PlayerId, zone: string, kws: readonly string[] = ['瞬息']): GameObject => ({
  oid: asObjId(oid), defId: `D-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: kws, baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                       
const leb = (oid: string, who: PlayerId, zone: string, defId = 'UNL-090'): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [...UNL_090_KEYWORDS], baseTypes: ['unit'],
  damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'start', objects, zones } as unknown as GameState
}

                                            
function live(objs: readonly GameObject[]): GameState {
  setCardPassiveProvider(cardPassives)
  return recomputeContinuous(scene(objs))
}
                       
const doomed = (s: GameState, active: PlayerId = P1) =>
  ephemeralDestroyEvents(s, active).map((e) => (e as unknown as { target: string }).target).sort()

describe('★ 前提:卡面与接线', () => {
  test('★4费 0pip 蓝、4 战力,印 [后排];异画同规格', () => {
    expect(CARD_COSTS['UNL-090']).toEqual({ mana: 4, pips: 0, colors: ['blue'] })
    expect([UNL_090.power, UNL_090.energy]).toEqual([4, 4])
    expect(cardKind('UNL-090')).toBe('unit')
    expect(cardKeywords('UNL-090'), '★② 印刷关键词三处同源').toEqual(['后排'])
    expect(UNL_090_KEYWORDS).toEqual(['后排'])
    expect(specLookup('UNL-090').baseKeywords).toEqual(['后排'])
    expect(cardKeywords('UNL-090a'), '★② 异画那份别漏').toEqual(['后排'])
    expect(UNL_090A.cardNo, '★527 异画卡号照上游原样抄').toBe('UNL-090a/219')
  })

  test('★★★异画【必须单独登一行】—— 族表是按 defId 直查、不折叠别名', () => {
                                                                                
    expect(specLookup('UNL-090a').defId).toBe('UNL-090a')
    expect(GROUP_PASSIVE_DEFIDS).toContain('UNL-090')
    expect(GROUP_PASSIVE_DEFIDS, '★异画那行').toContain('UNL-090a')
    expect(GROUP_PASSIVE_BATCH_DEFIDS).toEqual(expect.arrayContaining(['UNL-090', 'UNL-090a']))
  })
})

describe('🔴🔴🔴★★★★★★豁免生效:她那一格的瞬息牌留得住', () => {
  test('🔴★★★★★★有她在 ⇒ 同格我方瞬息牌【不】进瞬息步', () => {
    const s = live([leb('leb', P1, BF0), eph('token', P1, BF0)])
    expect(isEphemeralImmune(s.objects[asObjId('token')]!), '★标记打上了').toBe(true)
    expect(doomed(s), '★★★一个都不清').toEqual([])
  })

  test('🔴★★★★★★对照:【没有她】的同一张牌照样被清(⑩① 会换答案的反例)', () => {
    const s = live([eph('token', P1, BF0)])
    expect(doomed(s)).toEqual(['token'])
  })

  test('🔴★★★★★走完整瞬息步:她罩着的牌【还在场上】', () => {
    const s = runEphemeralStep(live([leb('leb', P1, BF0), eph('token', P1, BF0)]), P1)
    expect(s.objects[asObjId('token')], '★★★没被摧毁').toBeDefined()
  })

  test('🔴★★★★★她自己也在罩子里(卡文【没写「其他」】⇒ 含我自己)', () => {
                                                  
    const withEph = { ...leb('leb', P1, BF0), baseKeywords: ['后排', '瞬息'] } as unknown as GameObject
    const s = live([withEph])
    expect(hasEphemeral(s.objects[asObjId('leb')]!), '★前提:她此刻确实带着[瞬息]').toBe(true)
    expect(doomed(s), '★★★没写「其他」⇒ 自己也豁免').toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★门一:「【你的】」—— 只罩她控制者的牌', () => {
  test('🔴★★★★★★对手的瞬息牌在【同一格】,轮到对手的开始阶段 ⇒ 照清不误', () => {
                                             
    const s = live([leb('leb', P1, BF0), eph('foeToken', P2, BF0)])
    expect(isEphemeralImmune(s.objects[asObjId('foeToken')]!), '★对手那张没被罩上').toBe(false)
    expect(doomed(s, P2), '★★★轮到 P2 时它照样进瞬息步').toEqual(['foeToken'])
  })

  test('🔴★★★★★★判据认【控制者】不认拥有者 —— 夺控来的牌照样罩得住', () => {
                                                              
                                                                       
    const seized = { ...eph('seized', P1, BF0), owner: P2 } as unknown as GameObject
    const s = live([leb('leb', P1, BF0), seized])
    expect([s.objects[asObjId('seized')]!.owner, s.objects[asObjId('seized')]!.controller],
      '★前提:这张确实是 P2 的牌、由 P1 控制').toEqual([P2, P1])
    expect(isEphemeralImmune(s.objects[asObjId('seized')]!), '★★★按控制者算 ⇒ 罩得住').toBe(true)
    expect(doomed(s)).toEqual([])
  })

  test('🔴★★★★★★反过来:她自己是被夺控的 ⇒ 罩的是【新控制者】的牌', () => {
                                          
    const stolenLeb = { ...leb('leb', P2, BF0), owner: P1 } as unknown as GameObject
    const s = live([stolenLeb, eph('p1Token', P1, BF0), eph('p2Token', P2, BF0)])
    expect([
      isEphemeralImmune(s.objects[asObjId('p1Token')]!),
      isEphemeralImmune(s.objects[asObjId('p2Token')]!),
    ], '★★★跟着新控制者走,不跟拥有者').toEqual([false, true])
  })

  test('🔴★★★★★同一格两张牌、只有我那张被罩(同盘面直接对照)', () => {
    const s = live([leb('leb', P1, BF0), eph('mine', P1, BF0), eph('foeToken', P2, BF0)])
    expect([
      isEphemeralImmune(s.objects[asObjId('mine')]!),
      isEphemeralImmune(s.objects[asObjId('foeToken')]!),
    ]).toEqual([true, false])
  })
})

describe('🔴🔴🔴★★★★★★门二:「【我所处战场】」—— 位置限定', () => {
  test('🔴★★★★★★瞬息牌在【别的战场】⇒ 不受罩,照样被清', () => {
    const s = live([leb('leb', P1, BF0), eph('faraway', P1, BF1)])
    expect(doomed(s)).toEqual(['faraway'])
  })

  test('🔴★★★★★★她在【基地】⇒ 这条整个不生效(「战场」二字;⑳ 基地不算)', () => {
                                   
    const onBf = live([leb('leb', P1, BF0), eph('token', P1, BF0)])
    const atBase = live([leb('leb', P1, `base:${P1}`), eph('token', P1, `base:${P1}`)])
    expect([doomed(onBf), doomed(atBase)]).toEqual([[], ['token']])
  })
})

describe('🔴🔴🔴★★★★★★它挡的只是【瞬息那条触发】,不是"这张牌不会死"', () => {
  test('🔴★★★★★★被罩着的牌照样能被【摧毁事件】干掉(相邻概念防混)', () => {
                                                  
    const s = live([leb('leb', P1, BF0), eph('token', P1, BF0)])
    expect(doomed(s), '★前提:§816 那条确实被挡住了').toEqual([])
    const after = applyEvents(s, [{ kind: 'destroy', target: asObjId('token') }], {}).state
    expect(after.objects[asObjId('token')], '★★★别的死法照旧').toBeUndefined()
  })
})

describe('🔴🔴★★★★★异画走的是【同一条 spec】', () => {
  test('🔴★★★★★★UNL-090a 在场时罩子一样成立', () => {
    const s = live([leb('lebA', P1, BF0, 'UNL-090a'), eph('token', P1, BF0)])
    expect(doomed(s)).toEqual([])
  })

  test('🔴★★★★★★两个卡号答案全等(共用判据的证据,不是抄了第二份)', () => {
    const byCanon = live([leb('x', P1, BF0), eph('t', P1, BF1)])
    const byVariant = live([leb('x', P1, BF0, 'UNL-090a'), eph('t', P1, BF1)])
    expect(doomed(byCanon), '★两张都是"别的战场不罩"').toEqual(doomed(byVariant))
    expect(doomed(byCanon)).toEqual(['t'])
  })
})

describe('🔴🔴★★★★★共用件:限制字面量走的是既有那条 addRestriction', () => {
  test('🔴★★★★★★判据口只认 derived.restrictions(与 [无法造成战斗伤害] 同一条路)', () => {
    const s = live([leb('leb', P1, BF0), eph('token', P1, BF0)])
    expect(s.objects[asObjId('token')]!.derived?.restrictions).toContain(EPHEMERAL_IMMUNE)
                                             
    expect(isEphemeralImmune(eph('bare', P1, BF0))).toBe(false)
  })
})
