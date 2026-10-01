import { describe, expect, test } from 'vitest'
import { noteRoleGains, notePlayerRole, emptyLedger, type RoleSignal } from '../../src/combat/roleSignals'
import { asObjId, asPlayerId } from '../../src/state/ids'

                                       
  
                                       
                                                       
                                          
                                              
                                            
                                                 
  
                                            
                                           
                           

const A = asObjId('a1')
const B = asObjId('b2')
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const gain = (oid: typeof A, role: 'attacking' | 'defending' = 'attacking'): RoleSignal => ({ oid, role })

describe('★937 §383.4.e.2.a 单位级去重表', () => {
  test('首次获得身份 ⇒ 发信号,并记进表', () => {
    const r = noteRoleGains(emptyLedger(), [gain(A)])
    expect(r.signals).toHaveLength(1)
    expect(r.signals[0]?.oid).toBe(A)
    expect(r.ledger.units.has(String(A))).toBe(true)
  })

  test('★★同一单位再次获得身份 ⇒ 不再发信号(这就是"每场只检查一次")', () => {
    const first = noteRoleGains(emptyLedger(), [gain(A)])
    const second = noteRoleGains(first.ledger, [gain(A)])
    expect(second.signals, '中途失去又重获,不该再触发一次').toHaveLength(0)
  })

  test('换一个单位仍然要发 —— 去重是按单位记的,不是"整场只发一次"', () => {
    const first = noteRoleGains(emptyLedger(), [gain(A)])
    const second = noteRoleGains(first.ledger, [gain(B)])
    expect(second.signals).toHaveLength(1)
    expect(second.signals[0]?.oid).toBe(B)
  })

  test('同一批里重复出现同一单位,也只发一次', () => {
    const r = noteRoleGains(emptyLedger(), [gain(A), gain(A), gain(B)])
    expect(r.signals.map((s) => String(s.oid)).sort()).toEqual([String(A), String(B)].sort())
  })

  test('身份换了一边(进攻→防守)仍然不再发 —— 表按 oid 记,不按 role', () => {
                                                  
    const first = noteRoleGains(emptyLedger(), [gain(A, 'attacking')])
    const second = noteRoleGains(first.ledger, [gain(A, 'defending')])
    expect(second.signals, '夺控导致身份翻面也不该重发').toHaveLength(0)
  })

  test('原表不被改写(纯函数;调用方靠返回的新表往下传)', () => {
    const base = emptyLedger()
    noteRoleGains(base, [gain(A)])
    expect(base.units.size, '入参必须原样不动').toBe(0)
  })
})

describe('★937 玩家级去重表(§383.4.e 主语含"或玩家")', () => {
  test('同一玩家每场只发一次,另一玩家照发', () => {
    const first = notePlayerRole(emptyLedger(), P1)
    expect(first.fired, '首次要发').toBe(true)
    const again = notePlayerRole(first.ledger, P1)
    expect(again.fired, '同一玩家第二次不发').toBe(false)
    const other = notePlayerRole(again.ledger, P2)
    expect(other.fired, '另一玩家仍要发').toBe(true)
  })

  test('单位表与玩家表互不干扰', () => {
    const u = noteRoleGains(emptyLedger(), [gain(A)])
    const p = notePlayerRole(u.ledger, P1)
    expect(p.fired, '记过单位不该把玩家也堵上').toBe(true)
    expect(p.ledger.units.has(String(A)), '玩家侧记账不该抹掉单位表').toBe(true)
  })
})
