import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, cardCost, cardKeywords, cardKind, handPlaySpecs, playSpecFor } from '../../data/registry'
import { canPayFromState, seedRunes } from '../../src/game/economy'
import { confirmedCountThisTurn } from '../../src/keywords/rally'
import type { CostMod } from '../../src/game/costPipeline'

                                                      
  
                                                             
                                                                               
                                                  
                                                
  
                                                       
                                                       
                                                      
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const AMBUSH = 'UNL-149'                               
const GEAR = 'SFD-022'                               

                                         
const discountFor = (defId: string, mana: number) =>
  (_s: GameState, _p: typeof P1, d: string): readonly CostMod[] =>
    d === defId ? [{ kind: 'reduce', part: 'mana', mana, floor: 0, source: 'TEST-桩减费' }] : []

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, types: GameObject['baseTypes'] = ['unit']): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  }
}

                                                             
function scene(card: GameObject, runeColor: string, runes: number): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of [card, obj('mine', 'BLK', P1, BF0), obj('bolt', 'DEMO-BOLT', P2, `hand:${P2}`)]) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P2, priority: null, phase: 'main', objects, zones }
  s = seedRunes(s, P1, runeColor, runes)
  return seedRunes(s, P2, 'blue', 6)
}

function depsWith(mods?: InteractiveDeps['costModsFor']): InteractiveDeps {
  return { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, playSpecFor, cardKind, cardCost, costModsFor: mods }
}

                                 
function windowForP1(s: GameState, deps: InteractiveDeps): InteractiveGame {
  const g = new InteractiveGame(s, deps)
  g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!)
  g.apply({ kind: 'PASS', player: P2 })
  return g
}
const playOf = (g: InteractiveGame, oid: string) =>
  g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === oid)

describe('★ 前提:两张牌的费用与关键词照卡面实测取', () => {
  test('伏击单位与灵便装备的印刷费用', () => {
    expect(cardCost(AMBUSH)).toEqual({ mana: 4, pips: [['purple']] })
    expect(cardKeywords(AMBUSH)).toContain('伏击')
    expect(cardCost(GEAR)).toEqual({ mana: 2, pips: [['red']] })
    expect(cardKeywords(GEAR)).toContain('灵便')
    expect(cardKind(GEAR)).toBe('equipment')
  })

  test('★★资源恰好卡在两种口径之间(㉚ 读判据实际读的那张表)', () => {
                                                  
    const s = scene(obj('h0', AMBUSH, P1, `hand:${P1}`), 'purple', 2)
    expect(canPayFromState(s, P1, { mana: 1, pips: [['purple']] })).toBe(true)
    expect(canPayFromState(s, P1, cardCost(AMBUSH))).toBe(false)
  })
})

describe('★★ §822 伏击:窗口里列得出来,就必须点得下去(铁律101/㉟)', () => {
  const mods = discountFor(AMBUSH, 3)             

  test('★★★有减费时:枚举列了它 ⇒ apply 之后它真的进场了', () => {
    const g = windowForP1(scene(obj('h0', AMBUSH, P1, `hand:${P1}`), 'purple', 2), depsWith(mods))
    const act = playOf(g, 'h0')
    expect(act).toBeDefined()                                  
    g.apply(act!)
                                                            
    expect(g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]?.defId)).toContain(AMBUSH)
  })

  test('★★没有减费时:枚举根本不该列它(对照组⑫ —— 证明费用真的卡着这条路)', () => {
    const g = windowForP1(scene(obj('h0', AMBUSH, P1, `hand:${P1}`), 'purple', 2), depsWith())
    expect(playOf(g, 'h0')).toBeUndefined()
  })

  test('★★★付的是【折后价】,不是白送(㉛ 不许白嫖)', () => {
                                               
                                                     
                                                   
    const runesInBase = (g: InteractiveGame): number =>
      (g.state.zones[`base:${P1}`]?.contents ?? []).filter((o) => g.state.objects[o]?.defId.startsWith('rune:')).length
    const g = windowForP1(scene(obj('h0', AMBUSH, P1, `hand:${P1}`), 'purple', 2), depsWith(mods))
    expect(runesInBase(g)).toBe(2)      
    g.apply(playOf(g, 'h0')!)
    expect(runesInBase(g)).toBe(1)                                
  })
})

describe('★★ §819 灵便装备:同一条洞,另一条枚举', () => {
  const mods = discountFor(GEAR, 2)             

  test('★★★有减费时列了它,apply 之后它真的进了基地(§149.2)', () => {
    const card = { ...obj('h0', GEAR, P1, `hand:${P1}`), baseTypes: ['equipment'] as const }
    const g = windowForP1(scene(card, 'red', 1), depsWith(mods))
    const act = playOf(g, 'h0')
    expect(act).toBeDefined()
    g.apply(act!)
    expect((g.state.zones[`hand:${P1}`]?.contents ?? []).map(String)).not.toContain('h0')
  })

  test('★★没有减费时枚举不列它(对照组)', () => {
    const card = { ...obj('h0', GEAR, P1, `hand:${P1}`), baseTypes: ['equipment'] as const }
    const g = windowForP1(scene(card, 'red', 1), depsWith())
    expect(playOf(g, 'h0')).toBeUndefined()
  })
})

describe('★★ 落地口径只许有一份:窗口那条从前还漏了两件事(㊼/铁律80)', () => {
                                                       
  const freeDeps: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, playSpecFor, cardKind }
  const ambushed = (): InteractiveGame => {
    const g = windowForP1(scene(obj('h0', AMBUSH, P1, `hand:${P1}`), 'purple', 0), freeDeps)
    g.apply(playOf(g, 'h0')!)
    return g
  }
  const theUnit = (g: InteractiveGame): GameObject =>
    g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]!).find((o) => o.defId === AMBUSH)!

  test('★★★§359.2.c 窗口里打出的单位也【以休眠状态进场】', () => {
                                                
    expect(theUnit(ambushed()).status.dormant).toBe(true)
  })

  test('★★★§812.1.c 窗口里打出也记【确认】账(鼓舞看的就是这本账)', () => {
    const g = ambushed()
    expect(confirmedCountThisTurn(g.state, P1)).toBe(1)          
                                 
    expect(theUnit(g).status.confirmedThisTurn).toBe(true)
  })
})
