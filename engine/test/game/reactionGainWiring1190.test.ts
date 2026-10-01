import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { canPayFromState } from '../../src/game/economy'
import { installProviders } from '../../data/gameDeps'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { UNL_054_SPEC, UNL_054_PREFIX, UNL_054_DEST_KEY, UNL_054_PATROL_PAY } from '../../data/cards/UNL-054'
import { PATROL_SURCHARGE } from '../../data/cards/UNL-163'
import { makeSFD136Spec, SFD_136_PAY_KEY, SFD_136_PAY_YES, SFD_136_RANSOM } from '../../data/cards/SFD-136'
import { addCosts } from '../../src/state/runePool'

                                               
                                            
                                                            
                                                          
                                                
  
                                         
                                                           
                                                       
                                              
                                                      
                                                                   
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE1 = asZoneId('base:P1')
const BASE2 = asZoneId('base:P2')
const BF0 = 'battlefield:shared:0'

const mk = (oid: string, defId: string, tapped: boolean, zone: string, ctrl = P1): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'],
  damage: 0, counters: {}, status: tapped ? { tapped: true } : {},
} as unknown as GameObject)

                                 
function withObjects(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  for (const o of objs) objects[String(o.oid)] = o
  const zones: Record<string, unknown> = { ...base.zones }
  for (const zid of [String(BASE1), String(BASE2), BF0]) {
    const z = base.zones[zid as never] as { contents?: unknown } | undefined
    if (!z) continue
    zones[zid] = { ...z, contents: objs.filter((o) => String(o.zone) === zid).map((o) => o.oid) }
  }
  return {
    ...base, objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 0, runes: {} }, [P2]: { mana: 0, runes: {} } },
  } as unknown as GameState
}

                                                               
                                             
function patrolBoard(sigils: number, tapped: boolean): GameState {
  return withObjects([
    ...Array.from({ length: sigils }, (_, i) => mk(`s${i}`, 'OGN-040', tapped, String(BASE1))),
    mk('patrol', 'UNL-163', false, BF0, P2), // 「我所在的战场」——巡管就站在落点那格
    mk('e0', 'BLK', false, String(BASE2), P2),
    mk('e1', 'BLK', false, String(BASE2), P2),
    mk('e2', 'BLK', false, String(BASE2), P2),
  ])
}

const ONE_PIP = PATROL_SURCHARGE
const TWO_PIPS = addCosts(PATROL_SURCHARGE, PATROL_SURCHARGE)

                                             
const askPatrol = (st: GameState, picked: readonly string[], extra: Record<string, string> = {}): unknown => {
  const chosen: Record<string, string> = { [UNL_054_DEST_KEY]: BF0, ...extra }
  picked.forEach((oid, i) => { chosen[`${UNL_054_PREFIX}${i}`] = oid })
  chosen[`${UNL_054_PREFIX}${picked.length}`] = MULTI_SELECT_DONE
  return UNL_054_SPEC.makeNextChoice!({ movedCardOid: asObjId('spell0'), controller: P1 } as never)(st, chosen)
}

describe('★1190 接点 9/10:UNL-054 搜魔人巡管「除第一名外每名额外支付一枚任意符能」', () => {
  test('★★★★★★【接线生效】池 0 但基地有一张未横置的黄之印 ⇒ 第 2 名会被问', () => {
    installProviders()
    const st = patrolBoard(1, false)
    expect(canPayFromState(st, P1, ONE_PIP), '★前提自证:旧判据说这一枚付不起').toBe(false)
    expect(askPatrol(st, ['e0', 'e1']), '★⇒ 循环里那道门必须放行').not.toBeNull()
  })

  test('★★★★★【别推广过头】之印已横置 ⇒ 仍然不问(continue 到底 ⇒ null)', () => {
    installProviders()
    expect(askPatrol(patrolBoard(1, true), ['e0', 'e1'])).toBeNull()
  })

  test('⭐⭐⭐⭐⭐⭐⭐【累积费用 · 只有一张之印】第 2 名已答 yes ⇒ 第 3 名要两枚,不问', () => {
    installProviders()
    const st = patrolBoard(1, false)
    expect(canPayFromState(st, P1, TWO_PIPS)).toBe(false)
    expect(
      askPatrol(st, ['e0', 'e1', 'e2'], { [`${UNL_054_PATROL_PAY}e1`]: 'yes' }),
      '★★这一条守的是「cost 逐名累加、capacity 不重复算」—— 同一张之印不许发给每一名',
    ).toBeNull()
  })

  test('⭐⭐⭐⭐⭐⭐【累积费用 · 摆够两张】同样的问链 ⇒ 第 3 名就问得出来', () => {
    installProviders()
    expect(
      askPatrol(patrolBoard(2, false), ['e0', 'e1', 'e2'], { [`${UNL_054_PATROL_PAY}e1`]: 'yes' }),
      '★与上一条只差【之印张数】这一个变量 ⇒ 上一条的红不是被别的东西挡的',
    ).not.toBeNull()
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【全族共用防线】答了 yes 但真付不出 ⇒ 一条 spend 也不发(不许白嫖)', () => {
    installProviders()
    const st = patrolBoard(1, false)
    const chosen: Record<string, string> = {
      [`${UNL_054_PREFIX}0`]: 'e0', [`${UNL_054_PREFIX}1`]: 'e1',
      [`${UNL_054_PREFIX}2`]: MULTI_SELECT_DONE,
      [UNL_054_DEST_KEY]: BF0, [`${UNL_054_PATROL_PAY}e1`]: 'yes',
    }
    const evs = UNL_054_SPEC.makeResolve!({ controller: P1 } as never)(st, chosen) as readonly { kind: string }[]
    expect(
      evs.filter((e) => e.kind === 'spend').length,
      '★★结算侧那道【窄】判据 canPayFromState 一字不许放宽 —— 放宽了就是印钞',
    ).toBe(0)
  })
})

                                                            
const SPEC136 = makeSFD136Spec(() => ['item0'])

                             
function ransomState(objs: readonly GameObject[]): GameState {
  const st = withObjects(objs)
  return { ...st, chain: [{ id: 'item0', controller: P2 }] } as unknown as GameState
}

const askRansom = (st: GameState): { candidates: readonly { id: string }[] } | null =>
  SPEC136.makeNextChoice!({ movedCardOid: asObjId('spell0'), target: 'item0' } as never)(st, {}) as never

const hasPay = (q: { candidates: readonly { id: string }[] } | null): boolean =>
  (q?.candidates ?? []).some((c) => c.id === SFD_136_PAY_YES)

describe('★1190 接点 10/10:SFD-136 强买强卖(候选项形态 + 第 2 参是 victim)', () => {
  test('★★★★★★【接线生效】victim 池 0 但他场上两张未横置能量炮台 ⇒ 候选里给出「支付」', () => {
    installProviders()
    const st = ransomState([
      mk('g0', 'OGN-098', false, String(BASE2), P2),
      mk('g1', 'OGN-098', false, String(BASE2), P2), // 赎金是 {mana:2} ⇒ 要两张
    ])
    expect(canPayFromState(st, P2, SFD_136_RANSOM), '★前提自证:旧判据说 victim 付不起').toBe(false)
    expect(hasPay(askRansom(st)), '★⇒ 候选里必须有「支付」这一项').toBe(true)
  })

  test('★★★★★【别推广过头】victim 一张载体也没有 ⇒ 候选里只剩「不支付」', () => {
    installProviders()
    expect(hasPay(askRansom(ransomState([])))).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐【问谁就算谁的盘面】炮台在【打出者】手里、victim 一张没有 ⇒ 仍然不给「支付」', () => {
    installProviders()
    const st = ransomState([
      mk('g0', 'OGN-098', false, String(BASE1), P1),
      mk('g1', 'OGN-098', false, String(BASE1), P1),
    ])
    expect(
      hasPay(askRansom(st)),
      '★★这一条守的是谓词第 2 参传的是 victim 不是 controller —— 传错了这里会假绿',
    ).toBe(false)
  })

  test('★★★★★【数量要够】victim 只有一张炮台 ⇒ 凑不满 {2},仍然不给「支付」', () => {
    installProviders()
    expect(hasPay(askRansom(ransomState([mk('g0', 'OGN-098', false, String(BASE2), P2)])))).toBe(false)
  })

  test('⭐⭐⭐⭐⭐⭐⭐⭐【全族共用防线】答了「支付」但真付不出 ⇒ 走无效化,绝不发 spend', () => {
    installProviders()
    const st = ransomState([
      mk('g0', 'OGN-098', false, String(BASE2), P2),
      mk('g1', 'OGN-098', false, String(BASE2), P2),
    ])
    const evs = SPEC136.makeResolve!({ target: 'item0' } as never)(st, { [SFD_136_PAY_KEY]: SFD_136_PAY_YES }) as readonly { kind: string }[]
    expect(evs.map((e) => e.kind), '★★「付不起就两头落空」是这张卡头注点名的坑').toEqual(['negate'])
  })
})
