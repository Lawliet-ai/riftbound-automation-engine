import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKeywords, cardKind, cardPassives, defHasTag, entryReadyFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import type { GameEvent } from '../../src/loop/events'
import { GROUP_PASSIVE_BATCH_DEFIDS, GROUP_PASSIVE_DEFIDS, groupPassives } from '../../data/cards/group-passives'

                                  
  
                              
                                                    
                                      
                                                           

setCardPassiveProvider(cardPassives)                  

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

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const view = (s: GameState) => recomputeContinuous(s)
const might = (s: GameState, oid: string) => effectiveMight(view(s).objects[oid]!).reference
const kws = (s: GameState, oid: string) => view(s).objects[oid]!.derived?.keywords ?? []

describe('★【群体静态被动】(第155轮)', () => {
  test('前提:登记齐,战力/费用照卡面实测取', () => {
    expect(GROUP_PASSIVE_BATCH_DEFIDS.slice().sort()).toEqual([
      'OGN-015', 'OGN-074', 'OGS-013', 'OGS-019', 'SFD-014', 'SFD-071',
                                                       
      'SFD-082', 'SFD-082a', 'SFD-082b',
      'SFD-089', 'SFD-110',
      'SFD-181', 'SFD-240', 'UNL-041', 'UNL-077', 'UNL-090', 'UNL-090a', 'UNL-111', 'UNL-171', 'VEN-129',
    ])
                                                   
                                                                                          
                                 
                                                                                
                                                                    
                                                                                                                                                                                                                                                                                                                               
    for (const [d, m, p] of [['OGS-013', 6, 5], ['OGN-015', 4, 5], ['UNL-077', 5, 3], ['SFD-089', 5, 4]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)                   
    }
    expect(cardKind('SFD-181')).toBe('legend')
  })

  test('★★盖伦 OGS-013:「此处的其他友方单位」三半各压一条,且【不加给自己】', () => {
    const st = scene([obj('garen', 'OGS-013'), plain('mate'), plain('foe', 'BLK', P2),
      plain('far', 'BLK', P1, { zone: asZoneId(BF1) })])
    expect(might(st, 'mate')).toBe(4)            
    expect(might(st, 'garen')).toBe(5)                         
    expect(might(st, 'foe')).toBe(3)              
    expect(might(st, 'far')).toBe(3)              
  })

  test('★★法荣队长 OGN-015:与盖伦【同一范围、不同给予物】(给的是关键词不是战力)', () => {
    const st = scene([obj('cap', 'OGN-015'), plain('mate'), plain('foe', 'BLK', P2),
      plain('far', 'BLK', P1, { zone: asZoneId(BF1) })])
    expect(kws(st, 'mate')).toContain('强攻')
    expect(kws(st, 'cap')).not.toContain('强攻')         
    expect(kws(st, 'foe')).not.toContain('强攻')
    expect(kws(st, 'far')).not.toContain('强攻')
                                                
    expect(might(st, 'mate')).toBe(3)
  })

  test('★★兰博 SFD-089:「(包括我。)」⇒ 不排除自己,与上面那对正好相反', () => {
                                                       
    const st = scene([obj('rumble', 'SFD-089'), plain('mech', 'OGN-016'),
      plain('mech2', 'OGN-016', P2), plain('nonMech', 'OGN-148')])
    expect(might(st, 'mech')).toBe(4)               
    expect(might(st, 'rumble')).toBe(5)                                 
    expect(might(st, 'mech2')).toBe(3)                      
    expect(might(st, 'nonMech')).toBe(3)              
  })

  test('★牧魂人 UNL-077:「指示物单位」要两个条件都满足(金币是装备指示物,不算)', () => {
    const st = scene([obj('shep', 'UNL-077'),
      plain('minion', 'token:随从', P1, { baseMight: 1 }),
      plain('gold', 'token:金币', P1, { baseMight: 0, baseTypes: ['equipment'] }),
      plain('realUnit'),
      plain('foeMinion', 'token:随从', P2, { baseMight: 1 })])
    expect(might(st, 'minion')).toBe(2)           
    expect(might(st, 'gold')).toBe(0)                           
    expect(might(st, 'realUnit')).toBe(3)            
    expect(might(st, 'foeMinion')).toBe(1)         
  })

  test('★★机械公敌 SFD-181:给你的机械单位 [坚守];传奇在【传奇区】也生效', () => {
                                                     
                                                
                                             
    const st = scene([obj('nemesis', 'SFD-181', P1, { zone: asZoneId(`legend:${P1}`), baseTypes: ['legend'] }),
      plain('mech', 'OGN-016'), plain('foeMech', 'OGN-016', P2),
      plain('yordle', 'OGN-087'), plain('nonTag', 'OGN-148')])
    expect(kws(st, 'mech')).toContain('坚守')                        
    expect(kws(st, 'foeMech')).not.toContain('坚守')        
    expect(kws(st, 'yordle')).not.toContain('坚守')                       
    expect(kws(st, 'nonTag')).not.toContain('坚守')
  })

  test('★源在手牌里就不产出(§170;这条由上游 cardPassiveEffects 的区域过滤保证)', () => {
    const inHand = scene([obj('garen', 'OGS-013', P1, { zone: asZoneId(`hand:${P1}`) }), plain('mate')])
    expect(might(inHand, 'mate')).toBe(3)                     
    const onField = scene([obj('garen', 'OGS-013'), plain('mate')])
    expect(might(onField, 'mate')).toBe(4)       
  })

  test('★兰博第二句:【单位卡】的据守 → 打出 3[M] 机器人到基地(休眠)', () => {
    const st = scene([obj('rumble', 'SFD-089')])
    let s = landAndEnqueueTriggers(st, [{ kind: 'hold', player: P1, battlefield: BF0 } as GameEvent],
      activeTriggers, P1, {})
    for (const it of s.chain.filter((x: { status: string }) => x.status === 'pending')) {
      s = applyEvents(s, it.resolve(s, {}, it), {}).state
    }
    const born = (s.zones[`base:${P1}`]?.contents ?? []).map((o) => s.objects[o]!)
      .filter((o) => o.defId === 'token:机器人')
    expect(born).toHaveLength(1)
    expect(born[0]!.baseMight).toBe(3)
    expect(born[0]!.status.dormant).toBe(true)                    
  })

                                                                    
  test('前提:第156轮三张的战力/费用/印刷关键词', () => {
    for (const [d, m, p] of [['OGN-074', 4, 4], ['UNL-041', 3, 3], ['SFD-071', 8, 7]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
                              
    expect(cardKeywords('OGN-074')).toEqual(expect.arrayContaining(['坚守', '壁垒']))
    expect(cardKeywords('UNL-041')).toContain('法盾')
  })

  test('★塔里克 OGN-074:此处的【其他】友方单位获得[坚守];范围断言落在 predicate 上', () => {
    const st = scene([obj('taric', 'OGN-074'), plain('mate'), plain('foe', 'BLK', P2),
      plain('far', 'BLK', P1, { zone: asZoneId(BF1) })])
    expect(kws(st, 'mate')).toContain('坚守')
    expect(kws(st, 'foe')).not.toContain('坚守')
    expect(kws(st, 'far')).not.toContain('坚守')
                                                           
                                                          
    const eff = groupPassives(st.objects['taric']!, st, defHasTag)
    expect(eff).toHaveLength(1)
    expect(eff[0]!.predicate(st.objects['taric']!, st), '「其他」:不该命中自己').toBe(false)
    expect(eff[0]!.predicate(st.objects['mate']!, st)).toBe(true)
  })

  test('★★艾蕾 UNL-041:多一道【我必须在战场上】的闸(在基地就不生效)', () => {
    const onBf = scene([obj('elle', 'UNL-041'), plain('mate')])
    expect(kws(onBf, 'mate')).toContain('法盾')
                                     
    const inBase = scene([obj('elle', 'UNL-041', P1, { zone: asZoneId(`base:${P1}`) }),
      plain('mate', 'BLK', P1, { zone: asZoneId(`base:${P1}`) })])
    expect(kws(inBase, 'mate')).not.toContain('法盾')
  })

  test('★★疾驰机械 SFD-071:一句话给【两个】关键词,且含我自己', () => {
    const st = scene([obj('rush', 'SFD-071'), plain('mech', 'OGN-016'), plain('nonMech', 'OGN-148')])
    for (const k of ['法盾', '游走']) {
      expect(kws(st, 'mech'), k).toContain(k)
      expect(kws(st, 'rush'), `自己也该有 ${k}`).toContain(k)              
    }
    expect(kws(st, 'nonMech')).not.toContain('法盾')
                                      
    expect(kws(st, 'mech').filter((k) => k === '法盾' || k === '游走')).toHaveLength(2)
  })

  test('★疾驰机械的另一半:控制其他机械单位则以活跃状态进场', () => {
    expect(entryReadyFor(scene([plain('mech', 'OGN-016')]), P1, 'SFD-071')).toBe(true)
    expect(entryReadyFor(scene([plain('mech', 'OGN-016', P2)]), P1, 'SFD-071')).toBe(false)          
    expect(entryReadyFor(scene([plain('x', 'OGN-148')]), P1, 'SFD-071')).toBe(false)
  })
})
                                                                          
                                                   
                                    
                                                   
  
                                                 
                                          
                                                                    
                                                                          
describe('★★ 无极宗师:{等级6>} 你的单位 {S}+1(第178轮)', () => {
  const at = (exp: number, objs: GameObject[]): GameState => {
    const s = scene(objs)
    return { ...s, experience: { ...s.experience, [P1]: exp } }
  }
                                                      
  const wuju = (oid: string, defId: string, ctrl = P1): GameObject =>
    obj(oid, defId, ctrl, { zone: asZoneId(`legend:${ctrl}`), baseMight: 0, baseTypes: ['legend'] as never })

  test('前提:登记齐(㊵ 每族一条对账断言),费用照卡面', () => {
    expect(GROUP_PASSIVE_DEFIDS).toContain('UNL-191')
    expect(GROUP_PASSIVE_DEFIDS).toContain('UNL-231')
    for (const d of ['UNL-191', 'UNL-231']) {
      expect(cardKind(d), d).toBe('legend')
      expect(cardCost(d), d).toEqual({ mana: 0 })
    }
  })

  test('★★★阈值三档:经验 5 / 6 / 7(边界值本身不许漏,铁律97)', () => {
    const board = (): GameObject[] => [wuju('wu', 'UNL-191'), plain('u1', 'BLK', P1, { baseMight: 3 })]
    expect(might(at(5, board()), 'u1')).toBe(3)          
    expect(might(at(6, board()), 'u1')).toBe(4)        
    expect(might(at(7, board()), 'u1')).toBe(4)         
  })

  test('★★★是【持续】不是一次性:经验掉回 5 就没了(㊼/⑲)', () => {
    const objs = [wuju('wu', 'UNL-191'), plain('u1', 'BLK', P1, { baseMight: 3 })]
    expect(might(at(11, objs), 'u1')).toBe(4)
    expect(might(at(5, objs), 'u1')).toBe(3)
  })

  test('★★「你的」:对手的单位不吃(㉖ 身份判据)', () => {
    const s = at(6, [wuju('wu', 'UNL-191'), plain('u1', 'BLK', P1, { baseMight: 3 }), plain('e1', 'BLK', P2, { baseMight: 3 })])
    expect(might(s, 'u1')).toBe(4)
    expect(might(s, 'e1')).toBe(3)
  })

  test('★★经验跟着【无极宗师的控制者】走,不是场上谁都算', () => {
                                             
    const s0 = scene([wuju('wu', 'UNL-231', P2), plain('u1', 'BLK', P1, { baseMight: 3 }), plain('e1', 'BLK', P2, { baseMight: 3 })])
    const s = { ...s0, experience: { ...s0.experience, [P1]: 20, [P2]: 6 } }
    expect(might(s, 'e1')).toBe(4)
    expect(might(s, 'u1')).toBe(3)                           
  })

  test('★UNL-231 与 UNL-191 各自都生效(不是再版,两个号各登记一次)', () => {
    expect(might(at(6, [wuju('wu', 'UNL-231'), plain('u1', 'BLK', P1, { baseMight: 3 })]), 'u1')).toBe(4)
  })
})
