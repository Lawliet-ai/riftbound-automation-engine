import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  EQUIPMENT_SPELLS, EQUIPMENT_SPELL_SPECS, EPHEMERAL_KEYWORD, equipmentTargets,
} from '../../data/cards/equipment-target-spells'
import { destroyableEquipment } from '../../data/cards/OGN-056'
import { pumpCandidates, PUMP_SPELLS } from '../../data/cards/pump-spells'

                                                    
                                      
                                                    
                                         
  
                 
                                                            
                                                     
                                             
                                                               
                                                          
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const gear = (oid: string, defId: string, owner: PlayerId, controller: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner, controller, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
})
const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

   
      
                                                                                     
                                              
                                                
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(gear('mineGear', 'G-mine', P1, P1, BF0))
  put(gear('stolen', 'G-stolen', P2, P1, BF0))                
  put(gear('foeGear', 'G-foe', P2, P2, BF0))
  put(gear('homeGear', 'G-home', P1, P1, `base:${P1}`))
  put(unit('u', P1, BF0))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const resolveOf = (defId: string, target: string, s: GameState): readonly unknown[] =>
  EQUIPMENT_SPELL_SPECS[defId]!.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target } as never)(s, {})

describe('★ 前提:类别 / 费用 / 印刷关键词 / 进表', () => {
                                                     
                                                              
                                                 
                                                  
  test('★★★★★★数量对齐:行表就这几张,多一张少一张都得红', () => {
    expect(EQUIPMENT_SPELLS.map((r) => r.defId).slice().sort()).toEqual(['SFD-135', 'UNL-070'])
  })

  test('★★★★★上游印刷费 ↔ 行表 `cost`(0 pip ⇒ 只写 mana)', () => {
    expect(CARD_COSTS['SFD-135']).toEqual({ mana: 1, pips: 0, colors: ['purple'] })
    expect(CARD_COSTS['UNL-070']).toEqual({ mana: 2, pips: 0, colors: ['blue'] })
    for (const r of EQUIPMENT_SPELLS) {
      expect(r.cost.mana, `${r.defId} 与卡面同价`).toBe(r.energy)
      expect(r.cost.pips, `${r.defId} 0 pip ⇒ 不写 pips`).toBeUndefined()
    }
  })

  test('★★★★★★【UNL-070 一个关键词都没印】别顺手给它加', () => {
    expect(cardKeywords('SFD-135'), '★这张印着[迅捷]').toEqual(['迅捷'])
    expect(cardKeywords('UNL-070'), '★★这张上游没有关键词横幅').toEqual([])
  })

  test('★★★★类别是法术、进了 `PLAY_SPECS`、`legalTargets` 必填', () => {
    for (const r of EQUIPMENT_SPELLS) {
      expect(cardKind(r.defId), `${r.defId}`).toBe('spell')
      expect(playSpecFor(r.defId), `${r.defId} 进表`).toBeDefined()
      expect(playSpecFor(r.defId)!.legalTargets, `${r.defId} legalTargets`).toBeDefined()
    }
  })
})

describe('★★★★★★★ 「一件装备」:没有敌我词、没有位置词', () => {
  test('★★★★★★四件装备全在候选里(含基地、含对手的)', () => {
    const c = equipmentTargets(scene())
    expect(c.slice().sort(), '★★基地里的 homeGear、对手的 foeGear 都算')
      .toEqual(['foeGear', 'homeGear', 'mineGear', 'stolen'])
  })

  test('★★★★★单位不是装备,选不了', () => {
    expect(equipmentTargets(scene()), '★单位被挡在外面').not.toContain('u')
  })

  test('★★★★★★收口自证:候选就是 `destroyableEquipment`(改那个函数会同时炸 OGN-056 与本族)', () => {
    const s = scene()
    expect(equipmentTargets(s)).toEqual(destroyableEquipment(s) as unknown as string[])
  })
})

describe('★★★★★★★ SFD-135:「返回【其所属】的手牌」', () => {
  test('★★★★★★★㉓【命门】`owner` 不是 `controller` —— 抢来的装备回【原主】手上', () => {
                                                               
    const s = scene()
    const o = s.objects['stolen' as ObjId]!
    expect([o.owner, o.controller], '前提自证:P2 拥有、P1 控制').toEqual([P2, P1])
    expect(resolveOf('SFD-135', 'stolen', s)).toEqual([
      { kind: 'zoneChange', obj: 'stolen', to: `hand:${P2}` },
    ])
  })

  test('★★★★★自己的装备回自己手上(两个字段相同的那档)', () => {
    expect(resolveOf('SFD-135', 'mineGear', scene())).toEqual([
      { kind: 'zoneChange', obj: 'mineGear', to: `hand:${P1}` },
    ])
  })

  test('★★★★★★★真流程 + §124:落地后**按 defId 在原主手牌里**找得到(原 oid 已不在)', () => {
    const s = scene()
    const after = applyEvents(s, resolveOf('SFD-135', 'stolen', s) as never, {}).state
    const hand = (after.zones[`hand:${P2}` as never]?.contents ?? []) as readonly ObjId[]
    expect(hand.map((oid) => after.objects[oid]?.defId), '★★按 defId 找(§124 换了新 oid)')
      .toContain('G-stolen')
    expect(after.objects['stolen' as ObjId], '★★★原 oid 已经不在场上了').toBeUndefined()
    expect(hand.length, '★进的是【原主】P2 的手牌').toBe(1)
    expect((after.zones[`hand:${P1}` as never]?.contents ?? []).length, '★★不是我的手牌').toBe(0)
  })
})

describe('★★★★★★★ UNL-070:「获得{{瞬息}}」—— 没写时限 ⇒ 永久', () => {
  test('★★★★★★★【命门】`permanent` 不是 `thisTurn`(§816 否则整张作废)', () => {
    const ev = resolveOf('UNL-070', 'foeGear', scene())[0] as { effect: { duration: string; modification: unknown } }
    expect(ev.effect.duration, '★卡文没写时限词 ⇒ 永久').toBe('permanent')
    expect(ev.effect.modification).toEqual({ kind: 'grantKeyword', keyword: EPHEMERAL_KEYWORD })
  })

  test('★★★★授予的是[瞬息],常量取自被测件(㊶)', () => {
    expect(EPHEMERAL_KEYWORD).toBe('瞬息')
  })
})

describe('★★★★★★ 结算侧再验 + 分辨断言', () => {
  test('★★★★★★结算时那件装备已经离场 ⇒ 一条都不发', () => {
    const s0 = scene()
    expect(resolveOf('SFD-135', 'stolen', s0), '前提自证:在场时是发的').toHaveLength(1)
    const gone = { ...s0, objects: { ...s0.objects } } as GameState
    delete (gone.objects as Record<string, GameObject>)['stolen']
    expect(resolveOf('SFD-135', 'stolen', gone), '★离场 ⇒ 不发').toEqual([])
    expect(resolveOf('UNL-070', 'stolen', gone), '★★另一张也一样').toEqual([])
  })

  test('★★★★★★结算时它【还在、但已不在场上】(被弹回手牌)⇒ 也不发', () => {
                                                             
                                             
                                             
    const s0 = scene()
    const inHand = {
      ...s0,
      objects: {
        ...s0.objects,
        stolen: { ...s0.objects['stolen' as ObjId]!, zone: asZoneId(`hand:${P2}`) },
      },
    } as GameState
    expect(inHand.objects['stolen' as ObjId], '前提自证:物件还在').toBeDefined()
    expect(equipmentTargets(inHand), '前提自证:但已不在候选里').not.toContain('stolen')
    expect(resolveOf('SFD-135', 'stolen', inHand), '★不在场上 ⇒ 不发').toEqual([])
    expect(resolveOf('UNL-070', 'stolen', inHand), '★★另一张也一样').toEqual([])
  })

  test('★★★★没选目标 ⇒ 不发', () => {
    for (const r of EQUIPMENT_SPELLS) {
      expect(EQUIPMENT_SPELL_SPECS[r.defId]!.makeResolve!({
        movedCardOid: asObjId('sp'), controller: P1,
      } as never)(scene(), {}), r.defId).toEqual([])
    }
  })

  test('★★★★★★分辨断言:与 `pump-spells` 的「单位或装备」那档【口径真的不同】', () => {
                                              
    const s = scene()
    const gearOrUnitRow = PUMP_SPELLS.find((r) => r.targets === 'battlefieldUnitOrGear')!
    const theirs = pumpCandidates(gearOrUnitRow, s, P1)
    expect(theirs, '★那档连单位一起算').toContain('u')
    expect(equipmentTargets(s), '★★本族只认装备').not.toContain('u')
    expect(theirs, '★★★那档有位置词 ⇒ 基地里的装备反而不算').not.toContain('homeGear')
    expect(equipmentTargets(s), '★★★★本族没有位置词 ⇒ 基地里的算').toContain('homeGear')
  })
})
