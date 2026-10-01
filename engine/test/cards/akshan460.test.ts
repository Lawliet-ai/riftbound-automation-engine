import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { DelayedTrigger } from '../../src/effects/delayedTriggers'
import { activeTriggers, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { SFD_109, SFD_109_EXTRA_COST, SFD_109_CARD_EFFECT, makeAkshan109Trigger, PLAY_EXTRA_COST_DEFIDS } from '../../data/cards/play-extra-cost'

                                      
                                                                     
                                                                
                                                                        
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('ak')
const ARMAMENT = (d: string): boolean => d === 'SFD-150'              

function obj(id: string, ctrl: typeof P1, zone: string, types: readonly string[] = ['unit'], defId = 'BLK'): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[], extra: Partial<GameState> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, ...extra } as GameState
}
const play = (bonus?: boolean, unit = 'ak'): GameEvent => ({ kind: 'playUnit', player: P1, unit: asObjId(unit), ...(bonus !== undefined ? { bonus } : {}) } as GameEvent)
                                                                                 
const board = (): GameState => scene([
  obj('ak', P1, BF0, ['unit'], 'SFD-109'),
  obj('arm', P2, `base:${P2}`, ['equipment'], 'SFD-150'),
  obj('g', P2, BF0, ['equipment'], 'OGN-098'),
  obj('mine', P1, `base:${P1}`, ['equipment'], 'SFD-150'),
])
const trig = makeAkshan109Trigger(SELF, P1, ARMAMENT)

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('官方名阿克尚;4费0pip 橙 4S;[百炼] 两条通道;额外费表登了;无变体', () => {
    expect(SFD_109.name).toBe('阿克尚')
    expect(CARD_COSTS['SFD-109']).toEqual({ mana: 4, pips: 0, colors: ['orange'] })
    expect(SFD_109.power).toBe(4)
    expect(SFD_109.keywords).toEqual(['百炼'])
    expect(cardKeywords('SFD-109'), 'CARD_KEYWORDS 侧(教训②)').toEqual(['百炼'])
    expect(VARIANT_GROUPS['SFD-109']).toBeUndefined()
    expect(PLAY_EXTRA_COST_DEFIDS, '额外费族表登了').toContain('SFD-109')
    expect(SFD_109_EXTRA_COST.cost, '「可以选择」⇒ 可选;两枚橙 pip').toEqual({ mana: 0, pips: [['orange'], ['orange']] })
    expect((SFD_109_EXTRA_COST as { required?: boolean }).required).toBeUndefined()
    expect(SFD_109_CARD_EFFECT).toContain('直到我离场为止')
  })
})

describe('🔴★★★★打出触发:付了额外费才响,夺装备两条落点', () => {
  test('🔴★★★bonus 门:付了响(mayChoose);没付不响;别人打出不响', () => {
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose).toBe(true)
    expect(trig.filter!(play(true), board())).toBe(true)
    expect(trig.filter!(play(), board()), '没付额外费').toBe(false)
    expect(trig.filter!(play(true, 'other'), board()), '打出的不是我').toBe(false)
  })

  test('🔴★★★候选=场上敌方装备(武装+散装备);我方不进;无候选不问', () => {
    const req = trig.nextChoice!(board(), play(true), {})
    expect([...req!.candidates.map((c) => c.id)].sort()).toEqual(['arm', 'g'])
    const bare = scene([obj('ak', P1, BF0, ['unit'], 'SFD-109'), obj('mine', P1, `base:${P1}`, ['equipment'], 'SFD-150')])
    expect(trig.nextChoice!(bare, play(true), {})).toBeNull()
  })

  test('🔴★★★[武装]档:changeController+attach 到我+延时档(returnTo=夺前原主 ㉗)', () => {
    const evs = trig.effect!(board(), play(true), { gear: 'arm' })
    expect(evs).toHaveLength(3)
    expect(evs[0]).toMatchObject({ kind: 'changeController', target: 'arm', player: P1 })
    expect(evs[1]).toMatchObject({ kind: 'attach', obj: 'arm', to: 'ak', player: P1 })
    expect(evs[2]).toMatchObject({ kind: 'delayedTrigger',
      add: { kind: 'returnGearOnLeave', watch: 'ak', gear: 'arm', returnTo: P2 } })
  })

  test('🔴★★★非武装档:zoneChange 到【我】基地(不 attach);装备没了 ⇒ 全空', () => {
    const evs = trig.effect!(board(), play(true), { gear: 'g' })
    expect(evs[1]).toMatchObject({ kind: 'zoneChange', obj: 'g', to: `base:${P1}` })
    expect(evs.map((e) => (e as { kind: string }).kind)).not.toContain('attach')
    expect(trig.effect!(board(), play(true), { gear: 'gone' })).toEqual([])
  })
})

describe('🔴★★★★returnGearOnLeave 延时档:一档三条离场路', () => {
  const DELAYED: DelayedTrigger = {
    kind: 'returnGearOnLeave', id: 'SFD-109:ak:arm', controller: P1, sourceDefId: 'SFD-109',
    watch: asObjId('ak'), gear: asObjId('arm'), returnTo: P2,
  } as DelayedTrigger
  const withD = (objs: GameObject[]): GameState => scene(objs, { delayedTriggers: [DELAYED] } as Partial<GameState>)

  test('🔴★★★注入三条(destroyed/banished/left);gear 死了 ⇒ 0 条(剪枝)', () => {
    const s = withD([obj('ak', P1, BF0, ['unit'], 'SFD-109'), obj('arm', P1, BF0, ['equipment'], 'SFD-150')])
    expect(activeTriggers(s).filter((t) => t.id.includes('SFD-109:delayed'))).toHaveLength(3)
    const gearGone = withD([obj('ak', P1, BF0, ['unit'], 'SFD-109')])
    expect(activeTriggers(gearGone).filter((t) => t.id.includes('SFD-109:delayed')), '装备没了没得还').toHaveLength(0)
  })

  test('🔴★★★zoneChange 离场路:我从战场回手响;场上→场上不响;别人不响', () => {
    const s = withD([obj('ak', P1, BF0, ['unit'], 'SFD-109'), obj('arm', P1, BF0, ['equipment'], 'SFD-150')])
    const left = activeTriggers(s).find((t) => t.id.endsWith(':left'))!
    expect(left.filter!({ kind: 'zoneChange', obj: 'ak', from: asZoneId(BF0), to: asZoneId(`hand:${P1}`) } as GameEvent, s)).toBe(true)
    expect(left.filter!({ kind: 'zoneChange', obj: 'ak', from: asZoneId(BF0), to: asZoneId(`base:${P1}`) } as GameEvent, s), '场上挪场上').toBe(false)
    expect(left.filter!({ kind: 'zoneChange', obj: 'arm', from: asZoneId(BF0), to: asZoneId(`hand:${P1}`) } as GameEvent, s), '不是 watch').toBe(false)
  })

  test('🔴★★★destroyed 路 victimIsSelf;effect = clear + 还控回原主;gear 没了只 clear', () => {
    const s = withD([obj('ak', P1, BF0, ['unit'], 'SFD-109'), obj('arm', P1, BF0, ['equipment'], 'SFD-150')])
    const dtr = activeTriggers(s).find((t) => t.id.endsWith(':destroyed'))!
    expect(dtr.filter!({ kind: 'destroyed', victim: { oid: 'ak' } } as GameEvent, s)).toBe(true)
    expect(dtr.filter!({ kind: 'destroyed', victim: { oid: 'other' } } as GameEvent, s)).toBe(false)
    const evs = dtr.effect!(s, { kind: 'destroyed', victim: { oid: 'ak' } } as GameEvent, {})
    expect(evs[0]).toMatchObject({ kind: 'delayedTrigger', clear: 'SFD-109:ak:arm' })
    expect(evs[1]).toMatchObject({ kind: 'changeController', target: 'arm', player: P2 })
  })
})
