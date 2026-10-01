import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKeywords } from '../../data/registry'
import { GEAR_CARDS } from '../../data/gearCards'
import { EQUIP_ABILITY_COST_MODS } from '../../data/cards/cost-modifiers'
import { equipCostOptions } from '../../src/keywords/equip'

                                                            
  
                                   
                                                         
                                                           
  
                                                                            
                                                      
                                                                               
                    
  
                                                           
                                                       
                                                      
  
                       
                                       
                                                              
                                     
  
                                                      
                                         
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const HOME = 'base:P1'                                                                     

function obj(oid: string, defId: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(HOME),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
                                                   
function scene(gearDef: string, might: number, mana: number): { st: GameState; forgeOid: string } {
  const base = createInitialState([P1, P2], 2)
  const forge = obj('forgeGuy', 'VEN-041', { baseMight: might, baseKeywords: ['百炼'] })
  const gear = obj('gear', gearDef, { baseTypes: ['equipment'] })
  const objects: Record<string, GameObject> = { ...base.objects, [forge.oid]: forge, [gear.oid]: gear }
  const z = base.zones[asZoneId(HOME)]!
  return {
    st: {
      ...base, activePlayer: P1, objects,
      zones: { ...base.zones, [asZoneId(HOME)]: { ...z, contents: [...z.contents, forge.oid, gear.oid] } },
      runePools: { ...base.runePools, [P1]: { mana, runes: { red: 9, blue: 9, green: 9, purple: 9, orange: 9, yellow: 9 } } },
    } as GameState,
    forgeOid: forge.oid as string,
  }
}
                                            
function forgeCands(st: GameState, forgeOid: string): string[] {
  const trigs = activeTriggers(st).filter((t) => t.id.startsWith('forge:'))
  expect(trigs.length, '★前提:百炼触发真的产出来了(为 0 说明景没搭起来,下面全部无效)').toBeGreaterThan(0)
  const ev = { kind: 'playUnit', unit: asObjId(forgeOid), player: P1 } as unknown as GameEvent
  const ch = trigs[0]!.nextChoice?.(st, ev, {})
  return (ch?.candidates ?? []).map((c) => c.id)
}
                                                    
function forgeSpend(st: GameState, forgeOid: string, gearOid: string): { mana?: number; pips?: readonly (readonly string[])[] } | undefined {
  const trigs = activeTriggers(st).filter((t) => t.id.startsWith('forge:'))
  const ev = { kind: 'playUnit', unit: asObjId(forgeOid), player: P1 } as unknown as GameEvent
  const evs = trigs[0]!.effect(st, ev, { forge0: gearOid })
  const spend = evs.find((e) => e.kind === 'spend') as { cost?: { mana?: number; pips?: readonly (readonly string[])[] } } | undefined
  return spend?.cost
}

describe('★1343 前提自证:载体是真的', () => {
  test('护手 UNL-188 印刷装配费 {3}{A},且在装配减费族表里', () => {
    expect(GEAR_CARDS['UNL-188']?.keywords, '印刷关键词').toEqual(['装配3A'])
    expect(equipCostOptions(GEAR_CARDS['UNL-188']?.keywords).parsed[0]?.cost).toEqual({ mana: 3, pips: [[]] })
    expect('UNL-188' in EQUIP_ABILITY_COST_MODS, '它自带「减去所选单位战力」那条改费').toBe(true)
  })
  test('锐雯 VEN-041 印刷表里带[百炼]', () => {
    expect(cardKeywords('VEN-041')).toContain('百炼')
  })
})

describe('★1343【缺陷 172】§821.1.c.2 百炼算装配费要吃改费技能', () => {
  test('① 战力 4 的百炼单位装护手:该付 0 法力(3 减 4,§356.6 不为负),不是 3', () => {
    const { st, forgeOid } = scene('UNL-188', 4, 9)
    expect(forgeCands(st, forgeOid), '★前提:护手在候选里').toContain('gear')
    const cost = forgeSpend(st, forgeOid, 'gear')
    expect(cost?.pips ?? [], '§821.1.c 百炼减掉那一枚[A]').toEqual([])
    expect(cost?.mana, '§821.1.c.2「视同选择了拥有[百炼]的单位」⇒ 减去它的战力 4').toBe(0)
  })

  test('② 法力 0 时护手仍该在百炼候选里(实付 0 法力)—— 后果比①重:选项直接消失', () => {
    const { st, forgeOid } = scene('UNL-188', 4, 0)
    expect(forgeCands(st, forgeOid), '§821.1.c.5 只有【真付不起】才不列').toContain('gear')
  })

  test('③ 防修过头:没有改费技能的普通装备,算价【原样照旧】', () => {
                                                           
                                                            
                                         
                                                    
                                               
    expect('SFD-102' in EQUIP_ABILITY_COST_MODS, '★前提:它没有自带改费').toBe(false)
    const printed = equipCostOptions(GEAR_CARDS['SFD-102']?.keywords).parsed[0]?.cost
    expect(printed, '★前提:它的印刷装配费解得出来').toBeDefined()
    expect((printed?.pips ?? []).some((p) => p.length === 0), '★前提:它【不含】[A](空数组 pip)').toBe(false)
    const { st, forgeOid } = scene('SFD-102', 4, 9)
    expect(forgeCands(st, forgeOid), '★前提:它在候选里').toContain('gear')
    const cost = forgeSpend(st, forgeOid, 'gear')
    expect(cost?.mana ?? 0, '法力那半不受影响').toBe(printed?.mana ?? 0)
    expect(cost?.pips ?? [], '§821.1.c.3 不含[A] ⇒ 一枚都不减,与印刷逐字相同').toEqual(printed?.pips ?? [])
  })
})
