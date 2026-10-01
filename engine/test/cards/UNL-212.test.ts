import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { cardKind } from '../../data/registry'
import {
  EXTRA_BF_TRIGGER_FACTORIES, makeFrostKeepTrigger, unitsAtBattlefield, UNL_212_DAMAGE,
} from '../../data/cards/battlefields-extra'

                           
                                                     
  
                 
                                                               
                                           
                                   
                                           
                                                           
                                               
                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')

const unit = (oid: string, zone: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who,
  zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: ['unit'] as never,
  damage: 0, counters: {}, status: {},
})

   
                 
                                                      
                                  
   
function scene(): GameState {
  const base = createInitialState([P1, P2, P3], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(unit('mine', bfs[0]!, P1))
  put(unit('foe', bfs[0]!, P2))
  put({ ...unit('gear', bfs[0]!, P1), baseTypes: ['equipment'] as never })
  put(unit('far', bfs[1]!, P1))
  return { ...base, activePlayer: P1, phase: 'awaken', objects, zones } as GameState
}
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!
const fire = (s: GameState, zone: string, who: PlayerId, evPlayer: PlayerId): readonly GameEvent[] => {
  const t = makeFrostKeepTrigger(zone, who)
  const ev = { kind: 'startPhase', player: evPlayer } as GameEvent
  return t.effect(s, ev, {})
}

describe('★ 前提:它是战场卡;工厂已登记(㊶)', () => {
  test('★类别与注册表', () => {
    expect(cardKind('UNL-212'), '★战场卡').toBe('battlefield')
    expect(EXTRA_BF_TRIGGER_FACTORIES['UNL-212'], '★已进 EXTRA_BF_TRIGGER_FACTORIES').toBeDefined()
    expect(UNL_212_DAMAGE, '㊶ 伤害量从常量取').toBe(1)
                                                    
    expect(EXTRA_BF_TRIGGER_FACTORIES['UNL-212']!(bf(scene(), 0), P1), '★每玩家一份触发')
      .toHaveLength(1)
  })
})

describe('★★★★★★ 「此处的所有单位」——不分敌我、不含装备、不越界', () => {
  test('★★★★★★恰好是这一处战场上的两名单位', () => {
    const s = scene()
    expect(unitsAtBattlefield(s, bf(s, 0)).slice().sort()).toEqual(['foe', 'mine'])
  })

  test('★★★★★装备不是单位,不该挨打', () => {
    const s = scene()
    expect(unitsAtBattlefield(s, bf(s, 0)), '★装备被挡在外面').not.toContain('gear')
  })

  test('★★★★★★「此处」= 这一处:另一处战场那名一点事没有', () => {
    const s = scene()
    expect(unitsAtBattlefield(s, bf(s, 0)), '★别处的不在内').not.toContain('far')
                                  
    expect(unitsAtBattlefield(s, bf(s, 1))).toEqual(['far'])
  })
})

describe('★★★★★★★ 效果:每名单位各 1 点,归因到【玩家】', () => {
  test('★★★★★★★两条 damage,双方各一名 —— 我自己的也挨打', () => {
    const s = scene()
    const evs = fire(s, bf(s, 0), P1, P1)
    expect(evs).toHaveLength(2)
    expect(evs).toEqual(expect.arrayContaining([
      { kind: 'damage', target: 'mine', amount: 1, sourcePlayer: P1 },
      { kind: 'damage', target: 'foe', amount: 1, sourcePlayer: P1 },
    ]))
  })

  test('★★★★★★§170 战场卡没有 oid ⇒ 只给 `sourcePlayer`,【不给】`source`', () => {
    const s = scene()
    const ev = fire(s, bf(s, 0), P1, P1)[0] as { source?: unknown; sourcePlayer?: unknown }
    expect(ev.sourcePlayer, '★玩家归因在').toBe(P1)
    expect(ev.source, '★★物件归因不给(战场卡不是场上物件)').toBeUndefined()
  })

  test('★★★★★`sourcePlayer` 跟着【这一份触发的主人】走', () => {
    const s = scene()
    const ev = fire(s, bf(s, 0), P2, P2)[0] as { sourcePlayer?: unknown }
    expect(ev.sourcePlayer, '㊵ 问 P2 那一份自己的答案').toBe(P2)
  })

  test('★★★★★★此处一个单位都没有 ⇒ 一条都不发,且【不入链】', () => {
    const s = scene()
    const empty = bf(s, 1)
    const bare = {
      ...s,
      zones: { ...s.zones, [empty]: { ...s.zones[empty]!, contents: [] } },
    } as GameState
    expect(unitsAtBattlefield(bare, empty), '前提自证:那处空了').toEqual([])
    expect(fire(bare, empty, P1, P1), '★一条都不发').toEqual([])
    const t = makeFrostKeepTrigger(empty, P1)
    expect(t.additionalCondition?.(bare), '★★不入链').toBe(false)
  })
})

describe('★★★★★★★ 「每名玩家各自的开始阶段」——三份互不串台', () => {
  test('★★★★★★★P1 那一份只在【P1 的】开始阶段响', () => {
    const s = scene()
                                                                 
                                                         
    const ids = [P1, P2, P3].map((p) => makeFrostKeepTrigger(bf(s, 0), p).id)
    expect(new Set(ids).size, '★三份 id 互不相同').toBe(3)
    for (const [i, p] of [P1, P2, P3].entries()) {
      expect(ids[i], `★${p} 那一份的 id 带着他自己`).toContain(p as string)
    }
  })

  test('★★★★★每处战场也各一份(id 里带战场 id)', () => {
    const s = scene()
    const a = makeFrostKeepTrigger(bf(s, 0), P1).id
    const b = makeFrostKeepTrigger(bf(s, 1), P1).id
    expect(a).not.toBe(b)
    expect(a, '★带着战场 id').toContain(bf(s, 0))
  })

  test('★★★三份的效果各自只看【自己那处】战场', () => {
    const s = scene()
                                     
    const evs = fire(s, bf(s, 1), P1, P1) as readonly { target: string }[]
    expect(evs.map((e) => e.target)).toEqual(['far'])
  })
})
