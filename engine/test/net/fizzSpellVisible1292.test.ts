import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { InteractiveAction, InteractiveDeps } from '../../src/session/interactiveGame'
import { InteractiveGame } from '../../src/session/interactiveGame'
import {
  activeTriggers, cardCost, cardDomains, cardKeywords, cardKind, costModsFor, handPlaySpecs, playSpecFor,
} from '../../data/registry'

                                                          
  
                                             
                                                           
                                                                             
                                      
                                                                  
                                                     
                                                    
  
                                                  
                                       
                                                                
                                                             
                                   
                                                                                      
                            
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BAIT = 'SFD-087'                                              

function obj(oid: string, defId: string, ctrl = P1, zone = `hand:${P1}`, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  }
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
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const rune = (oid: string, color: string, ctrl = P1): GameObject =>
  ({ ...obj(oid, `rune:${color}`, ctrl, `base:${ctrl}`), baseTypes: ['rune'] as never })
const spellCard = (oid: string, defId: string, zone: string): GameObject =>
  ({ ...obj(oid, defId, P1, zone), baseTypes: ['spell'] as never })
const deps: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, cardDomains, costModsFor, playSpecFor,
}

                                          
function runFizz(): InteractiveGame {
  const g = new InteractiveGame(scene([
    obj('fizz', 'SFD-140', P1, `hand:${P1}`),
    spellCard('bait', BAIT, `discard:${P1}`),
    spellCard('d1', 'BLK', `mainDeck:${P1}`),
    rune('rb1', 'blue'), rune('rb2', 'blue'), rune('rb3', 'blue'), rune('rb4', 'blue'), rune('rp1', 'purple'),
  ]), deps)
  const play = g.legalActions(P1).find(
    (a: InteractiveAction) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'fizz')!
  g.apply(play)
                                                                    
                                                              
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'choice') {
      const req = (p as unknown as {
        request: { key: string; controller: PlayerId; candidates?: readonly { readonly id: string }[] }
      }).request
      const cands = req.candidates ?? []
      const answer = req.key.startsWith('__mayChoose__') ? 'yes'
        : (cands.find((c) => c.id === 'bait')?.id ?? cands[0]?.id)
      if (answer === undefined) break
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer } as unknown as InteractiveAction)
    } else if (p.mode === 'window') {
      g.apply({ kind: 'PASS', player: (p as unknown as { player: PlayerId }).player } as unknown as InteractiveAction)
    } else break
  }
  return g
}

describe('★1292 菲兹从废牌堆打出的法术,战报里看得见(动态验,不是推的)', () => {
  test('★前提:这一局真的把那张法术打出去了(离开了废牌堆)', () => {
    const g = runFizz()
    const bait = g.state.objects[asObjId('bait')]
                                      
    expect(String(bait?.zone ?? '(已换 oid/离场)').startsWith(`discard:${P1}`),
      '★造景自证:法术真被打出去了(否则下面「战报有它」是假的)').toBe(false)
  })

  test('★★★战报里有这张法术 —— 由随后那条 playSpell 承担,不是 playSpellFromZone', () => {
    const g = runFizz()
    const entries = g.journal.projectFor(P1)
    expect(entries.length, '★判别力下限:战报读空了这条不作数').toBeGreaterThan(0)
    const spell = entries.filter((e) => e.kind === 'playSpell' && (e as { defId?: string }).defId === BAIT)
    expect(spell.length, '★★★这张从废牌堆打出的法术在战报里出现过(★1291 那条推理成立)').toBeGreaterThan(0)
                                                            
                                                                             
                                                     
                                                               
                                                   
    const cmd = entries.filter((e) => e.kind === 'playSpellFromZone')
    expect(cmd.length, '★★指令信号确实也记了条目(所以更不能再给它渲染,否则重复)').toBe(1)
    expect((cmd[0] as { oid?: string }).oid, '★★两条指的是同一张牌 —— 重复的实锤').toBe('bait')
  })
})
