import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { effectiveMight } from '../../src/state/might'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}

                                                         
function standbyScene(): GameState {
  let s = createInitialState([P1, P2], 2)
  const objs: GameObject[] = [
    unit('p1a', 'BLK', P1, BF0, 2), // P1 在 BF0 的单位(使 BF0 被 P1 控制)
    unit('bfu', 'BLK', P2, BF1, 2), // BF1 的 P2 单位(§811.1.d.2 验证:锁 BF0 时不可选它)
    unit('cone', 'OGN-097', P1, 'hand:P1', 2), // 手牌:爆裂球果仙灵(待命)
    unit('gale', 'OGN-169', P1, 'hand:P1', 0), // 手牌:罡风(反应,给 P2 回合开窗口用)
    unit('bolt', 'DEMO-BOLT', P2, 'hand:P2', 0), // P2 手牌:灼击(P2 回合起链用)
  ]
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
                                  
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 5; k++) {
      const id = `deck${i++}`
      const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  s = seedRunes(s, P1, 'blue', 3)                  
  s = seedRunes(s, P2, 'purple', 2)
  return s
}

describe('待命 §811 · 布置→隔回合→反应窗口打出→目标锁同战场', () => {
  test('完整链路:布置付[A]、本回合门禁、对手回合窗口打出、§811.1.d.2 只能选同战场目标、[M]-2 floor 1', () => {
    const g = new InteractiveGame(standbyScene(), DEPS)

                                                        
    const places = g.legalActions(P1).filter((a) => a.kind === 'PLACE_STANDBY')
    expect(places.length).toBeGreaterThan(0)
    expect(places.every((a) => (a as { battlefield: string }).battlefield === BF0)).toBe(true)
    const place = places.find((a) => g.state.objects[(a as { oid: string }).oid]?.defId === 'OGN-097')!
    const runesBefore = g.state.zones['base:P1']!.contents.length

    g.apply(place)
                                               
    expect(g.state.zones['base:P1']!.contents.length).toBe(runesBefore - 1)
    const sb = Object.values(g.state.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
    expect(sb.contents).toHaveLength(1)
    const placed = g.state.objects[sb.contents[0]!]!
    expect(placed.status.faceDown).toBe(true)
    expect(placed.status.standbyFresh).toBe(true)

                                 
    expect(g.legalActions(P1).some((a) => a.kind === 'PLAY_STANDBY')).toBe(false)

                                 
    const v2 = g.view(P2)
    const projected = v2.objects[sb.contents[0]!]
    expect(projected?.hidden ?? projected?.defId !== 'OGN-097').toBeTruthy()           
    expect(g.view(P1).objects[sb.contents[0]!]?.defId).toBe('OGN-097')           

                                                            
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.state.activePlayer).toBe(P2)
    const bolt = g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!
    g.apply(bolt)                      
    g.apply({ kind: 'PASS', player: P2 })                 
    const p = g.pending()
    expect(p.mode).toBe('window')
    if (p.mode !== 'window') return
    expect(p.player).toBe(P1)
    const standbyPlay = g.legalActions(P1).find((a) => a.kind === 'PLAY_STANDBY')
    expect(standbyPlay).toBeDefined()                   

                                                             
    const manaBefore = g.view(P1).mana
    g.apply(standbyPlay!)
    expect(g.view(P1).mana).toBe(manaBefore)          
                            
    for (let i = 0; i < 6 && g.pending().mode !== 'choice'; i++) {
      const q = g.pending()
      if (q.mode === 'window') g.apply({ kind: 'PASS', player: q.player })
      else break
    }
    const c = g.pending()
    expect(c.mode).toBe('choice')
    if (c.mode !== 'choice') return
    const candIds = c.request.candidates.map((x) => x.id)
    expect(candIds).not.toContain('bfu')                     
    expect(candIds).toContain('p1a')               
                                         
    const coneOid = candIds.find((x) => g.state.objects[x]?.defId === 'OGN-097' || (x !== 'p1a'))!
    g.apply({ kind: 'CHOOSE', player: P1, key: c.request.key, answer: coneOid })

                      
    for (let i = 0; i < 8 && g.pending().mode === 'window'; i++) {
      const q = g.pending()
      if (q.mode === 'window') g.apply({ kind: 'PASS', player: q.player })
    }
                                                            
    const cone = g.state.objects[coneOid]!
    expect(cone.zone).toBe(BF0)
    expect(cone.status.faceDown).not.toBe(true)
    expect(effectiveMight(cone).actual).toBe(1)
                                                                 
    expect(g.state.zones[BF0]!.contents.includes('p1a' as never)).toBe(false)
    expect(g.state.zones['discard:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)
  })

  test('待命法术(借鉴历史)从待命打出:0费抽2;布置需付[A]', () => {
    let s = standbyScene()
                        
    const hist = unit('hist', 'OGN-083', P1, 'hand:P1', 0)
    s = { ...s, objects: { ...s.objects, hist }, zones: { ...s.zones, 'hand:P1': { ...s.zones['hand:P1']!, contents: [...s.zones['hand:P1']!.contents, asObjId('hist')] } } }
    for (const id of ['d1', 'd2', 'd3']) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const g = new InteractiveGame(s, DEPS)
    const place = g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY' && g.state.objects[(a as { oid: string }).oid]?.defId === 'OGN-083')!
    g.apply(place)
    g.apply({ kind: 'END_TURN', player: P1 })
    g.apply({ kind: 'END_TURN', player: P2 })            
    const handBefore = g.state.zones['hand:P1']!.contents.length
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_STANDBY')
    expect(play).toBeDefined()                            
    g.apply(play!)
                       
    for (let i = 0; i < 6 && g.pending().mode === 'window'; i++) {
      const q = g.pending()
      if (q.mode === 'window') g.apply({ kind: 'PASS', player: q.player })
    }
    expect(g.state.zones['hand:P1']!.contents.length).toBe(handBefore + 2)                             
                       
    expect(g.state.zones['discard:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'OGN-083')).toBe(true)
  })

  test('迅捷斥候传奇在场:布置出现替代费变体({1} 代 [A])', () => {
    let s = standbyScene()
    const legend = unit('lg', 'OGN-263', P1, 'legend:P1', 0)
    s = { ...s, objects: { ...s.objects, lg: legend }, zones: { ...s.zones, 'legend:P1': { ...s.zones['legend:P1']!, contents: [asObjId('lg')] } } }
    const g = new InteractiveGame(s, DEPS)
    const places = g.legalActions(P1).filter((a) => a.kind === 'PLACE_STANDBY' && g.state.objects[(a as { oid: string }).oid]?.defId === 'OGN-097')
    expect(places.some((a) => (a as { alt?: boolean }).alt === true)).toBe(true)          
    expect(places.some((a) => !(a as { alt?: boolean }).alt)).toBe(true)          
                                    
    const runesBefore = g.state.zones['base:P1']!.contents.length
    g.apply(places.find((a) => (a as { alt?: boolean }).alt === true)!)
    expect(g.state.zones['base:P1']!.contents.length).toBe(runesBefore)            
    const sb = Object.values(g.state.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
    expect(sb.contents).toHaveLength(1)
  })
})
