                                                
                                                                           
  
                                                                     
                                                                        
                                                                       
                                                    
                                                            
                                                                                       
                                        
                                      
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const STEP_CAP = 80
type Any = Record<string, any>

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 4; k++) {
      const id = `deck${i++}`
      const c = obj(id, 'BLK', p, `mainDeck:${p}`)
      objects[id] = c
      zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
    }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState
}

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const mightOf = (g: InteractiveGame, oid: string): number => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? -999 : ((o as Any).derived?.might ?? o.baseMight ?? 0)
}
const findPlay = (g: InteractiveGame, p: PlayerId, cardOid: string, target?: string): InteractiveAction | null => {
  const acts = g.legalActions(p) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target) && !(a.echoPicks?.length)) ?? null) as InteractiveAction | null
}

interface SecondAsk { who: string; itemId: string; stage: string; cands: string[]; ans: string; targets: string[] | null; status: string }

                                                      
function runProbe(): {
  secondAsks: SecondAsk[]; firstWindowRc: Record<string, string> | null; endChain: readonly string[]; mights: Record<string, number>
} {
  const g = new InteractiveGame(scene([
    obj('a1', 'BLK', P1, BF0), obj('a2', 'BLK', P1, BF0), obj('a3', 'BLK', P1, BF0),
    obj('f1', 'BLK', P2, BF0), obj('f2', 'BLK', P2, BF0), obj('f3', 'BLK', P2, BF0),
    inHand('sA', 'OGN-206', P1), inHand('sB', 'OGN-206', P2),
  ]), makeGameDeps(0x1800) as never)

  const a0 = findPlay(g, P1, 'sA', 'a1')
  expect(a0, '前提:P1 的 A 打得出来(目标 a1)').toBeTruthy()
  g.apply(a0! as never)

  const secondAsks: SecondAsk[] = []
  let firstWindowRc: Record<string, string> | null = null
  let playedB = false
  for (let i = 0; i < STEP_CAP; i++) {
    const p = g.pending() as Any
    if (p.mode === 'choice') {
      const req = p.request as Any
      const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
      const who = String(req.controller)
      const ans = who === 'P2' && cands.includes('f2') ? 'f2' : who === 'P1' && cands.includes('a2') ? 'a2' : (cands[0] ?? '')
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
      if (String(req.key) === 'second') {
        const item = (curState(g).chain as unknown as Any[]).find((it) => String(it.id) === String(req.itemId))
        secondAsks.push({
          who, itemId: String(req.itemId), stage: String(req.stage), cands, ans,
          targets: item === undefined ? null : (item.targets ?? null), status: item === undefined ? 'gone' : String(item.status),
        })
      }
      continue
    }
    if (p.mode === 'window') {
      if (firstWindowRc === null) firstWindowRc = { ...(curState(g).resolveChoices ?? {}) }
      if (!playedB && String(p.player) === 'P2') {
        const b = findPlay(g, P2, 'sB', 'f1')
        if (b) { playedB = true; g.apply(b); continue }
      }
      g.apply({ kind: 'PASS', player: p.player } as never)
      continue
    }
    break
  }
  const mights: Record<string, number> = {}
  for (const oid of ['a1', 'a2', 'a3', 'f1', 'f2', 'f3']) mights[oid] = mightOf(g, oid)
  return {
    secondAsks, firstWindowRc,
    endChain: ((curState(g).chain ?? []) as unknown as Any[]).map((it) => String(it.id)),
    mights,
  }
}

const R = runProbe()

describe('★1800 ㈠ 两张背靠背 OGN-206:第二个项目的确认期答案作用域独立', () => {
  test('P1 的 A 答 a2;P2 被问 second、候选全是 P2 的单位(不含 a*);答 f2 ⇒ B 目标 [f1,f2]', () => {
    expect(R.secondAsks.length, '两问各一次(A、B)').toBe(2)
    const a = R.secondAsks.find((x) => x.who === 'P1')!
    const b = R.secondAsks.find((x) => x.who === 'P2')!
    expect(a, '★A 的问在').toBeDefined()
    expect(b, '★修前:B 那个项目**没被问** second(P2 的答案被 P1 的键静默顶掉)').toBeDefined()
    expect(a.stage, 'A 的问在确认期').toBe('confirm')
    expect(b.stage, '★B 的问也在确认期').toBe('confirm')
    expect(a.targets, 'A 链项目目标 [a1,a2]').toEqual(['a1', 'a2'])
                                                            
    expect(b.cands.slice().sort(), '★B 的候选全是 P2 的单位 f2/f3').toEqual(['f2', 'f3'])
    expect(b.cands.some((id) => id.startsWith('a')), '★B 的候选不含任何 a*(没串到 P1)').toBe(false)
    expect(b.targets, '★答 f2 ⇒ B 链项目目标 [f1,f2]').toEqual(['f1', 'f2'])
    expect(b.status, '★B 此刻已 confirmed').toBe('confirmed')
  })

  test('跑到链空:战力 a1=5 a2=5 a3=3 f1=5 f2=5 f3=3(★修前 a2=7、f2=3)', () => {
    expect(R.endChain, '链已清空').toEqual([])
    expect(R.mights, '★修前 a2=7(拿了 P1 该给的加成)').toEqual({
      a1: 5, a2: 5, a3: 3, f1: 5, f2: 5, f3: 3,
    })
  })
})

describe('★1800 ㈡ 性质:P1 的 A 确认之后,全局表里没有 `second` 键', () => {
  test('第一个窗口时 resolveChoices 不含 second(★修前它挂着 P1 的 second=a2)', () => {
    expect(R.firstWindowRc, '第一个窗口被捕获到').not.toBeNull()
    expect(Object.keys(R.firstWindowRc!), '★1800d:确认后本项目作用域的键已清出全局表').not.toContain('second')
  })
})
