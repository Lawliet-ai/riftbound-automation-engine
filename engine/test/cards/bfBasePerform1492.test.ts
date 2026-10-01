import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { installProviders } from '../../data/gameDeps'
import { makeStarSpireTrigger, makeGhostBayTrigger, UNL_214_COST } from '../../data/cards/battlefields-diana'

                                                                    
  
           
                                                                  
                                                       
                                                             
                                           
  
                                                     
                                                                 
                                                                 
                                                         
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                                  
function scene(mana: number): GameState {
  const base = createInitialState([P1, P2], 2)
  return {
    ...base, activePlayer: P1, priority: P1, phase: 'main', feprPasses: 0,
    runePools: { ...base.runePools, [P1]: { mana, runes: {} } },
  } as unknown as GameState
}
const manaOf = (st: GameState): number => (st.runePools?.[P1]?.mana ?? -1)
const kinds = (evs: readonly GameEvent[]): readonly string[] => evs.map((e) => (e as { kind?: string }).kind ?? '')
const HOLD = { kind: 'hold', player: P1, battlefield: BF0 } as unknown as GameEvent
const RETURN = { kind: 'zoneChange', obj: asObjId('u1'), from: BF0, to: `hand:${P1}`, defId: 'OGN-012' } as unknown as GameEvent

describe('🔴🔴🔴★★★★★★1492 战场卡搬通道 2/4:OGN-288(档甲)· UNL-214(档乙)', () => {
  test('① 📄★★★【档甲 OGN-288:只搬「问」那一半 —— 有 `mayChoose`、没有 `basePerform`】', () => {
    const t = makeStarSpireTrigger(BF0, P1)
    expect(t.mayChoose, '★★§383.3.a:这一问在**确认阶段**').toBe(true)
                                                              
    expect(t.basePerform, '★★★纯可选、没有付出 ⇒ 不需要 §383.3.b 那一半').toBeUndefined()
  })

  test('② 🛑★★★★★★【档乙 UNL-214:确认阶段就扣掉了 + 付不起给 null】', () => {
    expect(UNL_214_COST, '★费用常量:支付{{1}} = 1 点法力').toEqual({ mana: 1 })
    const t = makeGhostBayTrigger(BF0, P1)
    const paid = t.basePerform!(scene(1), RETURN, {})
    expect(paid, '★付得起').not.toBeNull()
    expect(manaOf(paid!), '★★★★★确认阶段就扣掉了 1(修前要等结算才扣)').toBe(0)
    expect(t.basePerform!(scene(0), RETURN, {}), '★★池 0 ⇒ null(§383.3.b.1 不确认、视为未触发)').toBeNull()
  })

  test('③ 🛑★★★★★★【不双扣正面自证:`effect` 不再扣第二笔,而收益照出】', () => {
    const t = makeGhostBayTrigger(BF0, P1)
    const paid = t.basePerform!(scene(1), RETURN, {})!
    const evs = t.effect(paid, RETURN, {})
    expect(kinds(evs).includes('spend'), '★★★UNL-214 的 effect 里没有第二笔扣费').toBe(false)
                                                                
    expect(kinds(evs), '★★★★★收益(召出一枚休眠符文)照常产出').toContain('summonRune')
  })

  test('④ 🛑★★★★★【档甲 OGN-288 的 `effect`:不再需要结算期那一答,直接产出收益】', () => {
    const t = makeStarSpireTrigger(BF0, P1)
    const evs = t.effect(scene(0), HOLD, {})
                                                                          
    expect(kinds(evs), '★★★★★确认阶段答过「执行」之后,结算期直接产出收益').toContain('summonRune')
  })

  test('⑤ 🛑★★★★★★【收益可行性门已放开:符文牌堆【空】也照问不误(★1448 判例的漏网)】', () => {
    installProviders()
    const st = scene(1)
                                                               
    expect(st.zones[asZoneId(`runeDeck:${P1}`)]?.contents.length ?? 0, '★前提自证:符文牌堆是空的').toBe(0)
    expect(checkTrigger(makeStarSpireTrigger(BF0, P1), HOLD, st, P1),
      '★★★★★OGN-288:牌堆空也照样入链 ⇒ 确认阶段问得到').toBe(true)
    expect(checkTrigger(makeGhostBayTrigger(BF0, P1), RETURN, st, P1),
      '★★★★★UNL-214:牌堆空也照样入链').toBe(true)
                                                                
    expect(checkTrigger(makeGhostBayTrigger(BF0, P1), RETURN, scene(0), P1),
      '★★池 0 且场上没有反应获取源 ⇒ 仍然不入链(★1188 那道门还在)').toBe(false)
  })

  test('⑥ 📄★★★【进度账:4 张战场卡搬完 2 张,还剩 2 张】', () => {
    const DONE = ['★1492 OGN-288 星尖峰(档甲,只搬「问」)', '★1492 UNL-214 鬼影湾(档乙,问 + 付都搬)']
    const TODO = ['SFD-207 帝王神坛(档乙)', 'SFD-214 能量枢纽(档乙)']
    expect(DONE.length + TODO.length, '★★两档之和 = ★1490 定性的 4 张(★1454:每一个都要有下落)').toBe(4)
    expect(DONE.length, '📄本轮搬完 2 张(⚠️一轮 1–2 张,别一轮吃完)').toBe(2)
                                                                         
                                                
    expect(TODO).toContain('SFD-214 能量枢纽(档乙)')
  })
})
