import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, costModsFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_168_SPEC, loyaltyTargets } from '../../data/cards/UNL-168'

                                                          
                                               
                                            
  
           
                                                         
                       
                                                       
                           
                                                            
                                 
                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                                      
const dis = (oid: string, defId: string, who: PlayerId, tags: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(`discard:${who}`),
  baseMight: 1, baseKeywords: [], baseTypes: ['unit'], baseTags: [...tags], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

                                                                     
                                                                             
                                                                    
type Ev = { kind: string, obj?: string, player?: string, ready?: boolean }
const resolveWith = (s: GameState, target: string | undefined): readonly Ev[] =>
  UNL_168_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, {}) as unknown as readonly Ev[]

describe('★ 前提:登记/①目标口双上限', () => {
  test('★★★★★2费 1黄pip、无关键词、进 PLAY_SPECS、不进触发区', () => {
    expect(CARD_COSTS['UNL-168']).toEqual({ mana: 2, pips: 1, colors: ['yellow'] })
    expect(UNL_168_SPEC.cost).toEqual({ mana: 2, pips: [['yellow']] })
    expect(cardKind('UNL-168')).toBe('spell')
    expect(cardKeywords('UNL-168')).toEqual([])
    expect(playSpecFor('UNL-168')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('UNL-168')
  })

  test('★★★★★★①双上限各管一头:法力≤2 且 pips≤1;对手废牌堆/法术不在', () => {
                                                       
    expect(CARD_COSTS['SFD-081']!.mana, '㊳ 前提').toBe(3)
    const s = scene([
      dis('ok1', 'OGN-059', P1), // 现场核下一行:7费 ✗?—— 用断言暴露真值
      dis('cheap', 'SFD-153', P1), // 先锋之眼是装备 ✗类别
    ])
    void s
                                             
    const anyCheapUnit = Object.entries(CARD_COSTS).find(([id, c]) =>
      c.mana <= 2 && c.pips <= 1 && (id.startsWith('OGN') || id.startsWith('SFD')) && cardKind(id) === 'unit')
    expect(anyCheapUnit, '㊳ 库里必有≤2费≤1pip 的单位').toBeDefined()
    const [cheapId] = anyCheapUnit!
    const overMana = Object.entries(CARD_COSTS).find(([id, c]) => c.mana > 2 && cardKind(id) === 'unit')!
    const overPips = Object.entries(CARD_COSTS).find(([id, c]) => c.mana <= 2 && c.pips > 1 && cardKind(id) === 'unit')
    const objs = [
      dis('yes', cheapId, P1),
      dis('noMana', overMana[0], P1),
      dis('foes', cheapId, P2), // 「**你的**废牌堆」
      { ...dis('spell', 'OGN-046', P1), baseTypes: ['unit'] } as GameObject, // 类别按 CARD_CATEGORIES(法术 ✗)
      ...(overPips ? [dis('noPips', overPips[0], P1)] : []),
    ]
    expect(loyaltyTargets(scene(objs), P1), '★只有双上限内的我方废牌堆单位').toEqual(['yes'])
  })
})

describe('★★★★★★★ ②条件减费(costModsFor 端到端)', () => {
  test('★★★★★★目标带「魄罗」⇒ 一条减{2};不带 ⇒ 零条;没目标/别的卡 ⇒ 零条', () => {
                                                                            
    const s = scene([dis('poro', 'OGN-013', P1), dis('plain', 'OGN-046', P1)])                  
    const hit = costModsFor(s, P1, 'UNL-168', { target: 'poro' })
    expect(hit).toHaveLength(1)
    expect(hit[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana: 2 })
    expect(costModsFor(s, P1, 'UNL-168', { target: 'plain' }), '★不带标签 ⇒ 不减').toEqual([])
    expect(costModsFor(s, P1, 'UNL-168', {}), '★没选目标 ⇒ 不减').toEqual([])
    expect(costModsFor(s, P1, 'OGN-046', { target: 'poro' }), '★别的卡不吃这条').toEqual([])
  })
})

describe('★★★★★★★ ③结算:playFree 从废牌堆', () => {
  test('★★★★★★选中 ⇒ 一条 playFree(缺省休眠不带 ready);已不在废牌堆/没选 ⇒ 空', () => {
    const s = scene([dis('u1', 'OGN-046', P1)])
    const evs = resolveWith(s, 'u1')
    expect(evs).toEqual([{ kind: 'playFree', obj: 'u1', player: P1, to: `base:${P1}` }])                                          
    expect(evs[0]!.ready, '★卡文没写活跃 ⇒ §359.2.c 缺省休眠').toBeUndefined()
    const moved = scene([{ ...dis('u1', 'OGN-046', P1), zone: asZoneId(`base:${P1}`) } as GameObject])
    expect(resolveWith(moved, 'u1'), '★结算时已不在我的废牌堆').toEqual([])
    expect(resolveWith(s, undefined)).toEqual([])
  })
})
