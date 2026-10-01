import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardCost } from '../../data/registry'
import { seedRunes, manaAvailable } from '../../src/game/economy'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number, kws: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: kws, damage: 0, counters: {}, status: {} }
}
function scene(objs: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 5; k++) {
    const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  s = seedRunes(s, P1, 'purple', 6)
  s = seedRunes(s, P2, 'blue', 4)
  return s
}
function walk(g: InteractiveGame, answers: Record<string, string> = {}): void {
  for (let i = 0; i < 14; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: answers[p.request.key] ?? p.request.candidates[0]!.id }); continue }
    break
  }
}

describe('黛安娜核心:回响§820/对决触发/皎月女神', () => {
  test('存在焦虑:眩晕进攻中敌方单位;已眩晕则改为弹回手牌', () => {
    const g = new InteractiveGame(scene([
      unit('ea', 'UNL-134', P1, 'hand:P1', 0),
      unit('ea2', 'UNL-134', P1, 'hand:P1', 0),
      unit('atk', 'BLK', P2, BF0, 3),
    ]), DEPS)
                                                                        
                                                        
                                                                
                                                                              
    g.state = { ...g.state, objects: { ...g.state.objects, atk: { ...g.state.objects['atk']!, status: { attacking: true } } } }
    g.restore({
      ...g.snapshot(),
      pendingCombat: { battlefield: BF0, attacker: P2, defender: P1 },
    })
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'atk' && !a.echo)!)
    walk(g)
    expect(g.state.objects['atk']!.status.stunned).toBe(true)          
                                                        
                                                            
                               
    const atk1 = g.state.objects['atk']!
    g.state = { ...g.state, objects: { ...g.state.objects, atk: { ...atk1, status: { ...atk1.status, attacking: true } } } }
    g.restore({
      ...g.snapshot(),
      pendingCombat: { battlefield: BF0, attacker: P2, defender: P1 },
    })
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'atk' && !a.echo)!)
    walk(g)
    expect(g.state.zones['hand:P2']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)              
  })

  test('§820 回响:付额外费用→效果执行两次(眩晕后立刻弹回,一张牌顶两张)', () => {
    const g = new InteractiveGame(scene([
      unit('ea', 'UNL-134', P1, 'hand:P1', 0),
      unit('atk', 'BLK', P2, BF0, 3),
    ]), DEPS)
    g.state = { ...g.state, objects: { ...g.state.objects, atk: { ...g.state.objects['atk']!, status: { attacking: true } } } }
                                                            
    g.restore({ ...g.snapshot(), pendingCombat: { battlefield: BF0, attacker: P2, defender: P1 } })
    const echoAct = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'atk' && a.echo === true)
    expect(echoAct).toBeDefined()                      
    const manaBefore = manaAvailable(g.state, P1)
    g.apply(echoAct!)
    walk(g)
                                             
    expect(g.state.zones['hand:P2']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)
    expect(manaAvailable(g.state, P1)).toBe(manaBefore - 3)           
  })

  test('黛安娜·皎月化身:法术对决(战斗)在此处开始→可付{1}洞察;不付则无事', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-079', P1, BF0, 3),
      unit('foe', 'BLK', P2, BF0, 2),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
                            
    let sawChoice = false
    for (let i = 0; i < 8; i++) {
      const p = g.pending()
      if (p.mode === 'choice') {
        sawChoice = true
        expect(p.player).toBe(P1)
                                                                   
                                                                             
                                          
        expect(p.request.key.startsWith('__mayChoose__'), '★§383.3.a 的那一问').toBe(true)
        expect(p.request.sourceDefId, '★问的是黛安娜那条').toBe('UNL-079')
        g.apply({ kind: 'CHOOSE', player: P1, key: p.request.key, answer: 'no' })
        continue
      }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      break
    }
    expect(sawChoice).toBe(true)                    
  })

  test('皎月女神传奇:[E] 获得受限法力(仅法术对决期间可用);横置后不能再激活', () => {
    let s = scene([])
    const legend = unit('moon', 'UNL-197', P1, 'legend:P1', 0)
    s = { ...s, objects: { ...s.objects, moon: legend }, zones: { ...s.zones, 'legend:P1': { ...s.zones['legend:P1']!, contents: [asObjId('moon')] } } }
    const g = new InteractiveGame(s, DEPS)
    const before = manaAvailable(g.state, P1)
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'moon')
    expect(act).toBeDefined()
    g.apply(act!)
    walk(g)
                                       
    expect(manaAvailable(g.state, P1)).toBe(before)
    expect(g.state.runePools['P1']!.duelMana).toBe(1)
                 
    expect(manaAvailable({ ...g.state, spellDuelActive: true }, P1)).toBe(before + 1)
    expect(g.state.objects['moon']!.status.tapped).toBe(true)
    expect(g.legalActions(P1).some((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'moon')).toBe(false)
  })
})
