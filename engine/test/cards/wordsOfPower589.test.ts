import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { playSpecFor, cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_DOMAINS } from '../../data/cardDomains'
import { OGN_156_SPEC } from '../../data/cards/OGN-156'
import {
  VEN_085, VEN_085_SPEC, VEN_085_CARD_EFFECT, VEN_085_PICK_KEY, GLIMMER_COLOR, hasGlimmer, glimmerInHand,
} from '../../data/cards/VEN-085'

                                              
                                                        
                                 
  
                                           
                                                            
                                                                    
  
                                                                  
                                                       
                                                             
                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')

                                                                          
const BLUE = 'SFD-087'
const ORANGE = 'OGN-133'
const GREEN_BLUE = 'UNL-190'

const inHand = (oid: string, defId: string, who = P2): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(`hand:${who}`),
  baseMight: 0, baseKeywords: [], baseTypes: [], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(cards: readonly GameObject[], players: readonly ReturnType<typeof asPlayerId>[] = [P1, P2]): GameState {
  const base = createInitialState([...players], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of cards) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  VEN_085_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  VEN_085_SPEC.makeResolve!({ controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]

describe('🔴🔴🔴★★★★★★589 力量箴言:前提与接线', () => {
  test('★前提:法术 1费 **0pip** 橙;卡文一字不差', () => {
    expect(CARD_COSTS['VEN-085'], '★★★0 pip —— 别从卡文那个{{蓝色}}推').toEqual({ mana: 1, pips: 0, colors: ['orange'] })
                                                         
                                                                
                                                              
    expect(cardCost('VEN-085'), '★法术不进 UNIT_COST ⇒ 这里就是 0').toEqual({ mana: 0 })
    expect(VEN_085_SPEC.cost, '★★★法术的真费用在 PlaySpec 里').toEqual({ mana: 1 })
    expect(cardKind('VEN-085')).toBe('spell')
    expect(VEN_085.category).toBe('spell')
    expect(VEN_085_CARD_EFFECT).toBe('选择一名对手。让其展示手牌，你从中选择一张具有灵光（{{蓝色}}）特性的卡牌。让其将该卡牌回收。')
    expect(playSpecFor('VEN-085'), '★★★进了 PLAY_SPECS').toBeDefined()
  })

  test('🔴🔴★★★★★★【§134.2.c】「灵光」就是蓝色;判据只有一处定义', () => {
    expect(GLIMMER_COLOR, '★★★规则原文:灵光的颜色为蓝色').toBe('blue')
  })

  test('★材料前提:三张样本的域是我以为的那样(前提塌了整组恒绿)', () => {
    expect(CARD_DOMAINS[BLUE], '★纯蓝').toEqual(['blue'])
    expect(CARD_DOMAINS[ORANGE], '★橙(不含蓝)').toEqual(['orange'])
    expect(CARD_DOMAINS[GREEN_BLUE], '★★★双色含蓝').toEqual(['green', 'blue'])
  })

  test('🔴🔴🔴★★★★★★【与 OGN-156 的分野】目标轴同、筛选判据不同', () => {
                                          
    expect(VEN_085_SPEC.target, '★都是选【玩家】').toBe('custom')
    expect(OGN_156_SPEC.target).toBe('custom')
    expect(VEN_085_PICK_KEY, '★★★两张的追问键必须不同,否则会串答案').not.toBe('sabotagePick')
  })
})

describe('🔴🔴🔴★★★★★★589 判据:具有灵光(蓝色)特性', () => {
  test('🔴🔴🔴★★★★★★【会换答案·两个方向】蓝算、橙不算', () => {
    expect(hasGlimmer(BLUE), '★纯蓝 ⇒ 算').toBe(true)
    expect(hasGlimmer(ORANGE), '★★★橙 ⇒ 不算').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【双色只要含蓝就算】卡文是「**具有**…特性」,不是「特性只有」', () => {
    expect(hasGlimmer(GREEN_BLUE), '★★★写成 domains[0]===blue 或 length===1 这条会红').toBe(true)
  })

  test('🔴🔴★★★★★★【查不到 = 无特性】不算灵光(那张表不收无色卡)', () => {
    expect(hasGlimmer('NOT-A-CARD')).toBe(false)
  })

  test('🔴🔴🔴★★★★★★【只挑对手手里的】⑩① 让「命中的不是第一个」', () => {
                                       
    const s = scene([inHand('o1', ORANGE), inHand('o2', BLUE)])
    expect(glimmerInHand(s, P2 as string), '★★★橙那张要被筛掉').toEqual([asObjId('o2')])
  })
})

describe('🔴🔴🔴★★★★★★589 追问:我从对手手牌里挑', () => {
  test('🔴🔴🔴★★★★★★【会换答案】对手有蓝卡 ⇒ 问我挑哪张,候选只列蓝的', () => {
    const s = scene([inHand('o1', ORANGE), inHand('o2', BLUE), inHand('o3', GREEN_BLUE)])
    const q = ask(s, P2 as string) as { controller: string; candidates: readonly { id: string }[] } | null
    expect(q, '★★★问得出来').not.toBeNull()
    expect(q!.candidates.map((c) => c.id).sort(), '★★★两张含蓝的都在,橙那张不在').toEqual(['o2', 'o3'])
    expect(q!.controller, '★★★「**你**从中选择」⇒ 问的是我,不是对手').toBe(P1)
  })

  test('🔴🔴🔴★★★★★★【对手手里没蓝卡】⇒ 不问、也不发(卡文没有"否则…"补偿)', () => {
    const s = scene([inHand('o1', ORANGE)])
    expect(ask(s, P2 as string), '★★★没得挑就别问').toBeNull()
    expect(resolve(s, P2 as string, { [VEN_085_PICK_KEY]: 'o1' }), '★★★也别发事件').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【指的不是对手】比如指了我自己 ⇒ 不问', () => {
    const s = scene([inHand('m1', BLUE, P1)])
    expect(ask(s, P1 as string), '★★★「一名**对手**」= 除我以外').toBeNull()
  })

  test('🔴🔴★★★★★★【多人局】三人时两个对手都能选', () => {
    const s = scene([inHand('o1', BLUE, P2), inHand('o2', BLUE, P3)], [P1, P2, P3])
    const cands = VEN_085_SPEC.legalTargets!(s, P1, 'sp' as never) as string[]
    expect(cands.slice().sort(), '★★★两名对手都在').toEqual([P2 as string, P3 as string])
    expect(cands, '★★★我自己不在').not.toContain(P1 as string)
  })

  test('🔴★★★★★★答过一次就不再追问', () => {
    const s = scene([inHand('o1', BLUE)])
    expect(ask(s, P2 as string, { [VEN_085_PICK_KEY]: 'o1' })).toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★589 结算:让【对手】回收那张', () => {
  test('🔴🔴🔴★★★★★★【会换答案·承重】发 `recycle`,`player` 填的是【对手】不是我', () => {
                                                
    const s = scene([inHand('o1', BLUE)])
    const evs = resolve(s, P2 as string, { [VEN_085_PICK_KEY]: 'o1' }) as readonly { kind: string; player?: string; objs?: readonly string[] }[]
    expect(evs.length).toBe(1)
    expect(evs[0]!.kind).toBe('recycle')
    expect(evs[0]!.player, '★★★是对手 P2,不是我 P1').toBe(P2)
    expect(evs[0]!.objs).toEqual([asObjId('o1')])
  })

  test('🔴🔴🔴★★★★★★【不发 `revealed`】hand-reveal 族的口径(§424.1.a;那道闸明写着)', () => {
    const s = scene([inHand('o1', BLUE)])
    const kinds = resolve(s, P2 as string, { [VEN_085_PICK_KEY]: 'o1' }).map((e) => e.kind)
    expect(kinds, '★★★发了会把 gigalith429 那道口径闸撞红').not.toContain('revealed')
  })

  test('🔴🔴🔴★★★★★★【结算期复判】答完之后那张牌已不在他手里 ⇒ 一条都不发', () => {
                                               
                                      
    const s = scene([inHand('other', BLUE)])
    expect(glimmerInHand(s, P2 as string).length, '★前提自证:他手里还有蓝卡 ⇒ 走得到复判').toBe(1)
    expect(resolve(s, P2 as string, { [VEN_085_PICK_KEY]: 'gone' }), '★★★答的那张已经不在').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【端到端】落地后那张真离开对手手牌、进了他的牌堆底(§416)', () => {
                                                             
    const s = scene([inHand('o1', BLUE), inHand('o2', ORANGE)])
    const out = applyEvents(s, resolve(s, P2 as string, { [VEN_085_PICK_KEY]: 'o1' }), {}).state
    const handDefs = (out.zones[asZoneId(`hand:${P2}`)]?.contents ?? []).map((o) => out.objects[o]?.defId)
    expect(handDefs, '★★★蓝那张走了,橙那张还在').toEqual([ORANGE])
    const deckDefs = (out.zones[asZoneId(`mainDeck:${P2}`)]?.contents ?? []).map((o) => out.objects[o]?.defId)
    expect(deckDefs[0], '★★★§416 回收进的是【他自己】牌堆的底').toBe(BLUE)
  })

  test('🔴★★★★★★没指定对手/没挑牌 ⇒ 一条都不发', () => {
    const s = scene([inHand('o1', BLUE)])
    expect(resolve(s, undefined, { [VEN_085_PICK_KEY]: 'o1' })).toEqual([])
    expect(resolve(s, P2 as string, {})).toEqual([])
  })
})
