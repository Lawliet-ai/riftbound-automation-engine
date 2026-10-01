import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, startStepHook, cardCost } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, startStepHook }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}

function baseScene(extra: GameObject[] = []): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
             
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 6; k++) {
      const id = `deck${i++}`
      const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  s = seedRunes(s, P1, 'blue', 4)
  s = seedRunes(s, P2, 'purple', 2)
  return s
}

                      
function drain(g: InteractiveGame, max = 8): void {
  for (let i = 0; i < max && g.pending().mode === 'window'; i++) {
    const p = g.pending()
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: p.player })
  }
}

describe('装备§148-151 + 主动技能§145 + 回合开始相位§315.2', () => {
  test('装备只打到基地(§149.2)且活跃进场(§149.1);付费', () => {
    const g = new InteractiveGame(baseScene([unit('bag', 'OGN-101', P1, 'hand:P1', 0)]), { ...DEPS, cardCost })
    const plays = g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT' && g.state.objects[(a as { oid: string }).oid]?.defId === 'OGN-101')
    expect(plays).toHaveLength(1)           
    expect((plays[0] as { to: string }).to).toBe('base:P1')
    g.apply(plays[0]!)
    drain(g)
    const atBase = g.state.zones['base:P1']!.contents.map((o) => g.state.objects[o]!).find((o) => o.defId === 'OGN-101')
    expect(atBase).toBeDefined()
    expect(atBase!.status.tapped).not.toBe(true)               
  })

  test('奇妙行囊 [E]:弹回友方待命卡到所属手牌;横置后不能再激活', () => {
                                          
    let s = baseScene([
      unit('satchel', 'OGN-181', P1, 'base:P1', 0),
      unit('p1a', 'BLK', P1, BF0, 2),
    ])
                           
    const sbZone = Object.values(s.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
    const sc = { ...unit('scout', 'OGN-197', P1, sbZone.id, 1), status: { faceDown: true } }
    s = { ...s, objects: { ...s.objects, scout: sc }, zones: { ...s.zones, [sbZone.id]: { ...sbZone, contents: [asObjId('scout')] } } }
    const g = new InteractiveGame(s, DEPS)

    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE')
    expect(acts.length).toBeGreaterThan(0)
    const bounceStandby = acts.find((a) => (a as { target?: string }).target === 'scout')
    expect(bounceStandby).toBeDefined()                           
    g.apply(bounceStandby!)
    drain(g)
                                         
    expect(g.state.zones['hand:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'OGN-197')).toBe(true)
                       
    const satchel = Object.values(g.state.objects).find((o) => o.defId === 'OGN-181')!
    expect(satchel.status.tapped).toBe(true)
    expect(g.legalActions(P1).some((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === satchel.oid)).toBe(false)
  })

  test('倾颓宫殿技能二:弃1+[E]→战鹰(1[M]法盾)落指定战场;手牌-1', () => {
    const g = new InteractiveGame(baseScene([
      unit('palace', 'UNL-088', P1, 'base:P1', 0),
      unit('h1', 'BLK', P1, 'hand:P1', 2),
    ]), DEPS)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { ability: string }).ability === 'hawk')
    expect(acts.length).toBeGreaterThan(0)
    const toBf0 = acts.find((a) => (a as { target?: string }).target === BF0)!
    g.apply(toBf0)
    drain(g)
    const hawk = g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]!).find((o) => o.defId === 'token:战鹰')
    expect(hawk).toBeDefined()
    expect(hawk!.baseMight).toBe(1)
    expect(hawk!.baseKeywords).toContain('法盾')
    expect(g.state.zones['hand:P1']!.contents).toHaveLength(0)        
    expect(g.state.zones['discard:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)
  })

  test('倾颓宫殿替代胜利:恰4手牌+全场恰4单位→自己开始阶段瞬间获胜(宏伟广场QA)', () => {
                                                       
    const units = [
      unit('u1', 'BLK', P2, BF0, 2), unit('u2', 'BLK', P2, BF0, 2),
      unit('u3', 'BLK', P2, 'battlefield:shared:1', 2), unit('u4', 'BLK', P2, 'battlefield:shared:1', 2),
    ]
    const hand = ['h1', 'h2', 'h3', 'h4'].map((id) => unit(id, 'BLK', P2, 'hand:P2', 2))
    const g = new InteractiveGame(baseScene([unit('palace', 'UNL-088', P2, 'base:P2', 0), ...units, ...hand]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    const p = g.pending()
    expect(p.mode).toBe('gameover')
    if (p.mode === 'gameover') expect(p.winner).toBe(P2)
  })

  test('倾颓宫殿:手牌不是恰4(5张)→不胜;正常进 P2 回合', () => {
    const units = [
      unit('u1', 'BLK', P2, BF0, 2), unit('u2', 'BLK', P2, BF0, 2),
      unit('u3', 'BLK', P2, 'battlefield:shared:1', 2), unit('u4', 'BLK', P2, 'battlefield:shared:1', 2),
    ]
    const hand = ['h1', 'h2', 'h3', 'h4', 'h5'].map((id) => unit(id, 'BLK', P2, 'hand:P2', 2))
    const g = new InteractiveGame(baseScene([unit('palace', 'UNL-088', P2, 'base:P2', 0), ...units, ...hand]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    drain(g)
    expect(g.state.winner).toBeNull()
    expect(g.state.activePlayer).toBe(P2)
  })

  test('蘑菇袋:自己开始阶段控面朝下待命牌→触发入链→抽1;据守得分同回合开始结算', () => {
                                                  
    let s = baseScene([
      unit('bag', 'OGN-101', P2, 'base:P2', 0),
      unit('p2a', 'BLK', P2, BF0, 2),
    ])
    const sbZone = Object.values(s.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
    const sc = { ...unit('sb', 'OGN-197', P2, sbZone.id, 1), status: { faceDown: true } }
    s = { ...s, objects: { ...s.objects, sb: sc }, zones: { ...s.zones, [sbZone.id]: { ...sbZone, contents: [asObjId('sb')] } } }
    const g = new InteractiveGame(s, DEPS)
    const handBefore = g.state.zones['hand:P2']!.contents.length

    g.apply({ kind: 'END_TURN', player: P1 })
                                
    drain(g)
    expect(g.pending()).toEqual({ mode: 'action', player: P2 })
                    
    expect(g.state.zones['hand:P2']!.contents.length).toBe(handBefore + 2)
                                    
    expect(g.state.scores['P2']).toBe(1)
  })

  test('据守得分不重复:同一战场每回合1分;无单位不得分', () => {
    const g = new InteractiveGame(baseScene([unit('p1a', 'BLK', P1, BF0, 2)]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })                      
    drain(g)
    expect(g.state.scores['P2'] ?? 0).toBe(0)
    g.apply({ kind: 'END_TURN', player: P2 })                         
    drain(g)
    expect(g.state.scores['P1']).toBe(1)
  })
})
