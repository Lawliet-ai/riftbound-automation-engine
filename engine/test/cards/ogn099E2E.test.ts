import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { encodePick } from '../../data/cards/multi-pick'

                                                    
                                                             
                                   
                                         
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(oid: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 0, baseKeywords: [], baseTypes: ['equipment'] as const,
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs = [
    obj('rake', 'OGN-099', `base:${P1}`),
    obj('gy0', 'GY-A', `discard:${P1}`), obj('gy1', 'GY-B', `discard:${P1}`),
    obj('gy2', 'GY-C', `discard:${P1}`), obj('gy3', 'GY-D', `discard:${P1}`),
    obj('deckTop', 'DECK-TOP', `mainDeck:${P1}`),
  ]
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 5, runes: {} } },
  }
}
const deps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }
const rakeActs = (g: InteractiveGame): InteractiveAction[] =>
  g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'rake')

describe('OGN-099 走 InteractiveGame 真流程', () => {
  test('★★枚举侧:C(4,3)=4 条,每条的 extraChoice 都是三张编成的复合 id', () => {
    const g = new InteractiveGame(scene(), deps)
    const acts = rakeActs(g)
    expect(acts).toHaveLength(4)
    for (const a of acts) {
      const xc = (a as { extraChoice?: string }).extraChoice
      expect(xc).toBeDefined()
      expect(xc!.split('|')).toHaveLength(3)
    }
  })

  test('★★apply 侧:点下去之后三张真进了牌堆底、真抽到了牌、法力真扣了、装备真横置了(㉟)', () => {
    const g = new InteractiveGame(scene(), deps)
    const act = rakeActs(g).find((a) => (a as { extraChoice?: string }).extraChoice === encodePick(['gy0', 'gy1', 'gy2']))
    expect(act).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 8 && g.state.chain.length > 0; i++) for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
    const s = g.state
    const inZone = (z: string): string[] =>
      (s.zones[z]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '').sort()
                   
    expect(inZone(`discard:${P1}`)).toEqual(['GY-D'])
                                      
    expect(inZone(`hand:${P1}`)).toEqual(['DECK-TOP'])
              
    expect(inZone(`mainDeck:${P1}`)).toEqual(['GY-A', 'GY-B', 'GY-C'])
    expect(s.runePools[P1]!.mana).toBe(4)           
    expect(s.objects[asObjId('rake')]!.status.tapped).toBe(true)           
  })

  test('★★废牌堆不足三张 ⇒ 真流程里这个激活【根本列不出来】(§203.3 付不起就不是合法动作)', () => {
    const s = scene()
    const shrunk: GameState = {
      ...s,
      zones: { ...s.zones, [`discard:${P1}`]: { ...s.zones[`discard:${P1}`]!, contents: [asObjId('gy0'), asObjId('gy1')] } },
    }
    expect(rakeActs(new InteractiveGame(shrunk, deps))).toHaveLength(0)
  })

  test('★对照组:法力不够时也列不出来(证明上一条是被【废牌堆】拦的,不是被别的门拦的,㉒)', () => {
    const s = scene()
    const broke: GameState = { ...s, runePools: { ...s.runePools, [P1]: { mana: 0, runes: {} } } }
    expect(rakeActs(new InteractiveGame(broke, deps))).toHaveLength(0)
    expect(rakeActs(new InteractiveGame(s, deps))).toHaveLength(4)                  
  })
})
