                          
  
                                
                                                
                                                          
                                             
                                         
  
                                                 
                                                          
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

                                                   
function rollUntilDecided(r: Room): ReturnType<Room['rollState']> {
  for (let i = 0; i < 40; i++) {
    r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 })
    r.submitRoom('connB', { kind: 'ROLL_DICE', player: P2 })
    const st = r.rollState()
    if (st.designated) return st
  }
  throw new Error('40 轮都没掷出高低 —— 要么随机源坏了,要么掷骰阶段根本没开启')
}

function newRoom(): Room {
  const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
  const r = new Room('TEST', new InteractiveGame(state, DEPS))
  r.enableRoll()                                
  r.join('connA')
  r.join('connB')
  return r
}

describe('★767 掷骰阶段', () => {
  test('满座之初:掷骰没走完,牌桌动作一律进不来', () => {
    const r = newRoom()
    expect(r.rollPending()).toBe(true)
    const res = r.submit('connA', { kind: 'END_TURN', player: P1 })
    expect(res.ok).toBe(false)
  })

  test('★915 视图门与提交门同口径(㉖):掷骰没走完,viewFor 的 legalActions 必须为空', () => {
                                                      
                                                
    const r = newRoom()
    expect(r.rollPending()).toBe(true)
    expect(r.viewFor('connA').legalActions, '掷骰未完 ⇒ 一条动作都不列').toHaveLength(0)
    expect(r.viewFor('connB').legalActions).toHaveLength(0)
                       
    const st = rollUntilDecided(r)
    r.submitRoom(st.designated === P1 ? 'connA' : 'connB', { kind: 'CHOOSE_ORDER', player: st.designated!, order: 'first' })
    const acts = r.viewFor('connA').legalActions.length + r.viewFor('connB').legalActions.length
    expect(acts, '先后手定了 ⇒ 至少一方有动作').toBeGreaterThan(0)
  })

  test('§650 认输不受掷骰阶段阻挡(随时可以认输)', () => {
    const r = newRoom()
    const res = r.submit('connA', { kind: 'CONCEDE', player: P1 })
    expect(res.ok).toBe(true)
  })

  test('一方掷完还不出结果 —— 要双方都掷', () => {
    const r = newRoom()
    r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 })
    expect(r.rollState().designated).toBeUndefined()
    expect(Object.keys(r.rollState().dice)).toEqual(['P1'])
  })

  test('★重复提交是幂等的 —— 网络重试不该把点数刷掉', () => {
    const r = newRoom()
    r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 })
    const first = r.rollState().dice['P1']
    r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 })
    expect(r.rollState().dice['P1']).toBe(first)
  })

  test('双方掷完:点数大的成为指定玩家(平局则重掷,dice 清空、rerolls+1)', () => {
    const r = newRoom()
    for (let i = 0; i < 20; i++) {
      r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 })
      r.submitRoom('connB', { kind: 'ROLL_DICE', player: P2 })
      const st = r.rollState()
      if (st.designated) {
        const a = st.dice['P1']!, b = st.dice['P2']!
        expect(a).not.toBe(b)
        expect(st.designated).toBe(a > b ? P1 : P2)         
        return
      }
      expect(st.rerolls).toBeGreaterThan(0)                  
      expect(Object.keys(st.dice)).toEqual([])
    }
    throw new Error('20 轮都没掷出高低,随机源有问题')
  })

  test('赛规 §407.1 只有指定玩家能选先后手', () => {
    const r = newRoom()
    const st = rollUntilDecided(r)
    const loser = st.designated === P1 ? P2 : P1
    const loserConn = loser === P1 ? 'connA' : 'connB'
    const res = r.submitRoom(loserConn, { kind: 'CHOOSE_ORDER', player: loser, order: 'first' })
    expect(res.ok).toBe(false)
    expect(String(res.error)).toContain('§407.1')      
  })

  test('★★ 赢家拿到的是【选择权】不是先手:选 second 时先手是【对手】', () => {
    const r = newRoom()
    const st = rollUntilDecided(r)
    const win = st.designated!
    const winConn = win === P1 ? 'connA' : 'connB'
    const other = win === P1 ? P2 : P1
    expect(r.submitRoom(winConn, { kind: 'CHOOSE_ORDER', player: win, order: 'second' }).ok).toBe(true)
    expect(r.rollState().done).toBe(true)
    expect(r.starterFromRoll()).toBe(other)                     
  })

  test('选 first 时先手才是自己', () => {
    const r = newRoom()
    const st = rollUntilDecided(r)
    const win = st.designated!
    r.submitRoom(win === P1 ? 'connA' : 'connB', { kind: 'CHOOSE_ORDER', player: win, order: 'first' })
    expect(r.starterFromRoll()).toBe(win)
  })

  test('选完之后不能反悔重掷', () => {
    const r = newRoom()
    const st = rollUntilDecided(r)
    const win = st.designated!
    r.submitRoom(win === P1 ? 'connA' : 'connB', { kind: 'CHOOSE_ORDER', player: win, order: 'first' })
    expect(r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 }).ok).toBe(false)
  })

  test('骰子点数永远在 1..6', () => {
    for (let seed = 0; seed < 12; seed++) {
      const r = newRoom()
      r.submitRoom('connA', { kind: 'ROLL_DICE', player: P1 })
      r.submitRoom('connB', { kind: 'ROLL_DICE', player: P2 })
      for (const v of Object.values(r.rollState().dice)) {
        expect(v).toBeGreaterThanOrEqual(1)
        expect(v).toBeLessThanOrEqual(6)
      }
    }
  })
})

   
                                       
  
                                         
                                       
                                          
   
describe('★768 撤回', () => {
  const ready = (): Room => {
    const r = newRoom()
    const st = rollUntilDecided(r)
    const win = st.designated!
    r.submitRoom(win === P1 ? 'connA' : 'connB', { kind: 'CHOOSE_ORDER', player: win, order: 'first' })
    return r
  }

  test('开局没有可撤的动作', () => {
    const r = ready()
    expect(r.canUndo(P1)).toBe(false)
    expect(r.undo('connA').ok).toBe(false)
  })

  test('★走一步之后能撤,且局面真的回到走之前', () => {
    const r = ready()
                                   
    r.submit('connA', { kind: 'MULLIGAN', player: P1, put: [] })
    r.submit('connB', { kind: 'MULLIGAN', player: P2, put: [] })
    const actor = r.rollState().chosen === 'first' ? r.rollState().designated! : (r.rollState().designated === P1 ? P2 : P1)
    const conn = actor === P1 ? 'connA' : 'connB'
    const before = r.viewFor(conn).view
    const end = r.viewFor(conn).legalActions.find((a) => a.kind === 'END_TURN')
    if (!end) return                                       
    r.submit(conn, end)
    expect(r.canUndo(actor)).toBe(true)
    expect(r.undo(conn).ok).toBe(true)
    expect(r.viewFor(conn).view.turn).toBe(before.turn)
    expect(r.canUndo(actor)).toBe(false)           
  })

  test('★不能替对手反悔', () => {
    const r = ready()
    r.submit('connA', { kind: 'MULLIGAN', player: P1, put: [] })
    r.submit('connB', { kind: 'MULLIGAN', player: P2, put: [] })
    const actor = r.rollState().chosen === 'first' ? r.rollState().designated! : (r.rollState().designated === P1 ? P2 : P1)
    const other = actor === P1 ? P2 : P1
    const end = r.viewFor(actor === P1 ? 'connA' : 'connB').legalActions.find((a) => a.kind === 'END_TURN')
    if (!end) return
    r.submit(actor === P1 ? 'connA' : 'connB', end)
    expect(r.canUndo(other)).toBe(false)
    const res = r.undo(other === P1 ? 'connA' : 'connB')
    expect(res.ok).toBe(false)
    expect(String(res.error)).toContain('不是你走的')
  })

  test('判了胜负就不能撤(否则可以撤掉自己的败局)', () => {
    const r = ready()
    r.submit('connA', { kind: 'CONCEDE', player: P1 })
    expect(r.viewFor('connA').pending.mode).toBe('gameover')
    expect(r.canUndo(P1)).toBe(false)
  })

  test('观战者撤不了', () => {
    const r = ready()
    expect(r.undo('connC').ok).toBe(false)
  })
})
