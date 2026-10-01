# 引擎接入

本文说明如何把引擎装进自己的程序。所有签名均取自本快照源码，路径相对仓库根。

## 一、最小装配（真规则）

```text
1) installProviders()                                  engine/data/gameDeps.ts:35
2) deps = makeGameDeps(seed)                           engine/data/gameDeps.ts:61
3) setup = setupGame(deckA, deckB, specLookup,         engine/src/game/setup.ts:213
                     makeRng(seed), startingPlayer?, opts?)
4) game = new InteractiveGame(setup.state, deps)       engine/src/session/interactiveGame.ts:803
5) game.pending()  → 谁该决策什么                       interactiveGame.ts:1148
   game.legalActions(player) → 合法动作枚举             interactiveGame.ts:2759
   game.apply(action)                                 interactiveGame.ts:2908
   game.view(viewer) → ClientView                      interactiveGame.ts:946
```

**`installProviders()` 不可省。** 它注册进程级 provider（常驻被动、武装额外授予、绝念重复次数、战场卡被动）；漏注册不会报错，只会让那一层被动技能在真对局里静默失灵。测试钉着这一层：`engine/test/game/reactionGainWiring1188.test.ts`、`engine/test/game/reactionGainGranted1194.test.ts`。

**不要用 `DEMO_DEPS` 跑真规则。** `DEMO_DEPS`（`gameDeps.ts:55`）只有 `getTriggers` 和 `handPlaySpecs`，没有卡费用表，打出不扣费，仅用于演示局。真对局一律用 `makeGameDeps(seed)`。

**`setupGame` 返回 `SetupResult`**（`{ state, chosenBattlefields }`，`setup.ts:52`），不是 `GameState`；把 `setup.state` 交给 `InteractiveGame`。

## 二、两支 RNG

引擎层有两支独立的随机流，不要混用：

1. **建局洗牌 RNG**：`makeRng(seed)`（`engine/src/util/rng.ts:12`，mulberry32）在 `setupGame` 内用于洗牌与初始手牌。
2. **运行期 RNG**：`makeGameDeps(seed)` 内部另建一支（`rng: makeRng((seed ^ 0x9e3779b9) >>> 0)`），供效果注抽/随机选择使用。

联机服务在两者之外还用第三支 `makeRng((seed ^ 0x5bf03635) >>> 0)` 决定先后手（`server/server.ts` 的 `makeDeckGame`）。种子由服务端持有，客户端永远拿不到。

## 三、状态机：pending / legalActions / apply / view

`pending()`（`interactiveGame.ts:1148`）返回 `Pending` 联合（`interactiveGame.ts:139`）：

| mode | 字段 | 含义 |
|---|---|---|
| `action` | `player` | 轮到该玩家主阶段决策 |
| `window` | `player, chainDepth, duel?` | 反应/对决窗口 |
| `choice` | `player, request` | 待确认的选择（目标/顺序/数量等） |
| `mulligan` | `player` | 调度（起手换牌） |
| `gameover` | `winner` | 已分胜负 |

驱动循环（**必须设有限 `maxSteps`**，不允许无限 `for(;;)`）：

```ts
const MAX_STEPS = 10_000
let steps = 0
while (steps++ < MAX_STEPS) {
  const p = game.pending()
  if (p.mode === 'gameover') break
  const legal = game.legalActions(p.player)   // 按归属玩家取
  if (legal.length === 0) {
    // 不是"继续等"，而是明确报诊断：谁、什么模式、为什么没有合法动作
    throw new Error(`no-legal: mode=${p.mode} player=${p.player}`)
  }
  game.apply(pickOne(legal))
}
if (steps > MAX_STEPS) throw new Error('超过 maxSteps，疑似未收敛')
```

要点：

- **`pending.player` 是决策归属**。`legalActions(player)` 只对该玩家非空；不要替对手或旁观者生成动作。
- **`choice` 必须由 `pending.player` 作答**。`legalActions` 会把 `request.candidates` 展开成 `CHOOSE{ key, answer }`（`interactiveGame.ts:2803`）。不要自己猜目标，也不要跳过目标的冻结与复验——目标先选择并冻结，到结算时再复验其合法性，跳过会造成状态不一致。
- **`window` 里 `PASS` 是合法动作之一**，用于放弃优先权。
- `MULLIGAN` 也在 `legalActions` 中（`interactiveGame.ts:2790`）。

## 四、脱敏：客户端只能拿 `view`

`view(viewer)`（`:946`）调用 `project(state, viewer, revealNow)`（`engine/src/net/project.ts:280`）产出 `ClientView`。身份可见性由 `canSeeIdentity`（`project.ts:152`）决定：手牌只对拥有者可见，牌库/符能库不可见，面朝下的牌只对控制者可见。**永远不要把权威 `game.state` 发给客户端**，只发 `view`。

## 五、卡模块的导入边界

- 注册表 `engine/data/registry.ts` 聚合所有卡模块与规格；**卡模块不要反向 `import` registry**，否则在 `registry → cards → registry` 之间形成循环，初始化顺序会出问题。卡模块只从 `src/dsl`、`src/state`、`src/keywords`、`src/game/economy` 及**其他卡模块**取值。
- 参考现成卡模块：`engine/data/cards/OGN-006.ts`（触发工厂 + `Card` 定义）。

## 六、新增一张卡

1. 新建 `engine/data/cards/<卡号>.ts`，导出卡规格（`Card`）与需要的触发/被动工厂。
2. 在 `engine/data/registry.ts` 登记：`PLAY_SPECS`（打出规格）、`TRIGGER_FACTORIES`（触发工厂）、`ACTIVATED`（主动技能）、费用表（`UNIT_COST`/`GEAR_CARDS`/`VANILLA_UNITS`）按需。
3. 若为再版/异画号，确认能否经 `resolveImplDefId`（`engine/data/variantAlias.ts`）回退到已实现同组号。
4. 在 `engine/test/cards/` 增加行为测试，并跑 `npm --prefix engine run typecheck && npm --prefix engine test`。
5. **卡模块的正文字段会被许可证清理掉**：本快照不携带官方逐字卡文。新增实现时请自备有权使用的原文，不要把第三方原文提交进仓库。

## 七、最完整的对局驱动范例

- 可运行的完整闭环：`examples/run-engine.ts`（`installProviders()`、`makeGameDeps`、成对固定牌组 `DEMO_DECK_A/B`、固定 `seed`、`pending → legalActions → apply`、有限 `MAX_STEPS`、只输出脱敏 `view`）。在仓库根用 `server/node_modules/.bin/tsx examples/run-engine.ts` 启动。
- 引擎内完整测试范例：`engine/test/session/selfplay.test.ts`（完整 `setup + session` 驱动、回合帽与卡死检测）。
- 目标合法性从导入到结算复验的完整路径：`engine/test/cards/seizedCounterLegality1800.test.ts`。
