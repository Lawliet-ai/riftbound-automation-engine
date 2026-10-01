# 数据与卡牌

本文说明卡号、对象 ID、别名、元数据与展示层的对接方式，以及新增卡的数据清单。

## 卡号 / oid / 别名

- **卡号（defId / cardNo）**：印刷卡号，如 `OGN-006`、`UNL-079`。再版与异画是**不同**的卡号（如 `OGN-197a` / `OGN-197b`）。
- **对象 ID（oid，`ObjId`）**：一局对战中每张实体牌/单位的实例 ID（形如 `o12`）。卡号回答"这是哪张卡"，oid 回答"场上的哪一个实体"；同一卡号可以有多个 oid。
- **别名组（`VARIANT_GROUPS`，`engine/data/variantAliases.ts`）**：把同组卡号（再版/异画/不同语言印次）编在一起。`resolveImplDefId`（`engine/data/variantAlias.ts`）把未单独实现的卡号回退到已实现同组号。别名映射当前 484 个键、182 个不同组。
- **类别元数据（`CARD_CATEGORIES`，`engine/data/cardCategories.ts`）**：defId → 类别字符串（`unit` / `spell` / `rune` / `legend` / `equipment` / `battlefield` 等），当前 **1,224** 条。它是类别表条目数，**不是可玩卡数**。

## 元数据 schema

引擎侧：

- `engine/data/cardNames.ts`：defId → 卡名。
- `engine/data/cardCategories.ts`：defId → 类别字符串。
- `engine/data/cardFacts.ts`：`CardFactsRow = { name, solitary?, anyNumber?, exclusive?, heroUnit? }`，用于卡组合法性判定。
- `engine/data/variantAliases.ts`：`VARIANT_GROUPS: Record<string, readonly string[]>`。

展示侧（`ui-dev/src/data/`）：

- `cardPool.ts`：`PoolCard = { no, name, sub, type, domains, energy, power, tag, region, hero, text, rarity, playable }`，当前 1,016 个可选卡号（`playable` 全为 true）。
- `cardMeta.ts`：`CardMeta = { name, sub, type, domains, energy, power, tag, region, text, flavor, errata }`。
- `keywordMeta.ts`：关键词展示元数据。

> 口径提醒：可选卡号 1,016 ≠ 独立卡效果 1,016 个已全部正确；1,224 是类别元数据条目数，不是可玩卡数。指标定义见 [METRICS.md](METRICS.md)。

## 正文清空与无图：属预期

本快照**不随附官方逐字卡文与卡图**。它保留了卡名、卡号、数值、类别、别名等**派生元数据**，但没有分发完整官方数据集、逐字卡文或卡图。展示层里 `text` / `flavor` 等正文字段被清空（本轮验收确认 1,158 个展示正文属性已清空），`ui-dev/public/` 静态资源目录未包含卡图。因此界面卡图与正文会缺失或为空，**这是许可证边界的预期结果，不是数据损坏**。

## UI 卡图 URL 模板（以代码为准）

卡图 URL 由 `cardImg(defId)` 生成（`ui-dev/src/cards.ts:220`）：

```ts
// 普通卡：/cards/<defId>.png
// rune：  /cards/<RUNE_ART[颜色]>.png
// token： /cards/<TOKEN_ART[name]>.png
```

- 基础目录是 Vite 静态资源目录 `ui-dev/public/cards/`（本快照未包含）。
- `RUNE_ART`（`cards.ts:174`）与 `TOKEN_ART`（`cards.ts:194`）在代码里，别凭猜。
- 缺失文件会加载失败，界面按"无图"处理。

## 卡逻辑与展示如何对接

- **引擎**只看卡号：`engine/data/registry.ts` 用 defId 查 `PLAY_SPECS`、`TRIGGER_FACTORIES`、费用表、`ACTIVATED` 等；引擎不认识卡图与逐字卡文。
- **界面**用 `CARD_POOL` / `CARD_META` 做展示，用 `playable` 标记可玩性。
- 两边通过**卡号**对齐：新增卡逻辑不自动出现在展示层，反之亦然，需分别登记。

## 本地展示数据适配工具（展示-only）

`examples/prepare-display-data.ts` 用于把你自备的展示文本合并进当前展示表副本。它**只改展示数据，不引入任何卡逻辑，也不能当成新版卡实现的入口**（卡逻辑仍须走 `engine/data/registry.ts` 与 `engine/test/cards/`）。

输入 schema（统一格式，JSON）：

```jsonc
{
  "cards":    [ { "id": "OGN-006", "text": "…", "flavor": "…", "errata": "…" } ],
  "keywords": [ { "name": "急速", "text": "…" } ]
}
```

- 卡牌 `id` 必须已存在于 `CARD_POOL` 或 `CARD_META`；`flavor` / `errata` 只在 `CARD_META` 中存在。
- 关键词 `name` 必须已存在于 `KEYWORD_META`。
- 未知 id / 键**直接失败并退出非零**，不会静默新增条目。

真实命令（仓库根，依赖已安装；示例输入 `examples/display-data.example.json` 用的是原创展示句，不含官方原文）：

```bash
server/node_modules/.bin/tsx examples/prepare-display-data.ts \
  --input examples/display-data.example.json \
  --out-dir .local/display-data
```

产物核查与使用流程：

1. **核查 diff**：工具不写源码，只生成到 `--out-dir`（默认 `.local/display-data`）。先 diff 对照，确认**条目数与基线一致、只出现你提供的字段变化**。
2. **备份**：拷贝前先备份 `ui-dev/src/data/`。
3. **单独拷贝**（由使用者手动执行，工具不代劳）：
   ```bash
   cp .local/display-data/cardPool.ts ui-dev/src/data/cardPool.ts
   cp .local/display-data/cardMeta.ts ui-dev/src/data/cardMeta.ts
   cp .local/display-data/keywordMeta.ts ui-dev/src/data/keywordMeta.ts
   ```
4. **卡图手动落位**：本工具**不下载图片**，卡图需你自行放到 `ui-dev/public/cards/` 并遵守上方 URL 模板。
5. **重建界面**：`npm --prefix ui-dev run build`（开发期用 `npm --prefix ui-dev run dev`）。

> `--out-dir` 不允许等于源目录 `ui-dev/src/data`；生成物只是候选，拷贝动作与合规责任在使用者。官方 API 的原始 schema 仍需调用者**另做适配**转成上面的统一 schema 再用。

## 新增一张卡的数据清单

1. 准备**有权使用**的卡文与数值（见下方合规说明），不要把官方原文提交进仓库。
2. 登记元数据：卡名 / 类别 / 别名组（由生成流程产出，见下）。
3. 新建 `engine/data/cards/<卡号>.ts`（卡规格 + 触发工厂），并在 `engine/data/registry.ts` 登记；卡模块**不要反向 import registry**。
4. 增加 `engine/test/cards/` 行为测试，跑 `npm --prefix engine run typecheck && npm --prefix engine test`。
5. 如需展示，更新 `ui-dev/src/data/cardPool.ts` 与 `cardMeta.ts`。

## 官方 API：未集成，需要自行适配

本仓库**没有集成任何官方 API**，也**没有分发**完整官方数据集、逐字卡文或卡图（仅保留名称、数值等派生元数据）。要合规使用官方卡数据、官方卡图与官方翻译，需要接入方**自行实现官方 API 适配**，并遵守 Riot 的第三方政策（含"只能使用 Riot API 提供的卡牌资产"等要求）。

> 即使你通过合法途径取得了官方资产，**也不等于**本自动规则客户端获得了官方批准或可用于产品发布：Riot 政策明确不批准以自动化方式执行规则的数字游戏，以及仅面向 Riftbound 的独立客户端。合法资产只解决"资产来源合规"，不改变用途定性。

## 旧抓取源不是官方 API

原开发仓库曾用一个本地抓取产物作为生成脚本的输入（`data/上游/cn_all_cards.json`）。本快照**不包含**该输入文件，也**不包含**生成脚本（`gen-card-pool.py` / `gen-card-meta.py` / `dl-cards.py` 等均在原开发仓库，未随快照分发）。该抓取源**不能称为官方 API**；本仓库**不会自动下载**它。使用者如要重跑生成流程，需回到原开发环境并自行取得合法数据。

## 排除测试的恢复：不得造假

不在快照内的 828 个测试依赖官方规则原文、完整卡文、私人开发文档或未分发的审计脚本（见 [EXCLUDED_TESTS.txt](EXCLUDED_TESTS.txt)）。要恢复它们，必须**自备有权使用的原文**并**回到原开发环境**（脚本与路径）；**不得伪造 fixture 或把断言改弱**来凑过。
