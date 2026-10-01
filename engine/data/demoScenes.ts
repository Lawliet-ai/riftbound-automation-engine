                                                      

import { createInitialState, type GameState } from '../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId, type ZoneId } from '../src/state/ids'
import type { GameObject } from '../src/state/object'
import { addMana, addRune } from '../src/state/runePool'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(id: string, owner: PlayerId, zone: ZoneId, might: number, defId: string, keywords: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner, controller: owner, zone, baseMight: might, baseKeywords: keywords, damage: 0, counters: {}, status: {} }
}

   
                                                         
                                                                  
   
export function vegasReactionDemo(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs: GameObject[] = [
    unit('vegas', P2, asZoneId(BF0), 4, 'UNL-150', ['法盾']),
    unit('h1', P1, asZoneId('hand:P1'), 3, 'BLK'),
    unit('h2', P1, asZoneId('hand:P1'), 2, 'BLK'),
  ]
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones }
}

   
                                                                 
                                                                            
                                               
   
export function discardCounterDemo(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs: GameObject[] = [
    unit('p2u', P2, asZoneId(BF0), 3, 'BLK'), // P2 场上单位(灼击目标)
    unit('bolt', P1, asZoneId('hand:P1'), 0, 'DEMO-BOLT'), // P1 手牌:灼击(演示法术)
    unit('discard', P2, asZoneId('hand:P2'), 0, 'UNL-131'), // P2 手牌:遗弃(反应)
  ]
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const runePools = {
    ...base.runePools,
    [P1]: addMana(base.runePools[P1]!, 3),
    [P2]: addMana(base.runePools[P2]!, 3),
  }
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones, runePools }
}

   
                                                                      
                                                              
   
export function militaristCombatDemo(): GameState {
  const base = createInitialState([P1, P2], 2)
  const mil = unit('mil', P1, asZoneId(BF0), 2, 'OGN-121', ['待命'])
  const atk = unit('atk', P2, asZoneId(BF0), 4, 'BLK')
  const deck = ['d0', 'd1', 'd2', 'd3', 'd4'].map((id, i) => unit(id, P1, asZoneId('mainDeck:P1'), 0, 'BLK', i < 3 ? ['待命'] : []))
  const objects: Record<string, GameObject> = { mil, atk }
  for (const c of deck) objects[c.oid] = c
  const bz = base.zones[BF0]!, dz = base.zones['mainDeck:P1']!
  return {
    ...base, activePlayer: P2, priority: null, phase: 'main',
    objects,
    zones: { ...base.zones, [BF0]: { ...bz, contents: [asObjId('mil'), asObjId('atk')] }, 'mainDeck:P1': { ...dz, contents: deck.map((c) => c.oid) } },
  }
}

   
                                                                 
                                                              
   
export function servitorCopyDemo(): GameState {
  const base = createInitialState([P1, P2], 2)
  const servitor = unit('servitor', P1, asZoneId('hand:P1'), 1, 'UNL-081')
  const withKw: GameObject = { ...servitor, baseKeywords: ['待命', '瞬息'] }
  const z = base.zones['hand:P1']!
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main',
    objects: { servitor: withKw },
    zones: { ...base.zones, 'hand:P1': { ...z, contents: [asObjId('servitor')] } },
  }
}

   
                                                                    
                                                              
                                           
   
export function seizeReflectDemo(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs: GameObject[] = [
    unit('p1u', P1, asZoneId(BF0), 3, 'BLK'), // P1 场上单位(夺控后重选的新目标)
    unit('p2u', P2, asZoneId(BF0), 3, 'BLK'), // P2 场上单位(灼击原目标)
    unit('bolt', P1, asZoneId('hand:P1'), 0, 'DEMO-BOLT'), // P1 手牌:灼击
    unit('mirror', P2, asZoneId('hand:P2'), 0, 'VEN-152'), // P2 手牌:灵魂折镜(反应)
  ]
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const runePools = {
    ...base.runePools,
    [P1]: addMana(base.runePools[P1]!, 3),
    [P2]: addRune(addMana(base.runePools[P2]!, 3), 'purple', 2), // 折镜费[1]+pip(蓝|紫)用1符能,结算付[A]再用1(§135.2.e.5)
  }
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones, runePools }
}
