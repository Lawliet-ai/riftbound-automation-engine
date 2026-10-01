import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { UNL_115, UNL_115_KEYWORDS, UNL_115_XP, makeNilahMoveTrigger } from '../../data/cards/UNL-115'
import { makeSkyhornTrigger, makeSeahuntTrigger } from '../../data/cards/longtail-3'
import { makeOgn162Trigger } from '../../data/cards/once-per-turn'

                                                          
                                   
  
                          
                                       
                                                     
                                                         
                                                        
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const mk = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

type T = {
  filter?: (ev: GameEvent, state: GameState) => boolean
  effect: (state: GameState, ev: GameEvent, chosen?: Record<string, string>) => readonly GameEvent[]
  mayChoose?: boolean
  oncePerTurn?: boolean
  nthType?: boolean
}
const trig = (self = 'nilah'): T => makeNilahMoveTrigger(asObjId(self), P1) as unknown as T
                                                
const moved = (unit: string, from: string, to: string, by: PlayerId = P1): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(unit), from: asZoneId(from), to: asZoneId(to), player: by } as unknown as GameEvent)

const board = () => scene([mk('nilah', 'UNL-115', P1, BF0), mk('other', 'OGN-012', P1, BF0)])

describe('★ 前提:卡面与接线', () => {
  test('★3费 1橙pip、4 战力,印 [急速]+[游走]', () => {
    expect(CARD_COSTS['UNL-115']).toEqual({ mana: 3, pips: 1, colors: ['orange'] })
    expect([UNL_115.power, UNL_115.energy]).toEqual([4, 3])
    expect(cardKind('UNL-115')).toBe('unit')
    expect(cardKeywords('UNL-115'), '★② 印刷关键词三处同源').toEqual(['急速', '游走'])
    expect(UNL_115_KEYWORDS).toEqual(['急速', '游走'])
    expect(specLookup('UNL-115').baseKeywords, '★闸读的那份也要有').toEqual(['急速', '游走'])
    expect(UNL_115_XP, '★㊶ 钉住卡面数额').toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★【哪种移动算】—— 光杆的「当我移动时」= 一个限定都没有', () => {
  test('🔴★★★★★★战场 → 战场:响', () => {
    expect(trig().filter!(moved('nilah', BF0, BF1), board())).toBe(true)
  })

  test('🔴★★★★★★【基地 → 战场】也响 —— 这一条就是与猎海小队的分野', () => {
                                               
    expect(trig().filter!(moved('nilah', `base:${P1}`, BF0), board()),
      '★★★卡文没写起点,基地出发照样算').toBe(true)
  })

  test('🔴★★★★★★战场 → 基地也响(终点也没有限定)', () => {
    expect(trig().filter!(moved('nilah', BF0, `base:${P1}`), board())).toBe(true)
  })

  test('🔴★★★★★★对照组:猎海小队那张【从基地出发不响】', () => {
    const sea = makeSeahuntTrigger(asObjId('sea'), P1) as unknown as T
    const s = scene([mk('sea', 'SFD-137', P1, BF0)])
    expect(sea.filter!(moved('sea', BF0, BF1), s), '★战场出发 ⇒ 响').toBe(true)
    expect(sea.filter!(moved('sea', `base:${P1}`, BF0), s),
      '★★★基地出发 ⇒ 不响(这正是"光杆一句"要分辨的那一维)').toBe(false)
  })

  test('🔴★★★★★★动的是【别人】⇒ 不响', () => {
    expect(trig().filter!(moved('other', BF0, BF1), board())).toBe(false)
  })

  test('🔴★★★★★【别人把我挪走】也算(卡文没写"你")', () => {
    expect(trig().filter!(moved('nilah', BF0, BF1, P2), board()),
      '★★★by: any —— 对手的效果挪我照样给经验').toBe(true)
  })

  test('🔴🔴★★★★★★只认【移动】那个事件 —— 但这道筛不在 `filter` 上', () => {
                                         
                                                          
                                                         
                                                                 
                                                    
    expect((trig() as unknown as { event?: string }).event, '★★★这才是"只认移动"的所在').toBe('unitMoved')
    expect((trig() as unknown as { by?: string }).by, '★谁挪的都算').toBe('any')
  })
})

describe('🔴🔴★★★★★★效果:每次都给,给的是【1 点经验】', () => {
  test('🔴★★★★★★发的是获资源事件、经验格 1、给的是我', () => {
    const evs = trig().effect(board(), moved('nilah', BF0, BF1))
    expect(evs.map((e) => e.kind)).toEqual(['gainResource'])
    expect(evs[0] as unknown as { player: string; experience: number })
      .toMatchObject({ player: P1, experience: 1 })
  })

  test('🔴★★★★★★没有「每回合首次」⇒ 一回合动几次给几次', () => {
                                                                        
                                                                
    expect(trig().oncePerTurn, '★★★不是限次触发').toBeUndefined()
    expect(trig().nthType).toBeUndefined()
                                           
    const mf = makeOgn162Trigger(asObjId('mf'), P1) as unknown as T
    expect([mf.oncePerTurn, mf.nthType], '★★★样本有分辨力').toEqual([true, true])
    const t = trig()
    const a = t.effect(board(), moved('nilah', BF0, BF1))
    const b = t.effect(board(), moved('nilah', BF1, BF0))
    expect([a.length, b.length], '★★★第二次照给').toEqual([1, 1])
  })

  test('🔴★★★★★没有「你可以选择」⇒ 不是可选触发', () => {
    expect(trig().mayChoose, '★★★卡文没写"可以" ⇒ 强制执行(㊵)').toBeFalsy()
  })

  test('🔴★★★★★给的不是抽牌 —— 与天角牧者的分野(同轴不同效果)', () => {
    const sky = makeSkyhornTrigger(asObjId('sky'), P1) as unknown as T
    const s = scene([mk('sky', 'SFD-048', P1, BF0)])
    expect(sky.effect(s, moved('sky', BF0, BF1)).map((e) => e.kind),
      '★★★那张是抽牌').toEqual(['draw'])
    expect(trig().effect(board(), moved('nilah', BF0, BF1)).map((e) => e.kind),
      '★★★这张是经验').toEqual(['gainResource'])
  })
})

describe('🔴★★★★★同轴三张【共用同一个事件名】,判据各自独立', () => {
  test('🔴★★★★★三张的触发 id 各不相同(不会互相顶掉)', () => {
    const ids = [
      (makeNilahMoveTrigger(asObjId('a'), P1) as unknown as { id?: string }).id ?? '',
      (makeSkyhornTrigger(asObjId('a'), P1) as unknown as { id?: string }).id ?? '',
      (makeSeahuntTrigger(asObjId('a'), P1) as unknown as { id?: string }).id ?? '',
    ]
    expect(new Set(ids).size, '★★★同一个 oid 上三条触发共存').toBe(3)
    expect(ids[0]).toContain('UNL-115')
  })
})
