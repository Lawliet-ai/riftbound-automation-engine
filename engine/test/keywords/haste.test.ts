import { describe, expect, test } from 'vitest'
import { hasteExtraCost, entryStatusPatch, hasHaste } from '../../src/keywords/haste'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost, cardKeywords, cardKind, playBonusFor, cardDomains, hasteGrantedBy } from '../../data/registry'
import { effectiveMight } from '../../src/state/might'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { applyEvents } from '../../src/loop/reduce'
import { specLookup } from '../../data/decks'
import type { GameEvent } from '../../src/loop/events'

describe('§805 急速:打出时可额外付 [1]+[C] 以活跃状态进场', () => {
  test('§805.1.a 额外费用固定含 [1] 法力 + 一枚 [C] 符能', () => {
    const c = hasteExtraCost(['blue'])
    expect(c.mana).toBe(1)
    expect(c.pips).toHaveLength(1)
  })

  test('§805.1.a.1 单位有特性:[C] 只能用与其特性相匹配的符能支付', () => {
    expect(hasteExtraCost(['blue']).pips).toEqual([['blue']])
  })

  test('§805.1.a.1 多特性单位:可用其中【任一】特性的符能(内层列全)', () => {
    expect(hasteExtraCost(['red', 'blue']).pips).toEqual([['red', 'blue']])
  })

  test('§805.1.a.2 单位无特性:[C] 变 [A],任意特性皆可(内层空数组=任意)', () => {
    expect(hasteExtraCost([]).pips).toEqual([[]])
    expect(hasteExtraCost(undefined).pips).toEqual([[]])
  })

  test('§805.6 付了急速 → 以【活跃】状态进场(不带 dormant)', () => {
    expect(entryStatusPatch(true)).toEqual({})
  })

  test('§359.2.c 没付急速 → 照常以休眠状态进场', () => {
    expect(entryStatusPatch(false)).toEqual({ dormant: true })
  })

  test('§805.6 是【替换】不是"先休眠再激活":补丁里不存在中间的 dormant:true', () => {
                                        
                              
    const patch = entryStatusPatch(true)
    expect('dormant' in patch).toBe(false)
  })

                                                        
                                                                                     
                                                                 
                 
                                                                         
                                                         
                                                           

  test('关键词识别只认字面量(引擎卡无关)', () => {
    expect(hasHaste(['急速'])).toBe(true)
    expect(hasHaste(['迅捷'])).toBe(false)
    expect(hasHaste(undefined)).toBe(false)
  })
})

                                                                                 
                                                         
  
        
                                              
                                                       
                                                 
                         
  
                                             
                                                                        
                                                         
                                              
                                                               
                                                               
                                                                                 
                                                                         
                                                          
                                                         
  
                              
                                                              
                                                                     
                                                           
                                    
                                              
                                                        
                      
  
                                      
                                                     
                                                  
                                         
  
                                       
                                                     
                                                   
                                                               
                                                                              
                                                        
                                                                  
                                                     
                                            
                                              
                                                          
  
                                                                                 
                                                         
                                                                 
                                                                   
                                                              
                                                 
                                                                               
                                              
                                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const HASTE_UNIT = 'UNL-127'
const HAVEN = 'OGN-143'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
  damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
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

const deps = { getTriggers: activeTriggers, handPlaySpecs, cardCost, cardKeywords, cardKind, playBonusFor, cardDomains, hasteGrantedBy }
const might = (s: GameState, oid: string): number => effectiveMight(recomputeContinuous(s).objects[oid]!).reference

                                                                                       
const havenScene = (): GameState => scene([
  obj('haven', HAVEN, P1, `base:${P1}`, { baseTypes: ['equipment'] }),
  obj('u0', HASTE_UNIT, P1, `hand:${P1}`),
  ...Array.from({ length: 8 }, (_, i) => ({ ...obj(`rp${i}`, 'rune:purple', P1, `base:${P1}`), baseTypes: ['rune'] as never })),
])

                                                 
function playIt(haste: boolean): { state: GameState, landed: GameObject } {
  const g = new InteractiveGame(havenScene(), deps)
  const act = g.legalActions(P1).find((a) => {
    const x = a as { kind: string, oid?: string, haste?: boolean }
    return x.kind === 'PLAY_UNIT' && x.oid === 'u0' && (x.haste === true) === haste
  })
  expect(act, `★前提:legalActions 里得有 haste=${haste} 那支(没有多半是急速费的 pip 色给错了)`).toBeDefined()
  g.apply(act as InteractiveAction)
  const landed = Object.values(g.state.objects).find((o) => o.defId === HASTE_UNIT)!
  return { state: g.state, landed }
}

                                                  
function settle(st: GameState, ev?: GameEvent): GameState {
  let s = ev ? landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {}) : st
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        chosen[req.key] = req.candidates[0]!.id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('★★★★★★★ ★1353 §805.6.a【端到端】:真把急速单位打进场,「变为活跃」那族触发不该响', () => {
  test('★前提自证:UNL-127 印有[急速]、OGN-143 是装备、两张的卡面数照实测取', () => {
    expect(hasHaste(cardKeywords(HASTE_UNIT)), '★载体得真印着[急速],不然整条闸是空转').toBe(true)
    expect(cardKind(HASTE_UNIT)).toBe('unit')
    expect(cardCost(HASTE_UNIT)).toEqual({ mana: 2 })
    expect(cardDomains(HASTE_UNIT), '★§805.1.a.1:急速费的 [C] 只收这个色').toEqual(['purple'])
    expect(specLookup(HASTE_UNIT).baseMight, '★基线战力 —— +1 与否就看它').toBe(1)
    expect(cardKind(HAVEN)).toBe('equipment')
  })

  test('★★★★★★★主断言 §805.6.a:付急速打出 ⇒ 活跃进场,且 OGN-143 那族触发【一条都不入链】、战力不 +1', () => {
    const { state, landed } = playIt(true)
                                     
    expect(landed.status.dormant, '★§805.6:付了急速就以活跃状态进场').toBeUndefined()
                                                   
    expect(state.chain, '★§805.6.a「既不会与其互动,也不会将其触发」——连入链都不该有').toHaveLength(0)
                                     
    expect(might(settle(state), landed.oid), '★§805.6.a:OGN-143 的 +1 不该到手').toBe(1)
                                       
    expect(landed.zone).toBe(`base:${P1}`)
    expect(Object.values(state.objects).some((o) => o.defId === HAVEN), '★装备没被这一手动到').toBe(true)
  })

  test('★★★★★★★对照组(分因锚):同一套景【不付急速】⇒ 休眠进场,再变为活跃 ⇒ +1 【到手】', () => {
    const { state, landed } = playIt(false)
                                 
    expect(landed.status.dormant, '★没付急速就照常休眠进场').toBe(true)
    expect(might(state, landed.oid), '★刚落地时还没有加成').toBe(1)
                                                         
    const activate: GameEvent = { kind: 'statusChange', target: landed.oid, key: 'dormant', value: false }
    const after = settle(state, activate)
    expect(after.objects[landed.oid]!.status.dormant).toBe(false)
    expect(might(after, landed.oid), '★★这一条一红,上面那条主断言就【什么都没证明】——「没 +1」会变成「OGN-143 压根没接上」').toBe(2)
  })
})
