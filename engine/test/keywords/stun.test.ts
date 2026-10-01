import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyStun, applyStunInState, isStunned } from '../../src/keywords/stun'
import { hasLethalDamage } from '../../src/loop/cleanup'
import { effectiveMight } from '../../src/state/might'
import { runExpirationStep } from '../../src/loop/turnStructure'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, might: number, over: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: P1, controller: P1, zone: BF0, baseMight: might, damage: 0, counters: {}, status: {}, ...over }
}

describe('眩晕 §423', () => {
  test('§423.1.a.1 已眩晕不能再眩晕', () => {
    const first = applyStun(unit('a', 3))
    expect(first.stunned).toBe(true)
    expect(isStunned(first.obj)).toBe(true)
    const second = applyStun(first.obj)       
    expect(second.stunned).toBe(false)      
    expect(second.obj).toBe(first.obj)      
  })

  test('§423.1.c 眩晕单位仍须受全额战力伤害才致命(致命阈值=全额,不因贡献0而降)', () => {
    const stunned = unit('a', 3, { status: { stunned: true } })
                                       
    expect(effectiveMight(stunned).reference).toBe(3)
    expect(hasLethalDamage(2, effectiveMight(stunned).reference)).toBe(false)           
    expect(hasLethalDamage(3, effectiveMight(stunned).reference)).toBe(true)          
  })

  test('§423.1.a.2 回合末失效步骤 3d 解除眩晕', () => {
    const base = createInitialState([P1, P2])
    const s: GameState = { ...base, objects: { a: unit('a', 3, { status: { stunned: true, ready: true } }) } }
    const after = runExpirationStep(s)
    expect(after.objects['a']!.status.stunned).toBe(false)         
    expect(after.objects['a']!.status.ready).toBe(true)          
  })

  test('applyStunInState 更新盘面', () => {
    const s: GameState = { ...createInitialState([P1, P2]), objects: { a: unit('a', 3) } }
    const { state, stunned } = applyStunInState(s, asObjId('a'))
    expect(stunned).toBe(true)
    expect(state.objects['a']!.status.stunned).toBe(true)
  })
})
