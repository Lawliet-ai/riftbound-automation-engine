                                               
                                                                  

import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { FEPR_STEP_NAMES } from '../src/loop/chainFepr'
import { interceptEvent } from '../src/effects/replacementRegistry'
import { skipScoringShield } from '../src/effects/replacement'
import { burnOut } from '../src/scoring/burnout'
import { attemptConquer } from '../src/scoring/score'
import { runCleanupToFixpoint } from '../src/loop/cleanup'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

describe('M0 冒烟集 6 条', () => {
  test('①FEPR命名 §334:确认/执行/让过/结算(非Focus/Priority)', () => {
    expect(Object.values(FEPR_STEP_NAMES)).toEqual(['确认', '执行', '让过', '结算'])
  })

  test('②替换效果 §367:拦截事件(Skip=事件替换为无),≠§438替换行动', () => {
    const s = createInitialState([P1, P2])
    const shield = skipScoringShield('skip', P2, () => true)
                                                                     
    expect(interceptEvent({ kind: 'gainPoint', player: P1, amount: 1 }, s, { shields: [shield] })).toBeNull()
  })

  test('③燃尽连环立即胜 §431.3(首个可挡,后续豁免)', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 1 }, winTarget: 3 }
    expect(burnOut(s, P1).winner).toBe(P2)
  })

  test('④末分锁 §471.1.b:赛点征服未补齐全场 → 改抽', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 7, P2: 0 }, winTarget: 8 }
    let drew = false
    const r = attemptConquer(s, P1, 'battlefield:shared:0', {}, { drawCard: (st) => ((drew = true), st) })
    expect(r.result).toBe('drawInstead')
    expect(drew).toBe(true)
  })

  test('⑤得分被替换但征服技能仍触发 §383.4.c.2.c', () => {
    let fired = false
    const deps = { replacement: { shields: [skipScoringShield('tia', P2, () => true)] } }
    const r = attemptConquer(createInitialState([P1, P2]), P1, 'battlefield:shared:0', deps, { fireScoringAbilities: (st) => ((fired = true), st) })
    expect(r.result).toBe('blocked')       
    expect(fired).toBe(true)           
  })

  test('⑥清理不动点 §322:连锁清理收敛', () => {
    const mk = (id: string, might: number, dmg: number): GameObject => ({ oid: asObjId(id), defId: 'U', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'), baseMight: might, damage: dmg, counters: {}, status: {} })
    const base = createInitialState([P1, P2])
    const z = base.zones['battlefield:shared:0']!
    const s: GameState = { ...base, objects: { A: mk('A', 1, 1), B: mk('B', 5, 3) }, zones: { ...base.zones, 'battlefield:shared:0': { ...z, contents: [asObjId('A'), asObjId('B')] } } }
    const hooks = { referenceMight: (st: GameState, o: GameObject) => (o.oid === asObjId('B') ? (st.objects['A'] ? 5 : 2) : Math.max(0, o.baseMight)) }
    const after = runCleanupToFixpoint(s, hooks)
    expect(after.objects['A']).toBeUndefined()
    expect(after.objects['B']).toBeUndefined()                      
  })
})
