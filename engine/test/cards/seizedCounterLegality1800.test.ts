                                                               
                               
  
        
                                                               
                                                               
                       
                                                         
                                                            
  
                                                                        
                                                    
                                                               
import { describe, expect, test } from 'vitest'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps, installProviders } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { ILLEGAL_TARGET, resolveTargetAtThisExecution } from '../../src/loop/spellTargetAtResolve'

installProviders()

type Any = Record<string, any>
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = makeGameDeps(0x1800)
const A_DEF = 'OGN-024'                                  
const B_DEF = 'OGN-093'                                                      
const SEAL = 'OGN-080'                                
const X_LIMIT = 'SFD-045'                                          
const X_ALL = 'OGN-064'                         

                                                                                          
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

const inHandOf = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

const RUNES = { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 }
const POOL = (): unknown => ({ mana: 20, runes: { ...RUNES } })

function scene(objs: readonly GameObject[], active: PlayerId = P2): GameState {
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
    ...s, activePlayer: active, priority: null, phase: 'main', objects, zones,
    runePools: { P1: POOL(), P2: POOL() },
  } as GameState
}

                                                                 
const findPlay = (g: InteractiveGame, player: PlayerId, defId: string, target?: string): Any | undefined =>
  (g.legalActions(player) as unknown as Any[]).find((a) =>
    a.kind === 'PLAY_CARD' && g.state.objects[a.cardOid]?.defId === defId && (target === undefined || a.target === target))

const chainItemIdOf = (g: InteractiveGame, defId: string, owner?: PlayerId): string | null => {
  const s = g.state as Any
  const it = (s.chain as Any[]).find((x) => {
    const o = x.cardOid !== undefined ? s.objects[String(x.cardOid)] : undefined
    return (o?.defId === defId || String(x.sourceDefId) === defId) && (owner === undefined || String(x.controller) === String(owner))
  })
  return it ? String(it.id) : null
}

interface Reading {
  readonly error: string | null
  readonly hitStepCap: boolean
  readonly asked: readonly { key: string; itemId: string; candidates: readonly string[]; answer: string }[]
  readonly rechoose: { candidates: readonly string[]; answer: string } | null
  readonly aItem: string | null
  readonly xItem: string | null
  readonly sealItem: string | null
  readonly bItem: string | null
  readonly tDamage: number
  readonly uDamage: number
  readonly uMight: number
  readonly negateTargets: readonly string[]
  readonly chain: readonly string[]
  readonly sentinelLeak: boolean
}

interface Cfg {
  readonly xDef: string
  readonly withB: boolean
  readonly rechooseAnswer: (cands: readonly string[]) => string
}

function runCase(cfg: Cfg): Reading {
  const extra: GameObject[] = [
    obj('T', 'BLK', P1, 'battlefield:shared:1', { baseMight: 6 }),
    obj('U', 'BLK', P2, 'battlefield:shared:0', { baseMight: 6 }),
    inHandOf('a', A_DEF, P2),
    inHandOf('seal', SEAL, P2),
  ]
  if (cfg.withB) extra.push(inHandOf('b', B_DEF, P1))
  extra.push(inHandOf('x', cfg.xDef, P1))
  const g = new InteractiveGame(recomputeContinuous(scene(extra)), DEPS)
  const asked: { key: string; itemId: string; candidates: string[]; answer: string }[] = []
  let error: string | null = null
  let hitStepCap = false
  let rechoose: { candidates: readonly string[]; answer: string } | null = null
  let aItem: string | null = null
  let xItem: string | null = null
  let sealItem: string | null = null
  let bItem: string | null = null
  let xPlayed = false
  let sealPlayed = false
  let bPlayed = false
  try {
    const aAct = findPlay(g, P2, A_DEF, 'T')
    if (aAct === undefined) throw new Error('找不到 A 的打出动作')
    g.apply(aAct as never)
    aItem = chainItemIdOf(g, A_DEF, P2)
    let i = 0
    for (; i < 200; i++) {
      const p = g.pending() as Any
      if (p.mode === 'choice') {
        const req = p.request as Any
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const key = String(req.key)
        let ans = cands[0] ?? ''
        if (key === 'rechoose') {
          ans = cfg.rechooseAnswer(cands)
          if (!cands.includes(ans)) ans = cands[0] ?? ''
          rechoose = { candidates: cands, answer: ans }
        }
        asked.push({ key, itemId: String(req.itemId), candidates: cands, answer: ans })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        continue
      }
      if (p.mode !== 'window') break
      const player = p.player as PlayerId
      if (String(player) === 'P1') {
        if (cfg.withB && !bPlayed) {
          const act = findPlay(g, P1, B_DEF, 'U')
          if (act) { g.apply(act as never); bItem = chainItemIdOf(g, B_DEF, P1); bPlayed = true; continue }
        }
        if (!xPlayed && aItem !== null) {
          const act = findPlay(g, P1, cfg.xDef, aItem)
          if (act) { g.apply(act as never); xItem = chainItemIdOf(g, cfg.xDef, P1); xPlayed = true; continue }
        }
      }
      if (String(player) === 'P2' && xPlayed && !sealPlayed && xItem !== null) {
        const act = findPlay(g, P2, SEAL, xItem)
        if (act) { g.apply(act as never); sealItem = chainItemIdOf(g, SEAL, P2); sealPlayed = true; continue }
      }
      g.apply({ kind: 'PASS', player: p.player } as never)
    }
    hitStepCap = i >= 200 && ((g.pending() as Any).mode === 'choice' || (g.pending() as Any).mode === 'window')
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  const s = g.state as Any
  const journal = ((g as Any).journal?.entries ?? []) as Any[]
  const t = s.objects['T']
  const u = s.objects['U']
  return {
    error, hitStepCap, asked, rechoose, aItem, xItem, sealItem, bItem,
    tDamage: t?.damage ?? 0,
    uDamage: u?.damage ?? 0,
    uMight: (u?.derived as Any | undefined)?.might ?? u?.baseMight ?? 0,
    negateTargets: journal.filter((e) => String(e.kind) === 'negate').map((e) => String(e.targetOid)),
    chain: (s.chain as Any[]).map((x) => String(x.id)),
    sentinelLeak: JSON.stringify(s).includes(ILLEGAL_TARGET) || JSON.stringify(journal).includes(ILLEGAL_TARGET),
  }
}

                                                                    
describe('★1800 夺控后链项目目标合法性(§359.3.e / §355.9.c)', () => {
                                            
  test('㈠ 极速反制被夺 + 不重选 ⇒ 什么都不做(A 结算,T 吃 4)', () => {
    const r = runCase({ xDef: X_LIMIT, withB: false, rechooseAnswer: () => 'keep' })
    expect(r.error, '无异常').toBeNull()
    expect(r.hitStepCap).toBe(false)
    expect(r.tDamage, 'A 未被无效化 ⇒ T 受伤 4(修前:被夺后照样无效化,伤害 0)').toBe(4)
    expect(r.negateTargets, '没有无效化任何东西').toEqual([])
    expect(r.sentinelLeak, '哨兵零泄漏').toBe(false)
  })

                                            
  test('㈡ 极速反制被夺 + 重选到 P1 指向 P2 单位的法术 ⇒ 无效化那张(B 没结算,U 不受伤)', () => {
    const r = runCase({ xDef: X_LIMIT, withB: true, rechooseAnswer: (c) => c.find((x) => x !== 'keep') ?? 'keep' })
    expect(r.error, '无异常').toBeNull()
    expect(r.hitStepCap).toBe(false)
    expect(r.rechoose, '被夺后重选问出现(造景里 P1 有一张指向 P2 单位的法术)').not.toBeNull()
    expect(r.bItem, 'B 的链项目 id 存在').not.toBeNull()
    expect(r.rechoose!.candidates, '候选含 B').toContain(r.bItem)
    expect(r.uMight, 'B 被无效化 ⇒ U 的战力没被减(若未被无效化会 -4)').toBe(6)
    expect(r.negateTargets, 'negate 的目标恰是 B').toContain(r.bItem)
                                       
    expect(r.tDamage).toBe(4)
    expect(r.sentinelLeak).toBe(false)
  })

                                        
  test('㈢ 重选候选不含自身(§355.9.c):OGN-064 与 SFD-045 各一条', () => {
    const all = runCase({ xDef: X_ALL, withB: false, rechooseAnswer: () => 'keep' })
    expect(all.rechoose, 'OGN-064 重选问出现').not.toBeNull()
    expect(all.xItem, 'X 的链项目 id').not.toBeNull()
    expect(all.rechoose!.candidates, '候选不含 X 自己(修前含)').not.toContain(all.xItem)
    expect(all.rechoose!.candidates, '正防修过头:正在结算的 OGN-080 仍在候选里(只排自身)').toContain(all.sealItem)

    const lim = runCase({ xDef: X_LIMIT, withB: true, rechooseAnswer: () => 'keep' })
    expect(lim.rechoose, 'SFD-045 在被夺后也有重选问(含 B 时)').not.toBeNull()
    expect(lim.rechoose!.candidates, '候选不含 X 自己').not.toContain(lim.xItem)
  })

                                                        
  test('㈣ 正对照:风之障壁被夺 + 不重选 ⇒ 照常无效化 A(T 不受伤)', () => {
    const r = runCase({ xDef: X_ALL, withB: false, rechooseAnswer: () => 'keep' })
    expect(r.error, '无异常').toBeNull()
    expect(r.tDamage, 'A 被无效化 ⇒ T 不受伤').toBe(0)
    expect(r.negateTargets, 'negate 的目标是 A').toContain(r.aItem)
    expect(r.sentinelLeak).toBe(false)
  })

                                             
  test('㈤ 判别力自证:假 spec 说合法 ⇒ resolveTargetAtThisExecution 原样放行;空名单 ⇒ 遮哨兵', () => {
    const g = new InteractiveGame(recomputeContinuous(scene([
      obj('T', 'BLK', P1, 'battlefield:shared:1', { baseMight: 6 }),
      inHandOf('a', A_DEF, P2),
    ])), DEPS)
    const aAct = findPlay(g, P2, A_DEF, 'T')
    g.apply(aAct as never)
    const st = g.state
    const aItem = chainItemIdOf(g, A_DEF, P2)!
                                         
    const alwaysLegal = { legalTargets: () => [aItem] }
    expect(resolveTargetAtThisExecution(alwaysLegal, st, P2, 'cardOid', false, aItem)).toBe(aItem)
                                               
    const neverLegal = { legalTargets: () => [] }
    expect(resolveTargetAtThisExecution(neverLegal, st, P2, 'cardOid', false, aItem)).toBe(ILLEGAL_TARGET)
                                
    expect(resolveTargetAtThisExecution(neverLegal, st, P2, 'cardOid', false, 'play:gone')).toBe('play:gone')
  })
})
