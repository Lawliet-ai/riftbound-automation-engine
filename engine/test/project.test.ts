import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { project } from '../src/net/project'
import { setupGame } from '../src/game/setup'
import { makeRng } from '../src/util/rng'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../data/decks'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(oid: string, zone: string, over: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(oid), defId: 'CARD_X', owner: P1, controller: P1, zone: asZoneId(zone), baseMight: 3, damage: 0, counters: {}, status: {}, ...over }
}
function place(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects, zones }
}

describe('手牌可见性(§109)', () => {
  const s = place([
    obj('p1card', 'hand:P1', { owner: P1, controller: P1 }),
    obj('p2card', 'hand:P2', { owner: P2, controller: P2 }),
  ])
  test('P1 视图:自己手牌可见,对手手牌脱敏(数量保留,身份隐藏)', () => {
    const v = project(s, P1)
    expect(v.objects['p1card']).toBeDefined()
    expect(v.objects['p1card']!.defId).toBe('CARD_X')
    expect(v.objects['p2card']).toBeUndefined()                    
    expect(v.zones['hand:P2']!.contents).toEqual(['hidden'])              
  })
})

describe('牌库序对所有人隐藏', () => {
  test('主牌堆内容全 hidden(连拥有者都不给序)', () => {
    const s = place([obj('d1', 'mainDeck:P1'), obj('d2', 'mainDeck:P1')])
    const v = project(s, P1)              
    expect(v.zones['mainDeck:P1']!.contents).toEqual(['hidden', 'hidden'])
    expect(v.objects['d1']).toBeUndefined()
  })
})

describe('待命面朝下(§811.6.a)', () => {
  const s = place([obj('fd', 'standby:shared:0', { controller: P1, status: { faceDown: true } })])
  test('控制者可见其身份;对手只见"有一张面朝下的牌"', () => {
    expect(project(s, P1).objects['fd']!.defId).toBe('CARD_X')         
    const v2 = project(s, P2)
                                                      
                                                  
                                                            
                                                           
                                          
    expect(v2.objects['fd'], '记录在(§109 场地区域的物体是公开的)').toBeDefined()
    expect(v2.objects['fd']!.hidden, '密封').toBe(true)
    expect(v2.objects['fd']!.defId, '★身份不给(§129.4)').toBeUndefined()
    expect(v2.objects['fd']!.might, '★战力是卡面信息,也不给').toBeUndefined()
    expect(v2.objects['fd']!.keywords, '★关键词同理').toBeUndefined()
    expect(v2.objects['fd']!.faceDown, '状态给(§109.2)').toBe(true)
    expect(v2.objects['fd']!.controller, '控制者是公开的').toBe(P1)
    expect(v2.zones['standby:shared:0']!.contents).toEqual(['fd'])                               
  })
})

describe('revealedTo 瞬态揭示', () => {
  test('牌库顶牌揭给 P1 → P1 可见、P2 仍隐藏', () => {
    const s = place([obj('top', 'mainDeck:P1', { revealedTo: [P1] })])
    expect(project(s, P1).objects['top']!.defId).toBe('CARD_X')
    expect(project(s, P2).objects['top']).toBeUndefined()
  })
})

describe('公开区域 + 漏字段=少信息', () => {
  test('战场单位对双方可见', () => {
    const s = place([obj('u', 'battlefield:shared:0', { controller: P2, owner: P2 })])
    expect(project(s, P1).objects['u']!.might).toBe(3)
    expect(project(s, P2).objects['u']!.might).toBe(3)
  })
  test('隐藏物件不带 defId/might(密封)', () => {
    const s = place([obj('h', 'hand:P2', { owner: P2, controller: P2 })])
    const v = project(s, P1)
    expect(v.objects['h']).toBeUndefined()
                            
    expect(JSON.stringify(v)).not.toContain('CARD_X')
  })
})

describe('投影补充字段(完整UI所需的公开信息)', () => {
  test('横置/待命新鲜度/区域容量/胜利分/回合数进视图,且不越过密封层', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(3))
    const v = project(state, asPlayerId('P1'))
    expect(v.winTarget).toBe(8)
    expect(v.turn).toBe(1)
    expect(v.scoredThisTurn).toBeDefined()
                              
    const sb = Object.values(v.zones).find((z) => z.kind === 'standby')
    expect(sb?.capacity).toBe(1)
                                  
    expect(v.zones['hand:P2']!.contents.every((c) => c === 'hidden')).toBe(true)
  })
})
