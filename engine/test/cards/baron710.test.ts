import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { blocksEnemyTargeting } from '../../src/keywords/untargetable'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardKeywords, cardKind, cardCost, cardPassives } from '../../data/registry'
import { makeBaronPlayTrigger, baronPassives, nestOnField, BARON_NEST_ZONE, BARON_NEST_DEFID } from '../../data/cards/UNL-147'
import { afterEach } from 'vitest'

                                                             
                                              
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, defId: string, who: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], nest = false): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(nest ? { battlefieldCards: { [BARON_NEST_ZONE]: { defId: BARON_NEST_DEFID, owner: P1 } } } : {}) } as GameState
}
const trig = makeBaronPlayTrigger(asObjId('bn'), P1)
const playEv = (): GameEvent => ({ kind: 'playUnit', unit: asObjId('bn'), player: P1 } as unknown as GameEvent)

afterEach(() => setCardPassiveProvider(null))

describe('★ 前提:登记(双印次三表)', () => {
  test('★★★★★10费 3紫pip、无横幅、单位;UNL-238 三表同登', () => {
    expect(cardKind('UNL-147')).toBe('unit')
    expect(cardCost('UNL-147')).toEqual({ mana: 10, pips: [['purple'], ['purple'], ['purple']] })
    expect(cardCost('UNL-238'), '★双印次(生成表无组 ⇒ 双登)').toEqual({ mana: 10, pips: [['purple'], ['purple'], ['purple']] })
    expect(cardKeywords('UNL-147')).toEqual([])
    expect(cardKeywords('UNL-238')).toEqual([])
  })
})

describe('★★★★★★★ ①打出触发:添置+改道', () => {
  test('★★★★★★场上没巢穴 ⇒ [addBattlefieldZone, zoneChange 自己];E2E:巢穴 zone 在+纳什在巢穴', () => {
    const s = scene([unit('bn', 'UNL-147', P1)])
    expect(nestOnField(s)).toBe(false)
    const evs = trig.effect(s, playEv(), {}) as unknown as readonly { kind: string, zoneId?: string, defId?: string, obj?: string, to?: string }[]
    expect(evs.map((e) => e.kind)).toEqual(['addBattlefieldZone', 'zoneChange'])
    expect(evs[0]).toMatchObject({ zoneId: BARON_NEST_ZONE, defId: BARON_NEST_DEFID, owner: P1 })
    expect(evs[1], '★「于巢穴进场」=单发 zoneChange(不算移动)').toMatchObject({ obj: 'bn', to: BARON_NEST_ZONE })
    const after = applyEvents(s, evs as never, {}).state
    expect(zonesByKind(after, 'battlefield'), '★动态加 zone 2→3').toHaveLength(3)
    expect(after.objects[asObjId('bn')]!.zone as string, '★纳什真到了巢穴').toBe(BARON_NEST_ZONE)
  })

  test('★★★★★★已有巢穴 ⇒「若如此做」不成立=两半都不发(第二只纳什不重复添置也不搬)', () => {
    const s = scene([unit('bn', 'UNL-147', P1)], true)
    expect(nestOnField(s)).toBe(true)
    expect(trig.effect(s, playEv(), {})).toEqual([])
  })
})

describe('★★★★★★★ ②③函数式 provider 两条', () => {
  test('★★★★★★②不可选目标罩**自己**(recompute 后 blocksEnemyTargeting);别的单位不罩', () => {
    setCardPassiveProvider(cardPassives)
    const s = scene([unit('bn', 'UNL-147', P1), unit('ally', 'U-A', P1)])
    const v = recomputeContinuous(s)
    expect(blocksEnemyTargeting(v.objects[asObjId('bn')]!), '★敌方不可选我').toBe(true)
    expect(blocksEnemyTargeting(v.objects[asObjId('ally')]!), '★只罩纳什自己').toBe(false)
  })

  test('★★★★★★③其他友方+2:友方 3+2=5;**自己不吃**(12 不变);敌方不吃;UNL-238 同效', () => {
    setCardPassiveProvider(cardPassives)
    const baron = { ...unit('bn', 'UNL-147', P1), baseMight: 12 } as GameObject
    const s = scene([baron, unit('ally', 'U-A', P1), unit('foe', 'U-F', P2), unit('atBase', 'U-B', P1, `base:${P1}`)])
    const v = recomputeContinuous(s)
    expect(v.objects[asObjId('ally')]!.derived!.might, '★友方 3+2').toBe(5)
    expect(v.objects[asObjId('atBase')]!.derived!.might, '★无位置词=全场含基地').toBe(5)
    expect(v.objects[asObjId('bn')]!.derived!.might, '★「其他」=自己不吃').toBe(12)
    expect(v.objects[asObjId('foe')]!.derived!.might, '★敌方不吃').toBe(3)
                                            
    expect(baronPassives({ ...baron, defId: 'UNL-238' } as GameObject, s), '★238 同效两条').toHaveLength(2)
    expect(baronPassives(unit('x', 'U-X', P1), s), '★别的卡零条').toHaveLength(0)
  })
})
