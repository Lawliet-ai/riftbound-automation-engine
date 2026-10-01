import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import {
  activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, costModsFor, activatedFor,
  playSpecFor, spellChainItems,
} from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { TWO_TARGET_SPECS } from '../../data/cards/two-target-spells'
import { SFD_129_SPEC } from '../../data/cards/SFD-129'
import { OGN_173_SPEC } from '../../data/cards/OGN-173'
import { makeSFD136Spec, SFD_136_PAY_KEY, SFD_136_PAY_YES, SFD_136_PAY_NO } from '../../data/cards/SFD-136'
import { UNL_032_SPEC, UNL_032_PICK } from '../../data/cards/UNL-032'
import { SFD_080_SPEC, SFD_122_SPEC, SFD_122_PICK } from '../../data/cards/echo-spells-499'

                                                                                  
                                                  
  
                                            
                                                                   
                                                                                   
                                                                     
                                   
                                                                      
                                             
  
                                                       
                                      
                                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

                                                 
const ck = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)

function unit(oid: string, ctrl: PlayerId = P1, zone = BF0, defId = 'BLK'): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 5, baseKeywords: [], baseTypes: ['unit'] as never, damage: 0, counters: {}, status: {},
  }
}

                                                                   
function scene(objs: readonly GameObject[], deck: readonly string[] = [], deckType: readonly string[] = ['spell']): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of objs) put(o)
  deck.forEach((defId, i) => put({
    oid: asObjId(`d${i}`), defId, owner: P1, controller: P1, zone: asZoneId(`mainDeck:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: deckType as never, damage: 0, counters: {}, status: {},
  }))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const handCard = (defId: string): GameObject => ({
  oid: asObjId('sp'), defId, owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['spell'] as never, damage: 0, counters: {}, status: {},
})

const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId(oid)]!).actual

const zoneOf = (s: GameState, oid: string): string => s.objects[asObjId(oid)]!.zone as string

                                                                                  
                                                               
                                                                          
                                                                                  
describe('★1812 #1 two-target 工厂(SFD-151 / OGN-206):第二问键逐份', () => {
                                                   
  const board = (): GameState => scene([unit('mine'), unit('home', P1, `base:${P1}`), unit('stolen', P1, BF0)])

  test('问侧:echoTimes=1 ⇒ 第 0 份用旧键、第 1 份用 `second:echo:2`', () => {
    const spec = TWO_TARGET_SPECS['SFD-151']!
    const ask = spec.makeNextChoice!
    const s = board()
    const q0 = ask({ movedCardOid: 'sp', target: 'mine', controller: P1, echoTimes: 1 })(s, {})
    expect(q0!.key, '★第 0 份沿用旧键(零回响不变量)').toBe('second')
    expect(q0!.candidates.map((c) => c.id).sort(), '★第一目标是 mine ⇒ 排掉它').toEqual(['home', 'stolen'])
    const q1 = ask({ movedCardOid: 'sp', target: 'mine', controller: P1, echoTimes: 1 })(s, { second: 'home' })
    expect(q1!.key, '★★第 1 份名空间化').toBe(ck('second', 1))
    expect(ck('second', 1)).toBe('second:echo:2')
    expect(ask({ movedCardOid: 'sp', target: 'mine', controller: P1, echoTimes: 1 })(s, { second: 'home', 'second:echo:2': 'stolen' }))
      .toBeNull()
  })

  test('问侧:零回响 ⇒ 只问旧键一次,答完即收口', () => {
    const spec = TWO_TARGET_SPECS['OGN-206']!
    const ask = spec.makeNextChoice!
    const s = board()
    expect(ask({ movedCardOid: 'sp', target: 'mine', controller: P1 })(s, {})!.key).toBe('second')
    expect(ask({ movedCardOid: 'sp', target: 'mine', controller: P1 })(s, { second: 'home' })).toBeNull()
  })

  test('★★逐份不同:两份各选不同目标 ⇒ 各按自己的答案生效(mine 吃两次 +1)', () => {
    const spec = TWO_TARGET_SPECS['SFD-151']!
    const s = board()
    const chosen = { second: 'home', 'second:echo:2': 'mine' }
                                                                  
    const evs0 = spec.makeResolve({ movedCardOid: 'sp', target: 'mine', controller: P1, echoIndex: 0 })(s, chosen)
    const evs1 = spec.makeResolve({ movedCardOid: 'sp', target: 'stolen', controller: P1, echoIndex: 1 })(s, chosen)
    const after = applyEvents(s, [...evs0, ...evs1], {}).state
    expect(mightOf(after, 'mine'), '第 0 份的第一目标 +1 与第 1 份的第二目标 +1').toBe(7)
    expect(mightOf(after, 'home'), '第 0 份的第二目标 +1').toBe(6)
    expect(mightOf(after, 'stolen'), '第 1 份的第一目标 +1').toBe(6)
  })

  test('零回响回归:只有旧键 `second` 时,第 0 份行为与修前一致;名空间键不被第 0 份读取', () => {
    const spec = TWO_TARGET_SPECS['SFD-151']!
    const s = board()
    const evs = spec.makeResolve({ movedCardOid: 'sp', target: 'mine', controller: P1 })(s, { second: 'home' })
    const after = applyEvents(s, evs, {}).state
    expect(mightOf(after, 'mine')).toBe(6)
    expect(mightOf(after, 'home')).toBe(6)
    expect(mightOf(after, 'stolen')).toBe(5)
                                       
    const onlyNs = spec.makeResolve({ movedCardOid: 'sp', target: 'mine', controller: P1 })(s, { 'second:echo:2': 'home' })
    const afterNs = applyEvents(s, onlyNs, {}).state
    expect(mightOf(afterNs, 'home'), '★名空间键对第 0 份不可见').toBe(5)
    expect(mightOf(afterNs, 'mine')).toBe(6)
  })
})

                                                                                  
                               
                                                                                  
describe('★1812 #2 SFD-129 诱饵:落点键逐份', () => {
                                                                            
  const board = (): GameState => scene([
    unit('foeA', P2, BF0), unit('foeB', P2, BF0),
    unit('helper', P2, BF1), unit('helperBase', P2, `base:${P2}`),
  ])
  const ask = (s: GameState, target: string, chosen: Record<string, string>, echoTimes?: number) =>
    SFD_129_SPEC.makeNextChoice!({
      movedCardOid: 'sp', controller: P1, target, ...(echoTimes !== undefined ? { echoTimes } : {}),
    })(s, chosen)

  test('问侧:第 0 份旧键;第 1 份 `baitDest:echo:2`', () => {
    const s = board()
    const q0 = ask(s, 'foeA', {}, 1)!
    expect(q0.key).toBe('baitDest')
    expect(q0.candidates.map((c) => c.id).sort()).toEqual([`base:${P2}`, BF1].sort())
    const q1 = ask(s, 'foeA', { baitDest: BF1 }, 1)!
    expect(q1.key).toBe(ck('baitDest', 1))
    expect(ck('baitDest', 1)).toBe('baitDest:echo:2')
    expect(ask(s, 'foeA', { baitDest: BF1, 'baitDest:echo:2': `base:${P2}` }, 1)).toBeNull()
  })

  test('★零回响:只问旧键一次', () => {
    const s = board()
    expect(ask(s, 'foeA', {})!.key).toBe('baitDest')
    expect(ask(s, 'foeA', { baitDest: BF1 })).toBeNull()
  })

  test('★★逐份不同:两份把不同敌人挪去不同落点', () => {
    const s = board()
    const chosen = { baitDest: BF1, 'baitDest:echo:2': `base:${P2}` }
    const e0 = SFD_129_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'foeA', echoIndex: 0 })(s, chosen)
    const s1 = applyEvents(s, e0, {}).state
    const e1 = SFD_129_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'foeB', echoIndex: 1 })(s1, chosen)
    const after = applyEvents(s1, e1, {}).state
    expect(zoneOf(after, 'foeA'), '第 0 份:foeA → BF1').toBe(BF1)
    expect(zoneOf(after, 'foeB'), '第 1 份:foeB → P2 基地').toBe(`base:${P2}`)
  })

  test('零回响回归:旧键 `baitDest` 在 echoIndex=0 生效;名空间键对第 0 份不可见', () => {
    const s = board()
    const e = SFD_129_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'foeA' })(s, { baitDest: BF1 })
    expect(zoneOf(applyEvents(s, e, {}).state, 'foeA')).toBe(BF1)
    const eNs = SFD_129_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'foeA' })(s, { 'baitDest:echo:2': BF1 })
    expect(applyEvents(s, eNs, {}).state.objects[asObjId('foeA')]!.zone, '★不可见 ⇒ 不动').toBe(asZoneId(BF0))
  })
})

                                                                                  
                                       
                                                                                  
describe('★1812 #3 OGN-173 驭风而行:落点键逐份', () => {
                                                           
  const board = (): GameState => scene([unit('mine1', P1, BF0), unit('mine2', P1, BF0), unit('helper', P1, BF1)])
  const ask = (s: GameState, target: string, chosen: Record<string, string>, echoTimes?: number) =>
    OGN_173_SPEC.makeNextChoice!({
      movedCardOid: 'sp', controller: P1, target, ...(echoTimes !== undefined ? { echoTimes } : {}),
    })(s, chosen)

  test('问侧:第 0 份旧键;第 1 份 `windDest:echo:2`', () => {
    const s = board()
    expect(ask(s, 'mine1', {}, 1)!.key).toBe('windDest')
    const q1 = ask(s, 'mine1', { windDest: BF1 }, 1)!
    expect(q1.key).toBe(ck('windDest', 1))
    expect(ck('windDest', 1)).toBe('windDest:echo:2')
    expect(ask(s, 'mine1', { windDest: BF1, 'windDest:echo:2': `base:${P1}` }, 1)).toBeNull()
  })

  test('★零回响:只问旧键一次', () => {
    const s = board()
    expect(ask(s, 'mine1', {})!.key).toBe('windDest')
    expect(ask(s, 'mine1', { windDest: BF1 })).toBeNull()
  })

  test('★★逐份不同:两份把不同友方挪去不同落点', () => {
    const s = board()
    const chosen = { windDest: BF1, 'windDest:echo:2': `base:${P1}` }
    const e0 = OGN_173_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'mine1', echoIndex: 0 })(s, chosen)
    const s1 = applyEvents(s, e0, {}).state
    const e1 = OGN_173_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'mine2', echoIndex: 1 })(s1, chosen)
    const after = applyEvents(s1, e1, {}).state
    expect(zoneOf(after, 'mine1'), '第 0 份:mine1 → BF1').toBe(BF1)
    expect(zoneOf(after, 'mine2'), '第 1 份:mine2 → 基地').toBe(`base:${P1}`)
  })

  test('零回响回归:旧键 `windDest` 生效;名空间键对第 0 份不可见', () => {
    const s = board()
    const e = OGN_173_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'mine1' })(s, { windDest: BF1 })
    expect(zoneOf(applyEvents(s, e, {}).state, 'mine1')).toBe(BF1)
    const eNs = OGN_173_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'mine1' })(s, { 'windDest:echo:2': BF1 })
    expect(applyEvents(s, eNs, {}).state.objects[asObjId('mine1')]!.zone, '★不可见 ⇒ 不动(但照旧变活跃)').toBe(asZoneId(BF0))
  })
})

                                                                                  
                                                            
                                                                                  
describe('★1812 #4 SFD-080 风箱炎息:多选前缀逐份', () => {
                                  
  const board = (): GameState => scene([unit('a', P1, BF0), unit('b', P2, BF0), unit('c', P1, BF0), unit('d', P2, BF0)])
  const confirm = (s: GameState, chosen: Record<string, string>, echoTimes?: number) =>
    SFD_080_SPEC.makeConfirmChoice!({
      movedCardOid: 'sp', controller: P1, ...(echoTimes !== undefined ? { echoTimes } : {}),
    })(s, chosen)

  test('问侧:第 0 份前缀旧键,收口后第 1 份前缀 `SFD-080:burn:echo:2`', () => {
    const s = board()
    expect(confirm(s, {}, 1)!.key).toBe('SFD-080:burn0')
    expect(confirm(s, { 'SFD-080:burn0': 'a' }, 1)!.key).toBe('SFD-080:burn1')
                                  
    const closed0 = { 'SFD-080:burn0': 'a', 'SFD-080:burn1': MULTI_SELECT_DONE }
    const q1 = confirm(s, closed0, 1)!
    expect(q1.key, '★★第 1 份名空间前缀').toBe(`${ck('SFD-080:burn', 1)}0`)
    expect(`${ck('SFD-080:burn', 1)}0`).toBe('SFD-080:burn:echo:20')
    const closed1 = { ...closed0, 'SFD-080:burn:echo:20': 'c', 'SFD-080:burn:echo:21': MULTI_SELECT_DONE }
    expect(confirm(s, closed1, 1)).toBeNull()
  })

  test('★零回响:只走旧前缀,收口即止', () => {
    const s = board()
    expect(confirm(s, {}, undefined)!.key).toBe('SFD-080:burn0')
    expect(confirm(s, { 'SFD-080:burn0': 'a', 'SFD-080:burn1': MULTI_SELECT_DONE }, undefined)).toBeNull()
  })

  test('★★逐份不同:两份各扫不同的一组单位', () => {
    const s = board()
    const chosen = {
      'SFD-080:burn0': 'a', 'SFD-080:burn1': 'b', 'SFD-080:burn2': MULTI_SELECT_DONE,
      'SFD-080:burn:echo:20': 'c', 'SFD-080:burn:echo:21': 'd', 'SFD-080:burn:echo:22': MULTI_SELECT_DONE,
    }
    const e0 = SFD_080_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, echoIndex: 0 })(s, chosen, undefined)
    const e1 = SFD_080_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, echoIndex: 1 })(s, chosen, undefined)
    expect(e0.map((e) => (e as { target: string }).target), '第 0 份打 a/b').toEqual(['a', 'b'])
    expect(e1.map((e) => (e as { target: string }).target), '第 1 份打 c/d').toEqual(['c', 'd'])
  })

  test('零回响回归:旧前缀生效;名空间前缀对第 0 份不可见', () => {
    const s = board()
    const e0 = SFD_080_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(
      s, { 'SFD-080:burn0': 'a', 'SFD-080:burn1': MULTI_SELECT_DONE }, undefined)
    expect(e0.map((e) => (e as { target: string }).target)).toEqual(['a'])
    const eNs = SFD_080_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(
      s, { 'SFD-080:burn:echo:20': 'a', 'SFD-080:burn:echo:21': MULTI_SELECT_DONE }, undefined)
    expect(eNs, '★名空间前缀对第 0 份不可见 ⇒ 零事件').toEqual([])
  })
})

                                                                                  
                                  
                                                                                  
describe('★1812 #5 SFD-136 强买强卖:赎金键逐份', () => {
  const SPEC = makeSFD136Spec(spellChainItems)
                                                        
  function board(): GameState {
    const base = createInitialState([P1, P2], 2)
    const mk = (oid: string, owner: PlayerId): GameObject => ({
      oid: asObjId(oid), defId: 'BLK', owner, controller: owner, zone: asZoneId('chain:'),
      baseMight: 0, baseKeywords: [], baseTypes: ['spell'] as never, damage: 0, counters: {}, status: {},
    })
    const chain: ChainItem[] = [
      { id: 'item:f1', controller: P2, kind: 'spell', cardOid: asObjId('f1') } as ChainItem,
      { id: 'item:f2', controller: P2, kind: 'spell', cardOid: asObjId('f2') } as ChainItem,
    ]
    return {
      ...base, activePlayer: P1, phase: 'main', chain,
      objects: { f1: mk('f1', P2), f2: mk('f2', P2) },
      runePools: { ...base.runePools, [P2]: { mana: 2, runes: {} } },
    } as GameState
  }
  const ask = (s: GameState, target: string, chosen: Record<string, string>, echoTimes?: number) =>
    SPEC.makeNextChoice!({
      movedCardOid: 'sp', controller: P1, target, ...(echoTimes !== undefined ? { echoTimes } : {}),
    })(s, chosen)

  test('问侧:第 0 份旧键;第 1 份 `ransomPay:echo:2`', () => {
    const s = board()
    expect(ask(s, 'item:f1', {}, 1)!.key).toBe(SFD_136_PAY_KEY)
    const q1 = ask(s, 'item:f1', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO }, 1)!
    expect(q1.key).toBe(ck(SFD_136_PAY_KEY, 1))
    expect(ck(SFD_136_PAY_KEY, 1)).toBe('ransomPay:echo:2')
    expect(ask(s, 'item:f1', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO, 'ransomPay:echo:2': SFD_136_PAY_NO }, 1)).toBeNull()
  })

  test('★零回响:只问旧键一次', () => {
    const s = board()
    expect(ask(s, 'item:f1', {})!.key).toBe(SFD_136_PAY_KEY)
    expect(ask(s, 'item:f1', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO })).toBeNull()
  })

  test('★★逐份不同:一份付赎金、一份不付 ⇒ 各自生效', () => {
    const s = board()
    const chosen = { [SFD_136_PAY_KEY]: SFD_136_PAY_YES, 'ransomPay:echo:2': SFD_136_PAY_NO }
    const e0 = SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'item:f1', echoIndex: 0 })(s, chosen)
    const e1 = SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'item:f2', echoIndex: 1 })(s, chosen)
    expect(e0, '第 0 份:付 2 法力').toEqual([{ kind: 'spend', player: P2, cost: { mana: 2 } }])
    expect(e1, '第 1 份:不付 ⇒ 无效化').toEqual([{ kind: 'negate', target: 'item:f2' }])
                                            
    const rev = { [SFD_136_PAY_KEY]: SFD_136_PAY_NO, 'ransomPay:echo:2': SFD_136_PAY_YES }
    expect(SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'item:f1', echoIndex: 0 })(s, rev),
      '第 0 份:不付 ⇒ 无效化').toEqual([{ kind: 'negate', target: 'item:f1' }])
    expect(SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'item:f2', echoIndex: 1 })(s, rev),
      '第 1 份:付 2 法力').toEqual([{ kind: 'spend', player: P2, cost: { mana: 2 } }])
  })

  test('零回响回归:旧键生效;名空间键对第 0 份不可见', () => {
    const s = board()
    expect(SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'item:f1' })(s, { [SFD_136_PAY_KEY]: SFD_136_PAY_YES }),
      '★旧键仍生效').toEqual([{ kind: 'spend', player: P2, cost: { mana: 2 } }])
    expect(SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, target: 'item:f1' })(s, { 'ransomPay:echo:2': SFD_136_PAY_YES }),
      '★名空间键对第 0 份不可见 ⇒ 走「否则」那半').toEqual([{ kind: 'negate', target: 'item:f1' }])
  })
})

                                                                                  
                                   
                                                                                  
describe('★1812 #6 UNL-032 龙虎双雄:取牌键逐份', () => {
                                                              
  const board = (): GameState =>
    scene([handCard('UNL-032')], ['OGN-142', 'OGN-049', 'OGN-088', 'OGN-175'], ['unit'])
  const ask = (s: GameState, chosen: Record<string, string>, echoTimes?: number) =>
    UNL_032_SPEC.makeNextChoice!({
      movedCardOid: 'sp', controller: P1, ...(echoTimes !== undefined ? { echoTimes } : {}),
    })(s, chosen)
  const handDefs = (s: GameState): string[] =>
    (s.zones[asZoneId(`hand:${P1}`)]?.contents ?? []).map((id) => s.objects[id]?.defId ?? '')

  test('问侧:第 0 份旧键;第 1 份 `dragonPick:echo:2`', () => {
    const s = board()
    expect(ask(s, {}, 1)!.key).toBe(UNL_032_PICK)
    const q1 = ask(s, { [UNL_032_PICK]: 'd1' }, 1)!
    expect(q1.key).toBe(ck(UNL_032_PICK, 1))
    expect(ck(UNL_032_PICK, 1)).toBe('dragonPick:echo:2')
                                                   
    expect(ask(s, { [UNL_032_PICK]: 'd1', 'dragonPick:echo:2': 'd2' }, 1)).toBeNull()
  })

  test('★零回响:只问旧键一次', () => {
    const s = board()
    expect(ask(s, {})!.key).toBe(UNL_032_PICK)
    expect(ask(s, { [UNL_032_PICK]: 'd1' })).toBeNull()
  })

  test('★★逐份不同:两份各取一张不同的牌', () => {
    const s = board()
    const chosen = { [UNL_032_PICK]: 'd1', 'dragonPick:echo:2': 'd2' }
    const e0 = UNL_032_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, echoIndex: 0 })(s, chosen)
    const after0 = applyEvents(s, e0, {}).state
    expect(handDefs(after0), '第 0 份取 d1(=OGN-049)').toContain('OGN-049')
    const e1 = UNL_032_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, echoIndex: 1 })(s, chosen)
    const after1 = applyEvents(s, e1, {}).state
    expect(handDefs(after1), '第 1 份取 d2(=OGN-088,与第 0 份不同)').toContain('OGN-088')
    expect(handDefs(after1), '★不是 d1').not.toContain('OGN-049')
  })

  test('零回响回归:旧键生效;名空间键对第 0 份不可见(当作没拿)', () => {
    const s = board()
    const e = UNL_032_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, { [UNL_032_PICK]: 'd1' })
    expect(handDefs(applyEvents(s, e, {}).state)).toContain('OGN-049')
    const eNs = UNL_032_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, { 'dragonPick:echo:2': 'd1' })
    expect(handDefs(applyEvents(s, eNs, {}).state), '★不可见 ⇒ 没拿,牌全回收').not.toContain('OGN-049')
  })
})

                                                                                  
                                      
                                                                                  
describe('★1812 #7 SFD-122 预判攻势:取牌键逐份', () => {
                                 
  const board = (): GameState => scene([handCard('SFD-122')], ['bottom', 'mid', 'topB', 'topA'])
  const ask = (s: GameState, chosen: Record<string, string>, echoTimes?: number) =>
    SFD_122_SPEC.makeNextChoice!({
      movedCardOid: 'sp', controller: P1, ...(echoTimes !== undefined ? { echoTimes } : {}),
    })(s, chosen)
  const handDefs = (s: GameState): string[] =>
    (s.zones[asZoneId(`hand:${P1}`)]?.contents ?? []).map((id) => s.objects[id]?.defId ?? '')

  test('问侧:第 0 份旧键;第 1 份 `foresightPick:echo:2`', () => {
    const s = board()
    expect(ask(s, {}, 1)!.key).toBe(SFD_122_PICK)
    const q1 = ask(s, { [SFD_122_PICK]: 'd3' }, 1)!
    expect(q1.key).toBe(ck(SFD_122_PICK, 1))
    expect(ck(SFD_122_PICK, 1)).toBe('foresightPick:echo:2')
    expect(ask(s, { [SFD_122_PICK]: 'd3', 'foresightPick:echo:2': 'd2' }, 1)).toBeNull()
  })

  test('★零回响:只问旧键一次', () => {
    const s = board()
    expect(ask(s, {})!.key).toBe(SFD_122_PICK)
    expect(ask(s, { [SFD_122_PICK]: 'd3' })).toBeNull()
  })

  test('★★逐份不同:两份各抽顶两张里不同的一张', () => {
    const s = board()
    const chosen = { [SFD_122_PICK]: 'd3', 'foresightPick:echo:2': 'd2' }
    const e0 = applyEvents(s, SFD_122_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, echoIndex: 0 })(s, chosen), {}).state
    expect(handDefs(e0), '第 0 份抽 d3(topA)').toContain('topA')
    const e1 = applyEvents(s, SFD_122_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1, echoIndex: 1 })(s, chosen), {}).state
    expect(handDefs(e1), '第 1 份抽 d2(topB)').toContain('topB')
    expect(handDefs(e1), '★不是第 0 份那张').not.toContain('topA')
  })

  test('零回响回归:旧键生效;名空间键对第 0 份不可见(当作没拿)', () => {
    const s = board()
    const e = applyEvents(s, SFD_122_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, { [SFD_122_PICK]: 'd3' }), {}).state
    expect(handDefs(e)).toContain('topA')
    const eNs = applyEvents(s, SFD_122_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, { 'foresightPick:echo:2': 'd3' }), {}).state
    expect(handDefs(eNs), '★不可见 ⇒ 没抽到').not.toContain('topA')
  })
})

                                                                                  
                                                                 
                                                                                  
describe('★1812 端到端:真付回响 ⇒ 两份各按自己的答案生效', () => {
  const DEPS: InteractiveDeps = {
    getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, costModsFor, activatedFor, playSpecFor,
  }

                                                   
  function drive(g: InteractiveGame, answer: (key: string, ids: readonly string[]) => string): void {
    for (let i = 0; i < 40; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const ids = p.request.candidates.map((c) => c.id)
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: answer(p.request.key, ids) })
        continue
      }
      break
    }
  }

  test('★★SFD-129:付回响,两份把不同敌人挪去不同落点', () => {
    let s = scene([handCard('SFD-129'), unit('foeA', P2, BF0), unit('foeB', P2, BF0), unit('helper', P2, BF1), unit('helperBase', P2, `base:${P2}`)])
    s = seedRunes(s, P1, 'purple', 8)
    const g = new InteractiveGame(s, DEPS)
    const act = g.legalActions(P1).find((a) => {
      const x = a as { kind: string; cardOid?: string; target?: string; echoPicks?: readonly number[]; echoTargets?: readonly string[] }
      return x.kind === 'PLAY_CARD' && x.cardOid === 'sp' && x.target === 'foeA'
        && (x.echoPicks?.length ?? 0) === 1 && x.echoTargets?.[0] === 'foeB'
    })
    expect(act, '前提自证:付回响、目标 foeA/foeB 的那条动作列得出').toBeDefined()
    g.apply(act!)
    drive(g, (key) => (key === 'baitDest' ? BF1 : `base:${P2}`))
    expect(zoneOf(g.state, 'foeA'), '第 0 份落点 BF1').toBe(BF1)
    expect(zoneOf(g.state, 'foeB'), '第 1 份落点 P2 基地').toBe(`base:${P2}`)
  })

  test('★★SFD-151:付回响,两份各自选第二目标', () => {
    let s = scene([handCard('SFD-151'), unit('mine', P1, BF0), unit('home', P1, `base:${P1}`), unit('stolen', P1, BF0)])
    s = seedRunes(s, P1, 'yellow', 8)
    const g = new InteractiveGame(s, DEPS)
    const act = g.legalActions(P1).find((a) => {
      const x = a as { kind: string; cardOid?: string; target?: string; echoPicks?: readonly number[]; echoTargets?: readonly string[] }
      return x.kind === 'PLAY_CARD' && x.cardOid === 'sp' && x.target === 'mine'
        && (x.echoPicks?.length ?? 0) === 1 && x.echoTargets?.[0] === 'home'
    })
    expect(act, '前提自证:目标 mine/回响目标 home 那条动作').toBeDefined()
    g.apply(act!)
    drive(g, (key) => (key === 'second' ? 'home' : 'stolen'))
                                                    
    expect(mightOf(g.state, 'mine')).toBe(6)
    expect(mightOf(g.state, 'home')).toBe(7)
    expect(mightOf(g.state, 'stolen')).toBe(6)
  })
})
