import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_103_SPEC, foeDiscardCards } from '../../data/cards/UNL-103'

                                                              
                                                      
                 
  
           
                                                
                                                                          
                                                                
                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const card = (oid: string, owner: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `C-${oid}`, owner, controller: owner, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

type Ev = { kind: string, player?: string, count?: number, objs?: readonly string[] }
const ask = (s: GameState, chosen: Record<string, string>) =>
  UNL_103_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  UNL_103_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]

                                       
const s3 = (): GameState => scene([
  card('f1', P2, `discard:${P2}`), card('f2', P2, `discard:${P2}`), card('f3', P2, `discard:${P2}`),
  card('mine', P1, `discard:${P1}`),
])

describe('★ 前提:登记/候选口', () => {
  test('★★★★★2费 0pip 橙、[反应]、进 PLAY_SPECS、不进触发区;「对手的废牌堆」不含我的', () => {
    expect(CARD_COSTS['UNL-103']).toEqual({ mana: 2, pips: 0, colors: ['orange'] })
    expect(UNL_103_SPEC.cost).toEqual({ mana: 2 })
    expect(cardKind('UNL-103')).toBe('spell')
    expect(cardKeywords('UNL-103')).toEqual(['反应'])
    expect(playSpecFor('UNL-103')!.target).toBe('none')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('UNL-103')
    expect(foeDiscardCards(s3(), P1).sort(), '★我的废牌堆那张不在候选').toEqual(['f1', 'f2', 'f3'])
  })
})

describe('★★★★★★★ ①②问链', () => {
  test('★★★★★★①问1=模式二档**无 skip**;②recycle 档逐张问带停止档;draw 档问完即止', () => {
    const s = s3()
    const q1 = ask(s, {})!
    expect(q1.key).toBe('mode')
    expect(q1.candidates.map((c) => c.id)).toEqual(['recycle', 'draw'])
    expect(ask(s, { mode: 'draw' }), '★draw 档没有第二问').toBeNull()
    const q2 = ask(s, { mode: 'recycle' })!
    expect(q2.key).toBe('pick1')
    expect(q2.candidates.map((c) => c.id), '★候选=对手废牌堆+停止档').toEqual(['f1', 'f2', 'f3', 'stop'])
  })

  test('★★★★★★②已选的不再出现;第三张选完不问第四张;答 stop 后不再问', () => {
    const s = s3()
    const q3 = ask(s, { mode: 'recycle', pick1: 'f1', pick2: 'f2' })!
    expect(q3.key).toBe('pick3')
    expect(q3.candidates.map((c) => c.id), '★f1/f2 已拿走').toEqual(['f3', 'stop'])
    expect(ask(s, { mode: 'recycle', pick1: 'f1', pick2: 'f2', pick3: 'f3' }), '★「最多三张」问满即止').toBeNull()
    expect(ask(s, { mode: 'recycle', pick1: 'f1', pick2: 'stop' }), '★停了就不再问').toBeNull()
  })
})

describe('★★★★★★★ ③④⑤结算', () => {
  test('★★★★★★③选两张 ⇒ 一条 recycle{player:P2}(按**拥有者**);⑤不发 draw', () => {
    const evs = resolveWith(s3(), { mode: 'recycle', pick1: 'f1', pick2: 'f2', pick3: 'stop' })
    expect(evs).toEqual([{ kind: 'recycle', player: P2, objs: ['f1', 'f2'] }])
  })

  test('★★★★★③夺控牌按 owner 回家:controller P2 但 **owner P1** 的牌回 P1 牌堆', () => {
                                                           
    const stolen = { ...card('sf', P1, `discard:${P2}`), controller: P2 } as GameObject
    const s = scene([stolen, card('f1', P2, `discard:${P2}`)])
    const evs = resolveWith(s, { mode: 'recycle', pick1: 'sf', pick2: 'f1', pick3: 'stop' })
    expect(evs).toHaveLength(2)
    expect(evs.find((e) => e.player === P1)!.objs, '★owner P1 的回 P1').toEqual(['sf'])
    expect(evs.find((e) => e.player === P2)!.objs).toEqual(['f1'])
  })

  test('★★★★★④draw 档只抽一张;什么都没选(全 stop)⇒ 空;没答模式 ⇒ 空', () => {
    expect(resolveWith(s3(), { mode: 'draw' })).toEqual([{ kind: 'draw', player: P1, count: 1 }])
    expect(resolveWith(s3(), { mode: 'recycle', pick1: 'stop' }), '★选 0 张合法(「最多」)').toEqual([])
    expect(resolveWith(s3(), {})).toEqual([])
  })
})
