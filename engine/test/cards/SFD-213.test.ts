import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { cardKind, costModsFor, isArmamentDef, isPlainEquipmentDef } from '../../data/registry'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { INDICATOR_DEFIDS } from '../../data/cardCategories'
import { resetTurnLedgers } from '../../src/scoring/score'
import {
  allCostMods, forgeCostMods, ORNN_FORGE_DISCOUNT, SFD_213_CARD_EFFECT,
} from '../../data/cards/cost-modifiers'

                            
                                            
                                              
                                                              
  
                 
                                                       
                                                                           
                                               
                                                                    
                                                                                     
                                                          
                                                              
                                        
                                                     
                                                       
                                                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                             
function gearDefId(): string {
  const id = ['UNL-096', 'SFD-022', 'UNL-158', 'OGN-056'].find((x) => isPlainEquipmentDef(x))
  expect(id, '㊳ 前提:至少有一张真装备').toBeDefined()
  return id!
}

const unit = (oid: string, zone: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who,
  zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

   
            
                                                                     
                         
                                                                
   
function scene(opts: {
  readonly bf0Card?: string
  readonly bf1Card?: string
  readonly foeAtBf0?: boolean
} = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('mine', bfs[0]!, P1))
  if (opts.foeAtBf0 === true) put(unit('foe', bfs[0]!, P2))
  return {
    ...base,
    activePlayer: P1,
    phase: 'main',
    objects,
    zones,
    battlefieldCards: {
      [bfs[0]!]: { defId: opts.bf0Card ?? 'SFD-213', owner: P1 },
      [bfs[1]!]: { defId: opts.bf1Card ?? 'VEN-164', owner: P1 },
    },
  } as GameState
}

                     
const forge = (s: GameState, defId: string, who: PlayerId = P1): readonly unknown[] =>
  forgeCostMods(s, who, defId, isPlainEquipmentDef)

describe('★ 前提:它是战场卡;卡文取自 errata;常量', () => {
  test('★类别、折扣、卡文', () => {
    expect(cardKind('SFD-213'), '★战场卡').toBe('battlefield')
    expect(ORNN_FORGE_DISCOUNT, '㊶ 折扣从常量取').toBe(1)
    expect(SFD_213_CARD_EFFECT, '★★卡文取自 errata:「非指示物」在中间,不在句尾')
      .toContain('第一件友方非指示物装备')
  })

  test('★★★★★「非指示物装备」判据:装备 true;单位/法术/战场卡 false', () => {
    expect(isPlainEquipmentDef(gearDefId()), '★真装备').toBe(true)
    expect(isPlainEquipmentDef('SFD-213'), '★战场卡不是装备').toBe(false)
    expect(isPlainEquipmentDef('OGN-156'), '★法术不是装备').toBe(false)
    expect(isPlainEquipmentDef('VEN-119'), '★单位不是装备').toBe(false)
  })

  test('★★【变化警报】「非指示物」那半现在是**空集限定** —— 这条断言就是它的哨兵', () => {
                                                                                
                                                             
                                                       
                                           
    const gearIndicators = [...INDICATOR_DEFIDS].filter((d) => cardKind(d) === 'equipment')
    expect(gearIndicators, '★卡池里没有指示物装备;它红了 = 该给「非指示物」那半补真用例了').toEqual([])
  })

  test('★★★★这条判据【真的被读了】:钩子说"不是装备" ⇒ 一条都不出', () => {
                                            
                                              
    const s = scene()
    expect(forge(s, gearDefId()), '前提自证:真判据下它是减的').toHaveLength(1)
    expect(forgeCostMods(s, P1, gearDefId(), () => false), '★钩子说不是 ⇒ 不减').toEqual([])
  })
})

describe('★★★★★★★ 「如果此战场受你控制」', () => {
  test('★★★★★★受我控制 ⇒ 减 {1},下限 0', () => {
    const s = scene()
    const bfs = zonesByKind(s, 'battlefield').map((z) => z.id as string)
    expect(controlledBattlefields(s, P1), '前提自证:bf0 归我').toContain(bfs[0])
    expect(forge(s, gearDefId())).toEqual([
      { kind: 'reduce', part: 'mana', mana: 1, floor: 0, source: 'SFD-213 奥恩的锻炉' },
    ])
  })

  test('★★★★★★★【不受我控制】就不减 —— 敌方单位一进来,减费当场没', () => {
    const s = scene({ foeAtBf0: true })
    const bfs = zonesByKind(s, 'battlefield').map((z) => z.id as string)
                                                              
    expect(controlledBattlefields(s, P1), '前提自证:派生轨下争夺中 ⇒ 无人控制').not.toContain(bfs[0])
    expect(forge(s, gearDefId()), '★没控制权 ⇒ 不减').toEqual([])
  })

  test('★★★★★★★㉓ 错位场景:【对手】的装备不吃我这处锻炉', () => {
                                                                   
    const s = scene()
    expect(forge(s, gearDefId(), P1), '前提自证:我这边是减的').toHaveLength(1)
    expect(forge(s, gearDefId(), P2), '★对手不控制这处 ⇒ 他打装备不减').toEqual([])
  })

  test('★★★★★★【摆的是别的战场卡】就不减(㊵ 换一张问,答案就变)', () => {
    const s = scene({ bf0Card: 'VEN-164' })
    expect(forge(s, gearDefId()), '★这处摆的是沙蚀墓穴,不是锻炉').toEqual([])
                                                  
    const s2 = scene({ bf0Card: 'VEN-164', bf1Card: 'SFD-213' })
    expect(forge(s2, gearDefId()), '★★摆对了卡但那处不受我控制 ⇒ 还是不减').toEqual([])
  })

  test('★★★★【逐处判】两处都是锻炉且都受我控制 ⇒ 两条独立减费', () => {
    const s0 = scene({ bf1Card: 'SFD-213' })
    const bfs = zonesByKind(s0, 'battlefield').map((z) => z.id as string)
                            
    const extra = unit('mine2', bfs[1]!, P1)
    const s = {
      ...s0,
      objects: { ...s0.objects, mine2: extra },
      zones: { ...s0.zones, [bfs[1]!]: { ...s0.zones[bfs[1]! as never]!, contents: ['mine2'] } },
    } as GameState
    expect(controlledBattlefields(s, P1), '前提自证:两处都归我').toHaveLength(2)
    expect(forge(s, gearDefId()), '★两处锻炉 = 两条(同 VEN-164 的处置)').toHaveLength(2)
  })
})

describe('★★★★★★★ 「每回合打出的第一件」= 第十本回合账', () => {
  const withLedger = (s: GameState, who: PlayerId): GameState =>
    ({ ...s, playedEquipmentThisTurn: { [who as string]: true as const } }) as GameState

  test('★★★★★★★本回合已打过装备 ⇒ 不再减', () => {
    const s = scene()
    expect(forge(s, gearDefId()), '前提自证:账空时是减的').toHaveLength(1)
    expect(forge(withLedger(s, P1), gearDefId()), '★第一件已经打过了').toEqual([])
  })

  test('★★★★★★㉓ 错位场景【读取侧】:账记在【对手】名下不该挡住我', () => {
                                  
    const s = scene()
    expect(forge(withLedger(s, P2), gearDefId(), P1), '★他打过不算我打过').toHaveLength(1)
  })

  test('★★★★★★★【读=不消费】:连查两次答案一样(state 一点没变)', () => {
    const s = scene()
    const a = forge(s, gearDefId())
    const b = forge(s, gearDefId())
    expect(a, '★★枚举手牌会反复调这里,不能一查就用光').toEqual(b)
    expect(s.playedEquipmentThisTurn, '★查询不写账').toBeUndefined()
  })
})

describe('★★★★★★★ 第十本回合账 playedEquipmentThisTurn:写/键/清', () => {
                                                        
  function played(defId: string, player = P1, deps: Parameters<typeof applyEvents>[2] = {}): GameState {
    const base = scene()
    const card: GameObject = {
      oid: asObjId('card'), defId, owner: player, controller: player,
      zone: asZoneId(`base:${player}`), baseMight: 0, baseKeywords: [],
      baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
    }
    const s = { ...base, objects: { ...base.objects, card } } as GameState
    const ev = { kind: 'playUnit', unit: asObjId('card'), player } as GameEvent
    return applyEvents(s, [ev], deps).state
  }

  test('★★★★★★★写入:打出非指示物装备 ⇒ 置旗(键=玩家)', () => {
    const s = played(gearDefId(), P1, { isPlainEquipment: isPlainEquipmentDef })
    expect(s.playedEquipmentThisTurn?.[P1 as string]).toBe(true)
  })

  test('★★★★★打出【非装备】不记', () => {
    const s = played('VEN-119', P1, { isPlainEquipment: isPlainEquipmentDef })
    expect(s.playedEquipmentThisTurn?.[P1 as string]).toBeUndefined()
  })

  test('★★★★★★㉓ 错位场景【写入侧】:对手打出的装备记在【对手】名下', () => {
    const s = played(gearDefId(), P2, { isPlainEquipment: isPlainEquipmentDef })
    expect(s.playedEquipmentThisTurn?.[P2 as string], '★记在打出者名下').toBe(true)
    expect(s.playedEquipmentThisTurn?.[P1 as string], '★不该记在回合玩家名下').toBeUndefined()
  })

  test('★★★★★★★deps 缺省不给 ⇒ 行为完全不变(一个都不记)', () => {
    const s = played(gearDefId(), P1)                       
    expect(s.playedEquipmentThisTurn?.[P1 as string], '★通道关闭').toBeUndefined()
  })

  test('★★★写=置旗,幂等:打出第二件还是 true,不会变计数', () => {
    let s = played(gearDefId(), P1, { isPlainEquipment: isPlainEquipmentDef })
    const ev = { kind: 'playUnit', unit: asObjId('card'), player: P1 } as GameEvent
    s = applyEvents(s, [ev], { isPlainEquipment: isPlainEquipmentDef }).state
    expect(s.playedEquipmentThisTurn?.[P1 as string]).toBe(true)
  })

  test('★★★★★★清=回合末:`resetTurnLedgers` 把它清空', () => {
    const s = played(gearDefId(), P1, { isPlainEquipment: isPlainEquipmentDef })
    expect(s.playedEquipmentThisTurn?.[P1 as string], '前提自证:先记上').toBe(true)
    expect(resetTurnLedgers(s).playedEquipmentThisTurn, '★换回合就归零').toEqual({})
  })

  test('★★★★★★★【第九本与第十本是两笔账】互不代替', () => {
    const gear = gearDefId()
                     
    const a = played(gear, P1, { isPlainEquipment: isPlainEquipmentDef })
    expect(a.playedEquipmentThisTurn?.[P1 as string], '★第十本记上').toBe(true)
    expect(a.playedArmamentThisTurn?.[P1 as string], '★第九本没被顺手写').toBeUndefined()
                                         
    expect(isArmamentDef(gear), '㊳ 前提:挑的这张装备【也带武装标签】,两本账才分得出来').toBe(true)
    const b = played(gear, P1, { isArmament: isArmamentDef })
    expect(b.playedArmamentThisTurn?.[P1 as string], '★第九本记上').toBe(true)
    expect(b.playedEquipmentThisTurn?.[P1 as string], '★第十本没被顺手写').toBeUndefined()
                  
    const c = played(gear, P1, { isArmament: isArmamentDef, isPlainEquipment: isPlainEquipmentDef })
    expect(c.playedArmamentThisTurn?.[P1 as string]).toBe(true)
    expect(c.playedEquipmentThisTurn?.[P1 as string]).toBe(true)
  })
})

describe('★★★★★★ 接线:可选入参的回归闸 + 生产侧真接上', () => {
  test('★★★★★★★`allCostMods` **不传**第七参 ⇒ 锻炉一条都不出(接线前行为完全不变)', () => {
    const s = scene()
    const withoutHook = allCostMods(s, P1, gearDefId(), () => false)
    expect(withoutHook.filter((m) => m.source === 'SFD-213 奥恩的锻炉'), '★缺省恒 false').toEqual([])
    const withHook = allCostMods(s, P1, gearDefId(), () => false, undefined, () => [], isPlainEquipmentDef)
    expect(withHook.filter((m) => m.source === 'SFD-213 奥恩的锻炉'), '★★传了才出').toHaveLength(1)
  })

  test('★★★★★★★生产侧 `costModsFor` 真的接上了(registry 一路到底)', () => {
    const s = scene()
    const mods = costModsFor(s, P1, gearDefId())
    expect(mods.filter((m) => m.source === 'SFD-213 奥恩的锻炉'), '★生产查询里就有').toHaveLength(1)
                       
    const after = { ...s, playedEquipmentThisTurn: { [P1 as string]: true as const } } as GameState
    expect(costModsFor(after, P1, gearDefId()).filter((m) => m.source === 'SFD-213 奥恩的锻炉'))
      .toEqual([])
  })
})
