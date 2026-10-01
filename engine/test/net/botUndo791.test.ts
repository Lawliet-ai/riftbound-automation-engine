                                                 
  
                                               
                                                 
                                     
  
                            
                                                 
                                             
                                                
  
                  
                            
                                                      
                         
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
  room.join('human')
  room.join('bot')
  return room
}

describe('★791 傀儡对手与撤回', () => {
  test('标了傀儡:傀儡走过之后,人依然撤得回', () => {
    const room = seatedRoom()
    room.markBot(P2)
    expect(room.hasBot(), 'markBot 之后房间应当认得这个傀儡').toBe(true)

                        
    expect(room.submit('human', { kind: 'END_TURN', player: P1 }).ok).toBe(true)
    expect(room.canUndo(P1), '人刚走完,当然撤得回').toBe(true)

                                     
    expect(room.submit('bot', { kind: 'END_TURN', player: P2 }).ok).toBe(true)
    expect(room.canUndo(P1), '★791 傀儡的动作不进撤回栈 ⇒ 人的撤回不受影响').toBe(true)

                      
    expect(room.undo('human').ok, '撤回必须真的受理').toBe(true)
  })

  test('反面:没标傀儡时,原来的约束②一个字不变(真人对局不被污染)', () => {
    const room = seatedRoom()
                 
    expect(room.submit('human', { kind: 'END_TURN', player: P1 }).ok).toBe(true)
    expect(room.canUndo(P1)).toBe(true)
    expect(room.submit('bot', { kind: 'END_TURN', player: P2 }).ok).toBe(true)
    expect(room.canUndo(P1), '对手已经行动过就不能再撤(room.ts 约束②)').toBe(false)
    expect(room.undo('human').ok).toBe(false)
  })

  test('傀儡自己也撤不了(它没有撤回栈,不该凭空撤掉人的局面)', () => {
    const room = seatedRoom()
    room.markBot(P2)
    room.submit('human', { kind: 'END_TURN', player: P1 })
    room.submit('bot', { kind: 'END_TURN', player: P2 })
    expect(room.canUndo(P2), '傀儡的动作没进栈 ⇒ 它自己也没得撤').toBe(false)
  })
})
