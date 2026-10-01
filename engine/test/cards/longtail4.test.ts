import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { grantBuffInState } from '../../src/keywords/buff'
import type { GameEvent } from '../../src/loop/events'
import { LONGTAIL4_DEFIDS } from '../../data/cards/longtail-4'

                             

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
const plain = (oid: string, defId = 'BLK', ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), defId, baseMight: extra.baseMight ?? 3 })

function scene(objs: GameObject[], hand = 0, deck = 4): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [
    ...objs,
    ...Array.from({ length: hand }, (_, i) => plain(`h${i}`, 'BLK', P1, { zone: asZoneId(`hand:${P1}`) })),
    ...Array.from({ length: deck }, (_, i) => plain(`d${i}`, 'BLK', P1, { zone: asZoneId(`mainDeck:${P1}`) })),
  ]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
function run(st: GameState, ev: GameEvent, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        chosen[req.key] = req.candidates[0]!.id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const might = (s: GameState, oid: string) => effectiveMight(recomputeContinuous(s).objects[oid]!).reference
const handSize = (s: GameState, p = P1) => s.zones[`hand:${p}`]?.contents.length ?? 0
const stunEv = (target: string): GameEvent => ({ kind: 'stun', target: asObjId(target) })
const movedEv = (unit: string): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player: P1, from: asZoneId(BF0), to: asZoneId(BF1) })

describe('★【长尾批次·四】(第156轮)', () => {
  test('前提:登记齐,战力/费用照卡面实测取', () => {
                                                        
                                                           
    expect(LONGTAIL4_DEFIDS.slice().sort())
      .toEqual(['OGN-059', 'OGN-185', 'OGN-261', 'VEN-080', 'VEN-095'])
    for (const [d, m, p] of [['OGN-059', 7, 7], ['OGN-185', 2, 2], ['VEN-080', 2, 1]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
  })

  test('★★星蚀先锋 OGN-059:「你」眩晕「敌方」单位——两半各压一条', () => {
    const mk = () => scene([obj('van', 'OGN-059', P1, { status: { dormant: true } }),
      plain('foe', 'BLK', P2), plain('mate')])
    const hit = run(mk(), stunEv('foe'), P1)
    expect(hit.objects['van']!.status.dormant).toBe(false)
    expect(might(hit, 'van')).toBe(8)       

                      
    const friendly = run(mk(), stunEv('mate'), P1)
    expect(friendly.objects['van']!.status.dormant).toBe(true)
                                 
    const byFoe = run(mk(), stunEv('foe'), P2)
    expect(byFoe.objects['van']!.status.dormant).toBe(true)
  })

  test('★★旅行商人 OGN-185:强制弃一抽一;手上没牌时【抽牌照抽】', () => {
    const withCard = scene([obj('merch', 'OGN-185')], 1)
    const s = run(withCard, movedEv('merch'))
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(1)
    expect(handSize(s)).toBe(1)              

                           
    const empty = scene([obj('merch', 'OGN-185')], 0)
    expect(handSize(run(empty, movedEv('merch')))).toBe(1)
  })

  test('★旅行商人:【任何】移动都算(与猎海小队 SFD-137 限「从战场」正好成对)', () => {
    const st = scene([obj('merch', 'OGN-185')], 1)
    const fromBase: GameEvent = {
      kind: 'unitMoved', unit: asObjId('merch'), player: P1,
      from: asZoneId(`base:${P1}`), to: asZoneId(BF0),
    }
                                          
                                             
    const afterBase = run(st, fromBase)
    expect(handSize(afterBase)).toBe(1)
    expect(afterBase.zones[`discard:${P1}`]!.contents).toHaveLength(1)           
                            
    const other = scene([obj('merch', 'OGN-185'), plain('u')], 1)
    expect(handSize(run(other, movedEv('u')))).toBe(1)               
    expect(run(other, movedEv('u')).zones[`discard:${P1}`]!.contents).toHaveLength(0)
  })

  test('★★诺克萨斯爆破手 VEN-080:「不高于我的战力」是【现算】的', () => {
                                                       
    const mk = () => scene([obj('demo', 'VEN-080'),
      plain('cheap', 'OGN-090', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) }),
      plain('pricey', 'SFD-052', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) }),
                                                       
                                                                  
      plain('cheapInHand', 'OGN-090', P1, { baseTypes: ['equipment'], zone: asZoneId(`hand:${P1}`) }),
      plain('cheapInDiscard', 'OGN-090', P1, { baseTypes: ['equipment'], zone: asZoneId(`discard:${P1}`) })])
    const ev: GameEvent = { kind: 'conquer', player: P1, battlefield: BF0 }
    const st = mk()
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('demo'))!
    expect((t.nextChoice?.(st, ev, {})?.candidates ?? []).map((c) => c.id),
      '手牌/废牌堆里的同款便宜装备不算 —— 去掉 fielded 会红').toEqual(['cheap'])

                                                           
                                          
    const withMid = scene([obj('demo', 'VEN-080'),
      plain('cheap', 'OGN-090', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) }),
      plain('mid', 'OGN-184', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) }),
      plain('pricey', 'SFD-052', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) })])
    const t1 = activeTriggers(withMid).find((y) => y.sourceOid === asObjId('demo'))!
    expect((t1.nextChoice?.(withMid, ev, {})?.candidates ?? []).map((c) => c.id)).toEqual(['cheap'])
    const buffed = recomputeContinuous(grantBuffInState(withMid, asObjId('demo')))
    expect(might(buffed, 'demo')).toBe(2)             
    const t2 = activeTriggers(buffed).find((y) => y.sourceOid === asObjId('demo'))!
                                        
    expect((t2.nextChoice?.(buffed, ev, {})?.candidates ?? []).map((c) => c.id).sort())
      .toEqual(['cheap', 'mid'])
  })

  test('★爆破手:敌方装备也能炸(卡文没写敌我);单位不是装备', () => {
    const st = scene([obj('demo', 'VEN-080'),
      plain('foeGear', 'OGN-090', P2, { baseTypes: ['equipment'], zone: asZoneId(`base:${P2}`) }),
      plain('unit')])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('demo'))!
    const ev: GameEvent = { kind: 'conquer', player: P1, battlefield: BF0 }
    expect((t.nextChoice?.(st, ev, {})?.candidates ?? []).map((c) => c.id)).toEqual(['foeGear'])
  })
})
