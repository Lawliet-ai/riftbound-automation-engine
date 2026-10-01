import { describe, expect, test } from 'vitest'
import { Room } from '../../src/net/room'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { replay, fingerprint, isSerializable } from '../../src/replay/recordedGame'
import { asPlayerId, type PlayerId } from '../../src/state/ids'

                                                
                                                           

installProviders()
const SEED = 20260830
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const mkDeps = (): InteractiveDeps => makeGameDeps(SEED ^ 0x5bf03635) as InteractiveDeps
const newGame = (): InteractiveGame =>
  new InteractiveGame(setupGame(DEMO_DECK_A, DEMO_DECK_C, specLookup, makeRng(SEED)).state, mkDeps())

function newRoom(): Room {
  const r = new Room('T930', newGame())
  r.join('cA')
  r.join('cB')
  return r
}

                                           
const roomFp = (r: Room): string => fingerprint((r as unknown as { game: InteractiveGame }).game)

   
                                    
                                               
                                         
   
function playSome(r: Room, steps = 60): void {
  const rng = makeRng(SEED)
  for (let i = 0; i < steps; i++) {
    const p = r.viewFor('cA').pending
    if (p.mode === 'gameover') break
    if (p.mode === 'mulligan') {
      r.submit('cA', { kind: 'MULLIGAN', player: P1, put: [] })
      r.submit('cB', { kind: 'MULLIGAN', player: P2, put: [] })
      continue
    }
    const actor = p.player as PlayerId
    const conn = actor === P1 ? 'cA' : 'cB'
    const legal = r.viewFor(conn).legalActions
    if (legal.length === 0) break
    r.submit(conn, legal[rng.int(legal.length)]!)
  }
}

describe('★930 房间录像', () => {
  test('建房即开录:真实对局路径(submit + 调度缓冲)录得下', () => {
    const r = newRoom()
    playSome(r)
    const rec = r.exportRecording('房间冒烟')
    expect(rec, '应当录到东西').not.toBeNull()
    expect(rec!.actions.length, '前提:走了足够多步').toBeGreaterThan(5)
    expect(rec!.initial.chain, '初始态必须链空(否则含闭包存不下)').toHaveLength(0)
    expect(rec!.note).toBe('房间冒烟')
  })

  test('★★放得回:重放房间录像 == 房间当前局面', () => {
    const r = newRoom()
    playSome(r)
    const rec = r.exportRecording()!
    expect(fingerprint(replay(rec, mkDeps))).toBe(roomFp(r))
  })

  test('★★★落盘一圈再放回来仍一致(真实使用路径)', () => {
    const r = newRoom()
    playSome(r)
    const rec = r.exportRecording()!
    expect(isSerializable(rec)).toBe(true)
    const onDisk = JSON.parse(JSON.stringify(rec)) as typeof rec
    expect(fingerprint(replay(onDisk, mkDeps))).toBe(roomFp(r))
  })

  test('🔒录全部动作(不按 changed 过滤)—— 漏录会让重放静默分叉', () => {
                                                           
                                                       
                                           
    const r = newRoom()
    playSome(r, 20)
    const before = r.exportRecording()?.actions.length ?? 0
                                                     
                                                         
    const res = r.submit('cA', { kind: 'END_TURN', player: P2 })
    expect(res.ok, '座位不符必须在门口就拒').toBe(false)
    expect(r.exportRecording()?.actions.length ?? 0, '被门口拒掉的动作不进录像').toBe(before)
                                                 
                                                  
    expect(fingerprint(replay(r.exportRecording()!, mkDeps))).toBe(roomFp(r))
  })

  test('录像带校验点,且末步一定有一个', () => {
    const r = newRoom()
    playSome(r)
    const rec = r.exportRecording()!
    const marks = rec.checkpoints ?? {}
    expect(Object.keys(marks).length).toBeGreaterThan(0)
    expect(marks[String(rec.actions.length)], '末步必须有校验点').toBeDefined()
  })

  test('换局清空录像:rematch 之后是新的一卷,不掺上一局', () => {
    const r = newRoom()
    playSome(r, 30)
    const first = r.exportRecording()!.actions.length
    expect(first).toBeGreaterThan(0)
    r.rematch(() => newGame())
    const after = r.exportRecording()
    expect(after, '新局一步没走 ⇒ 没有录像').toBeNull()
    playSome(r, 10)
    const second = r.exportRecording()
    if (second) expect(second.actions.length, '新卷从 0 开始,不累加上一局').toBeLessThan(first + 1)
  })
})
