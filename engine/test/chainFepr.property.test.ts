import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { ChainItem, ChainItemKind } from '../src/loop/chain'
import { runFepr, type FeprDecide } from '../src/loop/chainFepr'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const KINDS: ChainItemKind[] = ['unit', 'equipment', 'resource', 'spell', 'ability', 'triggered']
const ALWAYS_PASS: FeprDecide = () => ({ kind: 'pass' })

                              
function makeRng(seed: number) {
  let x = seed >>> 0
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0xffffffff
  }
}

function randomChain(rng: () => number, n: number): ChainItem[] {
  const items: ChainItem[] = []
  for (let i = 0; i < n; i++) {
    const kind = KINDS[Math.floor(rng() * KINDS.length)]!
    items.push({
      id: `i${i}`,
      controller: rng() < 0.5 ? P1 : P2,
      kind,
      status: 'pending',
      resolve: () => [],
    })
  }
  return items
}

describe('FEPR 收敛性(property)', () => {
  test('任意混合链 + 全员让过 → 必收敛到链空,不死循环', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = makeRng(seed)
      const n = 1 + Math.floor(rng() * 12)
      const s: GameState = { ...createInitialState([P1, P2]), chain: randomChain(rng, n) }
      const after = runFepr(s, ALWAYS_PASS)          
      expect(after.chain).toHaveLength(0)
      expect(after.priority).toBeNull()
    }
  })

  test('病态 decide(永远打出新项目)→ 超 iteration-cap 即抛,不静默死循环', () => {
    const s: GameState = {
      ...createInitialState([P1, P2]),
      chain: [{ id: 's', controller: P1, kind: 'spell', status: 'pending', resolve: () => [] }],
    }
    let n = 0
    const alwaysPlay: FeprDecide = () => ({
      kind: 'play',
      items: [{ id: `x${n++}`, controller: P1, kind: 'spell', status: 'pending', resolve: () => [] }],
    })
    expect(() => runFepr(s, alwaysPlay)).toThrow(/未在 \d+ 轮内收敛/)
  }, 10_000)
})
