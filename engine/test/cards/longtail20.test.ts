import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, cardCost, cardKeywords, cardKind, handPlaySpecs, playSpecFor, standbyAltCost } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { seedRunes } from '../../src/game/economy'
import { effectiveMight } from '../../src/state/might'
import { LONGTAIL20_DEFIDS } from '../../data/cards/longtail-20'

                                             
                                                     
  
                                                 
                          
               
                                                      
                                               
                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const CAPTAIN = 'VEN-121'
const DIANA = 'VEN-183'

const DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardKind,
}

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might = 2, kws: string[] = []): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: kws, baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
                                                            
function scene(objs: readonly GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 5; k++) {
    const id = `d${i++}`
    const c = unit(id, 'BLK', p, `mainDeck:${p}`)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  return seedRunes(s, P1, 'purple', 6)
}
function walk(g: InteractiveGame): void {
  for (let i = 0; i < 14; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
      continue
    }
    break
  }
}
                                                    
function mightOf(g: InteractiveGame, defId: string): number {
  const o = Object.values(g.state.objects).find((x) => x.defId === defId && g.state.zones[x.zone]?.kind !== 'hand')
  if (!o) throw new Error(`${defId} 不在场上`)
  return effectiveMight(o).actual
}

describe('★【长尾批次·二十】前提', () => {
  test('登记齐,费用/战力照卡面实测取', () => {
                                                     
                                                        
    expect(LONGTAIL20_DEFIDS.slice().sort()).toEqual(['OGN-139', 'VEN-121', 'VEN-183'])
    expect(cardKind(CAPTAIN)).toBe('unit')
    expect(cardKind(DIANA)).toBe('unit')
    expect(cardCost(CAPTAIN)).toEqual({ mana: 4, pips: [['yellow']] })
    expect(cardCost(DIANA)).toEqual({ mana: 4, pips: [['purple']] })
    expect(specLookup(CAPTAIN).baseMight).toBe(3)
    expect(specLookup(DIANA).baseMight).toBe(3)
    expect(cardKeywords(DIANA)).toContain('伏击')                             
    expect(cardKeywords(CAPTAIN)).toEqual([])                     
  })
})

describe('★★ 草包队长 VEN-121:认【另一名单位】', () => {
  const board = (hand: readonly GameObject[]): InteractiveGame =>
    new InteractiveGame(scene([unit('cap', CAPTAIN, P1, BF0, 3), ...hand]), DEPS)

  test('★★打出另一名单位 ⇒ 我本回合 +2', () => {
    const g = board([unit('u1', 'BLK', P1, `hand:${P1}`)])
    expect(mightOf(g, CAPTAIN)).toBe(3)      
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'u1')!)
    walk(g)
    expect(mightOf(g, CAPTAIN)).toBe(5)
  })

  test('★★★打出【法术】一点都不给(㉑ 反方向:这是黛安娜那张的活)', () => {
    const g = board([unit('b1', 'DEMO-BOLT', P1, `hand:${P1}`), unit('foe', 'BLK', P2, BF0)])
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD')!)
    walk(g)
    expect(mightOf(g, CAPTAIN)).toBe(3)
  })

  test('★★★「另一名」:打出【它自己】那一下不算(subjectIsNotSelf)', () => {
                                                           
                                         
    const g = new InteractiveGame(scene([unit('cap', CAPTAIN, P1, `hand:${P1}`, 3)]), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'cap')!)
    walk(g)
    expect(mightOf(g, CAPTAIN)).toBe(3)
  })

  test('★★★可叠加:打两名单位 = +4(效果 id 带序号,不是同 id 覆盖)', () => {
    const g = board([unit('u1', 'BLK', P1, `hand:${P1}`), unit('u2', 'BLK', P1, `hand:${P1}`)])
    for (const oid of ['u1', 'u2']) {
      g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === oid)!)
      walk(g)
    }
    expect(mightOf(g, CAPTAIN)).toBe(7)         
  })

  test('★★★是【你】打出的才算:对手打单位不给(by:\'you\')', () => {
    const g = board([unit('e1', 'BLK', P2, `hand:${P2}`)])
    g.state = { ...g.state, activePlayer: P2 }
    g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'e1')!)
    walk(g)
    expect(mightOf(g, CAPTAIN)).toBe(3)
  })
})

describe('★★ 黛安娜 VEN-183:认【法术】', () => {
  const board = (hand: readonly GameObject[]): InteractiveGame =>
                                                     
    new InteractiveGame(scene([unit('dia', DIANA, P1, BF0, 3, ['伏击']), unit('foe', 'BLK', P2, BF0, 6), ...hand]), DEPS)

  test('★★打出一个法术 ⇒ 我本回合 +2;打两个 = +4', () => {
    const g = board([unit('b1', 'DEMO-BOLT', P1, `hand:${P1}`), unit('b2', 'DEMO-BOLT', P1, `hand:${P1}`)])
    expect(mightOf(g, DIANA)).toBe(3)      
                                                             
                                                         
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD')!)
    walk(g)
    expect(mightOf(g, DIANA)).toBe(5)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD')!)
    walk(g)
    expect(mightOf(g, DIANA)).toBe(7)
  })

  test('★★★打出【单位】一点都不给(㉑ 反方向:那是草包队长那张的活)', () => {
    const g = board([unit('u1', 'BLK', P1, `hand:${P1}`)])
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'u1')!)
    walk(g)
    expect(mightOf(g, DIANA)).toBe(3)
  })

  test('★★两张黛安娜同场时各记各的账(效果 id 带 selfOid)', () => {
                                                                
    const g = new InteractiveGame(scene([
      unit('dia1', DIANA, P1, BF0, 3, ['伏击']),
      unit('dia2', 'UNL-149', P1, BF0, 3, ['伏击']), // 正典那张:同一条技能,另一个卡号
      unit('foe', 'BLK', P2, BF0),
      unit('b1', 'DEMO-BOLT', P1, `hand:${P1}`),
    ]), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD')!)
    walk(g)
    expect(effectiveMight(g.state.objects[asObjId('dia1')]!).actual).toBe(5)
    expect(effectiveMight(g.state.objects[asObjId('dia2')]!).actual).toBe(5)        
  })
})
