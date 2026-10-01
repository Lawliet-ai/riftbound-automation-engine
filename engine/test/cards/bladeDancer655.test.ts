import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeBladeDancerTargetTrigger, makeBladeDancerConquerTrigger } from '../../data/cards/SFD-195'

                                                           
                                                                   
                                                 
                                               
  
           
                                                                      
                                                               
                                                         
                         
                                                                      
                                                             
                            

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

                                         
const dancer = (status: Record<string, unknown> = {}): GameObject =>
  ({ ...obj('bd', P1, `legend:${P1}`, ['legend'], status), defId: 'SFD-195' } as GameObject)

const tTrig = makeBladeDancerTargetTrigger(asObjId('bd'), P1)
const cTrig = makeBladeDancerConquerTrigger(asObjId('bd'), P1)
const targeted = (target: string, chooser: PlayerId): GameEvent =>
  ({ kind: 'targeted', chooser, target: asObjId(target) } as unknown as GameEvent)
const conquer = (player: PlayerId): GameEvent =>
  ({ kind: 'conquer', player, battlefield: BF0 } as unknown as GameEvent)

describe('★ 前提:①传奇登记/三印次/③mayChoose', () => {
  test('★★★★★传奇 0费、三号 variant 一组、keywords 三号空、cardCost 登了;两触发都 mayChoose', () => {
    expect(CARD_COSTS['SFD-195']).toEqual({ mana: 0, pips: 0, colors: ['green', 'purple'] })
    expect(cardKind('SFD-195')).toBe('legend')
    expect(VARIANT_GROUPS['SFD-195']).toEqual(['SFD-195', 'SFD-195a', 'SFD-246'])
    for (const no of ['SFD-195', 'SFD-195a', 'SFD-246']) expect(cardKeywords(no), no).toEqual([])
    expect(cardCost('SFD-195')).toEqual({ mana: 0 })
    expect((tTrig as unknown as { mayChoose?: boolean }).mayChoose, '★句①「可以选择」').toBe(true)
    expect((cTrig as unknown as { mayChoose?: boolean }).mayChoose, '★句②「可以选择」').toBe(true)
  })
})

describe('★★★★★★★ ②句① 判据:你将友方单位选为目标', () => {
  const s = scene([dancer(), obj('mine', P1, BF0), obj('foe', P2, BF0), obj('gear', P1, BF0, ['equipment'])])

  test('★★★★★★我选友方单位 ⇒ 响;敌方目标/我的装备目标/对手 chooser ⇒ 都不响', () => {
    expect(checkTrigger(tTrig, targeted('mine', P1), s, P1)).toBe(true)
    expect(checkTrigger(tTrig, targeted('foe', P1), s, P1), '★「友方」').toBe(false)
    expect(checkTrigger(tTrig, targeted('gear', P1), s, P1), '★「单位」(装备目标不算)').toBe(false)
    expect(checkTrigger(tTrig, targeted('mine', P2), s, P2), '★「你」= chooser 是对手不响').toBe(false)
  })

  test('★★★★★★我已横置 ⇒ 入链门槛拦(费用付不出连链都不入,铁律111)', () => {
    const tappedScene = scene([dancer({ tapped: true }), obj('mine', P1, BF0)])
    expect(checkTrigger(tTrig, targeted('mine', P1), tappedScene, P1)).toBe(false)
  })
})

describe('★★★★★★★ ④句② 判据 + ⑤效果形状', () => {
  test('★★★★★④我征服 ⇒ 响;对手征服 ⇒ 不响', () => {
    const s = scene([dancer({ tapped: true })])
    expect(checkTrigger(cTrig, conquer(P1), s, P1)).toBe(true)
    expect(checkTrigger(cTrig, conquer(P2), s, P2)).toBe(false)
  })

  test('★★★★★★⑤句② 效果 = 我 tapped:false(传奇口径);零资源付不起{1} ⇒ 空(㊹)', () => {
                                                             
    const rune = { ...obj('r0', P1, `base:${P1}`, ['rune']), defId: 'rune:绿色' } as GameObject
    const poor = scene([dancer({ tapped: true })])
    expect(cTrig.effect(poor, conquer(P1), {}), '★付不起 ⇒ 整条不执行').toEqual([])
    const s = scene([dancer({ tapped: true }), rune])
    const evs = cTrig.effect(s, conquer(P1), {}) as unknown as readonly { kind: string, target?: string, key?: string, value?: boolean }[]
    expect(evs.filter((e) => e.kind === 'statusChange')).toEqual([
      { kind: 'statusChange', target: 'bd', key: 'tapped', value: false },
    ])
  })
})
