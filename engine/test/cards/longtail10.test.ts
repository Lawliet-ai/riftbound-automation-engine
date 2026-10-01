import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind, cardPassives } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { canDealCombatDamage, opposingRoleCombatants } from '../../src/combat/battleRoles'
import { runCombatDamageAndResolve } from '../../src/combat/battle'
import { LONGTAIL10_DEFIDS } from '../../data/cards/longtail-10'
import { GROUP_PASSIVE_BATCH_DEFIDS } from '../../data/cards/group-passives'

                                  
  
                                                     
                                                    
                                                 
                                                              

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const unit = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: extra.baseMight ?? 3 })
                             
const card = (oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  obj(oid, defId, ctrl, extra)

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
const might = (st: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(st).objects[oid]!).reference
const restrictionsOf = (st: GameState, oid: string): readonly string[] =>
  recomputeContinuous(st).objects[oid]!.derived?.restrictions ?? []
const atk = { attacking: true } as const
const def = { defending: true } as const
                       
function fire(st: GameState, ev: GameEvent, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (const it of s.chain.filter((x: { status: string }) => x.status === 'pending')) {
    s = applyEvents(s, it.resolve(s, {}, it), {}).state
  }
  return s
}
const attackEv = (u: string): GameEvent => ({ kind: 'attack', unit: asObjId(u) })
const defendEv = (u: string): GameEvent => ({ kind: 'defend', unit: asObjId(u) })

describe('★【长尾批次·十】前提', () => {
  test('登记齐,战力/费用照卡面实测取', () => {
    expect(LONGTAIL10_DEFIDS).toEqual(['OGN-060'])
    expect(GROUP_PASSIVE_BATCH_DEFIDS).toEqual(expect.arrayContaining(['VEN-129', 'SFD-110']))
    expect(cardKind('OGN-060')).toBe('equipment')
    expect(cardCost('OGN-060')).toEqual({ mana: 2 })                        
    expect(cardCost('VEN-129')).toEqual({ mana: 4, pips: [['yellow']] })
    expect(cardCost('SFD-110')).toEqual({ mana: 3, pips: [['orange']] })
    expect(specLookup('VEN-129').baseMight).toBe(6)
    expect(specLookup('SFD-110').baseMight).toBe(3)
  })
})

describe('★★远见面具 OGN-060(驭水者判据的触发版)', () => {
  const visor = () => card('visor', 'OGN-060', P1, {
    baseTypes: ['equipment'] as const, zone: asZoneId(`base:${P1}`),
  })

  test('★★独自进攻的友方单位 +1,而且加的是【那名单位】不是面具', () => {
    const st = scene([visor(), unit('solo', P1, { status: atk }), unit('foe', P2, { status: def })])
    const after = fire(st, attackEv('solo'))
    expect(might(after, 'solo')).toBe(4)                       
  })

  test('★★独自【防守】也响(两个时机都要接)', () => {
    const st = scene([visor(), unit('solo', P1, { status: def }), unit('foe', P2, { status: atk })])
    expect(might(fire(st, defendEv('solo')), 'solo')).toBe(4)
  })

  test('★★不"独自"就不响:我方两名一起进攻,一个都不加', () => {
    const st = scene([visor(),
      unit('a', P1, { status: atk }), unit('b', P1, { status: atk }),
      unit('foe', P2, { status: def })])
    const after = fire(st, attackEv('a'))
    expect(might(after, 'a')).toBe(3)
    expect(might(after, 'b')).toBe(3)
  })

  test('★★「友方」:敌方单位独自进攻不给它加', () => {
    const st = scene([visor(), unit('foeSolo', P2, { status: atk }), unit('mine', P1, { status: def })])
    expect(might(fire(st, attackEv('foeSolo'), P2), 'foeSolo')).toBe(3)
  })

  test('★★玩家级的 attack 事件(没有 unit 字段)不触发', () => {
    const st = scene([visor(), unit('solo', P1, { status: atk }), unit('foe', P2, { status: def })])
    const playerLevel: GameEvent = { kind: 'attack', player: P1, battlefield: BF0 }
                                               
    expect(landAndEnqueueTriggers(st, [playerLevel], activeTriggers, P1, {}).chain).toHaveLength(0)
    expect(landAndEnqueueTriggers(st, [attackEv('solo')], activeTriggers, P1, {}).chain).toHaveLength(1)
  })

  test('★对面站几个不影响"独自"(㉖)', () => {
    const st = scene([visor(), unit('solo', P1, { status: atk }),
      unit('f1', P2, { status: def }), unit('f2', P2, { status: def })])
    expect(might(fire(st, attackEv('solo')), 'solo')).toBe(4)
  })
})

describe('★★菲奥娜 SFD-110(一对一 → 战力翻倍)', () => {
  test('★★一对一:两侧各恰好一名 → 翻倍', () => {
    const st = scene([card('fio', 'SFD-110', P1, { status: atk }), unit('foe', P2, { status: def })])
    expect(might(st, 'fio')).toBe(6)       
  })

  test('★★与驭水者的「独自」差半步:【对面】多一个就不翻倍了', () => {
    const st = scene([card('fio', 'SFD-110', P1, { status: atk }),
      unit('f1', P2, { status: def }), unit('f2', P2, { status: def })])
    expect(might(st, 'fio')).toBe(3)                        
  })

  test('★★我这侧多一个也不翻倍(另一半单独压,㉔)', () => {
    const st = scene([card('fio', 'SFD-110', P1, { status: atk }), unit('mate', P1, { status: atk }),
      unit('foe', P2, { status: def })])
    expect(might(st, 'fio')).toBe(3)
  })

  test('★★防守时同样成立(「进攻或防守」两半)', () => {
    const st = scene([card('fio', 'SFD-110', P1, { status: def }), unit('foe', P2, { status: atk })])
    expect(might(st, 'fio')).toBe(6)
  })

  test('★没参战不翻倍;别处战场的人不算对面', () => {
    expect(might(scene([card('fio', 'SFD-110')]), 'fio')).toBe(3)
    const split = scene([card('fio', 'SFD-110', P1, { status: atk }),
      unit('foe', P2, { status: def }),
      unit('far', P2, { status: def, zone: asZoneId(BF1) })])
    expect(might(split, 'fio')).toBe(6)             
  })

  test('★opposingRoleCombatants 只收【身份相反且同格】的', () => {
    const st = scene([card('fio', 'SFD-110', P1, { status: atk }),
      unit('foe', P2, { status: def }), unit('mate', P1, { status: atk })])
    expect(opposingRoleCombatants(st, st.objects['fio']!).map((o) => o.oid)).toEqual(['foe'])
  })
})

describe('★★神圣守护者 VEN-129(除非…否则无法造成战斗伤害)', () => {
  const guard = (extra: Partial<GameObject> = {}) => card('guard', 'VEN-129', P1, extra)

  test('★★「有且仅有一个」压三档:0 个受限 / 1 个不受限 / 2 个又受限(㉙)', () => {
    const withOthers = (n: number) => scene([guard(),
      ...Array.from({ length: n }, (_, i) => unit(`m${i}`, P1))])
    expect(restrictionsOf(withOthers(0), 'guard')).toContain('combatDamage')
    expect(restrictionsOf(withOthers(1), 'guard')).not.toContain('combatDamage')              
    expect(restrictionsOf(withOthers(2), 'guard')).toContain('combatDamage')
  })

  test('★★「其他」排除我自己:场上只有我时算 0 个不是 1 个', () => {
    expect(restrictionsOf(scene([guard()]), 'guard')).toContain('combatDamage')
  })

  test('★★「受你控制的」:那一个是敌方单位不算数', () => {
    const st = scene([guard(), unit('foe', P2)])
    expect(restrictionsOf(st, 'guard')).toContain('combatDamage')
  })

  test('★★「我所在的战场」:那一个在别处战场不算数', () => {
    const st = scene([guard(), unit('far', P1, { zone: asZoneId(BF1) })])
    expect(restrictionsOf(st, 'guard')).toContain('combatDamage')
  })

  test('★★★真战斗:受限时打不出伤害(铁律91 —— 只压判据不够,要压 battle.ts 真的读了它)', () => {
                           
                                                   
                                                      
                               
                                               
    const zoneOf = (r: { state: GameState }, defId: string, ctrl = P2): string => {
      const o = Object.values(r.state.objects).find((x) => x.defId === defId && x.controller === ctrl)
      return o ? (r.state.zones[o.zone]?.kind ?? '?') : 'gone'
    }
    const foe = () => unit('foe', P2, { status: def, baseMight: 6 })

                              
    const limited = recomputeContinuous(scene([guard({ status: atk }), foe()]))
    expect(limited.objects['guard']!.derived?.restrictions).toContain('combatDamage')
    expect(zoneOf(runCombatDamageAndResolve(limited, BF0, P1, P2), 'BLK')).toBe('battlefield')        

                                              
    const ok = recomputeContinuous(scene([
      guard({ status: atk }), unit('mate', P1, { status: atk, baseMight: 0 }), foe(),
    ]))
    expect(ok.objects['guard']!.derived?.restrictions ?? []).not.toContain('combatDamage')
    expect(zoneOf(runCombatDamageAndResolve(ok, BF0, P1, P2), 'BLK')).toBe('discard')              
  })

  test('★★★"拦多了"也要压:受限单位【仍然是承伤目标】(㉕)', () => {
                                                
                                                    
                                                
                                                        
    const st = recomputeContinuous(scene([
      guard({ status: def }),
      unit('m1', P1, { status: def, baseMight: 0 }), unit('m2', P1, { status: def, baseMight: 0 }),
      unit('foe', P2, { status: atk, baseMight: 20 }),
    ]))
    expect(st.objects['guard']!.derived?.restrictions).toContain('combatDamage')                
    const r = runCombatDamageAndResolve(st, BF0, P2, P1)
    const g = Object.values(r.state.objects).find((o) => o.defId === 'VEN-129')
    expect(r.state.zones[g?.zone ?? '']?.kind ?? 'gone').toBe('discard')
  })

  test('★★执行点:受限时不为战斗伤害出力,但【自己照样挨打】(㉕ 别拦多了)', () => {
                           
    const st = recomputeContinuous(scene([guard({ status: atk }), unit('foe', P2, { status: def, baseMight: 4 })]))
    expect(canDealCombatDamage(st.objects['guard']!)).toBe(false)
    expect(canDealCombatDamage(st.objects['foe']!)).toBe(true)
                     
    const ok = recomputeContinuous(scene([guard({ status: atk }), unit('mate', P1),
      unit('foe', P2, { status: def, baseMight: 4 })]))
    expect(canDealCombatDamage(ok.objects['guard']!)).toBe(true)
  })
})
