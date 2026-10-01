import { describe, expect, test } from 'vitest'
import { EXPECTED_TRIGGER_ZONE_DEFIDS } from '../support/triggerZoneDefIds'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { LONGTAIL14_DEFIDS } from '../../data/cards/longtail-14'
import { CARD_COSTS } from '../../data/cardCosts'

                     
                                                 
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [],
    baseTypes: types as never, damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], deck = 6): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [
    ...objs,
                           
    ...[P1, P2].flatMap((p) => Array.from({ length: deck }, (_, i) =>
      obj(`d${p}${i}`, 'BLK', p, `mainDeck:${p}`))),
  ]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                       
function fire(st: GameState, ev: GameEvent, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (const it of s.chain.filter((x: { status: string }) => x.status === 'pending')) {
    s = applyEvents(s, it.resolve(s, {}, it), {}).state
  }
  return s
}
const handSize = (s: GameState, p = P1): number => s.zones[`hand:${p}`]?.contents.length ?? 0
const chainLen = (st: GameState, ev: GameEvent, actor = P1): number =>
  landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {}).chain.length
const might = (st: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(st).objects[oid]!).reference

describe('★【长尾批次·十四】前提', () => {
  test('登记齐,费用照卡面实测取', () => {
    expect(LONGTAIL14_DEFIDS.slice().sort()).toEqual(['OGN-182', 'OGS-006', 'OGS-021'])
    expect(cardKind('OGN-182')).toBe('equipment')
    expect(cardCost('OGN-182')).toEqual({ mana: 2 })                      
    expect(cardCost('OGS-006')).toEqual({ mana: 6, pips: [['blue']] })
    expect(cardCost('OGS-021')).toEqual({ mana: 0 })                 
    expect(cardKind('OGS-021')).toBe('legend')
    expect(specLookup('OGS-006').baseMight).toBe(5)
                                                              
    expect([...TRIGGER_ZONE_DEFIDS].sort()).toEqual([...EXPECTED_TRIGGER_ZONE_DEFIDS])
  })

  test('★★提伯斯 OGS-018 本来就实现了(反证锚点里那句陈了的话,铁律82)', () => {
    const st = scene([obj('tib', 'OGS-018')])
    expect(activeTriggers(st).some((t) => t.sourceOid === asObjId('tib'))).toBe(true)
  })
})

describe('★★废料堆 OGN-182(打出 / 弃置 / 摧毁 各抽一张)', () => {
  const inHand = () => obj('scrap', 'OGN-182', P1, `hand:${P1}`, ['equipment'])
  const inBase = () => obj('scrap', 'OGN-182', P1, `base:${P1}`, ['equipment'])

  test('★★★在【手牌里】就得有活跃触发(区域白名单本来把它拦在门外)', () => {
                                                     
                                       
    const st = scene([inHand()])
    expect(activeTriggers(st).filter((t) => t.sourceOid === asObjId('scrap')).length).toBe(3)
  })

  test('★★被弃置(手牌 → 废牌堆)抽一张', () => {
                                                           
                      
    const st = scene([inHand()])
    const after = fire(st, { kind: 'zoneChange', obj: asObjId('scrap'), to: asZoneId(`discard:${P1}`) } as GameEvent)
    expect(handSize(after)).toBe(1)                
  })

  test('★★★被摧毁抽一张 —— 走【真摧毁流程】(发 destroy 指令,不是伪造裸 destroyed)', () => {
                                                       
                                                            
                                                                       
    const st = scene([inBase()])
    expect(handSize(fire(st, { kind: 'destroy', target: asObjId('scrap'), sourcePlayer: P1 } as GameEvent))).toBe(1)
  })

  test('★★被打出抽一张(装备走 playUnit)', () => {
    const st = scene([inBase()])
    expect(handSize(fire(st, { kind: 'playUnit', unit: asObjId('scrap') } as GameEvent))).toBe(1)
  })

  test('★★★三个时机互斥:一次【摧毁】只抽一张,不许把"弃置"那条也点着', () => {
                                                          
                                    
    const st = scene([inBase()])
    const destroyed: GameEvent = { kind: 'destroyed', victim: { oid: asObjId('scrap'), defId: 'OGN-182' } as never }
    expect(chainLen(st, destroyed)).toBe(1)
                                               
    expect(fire(st, { kind: 'destroy', target: asObjId('scrap'), sourcePlayer: P1 } as GameEvent).chain).toHaveLength(1)
                                                
                                                                  
                                                              
    const fromField: GameEvent = { kind: 'zoneChange', obj: asObjId('scrap'), to: asZoneId(`discard:${P1}`) } as GameEvent
    expect(chainLen(st, fromField)).toBe(0)
  })

  test('★★★废牌堆里已经躺着一张同名的时,弃第二张【只抽一张】', () => {
                                        
                                          
                                              
    const st = scene([inHand(), obj('old', 'OGN-182', P1, `discard:${P1}`, ['equipment'])])
    const after = fire(st, { kind: 'zoneChange', obj: asObjId('scrap'), to: asZoneId(`discard:${P1}`) } as GameEvent)
    expect(handSize(after)).toBe(1)                
  })

  test('★★别人的废料堆不响;进别的区域也不响(对照组)', () => {
    const foe = scene([obj('scrap', 'OGN-182', P2, `hand:${P2}`, ['equipment'])])
    const ev: GameEvent = {
      kind: 'zoneChange', obj: asObjId('scrap'),
      from: asZoneId(`hand:${P2}`), to: asZoneId(`discard:${P2}`),
    } as GameEvent
    expect(handSize(fire(foe, ev, P2), P1)).toBe(0)           

    const toDeck: GameEvent = {
      kind: 'zoneChange', obj: asObjId('scrap'),
      from: asZoneId(`hand:${P1}`), to: asZoneId(`mainDeck:${P1}`),
    } as GameEvent
    expect(chainLen(scene([inHand()]), toDeck)).toBe(0)
  })
})

describe('★★拉克丝 OGS-006 / 光辉女郎 OGS-021(同判据、不同效果)', () => {
  const bigSpell = () => obj('spell', 'OGN-105', P1, `chain:${P1}`, ['spell'])           
  const smallSpell = () => obj('spell', 'OGN-043', P1, `chain:${P1}`, ['spell'])           
                                                                   
                                                                      
                                                                    
  const playSpellEv = (oid: string, p = P1): GameEvent =>
    ({ kind: 'spellResolved', player: p, cardOid: asObjId(oid) })

  test('★★拉克丝:打出 6 费法术 → 我本回合 +3;打出 1 费法术 → 不给', () => {
    const big = fire(scene([obj('lux', 'OGS-006'), bigSpell()]), playSpellEv('spell'))
    expect(might(big, 'lux')).toBe(8)       
    const small = fire(scene([obj('lux', 'OGS-006'), smallSpell()]), playSpellEv('spell'))
    expect(might(small, 'lux')).toBe(5)
  })

  test('★★阈值「不低于5」压三档:4 不给 / 【5 给】/ 6 给', () => {
                                               
                                                 
                                                         
    const at = (defId: string) =>
      fire(scene([obj('lux', 'OGS-006'), obj('spell', defId, P1, `chain:${P1}`, ['spell'])]), playSpellEv('spell'))
                                                        
                                        
    expect(CARD_COSTS['OGN-187']?.mana).toBe(4)
    expect(CARD_COSTS['OGN-153']?.mana).toBe(5)
    expect(CARD_COSTS['OGN-105']?.mana).toBe(6)
    expect(might(at('OGN-187'), 'lux')).toBe(5)              
    expect(might(at('OGN-153'), 'lux')).toBe(8)                            
    expect(might(at('OGN-105'), 'lux')).toBe(8)             
  })

  test('★★「你」打出的才算:对手打出大法术不给', () => {
    const st = scene([obj('lux', 'OGS-006'), obj('spell', 'OGN-105', P2, `chain:${P2}`, ['spell'])])
    expect(might(fire(st, playSpellEv('spell', P2), P2), 'lux')).toBe(5)
  })

  test('★★光辉女郎:同一判据,效果换成抽一张(而且【不加战力】)', () => {
    const st = scene([obj('lux', 'OGS-021', P1, `legend:${P1}`, ['legend']), bigSpell()])
    const after = fire(st, playSpellEv('spell'))
    expect(handSize(after)).toBe(1)
                                                 
    const small = fire(scene([obj('lux', 'OGS-021', P1, `legend:${P1}`, ['legend']), smallSpell()]), playSpellEv('spell'))
    expect(handSize(small)).toBe(0)
  })

  test('★对照:拉克丝【不抽牌】(两张的效果各管各的)', () => {
    const after = fire(scene([obj('lux', 'OGS-006'), bigSpell()]), playSpellEv('spell'))
    expect(handSize(after)).toBe(0)
  })
})
