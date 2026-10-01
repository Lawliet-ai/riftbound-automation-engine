import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'

                                           
                                            
                           
  
                                                                    
  
                                                             
                                              
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function obj(id: string, ctrl: typeof P1, zone: string, might = 2): GameObject {
  return {
    oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}

   
                                                  
                                                  
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const deckTopDown = ['t1', 't2', 'd3', 'd4']
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const u = obj('u1', P1, 'base:P1')
  objects[u.oid] = u
  zones['base:P1'] = { ...zones['base:P1']!, contents: [...zones['base:P1']!.contents, u.oid] }
                             
  for (const id of [...deckTopDown].reverse()) {
    const c = obj(id, P1, `mainDeck:${P1}`)
    objects[c.oid] = c
    zones[`mainDeck:${P1}`] = { ...zones[`mainDeck:${P1}`]!, contents: [...zones[`mainDeck:${P1}`]!.contents, c.oid] }
  }
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    battlefieldCards: { [BF0]: { defId: 'OGN-291', owner: P1 } },
  }
}

                                                 
function drain(g: InteractiveGame, answers: Record<string, string> = {}): string[] {
  const seen: string[] = []
  for (let i = 0; i < 20; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      seen.push(p.request.key)
      const ans = answers[p.request.key] ?? p.request.candidates[0]!.id
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: ans })
      continue
    }
    break
  }
  return seen
}
                        
const topDown = (s: GameState): string[] =>
  [...(s.zones[`mainDeck:${P1}`]?.contents ?? [])].reverse() as string[]

                   
function conquer(g: InteractiveGame, answers: Record<string, string> = {}): string[] {
  g.apply({ kind: 'MOVE', player: P1, oid: 'u1', to: BF0 })
  return drain(g, answers)
}

describe('★烛光圣殿 OGN-291:征服此处→洞察2(回收任意数量)', () => {
  test('前提:牌堆顶→底就是 t1,t2,d3,d4,且征服确实得了分(触发的前置条件成立)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    expect(topDown(g.state)).toEqual(['t1', 't2', 'd3', 'd4'])
    conquer(g, { rec0: MULTI_SELECT_DONE })
    expect(g.state.scores['P1']).toBe(1)                        
  })

  test('★真的问了(候选=顶两张 + "够了"),而且只问顶上那两张', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'u1', to: BF0 })
                         
    let req: { key: string; candidates: readonly { id: string }[] } | null = null
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') { req = { key: p.request.key, candidates: p.request.candidates }; break }
      break
    }
    expect(req).not.toBeNull()
    expect(req!.key).toBe('rec0')
    const ids = req!.candidates.map((c) => c.id)
    expect(ids).toEqual(['t1', 't2', MULTI_SELECT_DONE])                      
  })

  test('★一张都不回收 ⇒ 牌堆顺序【完全不变】(§436.1 允许全不回收)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    conquer(g, { rec0: MULTI_SELECT_DONE })
    expect(topDown(g.state)).toEqual(['t1', 't2', 'd3', 'd4'])
  })

  test('★只回收 t1 ⇒ t1 沉到底,t2 留在顶(其余按原序放回原处)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const seen = conquer(g, { rec0: 't1', rec1: MULTI_SELECT_DONE })
    expect(seen).toContain('rec1')                           
    expect(topDown(g.state)).toEqual(['t2', 'd3', 'd4', 't1'])
  })

  test('★两张全回收 ⇒ 顶换成 d3、d4,t1/t2 都在底(§416.5 两张的先后是随机的,只断言集合)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const seen = conquer(g, { rec0: 't1', rec1: 't2' })
    expect(seen).not.toContain('rec2')                 
    const td = topDown(g.state)
    expect(td.slice(0, 2)).toEqual(['d3', 'd4'])                           
    expect(new Set(td.slice(2))).toEqual(new Set(['t1', 't2']))
  })

  test('★是【对手】征服此处 ⇒ 我这边不问也不动牌堆(「当【你】征服」是对称卡文,各判各的)', () => {
                                         
    const base = scene()
    const p2u = obj('e1', P2, 'base:P2')
    const g = new InteractiveGame({
      ...base,
      activePlayer: P2,
      objects: { ...base.objects, [p2u.oid]: p2u },
      zones: { ...base.zones, 'base:P2': { ...base.zones['base:P2']!, contents: [...base.zones['base:P2']!.contents, p2u.oid] } },
    }, DEPS)
    g.apply({ kind: 'MOVE', player: P2, oid: 'e1', to: BF0 })
    const seen = drain(g)
    expect(g.state.scores['P2']).toBe(1)                      
    expect(seen.filter((k) => k.startsWith('rec'))).toEqual([])
    expect(topDown(g.state)).toEqual(['t1', 't2', 'd3', 'd4'])
  })
})
