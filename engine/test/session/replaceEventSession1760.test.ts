   
                                                         
  
            
                                                                         
                                                                              
                                                                  
                                          
  
                                                  
                                                                           
                                                                           
                                                                                          
                      
                                                          
                                                 
  
          
                                                        
                                                    
                                                                        
                                                  
                                         
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { replaceEventOrderKey } from '../../src/loop/cleanup'
import { makeGameDeps } from '../../data/gameDeps'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const KEY = replaceEventOrderKey('bloodAltar')

                                                                           
const u = (id: string): GameObject => ({
  oid: asObjId(id), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: { attacking: true },
} as GameObject)

                                                          
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs = [u('a'), u('b')]
  const foe: GameObject = {
    oid: asObjId('foe'), defId: 'BLK', owner: P2, controller: P2, zone: asZoneId(BF0),
    baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as GameObject
  const all = [...objs, foe]
  const objects: Record<string, GameObject> = {}
  for (const o of all) objects[o.oid] = o
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main', objects,
    battlefieldCards: { [BF0]: { defId: 'UNL-206', owner: P1 } },
    runePools: { ...base.runePools, [P1]: { ...base.runePools[P1]!, runes: { red: 3 } } },
    zones: { ...base.zones, [BF0]: { ...base.zones[BF0]!, contents: all.map((o) => o.oid) } },
  } as GameState
}

   
                                           
                                                                
                                   
                                                           
   
function attacked(): InteractiveGame {
  const g = new InteractiveGame(scene(), makeGameDeps(1))
  g.apply({ kind: 'ATTACK', player: P1, battlefield: BF0 } as never)
  for (let i = 0; i < 4; i++) {
    const p = g.pending() as { mode?: string; player?: string }
    if (p.mode !== 'window') break
    g.apply({ kind: 'PASS', player: p.player } as never)
  }
  return g
}

describe('★1760 §373 会话层:玩家真的被问到', () => {
  test('① 🔴⭐⭐⭐⭐⭐【问出来了,而且是【通用 choice】—— UI 不用认新 mode】', () => {
    const p = attacked().pending() as { mode?: string; player?: string; request?: { key?: string; candidates?: { id: string }[] } }
    expect(p.mode, '★借 choice 形状端出去').toBe('choice')
    expect(String(p.player), '★问的是那两名单位的控制者').toBe('P1')
    expect(p.request?.key, '★key 按【替换效果】记,不按将死物件').toBe(KEY)
    expect((p.request?.candidates ?? []).map((c) => c.id).sort(), '★候选就是那两个').toEqual(['a', 'b'])
  })

  test('② 🔴⭐⭐⭐⭐⭐【答 b ⇒ 活的是 b,尽管 a 的插入序在前】', () => {
    const g = attacked()
    g.apply({ kind: 'CHOOSE', player: P1, key: KEY, answer: 'b' } as never)
    expect(g.state.objects[asObjId('b')], '★b 被救下来了').toBeDefined()
    expect(g.state.objects[asObjId('a')], '★a 没救成').toBeUndefined()
    expect(g.state.objects[asObjId('b')]?.status.dormant, '§367 替换:清伤+休眠+召回').toBe(true)
  })

  test('③ ⭐⭐⭐⭐【答 a ⇒ 活的是 a(对照:两个方向都听答案,不是碰巧)】', () => {
    const g = attacked()
    g.apply({ kind: 'CHOOSE', player: P1, key: KEY, answer: 'a' } as never)
    expect(g.state.objects[asObjId('a')], '★a 被救下来了').toBeDefined()
    expect(g.state.objects[asObjId('b')], '★b 没救成').toBeUndefined()
  })

  test('④ ⭐⭐⭐【答案是一次性凭据:真跑完就从 ruleChoices 里删掉】', () => {
    const g = attacked()
    g.apply({ kind: 'CHOOSE', player: P1, key: KEY, answer: 'b' } as never)
    expect(g.state.ruleChoices[KEY], '★用完即弃,免得下一批误用旧答案').toBeUndefined()
    expect(g.pending(), '★答完不再停在这一问上').not.toMatchObject({ request: { key: KEY } })
  })

  test('⑤ ⭐⭐⭐【答题门禁:不是控制者、或 key 对不上、或答案不在候选里 ⇒ 一律不收】', () => {
    for (const bad of [
      { kind: 'CHOOSE', player: P2, key: KEY, answer: 'b' },       // 不是控制者
      { kind: 'CHOOSE', player: P1, key: 'nope', answer: 'b' },    // key 对不上
      { kind: 'CHOOSE', player: P1, key: KEY, answer: 'zzz' },     // 答案不在候选里
    ]) {
      const g = attacked()
      g.apply(bad as never)
      expect((g.pending() as { request?: { key?: string } }).request?.key, `★仍停在这一问上:${JSON.stringify(bad)}`).toBe(KEY)
    }
  })
})
