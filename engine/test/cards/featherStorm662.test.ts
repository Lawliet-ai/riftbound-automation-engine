import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'               
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { WAR_HAWK_TOKEN } from '../../data/cards/reprint-batch'
import { makeUNL044Spec, UNL_044_PICK, UNL_044_HAWKS } from '../../data/cards/UNL-044'

                                                                   
                                                              
  
           
                                                                     
                                                                    
                                            
                                                       
                                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, activePlayer: P1, phase: 'main' } as GameState
}

type Ev = { kind: string, target?: string, spec?: { defId: string, baseKeywords?: readonly string[] }, zone?: string, owner?: string, ready?: boolean, unit?: string, player?: string }
const CHAIN = ['sp:a', 'sp:b']
const SPEC = makeUNL044Spec({ spellChainItems: (s: GameState) => ((s as unknown as { fakeChain?: string[] }).fakeChain ?? CHAIN) })
                                                                        
                                                                
                                                                            
                                                                      
                                  
const confirmAsk = (s: GameState, chosen: Record<string, string>) =>
  SPEC.makeConfirmChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]
const noChain = (): GameState => ({ ...scene(), fakeChain: [] } as unknown as GameState)

describe('★ 前提:①登记/接线', () => {
  test('★★★★★4费 2pip 两枚各一绿、[反应] 两份、registry 接的是注入版、纯 spec 不登触发区', () => {
    expect(CARD_COSTS['UNL-044']).toEqual({ mana: 4, pips: 2, colors: ['green'] })
    expect(SPEC.cost, '★㊶ 单色 2pip = 两枚各一绿').toEqual({ mana: 4, pips: [['green'], ['green']] })
    expect(cardKind('UNL-044')).toBe('spell')
    expect(cardKeywords('UNL-044')).toEqual(['反应'])
    const reg = playSpecFor('UNL-044')!
    expect(reg.target, '★hawks 档恒可行 ⇒ 恒可打').toBe('none')
    expect(reg.cost).toEqual({ mana: 4, pips: [['green'], ['green']] })
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('UNL-044')
  })
})

describe('★★★★★★★ ②③问链', () => {
  test('★★★★★★②问1 mode 必选二档无 skip;③negate 档问2=链上法术+isTarget;答过 null', () => {
    const s = scene()
    const q1 = confirmAsk(s, {})!
    expect(q1.key).toBe('mode')
    expect(q1.candidates.map((c) => c.id), '★「从下列中选择一个」必选,无 skip 档').toEqual(['negate', 'hawks'])
    const q2 = confirmAsk(s, { mode: 'negate' })!
    expect(q2.key).toBe(UNL_044_PICK)
    expect(q2.candidates.map((c) => c.id)).toEqual(CHAIN)
    expect((q2 as { isTarget?: boolean }).isTarget, '★§355.6 「无效化一个法术」是目标').toBe(true)
    expect(confirmAsk(s, { mode: 'negate', [UNL_044_PICK]: 'sp:a' })).toBeNull()
    expect(confirmAsk(s, { mode: 'hawks' }), '★hawks 档没有第二问').toBeNull()
  })

  test('★★★★★③链上没法术 ⇒ negate 档问不出(㊼ UNL-103 姿势:mode 可选、该档落空)', () => {
    expect(confirmAsk(noChain(), { mode: 'negate' })).toBeNull()
    expect(resolveWith(noChain(), { mode: 'negate' })).toEqual([])
  })
})

describe('★★★★★★★ ④⑤结算', () => {
  test('★★★★★★④negate 档:一条 negate;链项已不在链上 ⇒ 空(§355.8);没答目标 ⇒ 空', () => {
    const s = scene()
    expect(resolveWith(s, { mode: 'negate', [UNL_044_PICK]: 'sp:a' })).toEqual([{ kind: 'negate', target: 'sp:a' }])
    expect(resolveWith(s, { mode: 'negate', [UNL_044_PICK]: 'sp:gone' }), '★结算时那项没了 ⇒ 落空').toEqual([])
    expect(resolveWith(s, { mode: 'negate' })).toEqual([])
    expect(resolveWith(s, {}), '★没答模式 ⇒ 空(防御)').toEqual([])
  })

  test('★★★★★★⑤hawks 档:spawnToken ×4(共用件自带法盾/我的基地/缺省休眠);打出信号由产地派生 ×4(★1258)', () => {
    const s = scene()
    const evs = resolveWith(s, { mode: 'hawks' })
                                                                                                                                         
    expect(evs.map((e) => e.kind)).toEqual(['spawnToken', 'spawnToken', 'spawnToken', 'spawnToken'])
    for (const e of evs.slice(0, UNL_044_HAWKS)) {
      expect(e).toMatchObject({ kind: 'spawnToken', zone: `base:${P1}`, owner: P1 })
      expect(e.spec!.defId).toBe(WAR_HAWK_TOKEN.defId)
      expect(e.spec!.baseKeywords, '★「它们拥有法盾」在共用件里(★661 内联冒充教训)').toContain('法盾')
      expect(e.ready, '★§359.2.c 缺省休眠').toBeUndefined()
    }
                                                                                          
                                                                                                   
    const r = applyEvents(s, evs as never, { getTriggers: () => [] } as never)
    const derived = (((r as unknown as { events?: readonly { kind: string; unit?: string; at?: string }[] }).events) ?? [])
      .filter((e) => e.kind === 'playUnit')
    expect(derived, '★★★四枚战鹰 ⇒ 产地派生四条(★1258 缺陷 160 前是八条)').toHaveLength(UNL_044_HAWKS)
    expect(new Set(derived.map((e) => e.unit)).size, '★四条各指一枚,不是同一个 oid 重复').toBe(UNL_044_HAWKS)
    expect(derived.every((e) => e.at === `base:${P1}`), '★都带落点 at = 我的基地').toBe(true)
  })
})
