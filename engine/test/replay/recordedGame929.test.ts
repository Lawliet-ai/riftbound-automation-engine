import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import type { PlayerId } from '../../src/state/ids'
import { RecordedGame, replay, fingerprint, isSerializable, ReplayMismatch } from '../../src/replay/recordedGame'

                                                        
                                       

installProviders()
const SEED = 20260829
const initial = () => setupGame(DEMO_DECK_A, DEMO_DECK_C, specLookup, makeRng(SEED)).state
const mkDeps = (): InteractiveDeps => makeGameDeps(SEED ^ 0x5bf03635) as InteractiveDeps

                      
function recordSome(turnCap = 10): RecordedGame {
  const rng = makeRng(SEED)
  const rg = new RecordedGame(initial(), mkDeps, SEED)
  let turns = 0
  for (let i = 0; i < 900; i++) {
    const p = rg.game.pending()
    if (p.mode === 'gameover') break
    const legal = rg.game.legalActions(p.player as PlayerId)
    if (legal.length === 0) break
    const weighted: InteractiveAction[] = []
    for (const a of legal) {
      const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
      for (let k = 0; k < w; k++) weighted.push(a)
    }
    const pick = weighted[rng.int(weighted.length)]!
    if (pick.kind === 'END_TURN') turns++
    if (turns >= turnCap) break
    rg.apply(pick)
  }
  return rg
}

describe('★929 RecordedGame 录制', () => {
  test('录得下:step 随 apply 递增,动作按时序保留', () => {
    const rg = recordSome()
    expect(rg.step, '前提:录到了足够长的一段').toBeGreaterThan(15)
    expect(rg.actions).toHaveLength(rg.step)
  })

  test('🔒初始局面必须链空 —— 链非空的态含闭包,存不下来', () => {
    const bad = { ...initial(), chain: [{ id: 'x' } as never] }
    expect(() => new RecordedGame(bad, mkDeps, SEED)).toThrow(/链空/)
  })

  test('🔒引擎特性:apply 对非法动作【静默忽略】,不抛异常 —— 所以录像正确性只能靠校验点', () => {
                                                      
                                             
                                          
    const rg = new RecordedGame(initial(), mkDeps, SEED)
    const before = fingerprint(rg.game)
    expect(() => rg.apply({ kind: 'END_TURN', player: 'nobody' as unknown as PlayerId })).not.toThrow()
    expect(fingerprint(rg.game), '非法动作不改变局面').toBe(before)
  })

  test('导出的录像可安全落盘(JSON 往返一字不差)', () => {
    const rec = recordSome().toRecording('冒烟')
    expect(isSerializable(rec)).toBe(true)
    expect(rec.version).toBe(1)
    expect(rec.initial.chain).toHaveLength(0)
    expect(rec.note).toBe('冒烟')
  })
})

describe('★929 重放与跳帧', () => {
  test('★★放得回:重放全长 == 录制时的终局', () => {
    const rg = recordSome()
    const rec = rg.toRecording()
    expect(fingerprint(replay(rec, mkDeps))).toBe(fingerprint(rg.game))
  })

  test('★★★落盘一圈再放回来,依然一致(真实使用路径)', () => {
    const rg = recordSome()
    const onDisk = JSON.parse(JSON.stringify(rg.toRecording())) as ReturnType<RecordedGame['toRecording']>
    expect(fingerprint(replay(onDisk, mkDeps))).toBe(fingerprint(rg.game))
  })

  test('★★跳得准:重放到第 N 步 == 原局跑到第 N 步(拖帧调试的地基)', () => {
    const rg = recordSome()
    const rec = rg.toRecording()
    const probe = new InteractiveGame(rec.initial, mkDeps())
    for (const n of [0, 1, Math.floor(rec.actions.length / 3), Math.floor(rec.actions.length / 2)]) {
      const step = new InteractiveGame(rec.initial, mkDeps())
      for (let i = 0; i < n; i++) step.apply(rec.actions[i]!)
      expect(fingerprint(replay(rec, mkDeps, n)), `第 ${n} 步对不上`).toBe(fingerprint(step))
    }
    expect(fingerprint(probe), '第 0 步就是初始态').toBe(fingerprint(replay(rec, mkDeps, 0)))
  })

  test('upTo 越界被夹住,不越界不报错', () => {
    const rec = recordSome().toRecording()
    expect(fingerprint(replay(rec, mkDeps, rec.actions.length + 99)))
      .toBe(fingerprint(replay(rec, mkDeps)))
    expect(() => replay(rec, mkDeps, -5)).not.toThrow()
  })

  test('★★★🔒坏录像被校验点抓住(不是靠 apply 抛异常 —— 它不抛)', () => {
    const rec = recordSome()
    expect(Object.keys(rec.toRecording().checkpoints ?? {}).length, '前提:录像里有校验点').toBeGreaterThan(1)
    const full = rec.toRecording()
                                     
    const cut = Math.floor(full.actions.length / 2)
    const tampered = { ...full, actions: [...full.actions.slice(0, cut), ...full.actions.slice(cut + 1)] }
    expect(() => replay(tampered, mkDeps)).toThrow(ReplayMismatch)
    try {
      replay(tampered, mkDeps)
    } catch (e) {
      expect(e).toBeInstanceOf(ReplayMismatch)
      expect(String(e), '报错要说清是校验点对不上').toContain('校验点')
    }
  })

  test('没有校验点的录像也能放,但那就失去了防线(记录这个取舍)', () => {
    const full = recordSome().toRecording()
    const naked = { ...full, checkpoints: undefined }
    expect(() => replay(naked, mkDeps)).not.toThrow()
  })
})
