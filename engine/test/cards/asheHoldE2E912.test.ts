import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { writeControl } from '../../src/state/battlefieldControl'
import { addMana, emptyRunePool } from '../../src/state/runePool'
import { seedRunes } from '../../src/game/economy'
import { installProviders, makeGameDeps } from '../../data/gameDeps'

                                              
                                               
                            
                                                                      
                                                             
                                                        
                             
                                                                  
                                                         

installProviders()

const P1 = 'P1'
const P2 = 'P2'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const spec = (specLookup(defId) ?? {}) as Partial<GameObject>
  return {
    ...spec,
    oid: asObjId(oid), defId, owner: asPlayerId(ctrl), controller: asPlayerId(ctrl), zone: asZoneId(zone),
    baseMight: spec.baseMight ?? 3, baseKeywords: spec.baseKeywords ?? [], baseTypes: spec.baseTypes ?? ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}

function scene(): GameState {
  const base = createInitialState([asPlayerId(P1), asPlayerId(P2)], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of [
    obj('ashe', 'UNL-169', P1, `hand:${P1}`),
    obj('h1', 'OGN-175', P2, `hand:${P2}`),
    obj('h2', 'OGN-010', P2, `hand:${P2}`),
    obj('guard', 'OGN-175', P2, BF1), // P2 占 BF1 ⇒ 它回合开始阶段会据守
                                                    
                                                            
    obj('d1', 'OGN-175', P1, `mainDeck:${P1}`), obj('d2', 'OGN-175', P1, `mainDeck:${P1}`),
    obj('d3', 'OGN-175', P2, `mainDeck:${P2}`), obj('d4', 'OGN-175', P2, `mainDeck:${P2}`),
  ]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let s: GameState = { ...base, activePlayer: asPlayerId(P1), phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: addMana(emptyRunePool(), 9) } }
  s = seedRunes(s as never, asPlayerId(P1) as never, 'yellow', 2) as never              
  return writeControl(s, BF1, asPlayerId(P2))
}

function drive(g: InteractiveGame, prompts: string[], cap = 80): void {
  for (let i = 0; i < cap; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') {
      prompts.push(p.request.prompt)
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as never)
      continue
    }
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: string }).player } as never)
  }
}

describe('★912 艾希 UNL-169 × 真据守流程', () => {
  test('打出→放逐对手一张→对手据守→那张牌返回其手牌(跨两次 §124 换 oid)', () => {
    const g = new InteractiveGame(scene(), makeGameDeps(20260826) as never)
    const prompts: string[] = []
    const play = g.legalActions(asPlayerId(P1)).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid?: string }).oid === 'ashe')
    expect(play, '5费+1黄pip 付得起(seedRunes 给了场上黄符文)').toBeDefined()
    g.apply(play!)
    drive(g, prompts)
    expect(prompts.some((p) => p.includes('放逐')), '打出触发真的问了放逐').toBe(true)
                                                   
    const exiled = Object.values(g.state.objects).filter((o) => String(o.zone) === `exile:${P2}`)
    expect(exiled, '恰一张进了对手放逐区').toHaveLength(1)
    expect(exiled[0]!.defId).toBe('OGN-175')
    expect(g.state.zones[`hand:${P2}` as never]?.contents, '对手手里剩一张').toEqual(['h2'])

                                                             
    const et = g.legalActions(asPlayerId(P1)).find((a) => a.kind === 'END_TURN')
    g.apply(et!)
    drive(g, prompts)
    expect(g.state.scores[P2], 'P2 真的据守得了分(触发条件真发生)').toBe(1)
                                                
    const handP2 = (g.state.zones[`hand:${P2}` as never]?.contents ?? []) as unknown as string[]
    expect(handP2, '被放逐那张回到了对手手里(又一次换 oid)+ 回合正常抽牌').toHaveLength(3)
    const back = handP2.map((o) => g.state.objects[o]?.defId)
    expect(back.sort()).toEqual(['OGN-010', 'OGN-175', 'OGN-175'])
    expect(Object.values(g.state.objects).some((o) => String(o.zone) === `exile:${P2}`), '放逐区已空').toBe(false)
  })
  test('对照:我(艾希控制者)自己据守不触发,牌留在放逐区', () => {
                                                              
    const base = scene()
    const mine = obj('mine', 'OGN-175', P1, 'battlefield:shared:0')
    let s: GameState = { ...base, objects: { ...base.objects, mine: mine },
      zones: { ...base.zones, 'battlefield:shared:0': { ...base.zones['battlefield:shared:0' as never]!, contents: [...base.zones['battlefield:shared:0' as never]!.contents, asObjId('mine')] } } as never }
    s = writeControl(s, 'battlefield:shared:0', asPlayerId(P1))
    const g = new InteractiveGame(s, makeGameDeps(20260826) as never)
    const prompts: string[] = []
    g.apply(g.legalActions(asPlayerId(P1)).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid?: string }).oid === 'ashe')!)
    drive(g, prompts)
                                                               
                                                         
                                                            
                                        
    g.apply(g.legalActions(asPlayerId(P1)).find((a) => a.kind === 'END_TURN')!)
    drive(g, prompts)
    g.apply(g.legalActions(asPlayerId(P2)).find((a) => a.kind === 'END_TURN')!)
    drive(g, prompts)
    expect(g.state.scores[P1], 'P1 自己的据守真发生了').toBe(1)
    expect((g.state.zones[`hand:${P2}` as never]?.contents ?? []).length, '对手手牌仍是 3(h2+回手+抽1,没有第二次返回)').toBe(3)
  })
})
