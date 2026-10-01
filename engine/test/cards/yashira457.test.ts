import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { DelayedTrigger } from '../../src/effects/delayedTriggers'
import { activeTriggers } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { UNL_050, UNL_050_CARD_EFFECT, makeYashira050Trigger } from '../../data/cards/UNL-050'

                                  
                                       
                                                              
                                                                            
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('ya')

function unit(id: string, ctrl: typeof P1, zone: string, defId = 'BLK'): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[], extra: Partial<GameState> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, ...extra } as GameState
}
const DELAYED: DelayedTrigger = {
  kind: 'moveEnemyAtNextMain', id: 'UNL-050:ya', controller: P1, sourceDefId: 'UNL-050', battlefield: BF0,
} as DelayedTrigger
const withDelayed = (objs: GameObject[]): GameState => scene(objs, { delayedTriggers: [DELAYED] } as Partial<GameState>)
const mainStart = (p = P1): GameEvent => ({ kind: 'mainPhaseStart', player: p } as GameEvent)

describe('★ 前提:卡面事实与本体触发(四步查法落测)', () => {
  test('官方名娅希拉;7费1绿pip 6S;无变体;卡文', () => {
    expect(UNL_050.name).toBe('娅希拉')
    expect(CARD_COSTS['UNL-050']).toEqual({ mana: 7, pips: 1, colors: ['green'] })
    expect(UNL_050.power, '上游实测 6S').toBe(6)
    expect(VARIANT_GROUPS['UNL-050']).toBeUndefined()
    expect(UNL_050_CARD_EFFECT).toContain('下一个主阶段开始时')
  })

  test('🔴★★★本体:我据守那处才响;别处/对手不响;effect = 只挂延时档(带此战场)', () => {
    const trig = makeYashira050Trigger(SELF, P1)
    const s = scene([unit('ya', P1, BF0, 'UNL-050')])
    expect(trig.filter!({ kind: 'hold', player: P1, battlefield: BF0 } as GameEvent, s)).toBe(true)
    expect(trig.filter!({ kind: 'hold', player: P1, battlefield: BF1 } as GameEvent, s), '我不在那处').toBe(false)
    expect(trig.filter!({ kind: 'hold', player: P2, battlefield: BF0 } as GameEvent, s), '对手据守').toBe(false)
    const evs = trig.effect!(s, { kind: 'hold', player: P1, battlefield: BF0 } as GameEvent, {})
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'delayedTrigger',
      add: { kind: 'moveEnemyAtNextMain', controller: P1, sourceDefId: 'UNL-050', battlefield: BF0 } })
  })
})

describe('🔴★★★★延时档:下个主阶段开始时移敌', () => {
  const trigOf = (s: GameState) => activeTriggers(s).find((t) => t.id.includes('UNL-050:delayed'))

  test('🔴★★★账在 ⇒ activeTriggers 有它(mayChoose 在);账不在 ⇒ 无', () => {
    const t = trigOf(withDelayed([unit('e1', P2, BF1)]))
    expect(t).toBeTruthy()
    expect((t as unknown as { mayChoose?: boolean }).mayChoose).toBe(true)
    expect(trigOf(scene([unit('e1', P2, BF1)]))).toBeUndefined()
  })

  test('🔴★★★我的主阶段才响;对手的主阶段不响', () => {
    const s = withDelayed([unit('e1', P2, BF1)])
    const t = trigOf(s)!
    expect(t.filter!(mainStart(), s)).toBe(true)
    expect(t.filter!(mainStart(P2), s), '「你的」主阶段').toBe(false)
  })

  test('🔴★★★候选=场上敌方(基地的也进);我的单位不进;已在此战场的敌方不进;没敌方不问', () => {
    const s = withDelayed([
      unit('e1', P2, BF1), unit('e2', P2, `base:${P2}`),
      unit('m1', P1, BF1), unit('e3', P2, BF0),
    ])
    const req = trigOf(s)!.nextChoice!(s, mainStart(), {})
    expect([...req!.candidates.map((c) => c.id)].sort(), 'e3 已在 BF0 ⇒ 移到原地无意义不进').toEqual(['e1', 'e2'])
    expect(trigOf(withDelayed([unit('m1', P1, BF1)]))!.nextChoice!(withDelayed([unit('m1', P1, BF1)]), mainStart(), {}), '没敌方 ⇒ 不问').toBeNull()
  })

  test('🔴★★★effect:先 clear(一次性)+ 把选中的敌方 zoneChange 到此战场;没选 ⇒ 只 clear', () => {
    const s = withDelayed([unit('e1', P2, BF1)])
    const evs = trigOf(s)!.effect!(s, mainStart(), { enemy: 'e1' })
    expect(evs[0]).toMatchObject({ kind: 'delayedTrigger', clear: 'UNL-050:ya' })
    expect(evs.find((e) => (e as { kind: string }).kind === 'zoneChange')).toMatchObject({ obj: 'e1', to: BF0 })
    const bare = trigOf(s)!.effect!(s, mainStart(), {})
    expect(bare).toHaveLength(1)
    expect(bare[0]).toMatchObject({ kind: 'delayedTrigger', clear: 'UNL-050:ya' })
  })
})
