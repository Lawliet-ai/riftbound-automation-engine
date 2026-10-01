import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { canPayFromState } from '../../src/game/economy'
import { installProviders } from '../../data/gameDeps'
import { checkTrigger } from '../../src/dsl/trigger'                          
import { makeEnergyHubTrigger, makeEmperorAltarTrigger, SFD_214_COST, SFD_207_COST } from '../../data/cards/battlefields-extra'
import { makeNocturneTrigger, NOCTURNE_BANISH } from '../../data/cards/OGN-194'
import { makeGrenadeReplayItem } from '../../data/cards/UNL-020'
import { PATROL_SURCHARGE } from '../../data/cards/UNL-163'

                                            
                                                                     
                                                     
                                                        
                                                                      
                                                           
                                                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = asZoneId('base:P1')
const BF0 = 'battlefield:shared:0'

const mk = (oid: string, defId: string, tapped: boolean, zone = BASE): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone,
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'],
  damage: 0, counters: {}, status: tapped ? { tapped: true } : {},
} as unknown as GameObject)

                                           
function board(carrier: string, tapped: boolean, n = 1, extra: readonly GameObject[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const carriers = Array.from({ length: n }, (_, i) => mk(`c${i}`, carrier, tapped))
  const objs: Record<string, GameObject> = {}
  for (const o of [...carriers, ...extra]) objs[String(o.oid)] = o
  const z = base.zones[BASE]!
  const inBase = [...carriers.map((o) => o.oid), ...extra.filter((o) => o.zone === BASE).map((o) => o.oid)]
  const zones: Record<string, unknown> = { ...base.zones, [BASE]: { ...z, contents: inBase } }
  const onBf = extra.filter((o) => String(o.zone) === BF0)
  if (onBf.length > 0) {
    const bz = base.zones[BF0 as never]!
    zones[BF0] = { ...bz, contents: onBf.map((o) => o.oid) }
  }
  return {
    ...base, objects: { ...base.objects, ...objs }, zones,
    runePools: { ...base.runePools, [P1]: { mana: 0, runes: {} } },
  } as unknown as GameState
}

type Ask3 = { nextChoice: (s: GameState, ev: unknown, chosen: Readonly<Record<string, string>>) => unknown }
type Ask2 = { nextChoice: (s: GameState, chosen: Readonly<Record<string, string>>) => unknown }

describe('★1189 接点 5/10:SFD-214 能量枢纽「支付 4 点任意符能 +1 分」', () => {
                                                                  
                                                                   
                                                 
                                                                   
  const HOLD = { kind: 'hold', player: P1, battlefield: BF0 } as never
  const ask = (st: GameState): boolean => checkTrigger(makeEnergyHubTrigger(BF0, P1), HOLD, st, P1)

  test('★★★★★★【接线生效】池 0 但场上有 **4 张**未横置的六色之印 ⇒ 会问要不要支付', () => {
    installProviders()
    const st = board('OGN-040', false, 4)                               
    expect(canPayFromState(st, P1, SFD_214_COST), '★前提自证:旧判据说付不起').toBe(false)
    expect(ask(st), '★⇒ 触发必须入链(玩家才问得到)').toBe(true)
  })

  test('★★★★★【别推广过头】4 张全已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-040', true, 4)), '★[E] 已横置就发不动').toBe(false)
  })

  test('★★★★【数量要够】只有 3 张之印 ⇒ 凑不满 4 点,仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-040', false, 3)), '★★这一条守的是「累加量真的算对了」').toBe(false)
  })
})

describe('★1189 接点 6/10:SFD-207 帝王神坛「支付 1 法力换黄沙士兵」', () => {
                                                                  
                                                             
                                                                   
                                                
                                                           
                                                     
  const unitAtBf = (): GameObject => mk('u0', 'BLK', false, asZoneId(BF0))
  const CONQUER = { kind: 'conquer', player: P1, battlefield: BF0 } as never
  const ask = (st: GameState): boolean => checkTrigger(makeEmperorAltarTrigger(BF0, P1), CONQUER, st, P1)

  test('★★★★★★【接线生效】池 0 但场上有未横置的能量炮台 ⇒ 会问要不要支付', () => {
    installProviders()
    const st = board('OGN-098', false, 1, [unitAtBf()])
    expect(canPayFromState(st, P1, { mana: SFD_207_COST }), '★前提自证:旧判据说付不起').toBe(false)
    expect(ask(st), '★⇒ 触发必须入链(玩家才问得到)').toBe(true)
  })

  test('★★★★★【别推广过头】能量炮台已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-098', true, 1, [unitAtBf()])), '★[E] 已横置就发不动').toBe(false)
  })

  test('★★★★【第二道费用门照样在】此处没有我控单位 ⇒ 仍然不问(★1494 搬进 `when` 之后)', () => {
    installProviders()
    expect(ask(board('OGN-098', false, 1)), '★★费用第二半「让一名单位返手」付不出 ⇒ 不入链').toBe(false)
  })
})

describe('★1189 接点 7/10:OGN-194 魔腾「支付 1 点任意符能把我打出」', () => {
  const SELF = asObjId('noc')
                                           
  const ask = (st: GameState): unknown =>
    (makeNocturneTrigger(SELF, P1) as unknown as Ask3).nextChoice(st, {}, { [NOCTURNE_BANISH]: 'yes' })
  const withNoc = (carrier: string, tapped: boolean): GameState =>
    board(carrier, tapped, 1, [mk('noc', 'OGN-194', false)])

  test('★★★★★★【接线生效】池 0 但场上有未横置的六色之印 ⇒ 会问要不要支付', () => {
    installProviders()
    const st = withNoc('OGN-120', false)
    expect(canPayFromState(st, P1, PATROL_SURCHARGE), '★前提自证').toBe(false)
    expect(ask(st), '★⇒ nextChoice 必须给候选').not.toBeNull()
  })

  test('★★★★★【别推广过头】六色之印已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(withNoc('OGN-120', true))).toBeNull()
  })
})

describe('★1189 接点 8/10:UNL-020 曼舞手雷「支付{A}再打一发」', () => {
                                                                 
  const ask = (st: GameState): unknown =>
    (makeGrenadeReplayItem(asObjId('grenade'), P1, 0) as unknown as Ask2).nextChoice(st, {})

  test('★★★★★★【接线生效】池 0 但场上有未横置的六色之印 ⇒ 会问要不要支付', () => {
    installProviders()
    const st = board('OGN-204', false)
    expect(canPayFromState(st, P1, PATROL_SURCHARGE), '★前提自证').toBe(false)
    expect(ask(st), '★⇒ nextChoice 必须给候选').not.toBeNull()
  })

  test('★★★★★【别推广过头】六色之印已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-204', true))).toBeNull()
  })
})
