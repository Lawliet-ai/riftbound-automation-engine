import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKeywords, cardKind, handPlaySpecs, playSpecFor, PLAY_SPECS } from '../../data/registry'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { seedRunes } from '../../src/game/economy'
import { CARD_COSTS } from '../../data/cardCosts'
import { ENEMY_MOVE_DEFIDS, UNL_038_LEVEL, enemyUnitsOnField, moveDestinations } from '../../data/cards/enemy-move'

                        
  
                                                
                                                      
                                          
  
                                        
                                                  
                                
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const KICK = 'UNL-038'
const CHARM = 'OGN-043'

const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, playSpecFor }

function obj(oid: string, defId: string, ctrl: typeof P1, zone: string): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: readonly GameObject[], exp = 0): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  s = { ...s, experience: { ...s.experience, [P1]: exp } }
  return seedRunes(s, P1, 'green', 8)
}
                                                 
function castAndAnswer(g: InteractiveGame, answer: (key: string, cands: readonly { id: string }[]) => string): string[] {
  const asked: string[] = []
  const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD')
  expect(play, '这张法术枚举不出来(㊵b:先确认付得起、有合法目标)').toBeDefined()
  g.apply(play!)
  for (let i = 0; i < 20; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      asked.push(p.request.key)
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: answer(p.request.key, p.request.candidates) })
      continue
    }
    return asked
  }
  throw new Error('没收敛')
}
const zoneOf = (g: InteractiveGame, oid: string): string | undefined => g.state.objects[asObjId(oid)]?.zone as string | undefined
const stunned = (g: InteractiveGame, oid: string): boolean => g.state.objects[asObjId(oid)]?.status.stunned === true

describe('★ 升龙踢 UNL-038 前提', () => {
  test('登记齐;费用照卡面实测取(法术的费用在 PlaySpec.cost,cardCost 读不到)', () => {
                                                              
                                                                     
                                                                        
    expect(ENEMY_MOVE_DEFIDS).toEqual(['UNL-038', 'UNL-124', 'VEN-105', 'OGN-258', 'VEN-148'])                 
    expect(cardKind(KICK)).toBe('spell')
                        
    expect(PLAY_SPECS[KICK]!.cost).toEqual({ mana: 2, pips: [['green']] })
    expect(CARD_COSTS[KICK]).toEqual({ mana: 2, pips: 1, colors: ['green'] })
    expect(UNL_038_LEVEL).toBe(6)
  })

  test('★共用积木:两张卡的「一名敌方单位」是同一份判据(㊼)', () => {
    const st = scene([obj('mine', 'BLK', P1, BF0), obj('foeA', 'BLK', P2, BF0), obj('foeB', 'BLK', P2, `base:${P2}`)])
                                   
    expect(enemyUnitsOnField(st, P1).sort()).toEqual(['foeA', 'foeB'])
                                               
    expect(PLAY_SPECS[KICK]!.legalTargets!(st, P1)).toEqual(PLAY_SPECS[CHARM]!.legalTargets!(st, P1))
  })

  test('★落点候选=【所属者】基地 + 所有战场,且排除当前所在(§355.4.a)', () => {
    const st = scene([obj('foe', 'BLK', P2, BF0)])
    const dests = moveDestinations(st, 'foe').sort()
    expect(dests).toContain(`base:${P2}`)                     
    expect(dests).not.toContain(`base:${P1}`)
    expect(dests).toContain(BF1)
    expect(dests).not.toContain(BF0)               
  })
})

describe('★★ 等级不到 6:只移动,而且【连眩晕都不问】', () => {
  const board = (exp: number): InteractiveGame => new InteractiveGame(scene([
    obj('k', KICK, P1, `hand:${P1}`), obj('foe', 'BLK', P2, BF0), obj('foe2', 'BLK', P2, BF0),
  ], exp), DEPS)

  test('★经验 5(阈值 -1):移动生效,只问了落点这一问', () => {
    const g = board(UNL_038_LEVEL - 1)
    const asked = castAndAnswer(g, (key, cands) => {
      if (key === 'dragonDest') return cands.find((c) => c.id === BF1)!.id
      throw new Error(`不该问 ${key}`)
    })
    expect(asked).toEqual(['dragonDest'])          
    expect(zoneOf(g, 'foe')).toBe(BF1)
    expect(stunned(g, 'foe')).toBe(false)
    expect(stunned(g, 'foe2')).toBe(false)
  })

  test('★经验 0:同上(⑫ 对照组,证明拦住的是等级不是别的)', () => {
    const g = board(0)
    const asked = castAndAnswer(g, (_k, cands) => cands.find((c) => c.id === BF1)!.id)
    expect(asked).toEqual(['dragonDest'])
    expect(stunned(g, 'foe')).toBe(false)
  })
})

describe('★★ 等级到 6:是【追加】不是「改为」——移动照做,再多一个眩晕', () => {
  const board = (exp: number): InteractiveGame => new InteractiveGame(scene([
    obj('k', KICK, P1, `hand:${P1}`), obj('foe', 'BLK', P2, BF0), obj('foe2', 'BLK', P2, BF0),
  ], exp), DEPS)

  test('★★★经验 6(阈值):两问都问,移动【和】眩晕都生效', () => {
    const g = board(UNL_038_LEVEL)
    const asked = castAndAnswer(g, (key, cands) =>
      key === 'dragonDest' ? cands.find((c) => c.id === BF1)!.id : cands.find((c) => c.id === 'foe2')!.id)
    expect(asked).toEqual(['dragonDest', 'dragonStun'])             
    expect(zoneOf(g, 'foe')).toBe(BF1)                    
    expect(stunned(g, 'foe2')).toBe(true)              
    expect(stunned(g, 'foe')).toBe(false)                 
  })

  test('★经验 7(阈值 +1):同样两问(⑩ 阈值三档的上界)', () => {
    const g = board(UNL_038_LEVEL + 1)
    const asked = castAndAnswer(g, (key, cands) =>
      key === 'dragonDest' ? cands.find((c) => c.id === BF1)!.id : cands.find((c) => c.id === 'foe2')!.id)
    expect(asked).toEqual(['dragonDest', 'dragonStun'])
    expect(stunned(g, 'foe2')).toBe(true)
  })

  test('★★★卡文没写「另一名」⇒ 眩晕的可以就是刚被移走的那一个(㉕ 别顺手排除)', () => {
    const g = board(UNL_038_LEVEL)
    const asked = castAndAnswer(g, (key, cands) => {
      if (key === 'dragonDest') return cands.find((c) => c.id === BF1)!.id
                            
      expect(cands.map((c) => c.id)).toContain('foe')
      return 'foe'
    })
    expect(asked).toEqual(['dragonDest', 'dragonStun'])
    expect(zoneOf(g, 'foe')).toBe(BF1)
    expect(stunned(g, 'foe')).toBe(true)
  })

  test('★眩晕候选只有【敌方】单位:自己人一个都不在里面', () => {
    const g = new InteractiveGame(scene([
      obj('k', KICK, P1, `hand:${P1}`), obj('foe', 'BLK', P2, BF0), obj('mine', 'BLK', P1, BF0),
    ], UNL_038_LEVEL), DEPS)
    castAndAnswer(g, (key, cands) => {
      if (key === 'dragonDest') return cands.find((c) => c.id === BF1)!.id
      expect(cands.map((c) => c.id)).not.toContain('mine')
      return cands[0]!.id
    })
    expect(stunned(g, 'mine')).toBe(false)
  })
})

describe('★★★不许串味:魅惑妖术 OGN-043 一辈子都不眩晕(㊷)', () => {
  test('经验拉满也只有落点一问、谁都不晕', () => {
    const g = new InteractiveGame(scene([
      obj('c', CHARM, P1, `hand:${P1}`), obj('foe', 'BLK', P2, BF0), obj('foe2', 'BLK', P2, BF0),
    ], 99), DEPS)
    const asked = castAndAnswer(g, (key, cands) => {
      expect(key).toBe('charmDest')                           
      return cands.find((c) => c.id === BF1)!.id
    })
    expect(asked).toEqual(['charmDest'])
    expect(zoneOf(g, 'foe')).toBe(BF1)
    expect(stunned(g, 'foe')).toBe(false)
    expect(stunned(g, 'foe2')).toBe(false)
  })
})
