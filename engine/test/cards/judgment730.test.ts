import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { OGN_244_SPEC, JUDGMENT_KEEP } from '../../data/cards/OGN-244'

                                                           
                                                
              
                                                            
                                                           
                                                              
                                                                
                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const gear = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, who, BF0), baseTypes: ['equipment'] } as GameObject)
const rune = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, who, `base:${who}`, { baseTypes: ['rune'] } as Partial<GameObject>), defId: 'rune:yellow' } as GameObject)
const handCard = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, who, `hand:${who}`), baseTypes: ['spell'] } as GameObject)

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

type Ev = { kind: string, player?: string, objs?: readonly string[] }
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  OGN_244_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  OGN_244_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]

describe('★★★★★★★ ①②问链:分别选择+不限己方', () => {
  test('★★★★★★问1=P1 选单位,候选=**全场不分敌我**(QA L319);P1 四类答完 ⇒ 问 P2(controller 切换)', () => {
    const s = scene([obj('m1', P1, BF0), obj('f1', P2, BF0), gear('g1', P1), rune('r1', P2), handCard('h1', P1), handCard('h2', P2)])
    const q1 = ask(s)!
    expect(q1.controller, '★问1归 P1').toBe(P1)
                                            
                                                                   
    expect(q1.candidates.map((c) => c.id), '★单位候选=敌我都在,且首问无「就这些」').toEqual(['f1', 'm1'])
                                               
                                                                   
    const answeredP1 = {
      'judg:P1:unit:0': 'f1', 'judg:P1:unit:1': 'm1',
      'judg:P1:gear:0': 'g1',
      'judg:P1:rune:0': 'r1',
      'judg:P1:hand:0': 'h1',
    }
    const qP2 = ask(s, answeredP1)!
    expect(qP2.controller, '★「分别选择」⇒ 轮到 P2 自己答(㊼ SFD-136)').toBe(P2)
    expect(qP2.key.startsWith('judg:P2:unit:'), '★P2 从单位类开始').toBe(true)
  })

  test('★★★★★P2 手牌候选=P2 自己的(「自己的两张手牌」=唯一限自己类)', () => {
    const s = scene([handCard('h1', P1), handCard('h2', P2), handCard('h3', P2)])
                                                                    
    const chosen: Record<string, string> = { 'judg:P1:hand:0': 'h1' }
    const q = ask(s, chosen)!
    expect(q.controller).toBe(P2)
                                                
    expect(q.candidates.map((c) => c.id), '★P2 只见自己手牌').toEqual(['h2', 'h3'])
  })
})

describe('★★★★★★★ ③④⑤resolve:并集保留+其余回收', () => {
  test('★★★★★★四名单位 P1 留 {m1,f1}、P2 留 {m2,f2} ⇒ 并集四名全留,x 回收按 owner;选中的不回收', () => {
                                       
                                              
                                                                            
                                                         
    const s = scene([obj('m1', P1, BF0), obj('m2', P1, BF0), obj('f1', P2, BF0), obj('f2', P2, BF0), obj('x', P2, BF0)])
    const evs = resolveWith(s, {
      'judg:P1:unit:0': 'm1', 'judg:P1:unit:1': 'f1',
      'judg:P2:unit:0': 'm2', 'judg:P2:unit:1': 'f2',
    })
    expect(evs).toHaveLength(1)
    expect(evs[0], '★只有 x 回收(owner P2);并集 {m1,f1,m2,f2} 留在原位').toMatchObject({ kind: 'recycle', player: P2, objs: ['x'] })
                                                                 
    const recycled = evs.flatMap((e) => e.objs ?? [])
    for (const kept of ['m1', 'm2', 'f1', 'f2']) {
      expect(recycled, `★${kept} 在两人并集里 ⇒ 不回收`).not.toContain(kept)
    }
  })

  test('★★★★★★四类各自回收+手牌各归各;两人每类选集不同 ⇒ 并集全留,余者按 owner 回收', () => {
                                                              
                                                     
    const s = scene([
      obj('m1', P1, BF0), obj('m2', P1, BF0), obj('f1', P2, BF0), obj('f2', P2, BF0), obj('e', P2, BF0),
      gear('g1', P1), gear('g2', P1), gear('h1', P2), gear('h2', P2), gear('ge', P1),
      rune('r1', P1), rune('r2', P1), rune('s1', P2), rune('s2', P2), rune('re', P2),
      handCard('c1', P1), handCard('c2', P1), handCard('c3', P1),
    ])
    const evs = resolveWith(s, {
      'judg:P1:unit:0': 'm1', 'judg:P1:unit:1': 'f1', // 并集 {m1,f1,m2,f2} ⇒ 余 e
      'judg:P2:unit:0': 'm2', 'judg:P2:unit:1': 'f2',
      'judg:P1:gear:0': 'g1', 'judg:P1:gear:1': 'g2', // 并集 {g1,g2,h1,h2} ⇒ 余 ge
      'judg:P2:gear:0': 'h1', 'judg:P2:gear:1': 'h2',
      'judg:P1:rune:0': 'r1', 'judg:P1:rune:1': 'r2', // 并集 {r1,r2,s1,s2} ⇒ 余 re
      'judg:P2:rune:0': 's1', 'judg:P2:rune:1': 's2',
      'judg:P1:hand:0': 'c1', 'judg:P1:hand:1': 'c2', // ⇒ 余 c3(手牌各归各)
    })
    const byKey = evs.map((e) => `${e.player}:${(e.objs ?? []).join(',')}`).sort()
    expect(byKey, '★e→P2、ge→P1、re→P2、c3→P1(按 owner 分组;手牌只回收自己的)').toEqual(['P1:c3', 'P1:ge', 'P2:e', 'P2:re'])
                                                          
    const recycled = evs.flatMap((e) => e.objs ?? [])
    for (const kept of ['m1', 'm2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2', 'r1', 'r2', 's1', 's2', 'c1', 'c2']) {
      expect(recycled, `★${kept} 在两人并集里 ⇒ 不回收`).not.toContain(kept)
    }
    expect(JUDGMENT_KEEP).toBe(2)
  })
})

describe('★ 前提:登记(法术面,无组实证)', () => {
  test('★★★★★7费 2黄pip、spell、无组、keywords 空、PLAY_SPECS 进表', () => {
    expect(CARD_COSTS['OGN-244']).toEqual({ mana: 7, pips: 2, colors: ['yellow'] })
    expect(cardKind('OGN-244')).toBe('spell')
    expect(VARIANT_GROUPS['OGN-244'], '★无组实证').toBeUndefined()
    expect(cardKeywords('OGN-244')).toEqual([])
    expect(playSpecFor('OGN-244')!.target).toBe('none')
    expect(OGN_244_SPEC.cost).toEqual({ mana: 7, pips: [['yellow'], ['yellow']] })
  })
})
