import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { OGN_256_SPEC, OGN_256_ZONE, OGN_256_PICKS, OGN_256_STOP } from '../../data/cards/OGN-256'

                                                                   
                                                      
  
           
                                                   
                                                                     
                                                                 
                    
                                                                
                                                         
                                                              
                                                                                          
                                                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string, might: number): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

type Ev = { kind: string, target?: string, source?: string, sourcePlayer?: string }
                                  
const askConfirm = (s: GameState, chosen: Record<string, string> = {}) =>
  OGN_256_SPEC.makeConfirmChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
                                    
const askSubset = (s: GameState, chosen: Record<string, string> = {}) =>
  OGN_256_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  OGN_256_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:①登记', () => {
  test('★★★★★3费 0pip 绿/蓝、[待命][迅捷] 两份、target none、不登触发区', () => {
    expect(CARD_COSTS['OGN-256']).toEqual({ mana: 3, pips: 0, colors: ['green', 'blue'] })
    expect(cardKind('OGN-256')).toBe('spell')
    expect(cardKeywords('OGN-256'), '★两个引擎词都登').toEqual(['待命', '迅捷'])
    expect(playSpecFor('OGN-256')!.target).toBe('none')
    expect(playSpecFor('OGN-256')!.cost).toEqual({ mana: 3 })
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('OGN-256')
  })
})

describe('★★★★★★★ ②确认期问链:预算闸', () => {
  test('★★★★★★q1 战场 zone;q2 候选=该战场预算内(㉙ 4[S] 在、**5[S] 不在**)+停止档;别的战场不在;敌我都在', () => {
    const s = scene([obj('a1', P1, BF0, 1), obj('b4', P2, BF0, 4), obj('c5', P2, BF0, 5), obj('far', P2, BF1, 1)])
    const q1 = askConfirm(s)!
    expect(q1.key).toBe(OGN_256_ZONE)
    expect(q1.candidates.every((c) => c.id.startsWith('battlefield:'))).toBe(true)
    const q2 = askConfirm(s, { [OGN_256_ZONE]: BF0 })!
    expect(q2.key).toBe(OGN_256_PICKS[0])
    expect(q2.candidates.map((c) => c.id), '★4[S] 可选、5[S] 超预算不可选、别的战场 far 不在;敌我都在;停止档在').toEqual(['a1', 'b4', OGN_256_STOP])
  })

  test('★★★★★★选 4[S] 后预算 0 ⇒ 不再问;选 1[S] 后剩 3 ⇒ 4[S] 出局;停了不再问', () => {
    const s = scene([obj('a1', P1, BF0, 1), obj('b4', P2, BF0, 4), obj('d3', P2, BF0, 3)])
    expect(askConfirm(s, { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: 'b4' }), '★预算用光只可能剩停止 ⇒ 没候选不问').toBeNull()
    const q = askConfirm(s, { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: 'a1' })!
    expect(q.candidates.map((c) => c.id), '★剩 3 预算:4[S] 出局、3[S] 还在、已选 a1 不重复').toEqual(['d3', OGN_256_STOP])
    expect(askConfirm(s, { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: OGN_256_STOP })).toBeNull()
  })
})

describe('★★★★★★★ ③结算', () => {
  test('★★★★★★选中各一条 destroy 带两归因;停止档不发;没选战场 ⇒ 空;离场那名不算组破(零 destroy)', () => {
    const s = scene([obj('a1', P1, BF0, 1), obj('d3', P2, BF0, 3)])
    const evs = resolveWith(s, { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: 'a1', [OGN_256_PICKS[1]]: 'd3', [OGN_256_PICKS[2]]: OGN_256_STOP })
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'destroy', target: 'a1', source: 'sp', sourcePlayer: P1 })
    expect(evs[1]!.target).toBe('d3')
    const gone = resolveWith(s, { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: 'leftAlready' })
                                                                       
    expect(gone, '★离场那名不算组破 ⇒ 零事件').toEqual([])
    expect(resolveWith(s, {})).toEqual([])
    expect(resolveWith(s, { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: OGN_256_STOP }), '★「任意数量」选 0 合法 ⇒ 零 destroy').toEqual([])
  })

  test('★1804 结算期子集问:整组不再整体满足(战力被抬)⇒ makeNextChoice 问 §355.11.b 子集;组没破 ⇒ 一问不出', () => {
    const s = scene([obj('a1', P1, BF0, 1), obj('d3', P2, BF0, 3)])
    const chosen = { [OGN_256_ZONE]: BF0, [OGN_256_PICKS[0]]: 'a1', [OGN_256_PICKS[1]]: 'd3', [OGN_256_PICKS[2]]: OGN_256_STOP }
    expect(askSubset(s, chosen), '★组没破(1+3≤4、同处)⇒ 一问不出').toBeNull()
                                       
    const pumped = { ...s, objects: { ...s.objects, a1: { ...s.objects['a1']!, baseMight: 2 } } } as GameState
    const q = askSubset(pumped, chosen)!
    expect(q.key.startsWith('§355.11.b:fox'), `★子集键带 §355.11.b: 前缀(实际 ${q.key})`).toBe(true)
    expect(q.candidates.map((c) => c.id).filter((x) => x !== '__done__')).toEqual(['a1', 'd3'])
  })
})
