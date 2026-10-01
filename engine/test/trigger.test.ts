import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import type { GameEvent } from '../src/loop/events'
import { checkTrigger, detectTriggers, detectTriggersForBatch, type Trigger } from '../src/dsl/trigger'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(oid: string, zone: string, over: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(oid), defId: 'SRC', owner: P1, controller: P1, zone: asZoneId(zone), baseMight: 3, damage: 0, counters: {}, status: {}, ...over }
}
function withObjs(objs: GameObject[]): GameState {
  const objects: Record<string, GameObject> = {}
  for (const o of objs) objects[o.oid] = o
  return { ...createInitialState([P1, P2]), objects }
}
const dmg = (target: string): GameEvent => ({ kind: 'damage', target: asObjId(target), amount: 1 })
const base = (over: Partial<Trigger> = {}): Trigger => ({
  id: 't', sourceOid: null, controller: P1, event: 'damage', effect: () => [], ...over,
})

describe('§383.2.a.1 附加条件属触发条件', () => {
  test('娑娜式"如我在战场":条件成立才触发,来源离场后产出的链项目仍独立结算', () => {
    const s = withObjs([obj('sona', 'battlefield:shared:0')])
    const t = base({ additionalCondition: (st) => st.objects['sona']?.zone === 'battlefield:shared:0' })
    expect(checkTrigger(t, dmg('x'), s, P1)).toBe(true)
                          
    const sOut = withObjs([obj('sona', 'hand:P1')])
    expect(checkTrigger(t, dmg('x'), sOut, P1)).toBe(false)
                                                                
    const items = detectTriggers(s, dmg('x'), [t], P1)
    expect(items).toHaveLength(1)
    expect(items[0]!.resolve(sOut)).toEqual([])                    
  })
})

describe('§383.2.c 进场触发 / 离场失效', () => {
  test('§383.2.c.1 不朽凤凰式:源在废牌堆(activeZone=discard)→ 触发', () => {
    const s = withObjs([obj('phx', 'discard:P1', { defId: 'PHOENIX' })])
    const t = base({ sourceOid: asObjId('phx'), activeZone: ['discard'] })
    expect(checkTrigger(t, dmg('x'), s, P1)).toBe(true)
  })
  test('§383.2.c.2 维克托式:源不在战场(activeZone=battlefield)→ 不触发', () => {
    const s = withObjs([])                    
    const t = base({ sourceOid: asObjId('viktor'), sourceDefId: 'VIKTOR', activeZone: ['battlefield'] })
    expect(checkTrigger(t, dmg('x'), s, P1)).toBe(false)
  })
})

describe('§383.1.b 仅"(第)N次"型多满足选一', () => {
  const events: GameEvent[] = [dmg('a'), dmg('b')]         
  test('nthType:多满足只触发一次', () => {
    const t = base({ nthType: true })
    expect(detectTriggersForBatch(withObjs([]), events, [t], P1)).toHaveLength(1)
  })
  test('普通触发:逐事件各触发一次(勿泛化选一)', () => {
    const t = base({ nthType: false })
    expect(detectTriggersForBatch(withObjs([]), events, [t], P1)).toHaveLength(2)
  })
})

describe('§383.3.a mayChoose 落到链项目', () => {
                                                                     
                                                                               
  test('mayChoose 传递到 ChainItem', () => {
    const t = base({ mayChoose: true })
    const item = detectTriggers(withObjs([]), dmg('x'), [t], P1)[0]!
    expect(item.mayChoose).toBe(true)
    expect(item.kind).toBe('triggered')
  })
})

describe('by 触发方(薇古丝式"对手打出单位")', () => {
  test('by=opponent:对手引发才触发', () => {
    const t = base({ by: 'opponent' })
    expect(checkTrigger(t, dmg('x'), withObjs([]), P2)).toBe(true)            
    expect(checkTrigger(t, dmg('x'), withObjs([]), P1)).toBe(false)            
  })
})
