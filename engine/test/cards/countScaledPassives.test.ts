import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind, cardCost, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { COUNT_SCALED_DEFIDS, VALUED_KEYWORD_PAYOUT } from '../../data/cards/count-scaled-passives'
import { activeTriggers } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { BUFF_COUNTER } from '../../src/keywords/buff'

                                 
  
                   
                                      
                                               
                                                   
                     
  
                                                                 
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const BASE = `base:${P1}`

function card(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function unit(oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function gear(oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'UNL-088', owner: ctrl, controller: ctrl, zone: asZoneId(`base:${ctrl}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
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
                               
const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[oid]!).actual

describe('★「每有一个X,我便获得[M]+N」一族(第137轮)', () => {
                                                        
  setCardPassiveProvider(cardPassives)

  test('前提:本族登记齐,战力/费用照卡面(不是我编的)', () => {
                                                    
                            
    expect(COUNT_SCALED_DEFIDS.slice().sort())
      // OGN-055 / UNL-154 / OGS-004 = 第161轮的条件被动,用例在 longtail9.test.ts
      // OGN-028 = 第165轮(把你的分数加到我的战力上),用例在 longtail13.test.ts
      // VEN-076 = 第315轮(维修专家:同一条数法,但产出的是 [强攻N] 而不是战力)
      // ★第510轮 +VEN-097 小蜘蛛(此处每有一名【同名的其他】友方单位则 [S]+1;
      //   ⚠️它是本族**第一张带「其他」的** —— 前几张都没写、所以都含自己)
      // ★第531轮 +SFD-068 机械迷(贴在我身上的每件武装再给一份基础加成)——
      //   ⚠️ 它数的不是"有几个",而是【加成之和】;族里 OGN-028(分数)/OGS-004(阈值给4)
      //   早就不是纯个数了,本族真正的口径是「按盘面现算的自身战力被动」。
      // ★第540轮 +SFD-131 远古战狂(此处每有一名敌方单位就给一点[强攻])——
      //   ⚠️ 它与 VEN-076 是**同一条产出形态**([强攻N])的第二张,但计数口径完全不同:
      //   那张数"你控制的装备"(全场、按控制者),这张数"**此处**的敌方单位"(同区、控制者不是我)。
      // ★第585轮 +OGN-109 蒙多医生 —— 本族**第一条数【区域里的卡】**的(废牌堆张数),
      //   前面几张数的都是场上物件。⚠️「提升…数值等同于X」是 +X(addMight),不是 raiseTo。
      .toEqual(['OGN-028', 'OGN-055', 'OGN-065', 'OGN-109', 'OGN-240', 'OGS-004', 'SFD-068', 'SFD-085',
        'SFD-131', 'SFD-159', 'UNL-076', 'UNL-154', 'VEN-076', 'VEN-097', 'VEN-109', 'VEN-182'])
    expect(specLookup('OGN-240').baseMight).toBe(5)                  
    expect(specLookup('SFD-085').baseMight).toBe(4)
    expect(specLookup('UNL-076').baseMight).toBe(2)
    expect(specLookup('VEN-097').baseMight, '★510 卡面 1 战力').toBe(1)
    expect(cardCost('OGN-240').pips).toEqual([['yellow']])
    expect(cardCost('SFD-085').pips ?? []).toHaveLength(0)
    for (const id of COUNT_SCALED_DEFIDS) expect(cardKind(id)).toBe('unit')
  })

  test('★瑟提 OGN-240:一个都没有时就是印刷战力(不产出 +0 的效果)', () => {
    expect(mightOf(scene([card('x', 'OGN-240')]), 'x')).toBe(5)
  })

  test('★瑟提:数的是【我所处战场】上带增益的【友方单位】,含我自己', () => {
    const st = scene([
      card('x', 'OGN-240', P1, { counters: { [BUFF_COUNTER]: 1 } }), // 我自己也带增益 ⇒ 算 1
      unit('mate', P1, { counters: { [BUFF_COUNTER]: 1 } }),          // 同战场友方带增益 ⇒ 算 1
      unit('bare', P1),                                              // 没增益 ⇒ 不算
      unit('foe', P2, { counters: { [BUFF_COUNTER]: 1 } }),           // 敌方 ⇒ 不算
      unit('far', P1, { zone: asZoneId(BF1), counters: { [BUFF_COUNTER]: 1 } }), // 别处 ⇒ 不算
    ])
                                                                    
                                                       
    expect(mightOf(st, 'x')).toBe(5 + 1 + 2)
  })

  test('★瑟提:被动走【效果层】,不是把 baseMight 改掉(条件消失就退回去)', () => {
                                                         
    const st = scene([card('x', 'OGN-240'), unit('mate', P1, { counters: { [BUFF_COUNTER]: 1 } })])
    const once = recomputeContinuous(st)
    const twice = recomputeContinuous(once)
    expect(effectiveMight(once.objects['x']!).actual).toBe(6)
    expect(effectiveMight(twice.objects['x']!).actual).toBe(6)       
    expect(twice.objects['x']!.baseMight).toBe(5)                       
  })

  test('★奥恩 SFD-085:「每有一件友方装备」【没写位置】—— 基地上的装备也要数', () => {
                                 
                                                      
    const st = scene([card('x', 'SFD-085'), gear('g1'), gear('g2'), gear('foeGear', P2)])
    expect(mightOf(st, 'x')).toBe(4 + 2)                 
  })

  test('★奥恩:数的是【装备】不是单位(类型判据不能漏)', () => {
    const st = scene([card('x', 'SFD-085'), unit('mate'), unit('mate2')])
    expect(mightOf(st, 'x')).toBe(4)
  })

  test('★花瓣仙子 UNL-076:数【我所处战场】上我控制的带[瞬息]单位', () => {
    const sprite = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}) =>
      unit(oid, ctrl, { defId: 'token:精灵', baseKeywords: ['瞬息'], ...extra })
    const st = scene([
      card('x', 'UNL-076'),
      sprite('s1'), sprite('s2'),
      sprite('sFar', P1, { zone: asZoneId(BF1) }), // 别处 ⇒ 不算
      sprite('sFoe', P2),                          // 敌方 ⇒ 不算
      unit('plain'),                               // 没瞬息 ⇒ 不算
    ])
    expect(mightOf(st, 'x')).toBe(2 + 2)
  })

  test('★三张互不干扰:同场下各按各的判据算(没有把别家的计数串到一起)', () => {
    const st = scene([
      card('a', 'OGN-240'),                                   // 数带增益的友方单位
      card('b', 'SFD-085'),                                   // 数友方装备
      unit('buffed', P1, { counters: { [BUFF_COUNTER]: 1 } }),
      gear('g1'),
    ])
    expect(mightOf(st, 'a')).toBe(5 + 1)                     
    expect(mightOf(st, 'b')).toBe(4 + 1)          
  })
})

                                                                          
                                                   
            
                                                        
                                         
                                                
                                                                          
describe('★俄洛伊 VEN-109 / VEN-182(第140轮)', () => {
  setCardPassiveProvider(cardPassives)
  const BF1 = 'battlefield:shared:1'
  const evConquer = (bf = BF0): GameEvent => ({ kind: 'conquer', player: P1, battlefield: bf })
  const evHold = (bf = BF0): GameEvent => ({ kind: 'hold', player: P1, battlefield: bf })
  const evPlay = (self: string): GameEvent => ({ kind: 'playUnit', unit: asObjId(self), player: P1 })
  const token = (oid: string, defId: string, types: readonly ('unit' | 'equipment')[], ctrl = P1, extra: Partial<GameObject> = {}) =>
    unit(oid, ctrl, { defId, baseTypes: types, ...extra })

  function firing(st: GameState, self: string, ev: GameEvent) {
    return activeTriggers(st).filter(
      (t) => t.sourceOid === asObjId(self) && t.event === ev.kind && (t.filter?.(ev, st) ?? true))
  }

  test('★两版号逐字可复算:费用/战力/类别全同(铁律72,不是注释里说说)', () => {
    expect(CARD_COSTS['VEN-109']).toEqual(CARD_COSTS['VEN-182'])
    expect(specLookup('VEN-109').baseMight).toBe(specLookup('VEN-182').baseMight)
    expect(cardKind('VEN-109')).toBe(cardKind('VEN-182'))
    expect(specLookup('VEN-109').baseMight).toBe(4)        
  })

  test('★★三个时机都真的会响,且共用同一个 abilityKey', () => {
    const st = scene([card('x', 'VEN-109')])                  
    const p = firing(st, 'x', evPlay('x'))
    const c = firing(st, 'x', evConquer())
    const h = firing(st, 'x', evHold())
    expect(p).toHaveLength(1)
    expect(c).toHaveLength(1)                         
    expect(h).toHaveLength(1)
    expect(new Set([p[0]!.abilityKey, c[0]!.abilityKey, h[0]!.abilityKey]).size).toBe(1)
  })

  test('★征服/据守的是【别处】战场 ⇒ 不响(我不在那儿)', () => {
    const st = scene([card('x', 'VEN-109')])
    expect(firing(st, 'x', evConquer(BF1))).toHaveLength(0)
    expect(firing(st, 'x', evHold(BF1))).toHaveLength(0)
  })

  test('★触手:1[M]、休眠进场、且带【比尔吉沃特】标签(漏标签只是"少半张脸")', () => {
    const st = scene([card('x', 'VEN-109')])
    const t = firing(st, 'x', evPlay('x'))[0]!
    const s2 = applyEvents(st, t.effect(st, evPlay('x'), {}), {}).state
    const tent = Object.values(s2.objects).find((o) => o.defId === 'token:触手')!
    expect(tent.baseMight).toBe(1)
    expect(tent.status.dormant).toBe(true)             
    expect((tent as { baseTags?: readonly string[] }).baseTags).toContain('比尔吉沃特')
    expect(tent.zone).toBe(BF0)            
  })

  test('★被动:数【指示物单位】—— 金币是装备指示物,不算;普通单位也不算', () => {
    const st = scene([
      card('x', 'VEN-109'),
      token('t1', 'token:触手', ['unit']),
      token('t2', 'token:随从', ['unit']),
      token('gold', 'token:金币', ['equipment']),        // 指示物但不是单位 ⇒ 不算
      unit('normal'),                                    // 单位但不是指示物 ⇒ 不算
      token('foeTok', 'token:触手', ['unit'], P2),       // 敌方的 ⇒ 不算
    ])
    expect(mightOf(st, 'x')).toBe(4 + 2)
  })

  test('★被动:没写位置 ⇒ 基地上的指示物单位也要数', () => {
    const st = scene([card('x', 'VEN-109'),
      token('atBase', 'token:触手', ['unit'], P1, { zone: asZoneId(`base:${P1}`) })])
    expect(mightOf(st, 'x')).toBe(4 + 1)
  })

  test('★再版号 VEN-182 走同一份实现:三时机与被动都一致', () => {
    const st = scene([card('y', 'VEN-182'), token('t1', 'token:触手', ['unit'])])
    expect(firing(st, 'y', evConquer())).toHaveLength(1)
    expect(firing(st, 'y', evHold())).toHaveLength(1)
    expect(mightOf(st, 'y')).toBe(4 + 1)
  })
})

                                                           
  
                              
                                                            
                                     
                                
                                                                 
                                              
describe('★★★★★★ VEN-076 维修专家:数装备 → 给【强攻N】(不是直接加战力)', () => {
  const scen = (gears: number, status: GameObject['status'] = {}): GameState =>
    scene([
      card('me', 'VEN-076', P1, { status }),
      ...Array.from({ length: gears }, (_, i) => gear(`g${i}`)),
    ])

  test('★前提:3费 0pip 橙 3[S] 单位;[强攻] 是技能文本 ⇒ 不进 CARD_KEYWORDS(㊶⑪)', () => {
    expect(CARD_COSTS['VEN-076']).toEqual({ mana: 3, pips: 0, colors: ['orange'] })
    expect(cardKind('VEN-076')).toBe('unit')
    expect(cardCost('VEN-076'), '进了 UNIT_COST').toEqual({ mana: 3 })
    expect(specLookup('VEN-076').baseMight, '卡面 3,不是被动加成后的数').toBe(3)
    expect(specLookup('VEN-076').baseKeywords ?? [], '★不印任何关键词').toEqual([])
  })

  test('★★★★★★命门:【进攻时】才吃到强攻,防守/闲置一分都不给', () => {
    expect(mightOf(scen(2, { attacking: true }), 'me'), '两件装备 ⇒ 强攻2 ⇒ 3+2').toBe(5)
    expect(mightOf(scen(2, { defending: true }), 'me'), '★防守时不给(§807.1.c)').toBe(3)
    expect(mightOf(scen(2), 'me'), '★没有战斗身份也不给').toBe(3)
  })

  test('★★★数的是【装备件数】,一件一点', () => {
    expect(mightOf(scen(0, { attacking: true }), 'me'), '0 件 ⇒ 不产出效果').toBe(3)
    expect(mightOf(scen(1, { attacking: true }), 'me')).toBe(4)
    expect(mightOf(scen(3, { attacking: true }), 'me')).toBe(6)
  })

  test('★★★★「你控制的」按【控制者】:对手的装备不算(㉓ 错位场景)', () => {
    const s = scene([
      card('me', 'VEN-076', P1, { status: { attacking: true } }),
      gear('mine'), gear('foeGear', P2),
    ])
    expect(mightOf(s, 'me'), '★只数我这边那一件').toBe(4)
  })

  test('★★★★★产出的是【关键词】不是战力效果 —— 直接看效果本身', () => {
    const effs = cardPassives(scen(2, { attacking: true }).objects[asObjId('me')]!, scen(2))
    expect(effs, '正好一条').toHaveLength(1)
    expect(effs[0]!.modification).toEqual({ kind: 'grantKeyword', keyword: '强攻2' })
  })

  test('★★★★★★㉖ 回归闸:本族【其余每一张】产出的仍然是 addMight,一张都没被带偏', () => {
                                            
      
                                                   
                                               
                                                        
                                                                 
                                   
                                                
    const melting = (id: string): GameState => {
      const base = scene([
        card('x', id, P1, { counters: { [BUFF_COUNTER]: 1 }, status: { attacking: true } }),
        gear('g0'),
        unit('mate', P1, { counters: { [BUFF_COUNTER]: 1 } }),
        unit('foe', P2),
        card('twin', id, P1),
      ])
      return { ...base, scores: { [P1 as string]: 2, [P2 as string]: 0 } } as GameState
    }
    const others = COUNT_SCALED_DEFIDS.filter((id) => !(id in VALUED_KEYWORD_PAYOUT))
    expect(others.length, '㊳ 前提:老卡不止一张').toBeGreaterThan(5)
    expect(Object.keys(VALUED_KEYWORD_PAYOUT).slice().sort(), '★前提:给关键词的就这两张')
      .toEqual(['SFD-131', 'VEN-076'])
    let produced = 0
    for (const id of others) {
      const s = melting(id)
      for (const e of cardPassives(s.objects[asObjId('x')]!, s)) {
        produced += 1
        expect(e.modification.kind, `${id} 产出的仍该是 addMight`).toBe('addMight')
      }
    }
    expect(produced, '★★防空转:大杂烩盘面下至少七张真产出了').toBeGreaterThanOrEqual(7)
                                                      
    const ornn = (status: GameObject['status']): number =>
      mightOf(scene([card('o', 'SFD-085', P1, { status }), gear('g0'), gear('g1')]), 'o')
    expect(ornn({ attacking: true }), '奥恩进攻 4+2').toBe(6)
    expect(ornn({}), '★奥恩【没有战斗身份也照加】—— 与维修专家的分水岭').toBe(6)
  })
})

                                                           
  
                                                                            
                                                                
                                                              
                                                                                 
                            
describe('★★★★★★★ 被动 provider 给的 [强攻]/[坚守] 必须真的加战力', () => {
  test('★★★★★★群体被动:法荣队长 OGN-015 给【此处其他友方】的 [强攻] 进攻时真涨战力', () => {
                                                 
    const s = scene([
      card('cap', 'OGN-015'),
      unit('mate', P1, { status: { attacking: true } }), // 此处其他友方,正在进攻
      unit('idle', P1),                                   // 同上但没有战斗身份
    ])
    expect(mightOf(s, 'mate'), '★2 + 强攻1 = 3').toBe(3)
    expect(mightOf(s, 'idle'), '没进攻 ⇒ 不吃加成(§807.1.c)').toBe(2)
    expect(mightOf(s, 'cap'), '★「其他」⇒ 队长自己不给自己').toBe(specLookup('OGN-015').baseMight)
  })

  test('★★★★★关键词本身照旧进 derived(布尔消费者那条路没被动过)', () => {
    const s = recomputeContinuous(scene([
      card('cap', 'OGN-015'), unit('mate', P1, { status: { attacking: true } }),
    ]))
    expect(s.objects[asObjId('mate')]!.derived?.keywords).toContain('强攻')
  })
})


                                                            
  
                                                 
                                                                          
                                           
                                                       
                                                    
  
                                                  
                                                           
describe('★★★★★★ SFD-131 远古战狂:数【此处的敌方单位】→ 给【强攻N】', () => {
  const me = (extra: Partial<GameObject> = {}): GameObject =>
    card('me', 'SFD-131', P1, { status: { attacking: true }, ...extra })

  test('★前提:5费 0pip 紫 4[S] 单位;印的是 [急速],[强攻] 是技能文本【不印刷】(②㊶)', () => {
    expect(CARD_COSTS['SFD-131']).toEqual({ mana: 5, pips: 0, colors: ['purple'] })
    expect(cardKind('SFD-131')).toBe('unit')
    expect(cardCost('SFD-131'), '进了 UNIT_COST').toEqual({ mana: 5 })
    expect(specLookup('SFD-131').baseMight, '卡面 4,不是被动加成后的数').toBe(4)
    expect(specLookup('SFD-131').baseKeywords ?? [], '★只印 [急速]').toEqual(['急速'])
                                                         
    expect(specLookup('VEN-168').baseKeywords ?? [], '★对照:这张才是把 [强攻2] 印在卡面的')
      .toContain('强攻2')
  })

  test('★★★★★★命门:【进攻时】才吃到强攻,防守/闲置一分都不给(与 VEN-076 同解)', () => {
    const foes = [unit('f0', P2), unit('f1', P2)]
    expect(mightOf(scene([me(), ...foes]), 'me'), '此处两名敌方 ⇒ 强攻2 ⇒ 4+2').toBe(6)
    expect(mightOf(scene([me({ status: { defending: true } }), ...foes]), 'me'), '★防守不给').toBe(4)
    expect(mightOf(scene([me({ status: {} }), ...foes]), 'me'), '★没有战斗身份也不给').toBe(4)
  })

  test('★★★★★★分野一【位置门】:只数【此处】—— 别的战场上的敌方一个都不算', () => {
    const s = scene([
      me(),
      unit('here', P2),                              // 同区 ⇒ 算
      unit('there', P2, { zone: asZoneId(BF1) }),    // 另一个战场 ⇒ 不算
      unit('atBase', P2, { zone: asZoneId(`base:${P2}`) }), // 敌方基地 ⇒ 不算
    ])
    expect(mightOf(s, 'me'), '★只有同区那一名算 ⇒ 4+1').toBe(5)
  })

  test('★★★★★★分野二【阵营门】:友方不算,哪怕挤满此处', () => {
    const s = scene([me(), unit('mate0'), unit('mate1'), unit('mate2')])
    expect(mightOf(s, 'me'), '★一名敌方都没有 ⇒ 不产出效果').toBe(4)
  })

  test('★★★★★★【敌方】按【控制者】不按拥有者 —— 两份错位样本各换一次答案', () => {
                                  
    const stolen = scene([me(), unit('stolen', P1, { owner: P2 })])
    expect(mightOf(stolen, 'me'), '★夺过来的不算敌方').toBe(4)
                                 
    const lost = scene([me(), unit('lost', P2, { owner: P1 })])
    expect(mightOf(lost, 'me'), '★被夺走的算敌方 ⇒ 4+1').toBe(5)
  })

  test('★★★★★【类别门】:「单位」二字挡住装备,同区的敌方装备不算', () => {
    const s = scene([
      me(),
      gear('foeGear', P2, { zone: asZoneId(BF0) }), // 同区、是敌方的,但不是单位
      unit('foeUnit', P2),
    ])
    expect(mightOf(s, 'me'), '★只数那一名单位').toBe(5)
  })

  test('★★★★★我站在【基地】时:同区没有敌方单位 ⇒ 一分不给(不用特判也对)', () => {
    const s = scene([me({ zone: asZoneId(BASE) }), unit('f0', P2), unit('f1', P2)])
    expect(mightOf(s, 'me'), '★战场上那两名与我不同区').toBe(4)
  })

  test('★★★★★产出的是【关键词】不是战力效果 —— 直接看效果本身', () => {
    const s = scene([me(), unit('f0', P2), unit('f1', P2), unit('f2', P2)])
    const effs = cardPassives(s.objects[asObjId('me')]!, s)
    expect(effs, '正好一条').toHaveLength(1)
    expect(effs[0]!.modification).toEqual({ kind: 'grantKeyword', keyword: '强攻3' })
                                       
    expect(effs[0]!.modification).not.toEqual({ kind: 'addMight', delta: 3 })
  })

  test('★★★★★★与 VEN-076:产出形态【同解】、计数口径【不同解】', () => {
                           
    const withGear = (defId: string): GameObject[] =>
      [card('x', defId, P1, { status: { attacking: true } }), gear('g0'), unit('foe', P2)]
    const kindOf = (defId: string): string => {
      const s = scene(withGear(defId))
      return cardPassives(s.objects[asObjId('x')]!, s)[0]!.modification.kind
    }
    expect([kindOf('VEN-076'), kindOf('SFD-131')], '★两张都给关键词')
      .toEqual(['grantKeyword', 'grantKeyword'])
                                                       
                                 
    const s2 = scene([gear('g0'), gear('g1')])
    const at = (defId: string): number => {
      const st = scene([card('x', defId, P1, { status: { attacking: true } }), ...Object.values(s2.objects)])
      return effectiveMight(recomputeContinuous(st).objects[asObjId('x')]!).actual
    }
    expect(at('VEN-076'), '维修专家:两件装备 ⇒ 3+2').toBe(5)
    expect(at('SFD-131'), '★远古战狂:装备一件都不数 ⇒ 光杆 4').toBe(4)
  })
})
