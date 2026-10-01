# 指标口径

本文说明公开材料的数字**分别是什么口径**、怎么复算，以及哪些不是承诺。

- 快照日期：2026-10-02
- 引擎版本常量：`ENGINE_VERSION = '0.0.0'`、`RULESET_VERSION = '260717'`（`engine/src/index.ts`）
- 依据文档：[TEST_SCOPE.md](TEST_SCOPE.md)、[EXCLUDED_TESTS.txt](EXCLUDED_TESTS.txt)、[VERIFICATION.md](VERIFICATION.md)

## 指标定义

| 指标 | 数值 | 口径（务必按此理解） |
|---|---|---|
| 可选卡号 | **1,016** | `ui-dev/src/data/cardPool.ts` 中 `playable` 为真的卡号数。含再版/异画，**不等于** 1,016 个独立卡效果已全部正确 |
| 类别元数据 | **1,224** | `engine/data/cardCategories.ts` 顶层条目数。是类别表口径，**不是可玩卡数** |
| 原始卡名库 | 1,228 | `engine/data/cardNames.ts` 条目数（含未实现/别名） |
| 别名组 | 484 键 / 182 组 | `engine/data/variantAliases.ts`；用于把再版/异画回退到已实现同组号 |
| 卡实现源文件 | 379 | `engine/data/cards/*.ts` 文件数。**不等于卡数**（一个文件可含多张、多卡可共用一个文件） |
| PlaySpec 注册 | **232** | 打出规格注册项（PM 核实脚本，typeChecker/注册表口径） |
| 触发工厂注册 | **375** | 触发工厂注册项（PM 核实脚本） |
| 含主动技能的可选卡号 | 193 | 其中主动技能合计 210 项（含别名） |
| 游戏事件 | **85** | TypeScript typeChecker 读取的 `GameEvent.kind` union 类别数（`engine/src/loop/events.ts`） |
| 玩家动作 | **13** | `InteractiveAction.kind` 类别数（`engine/src/session/interactiveGame.ts`） |
| 关键词源文件 | 25 | `engine/src/keywords/*.ts` 文件数。**不是卡效果种数** |
| 规则族（仅备注，不作指标） | 94 / 96 | 历史收口文档写 94，交接清单实测 96，口径待定；**两者都不是卡效果种数**，本文不将其列出 |
| 公开测试 | 572 文件 / **5,179** 通过 / 2 TODO | `engine/test/**/*.test.ts`；原开发仓库共 1,400 个测试文件 |
| 末轮自动对局 | **51,200** | 4 策略 × 4 种子段 × 3,200，16 份原始日志；固定演示牌组配对 |

机器可读的本次实测结果见 [metrics.snapshot.json](metrics.snapshot.json)。

## 复算入口

在仓库根目录（依赖已安装）：

```bash
# 一条命令复算登记口径与协议类型：卡池/类别/别名/注册表按真实运行时模块统计，
# GameEvent.kind / InteractiveAction.kind 由 TypeScript 类型检查器读取。
server/node_modules/.bin/tsx examples/inspect-engine.mts
```

输出 JSON 字段与上文表格对应：`card_pool_keys`、`card_categories_keys`、`variant_groups_keys` / `variant_groups_distinct`、`play_specs_keys`、`trigger_factories_keys`、`selectable_ids_with_activated_specs` / `activated_specs_sum`、`game_event_kinds`、`interactive_action_kinds`。脚本内不硬编码计数。

```bash
# 测试通过数（5,179 通过 / 2 TODO，需已安装依赖）
npm --prefix engine test

# 卡实现源文件（379）/ 关键词源文件（25）/ 测试文件（572）
ls engine/data/cards/*.ts | wc -l
ls engine/src/keywords/*.ts | wc -l
find engine/test -name '*.test.ts' | wc -l
```

## 稳定性口径

**末轮 51,200 局自动对局未观察到崩溃/卡死**：16 份原始日志（4 策略 `lean/flat/stall/combat` × 4 种子段 `legacy/linear/prime/hash` × 3,200），`crash/stuck = 0`、EXIT 均 0。原始日志在原开发仓库 `planning/投单留档/ds1891a-out/`，本快照不随附。

这不是"无 bug 承诺"：它只说明**这批固定条件**下未观察到崩溃/卡死，不代表覆盖所有卡、所有规则组合或任意对局。

- 累计 **111,200** 只是重复回归运行次数，种子逐圈嵌套重复，**不是独立样本**，不作主标题。
- 原仓历史 **15,401** 条通过测试**未在本轮复跑**，不与公开测试量混算。
- 真人参与数**没有记录**。

## 政策与二手报道要分清

- **官方政策**（一手，已读原文）：Riot Developer API Policy 明确**不批准**"以自动化方式执行规则的数字 Riftbound 游戏体验"和"仅面向 Riftbound 的独立客户端"；实施 Riftbound 卡牌时只能使用 Riot API 提供的资产。来源：<https://developer.riotgames.com/policies/riftbound>。
- **二手招聘报道**（线索，非公告）：TheGamer 2026-08-27 报道 Riot 招聘"digital product/platform"岗位，推测可能在开发 Riftbound 数字版。它**只是招聘线索**，不是官方公告。来源：<https://www.thegamer.com/a-digital-version-of-riftbound-may-already-be-in-development/>。
- 本仓库**不声称** MIT = 官方授权，也不声称可获得该政策批准或绕过其限制；不声称 Riot endorsed/sponsored，也不伪称"created under Legal Jibber Jabber"已获许可。

## 相关文档

- 测试范围与排除清单：[TEST_SCOPE.md](TEST_SCOPE.md)、[EXCLUDED_TESTS.txt](EXCLUDED_TESTS.txt)
- 本轮验收（含类型检查/AST/正文清空）：[VERIFICATION.md](VERIFICATION.md)
- 仍有争议的口径与限制：[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)
