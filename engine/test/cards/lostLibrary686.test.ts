import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { makeLostLibraryTrigger, LIBRARY_MANA_MIN, EXTRA_BF_DEFIDS } from '../../data/cards/battlefields-extra'
import { RAVNA_MANA_MIN } from '../../data/cards/UNL-005'

                                                       
              
                                                 
  
           
                                                                     
                                                                   
                 
                                                           
                                               
                                                                     
                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], ctl?: Record<string, PlayerId>): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(ctl ? { battlefieldControl: ctl } : {}) } as GameState
}

const trig = makeLostLibraryTrigger(BF0, P1)
const cast = (by: PlayerId, manaPaid?: number): GameEvent =>
                                                                        
                                                              
  ({ kind: 'spellResolved', player: by, cardOid: asObjId('sp'), ...(manaPaid !== undefined ? { manaPaid } : {}) } as unknown as GameEvent)
const myCtl = (): GameState => scene([], { [BF0]: P1 })

describe('★ 前提:①登记与表行', () => {
  test('★★★★★战场卡 0费无色;FACTORIES 表行在(EXTRA_BF_DEFIDS 对账);两卡阈值各自成格', () => {
    expect(CARD_COSTS['UNL-211']).toEqual({ mana: 0, pips: 0, colors: ['colorless'] })
    expect(cardKind('UNL-211')).toBe('battlefield')
    expect(cardCost('UNL-211')).toEqual({ mana: 0 })
    expect(EXTRA_BF_DEFIDS, '★表行删了这里当场红').toContain('UNL-211')
    expect(LIBRARY_MANA_MIN, '★书库自己的 4').toBe(4)
    expect(RAVNA_MANA_MIN, '★雷芙纳自己的 4(㊶ 两格数字不共用常量)').toBe(4)
  })
})

describe('★★★★★★★ ②③触发条件:控制判×实付账', () => {
  test('★★★★★★控制判:我控(显式字段)响;敌控/无人控不响;占领回落也响', () => {
    expect(checkTrigger(trig, cast(P1, 4), myCtl(), P1), '★显式 battlefieldControl').toBe(true)
    expect(checkTrigger(trig, cast(P1, 5), scene([], { [BF0]: P2 }), P1), '★敌控').toBe(false)
    expect(checkTrigger(trig, cast(P1, 5), scene([]), P1), '★无人控').toBe(false)
    expect(checkTrigger(trig, cast(P1, 4), scene([obj('u1', 'U-1', P1, BF0)]), P1), '★占领回落(★676 controlMap 两口径)').toBe(true)
  })

  test('★★★★★★㉙「不低于4」三档:恰4响/3不响/undefined 账不明保守不触发;对手打的不响(by 你)', () => {
    expect(checkTrigger(trig, cast(P1, 4), myCtl(), P1)).toBe(true)
    expect(checkTrigger(trig, cast(P1, 3), myCtl(), P1)).toBe(false)
    expect(checkTrigger(trig, cast(P1), myCtl(), P1), '★老信号无账').toBe(false)
                                              
    expect(checkTrigger(trig, cast(P2, 5), myCtl(), P2), '★P1 那份触发只认 P1 打出').toBe(false)
  })
})

describe('★★★★★★★ ④效果与问链:洞察', () => {
  test('★★★★★★effect=insight 事件 count:1;选了回收 ⇒ recycle 字段带上', () => {
    const evs = trig.effect(myCtl(), cast(P1, 5), {}) as unknown as readonly { kind: string, player?: string, count?: number, recycle?: string[] }[]
    expect(evs).toEqual([{ kind: 'insight', player: P1, count: 1 }])
    const withPick = trig.effect(myCtl(), cast(P1, 5), { librec0: 'd1' }) as unknown as readonly { recycle?: string[] }[]
    expect(withPick[0]!.recycle, '★问链选中的进 recycle').toEqual(['d1'])
  })

  test('★★★★★问链:牌堆有牌 ⇒ 问顶1(候选+不回收档);牌堆空 ⇒ 不问', () => {
    const deck = scene([], { [BF0]: P1 })
    const withCards = { ...deck, zones: { ...deck.zones, [`mainDeck:${P1}`]: { ...deck.zones[asZoneId(`mainDeck:${P1}`)]!, contents: [asObjId('d0'), asObjId('d1')] } },
      objects: { d0: obj('d0', 'BLK', P1, `mainDeck:${P1}`), d1: obj('d1', 'BLK', P1, `mainDeck:${P1}`) } } as unknown as GameState
    const q = trig.nextChoice!(withCards, cast(P1, 5), {})
    expect(q).not.toBeNull()
    expect(q!.candidates.map((c) => c.id), '★顶1(尾=顶 ⇒ d1)+不回收档').toEqual(['d1', '__done__'])
    expect(trig.nextChoice!(myCtl(), cast(P1, 5), {}), '★牌堆空不问').toBeNull()
  })
})
