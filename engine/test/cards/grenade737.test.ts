import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind, cardKeywords, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { UNL_020_SPEC, UNL_020_PAY, UNL_020_TARGET, UNL_020_BASE_DAMAGE, makeGrenadeReplayItem } from '../../data/cards/UNL-020'

                                                          
                                            
                                         
  
           
                                                   
                                             
                                                        
                                   
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], pipsFor: PlayerId[] = [P1, P2]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of pipsFor) {
    for (let k = 0; k < 3; k++) {
      const r = { oid: asObjId(`rn${i++}`), defId: 'rune:红色', owner: p, controller: p,
        zone: asZoneId(`base:${p}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
        damage: 0, counters: {}, status: {} } as GameObject
      objects[r.oid] = r
      const z = zones[r.zone]
      if (z) zones[r.zone] = { ...z, contents: [...z.contents, r.oid] }
    }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

type Ev = { kind: string, target?: string, amount?: number, player?: string, item?: { controller: string } }
const firstShot = (s: GameState, target?: string): readonly Ev[] =>
  UNL_020_SPEC.makeResolve!({ movedCardOid: asObjId('gr'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, {} as never) as unknown as readonly Ev[]

describe('★ 前提:登记面(单印次无组)', () => {
  test('★★★★★2费 1pip 红、spell、无组、PLAY_SPECS 登了、无横幅', () => {
    expect(CARD_COSTS['UNL-020']).toEqual({ mana: 2, pips: 1, colors: ['red'] })
    expect(cardKind('UNL-020')).toBe('spell')
    expect(VARIANT_GROUPS['UNL-020'], '★单印次无组实证(737 现场量)').toBeUndefined()
                                                                 
                                                                               
                                                                                
                                                             
                                                                  
                                                                                 
    expect(playSpecFor('UNL-020')!.target).toBe('custom')
    expect(cardKeywords('UNL-020')).toEqual([])
    expect(UNL_020_SPEC.cost).toEqual({ mana: 2, pips: [['red']] })
  })
})

describe('★★★★★★★ ①②首发+乒乓方向+递增', () => {
  test('★★★★★★首发 2 伤+enqueue 下一手给**被打单位控制者**(P2);目标没了 ⇒ 全空', () => {
    const s = scene([obj('mine', P1, BF0), obj('foe', P2, BF0)])
    const evs = firstShot(s, 'foe')
    expect(evs.map((e) => e.kind)).toEqual(['damage', 'enqueueItem'])
    expect(evs[0]).toMatchObject({ kind: 'damage', target: 'foe', amount: UNL_020_BASE_DAMAGE })
    expect(evs[1]!.item!.controller, '★「其控制者」= P2 拿下一手(刀:不换边)').toBe(P2)
    expect(firstShot(s, 'gone'), '★目标没了:伤害没造成、引用无 ⇒ 乒乓不开张').toEqual([])
                                         
    expect((firstShot(s, 'mine')[1] as Ev).item!.controller).toBe(P1)
                                                                           
    const seized = scene([{ ...obj('sz', P1, BF0), controller: P2 } as GameObject])
    expect((firstShot(seized, 'sz')[1] as Ev).item!.controller, '★夺控体:按控制者 P2').toBe(P2)
  })

  test('★★★★★★第二发=3、第三发=4(timesDealt 递增);resolve 先 spend 后 damage 再 enqueue', () => {
    const s = scene([obj('mine', P1, BF0), obj('foe', P2, BF0)])
    const it2 = makeGrenadeReplayItem(asObjId('gr'), P2, 1)
    const evs2 = it2.resolve(s, { [UNL_020_PAY]: 'yes', [UNL_020_TARGET]: 'mine' }) as unknown as readonly Ev[]
    expect(evs2.map((e) => e.kind)).toEqual(['spend', 'damage', 'enqueueItem'])
    expect(evs2[1], '★第二发 2+1=3').toMatchObject({ kind: 'damage', target: 'mine', amount: 3 })
    expect(evs2[2]!.item!.controller, '★又换回 P1').toBe(P1)
    const it3 = makeGrenadeReplayItem(asObjId('gr'), P1, 2)
    const evs3 = it3.resolve(s, { [UNL_020_PAY]: 'yes', [UNL_020_TARGET]: 'foe' }) as unknown as readonly Ev[]
    expect(evs3[1], '★第三发 2+2=4(刀:递增丢恒2)').toMatchObject({ kind: 'damage', amount: 4 })
  })
})

describe('★★★★★★★ ③④问链与终止', () => {
  test('★★★★★问链两段:先付后选目标;不付 ⇒ 收口;付不起 ⇒ 不问(★715)', () => {
    const s = scene([obj('foe', P2, BF0)])
    const it = makeGrenadeReplayItem(asObjId('gr'), P2, 1)
    const q1 = it.nextChoice!(s, {})!
    expect(q1.key).toBe(UNL_020_PAY)
    expect(q1.controller, '★问的是拿下一手的人').toBe(P2)
    const q2 = it.nextChoice!(s, { [UNL_020_PAY]: 'yes' })!
    expect(q2.key).toBe(UNL_020_TARGET)
    expect(it.nextChoice!(s, { [UNL_020_PAY]: 'no' }), '★不付收口').toBeNull()
    const poor = scene([obj('foe', P2, BF0)], [P1])          
    expect(makeGrenadeReplayItem(asObjId('gr'), P2, 1).nextChoice!(poor, {}), '★付不起不问').toBeNull()
    expect(makeGrenadeReplayItem(asObjId('gr'), P2, 1).resolve(poor, { [UNL_020_PAY]: 'yes', [UNL_020_TARGET]: 'foe' }), '★结算复验付不起 ⇒ 空').toEqual([])
  })

  test('★★★★★④付了但目标结算时没了 ⇒ 费不收伤不发(整条不成立);答 no ⇒ 空', () => {
    const s = scene([obj('foe', P2, BF0)])
    const it = makeGrenadeReplayItem(asObjId('gr'), P2, 1)
    expect(it.resolve(s, { [UNL_020_PAY]: 'yes', [UNL_020_TARGET]: 'gone' }), '★没合法目标 ⇒ 连 spend 都不发').toEqual([])
    expect(it.resolve(s, { [UNL_020_PAY]: 'no' })).toEqual([])
  })
})
