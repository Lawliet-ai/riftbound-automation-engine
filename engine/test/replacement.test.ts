import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import type { DamageEvent, GainPointEvent, GameEvent } from '../src/loop/events'
import {
  interceptEvent,
  type ReplacementRegistry,
  type ReplacementShield,
} from '../src/effects/replacementRegistry'
import {
  affectedController,
  doubleDamageShield,
  interceptEventBatch,
  preventDamageShield,
  skipScoringShield,
} from '../src/effects/replacement'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const reg = (shields: ReplacementShield[]): ReplacementRegistry => ({ shields })
const orderBy = (ids: string[]) => (m: readonly ReplacementShield[]) =>
  [...m].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))

function unitState(id: string, controller = P1): GameState {
  const o: GameObject = {
    oid: asObjId(id),
    defId: 'U',
    owner: controller,
    controller,
    zone: asZoneId('battlefield:shared:0'),
    baseMight: 2,
    damage: 0,
    counters: {},
    status: {},
  }
  return { ...createInitialState([P1, P2]), objects: { [id]: o } }
}

describe('Skip 得分否定(§443,DK-20)', () => {
  test('得分事件被替换为无(null)', () => {
    const s = createInitialState([P1, P2])
    const ev: GainPointEvent = { kind: 'gainPoint', player: P1, amount: 1 }
    const shield = skipScoringShield('skip', P2, (e) => e.kind === 'gainPoint' && e.player === P1)
    expect(interceptEvent(ev, s, reg([shield]))).toBeNull()
  })
})

describe('§372 多重替换选序:伤害翻倍+抵挡值(§465.2.c.5 的 2/4)', () => {
  const s = unitState('a')
  const dmg: DamageEvent = { kind: 'damage', target: asObjId('a'), amount: 3 }
  const block = preventDamageShield('block', P1, 2)        
  const dbl = doubleDamageShield('dbl', P1)      

  test('先抵挡后翻倍 → (3-2)*2 = 2', () => {
    const out = interceptEvent(dmg, s, reg([block, dbl]), { order: orderBy(['block', 'dbl']) })
    expect(out).not.toBeNull()
    expect((out as DamageEvent).amount).toBe(2)
  })
  test('先翻倍后抵挡 → (3*2)-2 = 4', () => {
    const out = interceptEvent(dmg, s, reg([block, dbl]), { order: orderBy(['dbl', 'block']) })
    expect((out as DamageEvent).amount).toBe(4)
  })
})

describe('§370.2 oncePerEvent:同一替换对事件只生效一次(防无限)', () => {
  test('恒等替换(总匹配)只应用一次即返回,不死循环', () => {
    const s = unitState('a')
    const identity: ReplacementShield = {
      id: 'id',
      source: null,
      controller: P1,
      intercepts: 'damage',
      predicate: () => true,
      rewrite: (ev) => ev, // 恒等,永远匹配——无 oncePerEvent 会死循环
    }
    const dmg: DamageEvent = { kind: 'damage', target: asObjId('a'), amount: 1 }
    expect(() => interceptEvent(dmg, s, reg([identity]))).not.toThrow()
    expect((interceptEvent(dmg, s, reg([identity])) as DamageEvent).amount).toBe(1)
  })
})

describe('§431.3.b 豁免事件不可被替换', () => {
  test('exempt 得分事件即使命中 Skip 也原样返回', () => {
    const s = createInitialState([P1, P2])
    const ev: GainPointEvent = { kind: 'gainPoint', player: P1, amount: 1, exempt: true }
    const shield = skipScoringShield('skip', P2, () => true)
    expect(interceptEvent(ev, s, reg([shield]))).toBe(ev)      
  })
})

describe('§373 同时事件批处理(shield 顺序决定结果)', () => {
  test('翻倍先/抵挡先 对整批的结果不同(§373.2.a 连续生效)', () => {
    const s = createInitialState([P1, P2])
    const batch: GameEvent[] = [
      { kind: 'damage', target: asObjId('x'), amount: 2 },
      { kind: 'damage', target: asObjId('y'), amount: 2 },
    ]
    const dbl = doubleDamageShield('dbl', P1)
    const block = preventDamageShield('block', P1, 1)
                   
    const r1 = interceptEventBatch(batch, s, [dbl, block]) as DamageEvent[]
    expect(r1.map((e) => e.amount)).toEqual([3, 3])
                   
    const r2 = interceptEventBatch(batch, s, [block, dbl]) as DamageEvent[]
    expect(r2.map((e) => e.amount)).toEqual([2, 2])
  })
})

describe('§372/§372.2 受影响物控制者', () => {
  test('伤害事件 → 目标单位的控制者', () => {
    const s = unitState('a', P2)
    expect(affectedController({ kind: 'damage', target: asObjId('a'), amount: 1 }, s)).toBe(P2)
  })
  test('得分事件 → 该玩家(§372.1)', () => {
    const s = createInitialState([P1, P2])
    expect(affectedController({ kind: 'gainPoint', player: P1, amount: 1 }, s)).toBe(P1)
  })
})

                                                         
                                               
  
                                                                
                                                      
                                                        
                                                 
                              
describe('★943 §370.2 替换×替换:各生效一次,链式重扫', () => {
  const st = unitState('a')
  const dmg = (n: number): DamageEvent => ({ kind: 'damage', target: asObjId('a'), amount: n })

  test('两个同型替换(都翻倍)各生效一次 ⇒ 3 → 12,不是无限翻', () => {
    const out = interceptEvent(dmg(3), st, reg([doubleDamageShield('d1', P1), doubleDamageShield('d2', P1)]))
    expect((out as DamageEvent).amount).toBe(12)
  })

  test('自我递归:改写后的事件仍命中自己的 predicate,仍只生效一次(§370.2)', () => {
                                                                   
    const self = doubleDamageShield('self', P1, (e) => e.kind === 'damage' && e.amount > 0)
    expect((interceptEvent(dmg(3), st, reg([self])) as DamageEvent).amount).toBe(6)
  })

  test('链式:后一个替换只在前一个改写【之后】才命中 ⇒ 必须重扫', () => {
    const a = doubleDamageShield('A', P1, (e) => e.kind === 'damage' && e.amount === 3)        
    const b = preventDamageShield('B', P1, 5, (e) => e.kind === 'damage' && e.amount === 6)        
                                                        
    const out = interceptEvent(dmg(3), st, reg([b, a]))
    expect((out as DamageEvent).amount).toBe(1)                 
  })
})

describe('★943 迭代判据:护盾多不等于循环', () => {
  const st = unitState('a')
  const dmg = (n: number): DamageEvent => ({ kind: 'damage', target: asObjId('a'), amount: n })

  test('120 个合法护盾各生效一次:正常算完,不抛', () => {
    const many = Array.from({ length: 120 }, (_, i) => doubleDamageShield(`m${i}`, P1))
    const out = interceptEvent(dmg(1), st, reg(many))
    expect(out).not.toBeNull()
    expect((out as DamageEvent).amount).toBe(2 ** 120)             
  })

  test('§372 选序钩子返回集外之物 ⇒ 立刻抛,且消息指名是选序钩子', () => {
    const d1 = doubleDamageShield('d1', P1)
    const d2 = doubleDamageShield('d2', P1)
                                           
    const badOrder = () => [d1]
    expect(() => interceptEvent(dmg(1), st, reg([d1, d2]), { order: badOrder })).toThrow(/选序钩子/)
  })

  test('钩子返回空数组仍是"不应用任何替换"(既有口径,没被这轮改掉)', () => {
    const d1 = doubleDamageShield('d1', P1)
    const out = interceptEvent(dmg(3), st, reg([d1]), { order: () => [] })
    expect((out as DamageEvent).amount).toBe(3)
  })
})

                                       
                                                           
                                                  
                                               
                                     
describe('★948 §373 批处理:与单事件路径的口径对齐', () => {
  const st = unitState('a')
  const dmg = (n: number): DamageEvent => ({ kind: 'damage', target: asObjId('a'), amount: n })

  test('§371.2 可选替换被拒绝时,batch 与单事件路径给出【同一个】答案', () => {
    const opt: ReplacementShield = { ...doubleDamageShield('opt', P1), optional: true }
    const single = interceptEvent(dmg(3), st, reg([opt]), { chooseApply: () => false })
    const batch = interceptEventBatch([dmg(3)], st, [opt], { chooseApply: () => false }) as (DamageEvent | null)[]
                                                     
    expect((single as DamageEvent).amount).toBe(3)
    expect(batch[0]!.amount).toBe(3)
  })

  test('实际生效时会回调 onApply,调用方才记得上账(抵挡"用掉一层"这类)', () => {
    const fired: string[] = []
    const dbl = doubleDamageShield('dbl', P1)
    interceptEventBatch([dmg(1), dmg(2)], st, [dbl], { onApply: (sh) => fired.push(sh.id) })
    expect(fired).toEqual(['dbl', 'dbl'])                          
  })

  test('optional 但调用方没给裁决 ⇒ 强制生效(与单事件路径同款缺省)', () => {
    const opt: ReplacementShield = { ...doubleDamageShield('opt', P1), optional: true }
    const batch = interceptEventBatch([dmg(3)], st, [opt]) as (DamageEvent | null)[]
    expect(batch[0]!.amount).toBe(6)
  })

  test('豁免事件(§431.3.b)任何替换都不生效,也不记账', () => {
    const fired: string[] = []
    const ex = { ...dmg(3), exempt: true } as DamageEvent
    const batch = interceptEventBatch([ex], st, [doubleDamageShield('dbl', P1)], { onApply: (sh) => fired.push(sh.id) }) as (DamageEvent | null)[]
    expect(batch[0]!.amount).toBe(3)
    expect(fired).toEqual([])
  })

  test('⚠️【真缺口·故意钉成现状】改写后不重扫:后命中的护盾拿不到前面改出来的形态', () => {
                                               
                                                 
    const a = doubleDamageShield('A', P1, (e) => e.kind === 'damage' && e.amount === 3)
    const b = preventDamageShield('B', P1, 5, (e) => e.kind === 'damage' && e.amount === 6)
    const batch = interceptEventBatch([dmg(3)], st, [b, a]) as (DamageEvent | null)[]
    const single = interceptEvent(dmg(3), st, reg([b, a]))
    expect(batch[0]!.amount).toBe(6)                          
    expect((single as DamageEvent).amount).toBe(1)                    
    // ⚠️ 这条**不是**在主张 6 是对的。§370.2「对一个事件或替换该事件的…只会生效一次」⇒
    //   已生效的不该再来,但**没生效过的**按字面仍有资格;§373.2.a.1 也明说这类替换存在。
    //   ⇒ 缺口留档、接线前必须先补;这条用例是那时候的判别器(补好后它会红,提醒改期望值)。
  })
})

describe('★943 §371.2 可选替换的现行口径(留档,非缺陷)', () => {
  const st = unitState('a')
  const dmg = (n: number): DamageEvent => ({ kind: 'damage', target: asObjId('a'), amount: n })

  test('optional 但调用方没给 chooseApply ⇒ 强制生效(引擎缺省,UNL-086 靠"纯收益"吃这条)', () => {
    const opt: ReplacementShield = { ...doubleDamageShield('opt', P1), optional: true }
    expect((interceptEvent(dmg(3), st, reg([opt])) as DamageEvent).amount).toBe(6)
  })

  test('选择不生效后,同一事件不会被反复追问(§370.2 机会已用)', () => {
    let asked = 0
    const opt: ReplacementShield = { ...doubleDamageShield('opt', P1), optional: true }
    const out = interceptEvent(dmg(3), st, reg([opt]), { chooseApply: () => { asked++; return false } })
    expect(asked).toBe(1)
    expect((out as DamageEvent).amount).toBe(3)
  })
})
