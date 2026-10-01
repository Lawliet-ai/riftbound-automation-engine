import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem } from '../../src/loop/chain'
import { activatedFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { gangplankRewrites, VEN_181_BOOST, VEN_181_DEFIDS } from '../../data/cards/VEN-181'

                                                             
                            
                                                           
                                   
  
           
                                                                
                                                      
                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const plank = (oid: string, defId: string, emp: number, status: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 6, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: emp > 0 ? { empower: emp } : {}, status,
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
  return { ...base, activePlayer: P2, phase: 'main', objects, zones } as GameState
}

const item = (targets: readonly string[]): ChainItem =>
  ({ id: 'i1', controller: P2, kind: 'spell', targets, status: 'confirmed', resolve: () => [] } as unknown as ChainItem)

const stunEv = (t: string): GameEvent => ({ kind: 'stun', target: asObjId(t) } as GameEvent)
const negEv = (t: string, delta: number): GameEvent => ({
  kind: 'addEffect',
  effect: {
    id: 'x', duration: 'thisTurn', fromPassive: false,
    predicate: (o: GameObject) => (o.oid as string) === t,
    modification: { kind: 'addMight', delta },
  },
} as unknown as GameEvent)
const bounceEv = (t: string): GameEvent => ({ kind: 'zoneChange', obj: asObjId(t), to: asZoneId(`hand:${P1}`) } as GameEvent)

const isBoost = (ev: GameEvent): boolean =>
  ev.kind === 'addEffect' && (ev as unknown as { effect: { modification: { delta?: number } } }).effect.modification.delta === VEN_181_BOOST

describe('★ 前提:双印次 / 工厂强化', () => {
  test('★★★★★6费0pip 橙、两号同组;[强化橙色橙色] 工厂出 spec(0法力+2橙pip,㊶ 数个数)', () => {
    expect(CARD_COSTS['VEN-181']).toEqual({ mana: 6, pips: 0, colors: ['orange'] })
    expect(cardKind('VEN-181')).toBe('unit')
    expect(VARIANT_GROUPS['VEN-181']).toEqual(['VEN-086', 'VEN-181'])
    expect(VEN_181_DEFIDS).toEqual(['VEN-086', 'VEN-181'])
    expect(cardKeywords('VEN-181')).toEqual(['强化橙色橙色'])
    expect(cardKeywords('VEN-086'), '★异画号同登').toEqual(['强化橙色橙色'])
    const specs = activatedFor('VEN-181')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.cost, '★0 法力 + 两枚橙 pip').toEqual({ mana: 0, pips: [['orange'], ['orange']] })
  })
})

describe('★★★★★★★ ②三种改写(已强化 + 选我为目标)', () => {
  const s = scene([plank('gp', 'VEN-181', 1)])
  const it = item(['gp'])

  test('★★★★★★stun ⇒ +3;负 addMight ⇒ +3;回手 ⇒ +3(各自替换,「在本回合内」)', () => {
    for (const ev of [stunEv('gp'), negEv('gp', -2), bounceEv('gp')]) {
      const out = gangplankRewrites(s, it, [ev])
      expect(out).toHaveLength(1)
      expect(isBoost(out[0]!), `★${ev.kind} 被换成 +3`).toBe(true)
    }
  })

  test('★★★★★★⑤裁定①:给别人的负效果不动;给我的正 delta 不动;打别人的 stun 不动', () => {
    const untouched = [negEv('other', -2), negEv('gp', 2), stunEv('other'), bounceEv('other')]
    const out = gangplankRewrites(s, it, untouched)
    expect(out).toEqual(untouched)
  })

  test('★★★★★★③裁定②:不选目标的项目(targets 空/不含我)⇒ 三种都不拦', () => {
    const evs = [stunEv('gp'), negEv('gp', -2), bounceEv('gp')]
    expect(gangplankRewrites(s, item([]), evs)).toEqual(evs)
    expect(gangplankRewrites(s, item(['other']), evs)).toEqual(evs)
  })

  test('★★★★★★④裁定②:**已眩晕** ⇒ 眩晕行动不执行,不白拿 +3(负S/回手照拦)', () => {
    const stunned = scene([plank('gp', 'VEN-181', 1, { stunned: true })])
    const out = gangplankRewrites(stunned, item(['gp']), [stunEv('gp'), negEv('gp', -2)])
    expect(out[0], '★stun 原样(applyStunInState 幂等吞)').toEqual(stunEv('gp'))
    expect(isBoost(out[1]!), '★-S 那条照换').toBe(true)
  })

  test('★★★★★★⑥未强化 ⇒ 全不拦;双印次 086 也认', () => {
    const cold = scene([plank('gp', 'VEN-181', 0)])
    expect(gangplankRewrites(cold, item(['gp']), [stunEv('gp')])).toEqual([stunEv('gp')])
    const alt = scene([plank('gp', 'VEN-086', 1)])
    expect(isBoost(gangplankRewrites(alt, item(['gp']), [stunEv('gp')])[0]!)).toBe(true)
  })
})
