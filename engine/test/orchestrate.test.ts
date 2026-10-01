import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import type { PlayUnitEvent } from '../src/loop/events'
import type { FeprDecision } from '../src/loop/chainFepr'
import { emitAndResolve, emitAndStep, stepAfterDecision } from '../src/loop/orchestrate'
import { activeTriggers } from '../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const PASS: FeprDecision = { kind: 'pass' }

function unit(id: string, ctrl: typeof P1, defId: string, keywords: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0), baseMight: 3, baseKeywords: keywords, damage: 0, counters: {}, status: {} }
}

                                                   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const vegas = unit('vegas', P2, 'UNL-150', ['法盾'])
  const p1u = unit('p1u', P1, 'BLK')
  const z = base.zones[BF0]!
  return {
    ...base,
    activePlayer: P1,
    objects: { vegas, p1u },
    zones: { ...base.zones, [BF0]: { ...z, contents: [asObjId('vegas'), asObjId('p1u')] } },
  }
}

const PLAY_P1U: PlayUnitEvent = { kind: 'playUnit', unit: asObjId('p1u'), player: P1 }

describe('编排层:事件→触发→链→反应窗口', () => {
  test('薇古丝在场:对手(P1)打出单位 → 触发入链 → 结算后该单位被眩晕+本回合不可移动', () => {
    const after = emitAndResolve(scene(), [PLAY_P1U], activeTriggers, P1, () => PASS)
    const p1u = after.objects['p1u']!
    expect(p1u.status.stunned).toBe(true)           
    expect(after.chain).toHaveLength(0)          
    expect(p1u.derived?.restrictions ?? []).toContain('moveBy:P1')                                   
  })

  test('薇古丝不在场:打出单位无触发,链保持空', () => {
    const s = scene()
    const noVegas: GameState = { ...s, objects: { p1u: s.objects['p1u']! }, zones: { ...s.zones, [BF0]: { ...s.zones[BF0]!, contents: [asObjId('p1u')] } } }
    const after = emitAndResolve(noVegas, [PLAY_P1U], activeTriggers, P1, () => PASS)
    expect(after.objects['p1u']!.status.stunned).toBeUndefined()
    expect(after.chain).toHaveLength(0)
  })

  test('可暂停步进:反应窗口先给薇古丝控制者(P2),再给P1,各让过后结算', () => {
    const s1 = emitAndStep(scene(), [PLAY_P1U], activeTriggers, P1)
    expect(s1.kind).toBe('decision')
    if (s1.kind !== 'decision') throw new Error('应停在反应窗口')
    expect(s1.player).toBe(P2)                         
    expect(s1.state.objects['p1u']!.status.stunned).toBeUndefined()           

    const s2 = stepAfterDecision(s1, PASS)
    if (s2.kind !== 'decision') throw new Error('P2让过后应转P1窗口')
    expect(s2.player).toBe(P1)          

    const s3 = stepAfterDecision(s2, PASS)             
    expect(s3.kind).toBe('done')
    if (s3.kind !== 'done') throw new Error('应结算完毕')
    expect(s3.state.objects['p1u']!.status.stunned).toBe(true)
  })
})
