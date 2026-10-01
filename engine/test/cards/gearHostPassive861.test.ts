                                                        
  
                                                               
                                                        
                                             
  
          
                                                           
                               
                                                  
                                               
                                  
                                                                                    
                                               
                                            

import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { applyEvents } from '../../src/loop/reduce'
import { effectiveMight } from '../../src/state/might'
import { GEAR_HOST_PASSIVES, VEN_027_MIGHT_DELTA } from '../../data/cards/gear-host-passives'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardPassives } from '../../data/registry'

                                                                       
                                                     
                                
setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BASE = `base:${P1}`
const HOST_MIGHT = 3

function obj(oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: HOST_MIGHT, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
                                                                
function scene(hostZone: string, others: readonly GameObject[] = [], attached = true): GameState {
  const base = createInitialState([P1, P2], 2)
  const gear = obj('gear', 'VEN-027', P1, hostZone, {
    baseTypes: ['equipment'], baseMight: 0,
    ...(attached ? { status: { attachedTo: asObjId('host') } } : {}),
  })
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [obj('host', 'BLK', P1, hostZone), gear, ...others]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
                 
const hostMight = (s: GameState): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId('host')]!).actual

describe('★861 前提', () => {
  test('卡文逐字来自补录(不是上游 cardEffect),数额照卡面', () => {
    const row = GEAR_HOST_PASSIVES.find((r) => r.defId === 'VEN-027')!
    expect(row.cardText).toBe('如果我所在的战场上受你控制的其他单位有且仅有一个，则我获得[M]+2。')
    expect(VEN_027_MIGHT_DELTA, '㊶ +2 照卡面').toBe(2)
  })
})

describe('★★★★★ ㉙「有且仅有一个」两头压', () => {
  test('★★★恰 1 个其他友方单位 ⇒ 宿主 +2', () => {
    const s = scene(BF0, [obj('mate', 'BLK', P1, BF0)])
    expect(hostMight(s)).toBe(HOST_MIGHT + VEN_027_MIGHT_DELTA)
  })
  test('★★★0 个 ⇒ 不给(下边界)', () => {
    expect(hostMight(scene(BF0))).toBe(HOST_MIGHT)
  })
  test('★★★2 个 ⇒ 不给(上边界;「有且仅有」不是「≥1」)', () => {
    const s = scene(BF0, [obj('m1', 'BLK', P1, BF0), obj('m2', 'BLK', P1, BF0)])
    expect(hostMight(s)).toBe(HOST_MIGHT)
  })
})

describe('★★★★★ 限定词逐个压', () => {
  test('★★★★「我所在的【战场】」⇒ 宿主在基地时不成立', () => {
    const s = scene(BASE, [obj('mate', 'BLK', P1, BASE)])
    expect(hostMight(s), '★基地不是战场').toBe(HOST_MIGHT)
  })
  test('★★★「受【你】控制」⇒ 敌方单位不算', () => {
    const s = scene(BF0, [obj('foe', 'BLK', P2, BF0)])
    expect(hostMight(s)).toBe(HOST_MIGHT)
  })
  test('★★★「【单位】」⇒ 此处的装备不算', () => {
    const s = scene(BF0, [obj('someGear', 'BLK', P1, BF0, { baseTypes: ['equipment'] })])
    expect(hostMight(s)).toBe(HOST_MIGHT)
  })
  test('★★★★★§136.2.b 未贴附 ⇒ 效果文本未激活,一分都不给', () => {
    const s = scene(BF0, [obj('mate', 'BLK', P1, BF0)], false)
    expect(hostMight(s), '★没有宿主就没有「我」').toBe(HOST_MIGHT)
  })
  test('★★★★加成落在【宿主】不是武装自己', () => {
    const s = recomputeContinuous(scene(BF0, [obj('mate', 'BLK', P1, BF0)]))
    expect(effectiveMight(s.objects[asObjId('gear')]!).actual, '★武装自己不该被加').toBe(0)
  })
})

                                                                          
                                                    
  
                    
                                                     
                                            
                                                          
                                            
                                                    
                                                          
                                              
                                                                          
describe('★862 残暴之力 SFD-042:本回合贴附才 +2', () => {
                                                
  function scene042(thisTurn: boolean): GameState {
    const base = createInitialState([P1, P2], 2)
    const host = obj('host', 'BLK', P1, BF0)
    const gear = obj('gear', 'SFD-042', P1, BF0, {
      baseTypes: ['equipment'], baseMight: 0, status: { attachedTo: asObjId('host') },
    })
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of [host, gear]) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return {
      ...base, activePlayer: P1, phase: 'main', objects, zones,
      ...(thisTurn ? { attachedThisTurn: { gear: true as const } } : {}),
    } as GameState
  }

  test('★★★本回合贴上的 ⇒ 宿主额外 +2', () => {
    expect(hostMight(scene042(true))).toBe(HOST_MIGHT + 2)
  })

  test('★★★★不是本回合贴的 ⇒ 不给(这一格就是「本回合」三个字)', () => {
    expect(hostMight(scene042(false))).toBe(HOST_MIGHT)
  })

  test('★★★★★账记的是【武装的 oid】不是宿主的 —— 记成宿主也不该生效', () => {
    const s = { ...scene042(false), attachedThisTurn: { host: true as const } } as GameState
    expect(hostMight(s), '★记错了人就不该给').toBe(HOST_MIGHT)
  })
})

                     
                                                                   
                                                    
                                       
describe('★862 写账点:真发 attach 事件', () => {
  test('★★★★★发一条 attach ⇒ 账上记的是【武装的 oid】,且宿主战力当场 +2', () => {
    const base = createInitialState([P1, P2], 2)
    const host = obj('host', 'BLK', P1, BF0)
    const gear = obj('gear', 'SFD-042', P1, BF0, { baseTypes: ['equipment'], baseMight: 0 })
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of [host, gear]) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    const s0 = { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
    expect(hostMight(s0), '前提自证:还没贴上时不该有加成').toBe(HOST_MIGHT)

    const s1 = applyEvents(s0, [{ kind: 'attach', obj: asObjId('gear'), to: asObjId('host') }] as never, {}).state
    expect(s1.attachedThisTurn?.['gear'], '★账记在武装的 oid 上').toBe(true)
    expect(s1.attachedThisTurn?.['host'], '★不该记在宿主身上').toBeUndefined()
    expect(hostMight(s1), '★贴上的当回合 ⇒ 宿主额外 +2').toBe(HOST_MIGHT + 2)
  })

  test('★★★★§434.1.g 重复贴同一宿主是无操作 ⇒ 不该凭空多记一笔', () => {
    const base = createInitialState([P1, P2], 2)
    const host = obj('host', 'BLK', P1, BF0)
    const gear = obj('gear', 'SFD-042', P1, BF0, {
      baseTypes: ['equipment'], baseMight: 0, status: { attachedTo: asObjId('host') },
    })
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of [host, gear]) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
                         
    const s0 = { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
    const s1 = applyEvents(s0, [{ kind: 'attach', obj: asObjId('gear'), to: asObjId('host') }] as never, {}).state
    expect(s1.attachedThisTurn?.['gear'], '★无操作就不该记账 —— 否则上回合贴的能靠重贴一次白拿 +2')
      .toBeUndefined()
    expect(hostMight(s1)).toBe(HOST_MIGHT)
  })
})
