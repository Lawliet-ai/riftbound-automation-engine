import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind, costModsFor, playSpecFor } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { computeCost } from '../../src/game/costPipeline'
import type { GameEvent } from '../../src/loop/events'
import { LONGTAIL2_DEFIDS } from '../../data/cards/longtail-2'
import { EXTRA_BF_DEFIDS } from '../../data/cards/battlefields-extra'

                                   
                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const plain = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: extra.baseMight ?? 3 })

function scene(objs: GameObject[], bf?: string): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(bf ? { battlefieldCards: { [BF0]: { defId: bf, owner: P1 } } } : {}),
  }
}
function run(st: GameState, ev: GameEvent, actor = P1, pick?: string): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        const hit = pick === undefined ? undefined : req.candidates.find((c) => c.id === pick)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const might = (s: GameState, oid: string) => effectiveMight(recomputeContinuous(s).objects[oid]!).reference
const activate = (oid: string): GameEvent => ({ kind: 'statusChange', target: asObjId(oid), key: 'dormant', value: false })

describe('★【长尾批次·二】(第151轮)', () => {
  test('前提:登记齐,战力/费用照卡面实测取', () => {
    expect(LONGTAIL2_DEFIDS.slice().sort())
      .toEqual(['OGN-143', 'OGN-148', 'OGN-195', 'OGN-229', 'OGN-285', 'VEN-071'])
    expect(EXTRA_BF_DEFIDS).toContain('OGN-285')                 
    expect(cardKind('OGN-229')).toBe('spell')
    expect(cardCost('OGN-229')).toEqual({ mana: 4, pips: [['yellow'], ['yellow']] })
    expect(cardCost('OGN-148')).toEqual({ mana: 7, pips: [['orange'], ['orange']] })
    expect(specLookup('OGN-148').baseMight).toBe(8)
    expect(cardCost('OGN-195')).toEqual({ mana: 10, pips: [['purple']] })
    expect(cardKind('OGN-143')).toBe('equipment')
  })

  test('★复仇 OGN-229:候选是场上任意单位(含基地、含我方)', () => {
    const st = scene([plain('mine'), plain('foe', P2), plain('inBase', P1, { zone: asZoneId(`base:${P1}`) }),
      plain('gear', P1, { baseTypes: ['equipment'] })])
    const spec = playSpecFor('OGN-229')!
    expect([...spec.legalTargets!(st, P1)].sort()).toEqual(['foe', 'inBase', 'mine'])          
    const evs = spec.makeResolve({ movedCardOid: 'x', controller: P1, target: 'foe' } as never)(st, {}, undefined as never)
    expect(evs).toEqual([{ kind: 'destroy', target: 'foe' }])                         
  })

  test('★艾尼维亚 OGN-148:打【此处所有】敌方各3点;友方与别处不受影响', () => {
    const st = scene([obj('anivia', 'OGN-148'),
      plain('f1', P2, { baseMight: 20 }), plain('f2', P2, { baseMight: 20 }),
      plain('mate', P1, { baseMight: 20 }), plain('far', P2, { baseMight: 20, zone: asZoneId(BF1) })])
    const after = run(st, { kind: 'attack', unit: asObjId('anivia'), player: P1, battlefield: BF0 })
    expect(after.objects['f1']!.damage).toBe(3)
    expect(after.objects['f2']!.damage).toBe(3)                       
    expect(after.objects['mate']!.damage).toBe(0)
    expect(after.objects['far']!.damage).toBe(0)
  })

  test('★★焦躁的猫咪 VEN-071:只认 dormant→false,「变为休眠」与别的状态都不算', () => {
    const st = scene([obj('cat', 'VEN-071', P1, { status: { dormant: true } })])
    expect(might(run(st, activate('cat')), 'cat')).toBe(7)       
                                                       
    const toDormant: GameEvent = { kind: 'statusChange', target: asObjId('cat'), key: 'dormant', value: true }
    expect(might(run(st, toDormant), 'cat')).toBe(5)
    const untap: GameEvent = { kind: 'statusChange', target: asObjId('cat'), key: 'tapped', value: false }
    expect(might(run(st, untap), 'cat')).toBe(5)                 
                             
    const withOther = scene([obj('cat', 'VEN-071'), plain('other')])
    expect(might(run(withOther, activate('other')), 'cat')).toBe(5)
  })

  test('★★海盗避风港 OGN-143:加成给【被弄活跃的那个单位】,不是给我自己', () => {
                                                     
    const st = scene([obj('haven', 'OGN-143', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) }),
      plain('mine', P1, { status: { dormant: true } }), plain('foe', P2, { status: { dormant: true } })])
    const after = run(st, activate('mine'), P1)
                                    
    expect(might(after, 'mine')).toBe(4)
                                               
    expect(might(run(st, activate('foe'), P1), 'foe')).toBe(3)
    expect(might(run(st, activate('mine'), P2), 'mine')).toBe(3)
  })

  test('★★裂魂者喇煞 OGN-195:废牌堆每张减1,压三档且减到 0 为止', () => {
    const mk = (n: number) => {
      const junk = Array.from({ length: n }, (_, i) => plain(`j${i}`, P1, { zone: asZoneId(`discard:${P1}`) }))
      return scene(junk)
    }
    const printed = cardCost('OGN-195')
    const manaAfter = (n: number) => computeCost(printed, costModsFor(mk(n), P1, 'OGN-195')).mana
    expect(manaAfter(0)).toBe(10)
    expect(manaAfter(3)).toBe(7)
    expect(manaAfter(10)).toBe(0)
    expect(manaAfter(15)).toBe(0)                                        
                 
    expect(computeCost(cardCost('OGN-148'), costModsFor(mk(5), P1, 'OGN-148')).mana).toBe(7)
  })

  test('★★劫掠船巷 OGN-285:【防守】时机 + 只有「你」那一份响', () => {
    const st = scene([plain('mine'), plain('foe', P2)], 'OGN-285')
    const defendEv = (p: typeof P1): GameEvent => ({ kind: 'defend', player: p, battlefield: BF0 })
                 
    const t = activeTriggers(st).find((y) => y.sourceDefId === 'OGN-285' && y.controller === P1)!
    expect((t.nextChoice?.(st, defendEv(P1), {})?.candidates ?? []).map((c) => c.id)).toEqual(['mine'])
    const after = run(st, defendEv(P1), P1)
    expect(after.objects['mine']!.zone).toBe(`base:${P1}`)
                                                 
    const fired = activeTriggers(st).filter((y) =>
      y.sourceDefId === 'OGN-285' && y.controller === P1 && (y.filter?.(defendEv(P2), st) ?? true))
    expect(fired).toHaveLength(0)
  })
})
