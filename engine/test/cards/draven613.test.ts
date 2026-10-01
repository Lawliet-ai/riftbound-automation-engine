import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_FACTS } from '../../data/cardFacts'
import { GOLD_TOKEN } from '../../data/cards/gear-triggers'
import {
  SFD_020, SFD_020_CARD_EFFECT, SFD_020_BONUS, SFD_020_COST,
  makeDravenWonBattleTrigger, makeDravenPumpTriggers,
} from '../../data/cards/SFD-020'
import { canPayFromState } from '../../src/game/economy'                        

                                                               
                                                                   
                                   
                                                        
                                              
                                                                    
                                                                  
                                        
  
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'draven'

const unit = (oid: string, ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const draven = (): GameObject => ({ ...unit(SELF), defId: 'SFD-020' } as GameObject)

                                                                     
                                                                       
const redRune = (oid: string): GameObject => ({
  oid: asObjId(oid), defId: 'rune:red', owner: P1, controller: P1, zone: asZoneId(`base:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

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
   
            
                                                                  
                                                                                              
                                                                                        
                                                           
   
const battleEnd = (
  outcome: 'attackerWins' | 'defenderWins' | 'noResult', participants: readonly string[],
): GameEvent =>
  ({ kind: 'battleEnd', battlefield: BF0, attacker: P1, defender: P2, outcome,
    participants: participants.map((o) => asObjId(o)) } as unknown as GameEvent)

const wonTrig = () => makeDravenWonBattleTrigger(asObjId(SELF), P1)
const pumpTrigs = () => makeDravenPumpTriggers(asObjId(SELF), P1)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)

describe('🔴🔴🔴★★★★★★613 德莱文:前提与接线', () => {
  test('★前提:英雄单位 4费 **0pip** 红 4[S]、**两印次**、⚠️以 **errata** 为准', () => {
    expect(CARD_COSTS['SFD-020']).toEqual({ mana: 4, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['SFD-020a']).toEqual({ mana: 4, pips: 0, colors: ['red'] })
    expect(cardKind('SFD-020')).toBe('unit')
    expect(CARD_FACTS['SFD-020']?.heroUnit).toBe(true)
    expect(SFD_020.energy).toBe(4)
    expect(SFD_020.power).toBe(4)
                                                             
    expect(SFD_020_CARD_EFFECT).toBe(
      '当我赢得战斗时，打出一个休眠的“金币”装备指示物。\n当我进攻或防守时，你可以选择支付{{红色}}。若如此做，则让我在本回合内{{S}}+2。')
    expect(SFD_020_CARD_EFFECT, '★★★别退回印刷文本').not.toContain('以此让我')
  })

  test('🔴🔴🔴★★★★★★接线:触发表**两个卡号各查得到三条**(赢战斗1 + 进攻/防守2)', () => {
    for (const id of ['SFD-020', 'SFD-020a']) {
      const s = scene([{ ...draven(), defId: id } as GameObject])
      const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'SFD-020')
      expect(mine.length, `★★★${id} 登记漏了`).toBe(3)
      expect(mine.map((t) => t.event).sort()).toEqual(['attack', 'battleEnd', 'defend'])
    }
    expect(cardCost('SFD-020'), '★★★登了触发就得登费用;0pip 别写成有 pip').toEqual({ mana: 4 })
  })

  test('🔴🔴🔴★★★★★★【会换答案】两个时机**共用一个 abilityKey**(★610 卢锡安正好是反例)', () => {
    const keys = pumpTrigs().map((t) => t.abilityKey)
    expect(keys[0], '★★★漏了 abilityKey ⇒ §471 得分互映会把一条能力当两条').toBeDefined()
    expect(new Set(keys).size, '★★★两条必须是同一个 key').toBe(1)
    expect(pumpTrigs().map((t) => t.id).sort(), '★但触发 id 各自独立').toHaveLength(2)
  })
})

describe('🔴🔴🔴★★★★★★613 句①:「当我赢得战斗时,打出一个休眠的金币」', () => {
  test('🔴🔴🔴★★★★★★【真结算】我参战且我方赢 ⇒ 打出**休眠的**金币到**我的基地**', () => {
    const s = scene([draven()])
    const ev = battleEnd('attackerWins', [SELF])                 
    expect(wonTrig().filter?.(ev, s) ?? true).toBe(true)
    const evs = wonTrig().effect(s, ev, {}) as readonly GameEvent[]
    expect(kinds(evs)).toEqual(['spawnToken'])
    expect(evs[0]).toMatchObject({
      spec: GOLD_TOKEN, zone: `base:${P1}`, owner: P1,
      dormant: true, // ★★★「休眠的」——装备指示物落成 tapped(★611 的分野)
    })
  })

  test('🔴🔴🔴★★★★★★【会换答案】**对手赢** / **我没参战** ⇒ 不触发', () => {
    const s = scene([draven(), unit('ally')])
    expect(wonTrig().filter?.(battleEnd('defenderWins', [SELF]), s) ?? true, '★★★对手赢').toBe(false)
    expect(wonTrig().filter?.(battleEnd('attackerWins', ['ally']), s) ?? true,
      '★★★我方赢了但**我没参战** ⇒ 「当**我**赢得」不成立').toBe(false)
    expect(wonTrig().filter?.(battleEnd('noResult', [SELF]), s) ?? true, '★无结果(§466.3.d 没人赢)').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★613 句②:「可选择支付{红色}。若如此做,则本回合内{S}+2」', () => {
  test('🔴🔴🔴★★★★★★【真结算 · ★1497 拦截点搬家】费用在【确认阶段】扣、收益在结算期;**本回合内** +2', () => {
    expect(SFD_020_BONUS).toBe(2)
                                               
                                                                                 
                                                                      
                                                                        
                                                        
                                    
    const s = scene([draven(), redRune('r1')])
    const ev = { kind: 'attack', unit: asObjId(SELF), player: P1 } as unknown as GameEvent
                                
    expect(SFD_020_COST, '★★★{红色}是**符能**不是法力').toEqual({ pips: [['red']] })
    expect(canPayFromState(s, P1, SFD_020_COST), '★前提:有一枚红符文 ⇒ 付得起').toBe(true)
    const paid = pumpTrigs()[0]!.basePerform!(s, ev, {})
    expect(paid, '★付得起 ⇒ 确认通过').not.toBeNull()
    expect(canPayFromState(paid!, P1, SFD_020_COST), '★★★★★付完之后再也付不起第二笔 ⇒ 确认阶段真扣了').toBe(false)
    expect(pumpTrigs()[0]!.basePerform!(scene([draven()]), ev, {}),
      '★★没红符文 ⇒ null(§383.3.b.1 不确认、视为未触发)').toBeNull()
                        
    const evs = pumpTrigs()[0]!.effect(paid!, ev, {}) as readonly GameEvent[]
    expect(kinds(evs), '★★★★★effect 里【没有】第二笔扣费,收益照出').toEqual(['addEffect'])
    const eff = (evs[0] as unknown as { effect: { duration: string } }).effect
    expect(eff.duration, '★★★「本回合内」不是永久').toBe('thisTurn')
    expect(JSON.stringify(evs), '★打在我自己身上').toContain(SELF)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**你可以选择**」⇒ 两条都 `mayChoose`(§383.3.a)', () => {
    for (const t of pumpTrigs()) {
      expect(t.mayChoose, '★★★漏了就成强制:没红色符能也逼你付').toBe(true)
    }
  })

  test('🔴🔴🔴★★★★★★【会换答案】「当**我**进攻/防守」——`subjectIsSelf`,队友进攻不响', () => {
    const s = scene([draven(), unit('ally')])
    for (const t of pumpTrigs()) {
      expect(t.by).toBe('you')
      const mate = { kind: t.event, unit: asObjId('ally'), player: P1 } as unknown as GameEvent
      expect(t.filter?.(mate, s) ?? true, `★★★${t.event}:只写 by:you 队友也会响(★第112轮实锤)`).toBe(false)
      const me = { kind: t.event, unit: asObjId(SELF), player: P1 } as unknown as GameEvent
      expect(t.filter?.(me, s) ?? false, `★${t.event}:我自己`).toBe(true)
    }
  })

  test('🔴🔴🔴★★★★★★【会换答案】**两个时机都在**:attack 与 defend 各一条', () => {
    expect(pumpTrigs().map((t) => t.event).sort(), '★★★只做 attack 那一条会漏掉防守(★602 的坑)')
      .toEqual(['attack', 'defend'])
  })
})
