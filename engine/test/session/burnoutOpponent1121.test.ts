                                                      
                                                        
  
                                      
                                                             
                                                       
                                                           
                                                             
                                                     
                                                    
import { describe, expect, it } from 'vitest'
import { burnOut, BURNOUT_OPPONENT_KEY, parseBurnoutOpponents, type BurnoutOpponentAsk } from '../../src/scoring/burnout'
import { createInitialState } from '../../src/state/gameState'
import { setupGame, setupGameMulti } from '../../src/game/setup'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId, ZoneId } from '../../src/state/ids'

const P = (p: string): PlayerId => p as PlayerId

                                                                
function onceBurnState(players: readonly string[]): GameState {
  const s = createInitialState(players.map(P), players.length === 2 ? 2 : 3)
  const oid = 'burn1121-fuel'
  const z = 'discard:P1' as ZoneId
  const o = { oid, defId: 'OGN-011', owner: P('P1'), controller: P('P1'), zone: z, baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {} }
  return { ...s, objects: { ...s.objects, [oid]: o }, zones: { ...s.zones, [z]: { ...s.zones[z]!, contents: [oid] } } } as unknown as GameState
}

describe('★1121 §431.2.c 纯函数层:该问的问出来了,不该问的一声不吭', () => {
  it('🔴 三人局:没给答案时**汇报**「这里本该问」,候选 = 全部对手、选择方 = 燃尽的人', () => {
    const asks: BurnoutOpponentAsk[] = []
    burnOut(onceBurnState(['P1', 'P2', 'P3']), P('P1'), { onWouldAskBurnoutOpponent: (a) => { asks.push(a) } })
    expect(asks.length).toBe(1)
    expect(asks[0]!.player).toBe('P1')                     
    expect([...asks[0]!.candidates]).toEqual(['P2', 'P3'])                   
    expect(asks[0]!.key).toBe(BURNOUT_OPPONENT_KEY)
  })
  it('🔴 对照:1v1 一次都不汇报 —— §485 只有一名对手,「选择」退化成唯一解(单候选不问)', () => {
    const asks: BurnoutOpponentAsk[] = []
    const s = burnOut(onceBurnState(['P1', 'P2']), P('P1'), { onWouldAskBurnoutOpponent: (a) => { asks.push(a) } })
    expect(asks.length).toBe(0)
    expect(s.scores['P2']).toBe(1)               
  })
  it('🔴🔴 答案真的改变结果:不给 ⇒ 座位表首位 P2;给 P3 ⇒ P3', () => {
    const noAns = burnOut(onceBurnState(['P1', 'P2', 'P3']), P('P1'), {})
    expect(noAns.scores['P2']).toBe(1)
    expect(noAns.scores['P3'] ?? 0).toBe(0)
    const withAns = burnOut({ ...onceBurnState(['P1', 'P2', 'P3']), ruleChoices: { [BURNOUT_OPPONENT_KEY]: 'P3' } } as GameState, P('P1'), {})
    expect(withAns.scores['P3']).toBe(1)
    expect(withAns.scores['P2'] ?? 0).toBe(0)
  })
  it('🔴 兜底:不挂汇报口、不给答案 ⇒ 与接活前【逐字节一致】(纯函数点 / 自我对弈靠这条)', () => {
    const s = burnOut(onceBurnState(['P1', 'P2', 'P3']), P('P1'), {})
                                                       
    expect(s.scores['P2']).toBe(1)
    expect(s.scores['P3'] ?? 0).toBe(0)                    
    expect(s.ruleChoices[BURNOUT_OPPONENT_KEY]).toBeUndefined()               
  })
  it('🔴 答案是一次性凭据:用掉即删(§431.3.a 下一次燃尽读不到 ⇒ 会再问一次)', () => {
    const s = burnOut({ ...onceBurnState(['P1', 'P2', 'P3']), ruleChoices: { [BURNOUT_OPPONENT_KEY]: 'P3,P2' } } as GameState, P('P1'), {})
    expect(s.ruleChoices[BURNOUT_OPPONENT_KEY]).toBe('P2')                
    expect(parseBurnoutOpponents(s.ruleChoices[BURNOUT_OPPONENT_KEY])).toEqual(['P2'])
  })
  it('🔴 §431.3.a 反复燃尽:每一次都要选一个 ⇒ 队列空了就一次次汇报', () => {
                                      
    const asks: BurnoutOpponentAsk[] = []
    const s = burnOut(createInitialState(['P1', 'P2', 'P3'].map(P), 3), P('P1'), { onWouldAskBurnoutOpponent: (a) => { asks.push(a) } })
    expect(asks.length).toBe(s.winTarget)              
    expect(asks.length).toBeGreaterThan(1)
  })
  it('🔴 不认的答案(不是对手 / 是自己)不生效,回落座位表首位', () => {
    for (const bad of ['P1', 'P9', '']) {
      const s = burnOut({ ...onceBurnState(['P1', 'P2', 'P3']), ruleChoices: { [BURNOUT_OPPONENT_KEY]: bad } } as GameState, P('P1'), {})
      expect(s.scores['P2'], `答案=${bad}`).toBe(1)
    }
  })
})

                                                             
function drainForBurn(s: GameState, who: string): GameState {
  const mz = `mainDeck:${who}`; const dz = `discard:${who}`
  const main = s.zones[mz]!
  const keep = main.contents.slice(-1)
  const objects = { ...s.objects }
  for (const oid of keep) { const o = objects[String(oid)]; if (o) objects[String(oid)] = { ...o, zone: dz as ZoneId } }
  return { ...s, objects, zones: { ...s.zones,
    [mz]: { ...main, contents: [] },
    [dz]: { ...s.zones[dz]!, contents: [...s.zones[dz]!.contents, ...keep] } } } as GameState
}

interface Pend { mode: string; player?: string; request?: { key: string; prompt?: string; candidates: { id: string; label: string }[] } }

   
                                                                  
                                                         
                                                        
   
function runToBurn(g: InteractiveGame, pick: (c: string[]) => string, seen: Pend[] = [], burner = 'P2'): number {
  let asked = 0
  for (let i = 0; i < 80; i++) {
    const p = g.pending() as unknown as Pend
    if (p.mode === 'gameover') break
    if (p.mode === 'mulligan') { g.apply({ kind: 'MULLIGAN', player: p.player, put: [] } as never); continue }
    if (p.mode === 'choice') {
      const cands = p.request!.candidates.map((c) => c.id)
      if (p.request!.key === BURNOUT_OPPONENT_KEY) { asked += 1; seen.push(p); g.apply({ kind: 'CHOOSE', player: p.player, key: p.request!.key, answer: pick(cands) } as never); continue }
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request!.key, answer: cands[0]! } as never); continue
    }
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
    if (p.mode === 'action') {
      if (String(g.state.activePlayer) === burner) break            
      g.apply({ kind: 'END_TURN', player: g.state.activePlayer } as never); continue
    }
    break
  }
  return asked
}

describe('★1121 §431.2.c 会话层端到端:三人局真的问得出来', () => {
  const three = (): GameState => drainForBurn(setupGameMulti([DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_A], specLookup, makeRng(7)).state, 'P2')

  it('🔴🔴🔴 三人局 P2 抽牌燃尽 ⇒ 弹一问,mode=choice、问的是 P2、候选是他的两名对手', () => {
    const seen: Pend[] = []
    const g = new InteractiveGame(three(), makeGameDeps(0x51) as never)
    expect(runToBurn(g, (c) => c[0]!, seen)).toBe(1)
    expect(seen[0]!.player).toBe('P2')
    expect(seen[0]!.request!.candidates.map((c) => c.id)).toEqual(['P1', 'P3'])
    expect(seen[0]!.request!.prompt).toContain('对手')                
    expect(seen[0]!.request!.candidates.every((c) => c.label === c.id)).toBe(true)
  })
  it('🔴🔴🔴 答案真的改变胜负走向:选 P1 ⇒ P1 得分;选 P3 ⇒ P3 得分(单变量对照)', () => {
    const g1 = new InteractiveGame(three(), makeGameDeps(0x51) as never)
    runToBurn(g1, (c) => c[0]!)
    expect(g1.state.scores['P1']).toBe(1)
    expect(g1.state.scores['P3'] ?? 0).toBe(0)

    const g2 = new InteractiveGame(three(), makeGameDeps(0x51) as never)
    runToBurn(g2, (c) => c[c.length - 1]!)
    expect(g2.state.scores['P3']).toBe(1)
    expect(g2.state.scores['P1'] ?? 0).toBe(0)
  })
  it('🔴 对照:同一造景的 1v1 一次都不问,分照旧给唯一那名对手(1v1 行为零变化)', () => {
    const s = drainForBurn(setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state, 'P2')
    const g = new InteractiveGame(s, makeGameDeps(0x51) as never)
    expect(runToBurn(g, (c) => c[0]!)).toBe(0)
    expect(g.state.scores['P1']).toBe(1)
  })
  it('🔴 未答完时别的动作一律不收(与 ★1019/★1022 同一道 guard)', () => {
    const g = new InteractiveGame(three(), makeGameDeps(0x51) as never)
                   
    for (let i = 0; i < 80; i++) {
      const p = g.pending() as unknown as Pend
      if (p.mode === 'choice' && p.request!.key === BURNOUT_OPPONENT_KEY) break
      if (p.mode === 'mulligan') { g.apply({ kind: 'MULLIGAN', player: p.player, put: [] } as never); continue }
      if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request!.key, answer: p.request!.candidates[0]!.id } as never); continue }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
      if (p.mode === 'action') { g.apply({ kind: 'END_TURN', player: g.state.activePlayer } as never); continue }
      break
    }
    const before = JSON.stringify(g.state)
    g.apply({ kind: 'END_TURN', player: g.state.activePlayer } as never)
    expect(JSON.stringify(g.state)).toBe(before)           
                 
    g.apply({ kind: 'CHOOSE', player: 'P2', key: BURNOUT_OPPONENT_KEY, answer: 'P2' } as never)
    expect(JSON.stringify(g.state)).toBe(before)
  })
  it('🔴 撤回要能把「正在问什么」一起退回去(★1005 快照哨兵的同款要求)', () => {
    const g = new InteractiveGame(three(), makeGameDeps(0x51) as never)
    let snap: ReturnType<InteractiveGame['snapshot']> | null = null
    for (let i = 0; i < 80; i++) {
      const p = g.pending() as unknown as Pend
      if (p.mode === 'choice' && p.request!.key === BURNOUT_OPPONENT_KEY) { snap = g.snapshot(); break }
      if (p.mode === 'mulligan') { g.apply({ kind: 'MULLIGAN', player: p.player, put: [] } as never); continue }
      if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request!.key, answer: p.request!.candidates[0]!.id } as never); continue }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
      if (p.mode === 'action') { g.apply({ kind: 'END_TURN', player: g.state.activePlayer } as never); continue }
      break
    }
    expect(snap).not.toBeNull()
    expect(snap!.pendingBurnoutOpponent).not.toBeNull()            
    g.apply({ kind: 'CHOOSE', player: 'P2', key: BURNOUT_OPPONENT_KEY, answer: 'P3' } as never)
    expect((g.pending() as unknown as Pend).mode).not.toBe('choice')
    g.restore(snap!)
    const back = g.pending() as unknown as Pend
    expect(back.mode).toBe('choice')             
    expect(back.request!.key).toBe(BURNOUT_OPPONENT_KEY)
  })
})

describe('★1121【缺陷 112】§054 得分禁令挡不住会话层抽牌路的燃尽', () => {
                                                                         
                                                       
                                                   
  const scene = (blocked: boolean): InteractiveGame => {
    const s = drainForBurn(setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state, 'P2')
    const deps = { ...(makeGameDeps(0x51) as Record<string, unknown>) }
    if (blocked) deps['scoreBlockedAnywhere'] = () => true                       
    return new InteractiveGame(s, deps as never)
  }
  it('🔴🔴 禁令开着 ⇒ 燃尽送的那 1 分被挡下(修前:照送,白送对手一分)', () => {
    const g = scene(true)
    runToBurn(g, (c) => c[0]!)
    expect(g.state.scores['P1'] ?? 0).toBe(0)
  })
  it('🔴 对照:禁令关着 ⇒ 照常送出 1 分(证明观测口不是恒 0)', () => {
    const g = scene(false)
    runToBurn(g, (c) => c[0]!)
    expect(g.state.scores['P1']).toBe(1)
  })
})
