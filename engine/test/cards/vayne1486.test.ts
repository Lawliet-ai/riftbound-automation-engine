import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { canPayFromState } from '../../src/game/economy'
import { makeVayneTrigger, VAYNE_COST } from '../../data/cards/enter-ready'

                                                       
                                                                               
  
                                                
                                                                
                                                                            
                                                  
                                                             
                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const mk = (oid: string, defId: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(mana: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, activePlayer: P1, priority: P1, phase: 'main', feprPasses: 0,
    objects: { ...base.objects, v: mk('v', 'SFD-223') },
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: [...z.contents, asObjId('v')] } },
    runePools: { ...base.runePools, [P1]: { mana, runes: {} } },
  } as unknown as GameState
}
const mana = (st: GameState): number => (st.runePools?.[P1]?.mana ?? -1)
const trig = (defId = 'SFD-223') => makeVayneTrigger(asObjId('v'), P1, defId)

describe('🔴🔴🔴★★★★★★1486 薇恩(SFD-223 / OGN-035):基础费用搬到【确认阶段】付', () => {
  test('① 📄★★★【费用常量:问侧与付侧共用同一个数】', () => {
    expect(VAYNE_COST, '★卡文逐字:支付{{1}} = 1 点法力(不是 pip)').toEqual({ mana: 1 })
  })

  test('② 🛑★★★★★★【确认阶段就扣掉了 —— 不是等到结算】', () => {
    const paid = trig().basePerform!(scene(1), {} as GameEvent, {})
    expect(paid, '★★付得起 ⇒ 返回付完费的 state').not.toBeNull()
    expect(mana(paid!), '★★★★★`basePerform` 在**确认阶段**就扣掉了 1(修前要等结算才扣)').toBe(0)
  })

  test('③ 🛑★★★★★【付不起 ⇒ `basePerform` 给 null ⇒ §383.3.b.1 不确认、视为未触发】', () => {
    expect(trig().basePerform!(scene(0), {} as GameEvent, {}), '★★池 0 ⇒ null').toBeNull()
                                                                 
    const src = trig()
    expect((src as unknown as { mayChoose?: boolean }).mayChoose, '★问侧仍在确认阶段问(§383.3.a)').toBe(true)
  })

  test('④ 🛑★★★★★★【不双扣:`basePerform` 扣完之后,`effect` 不再扣第二笔】', () => {
    const t = trig()
    const paid = t.basePerform!(scene(1), {} as GameEvent, {})!
    expect(mana(paid), '★前提:已扣 1').toBe(0)
    expect(canPayFromState(paid, P1, VAYNE_COST), '★★扣完之后确实付不起第二笔了').toBe(false)
    const evs = t.effect(paid, {} as GameEvent, {})
    const kinds = evs.map((e) => (e as { kind?: string }).kind ?? '')
    expect(kinds.includes('spend') || kinds.includes('payResource'), '★★★★★`effect` 里【没有】第二笔扣费 ⇒ 不双扣').toBe(false)
                                                                
    expect(evs.length, '★★★前提自证:收益事件确实产出了(★1485 的刀 K2 证明「双扣」会让它空转)').toBeGreaterThan(0)
  })

  test('⑤ 📄★★★★【一处改动修两张:`OGN-035` 走同一个工厂,行为一致】', () => {
    const paid035 = trig('OGN-035').basePerform!(scene(1), {} as GameEvent, {})
    expect(mana(paid035!), '★★OGN-035 同样在确认阶段扣掉 1').toBe(0)
    expect(trig('OGN-035').basePerform!(scene(0), {} as GameEvent, {}), '★★OGN-035 付不起也给 null').toBeNull()
  })
})
