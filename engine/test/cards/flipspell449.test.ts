import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, playSpecFor } from '../../data/registry'
import { delayedTriggersOf, delayedTriggerId } from '../../src/effects/delayedTriggers'
import { delayedTriggerTriggers } from '../../data/cards/delayed-triggers'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
import { VEN_035, VEN_035_CARD_EFFECT } from '../../data/cards/diana-reactions'

                                    
                                                                    
                             
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, empower = 0): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0,
    counters: empower > 0 ? { [EMPOWER_COUNTER]: empower } : {}, status: {},
  } as GameObject
}
function scene(objs: GameObject[]): GameState {
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
const run = (s: GameState, evs: readonly GameEvent[]): GameState => applyEvents(s, evs, {}).state
const spec = playSpecFor('VEN-035')!

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('3费1绿pip 反应法术;两条关键词通道都登(教训②)', () => {
    expect(CARD_COSTS['VEN-035']).toEqual({ mana: 3, pips: 1, colors: ['green'] })
    expect(VEN_035.category).toBe('spell')
    expect(spec.keywords).toContain('反应')
    expect(cardKeywords('VEN-035'), 'CARD_KEYWORDS 通道').toEqual(['反应'])
    expect(VEN_035_CARD_EFFECT).toContain('已强化')
  })
})

describe('🔴★★★★目标编码:emp:未强化 / dis:已强化 互斥', () => {
  const board = (): GameState => scene([
    obj('plain', 'BLK', P1, BF0, 0),
    obj('emp1', 'BLK', P2, BF0, 1),
  ])

  test('🔴★★★未强化只进 emp、已强化只进 dis(不分敌我)', () => {
    const ts = spec.legalTargets(board(), P1) as readonly string[]
    expect(ts).toContain('emp:plain')
    expect(ts).toContain('dis:emp1')
    expect(ts).not.toContain('emp:emp1')
    expect(ts).not.toContain('dis:plain')
  })

  test('🔴★★★emp 结算 = empower + 挂 toEmpower:false 待办;dis 反之', () => {
    const evsA = spec.makeResolve({ movedCardOid: 'x', target: 'emp:plain', controller: P1 })(board(), {}, undefined as never) as unknown as readonly Record<string, unknown>[]
    expect(evsA[0]).toMatchObject({ kind: 'empower', target: 'plain' })
    expect((evsA[1] as { add: { kind: string; toEmpower: boolean; target: string } }).add)
      .toMatchObject({ kind: 'empowerFlipAtTurnEnd', toEmpower: false, target: 'plain' })
    const evsB = spec.makeResolve({ movedCardOid: 'x', target: 'dis:emp1', controller: P1 })(board(), {}, undefined as never) as unknown as readonly Record<string, unknown>[]
    expect(evsB[0]).toMatchObject({ kind: 'disempower', target: 'emp1' })
    expect((evsB[1] as { add: { toEmpower: boolean } }).add.toEmpower).toBe(true)
  })
})

describe('🔴★★★★延迟触发:回合结束反转(一次性+离场剪枝)', () => {
  const withPending = (toEmpower: boolean, empower: number): GameState => {
    const s = scene([obj('u', 'BLK', P1, BF0, empower)])
    return run(s, [{ kind: 'delayedTrigger', add: {
      id: delayedTriggerId('empowerFlipAtTurnEnd', 'VEN-035', 'u' as ObjId),
      controller: P1, sourceDefId: 'VEN-035',
      kind: 'empowerFlipAtTurnEnd', target: 'u' as ObjId, toEmpower,
    } } as GameEvent])
  }

  test('🔴★★★挂上后 endOfTurn 触发产生;effect = 摘除+翻转(disempower 档)', () => {
    const s = withPending(false, 1)             
    const trigs = delayedTriggerTriggers(s)
    expect(trigs).toHaveLength(1)
    expect(trigs[0]!.event).toBe('endOfTurn')
    const evs = trigs[0]!.effect!(s, { kind: 'endOfTurn', player: P1 } as GameEvent, {})
    expect(evs[0]).toMatchObject({ kind: 'delayedTrigger', clear: expect.stringContaining('VEN-035') })
    expect(evs[1]).toMatchObject({ kind: 'disempower', target: 'u' })
    const s2 = run(s, evs)
    expect(s2.objects['u']!.counters[EMPOWER_COUNTER], '真解除了').toBeUndefined()
    expect(delayedTriggersOf(s2), '一次性:待办已摘').toHaveLength(0)
  })

  test('🔴★★empower 档:回合末强化回去', () => {
    const s = withPending(true, 0)              
    const evs = delayedTriggerTriggers(s)[0]!.effect!(s, { kind: 'endOfTurn', player: P1 } as GameEvent, {})
    expect(evs[1]).toMatchObject({ kind: 'empower', target: 'u' })
    expect(run(s, evs).objects['u']!.counters[EMPOWER_COUNTER]).toBe(1)
  })

  test('🔴★★离场剪枝:目标没了 ⇒ 不产触发(stillRelevant)', () => {
    const s = withPending(false, 1)
    const gone = { ...s, objects: {} } as GameState
    expect(delayedTriggerTriggers(gone)).toHaveLength(0)
  })
})
