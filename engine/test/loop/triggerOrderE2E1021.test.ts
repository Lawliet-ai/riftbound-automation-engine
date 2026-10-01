import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { detectTriggersForBatchAndNote, type Trigger } from '../../src/dsl/trigger'
import { addItems } from '../../src/loop/chain'
import { advanceFepr, runFepr, TRIGGER_ORDER_KEY } from '../../src/loop/chainFepr'
import { buffCount } from '../../src/keywords/buff'

                                                    
  
                                          
                                               
                                                      
  
                                                                    
                                              

const P1 = asPlayerId('P1'), P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const u = {
    oid: asObjId('victim'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, activePlayer: P1, phase: 'main', objects: { victim: u },
    zones: { ...base.zones, [BF0]: { ...z, contents: [...z.contents, u.oid] } },
  } as GameState
}
const mk = (id: string, ev: GameEvent): Trigger => ({
  id, controller: P1, sourceOid: asObjId(`src-${id}`), event: 'damage', by: 'any',
  effect: (): readonly GameEvent[] => [ev],
} as unknown as Trigger)
const buffTrig = mk('t-buff', { kind: 'grantBuff', target: asObjId('victim') } as GameEvent)
const killTrig = mk('t-kill', { kind: 'destroy', target: asObjId('victim') } as GameEvent)
const dmg = { kind: 'damage', target: asObjId('other'), amount: 1 } as GameEvent

   
                            
                                                     
                                                      
                                                  
                                              
   
function run(pick?: (ids: readonly string[]) => string): { asked: number; buffAtDeath: number | null } {
  const s0 = scene()
  const { items, state: noted } = detectTriggersForBatchAndNote(s0, [dmg], [buffTrig, killTrig], P1)
  const start: GameState = { ...noted, chain: addItems(noted.chain, items) }
  let asked = 0
  let seen: number | null = null
  const deps = {
    onEvent: (ev: GameEvent, before: GameState): void => {
      if ((ev as { kind: string }).kind !== 'destroy') return
      const o = before.objects[asObjId('victim')]
      seen = o ? buffCount(o) : -1
    },
  } as never
  runFepr(
    start,
    () => ({ kind: 'pass' }) as never,
    deps,
    (req) => {
      if (!req.key.startsWith(TRIGGER_ORDER_KEY)) return req.candidates[0]!.id
      asked++
      return pick ? pick(req.candidates.map((c) => c.id)) : req.candidates[0]!.id
    },
  )
  return { asked, buffAtDeath: seen }
}

describe('★★★★★★★ ★1021 §383.3.d 端到端', () => {
  test('🔴前提自证:走生产路径时【确实会问】排序', () => {
    expect(run().asked, '★同批、同控制者、两条 ⇒ 必问').toBeGreaterThanOrEqual(1)
  })

  test('🔴🔴承重:选"先结算摧毁" ⇒ 死时【没有】增益', () => {
    const r = run((ids) => ids.find((id) => id.includes('t-kill'))!)
    expect(r.asked).toBeGreaterThanOrEqual(1)
    expect(r.buffAtDeath, '★摧毁先结算 ⇒ 给增益还没轮到').toBe(0)
  })

  test('🔴🔴承重:选"先结算给增益" ⇒ 死时【带着】增益', () => {
    const r = run((ids) => ids.find((id) => id.includes('t-buff'))!)
    expect(r.asked).toBeGreaterThanOrEqual(1)
    expect(r.buffAtDeath, '★给增益先结算 ⇒ 它带着增益死 ⇒ 先锋之盔那族才响得起来').toBe(1)
  })

  test('🔴🔴差异条:两种选择的结果【确实不同】—— 这个选择权有硬后果', () => {
    const a = run((ids) => ids.find((id) => id.includes('t-kill'))!).buffAtDeath
    const b = run((ids) => ids.find((id) => id.includes('t-buff'))!).buffAtDeath
    expect(a).not.toBe(b)
  })

  test('🔴代号不许出现在玩家面前:候选的 label 不能是项目 id', () => {
    const s0 = scene()
    const { items, state: noted } = detectTriggersForBatchAndNote(s0, [dmg], [buffTrig, killTrig], P1)
    const step = advanceFepr({ ...noted, chain: addItems(noted.chain, items) } as GameState, {} as never)
    expect(step.kind).toBe('choice')
    if (step.kind !== 'choice') return
    for (const c of step.request.candidates) {
      expect(c.label.includes('trig:'), `★label「${c.label}」里带了内部编号`).toBe(false)
      expect(c.label, '★label 必须是人话').not.toBe(c.id)
    }
  })
})
