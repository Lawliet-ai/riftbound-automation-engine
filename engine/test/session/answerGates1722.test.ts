   
                                               
                            
  
                                                          
                                                                                  
                                                                
                                                                       
                                        
                                                                      
                                                            
  
                                                                         
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { seedRunes } from '../../src/game/economy'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)
const unit = (oid: string, ctrl: typeof P1, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'U-ONE', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: { ready: true },
} as GameObject)

const ORDER_KEY = '§465:order'
const ask = {
  assigner: P1, battlefield: BF0, key: ORDER_KEY,
  candidates: [{ oid: asObjId('a'), label: 'A' }, { oid: asObjId('b'), label: 'B' }],
}

function withDamageOrder(): InteractiveGame {
  const s = { ...createInitialState([P1, P2], 2), activePlayer: P1, phase: 'main' } as GameState
  const g = new InteractiveGame(s, DEPS)
  g.restore({ ...g.snapshot(), state: s, pendingDamageOrder: ask } as never)
  return g
}
const answered = (g: InteractiveGame): string => String(g.state.ruleChoices[ORDER_KEY] ?? '(none)')

describe('★1722 结算期选择与分伤选序的三道门', () => {
  test('① 🔴⭐⭐⭐⭐⭐【结算期选择未答完时,别的自决行动一律不收】', () => {
    let s = createInitialState([P1, P2], 2)
    s = {
      ...s, activePlayer: P1, phase: 'main', priority: null,
      objects: { mine: unit('mine', P1, `base:${P1}`) },
      zones: { ...s.zones, [`base:${P1}`]: { ...s.zones[`base:${P1}`]!, contents: [asObjId('mine')] } },
    } as GameState
    s = seedRunes(s, P1, 'red', 2)
    const g = new InteractiveGame(s, DEPS)
    g.restore({
      ...g.snapshot(), state: s,
      choice: { kind: 'choice', state: s, request: { itemId: 'x', controller: P1, key: 'probe:key', prompt: '待答', candidates: [{ id: 'a', label: 'A' }] } },
    } as never)
    g.apply({ kind: 'MOVE', player: P1, oid: 'mine', to: BF0 } as never)
                                                    
    expect({ mode: g.pending().mode, zone: String(g.state.objects['mine' as never]?.zone) })
      .toEqual({ mode: 'choice', zone: `base:${P1}` })
  })

  test('② 🔴⭐⭐⭐⭐【分伤选序:非分配方作答一律不收】', () => {
    const g = withDamageOrder()
    g.apply({ kind: 'CHOOSE', player: P2, key: ORDER_KEY, answer: 'a' } as never)
    expect(answered(g), '★刀下读数 "a" —— 对手替我决定了伤害怎么分').toBe('(none)')
  })

  test('③ 🔴⭐⭐⭐⭐【分伤选序:不在候选里的答案一律不收(别让脏数据进账本)】', () => {
    const g = withDamageOrder()
    g.apply({ kind: 'CHOOSE', player: P1, key: ORDER_KEY, answer: 'ZZZ' } as never)
    expect(answered(g), '★刀下读数 "ZZZ" —— 后续 parseDamageOrder 会按它分伤').toBe('(none)')
  })

  test('④ ⭐⭐【对照:分配方答一个合法候选 ⇒ 要收下(别把闸写成"什么都不收")】', () => {
    const g = withDamageOrder()
    g.apply({ kind: 'CHOOSE', player: P1, key: ORDER_KEY, answer: 'a' } as never)
    expect(answered(g)).toBe('a')
  })

  test('⑤ ⭐⭐【同一个候选不许选两次(★1019 那条,顺带钉住)】', () => {
    const g = withDamageOrder()
    g.apply({ kind: 'CHOOSE', player: P1, key: ORDER_KEY, answer: 'a' } as never)
    g.apply({ kind: 'CHOOSE', player: P1, key: ORDER_KEY, answer: 'a' } as never)
    expect(answered(g), '★答两次同一个 ⇒ 账本里仍只有一笔').toBe('a')
  })
})
