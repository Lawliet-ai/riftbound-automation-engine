import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  activatedFor, activeTriggers, cardCost, cardKeywords, cardKind, defHasTag, entryReadyFor, handPlaySpecs,
} from '../../data/registry'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import type { GameEvent } from '../../src/loop/events'
import { BOARD_WIDE_ENTER_READY_DEFIDS, ENTER_READY_DEFIDS } from '../../data/cards/enter-ready'

                                    
  
                              
                                                                      
                         
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const plain = (oid: string, defId = 'BLK', ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), defId, baseMight: extra.baseMight ?? 3 })

function scene(objs: GameObject[], hand = 0, deck = 4): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [
    ...objs,
    ...Array.from({ length: hand }, (_, i) => plain(`h${i}`, 'BLK', P1, { zone: asZoneId(`hand:${P1}`) })),
    ...Array.from({ length: deck }, (_, i) => plain(`d${i}`, 'BLK', P1, { zone: asZoneId(`mainDeck:${P1}`) })),
  ]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
function run(st: GameState, ev: GameEvent, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('★【以活跃状态进场】(第153轮)', () => {
  test('前提:登记齐,战力/费用照卡面实测取', () => {
                                                    
                                                   
                                                            
    expect(ENTER_READY_DEFIDS.slice().sort()).toEqual([
      'ARC-004', 'OGN-035',
                                                              
                                                            
                                             
      'OGN-079',
      'OGS-009', 'OGS-016',
      'SFD-006', 'SFD-027', 'SFD-071', 'SFD-094', 'SFD-176', 'SFD-223', 'UNL-001',
      'UNL-008', // ★第533轮 莽林巨象:本回合死过【任何】单位就活跃进场(读第十四本回合账),用例在 mightyElephant533.test.ts
      'UNL-016', 'UNL-037', 'UNL-151', // 第179轮【等级·自加成】两张;★UNL-037 影卫(第297轮:读第六本回合账)
      'UNL-194', // ★第298轮 黑影:这一族里【第一张只看落点】的(打到战场才活跃,打到基地不给)
      'UNL-196', // 第255轮 小菊!:卡文第一句逐字「我以活跃状态进场。」——无条件,所以是 always
      'VEN-013', 'VEN-091',
    ])                                                              
                                               
    expect(entryReadyFor(scene([]), P1, 'OGN-159')).toBe(true)
    for (const [d, m, p] of [['SFD-006', 3, 3], ['OGS-016', 6, 5], ['OGS-009', 7, 6],
      ['UNL-001', 5, 3], ['ARC-004', 6, 5], ['SFD-027', 7, 7], ['SFD-094', 7, 7]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
                              
    expect(cardKeywords('OGS-009')).toContain('游走')
    expect(cardKeywords('SFD-006')).not.toContain('游走')
  })

  test('★★泛化没把老特例弄丢:啃啃 UNL-035 仍按它那半边减费的判据走', () => {
                         
    const none = scene([plain('foe', 'BLK', P2)])
    expect(entryReadyFor(none, P1, 'UNL-035')).toBe(false)
                                  
    const stunned = scene([plain('foe', 'BLK', P2, { status: { stunned: true } })])
    expect(entryReadyFor(stunned, P1, 'UNL-035')).toBe(true)
  })

  test('★无条件那几张:恒真;没登记的卡恒假(对照组)', () => {
    const st = scene([])
    for (const d of ['SFD-006', 'OGS-016', 'OGS-009', 'UNL-001', 'ARC-004']) {
      expect(entryReadyFor(st, P1, d), d).toBe(true)
    }
    expect(entryReadyFor(st, P1, 'OGN-159')).toBe(true)                               
    expect(entryReadyFor(st, P1, 'OGN-148')).toBe(false)                 
  })

  test('★★穿沙角兽 SFD-027:手牌「不超过两张」压三档', () => {
    expect(entryReadyFor(scene([], 1), P1, 'SFD-027')).toBe(true)
    expect(entryReadyFor(scene([], 2), P1, 'SFD-027')).toBe(true)            
    expect(entryReadyFor(scene([], 3), P1, 'SFD-027')).toBe(false)
  })

  test('★★凶翼 SFD-094:「其他龙属性单位」三半各压一条', () => {
                                                        
                                                        
                                                     
    const dragon = (oid: string, ctrl = P1) => plain(oid, 'OGN-131', ctrl)        
    expect(entryReadyFor(scene([dragon('d')]), P1, 'SFD-094')).toBe(true)
                     
    expect(entryReadyFor(scene([dragon('d', P2)]), P1, 'SFD-094')).toBe(false)
                             
    expect(entryReadyFor(scene([plain('k', 'OGN-165')]), P1, 'SFD-094')).toBe(false)
                            
    expect(entryReadyFor(scene([plain('x', 'OGN-148')]), P1, 'SFD-094')).toBe(false)
    expect(entryReadyFor(scene([]), P1, 'SFD-094')).toBe(false)
  })

  test('★★多标签卡的 defHasTag:「犬形|龙」两个标签都要认出来', () => {
                                                                      
    expect(defHasTag('SFD-006', '龙')).toBe(true)
    expect(defHasTag('SFD-006', '犬形')).toBe(true)
    expect(defHasTag('SFD-006', '猫科')).toBe(false)
    expect(defHasTag('SFD-094', '龙')).toBe(true)          
  })

  test('★沃里克 ARC-004:进攻时摧毁此处【所有已受伤的】敌方单位', () => {
    const st = scene([obj('ww', 'ARC-004'),
      plain('hurt1', 'BLK', P2, { damage: 1 }), plain('hurt2', 'BLK', P2, { damage: 2 }),
      plain('fresh', 'BLK', P2), plain('mateHurt', 'BLK', P1, { damage: 3 }),
      plain('farHurt', 'BLK', P2, { damage: 1, zone: asZoneId(BF1) })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('ww'))!
    const evs = t.effect(st, { kind: 'attack', unit: asObjId('ww'), player: P1, battlefield: BF0 }, {})
                                
    expect(evs.map((e) => (e as { target: string }).target).sort()).toEqual(['hurt1', 'hurt2'])
    expect(evs.every((e) => e.kind === 'destroy')).toBe(true)
  })

  test('★穿沙角兽的第二句:【单位卡】的据守用 selfAtEventBattlefield', () => {
    const st = scene([obj('horn', 'SFD-027')])
    const held = run(st, { kind: 'hold', player: P1, battlefield: BF0 })
    expect(held.zones[`hand:${P1}`]!.contents).toHaveLength(2)
                                                 
    const elsewhere = run(st, { kind: 'hold', player: P1, battlefield: BF1 })
    expect(elsewhere.zones[`hand:${P1}`]!.contents).toHaveLength(0)
  })

  test('★竞技场理事 UNL-001 的主动技能:[横置] 给一名单位 +3', () => {
    const st = scene([obj('mgr', 'UNL-001'), plain('u')])
    const spec = activatedFor('UNL-001').find((x) => x.key === 'UNL-001:pump')!
    expect(spec.tapSelf).toBe(true)
    expect(spec.cost).toEqual({})
    expect([...spec.legalTargets!(st, P1, 'mgr')].sort()).toEqual(['mgr', 'u'])
  })

                                                                    
  test('前提:第154轮三张的战力/费用/印刷关键词', () => {
    for (const [d, m, p] of [['SFD-176', 3, 4], ['OGN-035', 4, 2], ['VEN-091', 10, 10]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
                                                  
    expect(cardKeywords('SFD-176')).toContain('壁垒')
    expect(cardKeywords('OGN-035')).toContain('强攻3')
                                                             
    expect(cardKeywords('SFD-223')).toContain('强攻3')
  })

  test('★★赵信 SFD-176:基地里「不少于两名其他单位」压三档,且只数单位', () => {
    const inBase = (oid: string, extra: Partial<GameObject> = {}) =>
      plain(oid, 'BLK', P1, { zone: asZoneId(`base:${P1}`), ...extra })
    expect(entryReadyFor(scene([inBase('a')]), P1, 'SFD-176')).toBe(false)
    expect(entryReadyFor(scene([inBase('a'), inBase('b')]), P1, 'SFD-176')).toBe(true)       
    expect(entryReadyFor(scene([inBase('a'), inBase('b'), inBase('c')]), P1, 'SFD-176')).toBe(true)
                       
    expect(entryReadyFor(scene([inBase('a'), inBase('g', { baseTypes: ['equipment'] })]), P1, 'SFD-176')).toBe(false)
                        
    expect(entryReadyFor(scene([inBase('a'), plain('onBf')]), P1, 'SFD-176')).toBe(false)
                 
    const foeBase = plain('f', 'BLK', P2, { zone: asZoneId(`base:${P2}`) })
    expect(entryReadyFor(scene([inBase('a'), foeBase]), P1, 'SFD-176')).toBe(false)
  })

  test('★★薇恩 OGN-035:「对手已控制任意战场」——我自己控场不算', () => {
                          
    expect(entryReadyFor(scene([plain('foe', 'BLK', P2)]), P1, 'OGN-035')).toBe(true)
                                      
    expect(entryReadyFor(scene([plain('mine')]), P1, 'OGN-035')).toBe(false)
                              
    expect(entryReadyFor(scene([plain('mine'), plain('foe', 'BLK', P2)]), P1, 'OGN-035')).toBe(false)
    expect(entryReadyFor(scene([]), P1, 'OGN-035')).toBe(false)
    expect(entryReadyFor(scene([plain('foe', 'BLK', P2)]), P1, 'SFD-223')).toBe(true)            
  })

  test('★薇恩的征服触发:两个卡号【各自】都要产出,且㊹ 付不起整条不执行', () => {
    const ev: GameEvent = { kind: 'conquer', player: P1, battlefield: BF0 }
                                                                
                                     
    for (const defId of ['OGN-035', 'SFD-223']) {
      const st = scene([obj('vayne', defId)])
      const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('vayne'))
      expect(t, `${defId} 没有产出征服触发`).toBeDefined()
      expect(t!.sourceDefId, defId).toBe(defId)
      expect(t!.mayChoose, defId).toBe(true)
                                                   
                                                
                                                                               
                                                            
      expect(t!.basePerform!(st, ev, {}), `${defId} 付不起 ⇒ basePerform 给 null(§383.3.b.1 不确认)`).toBeNull()
    }
  })

                                                             
  const drakeScene = (): GameState => scene([obj('drake', 'VEN-091'),
    plain('small', 'BLK', P2, { baseMight: 5 }), plain('big', 'BLK', P2, { baseMight: 6 }),
    plain('mate', 'BLK', P1, { baseMight: 1 }),
    plain('far', 'BLK', P2, { baseMight: 1, zone: asZoneId(BF1) })])
  const drakeAttack = (): GameEvent => ({ kind: 'attack', unit: asObjId('drake'), player: P1, battlefield: BF0 })

  test('★★腐化巨龙 VEN-091:「距离胜利得分超过3分」是严格大于,压三档', () => {
    const withScore = (n: number): GameState => ({ ...scene([]), scores: { [P1]: n, [P2]: 0 } })
                                                    
    expect(entryReadyFor(withScore(0), P1, 'VEN-091')).toBe(true)            
    expect(entryReadyFor(withScore(4), P1, 'VEN-091')).toBe(true)            
    expect(entryReadyFor(withScore(5), P1, 'VEN-091')).toBe(false)              
    expect(entryReadyFor(withScore(6), P1, 'VEN-091')).toBe(false)       
  })

  test('★腐化巨龙的进攻多选:候选限【此处·敌方·≤5[M]】,且"够了"选项永远在', () => {
    const st = drakeScene()
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('drake'))!
    const req = t.nextChoice!(st, drakeAttack(), {})!
    const ids = req.candidates.map((c) => c.id)
    expect(ids).toContain('small')
    expect(ids).not.toContain('big')             
    expect(ids).not.toContain('mate')       
    expect(ids).not.toContain('far')        
                               
                                                         
                                                
                                                   
    expect(ids).toContain('__done__')
  })

                                                         
                                                     
                                                          
                                                         
                                                        
                                    
  test('★★★【自证①】走真流程:advanceFepr 在**确认阶段**就问,项目还是 pending', () => {
    const fired = landAndEnqueueTriggers(drakeScene(), [drakeAttack() as never], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind, '★★★确认阶段就问了(不是 decision = 进 FEPR 优先权轮)').toBe('choice')
    expect(step.state.chain.some((i: { readonly status: string }) => i.status === 'pending'),
      '★★★问的时候项目还没确认 ⇒ 对手还没拿到优先权').toBe(true)
    const req = (step as Extract<typeof step, { kind: 'choice' }>).request
    expect(req.candidates.map((c) => c.id).sort(), '★★★这一问是【要不要执行】').toEqual(['no', 'yes'])
                                      
    const declined = advanceFepr(
      { ...step.state, resolveChoices: { ...(step.state.resolveChoices ?? {}), [req.key]: 'no' } }, {})
    expect(declined.state.chain.filter((i: { readonly id: string }) => i.id.includes('VEN-091')),
      '★★★答了不执行 ⇒ 这个项目已离链').toHaveLength(0)
  })

  test('★★【自证②】两条拒绝路**语义不同**:确认阶段那一问是 yes/no,结算期那一问是"够了"', () => {
                                                              
    const st = drakeScene()
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('drake'))!
    expect(t.mayChoose, '★★§383.3.a:「要不要执行」在确认阶段').toBe(true)
    const ids = t.nextChoice!(st, drakeAttack(), {})!.candidates.map((c) => c.id)
                                        
    for (const reject of ['yes', 'no', 'skip', 'none', 'decline']) {
      expect(ids.includes(reject), `★结算期候选表里不该混进「是否执行」那一档(查 ${reject})`).toBe(false)
    }
    expect(ids, '★而多选自己的退出口照旧').toContain('__done__')
  })

  test('★★此处没有 ≤5[M] 敌方时**仍然会问**「要不要执行」(§420 收益落空 ≠ 不触发)', () => {
    const lonely = scene([obj('drake', 'VEN-091'), plain('mate', 'BLK', P1, { baseMight: 1 })])
    const fired = landAndEnqueueTriggers(lonely, [drakeAttack() as never], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind).toBe('choice')
    expect((step as Extract<typeof step, { kind: 'choice' }>).request.candidates.map((c) => c.id).sort())
      .toEqual(['no', 'yes'])
                                               
    const t = activeTriggers(lonely).find((y) => y.sourceOid === asObjId('drake'))!
    expect(t.nextChoice!(lonely, drakeAttack(), {}), '★前提自证:没候选 ⇒ 多选自然收尾').toBeNull()
  })
})
                                                                          
                                   
                            
  
                                                  
                                                
                                               
                                      
                                                                          
describe('★★ 板面级授予:熔浆巨龙 OGN-011(第177轮)', () => {
  test('前提:登记齐,费用/战力照卡面实测取', () => {
    expect(BOARD_WIDE_ENTER_READY_DEFIDS.slice().sort()).toEqual(['OGN-011', 'UNL-191', 'UNL-231'])
    expect(cardKind('OGN-011')).toBe('unit')
    expect(cardCost('OGN-011')).toEqual({ mana: 8, pips: [['red']] })
    expect(specLookup('OGN-011').baseMight).toBe(8)
  })

  test('★★场上有它 ⇒ 我打出的白板单位活跃进场;没有它 ⇒ 照常休眠(对照组⑫)', () => {
    expect(entryReadyFor(scene([obj('drake', 'OGN-011')]), P1, 'BLK')).toBe(true)
    expect(entryReadyFor(scene([plain('x')]), P1, 'BLK')).toBe(false)
  })

  test('★★★「在【场上】」含基地(⑩ 场上 ≠ 战场上)', () => {
    const inBase = scene([obj('drake', 'OGN-011', P1, { zone: asZoneId(`base:${P1}`) })])
    expect(entryReadyFor(inBase, P1, 'BLK')).toBe(true)
                      
    const inHand = scene([obj('drake', 'OGN-011', P1, { zone: asZoneId(`hand:${P1}`) })])
    expect(entryReadyFor(inHand, P1, 'BLK')).toBe(false)
  })

  test('★★★「【友方】」:对手的巨龙不给我开(㉖ 身份判据)', () => {
    const foes = scene([obj('drake', 'OGN-011', P2)])
    expect(entryReadyFor(foes, P2, 'BLK')).toBe(true)            
    expect(entryReadyFor(foes, P1, 'BLK')).toBe(false)        
  })

  test('★★★场上已有一条巨龙时,打【第二条巨龙】也活跃进场', () => {
                                             
    expect(entryReadyFor(scene([obj('drake', 'OGN-011')]), P1, 'OGN-011')).toBe(true)
                                       
    expect(entryReadyFor(scene([plain('x')]), P1, 'OGN-011')).toBe(false)
  })

                                               
                                                                                          
                                                                     
                                                            
                                                                     
                                                                     
                                                                
                                                            
  test('🔴★★★`except`:场上只有【正在打出的那条】巨龙时,它不给自己开活跃(「其他」)', () => {
    const only = scene([obj('drake', 'OGN-011')])
                                                              
    expect(entryReadyFor(only, P1, 'OGN-011'), '★对照:不传 self 时命中场上那条').toBe(true)
                                                      
    expect(entryReadyFor(only, P1, 'OGN-011', undefined, 'drake'),
      '🔴自己不算「其他友方单位」(砍掉 myFieldedUnits 的 except 这条就会变 true)').toBe(false)
  })

  test('🔴★★★`except` 只排自己:场上另有一条巨龙时,照样开', () => {
    const two = scene([obj('drake', 'OGN-011'), obj('drake2', 'OGN-011')])
    expect(entryReadyFor(two, P1, 'OGN-011', undefined, 'drake'),
      '★排掉自己后还剩 drake2 ⇒ 该开(证明 except 只排一个,不是把整条判空)').toBe(true)
  })

  test('★★两条轴是【或】的关系:自己带的条件没满足,板面级照样开', () => {
                                                       
    const many = scene([plain('x')], 5)
    expect(entryReadyFor(many, P1, 'SFD-027')).toBe(false)                
    const withDrake = scene([obj('drake', 'OGN-011')], 5)
    expect(entryReadyFor(withDrake, P1, 'SFD-027')).toBe(true)
  })
})

describe('★★★ 板面级授予真的走到了【打出那条路】上(铁律91/㉟)', () => {
                                         
  const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKind, entryReadyFor }
  const play = (extra: readonly GameObject[]): GameObject => {
    const st = scene([...extra, plain('h9', 'BLK', P1, { zone: asZoneId(`hand:${P1}`) })])
    const g = new InteractiveGame(st, DEPS as never)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'h9')!)
    const base = g.state.zones[`base:${P1}`]?.contents ?? []
    return g.state.objects[base[base.length - 1]!]!
  }

  test('场上有巨龙 ⇒ 打出的单位【不】休眠;没有 ⇒ §359.2.c 照常休眠', () => {
    expect(play([obj('drake', 'OGN-011')]).status.dormant).toBeUndefined()
    expect(play([plain('x')]).status.dormant).toBe(true)
  })
})

                                                                          
                                       
                                          
                                            
                                        
                                                                          
describe('★★ 无极宗师:{等级11>} 你的单位活跃进场(第178轮)', () => {
  const legend = (oid: string, defId: string, ctrl = P1): GameObject =>
    obj(oid, defId, ctrl, { zone: asZoneId(`legend:${ctrl}`), baseMight: 0, baseTypes: ['legend'] as never })
  const at = (exp: number, objs: GameObject[], who = P1): GameState => {
    const s = scene(objs)
    return { ...s, experience: { ...s.experience, [who]: exp } }
  }

  test('★★★阈值三档:经验 10 / 11 / 12(边界值本身不许漏,铁律97)', () => {
    const board = (): GameObject[] => [legend('wu', 'UNL-191')]
    expect(entryReadyFor(at(10, board()), P1, 'BLK')).toBe(false)
    expect(entryReadyFor(at(11, board()), P1, 'BLK')).toBe(true)
    expect(entryReadyFor(at(12, board()), P1, 'BLK')).toBe(true)
  })

  test('★★★经验够但【场上没有它】就不给(对照组⑫)', () => {
    expect(entryReadyFor(at(11, [plain('x')]), P1, 'BLK')).toBe(false)
  })

  test('★★★「你的」:对手拿着它、对手经验够,我不享受', () => {
    const s = at(11, [legend('wu', 'UNL-231', P2)], P2)
    expect(entryReadyFor(s, P2, 'BLK')).toBe(true)
    expect(entryReadyFor(s, P1, 'BLK')).toBe(false)
  })

  test('★UNL-231 与 UNL-191 各自都生效(不是再版)', () => {
    expect(entryReadyFor(at(11, [legend('wu', 'UNL-231')]), P1, 'BLK')).toBe(true)
  })

  test('★★两个授予者互不干扰:巨龙在场时不看经验', () => {
                                               
    expect(entryReadyFor(at(0, [obj('drake', 'OGN-011')]), P1, 'BLK')).toBe(true)
  })
})
