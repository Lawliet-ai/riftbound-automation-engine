import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardCost, cardKind } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { noteConfirmed } from '../../src/keywords/rally'
import { ACTIVATED2_DEFIDS } from '../../data/cards/activated-batch2'

                                    
  
                                 
                                                   
                                                          
                                             
                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
const equip = (oid: string, defId: string, ctrl = P1): GameObject =>
  obj(oid, defId, ctrl, { zone: asZoneId(`base:${ctrl}`), baseMight: 0, baseTypes: ['equipment'] })
const legendOf = (oid: string, defId: string): GameObject =>
  obj(oid, defId, P1, { zone: asZoneId(`legend:${P1}`), baseMight: 0, baseTypes: ['legend'] })

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
const specOf = (defId: string, key: string) => activatedFor(defId).find((s) => s.key === key)!

describe('★【主动技能批量·二】(第149轮)', () => {
  test('★★前提:6 个卡号逐个取得到技能(再版靠别名),费用照卡面实测取', () => {
    expect(ACTIVATED2_DEFIDS.slice().sort()).toEqual(
      ['OGN-113', 'OGN-253', 'OGN-267', 'OGN-302', 'OGN-309', 'VEN-060'])
    for (const d of ACTIVATED2_DEFIDS) {
      expect(activatedFor(d).length, `${d} 取不到主动技能`).toBeGreaterThan(0)
    }
                                                      
    expect(activatedFor('OGN-302')[0]!.key).toBe('OGN-253:rallyMana')
    expect(activatedFor('OGN-309')[0]!.key).toBe('OGN-267:grantRoam')
    for (const d of ['OGN-253', 'OGN-267']) {
      expect(cardKind(d), d).toBe('legend')
      expect(cardCost(d).mana, d).toBe(0)
    }
    expect(cardCost('OGN-113').mana).toBe(4)
    expect(cardCost('VEN-060').mana).toBe(4)
    expect(cardCost('VEN-060').pips).toEqual([['blue']])
  })

  test('★★诺克萨斯之手 OGN-253:[鼓舞] 是【可用性闸】——没点亮时这条动作不该被列出来', () => {
    const st = scene([legendOf('lg', 'OGN-253')])
    const spec = specOf('OGN-253', 'OGN-253:rallyMana')
                                                     
    expect(spec.available!(st, P1, 'lg')).toBe(false)
                             
    const rallied = noteConfirmed(st, P1)
    expect(spec.available!(rallied, P1, 'lg')).toBe(true)
                                          
    expect(spec.keywords).toEqual(['反应'])
    expect(spec.fastResolve).toBe(true)
    const after = applyEvents(rallied, spec.makeResolve({ selfOid: 'lg', controller: P1 })(rallied, {}), {}).state
    expect(after.runePools[P1]?.mana).toBe(1)              
    expect(after.runePools[P1]?.runes ?? {}).toEqual({})
  })

  test('★★赏金猎人 OGN-267:授予的[游走]要真让"战场→战场"合法(读 derived.keywords)', () => {
    const st = scene([legendOf('lg', 'OGN-267'), obj('u', 'BLK', P1)])
    const spec = specOf('OGN-267', 'OGN-267:grantRoam')
    const before = recomputeContinuous(st)
    expect(before.objects['u']!.derived?.keywords ?? []).not.toContain('游走')
    const after = recomputeContinuous(
      applyEvents(st, spec.makeResolve({ selfOid: 'lg', controller: P1, target: 'u' })(st, {}), {}).state)
                                                             
                                                                       
    expect(after.objects['u']!.derived?.keywords ?? []).toContain('游走')
  })

  test('★赏金猎人:候选是场上任意单位(含基地、含敌方),卡文没写敌我', () => {
    const st = scene([legendOf('lg', 'OGN-267'), obj('mine', 'BLK', P1),
      obj('foe', 'BLK', P2), obj('inBase', 'BLK', P1, { zone: asZoneId(`base:${P1}`) }),
      equip('gear', 'BLK')])
    const cands = specOf('OGN-267', 'OGN-267:grantRoam').legalTargets!(st, P1, 'lg')
    expect(cands.sort()).toEqual(['foe', 'inBase', 'mine'])               
  })

  test('★★玛尔扎哈 OGN-113:费用是「友方单位【或装备】」——装备不能漏', () => {
    const st = scene([obj('malz', 'OGN-113', P1, { baseMight: 3 }),
      obj('mate', 'BLK', P1), equip('gear', 'BLK', P1), obj('foe', 'BLK', P2), equip('foeGear', 'BLK', P2)])
    const spec = specOf('OGN-113', 'OGN-113:sacrifice')
    const opts = spec.extraCost!.options!(st, P1, 'malz').map((o) => o.id)
                                             
    expect(opts.sort()).toEqual(['gear', 'malz', 'mate'])                 
                                                                      
                                                                                                     
    const paid = spec.extraCost!.pay(st, P1, 'malz', 'gear')
    expect(paid).not.toBeNull()
    expect(paid!.objects['gear'], 'pay 不许直改 state').toBeDefined()
    const evs = spec.extraCost!.payEvents!(st, P1, 'malz', 'gear') as unknown as { kind: string; target: string }[]
    expect(evs.map((e) => [e.kind, e.target])).toEqual([['destroy', 'gear']])
                                  
    expect(spec.extraCost!.pay(st, P1, 'malz', 'nope')).toBeNull()
  })

  test('★玛尔扎哈:获得的是【无色符能】{A}{A},不是 2 点通用法力(两条账不能混)', () => {
    const st = scene([obj('malz', 'OGN-113')])
    const spec = specOf('OGN-113', 'OGN-113:sacrifice')
    expect(spec.keywords).toEqual(['迅捷'])            
    expect(spec.fastResolve).toBe(true)
    const after = applyEvents(st, spec.makeResolve({ selfOid: 'malz', controller: P1 })(st, {}), {}).state
    expect(after.runePools[P1]?.runes).toEqual({ '*': 2 })
    expect(after.runePools[P1]?.mana ?? 0).toBe(0)
  })

  test('★★天际漫游者 VEN-060:弃牌费用带【装备牌】过滤(少了它整条费用形同虚设)', () => {
    const spec = specOf('VEN-060', 'VEN-060:bolt')
    expect(spec.discard).toBe(1)
    expect(spec.cost).toEqual({ mana: 1 })
    expect(spec.tapSelf).toBe(true)
                                  
    expect(spec.discardFilter!('OGN-040'), '之印是装备,应可弃').toBe(true)
    expect(spec.discardFilter!('OGN-113'), '玛尔扎哈是单位,不该可弃').toBe(false)
  })

  test('★天际漫游者:目标只有【战场上的】单位(基地的不算),伤害 4 点', () => {
    const st = scene([obj('sky', 'VEN-060'), obj('foeBf', 'BLK', P2, { baseMight: 9 }),
      obj('foeBase', 'BLK', P2, { zone: asZoneId(`base:${P2}`) })])
    const spec = specOf('VEN-060', 'VEN-060:bolt')
    expect(spec.legalTargets!(st, P1, 'sky').sort()).toEqual(['foeBf', 'sky'])               
    const after = applyEvents(st, spec.makeResolve({ selfOid: 'sky', controller: P1, target: 'foeBf' })(st, {}), {}).state
    expect(after.objects['foeBf']!.damage).toBe(4)
  })
})
