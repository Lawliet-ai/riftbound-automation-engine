import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { Trigger } from '../../src/dsl/trigger'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost, activatedFor } from '../../data/registry'

                              
  
                                    
                                                      
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                  
function makeWatcher(seen: string[]): Trigger {
  return {
    id: 'watch', sourceOid: null, controller: P1,
    event: 'destroyed', by: 'any',
    filter: (ev) => {
      if (ev.kind === 'destroyed') seen.push(ev.victim.defId)
      return false                   
    },
    effect: () => [],
  }
}

function obj(oid: string, defId: string, zone: string, ctrl = P1, kws: string[] = []): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: kws, damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones }
}
function depsWith(seen: string[]): InteractiveDeps {
  return {
    getTriggers: (s) => [...activeTriggers(s), makeWatcher(seen)],
    handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost, activatedFor,
  }
}
function walk(g: InteractiveGame): void {
  for (let i = 0; i < 20; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
      continue
    }
    break
  }
}

describe('★§816 瞬息步的摧毁到得了触发检测', () => {
  test('★回合切换时被瞬息摧毁的牌,旁观者看得见', () => {
    const seen: string[] = []
                                      
    const g = new InteractiveGame(scene([obj('e', 'EPH', BF0, P2, ['瞬息'])]), depsWith(seen))
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g)
    expect(g.state.objects['e']).toBeUndefined()               
    expect(seen).toContain('EPH')                                       
  })
})

describe('★§428.6「摧毁此牌,支付…」:把自己当费用摧毁,也是一次真摧毁', () => {
  test('★金币指示物自毁换符能 → 旁观者看得见;§186.1 指示物离开场地即消失,废牌堆里没有它(★1109 缺陷 81 改)', () => {
    const seen: string[] = []
    const g = new InteractiveGame(scene([obj('c', 'token:金币', `base:${P1}`, P1)]), depsWith(seen))
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && (a as { ability?: string }).ability === 'cash')
    expect(act).toBeDefined()                
    g.apply(act!)
    walk(g)
                                                                             
                                                  
    expect(g.state.zones[`discard:${P1}`]!.contents).toHaveLength(0)
    expect(Object.values(g.state.objects).some((o) => o.defId === 'token:金币')).toBe(false)
    expect(seen).toContain('token:金币')                                            
    expect(g.state.runePools[P1]!.runes['*']).toBe(1)                                     
  })
})
