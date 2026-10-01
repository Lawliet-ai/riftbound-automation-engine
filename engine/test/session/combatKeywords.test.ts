import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost } from '../../data/registry'
import { seedRunes, canPayFromState } from '../../src/game/economy'
import { effectiveMight } from '../../src/state/might'
import { recomputeContinuous } from '../../src/effects/continuousView'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number, kws: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: kws, damage: 0, counters: {}, status: {} }
}
function scene(objs: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 5; k++) {
    const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  s = seedRunes(s, P1, 'purple', 6)
  s = seedRunes(s, P1, 'blue', 4)
  s = seedRunes(s, P2, 'blue', 6)
  return s
}
function walk(g: InteractiveGame, answers: Record<string, string> = {}): void {
  for (let i = 0; i < 14; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: answers[p.request.key] ?? p.request.candidates[0]!.id })
      continue
    }
    break
  }
}

describe('战斗关键词:坚守§814/壁垒§815/伏击§822', () => {
  test('坚守X 只在防守方身份下加成;§814.2 印刷+获得的坚守相加', () => {
    let s = scene([unit('g', 'UNL-087', P1, BF0, 4, ['坚守2'])])
    s = recomputeContinuous(s)
    expect(effectiveMight(s.objects['g']!).actual).toBe(4)          
            
    s = recomputeContinuous({ ...s, objects: { ...s.objects, g: { ...s.objects['g']!, status: { defending: true } } } })
    expect(effectiveMight(s.objects['g']!).actual).toBe(6)         
                                          
    s = recomputeContinuous({
      ...s,
      continuousEffects: [{ id: 'grant', duration: 'thisTurn', fromPassive: false, predicate: (o) => o.oid === 'g', modification: { kind: 'grantKeyword', keyword: '坚守' }, timestamp: 1 }],
    })
    expect(effectiveMight(s.objects['g']!).actual).toBe(7)
  })

  test('环刃舞者:打出时此处【其他】单位获坚守(自己不获);防守时体现', () => {
    const g = new InteractiveGame(scene([
      unit('bd', 'UNL-071', P1, 'hand:P1', 3, ['伏击']),
      unit('mate', 'BLK', P1, BF0, 2),
    ]), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'bd' && (a as { to: string }).to === BF0)!)
    walk(g)
                             
    const s2 = recomputeContinuous({ ...g.state, objects: { ...g.state.objects, mate: { ...g.state.objects['mate']!, status: { defending: true } } } })
    expect(effectiveMight(s2.objects['mate']!).actual).toBe(3)
  })

  test('壁垒§815:教官先挨刀——3点伤害全打壁垒单位,队友无伤', () => {
                                              
    const g = new InteractiveGame(scene([
      unit('atk', 'BLK', P2, BF0, 3),
      unit('inst', 'OGN-087', P1, BF0, 2, ['壁垒']),
      unit('buddy', 'BLK', P1, BF0, 2),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    walk(g)
                                                                 
    expect(g.state.zones[BF0]!.contents.includes('inst' as never)).toBe(false)
    expect(g.state.zones[BF0]!.contents.includes('buddy' as never)).toBe(true)
  })

  test('伏击§822:反应窗口内把黛安娜打到有己方单位的战场(常规窗口打不了单位)', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-149', P1, 'hand:P1', 3, ['伏击']),
      unit('anchor', 'BLK', P1, BF0, 2), // 己方单位=伏击落点前提
      unit('bolt', 'DEMO-BOLT', P2, 'hand:P2', 0),
    ]), DEPS)
                      
    g.state = { ...g.state, activePlayer: P2 }
    g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!)
    g.apply({ kind: 'PASS', player: P2 })
    const p = g.pending()
    expect(p.mode).toBe('window')
    const ambush = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'diana')
    expect(ambush).toBeDefined()                      
    expect((ambush as { to: string }).to).toBe(BF0)             
    g.apply(ambush!)
    walk(g)
    expect(g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]?.defId)).toContain('UNL-149')
  })

  test('黛安娜·超脱凡界:每打出一个法术本回合+2(两次法术=+4)', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-149', P1, BF0, 3, ['伏击']),
      unit('foe', 'BLK', P2, BF0, 2),
      unit('b1', 'DEMO-BOLT', P1, 'hand:P1', 0),
      unit('b2', 'DEMO-BOLT', P1, 'hand:P1', 0),
    ]), DEPS)
    expect(effectiveMight(g.state.objects['diana']!).actual).toBe(3)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'foe')!)
    walk(g)
    const dianaOid = Object.values(g.state.objects).find((o) => o.defId === 'UNL-149')!.oid
    expect(effectiveMight(g.state.objects[dianaOid]!).actual).toBe(5)       
  })

  test('苍蓝雕纹魔像:据守我处→【下一个主阶段】获得[A](通配符能可付任意pip)', () => {
    const g = new InteractiveGame(scene([unit('golem', 'UNL-087', P2, BF0, 4, ['坚守2'])]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })                       
    walk(g)
                             
    expect(g.state.runePools['P2']!.runes['*']).toBe(1)
                          
    expect(canPayFromState(g.state, P2, { pips: [['blue']] })).toBe(true)
  })
})
