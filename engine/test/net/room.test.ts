import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { RoomManager } from '../../src/net/room'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { discardCounterDemo } from '../../data/demoScenes'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function mgr(): RoomManager {
  let n = 0
  return new RoomManager(
    () => new InteractiveGame(discardCounterDemo(), DEPS),
    () => `ROOM${++n}`, // 确定性房间码
  )
}

describe('熟人房 RoomManager(房间码/座位授权/脱敏)', () => {
  test('建房分配P1、加入分配P2、满员', () => {
    const m = mgr()
    const a = m.createRoom('connA')
    expect(a.seat).toBe(P1)
    expect(a.code).toBe('ROOM1')
    const b = m.joinRoom('connB', 'ROOM1')
    expect('seat' in b && b.seat).toBe(P2)
                                         
    expect(m.joinRoom('connC', 'ROOM1')).toEqual({ error: '这桌已经坐满了' })
    expect(m.joinRoom('connX', 'NOPE')).toEqual({ error: '房间不存在' })
  })

  test('per-seat脱敏:P2看不到P1手牌身份', () => {
    const m = mgr()
    m.createRoom('connA')
    m.joinRoom('connB', 'ROOM1')
    const vb = m.viewFor('connB', 'ROOM1')
    if ('error' in vb) throw new Error(vb.error)
    const p1hand = vb.view.zones['hand:P1']
    expect(p1hand!.contents).toEqual(['hidden'])                   
  })

  test('座位授权:连接只能提交自己座位的动作', () => {
    const m = mgr()
    m.createRoom('connA')      
    m.joinRoom('connB', 'ROOM1')      
                               
    const r = m.submit('connB', 'ROOM1', { kind: 'END_TURN', player: P1 })
    expect(r).toEqual({ ok: false, error: '座位 P2 不可提交 P1 的动作' })
  })

  test('遗弃反制全程走 room API:P1灼击→P2遗弃无效化→灼击回P1手牌', () => {
    const m = mgr()
    m.createRoom('connA')      
    m.joinRoom('connB', 'ROOM1')      

    const va = m.viewFor('connA', 'ROOM1')
    if ('error' in va) throw new Error(va.error)
                         
    const bolt = va.legalActions.find((a: InteractiveAction) => a.kind === 'PLAY_CARD' && a.target === 'p2u')!
    expect(m.submit('connA', 'ROOM1', bolt).ok).toBe(true)

                              
    expect(m.submit('connA', 'ROOM1', { kind: 'PASS', player: P1 }).ok).toBe(true)

                         
    const vb = m.viewFor('connB', 'ROOM1')
    if ('error' in vb) throw new Error(vb.error)
    const discard = vb.legalActions.find((a: InteractiveAction) => a.kind === 'PLAY_CARD' && (a as { target?: string }).target?.startsWith('play:'))!
    expect(discard).toBeTruthy()
    expect(m.submit('connB', 'ROOM1', discard).ok).toBe(true)

                           
    m.submit('connB', 'ROOM1', { kind: 'PASS', player: P2 })
    m.submit('connA', 'ROOM1', { kind: 'PASS', player: P1 })

                                       
    const after = m.viewFor('connA', 'ROOM1')
    if ('error' in after) throw new Error(after.error)
    expect(after.pending).toEqual({ mode: 'action', player: P1 })
    const p1hand = after.view.zones['hand:P1']!.contents.map((o) => after.view.objects[o]?.defId)
    expect(p1hand).toContain('DEMO-BOLT')              
  })

  test('非当前决策座位 legalActions 为空(不越权)', () => {
    const m = mgr()
    m.createRoom('connA')      
    m.joinRoom('connB', 'ROOM1')      
                               
    const vb = m.viewFor('connB', 'ROOM1')
    if ('error' in vb) throw new Error(vb.error)
    expect(vb.legalActions).toEqual([])
  })
})

describe('满座前不可行动 + 双方各选牌组', () => {
  test('对手没进来之前提交一律拒绝(否则建房者能先把调度打完)', () => {
    const m = mgr()
    m.createRoom('connA')
    expect(m.submit('connA', 'ROOM1', { kind: 'END_TURN', player: P1 })).toEqual({ ok: false, error: '等待对手加入' })
    m.joinRoom('connB', 'ROOM1')
    expect(m.submit('connA', 'ROOM1', { kind: 'END_TURN', player: P1 }).ok).toBe(true)
  })

  test('满座这一刻用双方各自选的牌组重开一局', () => {
    const m = mgr()
    m.createRoom('connA', undefined, 'deckA')
    let got: Readonly<Record<string, string | undefined>> | null = null
    m.joinRoom('connB', 'ROOM1', 'deckB', (decks) => {
      got = decks
      return new InteractiveGame(discardCounterDemo(), DEPS)
    })
    expect(got).toEqual({ P1: 'deckA', P2: 'deckB' })
  })
})

describe('§650 认输 / 再来一局', () => {
  test('认输随时可做,1v1 下对手直接获胜(§651.1)', () => {
    const m = mgr()
    m.createRoom('connA')
    m.joinRoom('connB', 'ROOM1')
                    
    expect(m.submit('connB', 'ROOM1', { kind: 'CONCEDE', player: P2 }).ok).toBe(true)
    const v = m.viewFor('connA', 'ROOM1')
    if ('error' in v) throw new Error(v.error)
    expect(v.view.winner).toBe(P1)
    expect(v.view.concededBy).toBe(P2)
    expect(v.pending).toEqual({ mode: 'gameover', winner: P1 })
  })

  test('对手还没进房也能认输退出这局(免得一个人枯坐)', () => {
    const m = mgr()
    m.createRoom('connA')
    expect(m.submit('connA', 'ROOM1', { kind: 'CONCEDE', player: P1 }).ok).toBe(true)
  })

  test('再来一局:只有已判胜的局才允许重开', () => {
    const m = mgr()
    m.createRoom('connA')
    m.joinRoom('connB', 'ROOM1')
    const make = (): InteractiveGame => new InteractiveGame(discardCounterDemo(), DEPS)
    expect(m.rematch('connA', 'ROOM1', make)).toEqual({ ok: false, error: '这一局还没结束' })
    m.submit('connB', 'ROOM1', { kind: 'CONCEDE', player: P2 })
    expect(m.rematch('connA', 'ROOM1', make).ok).toBe(true)
    const v = m.viewFor('connA', 'ROOM1')
    if ('error' in v) throw new Error(v.error)
    expect(v.view.winner).toBe(null)      
  })
})

describe('重连(座位令牌)', () => {
  test('原连接已离开(不再拉视图)时,凭令牌能认回原座位', () => {
    const m = mgr()
    const a = m.createRoom('connA')
    m.joinRoom('connB', 'ROOM1')
    expect(a.token).toBeTruthy()
                                           
    const back = m.reclaim('connA2', 'ROOM1', a.token!)
    expect('seat' in back && back.seat).toBe(P1)
    expect(m.submit('connA2', 'ROOM1', { kind: 'END_TURN', player: P1 }).ok).toBe(true)
  })

  test('令牌不对认不回来', () => {
    const m = mgr()
    m.createRoom('connA')
    expect(m.reclaim('connX', 'ROOM1', 'bogus')).toEqual({ error: '这个座位认不回来了' })
  })

  test('不能顶替一个正在活跃拉视图的座位(防座位劫持)', () => {
    const m = mgr()
    const a = m.createRoom('connA')      
    m.joinRoom('connB', 'ROOM1')
                    
    for (let i = 0; i < 5; i++) m.viewFor('connA', 'ROOM1')
                                                    
    expect(m.reclaim('connEvil', 'ROOM1', a.token!)).toEqual({ error: '这个座位有人正在用' })
                   
    expect(m.submit('connA', 'ROOM1', { kind: 'END_TURN', player: P1 }).ok).toBe(true)
  })
})


describe('观战泄密已堵死', () => {
  test('满员时第三个连接进不来,且即便拿到视图也看不到任何人的手牌', () => {
    const m = mgr()
    m.createRoom('connA')
    m.joinRoom('connB', 'ROOM1')
    expect(m.joinRoom('connC', 'ROOM1')).toEqual({ error: '这桌已经坐满了' })
                                      
    const v = m.viewFor('connC', 'ROOM1')
    if ('error' in v) throw new Error(v.error)
    expect(v.seat).toBe('spectator')
    expect(v.view.zones['hand:P1']!.contents.every((c) => c === 'hidden')).toBe(true)
    expect(v.view.zones['hand:P2']!.contents.every((c) => c === 'hidden')).toBe(true)
    expect(v.legalActions).toEqual([])
  })
})
