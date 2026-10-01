                                                        
                                      
  
        
                                                        
                                                 
                                                     
                                                
                                                     
                                        
import { describe, expect, it } from 'vitest'
import { playCard } from '../../src/loop/playCard'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')

function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const card = { oid: asObjId('spell1'), defId: 'OGN-011', owner: P1, controller: P1,
    zone: asZoneId(`hand:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['spell'],
    damage: 0, counters: {}, status: {} } as unknown as GameObject
  const z = base.zones[`hand:${P1}`]!
  return { ...base, activePlayer: P1, priority: null, phase: 'main',
    objects: { ...base.objects, spell1: card },
    zones: { ...base.zones, [`hand:${P1}`]: { ...z, contents: [...z.contents, card.oid] } } } as GameState
}

                                                    
const makeResolve = () => (st: GameState): GameEvent[] =>
  (st.scores[P1] ?? 0) < 1
    ? [{ kind: 'gainPoint', player: P1, amount: 1 } as GameEvent]
    : [{ kind: 'draw', player: P1, count: 1 } as GameEvent]

                                            
function play(deps: ReduceDeps, passDeps: boolean): { kinds: string[]; landed: GameState } {
  const s = scene()
  const res = playCard(s, {
    cardOid: asObjId('spell1'), controller: P1, cost: { mana: 0 }, keywords: [], kind: 'spell',
    limitedAction: true, echoTimes: 1, makeResolve, ...(passDeps ? { deps } : {}),
  } as never)
  expect(res.ok, '造景:法术要打得出去').toBe(true)
  if (!res.ok) throw new Error('unreachable')
  const out = (res.item.resolve as (st: GameState) => GameEvent[])(res.state)
  return { kinds: out.map((e) => e.kind), landed: applyEvents(res.state, out, deps).state }
}

describe('★1122【缺陷 113】§820 回响:后一次执行必须看到过完替换/禁令层的盘面', () => {
  it('🔴 基线(没有任何禁令):第一次得分成功 ⇒ 第二次改抽牌。这一档修前修后都一样', () => {
    expect(play({}, true).kinds).toEqual(['gainPoint', 'draw'])
    expect(play({}, false).kinds).toEqual(['gainPoint', 'draw'])                          
  })

  it('🔴🔴 禁令开着:第一次的得分【没有发生】⇒ 第二次应当【再得一次分】,不是改抽牌', () => {
    const blocked: ReduceDeps = { scoreBlockedAnywhere: () => true }                        
    expect(play(blocked, true).kinds).toEqual(['gainPoint', 'gainPoint'])
  })

  it('🔴🔴🔴 修前的错法直接改变胜负:那一发白抽的牌在空牌堆上引爆反复燃尽,把对手送到胜利分', () => {
    const blocked: ReduceDeps = { scoreBlockedAnywhere: () => true }
    const wrong = play(blocked, false)                                
    expect(wrong.kinds).toEqual(['gainPoint', 'draw'])         
                                                    
    expect(wrong.landed.scores['P2']).toBe(wrong.landed.winTarget)
    const right = play(blocked, true)
    expect(right.landed.scores['P2'] ?? 0).toBe(0)               
  })

  it('🔴 sim 只是临时态:修法不会让第一批事件双重生效(落地仍只有一次)', () => {
    const r = play({}, true)
    expect(r.landed.scores['P1']).toBe(1)                                       
  })
})
