import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { manaAvailable, payFromState } from '../../src/game/economy'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

const DEPS = { getTriggers: activeTriggers, handPlaySpecs }
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function newGame(seed = 7): InteractiveGame {
  return new InteractiveGame(setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(seed)).state, DEPS)
}

describe('手牌调度 §117(先抽后回收,回收放主牌堆底§416.1.a)', () => {
  test('开局按回合顺序轮流调度;其他行动被门禁', () => {
    const g = newGame()
    expect(g.pending()).toEqual({ mode: 'mulligan', player: P1 })
                         
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.pending().mode).toBe('mulligan')
                 
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
    expect(g.pending()).toEqual({ mode: 'mulligan', player: P1 })

    g.apply({ kind: 'MULLIGAN', player: P1, put: [] })          
    expect(g.pending()).toEqual({ mode: 'mulligan', player: P2 })
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })          
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })            
  })

  test('搁置2张:手牌仍4张、主牌堆总量不变、搁置牌进牌堆底', () => {
    const g = newGame()
    const hand0 = g.state.zones['hand:P1']!.contents
    const deckLen0 = g.state.zones['mainDeck:P1']!.contents.length
    const put = [hand0[0]!, hand0[1]!]
    const putDefs = put.map((o) => g.state.objects[o]!.defId).sort()

    g.apply({ kind: 'MULLIGAN', player: P1, put })
    const hand1 = g.state.zones['hand:P1']!.contents
    const deck1 = g.state.zones['mainDeck:P1']!.contents
    expect(hand1).toHaveLength(4)        
    expect(deck1).toHaveLength(deckLen0)          
                                                   
    const bottomDefs = [deck1[0]!, deck1[1]!].map((o) => g.state.objects[o]!.defId).sort()
    expect(bottomDefs).toEqual(putDefs)
                     
    expect(hand1.some((o) => put.includes(o))).toBe(false)
  })

  test('legalActions 枚举 0-2 张组合;搁置>2 或非手牌被拒', () => {
    const g = newGame()
    const acts = g.legalActions(P1)
                                    
    expect(acts).toHaveLength(11)
    expect(g.legalActions(P2)).toHaveLength(0)       

    const hand = g.state.zones['hand:P1']!.contents
    g.apply({ kind: 'MULLIGAN', player: P1, put: [hand[0]!, hand[1]!, hand[2]!] })        
    expect(g.pending()).toEqual({ mode: 'mulligan', player: P1 })
    g.apply({ kind: 'MULLIGAN', player: P1, put: ['不存在'] })        
    expect(g.pending()).toEqual({ mode: 'mulligan', player: P1 })
  })
})

describe('§485.7 后手额外符文', () => {
  test('后手(P2)首个召出阶段召3枚;此后每回合恢复2枚', () => {
    const g = newGame()
    g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
    expect(manaAvailable(g.state, P1)).toBe(2)           

    g.apply({ kind: 'END_TURN', player: P1 })
    expect(manaAvailable(g.state, P2)).toBe(3)                   

    g.apply({ kind: 'END_TURN', player: P2 })
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(manaAvailable(g.state, P2)).toBe(5)                
  })
})

describe('审查补测:P2先手/随机回收序/视图字段/pip全栈', () => {
  test('startingPlayer=P2:调度顺序 P2 先;§485.7 额外符文归 P1(后手)', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7), P2)
    const g = new InteractiveGame(state, DEPS)
    expect(g.pending()).toEqual({ mode: 'mulligan', player: P2 })                
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
    g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
    expect(g.pending()).toEqual({ mode: 'action', player: P2 })
    expect(manaAvailable(g.state, P2)).toBe(2)         
    g.apply({ kind: 'END_TURN', player: P2 })
    expect(manaAvailable(g.state, P1)).toBe(3)                     
  })

  test('§416.5 两张回收随机序:不同 rng 种子可产生不同底序(且都是搁置的两张)', () => {
    const orders = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(9))
      const g = new InteractiveGame(state, { ...DEPS, rng: makeRng(seed) })
      const hand = g.state.zones['hand:P1']!.contents
      const putDefs = [hand[0]!, hand[1]!].map((o) => g.state.objects[o]!.defId)
      g.apply({ kind: 'MULLIGAN', player: P1, put: [hand[0]!, hand[1]!] })
      const deck = g.state.zones['mainDeck:P1']!.contents
      const bottom2 = [deck[0]!, deck[1]!].map((o) => g.state.objects[o]!.defId)
      expect(bottom2.slice().sort()).toEqual(putDefs.slice().sort())        
      orders.add(bottom2.join('|'))
    }
    expect(orders.size).toBeGreaterThan(1)                       
  })

  test('视图字段:mana/runes 投影只给 viewer 自己;横置后 mana 下降', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(5))
    const g = new InteractiveGame(state, DEPS)
    g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
    const v1 = g.view(P1)
    expect(v1.mana).toBe(2)
    expect(v1.runes).toEqual({ purple: 2 })         
    const v2 = g.view(P2)
    expect(v2.mana).toBe(0)                   
                               
    const pay = payFromState(g.state, P1, { mana: 2 })
    g.state = pay.state
    expect(g.view(P1).mana).toBe(0)
  })

  test('PLAY_UNIT 携 pip 全栈:军事家(2+1蓝pip)蓝域局可打且实扣;紫域局付不起被过滤', () => {
                                  
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(21))
    const g = new InteractiveGame(state, { getTriggers: activeTriggers, handPlaySpecs, cardCost })
    g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
    g.apply({ kind: 'END_TURN', player: P1 })                 
                                
    const s = g.state
    const oid = asObjId(`o${s.nextOid}`)
    const handId = asZoneId('hand:P2')
    const hand = s.zones[handId]!
    g.state = {
      ...s, nextOid: s.nextOid + 1,
      objects: { ...s.objects, [oid]: { oid, defId: 'OGN-121', owner: P2, controller: P2, zone: handId, baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {} } },
      zones: { ...s.zones, [handId]: { ...hand, contents: [...hand.contents, oid] } },
    }
    const act = g.legalActions(P2).find((a) => a.kind === 'PLAY_UNIT' && g.state.objects[(a as { oid: string }).oid]?.defId === 'OGN-121')
    expect(act).toBeDefined()                                          
    expect(manaAvailable(g.state, P2)).toBe(3)
    g.apply(act!)
                                                           
    expect(manaAvailable(g.state, P2)).toBe(1)
    expect(g.state.zones['base:P2']!.contents.filter((o) => g.state.objects[o]?.defId.startsWith('rune:')).length).toBe(2)         
  })
})
