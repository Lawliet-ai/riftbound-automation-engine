                                         
  
                                                               
                                                              
                                                                           
                          
import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { Journal } from '../../src/net/journal'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import type { GameEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1')

describe('★876 banish 事件进战报', () => {
  test('🔴 banish 的事件,战报条目要有 targetOid+defId(此前白名单没有它,放逐全程隐身)', () => {
    const j = new Journal()
    const st = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state
    const victim = Object.values(st.objects)[0]!
    j.record({ kind: 'banish', target: victim.oid, by: victim.oid } as GameEvent, st)
    const e = j.projectFor(P1).find((x) => x.kind === 'banish') as { targetOid?: string; defId?: string }
    expect(e).toBeDefined()
    expect(e.targetOid).toBe(victim.oid)
    expect(e.defId, '§427.2 放逐区公开 ⇒ 身份要带出来').toBe(victim.defId)
  })
  test('🔴★876b playFree(免费打出)也要进战报——披尾女族长/卡洛克斯那族此前全程隐身', () => {
    const j = new Journal()
    const st = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state
    const card = Object.values(st.objects)[0]!
    j.record({ kind: 'playFree', player: P1, obj: card.oid } as GameEvent, st)
    const e = j.projectFor(P1).find((x) => x.kind === 'playFree') as { oid?: string; defId?: string }
    expect(e).toBeDefined()
    expect(e.defId).toBe(card.defId)
  })
  test('🔴★888 changeController+recall(夺控召回族)也要进战报——据为己有/发光石此前全程隐身', () => {
    const j = new Journal()
    const st = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state
    const card = Object.values(st.objects)[0]!
    j.record({ kind: 'changeController', target: card.oid, player: P1 } as GameEvent, st)
    j.record({ kind: 'recall', target: card.oid } as GameEvent, st)
    const evs = j.projectFor(P1)
    expect(evs.some((x) => x.kind === 'changeController' && (x as { defId?: string }).defId === card.defId)).toBe(true)
    expect(evs.some((x) => x.kind === 'recall' && (x as { defId?: string }).defId === card.defId)).toBe(true)
  })
})
