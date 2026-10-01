import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, cardKeywords, cardKind, extraPlayZonesFor, handPlaySpecs, playSpecFor, standbyAltCost } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'

                                      
  
                                                       
                                                 
                                         
                                    
  
                                                
                                            
                                                  
                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF_MINE = 'battlefield:shared:0'
const BF_FOE = 'battlefield:shared:1'
const BF_OPEN = 'battlefield:shared:2'

const DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor,
  cardKind, extraPlayZones: extraPlayZonesFor,
}

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, types: GameObject['baseTypes'] = ['unit']): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  }
}
                                          
function scene(objs: readonly GameObject[]): GameState {
  let s = createInitialState([P1, P2], 3)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  const all = [...objs, obj('mine', 'BLK', P1, BF_MINE), obj('foe', 'BLK', P2, BF_FOE)]
  for (const o of all) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  s = seedRunes(s, P1, 'purple', 4)
  return seedRunes(s, P2, 'blue', 4)
}
const inHand = (defId: string): GameObject => obj('h0', defId, P1, `hand:${P1}`)
                                            
function playedTo(to: string, card = 'BLK', types: GameObject['baseTypes'] = ['unit']): boolean {
  const g = new InteractiveGame(scene([{ ...obj('h0', card, P1, `hand:${P1}`), baseTypes: types }]), DEPS)
  g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'h0', to } as never)
  return (g.state.zones[`hand:${P1}`]?.contents ?? []).length === 0
}

describe('★ 前提:枚举侧的合法落点(§355.2.a)', () => {
  test('普通单位只列 基地 + 我控制的战场', () => {
    const g = new InteractiveGame(scene([inHand('BLK')]), DEPS)
    const dests = g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT').map((a) => (a as { to: string }).to)
    expect(dests.sort()).toEqual([BF_MINE, `base:${P1}`].sort())
  })
})

describe('★★ apply 那道门必须自己校验落点(铁律101)', () => {
  test('★★★打进【对手基地】要被拒', () => {
    expect(playedTo(`base:${P2}`)).toBe(false)
  })

  test('★★★打进【敌方控制的战场】要被拒(§355.2.a 只给我控制的)', () => {
    expect(playedTo(BF_FOE)).toBe(false)
  })

  test('★★★打进【开放的空战场】也要被拒(没人控制 ≠ 我控制)', () => {
    expect(playedTo(BF_OPEN)).toBe(false)
  })

  test('★★★连【非场上区域】都能塞进去 —— 也要被拒', () => {
                                                     
    expect(playedTo(`hand:${P2}`)).toBe(false)
    expect(playedTo(`mainDeck:${P1}`)).toBe(false)
  })

  test('★★对照组:合法的两个落点照样打得出去(㉗ 别拦多了)', () => {
    expect(playedTo(`base:${P1}`)).toBe(true)
    expect(playedTo(BF_MINE)).toBe(true)
  })
})

describe('★★ 校验读的是【同一份判据】,不是又抄了一遍 §355.2.a', () => {
  test('★★★落点加宽的卡:同一处战场,水手打得进、白板打不进', () => {
                                                                  
                                                              
    expect(playedTo(BF_OPEN, 'OGN-176')).toBe(true)
    expect(playedTo(BF_OPEN, 'BLK')).toBe(false)
  })

  test('★★★无畏先锋 SFD-093 打得进敌方控制的战场,白板打不进', () => {
    expect(playedTo(BF_FOE, 'SFD-093')).toBe(true)
    expect(playedTo(BF_FOE, 'BLK')).toBe(false)
  })

  test('★★加宽也不是无限:水手进不了【敌方控制】那处,先锋进不了【开放】那处', () => {
    expect(playedTo(BF_FOE, 'OGN-176')).toBe(false)
    expect(playedTo(BF_OPEN, 'SFD-093')).toBe(false)
  })
})

describe('★★ §149.2 装备仅可打出至基地 —— apply 侧同样要认', () => {
  test('★★★装备打到我控制的战场要被拒;打到基地照旧', () => {
    expect(playedTo(BF_MINE, 'SFD-022', ['equipment'])).toBe(false)
    expect(playedTo(`base:${P1}`, 'SFD-022', ['equipment'])).toBe(true)
  })
})

describe('★★ 旁路不许被连坐(㉗:拦多了也是错)', () => {
                                
  function windowForP1(extra: readonly GameObject[]): InteractiveGame {
    const g = new InteractiveGame(scene([
      ...extra,
      obj('bolt', 'DEMO-BOLT', P2, `hand:${P2}`),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!)
    g.apply({ kind: 'PASS', player: P2 })
    return g
  }

  test('★★★§822 伏击:窗口里仍能打到【争夺中】的战场(那不在 §355.2.a 名单上)', () => {
                                             
                                               
    const g = windowForP1([
      obj('amb', 'UNL-149', P1, `hand:${P1}`),
      obj('mine2', 'BLK', P1, BF_FOE),
    ])
    const act = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { to: string }).to === BF_FOE)
    expect(act).toBeDefined()                  
    g.apply(act!)
    expect(g.state.zones[BF_FOE]!.contents.map((o) => g.state.objects[o]?.defId)).toContain('UNL-149')
  })

  test('★★★§819 灵便装备在反应窗口里【打得出来】(枚举列了就必须能执行,铁律91/101)', () => {
    const g = windowForP1([{ ...obj('gear', 'SFD-022', P1, `hand:${P1}`), baseTypes: ['equipment'] as const }])
    const act = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'gear')
    expect(act).toBeDefined()                            
    g.apply(act!)
    expect((g.state.zones[`hand:${P1}`]?.contents ?? []).map(String)).not.toContain('gear')
  })
})
