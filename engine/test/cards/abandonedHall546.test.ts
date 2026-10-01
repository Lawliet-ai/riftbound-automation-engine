import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { cardKind, activeTriggers } from '../../data/registry'
import {
  UNL_205, UNL_205_BONUS, EXTRA_BF_TRIGGER_FACTORIES, makeAbandonedHallTrigger,
} from '../../data/cards/battlefields-extra'

                           
                                                 
                                
  
                                            
                                                                    
                                                                 
                               
                                                                  
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}

function scene(objs: readonly GameObject[], withCard = true): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(withCard ? { battlefieldCards: { [BF0]: { defId: 'UNL-205' } } } : {}),
  } as unknown as GameState
}

const trig = (p: PlayerId, bf = BF0) => makeAbandonedHallTrigger(bf, p)
const spellEv = (player: PlayerId): GameEvent =>
  ({ kind: 'playSpell', player, cardOid: asObjId('sp') } as unknown as GameEvent)
const cands = (s: GameState, p: PlayerId): string[] =>
  (trig(p).nextChoice!(s, spellEv(p), {})?.candidates ?? []).map((c) => c.id).sort()

describe('★ 前提:卡面与接线', () => {
  test('★是战场卡;进了 EXTRA_BF_TRIGGER_FACTORIES;每人各挂一份触发', () => {
    expect(cardKind('UNL-205')).toBe('battlefield')
    expect(UNL_205.category).toBe('battlefield')
    expect(EXTRA_BF_TRIGGER_FACTORIES['UNL-205'], '★进了族表').toBeDefined()
                                        
    const s = scene([obj('u')])
    expect(activeTriggers(s).filter((t) => t.sourceDefId === 'UNL-205').length).toBe(2)
  })

  test('★卡文有「可以选择」⇒ mayChoose;听的是 spellResolved(★1733 缺陷 234)', () => {
    expect(trig(P1).mayChoose).toBe(true)
    expect(trig(P1).event).toBe('spellResolved')                                                                         
    expect(trig(P1).by, '★「一名玩家」不分敌我').toBe('any')
  })
})

describe('🔴🔴🔴★★★★★★「该玩家」= 打出法术的那位,不是战场卡控制者', () => {
  const s = () => scene([obj('mine', P1), obj('foe', P2)])

  test('🔴★★★★★★★P1 打法术 ⇒ 只有【P1 那份】触发中;P2 那份不中', () => {
    expect(trig(P1).filter!(spellEv(P1), s()), '★他自己那份:中').toBe(true)
    expect(trig(P2).filter!(spellEv(P1), s()), '★★★别人那份:不中').toBe(false)
  })

  test('🔴★★★★★★★对手打法术时轮到【对手那份】中 —— 这张牌不认阵营', () => {
    expect(trig(P2).filter!(spellEv(P2), s()), '★对手自己那份:中').toBe(true)
    expect(trig(P1).filter!(spellEv(P2), s()), '★我那份:不中').toBe(false)
  })

  test('🔴★★★★★★候选跟着【那一份的 controller】走 —— 各选各的', () => {
    expect(cands(s(), P1), '★P1 那份只列 P1 的').toEqual(['mine'])
    expect(cands(s(), P2), '★★★P2 那份只列 P2 的').toEqual(['foe'])
  })
})

describe('🔴🔴🔴★★★★★★候选三道门:自己的 / 此处的 / 单位', () => {
  test('🔴★★★★★★【位置】别的战场上自己的单位不算', () => {
    const s = scene([obj('here', P1), obj('there', P1, BF1)])
    expect(cands(s, P1)).toEqual(['here'])
  })

  test('🔴★★★★★★【位置】基地里自己的单位也不算(「此处」= 这个战场)', () => {
    const s = scene([obj('here', P1), obj('atBase', P1, `base:${P1}`)])
    expect(cands(s, P1)).toEqual(['here'])
  })

  test('🔴★★★★★【类别】装备不算', () => {
    const s = scene([obj('u', P1), obj('g', P1, BF0, ['equipment'])])
    expect(cands(s, P1)).toEqual(['u'])
  })

  test('🔴★★★★★★【归属】按控制者:被我夺控的敌方牌算我的', () => {
    const stolen = { ...obj('stolen', P1), owner: P2 } as unknown as GameObject
    const lost = { ...obj('lost', P2), owner: P1 } as unknown as GameObject
    const s = scene([stolen, lost])
    expect(cands(s, P1), '★★★写成 owner 判据这条就反了').toEqual(['stolen'])
    expect(cands(s, P2)).toEqual(['lost'])
  })

  test('🔴★★★★★此处一个自己的单位都没有 ⇒ 候选为空', () => {
    expect(cands(scene([obj('foe', P2)]), P1)).toEqual([])
  })
})

describe('🔴🔴★★★★★★产出:本回合 [S]+1', () => {
  const out = (p: PlayerId, victim: string) => {
    const s = scene([obj('a', P1), obj('b', P1)])
    return trig(p).effect(s, spellEv(p), { boost: victim }) as unknown as ReadonlyArray<{
      readonly kind: string
      readonly effect: {
        readonly duration: string
        readonly predicate: (x: { oid: unknown }) => boolean
        readonly modification: Record<string, unknown>
      }
    }>
  }

  test('🔴★★★★★★加的是 +1、只【本回合】、只给【选中的那个】', () => {
    const evs = out(P1, 'a')
    expect(evs).toHaveLength(1)
    expect(evs[0]!.effect.modification).toEqual({ kind: 'addMight', delta: UNL_205_BONUS })
    expect(UNL_205_BONUS, '★卡面就是 1').toBe(1)
    expect(evs[0]!.effect.duration).toBe('thisTurn')
    expect(evs[0]!.effect.duration).not.toBe('permanent')
    expect(evs[0]!.effect.predicate({ oid: asObjId('a') })).toBe(true)
    expect(evs[0]!.effect.predicate({ oid: asObjId('b') }), '★★★没选中的不加').toBe(false)
  })
})
