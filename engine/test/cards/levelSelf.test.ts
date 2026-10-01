import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKeywords, cardKind, cardPassives, costModsFor, entryReadyFor, handPlaySpecs, playSpecFor } from '../../data/registry'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { computeCost } from '../../src/game/costPipeline'
import { applyEvents } from '../../src/loop/reduce'
import { detectTriggers } from '../../src/dsl/trigger'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { seedRunes } from '../../src/game/economy'
import { filterTargetable } from '../../src/keywords/untargetable'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { combatExperienceDelta, LEVEL_ENTRY_READY, LEVEL_SELF_DEFIDS, yiCostTier } from '../../data/cards/level-self'

                                        
  
                                                           
                                                         
                                                                    
                      
                                      
                                              

setCardPassiveProvider(cardPassives)                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  }
}
function scene(objs: readonly GameObject[], exp = 0, who = P1): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  const s = { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
  return { ...s, experience: { ...s.experience, [who]: exp } }
}
const view = (s: GameState) => recomputeContinuous(s)
const might = (s: GameState, oid: string): number => effectiveMight(view(s).objects[oid]!).reference
const kws = (s: GameState, oid: string): readonly string[] => view(s).objects[oid]!.derived?.keywords ?? []
                                
const mightAt = (defId: string, exp: number): number => might(scene([obj('me', defId)], exp), 'me')

describe('★【等级 · 自加成】前提(第179轮)', () => {
  test('登记齐,费用/战力/印刷关键词照卡面实测取', () => {
    expect(LEVEL_SELF_DEFIDS.slice().sort()).toEqual(
      ['UNL-016', 'UNL-031', 'UNL-040', 'UNL-047', 'UNL-059', 'UNL-075', 'UNL-094', 'UNL-098', 'UNL-113', 'UNL-151'])
    expect(Object.keys(LEVEL_ENTRY_READY).slice().sort()).toEqual(['UNL-016', 'UNL-151'])
    for (const [d, m, p] of [
      ['UNL-016', 3, 3], ['UNL-094', 2, 2], ['UNL-098', 6, 6], ['UNL-113', 4, 4], ['UNL-151', 4, 5],
      ['UNL-047', 3, 3], ['UNL-075', 3, 3], // 第180轮:交叉组合那一对,费用/战力完全一样
      ['UNL-040', 2, 2], // 第181轮:等级门包住一条【触发】
    ] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
    expect(cardCost('UNL-016').pips).toEqual([['red']])
    expect(cardCost('UNL-151').pips).toEqual([['yellow']])
    expect(cardCost('UNL-094').pips ?? []).toHaveLength(0)                       
                                   
    expect(cardKeywords('UNL-016')).toEqual(['狩猎2'])
    expect(cardKeywords('UNL-113')).toEqual(['狩猎2'])
    expect(cardKeywords('UNL-094')).toEqual(['狩猎'])
    expect(cardKeywords('UNL-047')).toEqual(['狩猎2'])
    expect(cardKeywords('UNL-075')).toEqual(['狩猎2'])
    expect(cardKeywords('UNL-040')).toEqual(['狩猎'])                         
    expect(cardKeywords('UNL-098')).toEqual([])
    expect(cardKeywords('UNL-151')).toEqual([])
  })
})

describe('★★ 战力那一半:阈值三档,每张各自的 N(铁律97)', () => {
  test('★★★UNL-016 焰爪 等级3:2 / 3 / 4', () => {
    expect(mightAt('UNL-016', 2)).toBe(3)
    expect(mightAt('UNL-016', 3)).toBe(4)
    expect(mightAt('UNL-016', 4)).toBe(4)
  })

  test('★★★UNL-094 晶手猎人 等级6:5 / 6 / 7', () => {
    expect(mightAt('UNL-094', 5)).toBe(2)
    expect(mightAt('UNL-094', 6)).toBe(3)
    expect(mightAt('UNL-094', 7)).toBe(3)
  })

  test('★★★UNL-098 巨神峰先知 等级11:10 / 11 / 12(而且是 +4 不是 +1)', () => {
    expect(mightAt('UNL-098', 10)).toBe(6)
    expect(mightAt('UNL-098', 11)).toBe(10)       
    expect(mightAt('UNL-098', 12)).toBe(10)
  })

  test('★★★是【持续】不是"达到过就永久":经验掉回去立刻没(§824/⑲)', () => {
    const me = obj('me', 'UNL-098')
    expect(might(scene([me], 11), 'me')).toBe(10)
    expect(might(scene([me], 10), 'me')).toBe(6)
  })

  test('★★★经验跟着【我的控制者】走:对手经验再高也不算', () => {
    const s = scene([obj('me', 'UNL-098', P1)], 99, P2)
    expect(might(s, 'me')).toBe(6)
  })

  test('★★★只圈【我自己】:旁边的友方单位一点都不加(与无极宗师那条正相反)', () => {
    const s = scene([obj('me', 'UNL-098'), obj('buddy', 'BLK')], 11)
    expect(might(s, 'me')).toBe(10)
                                                 
    expect(might(s, 'buddy')).toBe(specLookup('BLK').baseMight)
  })
})

describe('★★ 关键词那一半:易 UNL-113 只给关键词,不给战力', () => {
  test('★★★等级6 三档 + 两个关键词都要给(⑳ 至少断言两个)', () => {
    expect(kws(scene([obj('me', 'UNL-113')], 5), 'me')).not.toContain('法盾')
    const on = kws(scene([obj('me', 'UNL-113')], 6), 'me')
    expect(on).toContain('法盾')
    expect(on).toContain('游走')
    expect(kws(scene([obj('me', 'UNL-113')], 7), 'me')).toContain('游走')
  })

  test('★★★它【一点战力都不给】(㉑ 反方向:那是别人那几张的活)', () => {
    expect(mightAt('UNL-113', 6)).toBe(4)
    expect(mightAt('UNL-113', 11)).toBe(4)
  })
})

describe('★★ 进场姿态那一半:走【我自己】那条轴', () => {
  test('★★★UNL-016 等级3 三档', () => {
    expect(entryReadyFor(scene([], 2), P1, 'UNL-016')).toBe(false)
    expect(entryReadyFor(scene([], 3), P1, 'UNL-016')).toBe(true)
    expect(entryReadyFor(scene([], 4), P1, 'UNL-016')).toBe(true)
  })

  test('★★★UNL-151 班德尔士兵:只有这一句,战力一点不加(㉑ 反方向)', () => {
    expect(entryReadyFor(scene([], 3), P1, 'UNL-151')).toBe(true)
    expect(mightAt('UNL-151', 3)).toBe(5)            
    expect(mightAt('UNL-151', 11)).toBe(5)
  })

  test('★★★没有"活跃进场"那一句的三张,一个都不许开(㉕ 拦少了也是错)', () => {
    for (const d of ['UNL-094', 'UNL-098', 'UNL-113']) {
      expect(entryReadyFor(scene([], 99), P1, d), d).toBe(false)
    }
  })

  test('★★是【我自己】那条轴,不是板面级:它在场上不给【别人】开', () => {
                                                       
    const s = scene([obj('claw', 'UNL-016')], 11)
    expect(entryReadyFor(s, P1, 'BLK')).toBe(false)
  })
})

describe('★★ 交叉组合那一对(第180轮):只差给哪个关键词', () => {
                                                          
                                                      
  const at = (defId: string, exp: number): GameState => scene([obj('me', defId)], exp)

  test('★★★踏苔蜥 UNL-047 等级3 三档:战力 2/3/4 档 + [法盾]', () => {
    expect(mightAt('UNL-047', 2)).toBe(3)
    expect(mightAt('UNL-047', 3)).toBe(4)
    expect(mightAt('UNL-047', 4)).toBe(4)
    expect(kws(at('UNL-047', 2), 'me')).not.toContain('法盾')
    expect(kws(at('UNL-047', 3), 'me')).toContain('法盾')
  })

  test('★★★风行狐 UNL-075 等级3 三档:战力 2/3/4 档 + [游走]', () => {
    expect(mightAt('UNL-075', 2)).toBe(3)
    expect(mightAt('UNL-075', 3)).toBe(4)
    expect(mightAt('UNL-075', 4)).toBe(4)
    expect(kws(at('UNL-075', 2), 'me')).not.toContain('游走')
    expect(kws(at('UNL-075', 3), 'me')).toContain('游走')
  })

  test('★★★两张【不许串味】:蜥蜴没有[游走],狐狸没有[法盾](铁律86)', () => {
                                        
    expect(kws(at('UNL-047', 9), 'me')).not.toContain('游走')
    expect(kws(at('UNL-075', 9), 'me')).not.toContain('法盾')
  })
})

                                                                          
                                               
                                
  
                                                   
                                                           
                                                       
                                                                          
describe('★★ 无极学徒 UNL-040:等级门包住一条触发(第181轮)', () => {
  const playEv = (oid: string) => ({ kind: 'playUnit' as const, unit: asObjId(oid), player: P1 })
                           
  function fires(defId: string, exp: number): boolean {
    const s = scene([obj('me', defId)], exp)
    const t = activeTriggers(s).find((x) => x.sourceOid === asObjId('me'))
    if (!t) return false
    return detectTriggers(s, playEv('me'), [t], P1).length > 0
  }

  test('★★★阈值三档:经验 5 / 6 / 7(边界值本身不许漏)', () => {
    expect(fires('UNL-040', 5)).toBe(false)
    expect(fires('UNL-040', 6)).toBe(true)
    expect(fires('UNL-040', 7)).toBe(true)
  })

  test('★★对照组:教官 OGN-087 没有门,经验 0 也照响(㉑ 反方向)', () => {
    expect(fires('OGN-087', 0)).toBe(true)
  })

  test('★★★经验不够时是【连触发都没有】,不是"触发了但抽0张"(⑪ 断言落在有没有上)', () => {
                                                  
                                           
    const s = scene([obj('me', 'UNL-040')], 5)
    const t = activeTriggers(s).find((x) => x.sourceOid === asObjId('me'))
    expect(t).toBeDefined()                               
    expect(detectTriggers(s, playEv('me'), [t!], P1)).toEqual([])
  })

  test('★★★是【你】打出我才算:别人打出别的单位不响(by:\'you\' + subjectIsSelf)', () => {
    const s = scene([obj('me', 'UNL-040'), obj('other', 'BLK')], 9)
    const t = activeTriggers(s).find((x) => x.sourceOid === asObjId('me'))!
    expect(detectTriggers(s, playEv('other'), [t], P1)).toEqual([])
  })
})

                                                                          
                                          
                                                        
  
                                                         
                                                                 
                                                                 
                                       
                                                                          
describe('★★ 实战经验 UNL-031:「改为」= 升级替换(第182轮)', () => {
  test('前提:登记齐,费用/关键词照卡面', () => {
    expect(LEVEL_SELF_DEFIDS).toContain('UNL-031')
    expect(cardKind('UNL-031')).toBe('spell')
                                                                                   
    expect(playSpecFor('UNL-031')!.cost).toEqual({ mana: 1 })
    expect(cardKeywords('UNL-031')).toEqual(['反应'])
  })

  test('★★★阈值三档:经验 5 / 6 / 7 ⇒ +1 / +3 / +3', () => {
    const s = (exp: number): GameState => scene([], exp)
    expect(combatExperienceDelta(s(5), P1)).toBe(1)
    expect(combatExperienceDelta(s(6), P1)).toBe(3)
    expect(combatExperienceDelta(s(7), P1)).toBe(3)
  })

  test('★★★是【改为】不是【叠加】:经验够时就是 +3,不是 +4(㊾)', () => {
                                                
    expect(combatExperienceDelta(scene([], 99), P1)).toBe(3)
  })

  test('★★经验跟着【打出者】走,不是对手的账', () => {
    const base = scene([])
    const s = { ...base, experience: { ...base.experience, [P1]: 0, [P2]: 99 } } as GameState
    expect(combatExperienceDelta(s, P1)).toBe(1)
    expect(combatExperienceDelta(s, P2)).toBe(3)
  })

  test('★★★真结算一次:场上那名单位战力真的动了(铁律91 判据对了还要有人读)', () => {
    const s0 = scene([obj('u1', 'BLK')], 6)
    const spec = playSpecFor('UNL-031')!
    expect(spec.legalTargets(s0, P1)).toContain('u1')             
    const evs = spec.makeResolve({ movedCardOid: 'x', controller: P1, target: 'u1' })(s0)
    const after = applyEvents(s0, evs, {}).state
    expect(might(after, 'u1')).toBe(specLookup('BLK').baseMight + 3)
  })

  test('★★「一名单位」不分敌我(②):对手的单位也在候选里', () => {
    const s0 = scene([obj('u1', 'BLK', P1), obj('e1', 'BLK', P2)], 0)
    const legal = playSpecFor('UNL-031')!.legalTargets(s0, P1)
    expect(legal).toContain('u1')
    expect(legal).toContain('e1')
  })
})

                                                                          
                                    
                                                
  
                                                     
                                                         
                                
                                                    
                                                    
                                                   
                                                                          
describe('★★【敌方不可选我】通道(第183轮)', () => {
  const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKind, playSpecFor, cardKeywords }
                                      
  function boltScene(foeDefId: string, exp = 0): GameState {
                                                  
                                     
    const s = seedRunes(scene([
      { ...obj('h0', 'DEMO-BOLT', P1, `hand:${P1}`), baseMight: 0 },
      obj('foe', foeDefId, P2),
    ], exp, P2), P1, 'purple', 3)
    return recomputeContinuous(s)
  }
  const boltTargets = (s: GameState): string[] =>
    new InteractiveGame(s, DEPS as never).legalActions(P1)
      .filter((a) => a.kind === 'PLAY_CARD')
      .map((a) => (a as { target?: string }).target ?? '')

  test('前提:登记齐,费用/战力照卡面实测取', () => {
    expect(LEVEL_SELF_DEFIDS).toContain('UNL-059')
    for (const [d, m, p] of [['SFD-105', 6, 5], ['UNL-059', 12, 12]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
    expect(cardCost('SFD-105').pips ?? []).toHaveLength(0)
    expect(cardCost('UNL-059').pips).toEqual([['green'], ['green'], ['green']])
  })

  test('★★★门①枚举侧:敌方的沙墟啸匪【列不出来】;白板照列(对照组)', () => {
    expect(boltTargets(boltScene('SFD-105'))).not.toContain('foe')
    expect(boltTargets(boltScene('BLK'))).toContain('foe')
  })

  test('★★★门②apply 侧:硬发过去也拒(铁律101 只锁枚举等于没锁)', () => {
    const g = new InteractiveGame(boltScene('SFD-105'), DEPS as never)
    g.apply({ kind: 'PLAY_CARD', player: P1, cardOid: 'h0', target: 'foe' } as never)
    expect((g.state.zones[`hand:${P1}`]?.contents ?? []).map(String)).toContain('h0')        
  })

  test('★★★「敌方」是承重的:控制者自己不受挡(判据本身,㉖/铁律87 样例要纯)', () => {
                                              
                                                            
    const s = recomputeContinuous(scene([obj('mine', 'SFD-105', P1), obj('plain', 'BLK', P1)], 0))
    expect(filterTargetable(s.objects, P1 as string, ['mine', 'plain'])).toEqual(['mine', 'plain'])
    expect(filterTargetable(s.objects, P2 as string, ['mine', 'plain'])).toEqual(['plain'])
  })

  test('★★非物件目标(zoneId / 链项目 id)原样保留,别顺手滤掉(㉗)', () => {
    const s = recomputeContinuous(scene([obj('mine', 'SFD-105', P1)], 0))
    expect(filterTargetable(s.objects, P2 as string, ['battlefield:shared:0', 'play:x', 'mine']))
      .toEqual(['battlefield:shared:0', 'play:x'])
  })

  test('★★★易 UNL-059:阈值三档 15 / 16 / 17(只有第四句这一半)', () => {
    expect(boltTargets(boltScene('UNL-059', 15))).toContain('foe')
    expect(boltTargets(boltScene('UNL-059', 16))).not.toContain('foe')
    expect(boltTargets(boltScene('UNL-059', 17))).not.toContain('foe')
  })

  test('★★★易 UNL-059 前三句:三档【改为】减费 2/3 · 5/6 · 10/11 · 16', () => {
    const at = (exp: number) => yiCostTier(scene([], exp), P1)
    expect(at(2)).toBeUndefined()
    expect(at(3)).toEqual({ mana: 2, pips: 1, tag: '等级3' })
    expect(at(5)).toEqual({ mana: 2, pips: 1, tag: '等级3' })
    expect(at(6)).toEqual({ mana: 4, pips: 2, tag: '等级6' })                 
    expect(at(10)).toEqual({ mana: 4, pips: 2, tag: '等级6' })
    expect(at(11)).toEqual({ mana: 6, pips: 3, tag: '等级11' })
    expect(at(16)).toEqual({ mana: 6, pips: 3, tag: '等级11' })            
  })

  test('★★★减费真的进了 effectiveCost(铁律91 判据对了还要有人读)', () => {
                                              
    const s = scene([], 11)
    const mods = costModsFor(s, P1, 'UNL-059')
    expect(mods.map((m) => m.kind)).toEqual(['reduce', 'reduce'])
    expect(computeCost(cardCost('UNL-059'), mods)).toEqual({ mana: 6 })
  })
})
