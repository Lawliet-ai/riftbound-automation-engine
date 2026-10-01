import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { playSpecFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { OGN_237, OGN_237_SPEC, OGN_237_CARD_EFFECT, OGN_187_SPEC, OGN_209_SPEC } from '../../data/cards/longtail-8'

                                               
                                                         
                                                   
  
                           
                                                                 
                                                                     
                                                                      
  
                                               
                                                       
                                     
                                                                             

const P1 = asPlayerId('P1')       
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, ctrl: ReturnType<typeof asPlayerId>): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(units: readonly GameObject[], players: readonly ReturnType<typeof asPlayerId>[] = [P1, P2]): GameState {
  const base = createInitialState([...players], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of units) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  OGN_237_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen as never)
const resolve = (s: GameState, chosen: Record<string, string> = {}) =>
  OGN_237_SPEC.makeResolve!({ controller: P1 } as never)(s, chosen as never) as readonly GameEvent[]

describe('🔴🔴🔴★★★★★★591 国王诏令:前提与接线', () => {
  test('★前提:法术 6费 **2黄pip**;卡文一字不差;单印次', () => {
    expect(CARD_COSTS['OGN-237'], '★★★2 枚黄 pip(先猜 1 枚被 registryCoverage 闸咬住)')
      .toEqual({ mana: 6, pips: 2, colors: ['yellow'] })
    expect(OGN_237_SPEC.cost, '★★★法术费用在 PlaySpec.cost 里(★589)').toEqual({ mana: 6, pips: [['yellow'], ['yellow']] })
    expect(cardKind('OGN-237')).toBe('spell')
    expect(OGN_237.category).toBe('spell')
    expect(OGN_237_CARD_EFFECT).toBe('从下一名玩家开始，每名其他玩家选择一个不受你控制且未被此法术选中过的单位，然后摧毁选中的所有单位。')
    expect(playSpecFor('OGN-237'), '★★★进了 PLAY_SPECS').toBeDefined()
  })

  test('🔴🔴★★★★★★【§355.10.e】每人各选不算目标选取 ⇒ target: none(法盾拦不住)', () => {
    expect(OGN_237_SPEC.target).toBe('none')
    expect(OGN_187_SPEC.target, '★同族两张同款').toBe('none')
    expect(OGN_209_SPEC.target).toBe('none')
  })
})

describe('🔴🔴🔴★★★★★★591 谁答:「每名【其他】玩家」= 不含打出者', () => {
  test('🔴🔴🔴★★★★★★【会换答案】两人局只问对手,**不问我**', () => {
                                                   
                                                                       
                                                  
                                                        
    const s = scene([unit('e1', P2), unit('e2', P2), unit('m1', P1)])
    const q = ask(s) as { controller: string; key: string } | null
    expect(q, '★问得出来').not.toBeNull()
    expect(q!.controller, '★★★问的是对手').toBe(P2)
                                        
    expect(ask(s, { [q!.key]: 'e1' }), '★★★「每名【其他】玩家」⇒ 轮不到我').toBeNull()
  })

  test('🔴🔴🔴★★★★★★【三人局·顺序】从**下一名**开始,轮完两名对手就停', () => {
    const s = scene([unit('a', P2), unit('b', P3)], [P1, P2, P3])
    const q1 = ask(s) as { controller: string; key: string }
    expect(q1.controller, '★★★下一名先答').toBe(P2)
    const q2 = ask(s, { [q1.key]: 'a' }) as { controller: string; key: string }
    expect(q2.controller, '★再下一名').toBe(P3)
    expect(ask(s, { [q1.key]: 'a', [q2.key]: 'b' }), '★★★两名对手答完就停,不问打出者').toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★591 选什么:不受【我】控制 + 未被选过', () => {
  test('🔴🔴🔴★★★★★★【承重·「你」是打出者】我的单位【不在】候选里', () => {
                                                            
                                 
    const s = scene([unit('mine', P1), unit('foe', P2)])
    const q = ask(s) as { candidates: readonly { id: string }[] }
    expect(q.candidates.map((c) => c.id), '★★★只有非我方那个').toEqual(['foe'])
  })

  test('🔴🔴🔴★★★★★★【承重·未被选过】P2 选走的那个,P3 就选不到了', () => {
                                          
                                        
    const s = scene([unit('a', P2), unit('b', P3)], [P1, P2, P3])
    const q1 = ask(s) as { key: string }
    const q2 = ask(s, { [q1.key]: 'a' }) as { candidates: readonly { id: string }[] }
    expect(q2.candidates.map((c) => c.id), '★★★a 已被选走 ⇒ 只剩 b').toEqual(['b'])
  })

  test('🔴🔴🔴★★★★★★【必须选·无 skip】卡文没有「可以」(与飓风席卷正相反)', () => {
    const s = scene([unit('foe', P2)])
    const q = ask(s) as { candidates: readonly { id: string }[] }
    expect(q.candidates.map((c) => c.id), '★★★不给"不选"这一档').not.toContain('skip')
                            
    const gale = OGN_187_SPEC.makeNextChoice!({ movedCardOid: 'g', controller: P1 } as never)(s, {} as never) as { candidates: readonly { id: string }[] }
    expect(gale.candidates.map((c) => c.id), '★★★同族对照:那张有 skip').toContain('skip')
  })

  test('🔴🔴★★★★★★【没有可选目标】场上只有我的单位 ⇒ 不问(别卡死)', () => {
    expect(ask(scene([unit('m1', P1), unit('m2', P1)])), '★★★候选为空就跳过这人').toBeNull()
  })

  test('🔴🔴🔴★★★★★★【只认单位】对手的**装备**不是候选(㉔ 类别判据)', () => {
                                                             
    const gear = {
      oid: asObjId('g1'), defId: 'OGN-098', owner: P2, controller: P2, zone: asZoneId(BF0),
      baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
    } as unknown as GameObject
    const s = scene([gear, unit('foe', P2)])
    const q = ask(s) as { candidates: readonly { id: string }[] }
    expect(q.candidates.map((c) => c.id), '★★★卡文写的是「一个【单位】」').toEqual(['foe'])
  })
})

describe('🔴🔴🔴★★★★★★591 结算:摧毁选中的【所有】单位', () => {
  test('🔴🔴🔴★★★★★★【会换答案】三人局两个对手各选一个 ⇒ 发**两条** destroy', () => {
    const s = scene([unit('a', P2), unit('b', P3)], [P1, P2, P3])
    const evs = resolve(s, { 'decree:P2': 'a', 'decree:P3': 'b' }) as readonly { kind: string; target?: string }[]
    expect(evs.map((e) => e.kind), '★★★两条,不是一条').toEqual(['destroy', 'destroy'])
    expect(evs.map((e) => e.target).sort()).toEqual([asObjId('a'), asObjId('b')])
  })

  test('🔴🔴🔴★★★★★★【端到端】applyEvents 之后那两个真没了(③ 看落地后的状态)', () => {
    const s = scene([unit('a', P2), unit('b', P3), unit('mine', P1)], [P1, P2, P3])
    const out = applyEvents(s, resolve(s, { 'decree:P2': 'a', 'decree:P3': 'b' }), {}).state
    const left = (out.zones[asZoneId(BF0)]?.contents ?? []).map((o) => o as string)
    expect(left, '★★★被选中的两个已离场').not.toContain('a')
    expect(left, '★★★我的单位天然免疫、还在').toContain('mine')
  })

  test('🔴🔴★★★★★★【答案失效】选中的那个结算前已离场 ⇒ 那条不发(pickedByEach 已滤)', () => {
    const s = scene([unit('b', P3)], [P1, P2, P3])
    const evs = resolve(s, { 'decree:P2': 'gone', 'decree:P3': 'b' }) as readonly { target?: string }[]
    expect(evs.length, '★★★只剩还在场的那条').toBe(1)
    expect(evs[0]!.target).toBe(asObjId('b'))
  })

  test('🔴★★★★★★没人作答 ⇒ 一条都不发', () => {
    expect(resolve(scene([unit('a', P2)]), {})).toEqual([])
  })
})
