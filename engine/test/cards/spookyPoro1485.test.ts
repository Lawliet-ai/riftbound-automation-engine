import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { activeTriggers } from '../../data/registry'
import { canPayFromState } from '../../src/game/economy'
import { makeSpookyPoroTrigger, UNL_137_COST } from '../../data/cards/batch-play-triggers'

                                                          
                                                
  
                                                  
                                                                
                                                                
                                                                                        
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const mk = (oid: string, defId: string, zone: string, ctrl = P1): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                         
function scene(mana: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const me = mk('poro', 'UNL-137', BF0)
  const foe = mk('foe', 'OGN-012', BF0, P2)
  const z = base.zones[asZoneId(BF0)]!
  return recomputeContinuous({
    ...base, activePlayer: P1, priority: P1, phase: 'main', feprPasses: 0,
    objects: { ...base.objects, poro: me, foe },
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: [...z.contents, asObjId('poro'), asObjId('foe')] } },
    runePools: { ...base.runePools, [P1]: { mana, runes: {} } },
  } as unknown as GameState)
}
const attacked = (st: GameState): GameState =>
  landAndEnqueueTriggers(st,
    [{ kind: 'attack', unit: asObjId('poro'), player: P1, battlefield: asZoneId(BF0) } as unknown as GameEvent],
    activeTriggers, P1, {})
function askKey(step: ReturnType<typeof advanceFepr>): string {
  const r = (step as { readonly request?: { readonly key: string } }).request
  expect(r, '★前提:这一步必须真的【问】了').toBeDefined()
  return r!.key
}
const answer = (st: GameState, key: string, id: string): GameState =>
  ({ ...st, resolveChoices: { ...(st.resolveChoices ?? {}), [key]: id } }) as unknown as GameState
const mana = (st: GameState): number => (st.runePools?.[P1]?.mana ?? -1)

describe('🔴🔴🔴★★★★★★1485 UNL-137:基础费用搬到【确认阶段】付(缺陷 194 载体面)', () => {
  test('① 📄★★★【费用常量:问侧那道门与付侧 `basePerform` 共用同一个数】', () => {
    expect(UNL_137_COST, '★卡文逐字:支付{{1}} = 1 点法力(不是 pip)').toEqual({ mana: 1 })
  })

  test('② 🛑★★★★★★【确认阶段就扣掉了 —— 不是等到结算】', () => {
    const a = advanceFepr(attacked(scene(1)), {})
    expect(a.kind, '★★前提:池里有钱 ⇒ 触发入链、停下来问(§383.3.a)').toBe('choice')
    expect(mana(a.state), '★★问的时候【还没扣】').toBe(1)
    const b = advanceFepr(answer(a.state, askKey(a), 'yes'), {})
    expect(mana(b.state), '★★★★★答「执行」⇒ **确认阶段**就扣掉了(修前要等结算才扣)').toBe(0)
    expect(b.state.chain.length, '★★项目没被移除(付得起 ⇒ 确认成功)').toBeGreaterThan(0)
  })

  test('③ 🛑★★★★★【付不起 ⇒ 连触发都不入链(★1467 接的 §444.2.c 问侧门)】', () => {
    const st = attacked(scene(0))
    expect(st.chain.length, '★★★池 0 且场上没有[反应]产资源载体 ⇒ 问侧那道门把整条拦掉').toBe(0)
  })

  test('④ 🛑★★★★★★【不双扣:`basePerform` 扣完之后,`effect` 不再扣第二笔】', () => {
                                                                         
    const trig = makeSpookyPoroTrigger(asObjId('poro'), P1)
    const st = scene(1)
    const paid = trig.basePerform!(st, {} as GameEvent, {})!
    expect(paid, '★前提:付得起').not.toBeNull()
    expect(mana(paid), '★★扣掉 1').toBe(0)
    expect(canPayFromState(paid, P1, UNL_137_COST), '★★扣完之后确实付不起第二笔了').toBe(false)
    const evs = trig.effect(paid, {} as GameEvent, { unit: 'foe' })
    const kinds = evs.map((e) => (e as { kind?: string }).kind ?? '')
    expect(kinds.includes('spend') || kinds.includes('payResource'), '★★★★★`effect` 里【没有】第二笔扣费 ⇒ 不双扣').toBe(false)
    expect(evs.length, '★前提自证:`effect` 确实产出了收益事件(不是空转)').toBeGreaterThan(0)
  })

  test('⑤ 📄★★★【付不起时 `basePerform` 给 null ⇒ §383.3.b.1 不确认】', () => {
    const trig = makeSpookyPoroTrigger(asObjId('poro'), P1)
    expect(trig.basePerform!(scene(0), {} as GameEvent, {}), '★★池 0 ⇒ null').toBeNull()
  })
})
