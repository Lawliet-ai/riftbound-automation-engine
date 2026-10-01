   
                                                  
  
                           
                                                         
                                 
                                               
                                   
                                                              
                                                       
                                                               
                                          
  
                      
                    
                                                     
                                             
                                                          
                                             
  
                                                                           
                                                                 
                                               
                                                                        
                                                                          
                                                                          
  
                                                         
                                                     
   
import { describe, expect, test } from 'vitest'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { ChoiceRequest } from '../../src/loop/chain'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { MULTI_SELECT_DONE, multiSelectChoice } from '../../src/loop/multiSelect'
import {
  UNL_192_SPEC, UNL_192_ATTACKER_KEY as AK, UNL_192_TARGETS_PREFIX as TP,
  UNL_192_DROP_PREFIX as DP, unl192LiveTargets, unl192FrozenTargets,
} from '../../data/cards/UNL-192'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
type Any = Record<string, any>

                                                                   
const u = (id: string, ctrl: PlayerId, might: number, zone = BF0): GameObject => ({
  oid: asObjId(id), defId: `U-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

type Chosen = Record<string, string>
const spec = UNL_192_SPEC as unknown as {
  makeConfirmChoice: (c: { movedCardOid: string; controller: PlayerId }) => (s: GameState, ch: Chosen) => ChoiceRequest | null
  makeNextChoice: (c: { movedCardOid: string; controller: PlayerId }) => (s: GameState, ch: Chosen) => ChoiceRequest | null
  makeResolve: (c: { controller: PlayerId; movedCardOid: string }) =>
    (s: GameState, ch?: Chosen) => readonly { kind: string; target?: string; amount?: number }[]
  makeConfirmSignals?: unknown
}
const confirm = (s: GameState, ch: Chosen): ChoiceRequest | null =>
  spec.makeConfirmChoice({ movedCardOid: 'sp', controller: P1 })(s, ch)
const resolve = (s: GameState, ch: Chosen): ChoiceRequest | null =>
  spec.makeNextChoice({ movedCardOid: 'sp', controller: P1 })(s, ch)
const ids = (q: ChoiceRequest | null): string[] => (q?.candidates ?? []).map((c) => c.id)

                                                     
const board = (might: number, foes: readonly string[], late?: string): GameState =>
  scene([u('me', P1, might), ...foes.map((f) => u(f, P2, 5)), ...(late !== undefined ? [u(late, P2, 5)] : [])])

                                                                     
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function richScene(objs: readonly GameObject[], patch: Any = {}): GameState {
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
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `deck${i++}`
    const c = obj(id, 'BLK', p, `mainDeck:${p}`)
    objects[id] = c
    zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
    ...patch,
  } as GameState
}

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const findPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): Any | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target)) ?? null
}

interface AskRec { key: string; isTarget: boolean; candidates: readonly string[] }
interface RunOut { asks: AskRec[]; error: string | null; hitCap: boolean; ledger: number; unitFlag: boolean; targetsOnItem: readonly string[] }
function drive(g: InteractiveGame): RunOut {
  const asks: AskRec[] = []
  let error: string | null = null
  let steps = 0
  let targetsOnItem: readonly string[] = []
  try {
    for (; steps < 200;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        asks.push({ key: String(req.key), isTarget: req.isTarget === true, candidates: (req.candidates ?? []).map((c: Any) => String(c.id)) })
                                            
        const ans = String(req.key) === AK ? 'me' : String((req.candidates as readonly Any[])[0]?.id ?? '')
                                        
        targetsOnItem = ((curState(g).chain as readonly Any[]).find((it) => String(it.id) === String(req.itemId))?.targets ?? []) as readonly string[]
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        steps++
        continue
      }
      if (raw.mode === 'window') { g.apply({ kind: 'PASS', player: raw.player } as never); steps++; continue }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  const st = curState(g)
  const led = st.enemyTargetedThisTurn as Record<string, { spell: number }> | undefined
  return {
    asks, error, hitCap: steps >= 200,
    ledger: led?.P1?.spell ?? 0,
    unitFlag: (st.chosenEnemyUnitThisTurn as Record<string, boolean> | undefined)?.P1 === true,
    targetsOnItem,
  }
}

                                                                           
describe('★1806b ①㈠ 冻结 2 个 ⇒ 结算期只在这 2 个之间分(响应期新进场的选不到)', () => {
  test('🔴 结算期候选【恰好】是冻结的那 2 个,`late` 虽在场也进不来', () => {
    const s = board(3, ['e1', 'e2'], 'late')
    const q = resolve(s, { [AK]: 'me', [`${TP}0`]: 'e1', [`${TP}1`]: 'e2' })
    expect(q, '★有冻结 ⇒ 问得出').not.toBeNull()
    expect(ids(q).sort(), '★★★late(响应期进场)选不到').toEqual(['e1', 'e2'])
  })

  test('🔴 冻结集合为空(确认期答 0 的旧缺陷形状)⇒ 候选空、这一问收尾 —— **不回落现算**', () => {
    const s = board(3, ['e1', 'e2'], 'late')
    expect(resolve(s, { [AK]: 'me' }), '★★★修前这里回落到全场敌方 e1/e2/late').toBeNull()
                                                 
    expect(ids(resolve(s, { [AK]: 'me', [`${TP}0`]: 'e2' })), '★冻结谁就只给谁').toEqual(['e2'])
  })
})

describe('★1806c ① 三档分野:minPicks(分摊)vs required(进行 N 次)vs 任意数量', () => {
  test('🔴㈠ 有 2 名合法敌方、伤害 3:第一问【无】「够了」;答 1 个后第二问【有】;答它 ⇒ 只 1 个目标吃满 3 点', () => {
                                                            
                                                          
                                                                     
    const s = board(3, ['e1', 'e2'])
    const q1 = confirm(s, { [AK]: 'me' })
    expect(ids(q1), '★★★有合法敌方 ⇒ 不能选 0 ⇒ 第一问【无】退出口(§355.16 / §402.4.b)').not.toContain(MULTI_SELECT_DONE)
    expect(ids(q1).sort(), '★第一问:候选就是两名敌方').toEqual(['e1', 'e2'])
    const ch1: Chosen = { [AK]: 'me', [`${TP}0`]: 'e1' }
    const q2 = confirm(s, ch1)
    expect(ids(q2), '★答 1 个(达 minPicks)之后 ⇒ 第二问【有】退出口(§355.14.c「可以少于」)').toContain(MULTI_SELECT_DONE)
                                                      
    const done: Chosen = { ...ch1, [`${TP}1`]: MULTI_SELECT_DONE }
    expect(unl192FrozenTargets(done), '★冻结点到 e1 为止').toEqual(['e1'])
    const evs = spec.makeResolve({ controller: P1, movedCardOid: 'sp' })(s, {
      ...done, 'UNL-192:hit0': 'e1', 'UNL-192:hit1': 'e1', 'UNL-192:hit2': 'e1',
    })
    const dmg = evs.filter((e) => e.kind === 'damage')
    expect(dmg.map((e) => [String(e.target), e.amount]), '★只 e1 吃满 3 点(允许少于 max)').toEqual([['e1', 3]])
  })

  test('🔴㈡ 选满 2 个 ⇒ 分配问正常(§355.14.e)', () => {
    const s = board(3, ['e1', 'e2'])
    const ch: Chosen = { [AK]: 'me', [`${TP}0`]: 'e1', [`${TP}1`]: 'e2' }
    expect(unl192FrozenTargets(ch)).toEqual(['e1', 'e2'])
    expect(resolve(s, ch)?.key?.startsWith('UNL-192:hit'), '★确认期问完 ⇒ 直接进逐点分配').toBe(true)
  })

  test('★㈢ 0 名合法敌方 ⇒ ★1815 必选空候选 req(不再自然收尾 `null`),不抛错', () => {
    const s = scene([u('me', P1, 3)])
    expect(() => confirm(s, { [AK]: 'me' }), '★候选耗尽 ⇒ 不抛错').not.toThrow()
                                                                             
                                                                   
    const q = confirm(s, { [AK]: 'me' })
    expect(q?.key, '★键形与 multiSelect 首问一致(让 drain 哨兵路径接住)').toBe(`${TP}0`)
    expect(q?.candidates, '★空候选(§355.8 问不出)').toEqual([])
  })

  test('★㈣ `required` 的老用户(现算:OGN-029 星落 / OGN-248 艾卡西亚暴雨)行为逐字节不变', () => {
                                                                            
    const ask = multiSelectChoice({
      itemId: 't', controller: P1, prefix: 'x:', prompt: 'p', max: 2, required: true,
      candidates: () => [{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }],
    })
    const st = scene([u('me', P1, 3)])
    expect(ask(st, {})!.candidates.map((c) => c.id), '★第一问不给 DONE(强制选满)').toEqual(['a', 'b'])
    expect(ask(st, { 'x:0': 'a' })!.candidates.map((c) => c.id), '★选了一个仍不给 DONE(max 还没满)').toEqual(['b'])
    expect(ask(st, { 'x:0': 'a', 'x:1': 'b' }), '★选满 max ⇒ 收尾').toBeNull()
  })

  test('★攻击者那一问不受影响(它是单选,不是 multiSelect)', () => {
    const q = confirm(board(3, ['e1']), {})
    expect(q?.key).toBe(AK)
    expect(ids(q)).toContain('me')
  })
})

                                                                           
describe('★1806d 接线闸:走【真规格】(`UNL_192_SPEC.makeConfirmChoice` = 上面的 `confirm`)的第一问无「够了」', () => {
                                     
                                                                      
                                                                          
                                              
                                              
                                                    
                                                                    
  test('🔴㈠ 真规格:场上 2 名合法敌方、友方战力 3 ⇒ 目标问第一问 `ids(q1)` **不含** `MULTI_SELECT_DONE`', () => {
    const s = board(3, ['e1', 'e2'])
    const q1 = confirm(s, { [AK]: 'me' })
    expect(q1?.key, '★真规格确实进了目标问(不是攻击者那一问)').toBe(`${TP}0`)
    expect(ids(q1), '★★★接线:UNL-192 真的接了 `minPicks: 1` ⇒ 有合法候选时第一问【无】退出口').not.toContain(MULTI_SELECT_DONE)
  })

  test('🔴㈡ 真规格:答 1 个之后,第二问 `ids(q2)` **含** `MULTI_SELECT_DONE`(§355.14.c「可以少于」)', () => {
    const s = board(3, ['e1', 'e2'])
    const q2 = confirm(s, { [AK]: 'me', [`${TP}0`]: 'e1' })
    expect(q2?.key).toBe(`${TP}1`)
    expect(ids(q2), '★接线:达到 `minPicks` 下限后才给「够了」(不是 `required` 那种【永不给】)').toContain(MULTI_SELECT_DONE)
  })

  test('🔴㈢ 真规格:答「够了」⇒ 冻结组只有那 1 个,结算期只在它身上分配', () => {
                                                  
                                      
    const s = board(3, ['e1', 'e2'])
    const done: Chosen = { [AK]: 'me', [`${TP}0`]: 'e1', [`${TP}1`]: MULTI_SELECT_DONE }
    expect(unl192FrozenTargets(done), '★真规格答「够了」⇒ 冻结点到 e1 为止').toEqual(['e1'])
    const evs = spec.makeResolve({ controller: P1, movedCardOid: 'sp' })(s, {
      ...done, 'UNL-192:hit0': 'e1', 'UNL-192:hit1': 'e1', 'UNL-192:hit2': 'e1',
    })
    expect(evs.filter((e) => e.kind === 'damage').map((e) => [String(e.target), e.amount]),
      '★结算期只在冻结的那 1 个身上分配(§355.14.c「可以少于」)').toEqual([['e1', 3]])
  })
})

describe('★1806b ①㈢ §355.14.h 那条口仍在(目标多于伤害 ⇒ 掉目标)', () => {
  test('🔴 冻结 3、伤害 2 ⇒ 先问「哪个不再是目标」,候选是冻结集合(无退出口)', () => {
    const ch: Chosen = { [AK]: 'me', [`${TP}0`]: 'e1', [`${TP}1`]: 'e2', [`${TP}2`]: 'e3' }
    expect(unl192LiveTargets(ch)).toEqual(['e1', 'e2', 'e3'])
    const q = resolve(board(2, ['e1', 'e2', 'e3']), ch)
    expect(q?.key).toBe(`${DP}0`)
    expect(ids(q).sort()).toEqual(['e1', 'e2', 'e3'])
    expect(ids(q), '★required ⇒ 不给「够了」档(少掉一个就有目标吃 0 点)').not.toContain(MULTI_SELECT_DONE)
                                               
    const after: Chosen = { ...ch, [`${DP}0`]: 'e1' }
    expect(unl192LiveTargets(after), '★留存恰好 = budget(2)').toEqual(['e2', 'e3'])
    expect(resolve(board(2, ['e1', 'e2', 'e3']), after)?.key?.startsWith(DP), '★不许再掉第二个(h.1)').toBe(false)
  })

  test('★伤害够 ⇒ 那条口不发(冻结数 ≤ 伤害数,直接进分配)', () => {
    const ch: Chosen = { [AK]: 'me', [`${TP}0`]: 'e1', [`${TP}1`]: 'e2', [`${TP}2`]: 'e3' }
    const q = resolve(board(3, ['e1', 'e2', 'e3']), ch)
    expect(q?.key?.startsWith(DP), '★不先问掉目标').toBe(false)
    expect(q?.key?.startsWith('UNL-192:hit'), '★直接进逐点分配').toBe(true)
  })
})

describe('★1815 ①㈣ 没有合法敌方单位 ⇒ 枚举侧【已拦住】+ 直发容忍(缺陷 287)', () => {
  test('🔴 现状:**不再列出**(确认期目标问必选空 ⇒ DFS 判死)', () => {
                                                               
                                                                       
                                                                               
                                              
    const g = new InteractiveGame(richScene([
      obj('me', 'BLK', P1, BF0, { baseMight: 3, status: { ready: true } } as never),
      inHand('sp', 'UNL-192', P1),
    ]), makeGameDeps(0x1806) as never)
    expect(findPlay(g, P1, 'sp'), '★无合法敌方 ⇒ 不列出(反转:旧行为仍列出)').toBeNull()
  })

  test('🔴 直发容忍:绕过枚举直发(有友方战力≥1、无敌方)⇒ 空候选当 null 收尾、链走完、零伤害、无死循环', () => {
                                                                                   
    const full = new InteractiveGame(richScene([
      obj('me', 'BLK', P1, BF0, { baseMight: 3, status: { ready: true } } as never),
      obj('e1', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('sp', 'UNL-192', P1),
    ]), makeGameDeps(0x1806) as never)
    const play = findPlay(full, P1, 'sp')
    expect(play, '★前提:全盘下列得出').toBeTruthy()
                                      
    const g = new InteractiveGame(richScene([
      obj('me', 'BLK', P1, BF0, { baseMight: 3, status: { ready: true } } as never),
      inHand('sp', 'UNL-192', P1),
    ]), makeGameDeps(0x1806) as never)
    g.apply({ ...(play as Any), player: P1 } as never)
    const R = drive(g)
    expect(R.error, `直发运行异常:${R.error}`).toBeNull()
    expect(R.hitCap, '★不死循环').toBe(false)
    expect(R.asks.filter((a) => a.key.startsWith(TP)), '★空候选确认问被 drainEmptyConfirmAsk 当 null 收尾、不外泄').toEqual([])
    expect(R.asks.filter((a) => a.key.startsWith('UNL-192:hit')).length, '★冻结空 ⇒ 零伤害 ⇒ 不问分配').toBe(0)
    expect(R.ledger, '★没有敌方目标 ⇒ 账本一条都没有(哨兵没被当目标发信号)').toBe(0)
  })
})

describe('★1806b ② 确认期目标那一问标 `isTarget`(答案进 targets、各发一条 targeted)', () => {
  test('🔴 目标问 `isTarget === true`;统计上「选了几个冻结目标」就「发了账几次」', () => {
    const g = new InteractiveGame(richScene([
      obj('me', 'BLK', P1, BF0, { baseMight: 3, status: { ready: true } } as never),
      obj('e1', 'BLK', P2, BF0, { baseMight: 9 }),
      obj('e2', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('sp', 'UNL-192', P1),
    ]), makeGameDeps(0x1806) as never)
    const play = findPlay(g, P1, 'sp')
    expect(play).toBeTruthy()
    g.apply(play as never)
    const R = drive(g)
    expect(R.error).toBeNull()
    const tgtAsks = R.asks.filter((a) => a.key.startsWith(TP))
    expect(tgtAsks.length, '★冻结 2 个(预算 3、敌方 2)').toBe(2)
    expect(tgtAsks.every((a) => a.isTarget), '★★§355.14.a/.b:目标问必须标 isTarget').toBe(true)
                                                                                      
                                                  
    expect([...R.targetsOnItem].sort(), '★答案进了链项目的 targets(§758.1 复验的前提)').toEqual(['e1', 'e2', 'me'])
    expect(R.unitFlag, '★§727 账「选过敌方单位」也记上').toBe(true)
  })
})

describe('★1806b ③ 撤掉手发信号 ⇒ 同一目标【恰一条】targeted(不再双发)', () => {
  test('🔴 规格层:`UNL_192_SPEC.makeConfirmSignals` **未接线**(撤掉手发那一份)', () => {
    expect(UNL_192_SPEC.makeConfirmSignals, '★③ 撤掉本卡手发信号').toBeUndefined()
  })

  test('🔴 e2e:冻结 2 个敌方 ⇒ 账本 spell 恰好 2(不是 4)', () => {
                                                                       
    const g = new InteractiveGame(richScene([
      obj('me', 'BLK', P1, BF0, { baseMight: 3, status: { ready: true } } as never),
      obj('e1', 'BLK', P2, BF0, { baseMight: 9 }),
      obj('e2', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('sp', 'UNL-192', P1),
    ]), makeGameDeps(0x1806) as never)
    const play = findPlay(g, P1, 'sp')
    g.apply(play as never)
    const R = drive(g)
    expect(R.error).toBeNull()
    expect(R.ledger, '★★★同一目标恰一条:2 个目标 ⇒ spell 桶 2 次').toBe(2)
  })
})
