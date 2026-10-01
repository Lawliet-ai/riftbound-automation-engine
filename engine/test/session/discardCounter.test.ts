import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { discardCounterDemo } from '../../data/demoScenes'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }
const BF0 = 'battlefield:shared:0'

function findPlay(acts: InteractiveAction[], defIdHint: 'DEMO-BOLT' | 'UNL-131', g: InteractiveGame): InteractiveAction | undefined {
  return acts.find((a) => a.kind === 'PLAY_CARD' && g.state.objects[(a as { cardOid: string }).cardOid]?.defId === defIdHint)
}

describe('遗弃反制(手牌反应牌无效化一个法术)', () => {
  test('P1灼击→反应窗口→P2遗弃无效化→灼击回P1手牌、P2单位无伤、遗弃进P2废牌堆', () => {
    const g = new InteractiveGame(discardCounterDemo(), DEPS)

                                       
    const boltAct = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'p2u')
    expect(boltAct).toBeTruthy()
    g.apply(boltAct!)

                          
    expect(g.pending()).toEqual({ mode: 'window', player: P1, chainDepth: 1 })
    g.apply({ kind: 'PASS', player: P1 })                 

    let p = g.pending()
    expect(p).toMatchObject({ mode: 'window', player: P2 })

                                                                    
    const discardAct = findPlay(g.legalActions(P2), 'UNL-131', g)
    expect(discardAct).toBeTruthy()
    expect((discardAct as { target?: string }).target).toMatch(/^play:/)             
    g.apply(discardAct!)

                                             
    g.apply({ kind: 'PASS', player: P2 })
    g.apply({ kind: 'PASS', player: P1 })

                     
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
                                      
    expect(g.state.zones['hand:P1']!.contents.some((oid) => g.state.objects[oid]?.defId === 'DEMO-BOLT')).toBe(true)
    expect(g.state.objects['p2u']!.damage).toBe(0)
                       
    expect(g.state.zones['discard:P2']!.contents.some((oid) => g.state.objects[oid]?.defId === 'UNL-131')).toBe(true)
           
    expect(g.state.chain).toHaveLength(0)
  })

  test('无灼击在链上时,P2 手里的遗弃在行动阶段不产生可打动作(无合法目标)', () => {
    const g = new InteractiveGame(discardCounterDemo(), DEPS)
                         
    expect(g.legalActions(P2)).toEqual([])
  })

  test('灼击未被反制时正常结算:对 P2 单位造成2点', () => {
    const g = new InteractiveGame(discardCounterDemo(), DEPS)
    const boltAct = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'p2u')!
    g.apply(boltAct)
    g.apply({ kind: 'PASS', player: P1 })         
    g.apply({ kind: 'PASS', player: P2 })                    
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
    expect(g.state.objects['p2u']!.damage).toBe(2)        
  })
})
