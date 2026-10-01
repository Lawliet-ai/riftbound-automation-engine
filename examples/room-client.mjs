// 示例：联机房间客户端（Node >= 22，内置 fetch，无需安装依赖）
//   node examples/room-client.mjs [port]
//
// 只连 127.0.0.1 的指定端口（默认 5180），演示：
//   GET /api/decks → POST /api/create → POST /api/join
//   → 轮询 /api/view → /api/roll 掷骰 & 选先后手（房间事务）
//   → /api/submit 提交合法动作
//
// 这里开的是两个脚本连接（conn1 / conn2），不是两个真人。
// 需要先启动服务端：npm --prefix server start

const PORT = Number(process.argv[2] ?? 5180)
const BASE = `http://127.0.0.1:${PORT}`
const MAX_STEPS = 30
const P1 = 'room-demo-conn-1'
const P2 = 'room-demo-conn-2'

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

const view = async (connId, code) => (await api('GET', `/api/view?connId=${connId}&code=${code}`)).json

try {
  console.log(`room-client 示例 · 连接 http://127.0.0.1:${PORT}（两个脚本连接，不是双真人）`)

  const decks = await api('GET', '/api/decks')
  console.log('GET /api/decks ->', JSON.stringify(decks.json))

  const created = await api('POST', '/api/create', { connId: P1, scene: 'deck', deck: 'diana' })
  console.log('POST /api/create ->', JSON.stringify(created.json))
  const code = created.json.code
  if (!code) throw new Error(`create 未返回房间码: ${JSON.stringify(created.json)}`)

  const joined = await api('POST', '/api/join', { connId: P2, code, deck: 'teemo' })
  console.log('POST /api/join ->', JSON.stringify(joined.json))

  // 掷骰 + 选先后手：这是房间事务，不在引擎 legalActions 里。
  for (let i = 0; i < 20; i++) {
    const v1 = await view(P1, code)
    const v2 = await view(P2, code)
    if (v1.roll?.done) break
    for (const [connId, v] of [
      [P1, v1],
      [P2, v2],
    ]) {
      const seat = v.seat
      if (!seat || seat === 'spectator') continue
      if (v.roll?.dice?.[seat] === undefined) {
        const r = await api('POST', '/api/roll', { connId, code, action: { kind: 'ROLL_DICE', player: seat } })
        console.log(`POST /api/roll ROLL_DICE ${seat} ->`, JSON.stringify(r.json))
      } else if (v.roll?.designated === seat && v.roll?.chosen === undefined) {
        const r = await api('POST', '/api/roll', {
          connId,
          code,
          action: { kind: 'CHOOSE_ORDER', player: seat, order: 'first' },
        })
        console.log(`POST /api/roll CHOOSE_ORDER ${seat} ->`, JSON.stringify(r.json))
      }
    }
  }

  let result = 'step-cap（步数帽到顶）'
  for (let step = 0; step < MAX_STEPS; step++) {
    let acted = false
    for (const [connId, label] of [
      [P1, 'conn1'],
      [P2, 'conn2'],
    ]) {
      const v = await view(connId, code)
      if (v.error) {
        result = `view error: ${v.error}`
        break
      }
      if (v.pending?.mode === 'gameover') {
        result = `gameover · winner=${v.pending.winner}`
        break
      }
      const seat = v.seat
      // 调度期：房间把双方的调度暂存后再一起结算，pending.player 会一直是队首。
      // 所以两个连接各自按 mulliganSubmitted 判断自己要不要交，而不是等 pending.player。
      if (v.pending?.mode === 'mulligan') {
        if (seat && seat !== 'spectator' && v.mulliganSubmitted !== true) {
          const r = await api('POST', '/api/submit', {
            connId,
            code,
            action: { kind: 'MULLIGAN', player: seat, put: [] },
          })
          console.log(`#${step} ${label} ${seat} MULLIGAN -> ok=${r.json.ok}`)
          acted = true
        }
        continue
      }
      if (v.pending?.player === seat && Array.isArray(v.legalActions) && v.legalActions.length > 0) {
        const action =
          v.legalActions.find((a) => !['PASS', 'END_TURN', 'CONCEDE'].includes(a.kind)) ?? v.legalActions[0]
        const r = await api('POST', '/api/submit', { connId, code, action })
        console.log(`#${step} ${label} ${seat} ${action.kind} -> ok=${r.json.ok}`)
        acted = true
      }
    }
    const chk = await view(P1, code)
    if (chk.pending?.mode === 'gameover') {
      result = `gameover · winner=${chk.pending.winner}`
      break
    }
    if (!acted) {
      result = '双方都无可提交动作'
      break
    }
  }
  console.log('---')
  console.log(`result=${result}`)
} catch (e) {
  console.log(`房间客户端未能完成（服务端是否已在 127.0.0.1:${PORT} 启动？）：${String(e)}`)
  process.exitCode = 1
}
