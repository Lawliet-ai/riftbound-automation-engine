import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { seedRunes, canPayFromState } from '../../src/game/economy'
import {
  OGN_268_SPEC, OGN_268_CARD_EFFECT, OGN_268_AMOUNT_KEY, OGN_268_PLACE_KEY,
  barrageCost, maxBarrage, barragePlaces, barrageVictims,
} from '../../data/cards/OGN-268'

                                             
                                             
                                       
  
                 
                                                                         
                                                               
                                                           
                                                          
                                                              
                                                        
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 9, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

   
            
                                                   
                                   
                            
   
function scene(runes = 3): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('foeA', P2, bfs[0]!))
  put(unit('foeB', P2, bfs[0]!))
  put(unit('mine', P1, bfs[0]!))
  put(unit('foeFar', P2, bfs[1]!))
  let s = { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
  s = seedRunes(s, P1, 'orange', runes)
  return s
}
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!

const resolveWith = (s: GameState, amount: number, place?: string): readonly unknown[] =>
  OGN_268_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, {
    [OGN_268_AMOUNT_KEY]: String(amount),
    ...(place !== undefined ? { [OGN_268_PLACE_KEY]: place } : {}),
  })

describe('★ 前提:类别 / 费用 / 印刷关键词 / 进表', () => {
  test('★★★★★上游印刷费(0 pip ⇒ 只写 mana)与两笔账不混', () => {
    expect(CARD_COSTS['OGN-268']).toEqual({ mana: 1, pips: 0, colors: ['orange', 'purple'] })
    expect(OGN_268_SPEC.cost, '★打出费只有 1 法力').toEqual({ mana: 1 })
    expect(cardKind('OGN-268'), '★★专属法术的 cardKind 就是 spell').toBe('spell')
    expect(cardKeywords('OGN-268')).toEqual(['迅捷'])
    expect(playSpecFor('OGN-268'), '★★★进了 PLAY_SPECS').toBeDefined()
    expect(OGN_268_CARD_EFFECT).toContain('任意数量')
  })

  test('★★★★★★【{{A}} = 任意色符能】每枚写空数组', () => {
    expect(barrageCost(0)).toEqual({ pips: [] })
    expect(barrageCost(3), '★三枚任意域').toEqual({ pips: [[], [], []] })
  })
})

describe('★★★★★★★ 上限:【付得起几枚】现算(两头验的候选侧)', () => {
  test('★★★★★★★手上 3 枚 ⇒ 上限 3;0 枚 ⇒ 上限 0', () => {
    expect(maxBarrage(scene(3), P1)).toBe(3)
    expect(maxBarrage(scene(0), P1), '★一枚都没有').toBe(0)
  })

  test('★★★★★★上限就是 `canPayFromState` 说了算(㊼ 别自己数池子)', () => {
    const s = scene(2)
    const max = maxBarrage(s, P1)
    expect(canPayFromState(s, P1, barrageCost(max)), '★上限本身付得起').toBe(true)
    expect(canPayFromState(s, P1, barrageCost(max + 1)), '★★再多一枚就付不起').toBe(false)
  })

  test('★★★★★★问链:★1803b 后【确认期】先问「打哪处」,【结算期】再问「付几枚」(0 起)', () => {
                                                   
                                                                                                 
                                                                               
                                                     
    const confirm = OGN_268_SPEC.makeConfirmChoice!({
      movedCardOid: asObjId('sp'), controller: P1,
    } as never)
    const next = OGN_268_SPEC.makeNextChoice!({
      movedCardOid: asObjId('sp'), controller: P1,
    } as never)
    const s = scene(2)
                                     
    const q1 = confirm(s, {})!
    expect(q1.key).toBe(OGN_268_PLACE_KEY)
    expect(q1.candidates.map((c) => c.id).sort(), '★★两处战场都能选(不限控制权)')
      .toEqual(barragePlaces(s).slice().sort())
                                           
    const q2 = next(s, { [OGN_268_PLACE_KEY]: bf(s, 0) })!
    expect(q2.key).toBe(OGN_268_AMOUNT_KEY)
    expect(q2.candidates.map((c) => c.id), '★0..2 三个选项(「任意数量」含 0)')
      .toEqual(['0', '1', '2'])
    expect(confirm(s, { [OGN_268_PLACE_KEY]: bf(s, 0) }), '★确认期答完 ⇒ 不再问 place').toBeNull()
    expect(next(s, { [OGN_268_PLACE_KEY]: bf(s, 0), [OGN_268_AMOUNT_KEY]: '2' }), '★★★问完了')
      .toBeNull()
    expect(next(s, {}), '★前置门:确认期的 place 没答 ⇒ 结算期一问都不出').toBeNull()
  })
})

describe('★★★★★★★ 挨轰的是谁:只打【那一处】的【敌方】', () => {
  test('★★★★★★★我自己在那处的单位一个都不打', () => {
    const s = scene()
    expect(barrageVictims(s, bf(s, 0), P1), '★只有对手那两名').toEqual(['foeA', 'foeB'])
  })

  test('★★★★★★【那一处】:别处那名敌方一点事没有', () => {
    const s = scene()
    expect(barrageVictims(s, bf(s, 0), P1), '★bf1 的不在内').not.toContain('foeFar')
    expect(barrageVictims(s, bf(s, 1), P1), '★★㊵ 换一处问,答案就变').toEqual(['foeFar'])
  })

  test('★★★★★㊵ 换个人问:对手轰 bf0 时挨打的是【我的】那名', () => {
    const s = scene()
    expect(barrageVictims(s, bf(s, 0), P2)).toEqual(['mine'])
  })
})

describe('★★★★★★★ 结算:先扣费再打,伤害 = 付的枚数', () => {
  test('★★★★★★★付 2 枚 ⇒ 一条 `spend` + 两条 2 点伤害(次序:先付后打)', () => {
    const s = scene(3)
    const evs = resolveWith(s, 2, bf(s, 0)) as readonly {
      kind: string; cost?: unknown; target?: string; amount?: number; sourcePlayer?: PlayerId
    }[]
    expect(evs).toHaveLength(3)
    expect(evs[0]!.kind, '★第一条是扣费').toBe('spend')
    expect(evs[0]!.cost, '★★付两枚任意色').toEqual({ pips: [[], []] })
    const dmg = evs.slice(1)
    expect(dmg.map((e) => e.target).sort()).toEqual(['foeA', 'foeB'])
    expect(dmg.every((e) => e.amount === 2), '★★★每名各 2 点(等同于该数量)').toBe(true)
    expect(dmg.every((e) => e.sourcePlayer === P1), '★★★★§428.5 归因').toBe(true)
  })

  test('★★★★★★★付 0 ⇒ **一条事件都不发**(「任意数量」含 0,但 0 点伤害没意义)', () => {
    const s = scene(3)
    expect(resolveWith(s, 0, bf(s, 0)), '★不发 spend 也不发 damage').toEqual([])
  })

  test('★★★★★★★【两头验】结算时钱已经被榨干 ⇒ 一条都不发(不能白嫖也不能亏钱)', () => {
                                                     
    const rich = scene(3)
    expect(resolveWith(rich, 3, bf(rich, 0)), '前提自证:有钱时是发的').toHaveLength(3)
    const broke = scene(0)
    expect(canPayFromState(broke, P1, barrageCost(3)), '前提自证:现在付不起').toBe(false)
    expect(resolveWith(broke, 3, bf(broke, 0)), '★付不起 ⇒ 一条都不发').toEqual([])
  })

  test('★★★★★没选战场 ⇒ 不发', () => {
    expect(resolveWith(scene(3), 2), '★第二问没答').toEqual([])
  })

  test('★★★★★那处一个敌方单位都没有 ⇒ 只扣费、不发伤害', () => {
                                                    
    const s = scene(3)
    const empty = bf(s, 1)
    const bare = {
      ...s,
      objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'foeFar')),
      zones: { ...s.zones, [empty]: { ...s.zones[empty as never]!, contents: [] } },
    } as unknown as GameState
    expect(barrageVictims(bare, empty, P1), '前提自证:那处空了').toEqual([])
    const evs = resolveWith(bare, 2, empty) as readonly { kind: string }[]
    expect(evs.map((e) => e.kind), '★只有扣费那一条').toEqual(['spend'])
  })
})
