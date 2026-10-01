// 示例：在仓库根目录用 server 的 tsx 启动
//   server/node_modules/.bin/tsx examples/run-engine.ts
//
// 它演示「完整装配 + 引擎驱动」的最小闭环：
//   1) installProviders() → makeGameDeps() → setupGame() → new InteractiveGame()
//   2) 循环读 pending()，按 pending.player 取 legalActions()
//   3) 选一项合法动作 apply()，最多 40 步
//   4) 只打印脱敏后的 view 摘要（客户端视角），不把权威 state 当客户端数据用
//
// 这不是强 AI：它只做一个确定性的合法动作挑选，用于演示接口。

import { installProviders, makeGameDeps } from '../engine/data/gameDeps'
import { setupGame } from '../engine/src/game/setup'
import { makeRng } from '../engine/src/util/rng'
import { InteractiveGame } from '../engine/src/session/interactiveGame'
import type { InteractiveAction, InteractiveDeps } from '../engine/src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../engine/data/decks'
import type { PlayerId } from '../engine/src/state/ids'

const SEED = 20261002
const MAX_STEPS = 40

// 必须先注册进程级 provider，否则那一层被动技能会在真对局里静默失灵。
installProviders()
const deps = makeGameDeps(SEED ^ 0x5bf03635) as InteractiveDeps
const setup = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(SEED))
const game = new InteractiveGame(setup.state, deps)

const PASSY = new Set(['PASS', 'END_TURN', 'CONCEDE'])
function choose(legal: readonly InteractiveAction[]): InteractiveAction {
  return legal.find((a) => !PASSY.has(a.kind)) ?? legal[0]!
}

console.log(`run-engine 示例 · seed=${SEED} · 最多 ${MAX_STEPS} 步`)

let step = 0
let result = 'step-cap（步数帽到顶，未分胜负）'
for (; step < MAX_STEPS; step++) {
  const pending = game.pending()
  if (pending.mode === 'gameover') {
    result = `gameover · winner=${pending.winner}`
    break
  }
  const actor = pending.player as PlayerId
  const legal = game.legalActions(actor)
  if (legal.length === 0) {
    result = `no-legal · mode=${pending.mode} actor=${actor}`
    break
  }
  const action = choose(legal)
  // view 是脱敏投影，客户端只该拿它。
  const view = game.view(actor)
  const hand = view.zones[`hand:${actor}`]?.contents.length ?? 0
  console.log(
    `#${String(step).padStart(2, '0')} ${pending.mode} ${actor} -> ${action.kind}` +
      ` | turn=${view.turn} phase=${view.phase} hand=${hand}` +
      ` scores=${JSON.stringify(view.scores)} mana=${view.mana} runes=${view.activeRunes}`,
  )
  game.apply(action)
}

const after = game.pending()
const viewer = after.mode === 'gameover' ? game.state.players[0]! : (after.player as PlayerId)
const v = game.view(viewer)
console.log('---')
console.log(`result=${result}`)
console.log(`winner=${v.winner ?? 'none'} scores=${JSON.stringify(v.scores)} turn=${v.turn}`)
console.log('说明：固定演示牌组 DEMO_DECK_A/B，本示例只演示接口，不是强 AI。')
