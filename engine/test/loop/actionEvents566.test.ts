import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { eventDidHappen, ACTION_EVENT_KINDS } from '../../src/loop/actionEvents'

                                                  
  
                                                           
                                                                              
                                                            
                                              
  
                                  
                                                  
                                                                             
                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
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
const stunEv = (oid: string): GameEvent => ({ kind: 'stun', target: asObjId(oid) } as GameEvent)
const fire = (s: GameState, oid: string) => applyEvents(s, [stunEv(oid)], {})

describe('🔴🔴🔴★★★★★★566【C5】眩晕的幂等门:没真发生就不进 landed', () => {
  test('🔴★★★★★★对照组:**未**眩晕的单位被眩晕 ⇒ `stun` 要落进 events', () => {
    const r = fire(scene([unit('u')]), 'u')
    expect(r.events.map((e) => e.kind), '★真发生了就该有').toContain('stun')
    expect(r.state.objects[asObjId('u')]!.status['stunned']).toBe(true)
  })

  test('🔴🔴🔴★★★★★★【承重】**已**眩晕的单位再被眩晕 ⇒ `stun` **不进** events', () => {
                                                          
    const r = fire(scene([unit('u', { status: { stunned: true } as never })]), 'u')
    expect(r.events.map((e) => e.kind), '★★★改之前这里照样有 stun,OGN-261 会误触发')
      .not.toContain('stun')
  })

  test('🔴🔴★★★★★★【③ 钉死】终态**看不出差别** —— 所以断言只能落在 events 上', () => {
                                                  
    const fresh = fire(scene([unit('u')]), 'u')
    const again = fire(scene([unit('u', { status: { stunned: true } as never })]), 'u')
    expect(fresh.state.objects[asObjId('u')]!.status['stunned']).toBe(true)
    expect(again.state.objects[asObjId('u')]!.status['stunned']).toBe(true)
    expect(fresh.events.map((e) => e.kind).includes('stun'),
      '★★★两边终态一样,只有 events 分得开').not.toBe(again.events.map((e) => e.kind).includes('stun'))
  })

  test('🔴🔴★★★★★★门只管【行动型】那几个 —— 纯信号一律照进(不然触发全瞎)', () => {
                                       
                                                                         
                                  
    expect(ACTION_EVENT_KINDS.has('stun'), '★stun 在名单里').toBe(true)
    expect(ACTION_EVENT_KINDS.has('spellResolved'), '★纯信号不该在名单里').toBe(false)
    const same = {} as unknown
    expect(eventDidHappen('spellResolved', same, same), '★★★纯信号:state 没变也照进').toBe(true)
    expect(eventDidHappen('stun', same, same), '★★★行动型:state 没变 ⇒ 没发生').toBe(false)
  })
})
