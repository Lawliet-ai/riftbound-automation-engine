# Riftbound Automation Engine｜符文战场自动规则引擎

**把纸面规则转成可执行、可复验的自动裁决系统。**

An unofficial Riftbound rules automation engine.

从费用支付、合法动作、触发链到战斗与胜负判定，引擎负责执行规则，玩家专注决策。

Riftbound Automation Engine 是非官方、可独立运行的符文战场（Riftbound）规则引擎。它自动处理出牌费用、合法动作枚举、触发链排队与结算、目标选择与冻结、结算时的合法性复验、战斗结算，以及得分与胜负判定；提供规则引擎、卡效果实现、开发者对局界面、卡组工具、熟人房联机服务和持续的行为测试。项目于 2026 年 10 月停止主动开发，现将已有实现以 MIT 许可证开放，供研究、修改与接续开发。这是开发中的实验项目，界面仍有待办，规则实现也存在未裁决边界；本轮未完成完整真人对局或公网部署验收。

## 自动能力

- **自动费用**：按卡费用表扣费，费用调整、折扣与减免由引擎裁决，不是客户端自报。
- **合法动作**：每步由 `pending()` 指出该谁决策，`legalActions(player)` 给出该玩家此刻真正可执行的动作。
- **触发链**：事件驱动，触发按规则排队、结算，替代与拦截由引擎处理。
- **目标复验**：需要选择目标的问题归属到对应决策玩家，先选择并冻结目标，再在结算时复验其合法性，引擎不替玩家猜。
- **战斗与胜负**：伤害、摧毁、战场控制、得分到 `winGame` 都由引擎判定。

## 指标（口径见 docs/METRICS.md）

| 指标 | 数值 | 口径 |
|---|---|---|
| 可选卡号 | 1,016 | 可被选择使用的卡号（含再版/异画） |
| 游戏事件 | 85 | 引擎事件协议的类别数 |
| 玩家动作 | 13 | `InteractiveAction.kind` 类别数 |
| 注册卡逻辑 | 232 / 375 | 232 项打出逻辑注册、375 项触发工厂注册 |
| 公开测试 | 5,179 通过 / 2 TODO | 572 个测试文件；原开发仓库共 1,400 个测试文件 |
| 末轮自动对局 | 51,200 | 16 份原始日志，4 策略 × 4 种子段 × 3,200；crash/stuck 0、EXIT 均 0 |

末轮 51,200 局使用固定演示牌组配对，未观察到崩溃或卡死。种子、策略及测试覆盖边界详见 [指标口径](docs/METRICS.md)。当前公开测试集合经过独立验证，已排除依赖私人开发环境的检查。

## 为什么开源

在关注到官方数字化方向的信号后，我们决定停止独立客户端开发，尊重官方的发展方向，也相信官方会带来更完整的体验。我们希望这段探索留下的成果继续发挥作用，因此以 MIT 开放已有的自主引擎实现，欢迎官方团队、爱好者与研究者参考、复用，用于研究、练习和接续开发。

本项目为非官方实现，与 Riot Games 无从属关系，未获其赞助或背书（not endorsed or sponsored）。MIT 许可证只覆盖作者有权许可的自主代码，不授予第三方商标、角色、卡图及其他资产权利，也不代表官方授权或可绕过任何限制；详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

Riot 的第三方政策明确不批准：以自动化方式执行规则的数字游戏，以及 Riftbound-only standalone client（见 [Riot 政策](https://developer.riotgames.com/policies/riftbound)）。本仓库以研究/学习用途开放，不主张该政策对本项目授予许可。

## 用途

- 研究卡牌规则的形式化建模与自动化裁决。
- 在上面练习对局、开发卡组与策略工具。
- 作为接续开发的基线：新卡、新关键词、新规则的实现入口。

**项目仓库名**：`riftbound-automation-engine`。

## 快速开始

需要 Node.js 22 或更新版本。在仓库根目录：

```bash
npm --prefix engine ci
npm --prefix server ci
npm --prefix ui-dev ci
```

在两个终端中分别启动服务端和界面：

```bash
npm --prefix server start      # 联机服务，默认端口 5180
npm --prefix ui-dev run dev    # 开发者界面，默认 http://127.0.0.1:5177
```

验证：

```bash
npm --prefix engine run typecheck
npm --prefix engine test
npm --prefix ui-dev run build
```

复算指标与本地展示数据工具：

```bash
# 一条命令复算登记口径与协议类型（卡池/类别/别名/注册表 + 两个 kind union）
server/node_modules/.bin/tsx examples/inspect-engine.mts

# 本地展示数据适配：合并自备正文/关键词说明，生成到 .local/（不改源码、不联网）
server/node_modules/.bin/tsx examples/prepare-display-data.ts \
  --input examples/display-data.example.json --out-dir .local/display-data
```

完整目录、安装、构建与示例运行见 [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)。

## 文档入口

- [快速开始](docs/GETTING_STARTED.md)
- [引擎接入](docs/ENGINE_INTEGRATION.md)
- [联机 HTTP API](docs/NETWORK_API.md)
- [数据与卡牌](docs/DATA_AND_CARDS.md)
- [已知限制](docs/KNOWN_LIMITATIONS.md)
- [架构](docs/ARCHITECTURE.md)
- [指标口径](docs/METRICS.md)
- [项目状态](docs/STATUS.md) · [测试范围](docs/TEST_SCOPE.md) · [第三方声明](THIRD_PARTY_NOTICES.md) · [贡献说明](CONTRIBUTING.md)
- 可运行示例与工具：[examples/run-engine.ts](examples/run-engine.ts)、[examples/room-client.mjs](examples/room-client.mjs)、[examples/inspect-engine.mts](examples/inspect-engine.mts)、[examples/prepare-display-data.ts](examples/prepare-display-data.ts)

## 资源与许可证

本快照保留卡名、卡号、数值和自主行为代码。官方卡图、规则全文、完整卡文、FAQ、私人开发日志及原 Git 历史均不随快照分发，界面中的卡图与正文展示因此有所缺失。MIT 仅适用于作者有权许可的自主代码，详见 [LICENSE](LICENSE) 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
