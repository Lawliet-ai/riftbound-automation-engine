# 快速开始

Riftbound Automation Engine 是一个可独立运行的符文战场（Riftbound）规则引擎。本仓库包含引擎、卡效果实现、一个开发者对局界面与一个本地熟人房服务。

## 目录

```text
engine/     规则引擎、卡效果、数据表与行为测试（572 个测试文件）
server/     本地熟人房 HTTP 服务（RoomManager，默认端口 5180）
ui-dev/     极简开发者对局界面（Vite，默认端口 5177）
examples/   可运行示例（run-engine.ts、room-client.mjs、inspect-engine.mts、prepare-display-data.ts）
docs/       本套文档
```

## 环境

- Node.js **22 或更新版本**（示例客户端用内置 `fetch`）。
- 三个子包相互独立，各自安装依赖；根目录没有统一的 workspace。

## 安装

在仓库根目录分别安装三个模块：

```bash
npm --prefix engine ci
npm --prefix server ci
npm --prefix ui-dev ci
```

> 本快照本轮**没有在全新机器执行 clean install**：验证时使用的是本机已有依赖。首次安装请以本机实际输出为准。

## 启动

在两个终端中分别启动服务端与界面：

```bash
# 终端 1：联机服务
npm --prefix server start        # http://127.0.0.1:5180

# 终端 2：开发者界面
npm --prefix ui-dev run dev      # http://127.0.0.1:5177
```

界面默认连接 `http://127.0.0.1:5180`；服务端端口可用环境变量 `PORT` 覆盖。

## 类型检查、测试与构建

```bash
npm --prefix engine run typecheck
npm --prefix engine test
npm --prefix ui-dev run build
```

- `engine test` 在快照内为 572 个测试文件、5,179 条通过、2 条 TODO。
- 原开发仓库有 1,400 个测试文件；排除的 828 个见 [TEST_SCOPE.md](TEST_SCOPE.md) 与 [EXCLUDED_TESTS.txt](EXCLUDED_TESTS.txt)。

## 卡图与卡文缺失属预期

公开快照不随附官方卡图、规则全文与逐字卡文，因此界面里的卡图与正文展示会缺失或为空。这是许可证边界导致的**预期现象**，不是安装失败。

## 运行示例

### 引擎自动对局（示例）

```bash
server/node_modules/.bin/tsx examples/run-engine.ts
```

它用固定 `seed` 与现成 `DEMO_DECK_A/B` 完整装配引擎，按 `pending().player` 取 `legalActions()`，每步选一项合法动作并 `apply()`，最多 40 步，只打印脱敏后的 `view` 摘要。这是接口演示，不是强 AI。

### 联机房间客户端（示例）

先启动服务端，再跑：

```bash
node examples/room-client.mjs 5180
```

它只连 `127.0.0.1:5180`，演示 `decks → create → join → 掷骰选先后手 → 轮询 → 提交合法动作`。它开两个脚本连接，**不是两个真人**。

### 指标复算（示例）

```bash
server/node_modules/.bin/tsx examples/inspect-engine.mts
```

它从公开副本的真实运行时模块统计卡池/类别/别名/注册表，并用 TypeScript 类型检查器读取 `GameEvent.kind` 与 `InteractiveAction.kind` 两个联合类型；输出 JSON，字段口径见 [METRICS.md](METRICS.md)。

### 本地展示数据适配（示例）

```bash
server/node_modules/.bin/tsx examples/prepare-display-data.ts \
  --input examples/display-data.example.json \
  --out-dir .local/display-data
```

它把你自备的卡牌正文/风味/勘误与关键词说明合并进当前展示表副本，生成 `cardPool.ts` / `cardMeta.ts` / `keywordMeta.ts` 到 `--out-dir`（默认 `.local/display-data`）。**不改源码、不下载图片、不联网**；只改 JSON 里出现的字段。核对 diff 后，再由你自己执行单独拷贝到 `ui-dev/src/data`。详见 [DATA_AND_CARDS.md](DATA_AND_CARDS.md)。

## 本快照的验收口径

类型检查、保留测试、界面构建均已跑通；示例 stdout 已落在工作目录。未验收：全新机器安装、完整真人对局、公网部署。详见 [VERIFICATION.md](VERIFICATION.md)。
