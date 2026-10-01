import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardCost, cardKind, activeTriggers } from '../../data/registry'
import {
  OGN_200, OGN_200_CARD_EFFECT, OGN_200_RED_MAIN, OGN_200_RED_SPLASH,
  OGN_200_RED_KEY, OGN_200_YELLOW_KEY,
  makeTwistedFateTrigger, runeDeckTop, runeColorOf, redCandidates, yellowCandidates,
} from '../../data/cards/OGN-200'
import { VOID_SPROUT_KEY } from '../../data/cards/SFD-018'
import { gigalithRevealedHook } from '../../data/cards/SFD-175'

                                                          
                                                 
                                              
               
                    
  
                             
                                                                
                                                   
                                                                       
                                      
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('tf')

type T = {
  filter?: (ev: GameEvent, state: GameState) => boolean
  nextChoice?: (state: GameState, ev: GameEvent, chosen: Record<string, string>) =>
    { key: string; candidates: readonly { id: string }[] } | null
  effect: (state: GameState, ev: GameEvent, chosen?: Record<string, string>) => readonly GameEvent[]
}
const trig = () => makeTwistedFateTrigger(SELF, P1) as unknown as T
                                                            
const atkEv = (bf?: string, u = 'tf'): GameEvent =>
  ({ kind: 'attack', unit: asObjId(u), player: P1, ...(bf === undefined ? {} : { battlefield: bf }) } as unknown as GameEvent)

function unit(oid: string, ctrl: typeof P1, zone: string): GameObject {
  return {
    oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 9, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}
function rune(oid: string, color: string, owner: typeof P1): GameObject {
  return {
    oid: asObjId(oid), defId: `rune:${color}`, owner, controller: owner,
    zone: asZoneId(`runeDeck:${owner}`), baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}

                                     
function scene(objs: readonly GameObject[], deck: readonly GameObject[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, ...deck]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const me = { ...unit('tf', P1, BF0), oid: SELF, defId: 'OGN-200' } as GameObject
  objects[SELF] = me
  const bf = zones[me.zone]
  if (bf) zones[me.zone] = { ...bf, contents: [...bf.contents, SELF] }
  return { ...base, activePlayer: P1, phase: 'combat', objects, zones } as unknown as GameState
}

const run = (s: GameState, chosen?: Record<string, string>) => trig().effect(s, atkEv(BF0), chosen)
                                                                               
const runNoBf = (s: GameState, chosen?: Record<string, string>) => trig().effect(s, atkEv(), chosen)
const hits = (evs: readonly GameEvent[]): [string, number][] =>
  evs.filter((e) => e.kind === 'damage')
    .map((e) => [(e as { target: string }).target, (e as { amount: number }).amount])
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => e.kind)

describe('★ 前提:卡面与接线', () => {
  test('★4费 0pip 紫 4战力单位,不印关键词', () => {
    expect(CARD_COSTS['OGN-200'], '★0 pip').toEqual({ mana: 4, pips: 0, colors: ['purple'] })
    expect(cardKind('OGN-200')).toBe('unit')
    expect(cardCost('OGN-200'), '★进了 UNIT_COST').toEqual({ mana: 4 })
    expect([OGN_200.energy, OGN_200.power]).toEqual([4, 4])
    expect(cardKeywords('OGN-200'), '★卡面没有关键词横幅').toEqual([])
  })

  test('★卡文逐字 + 两级数额的字面量(㊶)', () => {
    expect(OGN_200_CARD_EFFECT).toContain('展示你符文牌堆顶部的一张牌，然后将其回收')
    expect(OGN_200_CARD_EFFECT).toContain('并对此处所有其他敌方单位造成1点伤害')
    expect([OGN_200_RED_MAIN, OGN_200_RED_SPLASH], '★红支 2 / 1').toEqual([2, 1])
  })

  test('🔴★★★★接线:触发工厂进了 TRIGGER_FACTORIES(不接就一辈子不响)', () => {
    const s = scene([], [rune('r1', 'red', P1)])
    const mine = activeTriggers(s).filter((t) => (t as unknown as { sourceDefId?: string }).sourceDefId === 'OGN-200')
    expect(mine.length, '★场上这张崔斯特有它那条进攻触发').toBe(1)
  })
})

describe('🔴★★★★★读符文:顶部是【尾】、特性就是颜色', () => {
  test('🔴★★★★★牌堆【尾 = 顶】(⑪;取错端就永远读到最底那张)', () => {
    const s = scene([], [rune('bottom', 'blue', P1), rune('top', 'red', P1)])
    expect(runeDeckTop(s, P1), '★★★后 push 的那张才是顶').toBe('top')
    expect(runeColorOf(s, runeDeckTop(s, P1))).toBe('red')
  })

  test('★空符文牌堆 ⇒ 读不出来,一件事都不做', () => {
    const s = scene([unit('foe', P2, BF0)])
    expect(runeDeckTop(s, P1)).toBeUndefined()
    expect(run(s), '★连展示都发不出来').toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★三支各走各的', () => {
  test('🔴★★★★★★红支:主目标 2 点 + 此处其他敌方各 1 点', () => {
    const s = scene([unit('foe1', P2, BF0), unit('foe2', P2, BF0)], [rune('r', 'red', P1)])
    const evs = run(s, { [OGN_200_RED_KEY]: 'foe1' })
    expect(kinds(evs).slice(0, 2), '★展示与回收排在最前(卡文先后即结算顺序)').toEqual(['revealed', 'recycle'])
    expect(hits(evs), '★★★两级数额').toEqual([['foe1', 2], ['foe2', 1]])
  })

  test('🔴★★★★★★蓝支:抽一张,不打人', () => {
    const s = scene([unit('foe1', P2, BF0)], [rune('r', 'blue', P1)])
    const evs = run(s)
    expect(kinds(evs)).toEqual(['revealed', 'recycle', 'draw'])
    expect(hits(evs), '★一点伤害都没有').toEqual([])
  })

  test('🔴★★★★★★黄支:眩晕选中的那个,不打人不抽牌', () => {
    const s = scene([unit('foe1', P2, BF0)], [rune('r', 'yellow', P1)])
    const evs = run(s, { [OGN_200_YELLOW_KEY]: 'foe1' })
    expect(kinds(evs)).toEqual(['revealed', 'recycle', 'stun'])
    expect((evs[2] as { target: string }).target).toBe('foe1')
  })

  test('🔴🔴★★★★★★【三色之外一支都不走】(符文有六色,卡文只列了三色)', () => {
    for (const color of ['green', 'orange', 'purple']) {
      const s = scene([unit('foe1', P2, BF0)], [rune('r', color, P1)])
      expect(kinds(run(s, { [OGN_200_RED_KEY]: 'foe1', [OGN_200_YELLOW_KEY]: 'foe1' })),
        `★★★${color} 只有展示与回收`).toEqual(['revealed', 'recycle'])
    }
  })
})

describe('🔴🔴★★★★★★红支与黄支的候选口【不一样】', () => {
  const board = (color: string) => scene(
    [unit('here', P2, BF0), unit('far', P2, BF1), unit('atBase', P2, `base:${P2}`), unit('mine', P1, BF0)],
    [rune('r', color, P1)],
  )

  test('🔴★★★★★★红支「此处」:别处的、基地里的、我自己的都不是候选', () => {
    expect(redCandidates(board('red'), P1, BF0), '★★★只有同处的敌方').toEqual(['here'])
  })

  test('🔴★★★★★★黄支「一名敌方单位」没有位置词 ⇒ 含基地、含别处(⑳)', () => {
    expect(yellowCandidates(board('yellow'), P1), '★★★三个敌方都能选,我的不算')
      .toEqual(['atBase', 'far', 'here'])
  })

  test('🔴★★★★★问链按颜色分岔:红问红那个 key、黄问黄那个', () => {
    const red = trig().nextChoice!(board('red'), atkEv(BF0), {})
    expect(red!.key).toBe(OGN_200_RED_KEY)
    expect(red!.candidates.map((c) => c.id), '★红只列此处的').toEqual(['here'])
    const yellow = trig().nextChoice!(board('yellow'), atkEv(BF0), {})
    expect(yellow!.key).toBe(OGN_200_YELLOW_KEY)
    expect(yellow!.candidates.length, '★黄列全场敌方').toBe(3)
  })

  test('🔴★★★★蓝支与三色之外不问(§355.17);答过了也不再问(⑰)', () => {
    expect(trig().nextChoice!(board('blue'), atkEv(BF0), {}), '★蓝支不选目标').toBeNull()
    expect(trig().nextChoice!(board('green'), atkEv(BF0), {}), '★绿支没这一支').toBeNull()
    expect(trig().nextChoice!(board('red'), atkEv(BF0), { [OGN_200_RED_KEY]: 'here' }), '★答过就别再问').toBeNull()
  })
})

                                              
                                                                       
                                               
describe('🔴★★★★★「此处」= 【结算这一刻我所在的】那一处(化神FAQ §359.3.f)', () => {
                                       
  const selfTo = (s: GameState, zone: string): GameState => ({
    ...s,
    objects: { ...s.objects, [SELF]: { ...s.objects[SELF]!, zone: asZoneId(zone) } },
  } as GameState)

  test('🔴🔴🔴★★★★★★【B1 核心分辨】事件说 BF1、我人在 BF0 ⇒ 按【我在的】BF0 算', () => {
                                               
    const s = scene([unit('atBf0', P2, BF0), unit('atBf1', P2, BF1)], [rune('r', 'red', P1)])
    const q = trig().nextChoice!(s, atkEv(BF1), {})
    expect(q?.candidates.map((c) => c.id), '★★★按我此刻的 zone').toEqual(['atBf0'])
  })

  test('🔴🔴★★★★★★我【回了基地】⇒ 红支一点都不发(事件带着战场也不算数)', () => {
    const s = selfTo(scene([unit('foe1', P2, BF0)], [rune('r', 'red', P1)]), `base:${P1}`)
    expect(hits(run(s, { [OGN_200_RED_KEY]: 'foe1' })), '★★★不在战场上 ⇒ 忽略与战场相关的指示').toEqual([])
    expect(trig().nextChoice!(s, atkEv(BF0), {}), '★问链也问不出来').toBeNull()
  })

  test('🔴★★★★★事件没带战场也照样能算(判据早就不是它了)', () => {
                                                  
    const s = scene([unit('foe1', P2, BF0)], [rune('r', 'red', P1)])            
    expect(trig().nextChoice!(s, atkEv(undefined), {})?.candidates.map((c) => c.id)).toEqual(['foe1'])
  })

  test('🔴★★★★redCandidates 本身:给它哪一处就按哪一处筛(共用件语义未变)', () => {
    const s = scene([unit('atBf0', P2, BF0), unit('atBf1', P2, BF1)], [rune('r', 'red', P1)])
    expect(redCandidates(s, P1, BF1), '★这一层只管按给定的 here 筛;是谁给的由调用方决定').toEqual(['atBf1'])
  })
})

describe('🔴★★★★结算侧要再筛一次(㉖)', () => {
  test('🔴★★★★选完到结算之间目标挪走了 ⇒ 红支一点都不发', () => {
    const s = scene([unit('foe1', P2, BF1)], [rune('r', 'red', P1)])                  
    expect(hits(run(s, { [OGN_200_RED_KEY]: 'foe1' }))).toEqual([])
  })

  test('🔴★★★★黄支同理:目标变成我的了就不眩晕', () => {
    const s = scene([unit('foe1', P1, BF0)], [rune('r', 'yellow', P1)])
    expect(kinds(run(s, { [OGN_200_YELLOW_KEY]: 'foe1' }))).toEqual(['revealed', 'recycle'])
  })
})

describe('🔴🔴★★★★★★符文展示【不会】喂到垓兽(闸的前提被打破后的实测)', () => {
                                                       
                                              
                                                                    
  test('🔴★★★★★★展示一枚符文,展示者的法力一分不涨', () => {
    const s = scene([], [rune('r', 'red', P1)])
    const top = runeDeckTop(s, P1)!
    const before = s.runePools[P1]?.mana ?? 0
    const after = gigalithRevealedHook(s, { kind: 'revealed', player: P1, cards: [top] } as never)
    expect((after.runePools[P1]?.mana ?? 0) - before, '★★★符文不是垓兽').toBe(0)
  })

  test('🔴★★★★真跑一遍事件:展示 + 回收落地后法力也没变', () => {
    const s = scene([], [rune('r', 'red', P1)])
    const before = s.runePools[P1]?.mana ?? 0
    const { state: after } = applyEvents(s, run(s))
    expect((after.runePools[P1]?.mana ?? 0) - before).toBe(0)
  })
})

describe('🔴★★★★「然后将其回收」真的发生了', () => {
  test('🔴★★★★★回收把那张符文送回符文牌堆的【底】(§416;顶换成下一张)', () => {
    const s = scene([], [rune('bottom', 'blue', P1), rune('top', 'red', P1)])
    const { state: after } = applyEvents(s, run(s, { [OGN_200_RED_KEY]: 'x' }))
    const deck = after.zones[`runeDeck:${P1}` as never] as { contents: readonly string[] }
    expect(deck.contents.length, '★还是两张(§124 跨区换新 oid,按张数认)').toBe(2)
                                
    expect(runeColorOf(after, asObjId(deck.contents[deck.contents.length - 1]!)), '★★★顶换人了').toBe('blue')
  })
})

                                                                          
                                                  
                                                      
                                                            
  
                                                       
                                                         
                 
                                                                          
describe('★866 崔斯特 × 虚空兽苗', () => {
  const sprout = (oid = 'sp'): GameObject =>
    ({ ...unit(oid, P1, `base:${P1}`), defId: 'SFD-018' } as GameObject)

  test('★★★场上有我的兽苗 ⇒ 先问兽苗(展示前看符文堆顶)', () => {
    const s = scene([sprout()], [rune('r', 'red', P1)])
    const q = trig().nextChoice!(s, atkEv(BF0), {})
    expect(q, '★兽苗前置问要排在颜色分支之前').not.toBeNull()
    expect(q!.key).toBe(VOID_SPROUT_KEY)
    expect(q!.candidates.map((c) => c.id).sort()).toEqual(['keep', 'recycle'])
  })

  test('★★★★答「回收」⇒ 只剩兽苗那笔回收;展示/回收/红支全落空,红支目标也不再问', () => {
    const s = scene([sprout(), unit('foe1', P2, BF0)], [rune('r', 'red', P1)])
    expect(trig().nextChoice!(s, atkEv(BF0), { [VOID_SPROUT_KEY]: 'recycle' }),
      '★唯一那张将被收走 ⇒ 不该再问红支目标').toBeNull()
    const evs = run(s, { [VOID_SPROUT_KEY]: 'recycle' })
    expect(kinds(evs), '★只有兽苗的 recycle,没有 revealed/分支').toEqual(['recycle'])
    expect((evs[0] as unknown as { objs: string[] }).objs).toEqual(['r'])
  })

  test('★★★答「保留」⇒ 行为与没有兽苗时一字不差(红支照走)', () => {
    const s = scene([sprout(), unit('foe1', P2, BF0)], [rune('r', 'red', P1)])
    const evs = run(s, { [VOID_SPROUT_KEY]: 'keep', [OGN_200_RED_KEY]: 'foe1' })
    expect(kinds(evs).slice(0, 2)).toEqual(['revealed', 'recycle'])
    expect(hits(evs)).toEqual([['foe1', 2]])
  })

  test('★★★对照组:场上没兽苗 ⇒ 不问兽苗、行为原样(接线不是常开的)', () => {
    const s = scene([unit('foe1', P2, BF0)], [rune('r', 'blue', P1)])
    const q = trig().nextChoice!(s, atkEv(BF0), {})
    expect(q, '★蓝支本来就不问,兽苗也不该冒出来').toBeNull()
    expect(kinds(run(s))).toEqual(['revealed', 'recycle', 'draw'])
  })

  test('★★对手的兽苗管不着我(「当【你】要展示」= 展示者自己的兽苗)', () => {
    const s = scene([{ ...unit('foeSp', P2, `base:${P2}`), defId: 'SFD-018' } as GameObject],
      [rune('r', 'blue', P1)])
    expect(trig().nextChoice!(s, atkEv(BF0), {})).toBeNull()
  })
})
