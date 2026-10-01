import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { addMana, emptyRunePool } from '../../src/state/runePool'

                                                    
  
                                  
                                                             
                                                        
                                                    
                                               
  
                                  
  
                                                                    
                                                                  
                                              
                                                                      
                                    
                                                  
                                                               
                                                                
                                       

installProviders()
const SEED = 20260828
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF1 = 'battlefield:shared:1'

const initial = (): GameState => setupGame(DEMO_DECK_A, DEMO_DECK_C, specLookup, makeRng(SEED)).state
const mkDeps = (): InteractiveDeps => makeGameDeps(SEED ^ 0x5bf03635) as InteractiveDeps

                          
function fingerprint(g: InteractiveGame): string {
  const s = g.state
  const objs = Object.entries(s.objects).sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([id, o]) => `${id}:${o.defId}@${String(o.zone)}/${o.damage}/${JSON.stringify(o.status)}`).join('|')
  return `T${s.turn}|A${String(s.activePlayer)}|S${JSON.stringify(s.scores)}|C${s.chain.length}|${objs}`
}

function record(turnCap = 12): { actions: InteractiveAction[]; end: string } {
  const rng = makeRng(SEED)
  const g = new InteractiveGame(initial(), mkDeps())
  const actions: InteractiveAction[] = []
  let turns = 0
  for (let i = 0; i < 900; i++) {
    const p = g.pending()
    if (p.mode === 'gameover') break
    const legal = g.legalActions(p.player as PlayerId)
    if (legal.length === 0) break
    const weighted: InteractiveAction[] = []
    for (const a of legal) {
      const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
      for (let k = 0; k < w; k++) weighted.push(a)
    }
    const pick = weighted[rng.int(weighted.length)]!
    if (pick.kind === 'END_TURN') turns++
    if (turns >= turnCap) break
    actions.push(pick)
    g.apply(pick)
  }
  return { actions, end: fingerprint(g) }
}

function replay(actions: readonly InteractiveAction[]): string {
  const g = new InteractiveGame(initial(), mkDeps())
  for (const a of actions) g.apply(a)
  return fingerprint(g)
}

describe('★928 动作重放的确定性(回放/checkpoint 的地基)', () => {
  test('初始态可 JSON 往返(建局时链空,没有闭包)', () => {
    const s = initial()
    expect(s.chain).toHaveLength(0)
    expect(() => JSON.parse(JSON.stringify(s))).not.toThrow()
  })

  test('★★同一动作序列重放两次,结果完全一致', () => {
    const rec = record()
    expect(rec.actions.length, '前提:录到了足够长的一段').toBeGreaterThan(20)
    expect(replay(rec.actions)).toBe(replay(rec.actions))
  })

  test('★★★重放结果 == 原局(录下来的能原样放回来)', () => {
    const rec = record()
    expect(replay(rec.actions)).toBe(rec.end)
  })

                                      
                                                          
  test('★★同一初始态录两次,动作序列逐个相同(枚举侧也必须确定)', () => {
    const a = record()
    const b = record()
    expect(a.actions.length).toBe(b.actions.length)
                                       
    for (let i = 0; i < a.actions.length; i++) {
      expect(JSON.stringify(a.actions[i]), `第 ${i} 个动作`).toBe(JSON.stringify(b.actions[i]))
    }
    expect(a.end).toBe(b.end)
  })

  test('前缀重放:放前 N 个动作 == 原局跑到第 N 步(跳帧调试的前提)', () => {
    const rec = record()
    const n = Math.floor(rec.actions.length / 2)
    const g = new InteractiveGame(initial(), mkDeps())
    for (let i = 0; i < n; i++) g.apply(rec.actions[i]!)
    expect(replay(rec.actions.slice(0, n))).toBe(fingerprint(g))
  })
})

describe('🔒★928 状态快照这条路是封死的(把已知陷阱钉在代码里)', () => {
  function obj(oid: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
    const spec = (specLookup(defId) ?? {}) as Partial<GameObject>
    return {
      ...spec, oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
      baseMight: spec.baseMight ?? 3, baseKeywords: spec.baseKeywords ?? [], baseTypes: spec.baseTypes ?? ['unit'],
      damage: 0, counters: {}, status: {}, ...extra,
    } as GameObject
  }
  const blank = (o: string, c: typeof P1, z: string, m: number): GameObject =>
    obj(o, 'OGN-175', c, z, { baseMight: m })

  test('链非空时 JSON 往返会静默丢掉 resolve —— 恢复后效果一条都不结算,且不报错', () => {
    const base = createInitialState([P1, P2], 2)
    const objects: Record<string, GameObject> = { ...base.objects }
    const zones = { ...base.zones }
    for (const o of [
      blank('mine', P1, BF1, 3), blank('foe', P2, BF1, 3),
      obj('storm', 'OGN-133', P1, `hand:${P1}`), // 剑刃飓风:全场各 1 点
    ]) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    const st: GameState = { ...base, activePlayer: P1, phase: 'main', objects, zones,
      runePools: { ...base.runePools, [P1]: addMana(emptyRunePool(), 5) } }
    const g = new InteractiveGame(st, mkDeps())
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'storm')
    expect(play, '前提:飓风打得出来').toBeDefined()
    g.apply(play!)
    expect(g.state.chain.length, '前提:法术真的上了链').toBeGreaterThan(0)

    const item = g.state.chain[0]! as unknown as { resolve?: unknown }
    expect(typeof item.resolve, '原链项带闭包').toBe('function')
    const round = JSON.parse(JSON.stringify(g.state)) as GameState
    const item2 = round.chain[0]! as unknown as { resolve?: unknown }
    expect(typeof item2.resolve, '⚠️ JSON 往返后 resolve 消失 —— 这就是不能用状态快照的原因').toBe('undefined')
  })
})
