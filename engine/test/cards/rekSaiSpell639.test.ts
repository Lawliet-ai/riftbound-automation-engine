import { afterEach, describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import { playSpecFor } from '../../data/registry'
import {
  SFD_170_SHAPE, banishPlayable, makeBanishPlayRelay, setPlayFromDeckSpecProvider,
} from '../../data/cards/play-from-deck'

                                   
                                                     
                                                   
                                         
                                                       
                                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
})

function scene(objs: readonly GameObject[], runes = 6): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [...objs, ...Array.from({ length: runes }, (_, i) => ({
    oid: asObjId(`rune${i}`), defId: 'rune:黄色', owner: P1, controller: P1,
    zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
    damage: 0, counters: {}, status: {},
  } as unknown as GameObject))]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

                                                                      
const exiledSpell = (oid: string, defId: string): GameObject =>
  obj(oid, defId, `exile:${P1}`, { baseTypes: ['spell'] })

const relay = makeBanishPlayRelay(SFD_170_SHAPE, asObjId('rek'), P1)
const banishedEv = (card: string): GameEvent => ({ kind: 'banished', card: asObjId(card) } as unknown as GameEvent)

afterEach(() => setPlayFromDeckSpecProvider(playSpecFor))                         

describe('★639 雷克塞法术半张:relay 的法术分支', () => {
  test('★★★★★★①②目标类法术答了目标 ⇒ 一条 playSpellFromZone(**无 freeMana/recycleOnLeave**)', () => {
                                                                        
    const s = scene([exiledSpell('sp', 'OGN-085'), obj('foe', 'U-F', BF0, { controller: P2, owner: P2 })])
    const evs = relay.effect(s, banishedEv('sp'), { spellTarget: 'foe' }) as unknown as readonly Record<string, unknown>[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playSpellFromZone', player: P1, card: 'sp', target: 'foe' })
    expect(evs[0]!['freeMana'], '★付全款:errata 没写「无视费用」⇒ 字段压根不给').toBeUndefined()
    expect(evs[0]!['recycleOnLeave'], '★结算完缺省进废牌堆 ⇒ 不带').toBeUndefined()
  })

  test('★★★★★★③目标类法术:nextChoice 问 spellTarget(候选=legalTargets);没答到 ⇒ 静默', () => {
    const s = scene([exiledSpell('sp', 'OGN-085'), obj('foe', 'U-F', BF0, { controller: P2, owner: P2 })])
    const q = relay.nextChoice!(s, banishedEv('sp'), {})!
    expect(q.key).toBe('spellTarget')
    expect(q.candidates.map((c) => c.id)).toContain('foe')
    expect(relay.effect(s, banishedEv('sp'), {}), '★没答目标 ⇒ §355.8 打不出,整条静默').toEqual([])
  })

  test('★★★★★无目标法术(注桩 target:none)⇒ 不问直接发;付不起 ⇒ 零事件', () => {
    const noTarget: PlaySpec = {
      defId: 'OGN-085', cardNo: 'x', name: 'x', kind: 'spell', cost: { mana: 5 }, keywords: [],
      target: 'none', legalTargets: () => [], makeResolve: () => () => [],
    }
    setPlayFromDeckSpecProvider(() => noTarget)
    const s = scene([exiledSpell('sp', 'OGN-085')])
    expect(relay.nextChoice!(s, banishedEv('sp'), {}), '★无目标 ⇒ 不问').toBeNull()
    const evs = relay.effect(s, banishedEv('sp'), {}) as unknown as readonly Record<string, unknown>[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playSpellFromZone', card: 'sp' })
                                                              
    const broke = scene([exiledSpell('sp2', 'OGN-085')], 0)
    expect(relay.effect(broke, banishedEv('sp2'), {})).toEqual([])
  })

  test('★★★★★banishPlayable:雷克塞档收法术(付得起);预检费用=印刷费(㊶ 5费彗星,6符文够)', () => {
    const s = scene([exiledSpell('sp', 'OGN-085')])
    expect(banishPlayable(s, P1, 'OGN-085', SFD_170_SHAPE)).toBe(true)
    expect(banishPlayable(scene([], 0), P1, 'OGN-085', SFD_170_SHAPE), '★零资源付不起').toBe(false)
  })
})
