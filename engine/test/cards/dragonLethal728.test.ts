import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { runCleanupToFixpoint } from '../../src/loop/cleanup'
import { runExpirationStep } from '../../src/loop/turnStructure'
import { expireThisTurnEffects } from '../../src/effects/continuousView'
import { clearDamageDormantRecall } from '../../src/state/recall'
import { extraLethal } from '../../data/registry'
import { dragonLethal, UNL_118_CARD_EFFECT } from '../../data/cards/UNL-118'

                                                                         
                             
                 
                                                            
                                                    
                                               
                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const dragon = (who: PlayerId): GameObject =>
  ({ ...obj('dr', who, BF0), defId: 'UNL-118' } as GameObject)

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

const hit = (target: string, amount: number, sourcePlayer?: PlayerId): GameEvent =>
  ({ kind: 'damage', target: asObjId(target), amount, ...(sourcePlayer !== undefined ? { sourcePlayer } : {}) } as unknown as GameEvent)

describe('★★★★★★★ ①damagedBy 归因标记', () => {
  test('★★★★★★带归因标/无归因不标(保守)/幂等/第二人追加;0 点不标', () => {
    const s = scene([obj('u', P2, BF0)])
    const a = applyEvents(s, [hit('u', 1, P1)] as never, {}).state
    expect(a.objects['u' as never]!.damagedBy).toEqual([P1])
    const b = applyEvents(a, [hit('u', 1, P1)] as never, {}).state
    expect(b.objects['u' as never]!.damagedBy, '★幂等').toEqual([P1])
    const c = applyEvents(b, [hit('u', 1, P2)] as never, {}).state
    expect(c.objects['u' as never]!.damagedBy, '★第二人追加').toEqual([P1, P2])
    const d = applyEvents(s, [hit('u', 2)] as never, {}).state
    expect(d.objects['u' as never]!.damagedBy, '★无归因不标(方向=少杀)').toBeUndefined()
  })

  test('★★★★★★②清除点同清:3c 回合末/清伤召回(recall);清后不再致死', () => {
    const s0 = applyEvents(scene([obj('u', P2, BF0), dragon(P1)]), [hit('u', 1, P1)] as never, {}).state
    expect(dragonLethal(s0, s0.objects['u' as never]!)).toBe(true)
    const after3c = runExpirationStep(s0, expireThisTurnEffects)
    expect(after3c.objects['u' as never]!.damagedBy, '★3c 伤害清除 ⇒ 标记同清').toBeUndefined()
    expect(dragonLethal(after3c, after3c.objects['u' as never]!), '★没伤了 ⇒ 不死').toBe(false)
    const recalled = clearDamageDormantRecall(s0, asObjId('u'))
    expect(recalled.objects['u' as never]!.damagedBy, '★清伤召回同清').toBeUndefined()
  })
})

describe('★★★★★★★ ③dragonLethal 州级判据+E2E 清理', () => {
  test('★★★★★★裁定①:先受我方 1 点伤(远不致命)+巨龙在场 ⇒ 清理即摧毁;巨龙不在 ⇒ 活', () => {
    const withDragon = applyEvents(scene([obj('u', P2, BF0), dragon(P1)]), [hit('u', 1, P1)] as never, {}).state
    const cleaned = runCleanupToFixpoint(withDragon, { extraLethal })
    expect(cleaned.objects['u' as never], '★5 战力 1 点伤=致死化摧毁(§124 换 oid 原 oid 没了)').toBeUndefined()
    const noDragon = applyEvents(scene([obj('u', P2, BF0)]), [hit('u', 1, P1)] as never, {}).state
    const kept = runCleanupToFixpoint(noDragon, { extraLethal })
    expect(kept.objects['u' as never], '★没巨龙 ⇒ 1 点伤活着').toBeDefined()
  })

  test('★★★★★③反例:别人打的不算(「你造成的」);自家单位不吃(「敌方单位」);无伤不吃', () => {
    const wrongSrc = applyEvents(scene([obj('u', P2, BF0), dragon(P1)]), [hit('u', 1, P2)] as never, {}).state
    expect(dragonLethal(wrongSrc, wrongSrc.objects['u' as never]!), '★P2 自己打的,巨龙控制者 P1 没打过').toBe(false)
    const ownSide = applyEvents(scene([obj('m', P1, BF0), dragon(P1), obj('x', P2, BF0)]), [hit('m', 1, P1)] as never, {}).state
    expect(dragonLethal(ownSide, ownSide.objects['m' as never]!), '★巨龙同侧单位=非「敌方」').toBe(false)
    const clean = scene([obj('u', P2, BF0), dragon(P1)])
    expect(dragonLethal(clean, clean.objects['u' as never]!), '★无伤不吃').toBe(false)
    expect(UNL_118_CARD_EFFECT).toContain('任意数量伤害')
  })
})
