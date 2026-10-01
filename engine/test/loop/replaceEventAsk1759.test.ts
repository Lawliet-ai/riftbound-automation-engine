   
                                                       
  
                               
                                                 
                                             
                                                                        
  
                                                            
                                                                     
                                        
  
                               
                                                                                
                              
                                                        
                                                            
                      
  
                                                     
                                               
                                                    
                                              
  
                                                       
                                                 
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { runCleanupToFixpoint, pendingReplaceEventAsk, replaceEventOrderKey } from '../../src/loop/cleanup'
import { makeGameDeps } from '../../data/gameDeps'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)
const HOOKS = {
  replaceDestroyCandidates: DEPS.replaceDestroyCandidates,
  replaceDestroy: DEPS.replaceDestroy,
  extraLethal: DEPS.extraLethal,
} as never

                                                                           
const u = (id: string, ctrl: typeof P1): GameObject => ({
  oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 2, counters: {},
  status: { attacking: true },
} as GameObject)

                                                
function scene(ids: readonly string[], pips: number, ctrl: typeof P1 = P1, answer?: string): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs = ids.map((id) => u(id, ctrl))
  const objects: Record<string, GameObject> = {}
  for (const o of objs) objects[o.oid] = o
  return {
    ...base, activePlayer: P1, phase: 'main', objects,
    battlefieldCards: { [BF0]: { defId: 'UNL-206', owner: P1 } },
    runePools: { ...base.runePools, [ctrl]: { ...base.runePools[ctrl]!, runes: { red: pips } } },
    ...(answer !== undefined ? { ruleChoices: { ...base.ruleChoices, [replaceEventOrderKey('bloodAltar')]: answer } } : {}),
    zones: { ...base.zones, [BF0]: { ...base.zones[BF0]!, contents: objs.map((o) => o.oid) } },
  } as GameState
}

const survivors = (st: GameState): string[] => {
  const out = runCleanupToFixpoint(st, HOOKS)
  return ['a', 'b'].filter((x) => out.objects[x as never] !== undefined)
}

describe('★1759 §373 预扫:钱只够救一个时,本该问控制者', () => {
  test('① 🔴⭐⭐⭐⭐⭐【一条替换能救两个、只救得起一个 ⇒ 认出来要问谁】', () => {
    const ask = pendingReplaceEventAsk(scene(['a', 'b'], 3), HOOKS)
    expect(ask, '★该问').not.toBeNull()
    expect(ask?.candidateId, '★问的是哪条替换').toBe('bloodAltar')
    expect(ask?.sourceDefId, '★UI 拿它渲染卡名').toBe('UNL-206')
    expect(ask?.controller, '★问的是那两名单位的控制者').toBe(P1)
    expect([...(ask?.oids ?? [])].map(String).sort(), '★候选就是这两个').toEqual(['a', 'b'])
  })

  test('② ⭐⭐⭐⭐【钱够救两个 ⇒ 不问(顺序没有后果)】', () => {
    expect(pendingReplaceEventAsk(scene(['a', 'b'], 6), HOOKS), '★救得全就不该打扰玩家').toBeNull()
  })

  test('③ ⭐⭐⭐⭐【一分钱都没有 ⇒ 不问(这条替换根本不成立,无从选起)】', () => {
    expect(pendingReplaceEventAsk(scene(['a', 'b'], 0), HOOKS), '★候选都不成立').toBeNull()
  })

  test('④ ⭐⭐⭐【只有一个将死 ⇒ 不问(§373 说的是"多个事件同时发生")】', () => {
    expect(pendingReplaceEventAsk(scene(['a'], 3), HOOKS)).toBeNull()
  })

  test('⑤ ⭐⭐⭐【答过了就不再问(§370.2 一个事件只处理一次)】', () => {
    expect(pendingReplaceEventAsk(scene(['a', 'b'], 3, P1, 'b'), HOOKS)).toBeNull()
  })
})

describe('★1759 §373 落地:答案真的改变【谁被救】', () => {
  test('⑥ 🔴⭐⭐⭐⭐⭐【答 b ⇒ 活的是 b,尽管 a 的插入序在前】', () => {
    expect(survivors(scene(['a', 'b'], 3)), '★没答 ⇒ 仍是插入序(a 在前 ⇒ a 活)').toEqual(['a'])
    expect(survivors(scene(['a', 'b'], 3, P1, 'b')), '★答 b ⇒ 救的改成 b').toEqual(['b'])
  })

  test('⑦ ⭐⭐⭐⭐【答 a ⇒ 活的是 a;与"不答"同解,但那是【答出来的】不是【碰巧的】】', () => {
    expect(survivors(scene(['b', 'a'], 3)), '★插入序 b 在前 ⇒ 不答时 b 活').toEqual(['b'])
    expect(survivors(scene(['b', 'a'], 3, P1, 'a')), '★答 a ⇒ 翻过来救 a').toEqual(['a'])
  })

  test('⑧ 🔴⭐⭐⭐⭐【没答时行为【一字不变】—— ★982 的行为档照旧成立】', () => {
                                                         
    expect(survivors(scene(['a', 'b'], 3))).toEqual(['a'])
    expect(survivors(scene(['b', 'a'], 3))).toEqual(['b'])
  })
})
