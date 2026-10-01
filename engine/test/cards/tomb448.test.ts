import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { IS_HERO_UNIT } from '../../data/heroTags'
import {
  OGN_281, OGN_281_CARD_EFFECT, makeSanctifiedTombTrigger, heroInMyDiscard,
} from '../../data/cards/battlefields-extra'

                                   
                                                                              
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as GameObject
}
function scene(objs: GameObject[]): GameState {
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
const hold = (bf = BF0, p = P1): GameEvent => ({ kind: 'hold', player: p, battlefield: bf } as GameEvent)

describe('★ 前提:卡面事实与接线', () => {
  test('战场卡;卡文;mayChoose 标记;英雄样本自证(OGN-158 在 IS_HERO_UNIT)', () => {
    expect(OGN_281.category).toBe('battlefield')
    expect(OGN_281_CARD_EFFECT).toContain('英雄区域')
    const trig = makeSanctifiedTombTrigger(BF0, P1)
    expect(trig.event).toBe('hold')
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose, '「可以选择」= mayChoose').toBe(true)
    expect(IS_HERO_UNIT['OGN-158'], '样本自证:沃利贝尔是英雄单位牌').toBe(true)
    expect(IS_HERO_UNIT['BLK'], 'BLK 不是').toBeUndefined()
  })
})

describe('🔴★★★★触发判据与候选与效果', () => {
  const trig = makeSanctifiedTombTrigger(BF0, P1)
                               
  const emptyHeroZone = (): GameState => scene([
    obj('hero', 'OGN-158', P1, `discard:${P1}`),
    obj('pu', 'BLK', P1, `discard:${P1}`),
  ])
  const heroAtHome = (): GameState => scene([
    obj('h0', 'OGN-158', P1, `heroZone:${P1}`),
    obj('hero2', 'OGN-155', P1, `discard:${P1}`),
  ])

  test('🔴★★★英雄区空+据守此处 ⇒ 响;英雄区有英雄 ⇒ 不响;别的战场 ⇒ 不响', () => {
    expect(trig.filter!(hold(), emptyHeroZone())).toBe(true)
    expect(trig.filter!(hold(), heroAtHome()), '英雄还在家 ⇒ 条件不成立').toBe(false)
    expect(trig.filter!(hold('battlefield:shared:1'), emptyHeroZone()), '据守的不是此处').toBe(false)
  })

  test('🔴★★★候选 = 废牌堆里的【英雄单位牌】(普通单位不进);空 ⇒ 不问', () => {
    expect(heroInMyDiscard(emptyHeroZone(), P1)).toEqual(['hero'])
    const req = trig.nextChoice!(emptyHeroZone(), hold(), {})
    expect(req!.candidates.map((c) => c.id)).toEqual(['hero'])
    const none = scene([obj('pu', 'BLK', P1, `discard:${P1}`)])
    expect(trig.nextChoice!(none, hold(), {}), '废牌堆没英雄 ⇒ 不问、落空').toBeNull()
  })

  test('🔴★★★effect = zoneChange 回我的英雄区;人没了 ⇒ 空', () => {
    expect(trig.effect!(emptyHeroZone(), hold(), { hero: 'hero' })).toEqual([
      { kind: 'zoneChange', obj: 'hero', to: `heroZone:${P1}` },
    ])
    expect(trig.effect!(emptyHeroZone(), hold(), { hero: 'gone' })).toEqual([])
  })

  test('★对手据守不响(eventPlayerIs 门,触发是每玩家一份的对称实现)', () => {
    expect(trig.filter!(hold(BF0, P2), emptyHeroZone()), 'P2 据守 P1 的那份触发不响').toBe(false)
  })
})
