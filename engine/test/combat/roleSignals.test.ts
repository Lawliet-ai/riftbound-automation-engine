import { describe, expect, test } from 'vitest'
import { assignBattleRolesWithSignals } from '../../src/combat/battleRoles'
import { createInitialState } from '../../src/state/gameState'
import { asZoneId } from '../../src/state/ids'
import { asObjId, asPlayerId } from '../../src/state/ids'
import {
  emptyLedger, noteRoleGains, notePlayerRole, orderForChain, type RoleSignal,
} from '../../src/combat/roleSignals'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const sig = (id: string, role: RoleSignal['role']): RoleSignal => ({ oid: asObjId(id), role })

describe('§383.4.e 进攻触发的信号产出', () => {
  test('§383.4.e 首次获得进攻方身份 → 产出信号', () => {
    const { signals } = noteRoleGains(emptyLedger(), [sig('u', 'attacking')])
    expect(signals).toHaveLength(1)
    expect(signals[0]!.oid).toBe('u')
  })

  test('§383.4.e.2.a 同一场战斗【只检查一次】:失去后重获不再发信号', () => {
    const first = noteRoleGains(emptyLedger(), [sig('u', 'attacking')])
    expect(first.signals).toHaveLength(1)
                          
    const second = noteRoleGains(first.ledger, [sig('u', 'attacking')])
    expect(second.signals).toHaveLength(0)
  })

  test('§464.2.c.3.a 迟到单位在后续清理步获得身份时【也要】发信号', () => {
                                 
    const start = noteRoleGains(emptyLedger(), [sig('a', 'attacking')])
    const later = noteRoleGains(start.ledger, [sig('late', 'attacking')])
    expect(later.signals.map((s) => s.oid)).toEqual(['late'])              
  })

  test('去重表按【单位】隔离:一个单位发过不影响另一个', () => {
    const a = noteRoleGains(emptyLedger(), [sig('a', 'attacking')])
    const b = noteRoleGains(a.ledger, [sig('a', 'attacking'), sig('b', 'attacking')])
    expect(b.signals.map((s) => s.oid)).toEqual(['b'])
  })

  test('防守方身份同样走这套去重', () => {
    const first = noteRoleGains(emptyLedger(), [sig('d', 'defending')])
    expect(first.signals).toHaveLength(1)
    expect(noteRoleGains(first.ledger, [sig('d', 'defending')]).signals).toHaveLength(0)
  })

  test('§383.4.e 玩家级「当你进攻时」:每场战斗也只发一次', () => {
    const first = notePlayerRole(emptyLedger(), P1)
    expect(first.fired).toBe(true)
    expect(notePlayerRole(first.ledger, P1).fired).toBe(false)
                
    expect(notePlayerRole(first.ledger, P2).fired).toBe(true)
  })

  test('§464.2.e.1 入链顺序:进攻方【先】、防守方【最后】', () => {
    const ordered = orderForChain([sig('d', 'defending'), sig('a', 'attacking')])
    expect(ordered.map((s) => s.oid)).toEqual(['a', 'd'])
  })

  test('§464.2.e.1 排序稳定:同档内保持原有相对顺序', () => {
    const ordered = orderForChain([sig('a1', 'attacking'), sig('a2', 'attacking'), sig('d', 'defending')])
    expect(ordered.map((s) => s.oid)).toEqual(['a1', 'a2', 'd'])
  })

  test('空批次不产出信号,去重表原样', () => {
    const r = noteRoleGains(emptyLedger(), [])
    expect(r.signals).toHaveLength(0)
    expect(r.ledger.units.size).toBe(0)
  })

  test('新战斗用新的去重表(战斗结束即作废)', () => {
    const old = noteRoleGains(emptyLedger(), [sig('u', 'attacking')])
    expect(old.signals).toHaveLength(1)
                                 
    const fresh = noteRoleGains(emptyLedger(), [sig('u', 'attacking')])
    expect(fresh.signals).toHaveLength(1)
  })
})

describe('§464.2.c.3.a 身份校正产出信号(与 §323.2 同一处)', () => {
  test('迟到单位在清理步拿到身份时,产出信号', () => {
    const BF0 = asZoneId('battlefield:shared:0')
    const base = createInitialState([P1, P2], 2)
    const late = {
      oid: asObjId('late'), defId: 'BLK', owner: P1, controller: P1, zone: BF0,
      baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {},
    }
    const r = assignBattleRolesWithSignals({ ...base, objects: { late } }, { battlefield: BF0, attacker: P1 })
    expect(r.gains).toHaveLength(1)
    expect(r.gains[0]!.role).toBe('attacking')
  })

  test('身份已经正确的单位:不重复产信号', () => {
    const BF0 = asZoneId('battlefield:shared:0')
    const base = createInitialState([P1, P2], 2)
    const already = {
      oid: asObjId('a'), defId: 'BLK', owner: P1, controller: P1, zone: BF0,
      baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: { attacking: true as const },
    }
    const r = assignBattleRolesWithSignals({ ...base, objects: { a: already } }, { battlefield: BF0, attacker: P1 })
    expect(r.gains).toHaveLength(0)
  })
})
