import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardCost, cardKeywords, cardKind, activatedFor } from '../../data/registry'
import { GEAR_PLAYABLE } from '../../data/gearPlayable'
import { GEAR_CARDS } from '../../data/gearCards'
import { makeRequiemPlayTrigger } from '../../data/cards/gear-triggers'

                                                                    
                                                         
  
           
                                                                  
                              
                                                       
                                                             
                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, types: readonly string[] = ['unit'], status: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status,
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const trig = makeRequiemPlayTrigger(asObjId('rq'), P1)
const played = (unit: string): GameEvent => ({ kind: 'playUnit', unit: asObjId(unit), player: P1 } as unknown as GameEvent)

describe('★ 前提:①批量层登记', () => {
  test('★★★★★装备 4费 2pip(每枚绿/蓝双色)、[唯我][装配A]、C 档放行、装配 spec 机器解析出', () => {
    expect(cardKind('SFD-192')).toBe('equipment')
    expect(GEAR_CARDS['SFD-192']).toMatchObject({ keywords: ['唯我', '装配A'], energy: 4, pips: 2, domains: ['green', 'blue'], powerBonus: 2 })
    expect(cardCost('SFD-192')).toEqual({ mana: 4, pips: [['green', 'blue'], ['green', 'blue']] })
    expect(cardKeywords('SFD-192')).toEqual(['唯我', '装配A'])
    expect(GEAR_PLAYABLE.has('SFD-192'), '★C 档放行(触发已实现)').toBe(true)
    expect(activatedFor('SFD-192').some((s) => s.key.startsWith('equip')), '★装配A 机器解析出贴附 spec').toBe(true)
  })
})

describe('★★★★★★★ ②触发时机', () => {
  test('★★★★★★自己被打出 ⇒ 响;别的东西被打出 ⇒ 不响;对手打出 ⇒ 不响(by you)', () => {
    const s = scene([obj('rq', P1, `base:${P1}`, ['equipment'])])
    expect(checkTrigger(trig, played('rq'), s, P1)).toBe(true)
    expect(checkTrigger(trig, played('other'), s, P1), '★subjectIsSelf').toBe(false)
    expect(checkTrigger(trig, played('rq'), s, P2), '★对手引发 ⇒ 不响').toBe(false)
  })
})

describe('★★★★★★★ ③效果:你的所有单位变活跃', () => {
  test('★★★★★★我方战场休眠/基地休眠/已活跃都发 dormant:false;敌方单位/我方装备不发', () => {
    const s = scene([
      obj('rq', P1, `base:${P1}`, ['equipment']),
      obj('a', P1, BF0, ['unit'], { dormant: true }),
      obj('b', P1, `base:${P1}`, ['unit'], { dormant: true }),
      obj('c', P1, BF0, ['unit']), // 已活跃(全发幂等,㊼ VEN-142 口径)
      obj('foe', P2, BF0, ['unit'], { dormant: true }),
      obj('gear', P1, `base:${P1}`, ['equipment'], { tapped: true }),
      obj('inHand', P1, `hand:${P1}`, ['unit'], { dormant: true }), // 手牌里的不是「单位」(在场才算)
    ])
    const evs = trig.effect(s, played('rq'), {}) as unknown as readonly { kind: string, target?: string, key?: string, value?: boolean }[]
    expect(evs.map((e) => e.target).sort(), '★「你的所有单位」= a/b/c;敌方 foe 与装备 gear 都不在').toEqual(['a', 'b', 'c'])
    expect(evs.every((e) => e.kind === 'statusChange' && e.key === 'dormant' && e.value === false)).toBe(true)
  })
})
