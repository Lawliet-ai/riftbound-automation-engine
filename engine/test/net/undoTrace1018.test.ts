import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { Room } from '../../src/net/room'

                                         
  
                                                                         
                                                              
                                               
                                                 
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardCost }

function seatedRoom(): Room {
  const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
  const g = new InteractiveGame(state, DEPS)
  g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
  g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
  const room = new Room('TEST', g)
  room.join('a')
  room.join('b')
  return room
}
const undoEntries = (room: Room): readonly { readonly player?: string }[] =>
  room.viewFor('a', 0).log.filter((e) => e.kind === 'undo') as never

describe('★★★★★★★ ★1018 撤回留痕', () => {
  test('前提自证:撤回之前战报里【没有】undo 条目(㊷ 动手前不该发生的先断言)', () => {
    const room = seatedRoom()
    room.submit('a', { kind: 'END_TURN', player: P1 })
    expect(undoEntries(room)).toEqual([])
  })

  test('🔴撤回一步 ⇒ 战报里出现一条 undo,并写明是谁撤的', () => {
    const room = seatedRoom()
    expect(room.submit('a', { kind: 'END_TURN', player: P1 }).ok).toBe(true)
    expect(room.undo('a').ok, '★撤回本身要成功,否则下面全是空转').toBe(true)
    const hits = undoEntries(room)
    expect(hits.length).toBe(1)
    expect(hits[0]?.player, '★记的是撤回的那个人').toBe(P1)
  })

  test('🔴🔴承重:这条留痕【不会被这次撤回自己抹掉】', () => {
                                                        
                                             
    const room = seatedRoom()
    room.submit('a', { kind: 'END_TURN', player: P1 })
    room.undo('a')
    expect(undoEntries(room).length, '★撤完之后它还在').toBe(1)
  })

  test('🔴🔴留痕记的是【撤回发生那一刻】的回合数,不是回退之后的', () => {
                                                            
                                                         
                      
                                                                  
                                                                 
                                                 
    const room = seatedRoom()
    room.submit('a', { kind: 'END_TURN', player: P1 })
    const turnAtUndo = room.viewFor('a', 0).view.turn
    expect(turnAtUndo, '★前提:END_TURN 之后确实进了第 2 回合').toBe(2)
    room.undo('a')
    const entry = room.viewFor('a', 0).log.find((e) => e.kind === 'undo')
    expect(entry?.turn, '★记的是撤回那一刻的回合数(2),不是回退之后的(1)').toBe(turnAtUndo)
  })

  test('🔴撤回两次 ⇒ 两条留痕,一条都不许少', () => {
    const room = seatedRoom()
    room.submit('a', { kind: 'END_TURN', player: P1 })
    room.undo('a')
    room.submit('a', { kind: 'END_TURN', player: P1 })
    room.undo('a')
    expect(undoEntries(room).length, '★后一次撤回不许抹掉前一次的痕').toBe(2)
  })

  test('🔴下界:撤回【失败】时不许留痕(没撤成就不是撤回)', () => {
    const room = seatedRoom()
                           
    expect(room.undo('a').ok).toBe(false)
    expect(undoEntries(room), '★失败的撤回不该在战报里留下痕迹').toEqual([])
  })

  test('🔴下界:撤别人的那一步被拒 ⇒ 也不留痕', () => {
    const room = seatedRoom()
    room.submit('a', { kind: 'END_TURN', player: P1 })
    const r = room.undo('b')                     
    expect(r.ok).toBe(false)
    expect(undoEntries(room)).toEqual([])
  })

  test('🔴对手也看得见 —— 留痕的意义就在于此', () => {
    const room = seatedRoom()
    room.submit('a', { kind: 'END_TURN', player: P1 })
    room.undo('a')
    const foeLog = room.viewFor('b', 0).log.filter((e) => e.kind === 'undo')
    expect(foeLog.length, '★不是只给自己看的').toBe(1)
    expect(foeLog[0]?.player).toBe(P1)
  })
})
