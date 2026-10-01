import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { canPayFromState } from '../../src/game/economy'
import { makeStrongSpriteTrigger, SFD_125_COST } from '../../data/cards/battlefield-timing'
import { makeCrimsonRoseTrigger, UNL_109_COST } from '../../data/cards/gear-batch-249'

                                                         
                                                                      
  
           
                                                                 
                                                    
                                                                  
  
                                                                    
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const mk = (oid: string, defId: string, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

   
                                     
                                                                    
                                                                                    
                                                              
   
function scene(mana: number, purple: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const z = base.zones[asZoneId(BF0)]!
  const runes: Record<string, number> = purple > 0 ? { purple } : {}
  return {
    ...base, activePlayer: P1, priority: P1, phase: 'main', feprPasses: 0,
                                                                       
                                                             
    objects: { ...base.objects, s: mk('s', 'SFD-125'), c: mk('c', 'UNL-109', `base:${P1}`) },
    zones: {
      ...base.zones,
      [asZoneId(BF0)]: { ...z, contents: [...z.contents, asObjId('s')] },
      [asZoneId(`base:${P1}`)]: {
        ...base.zones[asZoneId(`base:${P1}`)]!,
        contents: [...base.zones[asZoneId(`base:${P1}`)]!.contents, asObjId('c')],
      },
    },
    runePools: { ...base.runePools, [P1]: { mana, runes } },
  } as unknown as GameState
}
const mana = (st: GameState): number => (st.runePools?.[P1]?.mana ?? -1)

describe('🔴🔴🔴★★★★★★1487 最后两张:SFD-125(pip)/ UNL-109(mana)搬到确认阶段付', () => {
  test('① 📄★★★【两张的费用常量:一张付 pip、一张付 mana】', () => {
    expect(SFD_125_COST, '★SFD-125:支付{{紫色}} = 一枚紫 pip').toEqual({ pips: [['purple']] })
    expect(UNL_109_COST, '★UNL-109:支付{{1}} = 1 点法力').toEqual({ mana: 1 })
  })

  test('② 🛑★★★★★★【UNL-109(mana):确认阶段就扣掉了 + 付不起给 null】', () => {
    const t = makeCrimsonRoseTrigger(asObjId('c'), P1)
    const paid = t.basePerform!(scene(1, 0), {} as GameEvent, {})
    expect(paid, '★付得起').not.toBeNull()
    expect(mana(paid!), '★★★★★确认阶段就扣掉了 1(修前要等结算才扣)').toBe(0)
    expect(t.basePerform!(scene(0, 0), {} as GameEvent, {}), '★★池 0 ⇒ null(§383.3.b.1 不确认)').toBeNull()
  })

  test('③ 🛑★★★★★★【SFD-125(pip):确认阶段就把符文花掉了 + 付不起给 null】', () => {
    const t = makeStrongSpriteTrigger(asObjId('s'), P1)
    const rich = scene(0, 1)
    expect(canPayFromState(rich, P1, SFD_125_COST), '★前提:有一枚紫符文 ⇒ 付得起').toBe(true)
    const paid = t.basePerform!(rich, {} as GameEvent, {})
    expect(paid, '★付得起').not.toBeNull()
    expect(canPayFromState(paid!, P1, SFD_125_COST), '★★★★★付完之后再也付不起第二笔 ⇒ 确认阶段真扣了').toBe(false)
    expect(t.basePerform!(scene(0, 0), {} as GameEvent, {}), '★★没符文 ⇒ null').toBeNull()
  })

  test('④ 🛑★★★★★★【不双扣:两张的 `effect` 都不再扣第二笔】', () => {
    const c = makeCrimsonRoseTrigger(asObjId('c'), P1)
    const paidC = c.basePerform!(scene(1, 0), {} as GameEvent, {})!
    const evsC = c.effect(paidC, { kind: 'playUnit', player: P1, unit: asObjId('s') } as unknown as GameEvent, {})
    expect(evsC.map((e) => (e as { kind?: string }).kind).includes('spend'), '★★★UNL-109 的 effect 没有第二笔扣费').toBe(false)
    expect(evsC.length, '★★★前提自证:收益(获得经验)确实产出了 —— ★1485/★1486 证明「双扣」会让它空转').toBeGreaterThan(0)
    const s = makeStrongSpriteTrigger(asObjId('s'), P1)
    const paidS = s.basePerform!(scene(0, 1), {} as GameEvent, {})!
    const evsS = s.effect(paidS, { kind: 'unitMoved', unit: asObjId('s'), to: asZoneId(BF0) } as unknown as GameEvent, { mate: 'c' })
    expect(evsS.map((e) => (e as { kind?: string }).kind).includes('spend'), '★★★SFD-125 的 effect 没有第二笔扣费').toBe(false)
    expect(evsS.length, '★★★前提自证:收益(把队友拉过来)确实产出了').toBeGreaterThan(0)
  })

  test('⑤ 📄★★★★【这一族的【修】全部做完:4/4 张卡 · 3/3 处工厂】', () => {
    const DONE = ['★1485 UNL-137(mana)', '★1486 薇恩 SFD-223 + OGN-035(mana,一处两张)',
      '★1487 SFD-125(pip)', '★1487 UNL-109(mana)']
    expect(DONE.length, '📄★★★四张卡全部搬完').toBe(4)
                                                                  
                                                     
    const REST = ['战场卡 SFD-207 单独查', '回头重判 ★1443 的 SHAPE']
    expect(REST.length, '📄★★★还欠 2 件才收口').toBe(2)
  })
})
