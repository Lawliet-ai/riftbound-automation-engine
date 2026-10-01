import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { TWO_TARGET_SPELLS, TWO_TARGET_SPECS, TWO_TARGET_KEY, secondCandidates } from '../../data/cards/two-target-spells'

                                                                  
                                    
                                               
  
           
                                                                  
                                                      
                                                            
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const SPEC = TWO_TARGET_SPECS['UNL-083']!

const obj = (oid: string, who: PlayerId, zone: string, kws: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!

type Ev = { kind: string, obj?: string, to?: string, unit?: string, player?: string, count?: number }
const resolveWith = (s: GameState, first: string | undefined, second?: string): readonly Ev[] =>
  SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(first !== undefined ? { target: first } : {}) } as never)(
    s, second !== undefined ? { [TWO_TARGET_KEY]: second } : {}) as unknown as readonly Ev[]

describe('★ 前提:①登记与②新档候选', () => {
  test('★★★★★2费 0pip 蓝、[待命][迅捷] 都登、进表、走 anotherFriendlyElsewhere 且全族只有它', () => {
    expect(CARD_COSTS['UNL-083']).toEqual({ mana: 2, pips: 0, colors: ['blue'] })
    expect(cardKind('UNL-083')).toBe('spell')
    expect(cardKeywords('UNL-083')).toEqual(['待命', '迅捷'])
    expect(playSpecFor('UNL-083')).toBe(SPEC)
    expect(TWO_TARGET_SPELLS.filter((r) => r.second === 'anotherFriendlyElsewhere').map((r) => r.defId), '★㉖ 新档回归锚').toEqual(['UNL-083'])
  })

  test('★★★★★★②「位置不同」:同 zone 友方不在候选;异 zone 在(含基地);敌方/本人不在;第一个没选 ⇒ 空', () => {
    const s = scene([
      obj('a', P1, bf(scene([]), 0)), obj('same', P1, bf(scene([]), 0)),
      obj('other', P1, bf(scene([]), 1)), obj('atBase', P1, `base:${P1}`), obj('foe', P2, bf(scene([]), 1)),
    ])
    expect(secondCandidates('anotherFriendlyElsewhere', s, P1, 'a'), '★同处的 same 被「位置不同」筛掉;敌方不在')
      .toEqual(['atBase', 'other'])
    expect(secondCandidates('anotherFriendlyElsewhere', s, P1, undefined), '★第一个没选 ⇒ 谈不上「与之」').toEqual([])
  })
})

describe('★★★★★★★ ③④⑤结算:瞬息条件+互换+独立抽牌', () => {
  test('★★★★★★一个有瞬息 ⇒ 互换双发×2(同批读原位)+draw;顺序 A→B位,B→A位', () => {
    const s = scene([obj('a', P1, bf(scene([]), 0), ['瞬息']), obj('b', P1, `base:${P1}`)])
    const evs = resolveWith(s, 'a', 'b')
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved', 'zoneChange', 'unitMoved', 'draw'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'a', to: `base:${P1}` })
    expect(evs[2], '★同批 state 未变 ⇒ b 去的是 a 的**原位**').toMatchObject({ kind: 'zoneChange', obj: 'b', to: bf(s, 0) })
    expect(evs[4]).toMatchObject({ kind: 'draw', player: P1, count: 1 })
  })

  test('★★★★★★③两个都没瞬息 ⇒ 不移动只 draw;**被授予的瞬息也算**(derived 优先于 base)', () => {
    const s = scene([obj('a', P1, bf(scene([]), 0)), obj('b', P1, `base:${P1}`)])
    expect(resolveWith(s, 'a', 'b').map((e) => e.kind), '★条件不满足 ⇒ 「抽一张牌」独立照发').toEqual(['draw'])
                                                                  
    const granted = { ...obj('a', P1, bf(scene([]), 0)), derived: { might: 3, keywords: ['瞬息'] } } as unknown as GameObject
    const s2 = scene([granted, obj('b', P1, `base:${P1}`)])
    expect(resolveWith(s2, 'a', 'b').map((e) => e.kind), '★被授予的瞬息也满足「拥有」')
      .toEqual(['zoneChange', 'unitMoved', 'zoneChange', 'unitMoved', 'draw'])
  })

  test('★★★★★缺一半 ⇒ 不互换(onBoth 双活才调)、draw 照发;都没选 ⇒ 只 draw', () => {
    const s = scene([obj('a', P1, bf(scene([]), 0), ['瞬息'])])
    expect(resolveWith(s, 'a', 'ghost').map((e) => e.kind), '★第二个结算时没了').toEqual(['draw'])
    expect(resolveWith(s, undefined).map((e) => e.kind)).toEqual(['draw'])
  })

  test('★★★★★★E2E:apply 后两单位 zone 真互换', () => {
    const s = scene([obj('a', P1, bf(scene([]), 0), ['瞬息']), obj('b', P1, `base:${P1}`)])
    const after = applyEvents(s, resolveWith(s, 'a', 'b') as never, {}).state
    expect(after.objects['a' as never]!.zone as string).toBe(`base:${P1}`)
    expect(after.objects['b' as never]!.zone as string).toBe(bf(s, 0))
  })
})
