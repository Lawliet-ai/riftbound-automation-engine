import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { replacementShieldsFor } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { turnShieldsOf } from '../../src/effects/turnShields'
import { affectedController } from '../../src/effects/replacement'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'

                                          
  
                                                                       
                                            
                                        
                                                  
                                                     
  
                                     
                                      
                                    
                                      
                                        
                                
  
                                                                       
                                                
                                                        
  
                                                    
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
                              
const ABSORB_POOL = 7
const RAW_DAMAGE = 4

function unit(oid: string, ctrl = P1): GameObject {
  return {
    oid: asObjId(oid), defId: `U-${oid}`, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 99, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}
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
const dmgOf = (s: GameState, oid: string): number => s.objects[asObjId(oid)]?.damage ?? 0
const absorbOf = (s: GameState, oid: string): number | undefined => turnShieldsOf(s, asObjId(oid)).absorb

                                              
const marks = (oid: string): GameEvent[] => [
  { kind: 'markTurnShield', target: asObjId(oid), mark: { absorb: ABSORB_POOL } } as GameEvent,
  { kind: 'markTurnShield', target: asObjId(oid), mark: { doubleDamage: true } } as GameEvent,
]
const hit = (oid: string): GameEvent =>
  ({ kind: 'damage', target: asObjId(oid), amount: RAW_DAMAGE } as GameEvent)

                                        
const preferBy = (needle: string) =>
  (shields: readonly ReplacementShield[]): readonly ReplacementShield[] =>
    [...shields].sort((a, b) =>
      Number(String(b.id ?? '').includes(needle)) - Number(String(a.id ?? '').includes(needle)))

const fire = (order?: ReturnType<typeof preferBy>): GameState => {
  const s0 = applyEvents(scene([unit('me')]), marks('me'), { replacementShields: replacementShieldsFor }).state
  return applyEvents(s0, [hit('me')], {
    replacementShields: replacementShieldsFor,
    ...(order ? { replacementOrder: order } : {}),
  }).state
}

describe('🔴🔴🔴★★★★★★554【C2】多替换的执行顺序由受影响者的控制者定', () => {
  test('★前提:两条替换真的都挂上了(不然下面两支根本不是同一道题)', () => {
    const s0 = applyEvents(scene([unit('me')]), marks('me'), { replacementShields: replacementShieldsFor }).state
    expect(absorbOf(s0, 'me'), '★抵挡池 7').toBe(ABSORB_POOL)
    expect(turnShieldsOf(s0, asObjId('me')).doubleDamage, '★翻倍也在').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【FAQ 原例·先气合盾】伤 0,池子还剩 3', () => {
    const s = fire(preferBy('absorb'))
    expect(dmgOf(s, 'me'), '★★★4 点全被抵挡 ⇒ 一点伤都没吃').toBe(0)
    expect(absorbOf(s, 'me'), '★★★池子只扣掉 4,还剩 3').toBe(ABSORB_POOL - RAW_DAMAGE)
  })

  test('🔴🔴🔴★★★★★★【FAQ 原例·先莲花陷阱】伤 1,池子清零', () => {
    const s = fire(preferBy('double'))
    expect(dmgOf(s, 'me'), '★★★4 翻倍成 8、抵挡吃满 7 ⇒ 剩 1 点打进来').toBe(1)
    expect(absorbOf(s, 'me'), '★★★池子被吃满 ⇒ 清零').toBeUndefined()
  })

  test('🔴🔴★★★★★★两支【必须给出不同答案】—— 否则这一轮什么都没验到', () => {
                                         
    const a = fire(preferBy('absorb'))
    const b = fire(preferBy('double'))
    expect([dmgOf(a, 'me'), absorbOf(a, 'me')]).not.toEqual([dmgOf(b, 'me'), absorbOf(b, 'me')])
  })

  test('🔴★★★★★不注入 ⇒ 回落注册序,且**确定性**(同样输入两次同样结果)', () => {
    const x = fire()
    const y = fire()
    expect([dmgOf(x, 'me'), absorbOf(x, 'me')], '★兜底必须可复现,不能看哈希序')
      .toEqual([dmgOf(y, 'me'), absorbOf(y, 'me')])
  })

  test('🔴🔴★★★★★★选择者 = 【被打那个单位的控制者】,不是打人的那方', () => {
                                                  
    const seen: string[] = []
    const s0 = applyEvents(scene([unit('foe', P2)]), marks('foe'), { replacementShields: replacementShieldsFor }).state
    applyEvents(s0, [hit('foe')], {
      replacementShields: replacementShieldsFor,
      replacementOrder: (shields, ev, st) => { seen.push(String(affectedController(ev, st))); return shields },
    })
    expect(seen.length, '★选序钩子真的被调到了').toBeGreaterThan(0)
    expect(new Set(seen), '★★★问的是 P2(被打那个的控制者)').toEqual(new Set([String(P2)]))
  })
})
