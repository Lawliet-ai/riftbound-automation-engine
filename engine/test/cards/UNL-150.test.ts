import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { makeVegasStunTrigger, UNL_150, UNL_150_CARD_EFFECT } from '../../data/cards/UNL-150'
import { detectTriggers } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'
import { moveRestricted } from '../../src/state/moveRestriction'
import { deflectValue } from '../../src/keywords/deflect'
import type { PlayUnitEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function obj(id: string, ctrl: typeof P1, zone = BF0, keywords: string[] = []): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone, baseKeywords: keywords, baseMight: 3, damage: 0, counters: {}, status: {} }
}
                                   
function scene(vegasZone = BF0): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {
    vegas: obj('vegas', P1, vegasZone, ['法盾']),
    played: obj('played', P2, BF0),
  }
  const z = base.zones[BF0]!
  const contents = [asObjId('played'), ...(vegasZone === BF0 ? [asObjId('vegas')] : [])]
  return { ...base, objects, zones: { ...base.zones, [BF0]: { ...z, contents } } }
}

const playEvent: PlayUnitEvent = { kind: 'playUnit', unit: asObjId('played'), player: P2 }

describe('薇古丝 UNL-150', () => {
  test('卡文逐字(法盾+对手打出单位眩晕+不可移动)', () => {
    expect(UNL_150_CARD_EFFECT).toContain('当对手打出一名单位时')
    expect(UNL_150_CARD_EFFECT).toContain('{{眩晕}}')
    expect(UNL_150.keywords).toContain('法盾')
  })

  test('对手打出单位 + 薇古丝在战场 → 触发', () => {
    const s = scene()
    const t = makeVegasStunTrigger(asObjId('vegas'), P1)
    const items = detectTriggers(s, playEvent, [t], P2)                
    expect(items).toHaveLength(1)
  })

  test('§383.2.a.1 薇古丝不在战场 → 不触发', () => {
    const s = scene(asZoneId('hand:P1'))          
    const t = makeVegasStunTrigger(asObjId('vegas'), P1)
    expect(detectTriggers(s, playEvent, [t], P2)).toHaveLength(0)
  })

  test('自己打出单位(非对手)→ 不触发(by opponent)', () => {
    const s = scene()
    const t = makeVegasStunTrigger(asObjId('vegas'), P1)
    expect(detectTriggers(s, playEvent, [t], P1)).toHaveLength(0)                      
  })

  test('触发结算:被打出单位被眩晕 + 本回合不可移动', () => {
    const s = scene()
    const t = makeVegasStunTrigger(asObjId('vegas'), P1)
    const item = detectTriggers(s, playEvent, [t], P2)[0]!
    const { state } = applyEvents(s, item.resolve(s))
    expect(state.objects['played']!.status.stunned).toBe(true)      
                                                              
    expect(state.objects['played']!.derived!.restrictions).toContain('moveBy:P2')
                                         
    const u = state.objects['played']!
    expect(moveRestricted(state, u, 'battlefield:shared:1', P2), '★该对手移动 ⇒ 挡').toBe(true)
    expect(moveRestricted(state, u, 'battlefield:shared:1', P1), '★我方效果移动 ⇒ 不挡').toBe(false)
  })

  test('法盾自带值1(§809.1.b.3)', () => {
    expect(deflectValue(scene().objects['vegas']!)).toBe(1)
  })

  test('QA:映像token也算打出单位 → 同样被眩', () => {
    const s = scene()
                         
    const withMirror: GameState = { ...s, objects: { ...s.objects, mirror: obj('mirror', P2) } }
    const z = withMirror.zones[BF0]!
    const s2 = { ...withMirror, zones: { ...withMirror.zones, [BF0]: { ...z, contents: [...z.contents, asObjId('mirror')] } } }
    const t = makeVegasStunTrigger(asObjId('vegas'), P1)
    const mirrorPlay: PlayUnitEvent = { kind: 'playUnit', unit: asObjId('mirror'), player: P2 }
    const item = detectTriggers(s2, mirrorPlay, [t], P2)[0]!
    const { state } = applyEvents(s2, item.resolve(s2))
    expect(state.objects['mirror']!.status.stunned).toBe(true)
  })
})
