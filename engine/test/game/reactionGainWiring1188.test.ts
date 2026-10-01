import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { installProviders } from '../../data/gameDeps'
import { checkTrigger } from '../../src/dsl/trigger'
import { makeDianaDuelTrigger } from '../../data/cards/diana-core'
import { makeGhostBayTrigger } from '../../data/cards/battlefields-diana'
import { makeGuardActivateItem, guardSoldierTag } from '../../data/cards/SFD-154'                       

                                              
                                                   
                                                                     
                         
                                    
                                                  
                                                                   
                                                             
                                        
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = asZoneId('base:P1')

const mk = (oid: string, defId: string, tapped: boolean, zone = BASE): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone,
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'],
  damage: 0, counters: {}, status: tapped ? { tapped: true } : {},
} as unknown as GameObject)

                                 
function board(carrier: string, tapped: boolean, extra: readonly GameObject[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objs: Record<string, GameObject> = { carrier: mk('carrier', carrier, tapped) }
  for (const o of extra) objs[String(o.oid)] = o
  const z = base.zones[BASE]!
  const inBase = [asObjId('carrier'), ...extra.filter((o) => o.zone === BASE).map((o) => o.oid)]
  return {
    ...base,
    objects: { ...base.objects, ...objs },
    zones: { ...base.zones, [BASE]: { ...z, contents: inBase } },
    runePools: { ...base.runePools, [P1]: { mana: 0, runes: {} } },
  } as unknown as GameState
}

type Ask2 = { nextChoice: (s: GameState, chosen: Readonly<Record<string, string>>) => unknown }

describe('★1188 接点 2/10:UNL-079 黛安娜「支付 1 法力洞察」', () => {
                                                                  
                                                                   
                                                     
                                                    
                                                                  
  const DUEL_BF = asZoneId('battlefield:shared:0')
  const ask = (st: GameState): boolean =>
    checkTrigger(
      makeDianaDuelTrigger(asObjId('diana'), P1, () => true),
      { kind: 'duelStart', battlefield: String(DUEL_BF) } as never, st, P1)

  test('★★★★★★【接线生效】池 0 但场上有未横置的能量炮台 ⇒ 会问要不要支付', () => {
    installProviders()
    const st = board('OGN-098', false, [mk('diana', 'UNL-079', false, DUEL_BF)])
    expect(canPayFromState(st, P1, { mana: 1 }), '★前提自证:旧判据说付不起').toBe(false)
    expect(couldPayWithReactionGains(st, P1, { mana: 1 }), '★谓词说凑得出').toBe(true)
    expect(ask(st), '★⇒ 触发必须入链(玩家才问得到)').toBe(true)
  })

  test('★★★★★【别推广过头】能量炮台已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-098', true, [mk('diana', 'UNL-079', false, DUEL_BF)])), '★[E] 已横置就发不动').toBe(false)
  })
})

describe('★1188 接点 3/10:UNL-214 鬼影湾「支付 1 法力召休眠符文」', () => {
                                                                  
                                                                   
                                                 
                                                     
                                                         
                                                                 
                                               
  const BF = 'battlefield:shared:0'
  const UNIT = 'OGN-012'                                                   
  const ask = (st: GameState): boolean =>
    checkTrigger(makeGhostBayTrigger(BF, P1),
      { kind: 'zoneChange', obj: asObjId('u1'), from: BF, to: `hand:${P1}`, defId: UNIT } as never, st, P1)

  test('★★★★★★【接线生效】池 0 但场上有未横置的能量炮台 ⇒ 会问要不要支付', () => {
    installProviders()
    const st = board('OGN-098', false)
    expect(canPayFromState(st, P1, { mana: 1 }), '★前提自证:旧判据说付不起').toBe(false)
    expect(couldPayWithReactionGains(st, P1, { mana: 1 }), '★谓词说凑得出').toBe(true)
    expect(ask(st), '★⇒ 触发必须入链(玩家才问得到)').toBe(true)
  })

  test('★★★★★【别推广过头】能量炮台已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-098', true)), '★[E] 已横置就发不动').toBe(false)
  })
})

describe('★1188 接点 4/10:SFD-154 护驾!「支付一枚黄 pip 让黄沙士兵活跃」', () => {
                                                          
  const soldier = (): GameObject => ({ ...mk('soldier', 'token:黄沙士兵', false), counters: { [guardSoldierTag(asObjId('guard'))]: 1 }, status: { dormant: true } } as GameObject)                    
  const ask = (st: GameState): unknown =>
    (makeGuardActivateItem(asObjId('guard'), P1) as unknown as Ask2).nextChoice(st, {})

  test('★★★★★★【接线生效】池 0 但场上有未横置的**团结之印** ⇒ 会问要不要支付', () => {
    installProviders()
                                                                                  
    const st = board('OGN-245', false, [soldier()])
    expect(ask(st), '★⇒ nextChoice 必须给候选').not.toBeNull()
  })

  test('★★★★★【别推广过头】团结之印已横置 ⇒ 仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-245', true, [soldier()]))).toBeNull()
  })

  test('★★★★【载体类型要对得上】只有产 mana 的能量炮台 ⇒ 凑不出黄 pip,仍然不问', () => {
    installProviders()
    expect(ask(board('OGN-098', false, [soldier()])), '★★这一条同时是 ★1187 那个坑的回归闸').toBeNull()
  })
})
