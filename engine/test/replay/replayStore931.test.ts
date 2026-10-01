import { describe, expect, test } from 'vitest'
import { ReplayStore, memoryReplayIO, type ReplayIO } from '../../src/replay/replayStore'
import { RecordedGame, replay, fingerprint } from '../../src/replay/recordedGame'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import type { PlayerId } from '../../src/state/ids'

                                  
                                       

installProviders()
const SEED = 20260831
const initial = () => setupGame(DEMO_DECK_A, DEMO_DECK_C, specLookup, makeRng(SEED)).state
const mkDeps = (): InteractiveDeps => makeGameDeps(SEED ^ 0x5bf03635) as InteractiveDeps

function recordSome(turnCap = 8): RecordedGame {
  const rng = makeRng(SEED)
  const rg = new RecordedGame(initial(), mkDeps, SEED)
  let turns = 0
  for (let i = 0; i < 600; i++) {
    const p = rg.game.pending()
    if (p.mode === 'gameover') break
    const legal = rg.game.legalActions(p.player as PlayerId)
    if (legal.length === 0) break
    const w: InteractiveAction[] = []
    for (const a of legal) { const n = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4; for (let k = 0; k < n; k++) w.push(a) }
    const pick = w[rng.int(w.length)]!
    if (pick.kind === 'END_TURN') turns++
    if (turns >= turnCap) break
    rg.apply(pick)
  }
  return rg
}

describe('★931 录像仓库', () => {
  test('存得下并起了带信息的文件名', () => {
    const io = memoryReplayIO()
    const s = new ReplayStore(io)
    const rec = recordSome().toRecording()
    const name = s.save(rec, { code: 'AB12', savedAt: '2026-08-31T10:00:00.000Z', note: '冒烟' })
    expect(name).not.toBeNull()
    expect(name).toContain('AB12')
    expect(name!.endsWith('.json')).toBe(true)
    expect(io.files.size).toBe(1)
  })

  test('★★读得回:存盘再读出来重放,与原局一致', () => {
    const io = memoryReplayIO()
    const s = new ReplayStore(io)
    const rg = recordSome()
    const name = s.save(rg.toRecording(), { code: 'CD34' })!
    const back = s.load(name)
    expect(back).not.toBeNull()
    expect(fingerprint(replay(back!, mkDeps))).toBe(fingerprint(rg.game))
  })

  test('列得出,且不含动作序列(列目录不该把整局读进内存)', () => {
    const io = memoryReplayIO()
    const s = new ReplayStore(io)
    s.save(recordSome().toRecording(), { code: 'EF56', note: '一号' })
    s.save(recordSome(6).toRecording(), { code: 'GH78', note: '二号' })
    const items = s.list()
    expect(items).toHaveLength(2)
    expect(items.every((i) => i.actions > 0)).toBe(true)
    expect(items.map((i) => i.code).sort()).toEqual(['EF56', 'GH78'])
    expect((items[0] as unknown as { recording?: unknown }).recording, '列表项不该带录像正文').toBeUndefined()
  })

  test('🔒空录像不落盘(别留一个永远读不回来的空文件)', () => {
    const io = memoryReplayIO()
    const s = new ReplayStore(io)
    const empty = new RecordedGame(initial(), mkDeps, SEED).toRecording()
    expect(s.save(empty)).toBeNull()
    expect(io.files.size).toBe(0)
  })

  test('🔒存不下来的录像不落盘(写进去才发现存不了 = 留一个永远读不回来的坑)', () => {
                                     
                                                          
    const io = memoryReplayIO()
    const s = new ReplayStore(io)
    const rec = recordSome().toRecording()
    const bad = { ...rec, initial: { ...rec.initial, chain: [{ id: 'x', resolve: () => [] }] } }
    expect(s.save(bad as never), '带闭包的录像必须拒收').toBeNull()
    expect(io.files.size, '一个字节都不该写').toBe(0)
  })

  test('🔒坏文件不拖垮列表,读它返回 null 而不是崩', () => {
    const io = memoryReplayIO()
    const s = new ReplayStore(io)
    s.save(recordSome().toRecording(), { code: 'OK99' })
    io.files.set('broken.json', '{ 这不是 json')
    io.files.set('half.json', '{"meta":{},"recording":{"version":1}}')
    expect(s.list(), '好的那份仍然列得出来').toHaveLength(1)
    expect(s.load('broken.json')).toBeNull()
    expect(s.load('half.json'), '缺 actions/initial 的半截录像也要判 null').toBeNull()
    expect(s.load('不存在.json')).toBeNull()
  })

  test('IO 抛错时不吞掉(存盘失败必须让调用方知道)', () => {
    const boom: ReplayIO = {
      write() { throw new Error('磁盘满了') },
      read: () => null,
      list: () => [],
    }
    expect(() => new ReplayStore(boom).save(recordSome().toRecording())).toThrow(/磁盘满/)
  })
})
