                                 
                                             
  
                               
                                                        
                                                              
                                               
                                                     
  
                                                         
                                                               
                                                                  

import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { activeTriggers, cardKind } from '../../data/registry'
import {
  makeHextechGauntletConquerTrigger, UNL_188_EXCESS_MIN, UNL_188_CARD_EFFECT_BOX2, excessOf,
} from '../../data/cards/excess-conquer'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

                                                     
function scene(hostZone: string, excess?: number, attached = true): GameState {
  const base = createInitialState([P1, P2], 2)
  const gear = obj('g', 'UNL-188', P1, hostZone, {
    baseTypes: ['equipment'],
    ...(attached ? { status: { attachedTo: asObjId('host') } } : {}),
  })
  const objs = [obj('host', 'BLK', P1, hostZone), gear]
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(excess !== undefined ? { maxExcessDamageThisTurn: { [P1 as string]: excess } } : {}),
  } as GameState
}
const conquer = (bf: string = BF0, by: PlayerId = P1): GameEvent =>
  ({ kind: 'conquer', player: by, battlefield: bf } as unknown as GameEvent)
const trig = makeHextechGauntletConquerTrigger(asObjId('g'), P1)
const fires = (s: GameState, ev: GameEvent = conquer()): boolean => checkTrigger(trig, ev, s, P1)

describe('★859 前提:接线与卡文', () => {
  test('★★★真 registry 收得到这条触发(装配那半在另一张表,别只看 cost-modifiers)', () => {
    expect(cardKind('UNL-188')).toBe('equipment')
    const s = scene(BF0)
    expect(activeTriggers(s).some((t) => t.sourceDefId === 'UNL-188'), '★UNL-188 必须产出触发').toBe(true)
  })

  test('★卡文逐字(来源 data/卡面数据补录.json,不是上游 cardEffect)', () => {
    expect(UNL_188_CARD_EFFECT_BOX2)
      .toBe('当我征服一处战场时，如果你给敌方单位分配了不低于{{3}}点的过量伤害，则抽一张牌。')
    expect(UNL_188_EXCESS_MIN, '㊶ 阈值照卡面 3,各卡各写').toBe(3)
  })
})

describe('★★★★★ ㉙ 阈值两头压:恰 3 响 / 2 不响 / 无账不响', () => {
  test('★★★恰 3 响', () => { expect(fires(scene(BF0, 3))).toBe(true) })
  test('★★★2 不响(下边界)', () => { expect(fires(scene(BF0, 2))).toBe(false) })
  test('★★★账里没这个人 ⇒ 不响', () => { expect(fires(scene(BF0))).toBe(false) })
  test('★账读的是【我】那一栏:对手打出的过量不算', () => {
    const s = { ...scene(BF0), maxExcessDamageThisTurn: { [P2 as string]: 9 } } as GameState
    expect(excessOf(s, P1), '★我的账仍是 0').toBe(0)
    expect(fires(s)).toBe(false)
  })
})

describe('★★★★★★ 「当【我】征服」= 宿主在那处(武装版判据)', () => {
  test('★★★宿主不在被征服的那处 ⇒ 不响', () => {
    expect(fires(scene(BF0, 5), conquer(BF1))).toBe(false)
  })
  test('★★★★★§136.2.b 未贴附 ⇒ 不响(效果文本未激活)', () => {
    expect(fires(scene(BF0, 5, false)), '★没有宿主就没有「我」').toBe(false)
  })
  test('★★★对手征服不响(by: you)', () => {
    expect(fires(scene(BF0, 5), conquer(BF0, P2))).toBe(false)
  })
})

describe('★★★★ 效果:抽【一】张,抽的是我的牌', () => {
  test('★★★★产出恰好一条 draw,数额 1,归我', () => {
    const evs = trig.effect!(scene(BF0, 3), conquer(), {}) as unknown as
      readonly { kind: string; player?: string; count?: number }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('draw')
    expect(evs[0]!.count, '★卡面写的是「抽一张牌」').toBe(1)
    expect(evs[0]!.player, '★抽的是【我】的牌').toBe(P1)
  })
})
