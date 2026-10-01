import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { effectiveMight } from '../../src/state/might'
import type { GameEvent } from '../../src/loop/events'
import { REPRINT_BATCH_DEFIDS } from '../../data/cards/reprint-batch'

                                 
  
                                             
                                         
                                                        
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
const legend = (oid: string, defId: string, ctrl = P1): GameObject =>
  obj(oid, defId, ctrl, { zone: asZoneId(`legend:${ctrl}`), baseMight: 0, baseTypes: ['legend'] })

function scene(objs: GameObject[], deck = 2): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [...objs, ...Array.from({ length: deck }, (_, i) =>
    obj(`d${i}`, 'BLK', P1, { zone: asZoneId(`mainDeck:${P1}`) }))]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
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
const handSize = (s: GameState, p = P1) => s.zones[`hand:${p}`]?.contents.length ?? 0
const might = (s: GameState, oid: string) => effectiveMight(s.objects[oid]!).reference
const startPhase = (p = P1): GameEvent => ({ kind: 'startPhase', player: p })

describe('★【再版组批量】(第146轮)', () => {
  test('前提:实现表↔清单对账,且【每个印次】都真的接上了工厂', () => {
    expect(REPRINT_BATCH_DEFIDS.slice().sort()).toEqual([
      'ARC-006', 'FND-251', 'OGN-119', 'OGN-246', 'OGN-251',
      'OGN-255', 'OGN-301', 'OGN-303', 'SFD-227', 'UNL-183', 'UNL-227',
    ])
                              
                                                                           
                                                                  
                                           
                                               
                                             
    for (const defId of REPRINT_BATCH_DEFIDS) {
      const isLegend = specLookup(defId).baseTypes?.includes('legend') ?? false
      const o = isLegend ? legend('probe', defId) : obj('probe', defId)
      const st = scene([o])
      expect(activeTriggers(st).filter((t) => t.sourceOid === asObjId('probe')).length,
        `${defId} 没有产出触发`).toBeGreaterThan(0)
    }
  })

  test('前提:费用照 cardCosts.ts 实测取,【再版也读得到】(同样走别名)', () => {
    for (const d of ['OGN-251', 'OGN-301', 'FND-251', 'OGN-255', 'OGN-303', 'UNL-183', 'UNL-227']) {
      expect(cardKind(d), d).toBe('legend')
      expect(cardCost(d).mana, d).toBe(0)
    }
    for (const d of ['OGN-119', 'SFD-227']) {
      expect(cardCost(d).mana, d).toBe(3)
      expect(cardCost(d).pips, d).toEqual([['blue']])
      expect(specLookup(d).baseMight, d).toBe(3)
    }
    for (const d of ['OGN-246', 'ARC-006']) {
      expect(cardCost(d).mana, d).toBe(4)
      expect(cardCost(d).pips, d).toEqual([['yellow']])
      expect(specLookup(d).baseMight, d).toBe(4)
    }
  })

  test('★暴走萝莉 OGN-251:手牌「不足两张」压三档(0/1 抽,2 不抽)', () => {
    const hand = (n: number) => Array.from({ length: n }, (_, i) =>
      obj(`h${i}`, 'BLK', P1, { zone: asZoneId(`hand:${P1}`) }))
    expect(handSize(run(scene([legend('lg', 'OGN-251')]), startPhase()))).toBe(1)                
    expect(handSize(run(scene([legend('lg', 'OGN-251'), ...hand(1)]), startPhase()))).toBe(2)           
    expect(handSize(run(scene([legend('lg', 'OGN-251'), ...hand(2)]), startPhase()))).toBe(2)            
  })

  test('★暴走萝莉:【对手的】开始阶段不触发(⑫ 配对照组)', () => {
    const st = scene([legend('lg', 'OGN-251')])
    expect(handSize(run(st, startPhase(P2), P2))).toBe(0)
    expect(handSize(run(st, startPhase(P1), P1))).toBe(1)               
  })

  test('★阿狸 OGN-119:进攻与防守【两个时机都接了】,减到 1 就停(floor)', () => {
    const mk = () => scene([obj('ahri', 'OGN-119'), obj('foe', 'BLK', P2, { baseMight: 3 })])
    for (const kind of ['attack', 'defend'] as const) {
      const s = run(mk(), { kind, unit: asObjId('ahri'), player: P1, battlefield: BF0 })
      expect(might(s, 'foe'), kind).toBe(1)         
    }
                                                  
    const weak = scene([obj('ahri', 'OGN-119'), obj('foe', 'BLK', P2, { baseMight: 2 })])
    expect(might(run(weak, { kind: 'attack', unit: asObjId('ahri'), player: P1, battlefield: BF0 }), 'foe')).toBe(1)
  })

  test('★阿狸:候选是【我所在那处】的【敌方】单位', () => {
    const st = scene([obj('ahri', 'OGN-119'),
      obj('foeHere', 'BLK', P2), obj('mateHere', 'BLK', P1),
      obj('foeFar', 'BLK', P2, { zone: asZoneId(BF1) })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('ahri') && y.event === 'attack')!
    const ev: GameEvent = { kind: 'attack', unit: asObjId('ahri'), player: P1, battlefield: BF0 }
    expect((t.nextChoice?.(st, ev, {})?.candidates ?? []).map((c) => c.id)).toEqual(['foeHere'])
  })

  test('★九尾妖狐 OGN-255:盯的是【对手】进攻【我控制的】战场', () => {
                                          
    const st = scene([legend('lg', 'OGN-255'), obj('mine', 'BLK', P1),
      obj('atk', 'BLK', P2, { baseMight: 4, zone: asZoneId(BF1) })])
    const s = run(st, { kind: 'attack', unit: asObjId('atk'), player: P2, battlefield: BF0 }, P2)
    expect(might(s, 'atk')).toBe(3)       

                               
    const s2 = run(st, { kind: 'attack', unit: asObjId('atk'), player: P2, battlefield: BF1 }, P2)
    expect(might(s2, 'atk')).toBe(4)
                                       
    const s3 = run(st, { kind: 'attack', unit: asObjId('mine'), player: P1, battlefield: BF0 }, P1)
    expect(might(s3, 'mine')).toBe(3)              
  })

  test('★傲之追猎者 UNL-183:我打出单位时,任意一名单位 +1(敌我不限)', () => {
    const st = scene([legend('lg', 'UNL-183'), obj('mine', 'BLK', P1), obj('foe', 'BLK', P2)])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('lg'))!
    const ev: GameEvent = { kind: 'playUnit', unit: asObjId('mine'), player: P1 }
                      
    expect((t.nextChoice?.(st, ev, {})?.candidates ?? []).map((c) => c.id).sort()).toEqual(['foe', 'mine'])
    expect(might(run(st, ev, P1, 'foe'), 'foe')).toBe(4)
                                   
    expect(might(run(st, { kind: 'playUnit', unit: asObjId('foe'), player: P2 }, P2), 'foe')).toBe(3)
  })

  test('★维克托 OGN-246:三重限定各压一条(你的 / 另一名 / 非随从)', () => {
    const minions = (s: GameState) =>
      (s.zones[`base:${P1}`]?.contents ?? []).filter((o) => s.objects[o]!.defId === 'token:随从').length
    const st = scene([obj('vik', 'OGN-246', P1, { baseMight: 4 })])
    const died = (o: GameObject): GameEvent => ({
      kind: 'destroyed',
      victim: {
        oid: o.oid, defId: o.defId, controller: o.controller, owner: o.owner, zone: o.zone,
        might: o.baseMight, damage: 0, keywords: [], counters: {}, status: {}, types: ['unit'],
      } as never,
    })
                          
    expect(minions(run(st, died(obj('mate', 'BLK', P1))))).toBe(1)
                     
    expect(minions(run(st, died(obj('foe', 'BLK', P2))))).toBe(0)
                        
    expect(minions(run(st, died(st.objects['vik']!)))).toBe(0)
                                 
    expect(minions(run(st, died(obj('mn', 'token:随从', P1))))).toBe(0)
  })
})
