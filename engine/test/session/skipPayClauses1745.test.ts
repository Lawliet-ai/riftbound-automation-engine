   
                                                  
  
              
                                                                                           
                                                        
  
                                 
                                               
                                    
                                                                                                          
                                           
                                           
                                                                                            
  
                                                                                        
                                                            
                                                                
  
            
                                                    
                                                   
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { disempower, isEmpowered, empower } from '../../src/keywords/empower'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = makeGameDeps(1)
const BF0 = 'battlefield:shared:0'

const mk = (id: string, owner: typeof P1, zone: string, defId = 'BLK'): GameObject => ({
  oid: asObjId(id), defId, owner, controller: owner, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

                                                      
function scene(treasure: boolean): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = { d2: mk('d2', P2, 'mainDeck:P2') }
  const zones: typeof base.zones = {
    ...base.zones,
    'mainDeck:P2': { ...base.zones['mainDeck:P2']!, contents: [asObjId('d2')] },
    ...(treasure ? { 'base:P2': { ...base.zones['base:P2']!, contents: [asObjId('tr')] } } : {}),
  }
  if (treasure) objects['tr'] = mk('tr', P2, 'base:P2', 'VEN-022')
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
}

const readHandDeck = (g: InteractiveGame, p: string) => ({
  hand: g.state.zones[`hand:${p}` as never]!.contents.length,
  deck: g.state.zones[`mainDeck:${p}` as never]!.contents.length,
})

describe('★1745 §443 跳过(抽牌阶段)· 行为闸', () => {
  test('① 🔴⭐⭐⭐⭐⭐【覆盖洞:无尽秘藏在场 ⇒ 新回合玩家的抽牌【没有发生】】', () => {
    const g = new InteractiveGame(scene(true), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 } as never)
    expect(g.state.activePlayer, '§443.2 游戏照常进行:回合照交接').toBe(P2)
                                           
    expect(readHandDeck(g, 'P2'), '★跳过 ⇒ 手牌没多、牌堆也没少(不是抽了再塞回去)')
      .toEqual({ hand: 0, deck: 1 })
  })

  test('② ⭐⭐⭐【对照:没有无尽秘藏 ⇒ 照常抽(否则闸就成了"谁都不抽")】', () => {
    const g = new InteractiveGame(scene(false), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 } as never)
    expect(readHandDeck(g, 'P2'), '§315.4.b 新回合玩家照抽').toEqual({ hand: 1, deck: 0 })
  })

  test('③ ⭐⭐⭐【「跳过【你的】抽牌阶段」= 只跳控制者,对手照抽(行为侧,不只是谓词)】', () => {
                                    
    const base = createInitialState([P1, P2], 2)
    const s: GameState = {
      ...base, activePlayer: P2, priority: null, phase: 'main',
      objects: { d1: mk('d1', P1, 'mainDeck:P1'), tr: mk('tr', P2, 'base:P2', 'VEN-022') },
      zones: {
        ...base.zones,
        'mainDeck:P1': { ...base.zones['mainDeck:P1']!, contents: [asObjId('d1')] },
        'base:P2': { ...base.zones['base:P2']!, contents: [asObjId('tr')] },
      },
    } as GameState
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'END_TURN', player: P2 } as never)
    expect(readHandDeck(g, 'P1'), '★敌我分明:秘藏是 P2 的,P1 照抽').toEqual({ hand: 1, deck: 0 })
  })
})

describe('★1745 §442 解除强化 · 条款闸(刀红过,这里钉住读数)', () => {
  test('④ ⭐⭐⭐【§442.1.a / §442.1.a.1:对未强化的物件解除强化,不产生任何效果(返回原引用)】', () => {
    const s = scene(false)
    const out = disempower(s, asObjId('d2'))
    expect(out, '★§442.1.a.1「不会产生任何效果」——连新对象都不该造').toBe(s)
  })

  test('⑤ ⭐⭐⭐⭐【§442.1 强化 ⇄ 解除强化 的往返:解完之后【再解一次】仍是无操作】', () => {
                                                           
    const base = createInitialState([P1, P2], 2)
    const u = mk('u', P1, BF0)
    const s0: GameState = {
      ...base, activePlayer: P1, priority: null, phase: 'main', objects: { u },
      zones: { ...base.zones, [BF0]: { ...base.zones[BF0]!, contents: [asObjId('u')] } },
    } as GameState
    const on = empower(s0, asObjId('u'))
    expect(isEmpowered(on.objects[asObjId('u')]!), '★场上物件强化得动').toBe(true)
    expect(empower(on, asObjId('u')), '§441.1.b 已强化的无法再被强化(缺省上限 1)⇒ 原引用').toBe(on)
    const off = disempower(on, asObjId('u'))
    expect(isEmpowered(off.objects[asObjId('u')]!), '§442.1 解除强化 ⇒ 移除已强化状态').toBe(false)
    expect(disempower(off, asObjId('u')), '★§442.1.a.1 再解一次:不产生任何效果 ⇒ 原引用').toBe(off)
  })
})
