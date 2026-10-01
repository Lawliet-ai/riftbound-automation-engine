import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind, cardCost, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  VEN_006, VEN_006_CARD_EFFECT, VEN_006_BONUS, VEN_006_GRANT,
  runeCountOf, oasisBehind, makeOasisRaiderTrigger,
} from '../../data/cards/VEN-006'

                                                        
                                           
                                                   
                                         
  
             
                                                                                
                                                        
                                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'raider'

const raider = (zone = BF0): GameObject => ({
  oid: asObjId(SELF), defId: 'VEN-006', owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                
const rune = (oid: string, ctrl: PlayerId, zone?: string): GameObject => ({
  oid: asObjId(oid), defId: 'rune:red', owner: ctrl, controller: ctrl,
  zone: asZoneId(zone ?? `base:${ctrl}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[], players: readonly PlayerId[] = [P1, P2]): GameState {
  const base = createInitialState([...players], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'start', objects, zones } as GameState
}
const trig = () => makeOasisRaiderTrigger(asObjId(SELF), P1)
const startPhase = (player: PlayerId): GameEvent =>
  ({ kind: 'startPhase', player } as unknown as GameEvent)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
                    
const runes = (n: number, ctrl: PlayerId, tag: string): GameObject[] =>
  Array.from({ length: n }, (_, i) => rune(`${tag}${i}`, ctrl))

describe('🔴🔴🔴★★★★★★614 绿洲劫掠者:前提与接线', () => {
  test('★前提:单位 4费 **0pip** 红 4[S]、**单印次**、`errata` 空、卡文一字不差', () => {
    expect(CARD_COSTS['VEN-006']).toEqual({ mana: 4, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['VEN-006a'], '★单印次:没有 a 号').toBeUndefined()
    expect(cardKind('VEN-006')).toBe('unit')
    expect(VEN_006.energy).toBe(4)
    expect(VEN_006.power).toBe(4)
    expect(VEN_006.domains).toEqual(['red'])
    expect(VEN_006_CARD_EFFECT).toBe(
      '在你的开始阶段开始时，如果你控制的符文数量少于任一对手，则给予我在本回合内{{S}}+2和{{游走}}。（我可以向其他战场进行移动。）')
  })

  test('🔴🔴🔴★★★★★★【会换答案】接线:触发查得到;⚠️[游走] 是**临时授予**,**不该**登印刷表', () => {
    const s = scene([raider()])
    const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'VEN-006')
    expect(mine.length, '★★★登记漏了 ⇒ 这张卡是死的').toBe(1)
    expect(mine[0]!.event).toBe('startPhase')
                                                              
    expect(cardKeywords('VEN-006'), '★★★登进印刷表会让它【永久】有游走').not.toContain('游走')
    expect(VEN_006.keywords, '★卡面没印任何关键词').toEqual([])
    expect(cardCost('VEN-006'), '★★★登了触发就得登费用;0pip 别写成有 pip').toEqual({ mana: 4 })
  })
})

describe('🔴🔴🔴★★★★★★614 时机:「在**你的**开始阶段开始时」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】`startPhase` **不带主角** ⇒ 判的是**事件玩家**是不是我', () => {
                                                               
    const s = scene([raider(), rune('foe0', P2)])                       
    expect(trig().filter?.(startPhase(P1), s) ?? true, '★我的开始阶段').toBe(true)
    expect(trig().filter?.(startPhase(P2), s) ?? true, '★★★对手的开始阶段不该响').toBe(false)
  })

  test('🔴🔴★★★★★★§383.2.c:`activeZone` 限在场地上(我离场之后不该再响)', () => {
    expect(trig().activeZone).toEqual(['battlefield', 'base'])
  })
})

describe('🔴🔴🔴★★★★★★614 条件:「符文数量**少于****任一**对手」', () => {
  test('🔴🔴🔴★★★★★★【真判据·两个方向都推】少 1 成立、**持平不成立**(㉙ 严格小于)', () => {
    const behind = scene([raider(), ...runes(1, P1, 'm'), ...runes(2, P2, 'f')])
    expect(runeCountOf(behind, P1)).toBe(1)
    expect(runeCountOf(behind, P2)).toBe(2)
    expect(oasisBehind(behind, P1), '★1 < 2 ⇒ 成立').toBe(true)
    const tied = scene([raider(), ...runes(2, P1, 'm'), ...runes(2, P2, 'f')])
    expect(oasisBehind(tied, P1), '★★★持平 ⇒ **不**成立(写成 <= 这条当场红)').toBe(false)
    const ahead = scene([raider(), ...runes(3, P1, 'm'), ...runes(2, P2, 'f')])
    expect(oasisBehind(ahead, P1), '★我更多 ⇒ 不成立').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**任一**对手」= `some` 不是 `every`(多人局)', () => {
    const P3 = asPlayerId('P3')
                                                    
    const s = scene([raider(), ...runes(2, P1, 'm'), ...runes(1, P2, 'f'), ...runes(5, P3, 'g')],
      [P1, P2, P3])
    expect(oasisBehind(s, P1), '★★★写成 every 这条当场红(P2 那边不成立)').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】判据方向:是**我少**不是**我多**', () => {
    const ahead = scene([raider(), ...runes(5, P1, 'm'), ...runes(1, P2, 'f')])
    expect(oasisBehind(ahead, P1), '★★★把 `mine < his` 写反这条当场红').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案·场景要造到位】只数**符文物件**、只数**基地里的**;非符文/别人的不算', () => {
                                                          
                                        
                                                       
    const s = scene([raider(), ...runes(2, P1, 'm'),
      { ...raider(`base:${P1}`), oid: asObjId('atBase') } as GameObject])
    expect(runeCountOf(s, P1), '★★★基地里那名【单位】不是符文,不该被数进去').toBe(2)
    expect(runeCountOf(s, P2)).toBe(0)
                                      
    const notFielded = scene([raider(), rune('inDeck', P1, `runeDeck:${P1}`)])
    expect(runeCountOf(notFielded, P1), '★★★没召出的不算').toBe(0)
  })

  test('🔴🔴🔴★★★★★★【会换答案·端到端】条件不成立 ⇒ **连触发都不响**', () => {
    const tied = scene([raider(), ...runes(2, P1, 'm'), ...runes(2, P2, 'f')])
    expect(trig().filter?.(startPhase(P1), tied) ?? true, '★★★§383.2.a.1 附加条件触发时判').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★614 效果:「本回合内{S}+2 和{游走}」', () => {
  test('🔴🔴🔴★★★★★★【真结算】发**两条**:战力 +2 与授予[游走],都 `thisTurn`', () => {
    expect(VEN_006_BONUS).toBe(2)
    expect(VEN_006_GRANT).toBe('游走')
    const s = scene([raider(), rune('foe0', P2)])
    const evs = trig().effect(s, startPhase(P1), {}) as readonly GameEvent[]
    expect(evs.length, '★★★两条都要发(漏一条就是半张卡)').toBe(2)
    expect(kinds(evs)).toEqual(['addEffect', 'addEffect'])
    const durations = evs.map((e) => (e as unknown as { effect: { duration: string } }).effect.duration)
    expect(durations, '★★★「**本回合内**」——两条都不是永久').toEqual(['thisTurn', 'thisTurn'])
    const dump = JSON.stringify(evs)
    expect(dump, '★打在我自己身上').toContain(SELF)
    expect(dump, '★★★授予的是[游走]').toContain('游走')
  })
})
