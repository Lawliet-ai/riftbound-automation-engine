import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { OGN_027_NTH } from '../../data/cards/longtail-37'

                                                                
                                                                         
                                                                               
                                                       
                                                                                         
                                                           
                                                                
                              
                                                                     
                                                                  
                                                           
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

function scene(objs: readonly GameObject[], ledgers: Partial<GameState> = {}): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of objs) put(o)
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) put(obj(`deck_${p}_${k}`, 'BLK', p, `mainDeck:${p}`))
  return { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { ...s.runePools, [P1]: { mana: 9, runes: {} }, [P2]: { mana: 0, runes: {} } },
    ...ledgers } as unknown as GameState
}

                                                        
function spawnOneSprite(g: InteractiveGame): void {
  const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE'
    && (a as { ability?: string }).ability === 'UNL-189:sprite'
    && (a as { target?: string }).target === BF0)
  expect(act, '★前提:含羞蓓蕾能把精灵造到 BF0').toBeDefined()
  g.apply(act as never)
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'choice') {
      const req = (p as unknown as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key,
        answer: req.key.startsWith('__mayChoose__') ? 'yes' : req.candidates[0]!.id } as never)
    } else if (p.mode === 'window') {
      g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never)
    } else break
  }
}
const bloom = (): GameObject => obj('bloom', 'UNL-189', P1, `legend:${P1}`, { baseTypes: ['legend'] as never, baseMight: 0 })
const dormantOf = (g: InteractiveGame, oid: string): unknown => g.state.objects[asObjId(oid)]?.status?.dormant
                                                                                
                                                                          
                                
const pumpsOn = (g: InteractiveGame, id: string): number =>
  g.state.continuousEffects.filter((e) => String((e as { id?: string }).id ?? '').startsWith(id)).length

describe('★★★★★★★ ★1262 缺陷 161:卡文说「一张【牌】」的那族不该被【指示物】触发(§185.1)', () => {
  test('🔴★★★★★①德莱厄斯 OGN-027「每当你在回合中打出第二张牌时」—— 造一枚精灵不该让它 +2 且变活跃', () => {
    const g = new InteractiveGame(scene([
      bloom(),
      obj('darius', 'OGN-027', P1, BF0, { baseMight: 5, status: { dormant: true } as never }),
    ], { playedCardCountThisTurn: { [P1]: OGN_027_NTH } } as never), DEPS)
    expect(dormantOf(g, 'darius'), '★前提:德莱厄斯开局休眠').toBe(true)
    spawnOneSprite(g)
                                                       
                                                             
    expect.soft(pumpsOn(g, 'OGN-027:'), '★★★指示物不是卡牌 ⇒ 一条 +2 都不该加(§350.2)').toBe(0)
    expect.soft(dormantOf(g, 'darius'), '★★★也不该被叫醒(与 +2 是【两件事】,各断各的)').toBe(true)
  })

                                                         
                                                  
  test('★②对照:账本不在「第二张」那一刻,本来就不该响(证明 ① 不是造景恒红)', () => {
    const g = new InteractiveGame(scene([
      bloom(),
      obj('darius', 'OGN-027', P1, BF0, { baseMight: 5, status: { dormant: true } as never }),
    ], { playedCardCountThisTurn: { [P1]: OGN_027_NTH - 1 } } as never), DEPS)
    spawnOneSprite(g)
    expect(pumpsOn(g, 'OGN-027:'), '★账本=1 ⇒ 不响').toBe(0)
    expect(dormantOf(g, 'darius'), '★仍休眠').toBe(true)
  })

  test('🔴★★★★★③星界灵鹭 VEN-044「当你打出每回合你的首张卡牌时」—— 造一枚精灵不该白拿减费', () => {
    const g = new InteractiveGame(scene([
      bloom(),
      obj('heron', 'VEN-044', P1, BF0, { baseMight: 4 }),
    ], { playedCardCountThisTurn: { [P1]: 1 } } as never), DEPS)
    expect(g.state.nextCardDiscountThisTurn?.[P1], '★前提:开局没有减费').toBeUndefined()
    spawnOneSprite(g)
    expect(g.state.nextCardDiscountThisTurn?.[P1], '★★★指示物不是卡牌 ⇒ 不该拿到「下一张牌减 2」').toBeUndefined()
  })

                                                           
                                                         
                                                                          
                                                              
  const dariusScene = (): InteractiveGame => new InteractiveGame(scene([
    obj('darius', 'OGN-027', P1, BF0, { baseMight: 5, status: { dormant: true } as never }),
    obj('u1', 'UNL-003', P1, `hand:${P1}`), obj('u2', 'UNL-003', P1, `hand:${P1}`),
    obj('s1', 'OGN-004', P1, `hand:${P1}`, { baseTypes: ['spell'] as never }),
    obj('foe', 'U-foe', P2, BF0, { baseMight: 1 }),
  ]), DEPS)
  const drainAll = (g: InteractiveGame): void => {
    for (let i = 0; i < 80; i++) {
      const p = g.pending()
      if (p.mode === 'choice') {
        const req = (p as unknown as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
        const c = req.candidates[0]
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key,
          answer: req.key.startsWith('__mayChoose__') ? 'yes' : (c ? c.id : '__done__') } as never)
      } else if (p.mode === 'window') {
        g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never)
      } else break
    }
  }
  const playFromHand = (g: InteractiveGame, oid: string, kind: 'PLAY_UNIT' | 'PLAY_CARD'): void => {
    const key = kind === 'PLAY_UNIT' ? 'oid' : 'cardOid'
    const a = g.legalActions(P1).find((x) => x.kind === kind && String((x as Record<string, unknown>)[key]) === oid)
    expect(a, `★前提:${kind} ${oid} 可打出`).toBeDefined()
    g.apply(a as never); drainAll(g)
  }
  const dariusPumps = (g: InteractiveGame): number =>
    g.state.continuousEffects.filter((e) => String((e as { id?: string }).id ?? '').startsWith('OGN-027:')).length

  test('🟢★★★★★⑥正路没被砍:第二张打【真单位】⇒ 德莱厄斯 +2 且变活跃', () => {
    const g = dariusScene()
    playFromHand(g, 'u1', 'PLAY_UNIT')
    expect(dariusPumps(g), '★第一张不该响(计数型不是门槛型)').toBe(0)
    playFromHand(g, 'u2', 'PLAY_UNIT')
    expect(dariusPumps(g), '★★★第二张是真单位 ⇒ 恰一条 +2').toBe(1)
    expect(dormantOf(g, 'darius'), '★★★并且变活跃').toBe(false)
    expect(g.state.playedCardCountThisTurn?.[P1], '★账本口径:两张真牌都记账').toBe(2)
  })

  test('🔴★★★★★⑦缺陷 162:第二张打【法术】—— 法术也是牌,同样该 +2 且变活跃', () => {
                                                                  
                                                                           
                                                                         
    const g = dariusScene()
    playFromHand(g, 'u1', 'PLAY_UNIT')
    expect(dariusPumps(g), '★第一张不该响').toBe(0)
    playFromHand(g, 's1', 'PLAY_CARD')
    expect(g.state.playedCardCountThisTurn?.[P1], '★前提:法术也进「打出过几张卡牌」这本账').toBe(2)
    expect(dariusPumps(g), '★★★第二张是法术 ⇒ 恰一条 +2(修前是 0)').toBe(1)
    expect(dormantOf(g, 'darius'), '★★★并且变活跃(修前恒 true)').toBe(false)
  })

  test('🟢★★★★★⑤正路没被砍:打出【真单位】当首张卡牌 ⇒ 星界灵鹭照样给减费', () => {
                                                   
                                               
    const g = new InteractiveGame(scene([
      obj('heron', 'VEN-044', P1, BF0, { baseMight: 4 }),
      obj('hand1', 'UNL-003', P1, `hand:${P1}`),
    ], { playedCardCountThisTurn: { [P1]: 0 } } as never), DEPS)
    const act = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT'
      && String((a as { oid?: string }).oid) === 'hand1')
    expect(act, '★前提:鲛人能从手牌打出').toBeDefined()
    g.apply(act as never)
    for (let i = 0; i < 60; i++) {
      const p = g.pending()
      if (p.mode === 'choice') {
        const req = (p as unknown as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key,
          answer: req.key.startsWith('__mayChoose__') ? 'yes' : req.candidates[0]!.id } as never)
      } else if (p.mode === 'window') {
        g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never)
      } else break
    }
    expect(g.state.playedCardCountThisTurn?.[P1], '★前提:真牌【会】进账本(指示物不进 —— 这正是两者的分野)').toBe(1)
    expect(g.state.nextCardDiscountThisTurn?.[P1], '★★★真卡牌照样触发减费(守卫没有误伤正路)').toBe(1)
  })

  test('★④对照:账本不在「首张」那一刻,本来就不该响', () => {
    const g = new InteractiveGame(scene([
      bloom(),
      obj('heron', 'VEN-044', P1, BF0, { baseMight: 4 }),
    ], { playedCardCountThisTurn: { [P1]: 2 } } as never), DEPS)
    spawnOneSprite(g)
    expect(g.state.nextCardDiscountThisTurn?.[P1], '★账本=2 ⇒ 不响').toBeUndefined()
  })
})
