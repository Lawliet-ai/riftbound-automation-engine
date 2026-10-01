import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind, cardCost, cardKeywords, playBonusFor, defHasTag } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { runeCountOf } from '../../data/cards/VEN-006'
import {
  VEN_016, VEN_016_CARD_EFFECT, VEN_016_KEYWORDS, VEN_016_RUNE_CAP,
  dragonRunesOk, makeUmbralDragonTrigger,
} from '../../data/cards/VEN-016'

                                                                
                                         
                                           
                                         
  
             
                                              
                                                               
                                           
                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = 'dragon'

const dragon = (zone = BF0): GameObject => ({
  oid: asObjId(SELF), defId: 'VEN-016', owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 8, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                
const rune = (oid: string, ctrl: PlayerId, zone?: string): GameObject => ({
  oid: asObjId(oid), defId: 'rune:red', owner: ctrl, controller: ctrl,
  zone: asZoneId(zone ?? `base:${ctrl}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const runes = (n: number, ctrl: PlayerId, tag: string): GameObject[] =>
  Array.from({ length: n }, (_, i) => rune(`${tag}${i}`, ctrl))

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
const trig = () => makeUmbralDragonTrigger(asObjId(SELF), P1)
                                                         
const moved = (who: string, player: PlayerId = P1): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(who), player, from: asZoneId(BF0), to: asZoneId(BF1) } as unknown as GameEvent)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)

describe('🔴🔴🔴★★★★★★618 蚀影巨龙:前提与接线', () => {
  test('★前提:单位 8费 **0pip** 红 8[S]、tag「龙」、**单印次**、卡文一字不差', () => {
    expect(CARD_COSTS['VEN-016']).toEqual({ mana: 8, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['VEN-016a'], '★单印次:没有 a 号').toBeUndefined()
    expect(cardKind('VEN-016')).toBe('unit')
    expect(VEN_016.energy).toBe(8)
    expect(VEN_016.power).toBe(8)
    expect(defHasTag('VEN-016', '龙'), '★它是「龙」——下面那条龙栖峰用例的前提').toBe(true)
    expect(VEN_016_CARD_EFFECT).toBe(
      '{{急速}}（你可以选择额外支付{{1}}和{{红色}}，让我以活跃状态进场。）\n'
      + '当我移动时，如果你控制的符文数量不超过四枚，则抽一张牌。')
  })

  test('🔴🔴🔴★★★★★★【会换答案】接线:触发查得到;⚠️[急速] **必须登**印刷表才生效', () => {
    const s = scene([dragon()])
    const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'VEN-016')
    expect(mine.length, '★★★登记漏了 ⇒ 这张卡的第二句是死的').toBe(1)
    expect(mine[0]!.event).toBe('unitMoved')
                                                        
                                              
    expect(cardKeywords('VEN-016'), '★★★漏登 ⇒ §805 那条可选额外费用整个消失').toEqual(['急速'])
    expect(VEN_016_KEYWORDS).toEqual(['急速'])
    expect(VEN_016.keywords, '★卡面印的就是它').toEqual(['急速'])
    expect(cardCost('VEN-016'), '★★★单位**要**进 UNIT_COST(与法术相反);8费 0pip').toEqual({ mana: 8 })
  })

  test('🔴🔴🔴★★★★★★【会换答案·618 现场量】[急速] **不顶掉龙栖峰 VEN-157** —— 两条路不相交', () => {
                                                                     
                                                                            
                                                          
    const bonus = playBonusFor('VEN-016')
    expect(bonus, '★★★本卡是龙 ⇒ 照样拿得到龙栖峰那条').toBeDefined()
    expect(bonus!.label, '★★★被自带费用顶掉的话这里就不是龙栖峰了').toContain('龙栖峰')
  })
})

describe('🔴🔴🔴★★★★★★618 时机:「当**我**移动时」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】`unitMoved` **带 unit** ⇒ 用 `subjectIsSelf`;别人移动不响', () => {
                                                                         
    const s = scene([dragon(), ...runes(2, P1, 'm')])
    expect(trig().filter?.(moved(SELF), s) ?? true, '★我移动').toBe(true)
    expect(trig().filter?.(moved('someoneElse'), s) ?? true, '★★★别人移动**不该**响').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★618 条件:「符文数量**不超过**四枚」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「不超过」=**≤**;**四枚成立**、五枚不成立(㉙ 两头压)', () => {
                                                            
    expect(VEN_016_RUNE_CAP).toBe(4)
    const four = scene([dragon(), ...runes(4, P1, 'm')])
    expect(runeCountOf(four, P1)).toBe(4)
    expect(dragonRunesOk(four, P1), '★★★**四枚正好成立**(写成 < 4 这条当场红)').toBe(true)
    const five = scene([dragon(), ...runes(5, P1, 'm')])
    expect(dragonRunesOk(five, P1), '★★★五枚不成立(写成 <= 5 或去掉判据都会红)').toBe(false)
    const three = scene([dragon(), ...runes(3, P1, 'm')])
    expect(dragonRunesOk(three, P1), '★三枚成立').toBe(true)
    expect(dragonRunesOk(scene([dragon()]), P1), '★一枚都没有也成立').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】数的是「**你**控制的」——对手的符文一枚都不算', () => {
                                                 
    const s = scene([dragon(), ...runes(2, P1, 'm'), ...runes(9, P2, 'f')])
    expect(runeCountOf(s, P1)).toBe(2)
    expect(dragonRunesOk(s, P1), '★★★对手铺再多也不影响我').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案·场景要造到位】只数**符文物件**、只数**基地里的**', () => {
                                                       
                                  
    const s = scene([dragon(), ...runes(5, P1, 'm'),
      { ...dragon(`base:${P1}`), oid: asObjId('atBase') } as GameObject])
    expect(runeCountOf(s, P1), '★★★基地里那名【单位】不是符文,不该被数进去').toBe(5)
    expect(dragonRunesOk(s, P1), '★正好 5 枚 ⇒ 不成立(那名单位若被误数就成 6,答案不变——见下一条)').toBe(false)
                        
    const notFielded = scene([dragon(), ...runes(4, P1, 'm'), rune('inDeck', P1, `runeDeck:${P1}`)])
    expect(runeCountOf(notFielded, P1), '★★★没召出的不算 ⇒ 仍是 4').toBe(4)
    expect(dragonRunesOk(notFielded, P1), '★★★误数进来就变 5、这条当场红').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案·端到端】条件不成立 ⇒ **连触发都不响**(§383.2.a.1)', () => {
    const five = scene([dragon(), ...runes(5, P1, 'm')])
    expect(trig().filter?.(moved(SELF), five) ?? true, '★★★附加条件在触发时判').toBe(false)
    const four = scene([dragon(), ...runes(4, P1, 'm')])
    expect(trig().filter?.(moved(SELF), four) ?? true, '★★★四枚照样触发').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★618 收益:「则抽一张牌」', () => {
  test('🔴🔴🔴★★★★★★【真结算】抽**一**张,抽的是**我的**牌', () => {
    const s = scene([dragon(), ...runes(2, P1, 'm')])
    const evs = trig().effect(s, moved(SELF), {}) as readonly GameEvent[]
    expect(kinds(evs)).toEqual(['draw'])
    expect(evs[0], '★★★抽牌人是我;张数钉住卡面的"一张"').toMatchObject({ player: P1, count: 1 })
  })

  test('🔴🔴★★★★★★卡文**没有**「你可以选择」⇒ **不给** `mayChoose`(§383.3.a)', () => {
    expect(trig().mayChoose, '★★★凭空加上会让玩家每次移动都被问一次').toBeFalsy()
  })
})
