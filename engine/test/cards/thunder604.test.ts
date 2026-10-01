import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { playSpecFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  OGN_250, OGN_250_SPEC, OGN_250_CARD_EFFECT, OGN_250_BF_KEY,
  thunderMovers, thunderBattlefields, thunderTargetLive,
} from '../../data/cards/OGN-250'

                                                          
                                            
                                                
                                                        
                                             
  
               
                                           
                          
                                             
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const CARD = 'sp'

const unit = (oid: string, ctrl = P1, zone = `base:${P1}`, might = 4, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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

const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  OGN_250_SPEC.makeNextChoice!({ movedCardOid: CARD, controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  OGN_250_SPEC.makeResolve({ movedCardOid: CARD, controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const hits = (evs: readonly GameEvent[]) => evs
  .filter((e) => (e as { kind: string }).kind === 'damage')
  .map((e) => e as unknown as { target: string; amount: number; source: string; sourcePlayer: string })
const moved = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'unitMoved') as
  { unit: string; to: string } | undefined

describe('🔴🔴🔴★★★★★★604 天声震落:前提与接线', () => {
  test('★前提:法术 6费 **两枚单色pip**(红+橙)、单印次、卡文一字不差', () => {
    expect(CARD_COSTS['OGN-250']).toEqual({ mana: 6, pips: 2, colors: ['red', 'orange'] })
    expect(OGN_250_SPEC.cost, '★★★pips=2 且两色 ⇒ **两枚单色**;1 枚双色是 pips:1(★592 的分野)')
      .toEqual({ mana: 6, pips: [['red'], ['orange']] })
    expect(cardKind('OGN-250')).toBe('spell')
    expect(OGN_250.domains).toEqual(['red', 'orange'])
    expect(OGN_250_CARD_EFFECT).toBe(
      '选择你基地中的一名友方单位，对一处战场上的所有敌方单位造成等同于该友方单位战力的伤害，然后将该友方单位移动到此战场。')
  })

  test('★★接线:PLAY_SPECS 查得到(登记漏了 ⇒ 这张牌在真对局里打不出来)', () => {
    expect(playSpecFor('OGN-250')).toBeDefined()
    expect(playSpecFor('OGN-250')!.defId).toBe('OGN-250')
  })
})

describe('🔴🔴🔴★★★★★★604 天声震落:「你基地中的一名友方单位」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】限**基地**(与 ★602 悠米的「此处」正相反)', () => {
                                  
    const s = scene([unit('atBase', P1, `base:${P1}`), unit('onBf', P1, BF0)])
    expect(thunderMovers(s, P1), '★★★战场上的那名不算').toEqual(['atBase'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】只认**我控制的**;对手基地里的不算', () => {
    const s = scene([unit('mine', P1, `base:${P1}`), unit('foe', P2, `base:${P2}`)])
    expect(thunderMovers(s, P1), '★★★漏 controller 会把敌方也列出来').toEqual(['mine'])
  })

  test('🔴🔴★★★★★★legalTargets 与判据同源', () => {
    const s = scene([unit('mine', P1, `base:${P1}`), unit('onBf', P1, BF0)])
    expect(OGN_250_SPEC.legalTargets(s, P1)).toEqual(['mine'])
    expect(thunderTargetLive(s, P1, 'mine')).toBe(true)
    expect(thunderTargetLive(s, P1, 'onBf'), '★战场上那名不是合法目标').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★604 天声震落:「一处战场」那一问', () => {
  test('🔴🔴★★★★★★候选 = 场上全部战场;作答者是我', () => {
    const s = scene([unit('mine')])
    const q = ask(s, 'mine')!
    expect(q.key).toBe(OGN_250_BF_KEY)
    expect(q.controller).toBe(P1)
    expect(q.candidates.map((c) => c.id)).toEqual(thunderBattlefields(s))
    expect(q.candidates.length, '★前提自证:真的有战场').toBeGreaterThanOrEqual(2)
  })

  test('🔴🔴🔴★★★★★★【会换答案】目标已不在我基地 ⇒ **连问都不问**', () => {
    const s = scene([unit('mine', P1, BF0)])            
    expect(ask(s, 'mine'), '★★★不复验的话会照样弹问').toBeNull()
  })

  test('🔴🔴★★★★★★答过就别再问(⑰)', () => {
    const s = scene([unit('mine')])
    expect(ask(s, 'mine', { [OGN_250_BF_KEY]: BF0 })).toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★604 天声震落:结算', () => {
                                                   
  const std = () => scene([
    unit('mine', P1, `base:${P1}`, 4),
    unit('foeA', P2, BF0), unit('foeB', P2, BF0), unit('ally', P1, BF0),
    unit('farFoe', P2, BF1),
  ])
  const FULL = { [OGN_250_BF_KEY]: BF0 }

  test('🔴🔴🔴★★★★★★【真结算】打**该处全部**敌方,然后把那名单位移过去', () => {
    const evs = resolve(std(), 'mine', FULL)
    expect(kinds(evs), '★先两条伤害,再移动的两条(zoneChange + unitMoved)')
      .toEqual(['damage', 'damage', 'zoneChange', 'unitMoved'])
    expect(hits(evs).map((h) => h.target).sort(), '★★★「所有」——不是选一名').toEqual(['foeA', 'foeB'])
    expect(hits(evs).every((h) => h.amount === 4), '★等同于那名友方的战力').toBe(true)
    expect(hits(evs)[0]!.source, '★两个归属都要:哪张卡').toBe(CARD)
    expect(hits(evs)[0]!.sourcePlayer, '★两个归属都要:谁打的').toBe(P1)
    expect(moved(evs)!.unit).toBe('mine')
    expect(moved(evs)!.to).toBe(BF0)
  })

  test('🔴🔴🔴★★★★★★【会换答案】只打**那一处**;别处战场的敌方不挨打', () => {
    expect(hits(resolve(std(), 'mine', FULL)).map((h) => h.target), '★★★farFoe 在 BF1,不该中枪')
      .not.toContain('farFoe')
  })

  test('🔴🔴🔴★★★★★★【会换答案】只打**敌方**;同处的友方不挨打', () => {
    expect(hits(resolve(std(), 'mine', FULL)).map((h) => h.target), '★★★ally 是我的').not.toContain('ally')
  })

  test('🔴🔴🔴★★★★★★【会换答案】伤害量 = **那名友方**的战力,**结算时现读**', () => {
                                              
    const s = scene([
      { ...unit('mine', P1, `base:${P1}`, 4), derived: { might: 9, keywords: [] } } as unknown as GameObject,
      unit('foeA', P2, BF0),
    ])
    expect(hits(resolve(s, 'mine', FULL))[0]!.amount, '★★★卡面 4、场上 9 ⇒ 打 9').toBe(9)
  })

  test('🔴🔴🔴★★★★★★【会换答案·顺序承重】伤害在**移动之前**', () => {
                                                 
    const k = kinds(resolve(std(), 'mine', FULL))
    expect(k.indexOf('damage'), '★★★先伤害').toBeLessThan(k.indexOf('unitMoved'))
  })

  test('🔴🔴🔴★★★★★★【会换答案】那处**一名敌方都没有** ⇒ 不打伤害,但**移动照做**', () => {
    const s = scene([unit('mine'), unit('ally', P1, BF0)])
    expect(kinds(resolve(s, 'mine', FULL)), '★★★把移动挂在"打过伤害"上会红')
      .toEqual(['zoneChange', 'unitMoved'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·被无视 vs 没发生】目标已不在我基地 ⇒ **两句一并被无视**', () => {
                                                  
    const s = scene([unit('mine', P2, `base:${P2}`), unit('foeA', P2, BF0)])
    expect(resolve(s, 'mine', FULL), '★★★易主了就整条不做').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案·被撤销 ≠ 被无视】移动**被限制挡下** ⇒ 伤害照打', () => {
                                                                
                                                             
                                                            
                                             
    const s = scene([
      { ...unit('mine', P1, `base:${P1}`, 4), derived: { might: 4, keywords: [], restrictions: ['move'] } } as unknown as GameObject,
      unit('foeA', P2, BF0),
    ])
    const evs = resolve(s, 'mine', FULL)
    expect(moved(evs), '★前提自证:移动确实被挡下了').toBeUndefined()
    expect(hits(evs).map((h) => h.target), '★★★伤害那半照旧').toEqual(['foeA'])
  })

  test('🔴🔴★★★★★★没答战场(客户端没给)⇒ 一条都不发', () => {
    expect(resolve(std(), 'mine', {})).toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】答的是**非战场的区**(客户端乱发)⇒ 一条都不发', () => {
                                              
                                                                    
                                                 
                                                      
                                             
    const s = scene([unit('mine'), unit('foeAtBase', P2, `base:${P2}`)])
    expect(resolve(s, 'mine', { [OGN_250_BF_KEY]: `base:${P2}` }),
      '★★★不校验的话会把对手基地里的单位全打一遍').toEqual([])
                                           
    expect(resolve(std(), 'mine', { [OGN_250_BF_KEY]: 'battlefield:nope' })).toEqual([])
  })

  test('🔴🔴★★★★★★没目标 ⇒ 一条都不发', () => {
    expect(resolve(std(), undefined, FULL)).toEqual([])
    expect(ask(std(), undefined)).toBeNull()
  })
})
