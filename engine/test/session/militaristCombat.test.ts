import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function obj(id: string, owner: typeof P1, zone: string, might: number, kw: string[] = [], defId = 'BLK'): GameObject {
  return { oid: asObjId(id), defId, owner, controller: owner, zone: asZoneId(zone), baseMight: might, baseKeywords: kw, damage: 0, counters: {}, status: {} }
}

                                                                 
function scene(enemyMight: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const militarist = obj('mil', P1, BF0, 2, ['待命'], 'OGN-121')
  const attacker = obj('atk', P2, BF0, enemyMight, [])
  const deckCards = [obj('d0', P1, 'mainDeck:P1', 0, ['待命']), obj('d1', P1, 'mainDeck:P1', 0, ['待命']), obj('d2', P1, 'mainDeck:P1', 0, ['待命']), obj('d3', P1, 'mainDeck:P1', 0, []), obj('d4', P1, 'mainDeck:P1', 0, [])]
  const objects: Record<string, GameObject> = { mil: militarist, atk: attacker }
  for (const c of deckCards) objects[c.oid] = c
  const bz = base.zones[BF0]!, dz = base.zones['mainDeck:P1']!
  return {
    ...base, activePlayer: P2, priority: null, phase: 'main',
    objects,
    zones: { ...base.zones, [BF0]: { ...bz, contents: [asObjId('mil'), asObjId('atk')] }, 'mainDeck:P1': { ...dz, contents: deckCards.map((c) => c.oid) } },
  }
}

                                                      
function advanceToChoiceOrAction(g: InteractiveGame): ReturnType<InteractiveGame['pending']> {
  for (let i = 0; i < 30; i++) {
    const p = g.pending()
    if (p.mode === 'choice' || p.mode === 'action' || p.mode === 'gameover') return p
    g.apply({ kind: 'PASS', player: p.player })
  }
  throw new Error('未收敛')
}

describe('军事家 交互战斗(防守触发§383.4.f + 结算期选目标集火)', () => {
  test('P2进攻→军事家防守触发入链→反应窗口→结算时弹"选此处敌方单位"', () => {
    const g = new InteractiveGame(scene(10), DEPS)
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
                                               
    const p = advanceToChoiceOrAction(g)
    expect(p.mode).toBe('choice')
    if (p.mode !== 'choice') throw new Error('应弹军事家选目标')
    expect(p.player).toBe(P1)                
    expect(p.request.key).toBe('target')
    expect(p.request.candidates.some((c) => c.id === 'atk')).toBe(true)            
  })

  test('军事家集火3(顶5含3待命)杀掉2战力进攻方单位', () => {
    const g = new InteractiveGame(scene(2), DEPS)            
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    const p = advanceToChoiceOrAction(g)
    if (p.mode !== 'choice') throw new Error('应弹选择')
    g.apply({ kind: 'CHOOSE', player: P1, key: 'target', answer: 'atk' })           
                              
    for (let i = 0; i < 30 && g.pending().mode !== 'action'; i++) {
      const q = g.pending()
      if (q.mode === 'choice') g.apply({ kind: 'CHOOSE', player: q.player, key: q.request.key, answer: q.request.candidates[0]!.id })
      else if (q.mode === 'window') g.apply({ kind: 'PASS', player: q.player })
      else break
    }
                             
    const atkGone = !g.state.zones[BF0]!.contents.some((o) => g.state.objects[o]?.owner === P2)
    expect(atkGone).toBe(true)
                      
    expect(g.state.zones['mainDeck:P1']!.contents).toHaveLength(5)
  })
})
