import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { computeCost } from '../../src/game/costPipeline'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  VEN_096, SFD_012, VEN_064, SFD_103,
  VEN_096_STEP, SFD_012_STEP, SFD_012_FLOOR, VEN_064_STEP, SFD_103_STEP, MIGHTY_THRESHOLD,
  shadowbladeCostMods, batteringRamCostMods, plazaGuardCostMods, tellstonesCostMods,
  controlledEquipmentCount, controlledMightyCount, LONGTAIL35_DEFIDS,
} from '../../data/cards/longtail-35'
import { sameNameCountInDiscard } from '../../data/cards/same-name'
import { allCostMods, noxianRecruitCostMods } from '../../data/cards/cost-modifiers'
import { lissandraCostMods } from '../../data/cards/longtail-2'

                                                      
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const isSpell = (): boolean => false

function obj(id: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], confirmed = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, objects, zones,
    confirmedThisTurn: { ...base.confirmedThisTurn, [P1]: confirmed },
  }
}

describe('前提断言:四张卡的基线数值来自 CARD_COSTS(㊶ 先查表再落笔)', () => {
  test.each([
    ['VEN-096', VEN_096, 0], ['SFD-012', SFD_012, 0], ['VEN-064', VEN_064, 0], ['SFD-103', SFD_103, 2],
  ] as const)('%s 的 mana 与 pip 数与费用表一致', (id, card, pips) => {
    const row = CARD_COSTS[id]
    expect(row).toBeDefined()
    expect(card.energy).toBe(row!.mana)
    expect(row!.pips).toBe(pips)                     
  })

  test('对账清单就是这四张(能算出来的不手写:清单与四条函数一一对应)', () => {
    expect([...LONGTAIL35_DEFIDS].sort()).toEqual(['SFD-012', 'SFD-103', 'VEN-064', 'VEN-096'])
  })
})

describe('影刃潜伏者 VEN-096:废牌堆每有一张同名牌,费用减2', () => {
  const discard = (n: number): GameState =>
    scene(Array.from({ length: n }, (_, i) => obj(`d${i}`, 'VEN-096', `discard:${P1}`)))

  test('废牌堆里没有同名牌 → 不产减费(不是产一条 mana:0)', () => {
    expect(shadowbladeCostMods(discard(0), P1, 'VEN-096')).toEqual([])
  })

  test.each([[1, 2], [2, 4], [3, 6]])('废牌堆 %i 张同名 → 减 %i 点法力', (n, mana) => {
    const mods = shadowbladeCostMods(discard(n), P1, 'VEN-096')
    expect(mods).toHaveLength(1)
    expect(mods[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana })
    expect(mana).toBe(n * VEN_096_STEP)
  })

  test('★没写下限 ⇒ 减到 0 为止(五张同名把 5 费压到 0,不是压到 1)', () => {
    const mods = shadowbladeCostMods(discard(5), P1, 'VEN-096')
    expect(mods[0]).not.toHaveProperty('floor')
    expect(computeCost({ mana: VEN_096.energy ?? 0 }, mods).mana).toBe(0)
  })

  test('对手废牌堆里的同名牌不算(「你的」废牌堆)', () => {
    const s = scene([obj('x', 'VEN-096', `discard:${P2}`, { owner: P2, controller: P2 })])
    expect(shadowbladeCostMods(s, P1, 'VEN-096')).toEqual([])
  })

  test('不是这张卡就一条都不产', () => {
    expect(shadowbladeCostMods(discard(3), P1, 'OGN-195')).toEqual([])
  })

                                                              
                                                          
                                                     
  test('★同名但 defId 不同 → 算(比 defId 的话会答 0)', () => {
    const s = scene([obj('a', 'FAKE-002', `discard:${P1}`)])
    const stub = (d: string): string => (d === 'FAKE-001' || d === 'FAKE-002' ? '影刃潜伏者' : '别的')
    expect(sameNameCountInDiscard(s, P1, 'FAKE-001', stub)).toBe(1)
  })

                                                             
                                                        
  test('名字对不上的不算', () => {
    const s = scene([obj('a', 'FAKE-001', `discard:${P1}`)])
    const stub = (d: string): string => (d === 'FAKE-001' ? '别的名字' : '影刃潜伏者')
    expect(sameNameCountInDiscard(s, P1, 'FAKE-XXX', stub)).toBe(0)
  })
})

describe('★不许串味:影刃潜伏者 VEN-096 vs 裂魂者喇煞 OGN-195(同一堆废牌,一个数同名一个数全部)', () => {
                               
  const s = scene([
    obj('d0', 'VEN-096', `discard:${P1}`),
    obj('d1', 'OGN-012', `discard:${P1}`),
    obj('d2', 'OGN-084', `discard:${P1}`),
  ])

  test('影刃只认那一张同名的 → 减 2', () => {
    expect(shadowbladeCostMods(s, P1, 'VEN-096')[0]).toMatchObject({ mana: 1 * VEN_096_STEP })
  })

  test('喇煞把三张全数上 → 减 3(同一盘面两个答案,判据没串)', () => {
    expect(lissandraCostMods(s, P1, 'OGN-195')[0]).toMatchObject({ mana: 3 })
  })
})

describe('攻城锤 SFD-012:本回合每打出过一张牌费用减1,不得低于1', () => {
  test('本回合还没打出过牌 → 不产减费', () => {
    expect(batteringRamCostMods(scene([], 0), P1, 'SFD-012')).toEqual([])
  })

  test('打出过 3 张 → 一条 mana:3、floor:1 的减费;5 费降到 2', () => {
    const mods = batteringRamCostMods(scene([], 3), P1, 'SFD-012')
    expect(mods).toHaveLength(1)
    expect(mods[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana: 3 * SFD_012_STEP, floor: SFD_012_FLOOR })
    expect(computeCost({ mana: SFD_012.energy ?? 0 }, mods).mana).toBe(2)
  })

                                                       
  test.each([[3, 2], [4, 1], [5, 1], [9, 1]])('打出过 %i 张 → 费用 %i(下限死死卡在1)', (played, want) => {
    const mods = batteringRamCostMods(scene([], played), P1, 'SFD-012')
    expect(computeCost({ mana: SFD_012.energy ?? 0 }, mods).mana).toBe(want)
  })

  test('★下限只约束这一条:没有它就会被压到 0(证明 floor 真在起作用)', () => {
    const withFloor = batteringRamCostMods(scene([], 9), P1, 'SFD-012')
    const noFloor = withFloor.map((m) => { const { floor: _f, ...rest } = m as { floor?: number }; return rest })
    expect(computeCost({ mana: 5 }, withFloor as never).mana).toBe(SFD_012_FLOOR)
    expect(computeCost({ mana: 5 }, noFloor as never).mana).toBe(0)
  })

  test('数的是【我】打出的:对手打了牌不给我减费', () => {
    expect(batteringRamCostMods(scene([], 3), P2, 'SFD-012')).toEqual([])
  })
})

describe('★不许串味:攻城锤 SFD-012 vs 诺克萨斯新兵 OGN-012(同一本账,一个计数一个门槛)', () => {
  test.each([[1, 1], [3, 3], [6, 6]])('本回合打出过 %i 张:攻城锤减 %i、新兵永远减 2', (played, ramMana) => {
    const s = scene([], played)
    expect(batteringRamCostMods(s, P1, 'SFD-012')[0]).toMatchObject({ mana: ramMana })
    expect(noxianRecruitCostMods(s, P1, 'OGN-012')[0]).toMatchObject({ mana: 2 })              
  })

  test('一张都没打出:两张都不产(门槛与计数在 0 那一档同解)', () => {
    const s = scene([], 0)
    expect(batteringRamCostMods(s, P1, 'SFD-012')).toEqual([])
    expect(noxianRecruitCostMods(s, P1, 'OGN-012')).toEqual([])
  })
})

describe('广场守卫 VEN-064:每控制一件装备费用减1', () => {
  const gear = (id: string, extra: Partial<GameObject> = {}): GameObject =>
    obj(id, 'OGN-017', BF0, { baseTypes: ['equipment'] as const, ...extra })

  test('一件装备都没有 → 不产减费', () => {
    expect(plazaGuardCostMods(scene([]), P1, 'VEN-064')).toEqual([])
  })

  test('两件装备 → 减 2', () => {
    const mods = plazaGuardCostMods(scene([gear('g0'), gear('g1', { zone: asZoneId(`base:${P1}`) })]), P1, 'VEN-064')
    expect(mods[0]).toMatchObject({ mana: 2 * VEN_064_STEP })
  })

  test('★数的是【装备】不是单位:场上三个单位一件装备也只减 1(㉔ 复合判据的另一半)', () => {
    const s = scene([obj('u0', 'X', BF0), obj('u1', 'X', BF0), obj('u2', 'X', BF0), gear('g0')])
    expect(controlledEquipmentCount(s, P1)).toBe(1)
    expect(plazaGuardCostMods(s, P1, 'VEN-064')[0]).toMatchObject({ mana: 1 })
  })

  test('对手的装备不算', () => {
    const s = scene([gear('g0', { owner: P2, controller: P2 })])
    expect(plazaGuardCostMods(s, P1, 'VEN-064')).toEqual([])
  })

  test('★还在手牌里的装备不算(「控制」只对场上的物件成立)', () => {
    const s = scene([gear('g0', { zone: asZoneId(`hand:${P1}`) })])
    expect(controlledEquipmentCount(s, P1)).toBe(0)
  })

  test('[法盾]是印刷关键词,登记在 Card 上', () => {
    expect(VEN_064.keywords).toContain('法盾')
  })
})

describe('琢珥鱼 SFD-103:每控制一名【强力】单位费用减2', () => {
  const unit = (id: string, might: number, extra: Partial<GameObject> = {}): GameObject =>
    obj(id, 'X', BF0, { baseMight: might, ...extra })

                                             
  test.each([[4, 0], [MIGHTY_THRESHOLD, 1], [6, 1]])('战力 %i 的单位算 %i 名强力', (might, want) => {
    expect(controlledMightyCount(scene([unit('u0', might)]), P1)).toBe(want)
  })

  test('两名强力单位 → 减 4', () => {
    const s = scene([unit('u0', 5), unit('u1', 7), unit('u2', 2)])
    expect(tellstonesCostMods(s, P1, 'SFD-103')[0]).toMatchObject({ mana: 2 * SFD_103_STEP })
  })

  test('★按【当前】战力现算,不是印刷值:基础4、效果层顶到5 → 算强力(⑲)', () => {
    const buffed = unit('u0', 4, {
      derived: { might: 5, keywords: [], restrictions: [], controller: P1 },
    })
    expect(controlledMightyCount(scene([buffed]), P1)).toBe(1)
  })

  test('★现算的反方向:印刷6、被效果层压到4 → 不算强力(⑫ 对照组)', () => {
    const nerfed = unit('u0', 6, {
      derived: { might: 4, keywords: [], restrictions: [], controller: P1 },
    })
    expect(controlledMightyCount(scene([nerfed]), P1)).toBe(0)
  })

  test('★装备战力再高也不算(卡文写的是"一名强力【单位】")', () => {
    const s = scene([obj('g0', 'OGN-017', BF0, { baseTypes: ['equipment'] as const, baseMight: 9 })])
    expect(controlledMightyCount(s, P1)).toBe(0)
  })

  test('对手的强力单位不算', () => {
    const s = scene([unit('u0', 8, { owner: P2, controller: P2 })])
    expect(tellstonesCostMods(s, P1, 'SFD-103')).toEqual([])
  })

  test('[急速]是印刷关键词,登记在 Card 上', () => {
    expect(SFD_103.keywords).toContain('急速')
  })
})

describe('接线:四条都并进了 allCostMods(㉓ 光"算得出来"不算数,得有人读)', () => {
  test.each([
    ['VEN-096', scene([obj('d0', 'VEN-096', `discard:${P1}`)]), 'VEN-096 影刃潜伏者'],
    ['SFD-012', scene([], 2), 'SFD-012 攻城锤'],
    ['VEN-064', scene([obj('g0', 'OGN-017', BF0, { baseTypes: ['equipment'] as const })]), 'VEN-064 广场守卫'],
    ['SFD-103', scene([obj('u0', 'X', BF0, { baseMight: 6 })]), 'SFD-103 琢珥鱼'],
  ] as const)('%s 的减费在汇总口里出得来', (defId, s, source) => {
    expect(allCostMods(s, P1, defId, isSpell).some((m) => m.source === source)).toBe(true)
  })
})
