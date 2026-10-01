import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { PATROL_SURCHARGE, patrolTaxApplies } from '../../data/cards/UNL-163'
import { UNL_054_SPEC, UNL_054_PREFIX, UNL_054_DEST_KEY, UNL_054_PATROL_PAY } from '../../data/cards/UNL-054'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'

                                                                
                                             
                                                    
  
           
                                                
                                                  
                                                      
                                                     
                                                 
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, might = 2): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

                                                                  
function scene(objs: readonly GameObject[], p1Pips = 9): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
                                                
  const pool = base.runePools[P1]!
  const runes = Array.from({ length: p1Pips }, (_, i) => ({
    oid: asObjId(`rn${i}`), defId: 'rune:黄色', owner: P1, controller: P1,
    zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
    damage: 0, counters: {}, status: {},
  } as GameObject))
  for (const r of runes) {
    objects[r.oid] = r
    const z = zones[r.zone]
    if (z) zones[r.zone] = { ...z, contents: [...z.contents, r.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: pool } } as GameState
}

                                                          
const patrol = (zone: string = BF0) => obj('pt', 'UNL-163', P2, zone, 4)
const foe = (oid: string, zone: string = `base:${P2}`) => obj(oid, `U-${oid}`, P2, zone)

const ask = (s: GameState, chosen: Record<string, string>) =>
  UNL_054_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolve = (s: GameState, chosen: Record<string, string>) =>
  UNL_054_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly { kind: string, obj?: string, to?: string, player?: string, cost?: { pips?: unknown[] } }[]

const k = (i: number) => `${UNL_054_PREFIX}${i}`
                            
const picks = (...oids: string[]): Record<string, string> => {
  const out: Record<string, string> = {}
  oids.forEach((o, i) => { out[k(i)] = o })
  out[k(oids.length)] = MULTI_SELECT_DONE
  out[UNL_054_DEST_KEY] = BF0
  return out
}

describe('★ 前提:登记面(单印次无组)+判据四反例', () => {
  test('★★★★★4费 0pip 黄、unit、无 variant 组;{{A}}=一枚任意符能', () => {
    expect(CARD_COSTS['UNL-163']).toEqual({ mana: 4, pips: 0, colors: ['yellow'] })
    expect(cardKind('UNL-163')).toBe('unit')
    expect(cardCost('UNL-163')).toEqual({ mana: 4 })
    expect(VARIANT_GROUPS['UNL-163'], '★单印次无组实证(733 现场量)').toBeUndefined()
    expect(PATROL_SURCHARGE, '★㊶ {{A}} 一个符号=一枚;空色枚举=任意色').toEqual({ mana: 0, pips: [[]] })
  })

  test('★★★★★★④判据:在落点战场 ⇒ 收;在基地/在别的战场/巡管自家(对手若要)⇒ 不收', () => {
    expect(patrolTaxApplies(scene([patrol()]), P1, BF0), '★敌方巡管站在落点 ⇒ 收').toBe(true)
    expect(patrolTaxApplies(scene([patrol(`base:${P2}`)]), P1, `base:${P2}`), '★「我所在的**战场**」基地不算').toBe(false)
    expect(patrolTaxApplies(scene([patrol(BF1)]), P1, BF0), '★巡管在别的战场').toBe(false)
    expect(patrolTaxApplies(scene([patrol()]), P2, BF0), '★巡管自家移动(「对手若要」)').toBe(false)
  })
})

describe('★★★★★★★ ②N-1 计费问链(消费点=UNL-054)', () => {
  test('★★★★★★K=1 免问;K=2 只问第二名;K=3 问第2、3名;无巡管 ⇒ 与旧行为一字不变(null)', () => {
    const s = scene([patrol(), foe('a'), foe('b'), foe('c')])
    expect(ask(s, picks('a')), '★K=1「多名」不成立 ⇒ 不问').toBeNull()
    const q2 = ask(s, picks('a', 'b'))!
    expect(q2.key, '★K=2 ⇒ 问第二名(第一名免)').toBe(`${UNL_054_PATROL_PAY}b`)
    expect(q2.candidates.map((c) => c.id)).toEqual(['yes', 'no'])
    const q3 = ask(s, { ...picks('a', 'b', 'c'), [`${UNL_054_PATROL_PAY}b`]: 'yes' })!
    expect(q3.key, '★K=3 第二问=第三名').toBe(`${UNL_054_PATROL_PAY}c`)
    expect(ask(s, { ...picks('a', 'b', 'c'), [`${UNL_054_PATROL_PAY}b`]: 'yes', [`${UNL_054_PATROL_PAY}c`]: 'no' }), '★全答完收口').toBeNull()
    const free = scene([foe('a'), foe('b')])
    expect(ask(free, picks('a', 'b')), '★无巡管 ⇒ 不问(旧行为)').toBeNull()
  })

  test('★★★★★⑤付不起不问:符能只剩 1 枚,K=3 ⇒ 问第2名后第3名没得问(累计验)', () => {
    const s = scene([patrol(), foe('a'), foe('b'), foe('c')], 1)
    const q = ask(s, picks('a', 'b', 'c'))!
    expect(q.key).toBe(`${UNL_054_PATROL_PAY}b`)
    expect(ask(s, { ...picks('a', 'b', 'c'), [`${UNL_054_PATROL_PAY}b`]: 'yes' }), '★已承诺1枚,第3名付不起 ⇒ 不问(§204.4.c 直接不移)').toBeNull()
  })
})

describe('★★★★★★★ ③结算:那名不移其余照移(刀:整体作废=过宽)', () => {
  const moves = (evs: readonly { kind: string, obj?: string }[]) =>
    evs.filter((e) => e.kind === 'zoneChange').map((e) => e.obj).sort()
  const spends = (evs: readonly { kind: string }[]) => evs.filter((e) => e.kind === 'spend').length

  test('★★★★★★K=3 全付 ⇒ 三名全移+两笔 spend;第2名不付 ⇒ a、c 移 b 不移+一笔 spend', () => {
    const s = scene([patrol(), foe('a'), foe('b'), foe('c')])
    const all = resolve(s, { ...picks('a', 'b', 'c'), [`${UNL_054_PATROL_PAY}b`]: 'yes', [`${UNL_054_PATROL_PAY}c`]: 'yes' })
    expect(moves(all)).toEqual(['a', 'b', 'c'])
    expect(spends(all), '★N-1:三名只收两笔').toBe(2)
    const skipB = resolve(s, { ...picks('a', 'b', 'c'), [`${UNL_054_PATROL_PAY}b`]: 'no', [`${UNL_054_PATROL_PAY}c`]: 'yes' })
    expect(moves(skipB), '★§204.4.c 只废那一名').toEqual(['a', 'c'])
    expect(spends(skipB)).toBe(1)
  })

  test('★★★★★答 yes 但结算时付不起(累计)⇒ 那名不移;无巡管 ⇒ 零 spend(旧行为)', () => {
    const poor = scene([patrol(), foe('a'), foe('b'), foe('c')], 1)
    const evs = resolve(poor, { ...picks('a', 'b', 'c'), [`${UNL_054_PATROL_PAY}b`]: 'yes', [`${UNL_054_PATROL_PAY}c`]: 'yes' })
    expect(moves(evs), '★只付得起一笔 ⇒ b 移、c 不移').toEqual(['a', 'b'])
    expect(spends(evs)).toBe(1)
    const free = resolve(scene([foe('a'), foe('b')]), picks('a', 'b'))
    expect(moves(free)).toEqual(['a', 'b'])
    expect(spends(free), '★无巡管零收费').toBe(0)
  })

  test('★★★★★K=1 免费;巡管在基地 ⇒ 免费(判据四反例走真结算)', () => {
    const s1 = resolve(scene([patrol(), foe('a')]), picks('a'))
    expect(moves(s1)).toEqual(['a']); expect(spends(s1)).toBe(0)
    const s2 = resolve(scene([patrol(`base:${P2}`), foe('a'), foe('b')]), { ...picks('a', 'b'), [UNL_054_DEST_KEY]: BF0 })
    expect(moves(s2)).toEqual(['a', 'b']); expect(spends(s2)).toBe(0)
  })
})
