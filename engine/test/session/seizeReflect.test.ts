import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { seizeReflectDemo } from '../../data/demoScenes'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function play(g: InteractiveGame, who: typeof P1, defId: string): InteractiveAction {
  const a = g.legalActions(who).find((x) => x.kind === 'PLAY_CARD' && g.state.objects[(x as { cardOid: string }).cardOid]?.defId === defId)
  if (!a) throw new Error(`无可打 ${defId}`)
  return a
}

describe('灵魂折镜 夺控+另做选择(结算期付[A]分支)', () => {
  test('P2付[A]夺控灼击并重选目标→灼击改打P1单位', () => {
    const g = new InteractiveGame(seizeReflectDemo(), DEPS)

                    
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'p2u')!)
    g.apply({ kind: 'PASS', player: P1 })                 

                      
    g.apply(play(g, P2, 'VEN-152'))
    g.apply({ kind: 'PASS', player: P2 })
    g.apply({ kind: 'PASS', player: P1 })                          

                    
    let p = g.pending()
    expect(p.mode).toBe('choice')
    if (p.mode !== 'choice') throw new Error('应弹付[A]选择')
    expect(p.player).toBe(P2)
    expect(p.request.key).toBe('payA')
    g.apply({ kind: 'CHOOSE', player: P2, key: 'payA', answer: 'yes' })

                                     
    p = g.pending()
    expect(p.mode).toBe('choice')
    if (p.mode !== 'choice') throw new Error('应弹重选目标')
    expect(p.request.key).toBe('rechoose')
    expect(p.request.candidates.some((c) => c.id === 'p1u')).toBe(true)
    g.apply({ kind: 'CHOOSE', player: P2, key: 'rechoose', answer: 'p1u' })

                                                     
    g.apply({ kind: 'PASS', player: P2 })                       
    g.apply({ kind: 'PASS', player: P1 })                      

    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
    expect(g.state.objects['p1u']!.damage).toBe(2)                          
    expect(g.state.objects['p2u']!.damage).toBe(0)          
    expect(g.state.chain).toHaveLength(0)
                                                    
    expect(g.state.zones['discard:P2']!.contents.some((o) => g.state.objects[o]?.defId === 'VEN-152')).toBe(true)
    expect(g.state.zones['discard:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'DEMO-BOLT')).toBe(true)
                                                                      
    expect(g.state.runePools['P2']!.runes['purple'] ?? 0).toBe(0)
    expect(g.state.runePools['P2']!.mana).toBe(2)
  })

  test('CHOOSE 答案必须在候选集内:付不起[A]时答 yes 被拒(白嫖夺控封死)', () => {
                                                                
    const base = seizeReflectDemo()
    const oneEnergy = { ...base, runePools: { ...base.runePools, P2: { mana: 4, runes: { purple: 1 } } } }
    const g = new InteractiveGame(oneEnergy, DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'p2u')!)
    g.apply({ kind: 'PASS', player: P1 })
    g.apply(play(g, P2, 'VEN-152'))
    g.apply({ kind: 'PASS', player: P2 })
    g.apply({ kind: 'PASS', player: P1 })

    const p = g.pending()
    if (p.mode !== 'choice') throw new Error('应弹付[A]选择')
    expect(p.request.candidates.map((c) => c.id)).toEqual(['no'])                  
    g.apply({ kind: 'CHOOSE', player: P2, key: 'payA', answer: 'yes' })                 
    expect(g.pending().mode).toBe('choice')             
    g.apply({ kind: 'CHOOSE', player: P2, key: 'payA', answer: 'no' })
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
    expect(g.state.objects['p2u']!.damage).toBe(0)                   
  })

  test('P2不付[A]→灼击被无效化(进废牌堆),两边单位都无伤', () => {
    const g = new InteractiveGame(seizeReflectDemo(), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'p2u')!)
    g.apply({ kind: 'PASS', player: P1 })
    g.apply(play(g, P2, 'VEN-152'))
    g.apply({ kind: 'PASS', player: P2 })
    g.apply({ kind: 'PASS', player: P1 })
    g.apply({ kind: 'CHOOSE', player: P2, key: 'payA', answer: 'no' })            

    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
    expect(g.state.objects['p1u']!.damage).toBe(0)
    expect(g.state.objects['p2u']!.damage).toBe(0)
    expect(g.state.chain).toHaveLength(0)
                                   
    expect(g.state.zones['discard:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'DEMO-BOLT')).toBe(true)
  })
})
