# 联机 HTTP API

本地熟人房服务：`server/server.ts`（路由）+ `engine/src/net/room.ts`（`Room` / `RoomManager`，房间权威）。轮询式，无 WebSocket。

## 监听与 CORS

- 端口：`Number(process.env.PORT ?? 5180)`（`server.ts:341`）。
- 监听：`server.listen(PORT)` **未指定 host，默认绑定所有网络接口**；启动日志只打印 `http://127.0.0.1:5180`，但并不意味着只绑回环。请自行用防火墙/反代限制暴露面。
- CORS：所有响应带 `access-control-allow-origin: *`、`access-control-allow-headers: content-type`、`access-control-allow-methods: GET,POST,OPTIONS`（`server.ts:129-137`）。
- 错误兜底：顶层 `catch` 返回 500 `{ error: String(e) }`；未知路径返回 404 `{ error: 'not found' }`。

## 端点

| 方法 | 路径 | 请求体 / 查询 | 响应 |
|---|---|---|---|
| OPTIONS | `*` | — | 204 `{}` |
| GET | `/api/decks` | — | 牌组元信息数组。**不含牌表** |
| POST | `/api/create` | `{ connId, scene?, deck? }` | `{ code, seat, token? }`；非法自组牌 400 `{ error, violations? }` |
| POST | `/api/join` | `{ connId, code, deck? }` | `{ seat, token? }`；满员/不存在 `{ error }` |
| POST | `/api/roll` | `{ connId, code, action }`，action = `{ kind:'ROLL_DICE', player }` 或 `{ kind:'CHOOSE_ORDER', player, order }` | `SubmitResult { ok, error? }` |
| POST | `/api/submit` | `{ connId, code, action }` | `SubmitResult` |
| GET | `/api/view` | `?connId&code&sinceSeq` | `RoomView`；房间不存在 `{ error }` |
| POST | `/api/undo` | `{ connId, code }` | `SubmitResult` |
| POST | `/api/reclaim` | `{ connId, code, token }` | `{ seat, code }`；失败 `{ error }` |
| POST | `/api/rematch` | `{ connId, code }` | `SubmitResult` |
| GET | `/api/replays` | — | `{ items: ReplayMeta[] }` |
| GET | `/api/replay` | `?name` | `Recording`；读不出 404 `{ error }` |
| POST | `/api/replay/save` | `{ code, note? }` | `{ ok, name }` 或 `{ ok:false, error }` |
| POST | `/api/bot` | `{ code, deck? }` | `{ ok, seat }` / `{ ok:true, already:true }` / 400 |

## 关键类型

- `RoomView`（`room.ts:60`）：`{ code, seat, view, pending, legalActions, seatsFilled, log, logSeq, blocked, mulliganSubmitted, roll, canUndo }`。
- `Seat = PlayerId | 'spectator'`（`room.ts:15`；`P1` / `P2`）。
- `RollState`（`room.ts:38`）：`{ dice, designated?, chosen?, rerolls, done }`。
- `SubmitResult`（`room.ts:85`）：`{ ok, error? }`。
- `Pending`（`interactiveGame.ts:139`）、`ClientView`（`project.ts:64`）。

## 授权关系：connId 与 token

- `connId` 是客户端自选的连接标识；加入时 `Room.join` 把它绑定到一个空座位（`room.ts:269`）。
- 每个座位发一个 `token`，`/api/reclaim` 用它在换连接后认回原座位（`room.ts:199`）。
- **token 不是密码学凭证**：它由 `Date.now()` 加一个递增计数拼成（`RoomManager.newToken`，`room.ts:565`），只用来做熟人房里的"重占位"机制，不防猜测、不防伪造、不是认证。
- **没有账号体系、没有密钥**：知道房间码即可加入；持有某座位的 `connId`/`token` 就能操作该座位。它不是生产级鉴权，只适合熟人房。公网部署请在前面加自己的认证/隔离，不要把本服务直接暴露。

## 房间事务 vs 引擎动作

- **`ROLL_DICE` / `CHOOSE_ORDER` 是房间事务**，不在引擎 `legalActions` 里（`room.ts:52`）。它们走 `/api/roll` → `RoomManager.submitRoom`，并需要一个 `build` 闭包在选完先后手时真正建局（`server.ts:265-267`）。漏掉 `build`，`starterFromRoll()` 有答案但局没建，房间会静默卡死。
- 引擎动作走 `/api/submit` → `Room.submit`。
- 掷骰未定时，`view.roll.done === false`，此时 `legalActions` 为空，前端应画掷骰屏。（`RoomView` 没有单独的 `canAct` 字段，请以 `pending` + `legalActions` 判断。）

## 调度（mulligan）的坑

房间把双方调度暂存在 `mullBuf`，等所有应调度者都交齐才一起结算（`room.ts:530-551`）。因此 `pending.mode === 'mulligan'` 期间，`pending.player` 会一直是队首；另一个座位要用 `view.mulliganSubmitted` 判断自己是否已交，而不是等 `pending.player === 自己`。示例 `examples/room-client.mjs` 演示了正确写法。

## 内存对局，无持久化

`RoomManager` 把房间放在内存 `Map`（`room.ts:556`）。进程重启即丢失所有对局；没有崩溃恢复、没有磁盘续局、没有多进程共享。录像（若有保存）才会落盘。

## 录像

- 存储：`server/replays/`（`server/replayFiles.ts:8`，`REPLAY_DIR` 导出）。仅在显式 `/api/replay/save` 或对局结束时自动存档（`server.ts:121-127`）才写盘。
- **当前录像路由没有任何用户授权检查**：`GET /api/replays`、`GET /api/replay`、`POST /api/replay/save` 只按房间码/文件名取用（`server.ts:298-310`），不校验调用者是不是该局玩家。任何能访问服务的人都能列出、下载、写入录像。
- **录像可能包含完整初始局面与隐藏信息**：录像依赖初始局面快照 + 动作序列重放（`room.ts:486-496`），因此会带上开局时的完整 `GameState`（包括双方牌库、手牌等）。**不要公开录像或发给不应看到的玩家**；公网部署前必须自建访问控制。
- 初始局面链非空时无法录像（`room.ts:455`，闭包含闭包）；记录里 `seed: 0`，重放依赖初始局面快照 + 动作序列。

## 例子：先列牌组，再建房

```bash
curl -s http://127.0.0.1:5180/api/decks
# 再用 scene:'deck' 建一局真规则牌组房
curl -s -X POST http://127.0.0.1:5180/api/create \
  -H 'content-type: application/json' \
  -d '{"connId":"demo-1","scene":"deck","deck":"diana"}'
```

`scene` 取值来自 `server.ts` 的 `SCENES` 与 `deck` 分支：`vegas`、`discard`、`seize`、`servitor`、`militarist`、`blank`、`deck`；其中 `deck` 为真规则牌组对局（另有内置牌组 `diana` / `teemo` / `lucian`，见 `server.ts` 的 `DECKS`）。完整可运行脚本见 `examples/room-client.mjs`。

## 开发期功能：`/api/bot`

`/api/bot` 是开发期傀儡（`server.ts:148-290`，注释与实现），会以简单策略替一个座位自动动作，源码注释明确要求上线删除。它不是生产功能。
