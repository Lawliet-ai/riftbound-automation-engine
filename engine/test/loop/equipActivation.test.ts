import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { attachedTo } from '../../src/state/attach'
import { parseEquipCost, equipCostOptions, isGeared } from '../../src/keywords/equip'
import { parseRecursionCost } from '../../src/keywords/recursion'
import { equipActivationSpecs } from '../../src/loop/equipActivation'
import { recallToBase, recallUnattachedEquipment } from '../../src/state/recall'
import { effectiveMight } from '../../src/state/might'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function obj(id: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: BF0,
    baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects, zones }
}

describe('§818.1.c 装配费用解析(卡池 5 种真实写法)', () => {
  test.each([
    ['装配红色', { mana: 0, pips: [['red']] }],
    ['装配1蓝色', { mana: 1, pips: [['blue']] }],
    ['装配A', { mana: 0, pips: [[]] }],
    ['装配3A', { mana: 3, pips: [[]] }],
    ['装配1黄色', { mana: 1, pips: [['yellow']] }],
  ])('%s → %j', (kw, want) => {
    expect(parseEquipCost(kw)).toEqual(want)
  })

  test('裸「装配」= §818.1.c.3 非资源费用变体 → null,【与流转的空后缀语义相反】', () => {
    expect(parseEquipCost('装配')).toBeNull()                         
    expect(parseRecursionCost('流转')).toEqual({ mana: 0 })                  
  })

  test('认不得的尾巴 → null(宁可拒绝也不猜)', () => {
    expect(parseEquipCost('装配蓝色x')).toBeNull()
    expect(parseEquipCost('装配—消耗1经验')).toBeNull()
  })

  test('equipCostOptions:可解析的进 parsed,裸装配进 unparsed(不许静默丢)', () => {
    const r = equipCostOptions(['装配红色', '装配', '灵便'])
    expect(r.parsed.map((p) => p.keyword)).toEqual(['装配红色'])
    expect(r.unparsed).toEqual(['装配'])
  })
})

describe('§818.4 每条装配一份激活规格', () => {
  test('两条装配 → 两份 spec,key 各异', () => {
    const { specs, unparsed } = equipActivationSpecs(['装配红色', '装配1红色'])
    expect(specs.map((s) => s.key)).toEqual(['equip:0', 'equip:1'])
    expect(specs[0]!.cost).toEqual({ mana: 0, pips: [['red']] })
    expect(specs[1]!.cost).toEqual({ mana: 1, pips: [['red']] })
    expect(unparsed).toEqual([])
  })

  test('spec 走目标通道(§818.1.b.1 选定的单位视为目标)', () => {
    const gearObj = obj('g', { baseTags: ['武装'], baseTypes: ['equipment'], baseKeywords: ['装配红色'], basePowerBonus: 2, zone: asZoneId('base:P1') })
    const s = scene(gearObj, obj('u'), obj('theirs', { controller: P2, owner: P2 }))
    const { specs } = equipActivationSpecs(gearObj.baseKeywords)
    expect(specs[0]!.target).toBe('custom')
    expect(specs[0]!.legalTargets!(s, P1, 'g')).toEqual(['u'])             
  })

  test('makeResolve 产出 attach 事件;落地后贴附成立、战力加成生效、配装成立', () => {
    const gearObj = obj('g', { baseTags: ['武装'], baseTypes: ['equipment'], baseKeywords: ['装配红色'], basePowerBonus: 2, baseMight: 0, zone: asZoneId('base:P1') })
    const s = scene(gearObj, obj('u'))
    const { specs } = equipActivationSpecs(gearObj.baseKeywords)
    const evs = specs[0]!.makeResolve({ selfOid: 'g', controller: P1, target: 'u' })(s)
    expect(evs).toEqual([{ kind: 'attach', obj: 'g', to: 'u', player: P1 }])             
    const landed = applyEvents(s, evs).state
    expect(attachedTo(landed.objects['g' as never])).toBe('u')
    expect(isGeared(landed, asObjId('u'))).toBe(true)
    expect(effectiveMight(landed.objects['u' as never]!).reference).toBe(4)                 
  })

  test('结算期目标已不在 → attach 原语兜底无操作(状态不变)', () => {
    const gearObj = obj('g', { baseTags: ['武装'], baseTypes: ['equipment'], baseKeywords: ['装配红色'], zone: asZoneId('base:P1') })
    const s = scene(gearObj)        
    const { specs } = equipActivationSpecs(gearObj.baseKeywords)
    const evs = specs[0]!.makeResolve({ selfOid: 'g', controller: P1, target: 'u' })(s)
    const landed = applyEvents(s, evs).state
    expect(attachedTo(landed.objects['g' as never])).toBeUndefined()
  })
})

describe('detach 事件与 §137.3.a 即刻回落', () => {
  test('attach → detach 走事件层,战力同步回落', () => {
    const gearObj = obj('g', { baseTags: ['武装'], baseTypes: ['equipment'], basePowerBonus: 3, baseMight: 0, zone: asZoneId('base:P1') })
    const s0 = scene(gearObj, obj('u'))
    const s1 = applyEvents(s0, [{ kind: 'attach', obj: 'g' as never, to: 'u' as never }]).state
    expect(effectiveMight(s1.objects['u' as never]!).reference).toBe(5)
    const s2 = applyEvents(s1, [{ kind: 'detach', obj: 'g' as never }]).state
    expect(attachedTo(s2.objects['g' as never])).toBeUndefined()
    expect(effectiveMight(s2.objects['u' as never]!).reference).toBe(2)
  })
})

describe('§455/§456 召回 + §323.7 散装备清扫', () => {
  test('recallToBase:直接改区、保 oid、保状态与伤害(§456 不是移动)', () => {
    const g = obj('g', { baseTypes: ['equipment'], damage: 1, status: { tapped: true } })
    const s = recallToBase(scene(g), asObjId('g'))
    const after = s.objects['g' as never]!
    expect(after.zone).toBe('base:P1')
    expect(after.oid).toBe('g')               
    expect(after.damage).toBe(1)
    expect(after.status.tapped).toBe(true)
    expect(s.zones[BF0]!.contents).not.toContain('g')
    expect(s.zones['base:P1' as never]!.contents).toContain('g')
  })

  test('§323.7 战场上未贴附的非单位装备 → 召回控制者基地;已贴附的不动', () => {
    const loose = obj('loose', { baseTypes: ['equipment'] })
    const attached = obj('att', { baseTypes: ['equipment'], status: { attachedTo: asObjId('u') } })
    const s = recallUnattachedEquipment(scene(loose, attached, obj('u')))
    expect(s.objects['loose' as never]!.zone).toBe('base:P1')
    expect(s.objects['att' as never]!.zone).toBe(BF0)
  })

  test('§178 单位兼装备【不】召回(它是单位,不在"非单位装备"之列)', () => {
    const s0 = scene(obj('h', { baseTypes: ['unit', 'equipment'] }))
    const s = recallUnattachedEquipment(s0)
    expect(s).toBe(s0)            
    expect(s.objects['h' as never]!.zone).toBe(BF0)
  })

  test('基地里的装备不动;无事可做返回原引用(§322 不动点判定)', () => {
    const atBase = obj('b', { baseTypes: ['equipment'], zone: asZoneId('base:P1') })
    const s0 = scene(atBase, obj('u'))
    expect(recallUnattachedEquipment(s0)).toBe(s0)
  })

  test('自定义 isEquip 判据(data 层 cardKind 通道):无 baseTypes 的装备也能被清扫', () => {
    const legacy = obj('legacy')                           
    const s0 = scene(legacy)
    expect(recallUnattachedEquipment(s0)).toBe(s0)           
    const s1 = recallUnattachedEquipment(s0, (o) => o.oid === 'legacy')
    expect(s1.objects['legacy' as never]!.zone).toBe('base:P1')
  })
})
