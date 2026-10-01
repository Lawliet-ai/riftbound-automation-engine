import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { activeTriggers, cardCost, cardKeywords, cardKind, cardPassives, isArmamentDef } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { resetTurnLedgers } from '../../src/scoring/score'
import { SAND_SOLDIER_TOKEN } from '../../data/cards/token-spells'
import { SFD_197_SPEC, SAND_SOLDIER_DEF_ID } from '../../data/cards/SFD-197'

                                                   
                       
                                                               
  
                 
                                                     
                                                                       
                                                                   
                                                                       
                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

setCardPassiveProvider(cardPassives)

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
const unit = (oid: string, defId: string, ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})
                   
const emperor = (oid = 'emp', ctrl = P1): GameObject => ({
  oid: asObjId(oid), defId: 'SFD-197', owner: ctrl, controller: ctrl, zone: asZoneId(`legend:${ctrl}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {}, status: {},
})

describe('★ 前提与接线', () => {
  test('★传奇:进 UNIT_COST 记 {mana:0},自己不印任何关键词(㊶⑪)', () => {
    expect(cardKind('SFD-197')).toBe('legend')
    expect(cardCost('SFD-197'), '传奇一律 0').toEqual({ mana: 0 })
    expect(cardKeywords('SFD-197'), '★[百炼]是给别人的,它自己不印').toEqual([])
  })

  test('★★★★★★「黄沙士兵」是【卡名/指示物】不是标签 —— 判据锚在 defId 上', () => {
                                              
    expect(SAND_SOLDIER_DEF_ID).toBe('token:黄沙士兵')
    expect(SAND_SOLDIER_TOKEN.baseMight, '★2[S],不是 MINION 的 1[S]').toBe(2)
  })
})

                                                            
describe('★★★★★ 句①:你的黄沙士兵获得 [百炼]', () => {
  const forgeOn = (s: GameState, oid: string): number => activeTriggers(s)
    .filter((t) => (t.id ?? '').includes('forge') && t.sourceOid === asObjId(oid)).length

  test('★★★★★命门:友方黄沙士兵真的发得出 forge 触发', () => {
    const s = scene([emperor(), unit('sand', SAND_SOLDIER_DEF_ID)])
    expect(forgeOn(s, 'sand'), '★被动给的[百炼]要走到触发工厂').toBeGreaterThan(0)
  })

  test('★★★★范围:非黄沙士兵不给、敌方的黄沙士兵也不给', () => {
    const s = scene([
      emperor(),
      unit('sand', SAND_SOLDIER_DEF_ID),
      unit('other', 'BLK-other'),                       // 友方但不是黄沙士兵
      unit('foeSand', SAND_SOLDIER_DEF_ID, P2),         // 敌方的黄沙士兵
    ])
    expect(forgeOn(s, 'sand'), '友方黄沙士兵').toBeGreaterThan(0)
    expect(forgeOn(s, 'other'), '★不是黄沙士兵 ⇒ 不给').toBe(0)
    expect(forgeOn(s, 'foeSand'), '★敌方 ⇒ 不给(§740.1.a 按控制者)').toBe(0)
  })

  test('★★★没有位置词 ⇒ 基地里的黄沙士兵也算', () => {
    const s = scene([emperor(), unit('home', SAND_SOLDIER_DEF_ID, P1, `base:${P1}`)])
    expect(forgeOn(s, 'home')).toBeGreaterThan(0)
  })

  test('★★★★★对照组:皇帝不在场,谁都没有 [百炼]', () => {
    const s = scene([unit('sand', SAND_SOLDIER_DEF_ID)])
    expect(forgeOn(s, 'sand')).toBe(0)
                                
    expect(recomputeContinuous(s).objects[asObjId('sand')]!.derived?.keywords ?? [])
      .not.toContain('百炼')
  })
})

                                                          
describe('★★★★★★ 第九本回合账 playedArmamentThisTurn', () => {
                                               
  function played(defId: string, player = P1, deps: Parameters<typeof applyEvents>[2] = {}): GameState {
    const s = scene([unit('card', defId, player)])
    const ev = { kind: 'playUnit', unit: asObjId('card'), player } as GameEvent
    return applyEvents(s, [ev], deps).state
  }
  const armamentDefId = (): string => {
                                        
    const id = ['UNL-096', 'SFD-022', 'UNL-158'].find((x) => isArmamentDef(x))
    expect(id, '㊳ 前提:至少有一张真武装').toBeDefined()
    return id!
  }

  test('★★★★★★写入:打出武装 ⇒ 置旗(键=玩家)', () => {
    const s = played(armamentDefId(), P1, { isArmament: isArmamentDef })
    expect(s.playedArmamentThisTurn?.[P1 as string]).toBe(true)
  })

  test('★★★★打出【非武装】不记', () => {
    const s = played('BLK-plain', P1, { isArmament: isArmamentDef })
    expect(s.playedArmamentThisTurn?.[P1 as string]).toBeUndefined()
  })

  test('★★★★★★㉓ 错位场景【写入侧】:对手打出的武装记在【对手】名下', () => {
                                                               
    const s = played(armamentDefId(), P2, { isArmament: isArmamentDef })
    expect(s.playedArmamentThisTurn?.[P2 as string], '★记在打出者名下').toBe(true)
    expect(s.playedArmamentThisTurn?.[P1 as string], '★不该记在回合玩家名下').toBeUndefined()
  })

  test('★★★★★★★deps 缺省不给 ⇒ 行为完全不变(一个都不记)', () => {
    const s = played(armamentDefId(), P1)                 
    expect(s.playedArmamentThisTurn?.[P1 as string], '★通道关闭').toBeUndefined()
  })

  test('★★★写=置旗,幂等:打出第二件还是 true,不会变计数', () => {
    let s = played(armamentDefId(), P1, { isArmament: isArmamentDef })
    const ev = { kind: 'playUnit', unit: asObjId('card'), player: P1 } as GameEvent
    s = applyEvents(s, [ev], { isArmament: isArmamentDef }).state
    expect(s.playedArmamentThisTurn?.[P1 as string]).toBe(true)
  })

  test('★★★★★清:回合末 `resetTurnLedgers` 清零', () => {
    const s = played(armamentDefId(), P1, { isArmament: isArmamentDef })
    expect(resetTurnLedgers(s).playedArmamentThisTurn?.[P1 as string], '★新回合清干净').toBeUndefined()
  })
})

                                                                 
describe('★★★★★★ 句②:付1+横置 ⇒ 在你的基地打出一名 2[S] 黄沙士兵', () => {
  const withLedger = (s: GameState, p = P1): GameState =>
    ({ ...s, playedArmamentThisTurn: { [p as string]: true } } as GameState)

  test('★前提:费用是【支付1 + 横置】,不选目标', () => {
    expect(SFD_197_SPEC.cost, '冒号前是 {1}').toEqual({ mana: 1 })
    expect(SFD_197_SPEC.tapSelf, '[横置]').toBe(true)
    expect(SFD_197_SPEC.target).toBe('none')
  })

  test('★★★★★★命门:本回合没打出过武装 ⇒ available 为 false(连列都不列)', () => {
    const s = scene([emperor()])
    expect(SFD_197_SPEC.available!(s, P1, 'emp'), '★没打过武装').toBe(false)
    expect(SFD_197_SPEC.available!(withLedger(s), P1, 'emp'), '★打过了就能用').toBe(true)
  })

  test('★★★★★★㉓ 错位场景【读取侧】:读的是【我的控制者】那本账,不是回合玩家', () => {
                                                  
    const s = withLedger(scene([emperor('emp', P2)]), P1)
    expect(SFD_197_SPEC.available!(s, P2, 'emp'), '★对手打过武装不算我的').toBe(false)
    expect(SFD_197_SPEC.available!(s, P1, 'emp'), '★账主自己能用').toBe(true)
  })

  test('★★★★★效果:发一条 spawnToken,规格是 2[S] 黄沙士兵、落点是【我的基地】', () => {
    const evs = SFD_197_SPEC.makeResolve({ selfOid: 'emp', controller: P1 })(scene([emperor()]))
    expect(evs).toHaveLength(1)
    const e = evs[0] as { kind: string; spec: unknown; zone: string; owner: string }
    expect(e.kind).toBe('spawnToken')
    expect(e.spec, '★复用 SAND_SOLDIER_TOKEN(2[S]),不是 MINION').toBe(SAND_SOLDIER_TOKEN)
    expect(e.zone, '★卡文明写「到你的基地」').toBe(`base:${P1}`)
    expect(e.owner).toBe(P1)
  })

  test('★★★★落点跟着【控制者】走:对手控制的皇帝打到对手基地', () => {
    const evs = SFD_197_SPEC.makeResolve({ selfOid: 'emp', controller: P2 })(scene([emperor('emp', P2)]))
    expect((evs[0] as { zone: string }).zone).toBe(`base:${P2}`)
  })
})
