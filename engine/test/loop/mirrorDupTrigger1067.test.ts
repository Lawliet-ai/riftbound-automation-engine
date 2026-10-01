                                                                                                                                  
                                                                                                                  
import { describe, expect, it } from 'vitest'
import { mirrorScoringTriggers } from '../../src/effects/scoringMirror'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'

describe('★1067 镜像触发不重复', () => {
  it('第二次镜像时 triggers 已含同 id 的 mirror 项 ⇒ 不再造', () => {
    const unit = 'o1'
    const state = { objects: { o1: { oid: 'o1', defId: 'SFD-113', controller: 'P1', zone: 'battlefield:shared:1', baseTypes: ['unit'], status: {}, counters: {} } }, zones: {} } as unknown as GameState
    const base: Trigger = { id: 'trig:SFD-113:conquer:o1', sourceOid: unit, sourceDefId: 'SFD-113', controller: 'P1', event: 'conquer', effect: () => [] } as unknown as Trigger
    const first = mirrorScoringTriggers(state, [base], [unit as never])
    expect(first.length).toBe(1)
    expect(first[0]!.id).toBe('mirror:hold:trig:SFD-113:conquer:o1')
    const second = mirrorScoringTriggers(state, [base, ...first], [unit as never], 'conquer')
    expect(second.length, '已有同 id 的镜像项就不再造').toBe(0)
  })
})
