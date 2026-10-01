                             
  
                                                     
                                                       
                                
  
                                                          
                                       
  
                                             
                                                                               
                                                         
  
                                                   
                                                                      
                                                                                
                                                             

                                 
                                             
                                                                        
                                                         
                         
                                                                
                                   
                                                                 
                           
                                                             
                                                                                   

import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { CARD_NAMES } from '../../data/cardNames'
import { CARD_TAGS } from '../../data/cardTags'

const P1 = asPlayerId('P1'), P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  let s: Partial<GameObject> = {}
  try { s = specLookup(defId) as never } catch { /* 无规格按白板 */ }
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: s.baseMight ?? 1, baseKeywords: s.baseKeywords ?? [],
    baseTypes: s.baseTypes ?? ['equipment'],
    damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                                                           
function synth(kind: string, unit: string, gear: string): GameEvent | null {
  const u = asObjId(unit), g = asObjId(gear), bf = asZoneId(BF0)
  switch (kind) {
    case 'playUnit': return { kind, unit: u, player: P1 } as GameEvent
    case 'playSpell': return { kind, player: P1, defId: 'OGN-133', cardOid: u } as unknown as GameEvent
    case 'unitMoved': return { kind, unit: u, player: P1, from: asZoneId(`base:${P1}`), to: bf } as GameEvent
    case 'conquer': return { kind, player: P1, battlefield: bf } as unknown as GameEvent
    case 'hold': return { kind, player: P1, battlefield: bf } as unknown as GameEvent
    case 'attack': return { kind, player: P1, battlefield: bf } as unknown as GameEvent
    case 'defend': return { kind, player: P1, unit: u, battlefield: bf } as unknown as GameEvent
    case 'damage': return { kind, target: u, amount: 1, source: g } as unknown as GameEvent
    case 'destroy': return { kind, victim: u, responsible: P1 } as unknown as GameEvent
    case 'stun': return { kind, target: u } as unknown as GameEvent
    case 'draw': return { kind, player: P1, count: 1 } as unknown as GameEvent
    case 'recycle': return { kind, player: P1, count: 1 } as unknown as GameEvent
    case 'gainPoint': return { kind, player: P1, amount: 1 } as unknown as GameEvent
    case 'endOfTurn': return { kind, player: P1 } as unknown as GameEvent
    case 'destroyed': return { kind, victim: {
      oid: u, defId: 'BLK', controller: P1, owner: P1, zone: BF0, might: 1, damage: 0,
      keywords: [], counters: {}, status: {}, types: ['unit'],
    }, responsible: [P1] } as unknown as GameEvent
    case 'banished': return { kind, player: P1, card: u, defId: 'BLK' } as unknown as GameEvent
    case 'statusChange': return { kind, target: u, key: 'dormant', value: true } as unknown as GameEvent
    case 'grantBuff': return { kind, target: u } as unknown as GameEvent
    case 'battleEnd': return { kind, battlefield: BF0, attacker: P1, defender: P2,
      outcome: 'attackerWins', participants: [u] } as unknown as GameEvent
    case 'targeted': return { kind, chooser: P1, target: u, sourceKind: 'spell' } as unknown as GameEvent
    case 'mainPhaseStart': return { kind, player: P1 } as unknown as GameEvent
    case 'startPhase': return { kind, player: P1 } as unknown as GameEvent
    case 'zoneChange': return { kind, obj: u, to: asZoneId(`discard:${P1}`), from: bf } as unknown as GameEvent
    default: return null
  }
}
                                                          
function firesWhile(defId: string, attached: boolean): boolean {
  const gear = attached
    ? obj('g', defId, P1, { status: { attachedTo: asObjId('u') } })
    : obj('g', defId)
                                                     
                                                    
                                                        
                                                
  const st0 = scene([
    gear, obj('u', 'BLK'), obj('foe', 'BLK', P2),
                                                                       
                                                       
    obj('dU', 'OGN-175', P1, { zone: asZoneId(`discard:${P1}`) }),
    obj('dG', 'SFD-153', P1, { zone: asZoneId(`discard:${P1}`) }),
    obj('hU', 'BLK', P1, { zone: asZoneId(`hand:${P1}`), baseTypes: ['unit'] }),
    obj('kU', 'BLK', P1, { zone: asZoneId(`mainDeck:${P1}`), baseTypes: ['unit'] }),
    obj('kU2', 'BLK', P1, { zone: asZoneId(`mainDeck:${P1}`), baseTypes: ['unit'] }),
  ])
                                                             
                                                 
  const st = {
    ...st0,
    runePools: { ...st0.runePools, [P1]: {
      mana: 30, duelMana: 0,
      runes: { red: 9, green: 9, blue: 9, orange: 9, purple: 9, yellow: 9 },
    } },
                                                        
                                                                       
                                                        
                                             
                                               
    maxExcessDamageThisTurn: { [P1]: 9 },
    playedUnitThisTurn: { [P1]: true },
    playedEquipmentThisTurn: { [P1]: true },
    playedSpellThisTurn: { [P1]: true },
  } as GameState
  const kinds = [...new Set(activeTriggers(st).filter((t) => t.sourceOid === asObjId('g')).map((t) => t.event))]
  for (const k of kinds) {
    const ev = synth(k, 'u', 'g')
    if (!ev) continue
    try {
      const after = landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {})
                                                           
      if (after.chain.some((it: { sourceDefId?: string }) => it.sourceDefId === defId)) return true
    } catch { /* 合成事件不合法就跳过,不当结论 */ }
  }
  return false
}

                                                  
const FORGE_GEAR: string[] = Object.keys(CARD_NAMES).filter((d) => {
  let k: string | undefined
  try { k = cardKind(d) } catch { return false }
  if (k !== 'equipment') return false
  if ((CARD_TAGS as Record<string, string>)[d] !== '武装') return false
  return activeTriggers(scene([obj('g', d)])).some((t) => t.sourceOid === asObjId('g'))
})

describe('★852 §136.2.b/§724 武装未贴附 ⇒ 效果文本触发不该响', () => {
  test('体检基数没塌(桶空了的话下面那格"全绿"是假的)', () => {
    expect(FORGE_GEAR.length, '★全库带触发的武装应当有十几张').toBeGreaterThan(10)
  })

  test('★★★对照组:同一批事件,【贴附之后】必须有相当数量真的响 —— 否则本闸是假绿机器', () => {
    const n = FORGE_GEAR.filter((d) => firesWhile(d, true)).length
    expect(n, '★贴附后一张都不响 ⇒ 说明合成的事件没打到点子上,本闸失效').toBeGreaterThan(5)
  })

  test('★★★正题:一张【未贴附】的武装,它的效果文本触发一条都不该进链', () => {
    const bad = FORGE_GEAR.filter((d) => firesWhile(d, false))
      .map((d) => `${d} ${CARD_NAMES[d] ?? ''}`)
    expect(bad, '★未贴附却响了 = §136.2.b/§724 漏了 host 判据(SFD-150 当年就是这么错的)').toEqual([])
  })
})
