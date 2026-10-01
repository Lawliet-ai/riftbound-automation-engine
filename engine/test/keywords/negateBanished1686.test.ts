   
                                                                            
  
           
                                                                    
                                                                          
  
                     
                                                                                                        
                                                                                                      
                                                     
  
        
                                                                                           
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { activeTriggers } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
                                                                                     
function scene(recursion: boolean): GameState {
  const base = createInitialState([P1, P2], 2)
  const mk = (oid: string, defId: string, zone: string, types: string[]): GameObject => ({
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone), baseMight: 0, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  } as unknown as GameObject)
  const item = { id: 'ci', controller: P1, kind: 'spell', cardOid: asObjId('sp'), status: 'confirmed', resolve: () => [], ...(recursion ? { exileOnLeave: true } : {}) } as unknown as ChainItem
  const zones = {
    ...base.zones,
    'legend:P1': { ...base.zones['legend:P1' as never]!, contents: ['zed'] },
    'chain:shared': { ...base.zones['chain:shared' as never]!, contents: ['sp'] },
  }
  return { ...base, activePlayer: P2, objects: { zed: mk('zed', 'VEN-191', 'legend:P1', ['legend']), sp: mk('sp', 'VEN-051', 'chain:shared', ['spell']) }, zones, chain: [item] } as unknown as GameState
}
const NEGATE = [{ kind: 'negate', target: 'ci' } as GameEvent]

describe('★1686 缺陷 220:negate 放逐流转法术 ⇒ 派生 banished 信号(责任人 = 法术控制者)', () => {
  test('① 🛑★★★★★【前提自证:对照路径(banish 事件)影流之主确实会入链】', () => {
    const s = landAndEnqueueTriggers(scene(false), [{ kind: 'banish', target: 'sp' } as GameEvent], activeTriggers, P1, {})
    expect(s.chain.map((i) => i.id), '★景是真的').toContain('trig:VEN-191:banished:zed:banished:P1')
  })

  test('② 🔴⭐⭐⭐【对手无效化我的流转法术 ⇒ 放逐 + 信号派生 + 影流之主入链;对照:不是流转 ⇒ 进废牌堆、不入链】', () => {
    const landed = applyEvents(scene(true), NEGATE, {}).events
    const sig = landed.find((e) => e.kind === 'banished') as unknown as { player: string; responsible?: string[] } | undefined
    expect(sig, '★修前没有这条信号').toBeDefined()
    expect([sig?.player, sig?.responsible], '★拥有者与责任人都是 P1(不是出无效化的 P2)').toEqual([P1, [P1]])
    const s = landAndEnqueueTriggers(scene(true), NEGATE, activeTriggers, P2, {})
    expect(s.chain.map((i) => i.id), '★修前链上零触发').toContain('trig:VEN-191:banished:zed:banished:P1')
    const plain = landAndEnqueueTriggers(scene(false), NEGATE, activeTriggers, P2, {})
    expect([plain.chain.length, plain.zones['discard:P1' as never]!.contents.length], '★对照:普通法术被无效化 ⇒ 进废牌堆、不触发').toEqual([0, 1])
  })
})
