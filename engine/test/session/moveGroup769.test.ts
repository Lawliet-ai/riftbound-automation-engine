import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind } from '../../data/registry'

                                         
  
                                           
                                         
  
                                                    
                                                   
                                                
                                            
                               
                            
                                                          
                                                 
                            
                                       
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind }

function obj(id: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra } as GameObject
}
function scene(extra: GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
}
const zoneOf = (g: InteractiveGame, oid: string): string => g.state.objects[oid as never]!.zone as string
const dormant = (g: InteractiveGame, oid: string): boolean => g.state.objects[oid as never]!.status.dormant === true

describe('🔴★★★★★★ §144.3 一次行动移多个:是缺功能不是行为错', () => {
  test('🔴★★★【问题复现】单点 MOVE 一个一个来:第一个进敌场就开战,§144.1.c 之后动不了第二个', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`), obj('b', P1, `base:${P1}`),
      obj('foe', P2, BF0),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'a', to: BF0 })
                      
    expect(zoneOf(g, 'a')).toBe(BF0)
    expect(zoneOf(g, 'b')).toBe(`base:${P1}`)
    const stillMovable = (g.legalActions(P1) as InteractiveAction[])
      .filter((x) => x.kind === 'MOVE' && (x as { oid: string }).oid === 'b')
    expect(stillMovable.length, '★这就是委托人撞的墙:开战后 b 再也加不进来(§144.1.c)').toBe(0)
                    
    g.apply({ kind: 'MOVE', player: P1, oid: 'b', to: BF0 })
    expect(zoneOf(g, 'b'), '硬发照样被拒').toBe(`base:${P1}`)
  })

  test('🔴★★★★★★ MOVE_GROUP:基地两名一起进同一战场,全部到位 + 全部休眠(§144.3/§144.3.c)', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`), obj('b', P1, `base:${P1}`),
      obj('foe', P2, BF0),
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'b'], to: BF0 })
    expect(zoneOf(g, 'a')).toBe(BF0)
    expect(zoneOf(g, 'b'), '★两名都进去了').toBe(BF0)
    expect(dormant(g, 'a') && dormant(g, 'b'), '§144.3.c 休眠费用同时付').toBe(true)
  })

  test('🔴★★★★★ 起点不必一致(§144.3.b):基地一名 + 别处战场一名([游走])一起来', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`),
      obj('r', P1, BF1, { baseKeywords: ['游走'] }), // §810.1.b 战场→战场要[游走]
      obj('foe', P2, BF0),
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'r'], to: BF0 })
    expect([zoneOf(g, 'a'), zoneOf(g, 'r')]).toEqual([BF0, BF0])
  })

  test('🔴★★★★★ 战力真的一起算:两名 2[M] 进攻 = 进攻方 4 战力(证明是"一起打"不是"逐个打")', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`), obj('b', P1, `base:${P1}`),
      obj('foe', P2, BF0, { baseMight: 3 }),
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'b'], to: BF0 })
    for (let i = 0; i < 30; i++) {
      const p = g.pending()
      if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player })
      else if (p.mode === 'choice') {
        const req = (p as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: req.candidates[0]!.id })
      } else break
    }
                                  
    expect(g.state.objects['foe' as never], '★4 > 3:防守方被清掉').toBeUndefined()
  })
})

describe('★ 全体判据:一个不合法整条作废(§203.3 不得部分执行)', () => {
  test('其中一名已休眠(§144.2 付不起)⇒ 谁都不动', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`), obj('b', P1, `base:${P1}`, { status: { dormant: true } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'b'], to: BF0 })
    expect([zoneOf(g, 'a'), zoneOf(g, 'b')], '★一个都没动').toEqual([`base:${P1}`, `base:${P1}`])
  })

  test('其中一名终点非法(战场→战场无[游走],§810.1.b)⇒ 谁都不动', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`), obj('n', P1, BF1), // n 没有[游走]
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'n'], to: BF0 })
    expect([zoneOf(g, 'a'), zoneOf(g, 'n')]).toEqual([`base:${P1}`, BF1])
  })

  test('其中一名是对手的单位 ⇒ 整条作废(不许替对手移动)', () => {
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`), obj('foe', P2, `base:${P2}`),
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'foe'], to: BF0 })
    expect([zoneOf(g, 'a'), zoneOf(g, 'foe')]).toEqual([`base:${P1}`, `base:${P2}`])
  })

  test('§144.1.b 闭环期间整条不可用', () => {
    const s = scene([obj('a', P1, `base:${P1}`), obj('b', P1, `base:${P1}`)])
    const closed: GameState = { ...s, chain: [{ id: 'x', controller: P2, kind: 'spell', status: 'confirmed', resolve: () => [] } as unknown as GameState['chain'][number]] }
    const g = new InteractiveGame(closed, DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'b'], to: BF0 })
    expect([zoneOf(g, 'a'), zoneOf(g, 'b')]).toEqual([`base:${P1}`, `base:${P1}`])
  })

  test('重复 oid 去重,不会被收两次休眠费/发两条移动信号', () => {
    const g = new InteractiveGame(scene([obj('a', P1, `base:${P1}`)]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'a'], to: BF0 })
    expect(zoneOf(g, 'a')).toBe(BF0)
    expect(g.state.zones[BF0 as never]!.contents.filter((x) => (x as string) === 'a').length, '★只进去一次').toBe(1)
  })

  test('n=1 与老的单点 MOVE 等价(同一条实现)', () => {
    const one = new InteractiveGame(scene([obj('a', P1, `base:${P1}`)]), DEPS)
    one.apply({ kind: 'MOVE', player: P1, oid: 'a', to: BF0 })
    const grp = new InteractiveGame(scene([obj('a', P1, `base:${P1}`)]), DEPS)
    grp.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a'], to: BF0 })
    expect(zoneOf(grp, 'a')).toBe(zoneOf(one, 'a'))
    expect(dormant(grp, 'a')).toBe(dormant(one, 'a'))
  })
})

describe('★ 移动触发照常:多名一起移,每名各触发一次(§370.2 逐事件)', () => {
  test('两名"每当我移动时抽一张牌"(SFD-048)一起移 ⇒ 抽两张', () => {
    const deck = Array.from({ length: 6 }, (_, i) => obj(`d${i}`, P1, `mainDeck:${P1}`, { defId: 'BLK', baseTypes: ['spell'] as never }))
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`, { defId: 'SFD-048' }),
      obj('b', P1, `base:${P1}`, { defId: 'SFD-048' }),
      ...deck,
    ]), DEPS)
    const before = g.state.zones[`hand:${P1}` as never]!.contents.length
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'b'], to: BF0 })
    for (let i = 0; i < 30; i++) {
      const p = g.pending()
      if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player })
      else if (p.mode === 'choice') {
        const req = (p as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: req.candidates[0]!.id })
      } else break
    }
    expect(g.state.zones[`hand:${P1}` as never]!.contents.length - before, '★两条移动触发各响一次').toBe(2)
  })

  test('🔴★★★★★【一次行动=同时事件】两条移动触发【同批】入链(§370.2),不是移一个结算一个', () => {
    const deck = Array.from({ length: 6 }, (_, i) => obj(`d${i}`, P1, `mainDeck:${P1}`, { defId: 'BLK', baseTypes: ['spell'] as never }))
    const g = new InteractiveGame(scene([
      obj('a', P1, `base:${P1}`, { defId: 'SFD-048' }),
      obj('b', P1, `base:${P1}`, { defId: 'SFD-048' }),
      ...deck,
    ]), DEPS)
    g.apply({ kind: 'MOVE_GROUP', player: P1, oids: ['a', 'b'], to: BF0 })
    const p = g.pending()
    expect(p.mode, '移动触发入链 ⇒ 停在反应窗口').toBe('window')
    expect((p as { chainDepth: number }).chainDepth,
      '★两名的移动触发都进了链(=2)才停窗口 —— 只移了一个 / 漏发一条信号时这里是 1').toBe(2)
  })
})
