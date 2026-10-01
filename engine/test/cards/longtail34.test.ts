import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { detectTriggers } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { EXTRA_BF_TRIGGER_FACTORIES } from '../../data/cards/battlefields-extra'
import {
  LONGTAIL34_DEFIDS, OGN_293_UNITS, makeUnl105MoveTrigger, ogn105Victims, otherBattlefields, unitsHereOf,
} from '../../data/cards/longtail-34'

                                                      
  
                                    
                                                               
                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, ctrl: typeof P1, zone: string, might = 3, defId = 'BLK'): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const movedEv = (unit: string, player: typeof P1, from: string, to: string) =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player, from: asZoneId(from), to: asZoneId(to) }) as unknown as GameEvent
const holdEv = (player: typeof P1, bf: string) =>
  ({ kind: 'hold', player, battlefield: asZoneId(bf) }) as unknown as GameEvent

describe('★【长尾批次·三十四】前提', () => {
  test('登记齐;费用/战力照卡面实测取(㊶ 已抓过三次)', () => {
    expect(LONGTAIL34_DEFIDS.slice().sort()).toEqual(['OGN-293', 'UNL-105'])
    expect(cardKind('OGN-293')).toBe('battlefield')
    expect(cardKind('UNL-105')).toBe('unit')
    expect(CARD_COSTS['OGN-293']).toEqual({ mana: 0, pips: 0, colors: ['colorless'] })
    expect(CARD_COSTS['UNL-105']).toEqual({ mana: 5, pips: 0, colors: ['orange'] })
    expect(cardCost('UNL-105')).toEqual({ mana: 5 })
    expect(specLookup('UNL-105').baseMight).toBe(5)
    expect(OGN_293_UNITS).toBe(7)
    expect(Object.keys(EXTRA_BF_TRIGGER_FACTORIES)).toContain('OGN-293')
  })

  test('★挑战者的触发本身登记着(铁律83)', () => {
    const st = scene([obj('ch', P1, BF0, 5, 'UNL-105')])
    expect(activeTriggers(st).some((t) => String(t.id).includes('UNL-105'))).toBe(true)
  })
})

describe('★★ 宏伟广场 OGN-293:据守此处 + 在此有≥7名【我的】单位 → 直接获胜', () => {
  const plaza = (mine: number, foes = 0): GameState => scene([
    ...Array.from({ length: mine }, (_, i) => obj(`m${i}`, P1, BF0)),
    ...Array.from({ length: foes }, (_, i) => obj(`f${i}`, P2, BF0)),
  ])
                                    
  const both = () => [
    ...EXTRA_BF_TRIGGER_FACTORIES['OGN-293']!(BF0, P1),
    ...EXTRA_BF_TRIGGER_FACTORIES['OGN-293']!(BF0, P2),
  ]
  function fire(st: GameState, ev: GameEvent, actor: typeof P1): GameState {
    let s = st
    for (const it of detectTriggers(st, ev, both(), actor)) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    return s
  }

  test('★★阈值三档 6/7/8(⑩ 含边界值)', () => {
    expect(fire(plaza(OGN_293_UNITS - 1), holdEv(P1, BF0), P1).winner).toBeNull()                                   
    expect(fire(plaza(OGN_293_UNITS), holdEv(P1, BF0), P1).winner).toBe(P1)
    expect(fire(plaza(OGN_293_UNITS + 1), holdEv(P1, BF0), P1).winner).toBe(P1)
  })

  test('★★★「**你**拥有」:敌方站再多也不算(㉖)', () => {
    expect(unitsHereOf(plaza(3, 9), BF0, P1)).toBe(3)
    expect(fire(plaza(3, 9), holdEv(P1, BF0), P1).winner).toBeNull()                                   
  })

  test('★★★据守【别处】不算(⑫ 对照组)', () => {
    expect(fire(plaza(9), holdEv(P1, BF1), P1).winner).toBeNull()                                   
  })

  test('★★对手据守此处时,赢的不是我(两份触发各归各)', () => {
                                                           
    expect(fire(plaza(9), holdEv(P2, BF0), P2).winner).toBeNull()                                   
  })
})

describe('★★ 气势逼人的挑战者 UNL-105:我移动后,可把此处战力低于我的一名敌方单位踢到另一处战场', () => {
  const trig = () => makeUnl105MoveTrigger(asObjId('ch'), P1)
                                            
  const after = (extra: readonly GameObject[]) => scene([obj('ch', P1, BF0, 5, 'UNL-105'), ...extra])
  function ask(st: GameState, chosen: Record<string, string> = {}) {
    const items = detectTriggers(st, movedEv('ch', P1, BF1, BF0), [trig()], P1)
    return { fired: items.length, req: items[0]?.nextChoice?.(st, chosen) ?? null, item: items[0] }
  }

  test('★★候选=此处、敌方、战力严格低于我', () => {
    const st = after([
      obj('weakFoe', P2, BF0, 4), obj('sameFoe', P2, BF0, 5), obj('bigFoe', P2, BF0, 6),
      obj('weakMate', P1, BF0, 1), obj('farFoe', P2, BF1, 1),
    ])
    expect(ogn105Victims(st, asObjId('ch'), P1)).toEqual(['weakFoe'])
  })

  test('★★★平手不算(「低于」是严格小于;㉔ 每一半各一条)', () => {
    expect(ogn105Victims(after([obj('sameFoe', P2, BF0, 5)]), asObjId('ch'), P1)).toEqual([])
    expect(ogn105Victims(after([obj('weakFoe', P2, BF0, 4)]), asObjId('ch'), P1)).toEqual(['weakFoe'])
  })

  test('★★★落点是「另一处【战场】」:不含基地,也不含它当前那处', () => {
    const st = after([obj('weakFoe', P2, BF0, 1)])
    const dests = otherBattlefields(st, 'weakFoe')
    expect(dests).toEqual([BF1])
    expect(dests.some((z) => z.startsWith('base:'))).toBe(false)
  })

  test('★★两问按序:先问踢谁、再问踢到哪;答完不再问(⑰)', () => {
    const st = after([obj('weakFoe', P2, BF0, 1)])
    const q1 = ask(st)
    expect(q1.fired).toBe(1)
    expect(q1.req?.key).toBe('challengerVictim')
    const q2 = ask(st, { challengerVictim: 'weakFoe' })
    expect(q2.req?.key).toBe('challengerDest')
    expect(ask(st, { challengerVictim: 'weakFoe', challengerDest: BF1 }).req).toBeNull()
  })

  test('★★结算:那名敌方单位真的挪到了选中的战场', () => {
    const st = after([obj('weakFoe', P2, BF0, 1)])
    const it = ask(st).item!
    const s = applyEvents(st, it.resolve(st, { challengerVictim: 'weakFoe', challengerDest: BF1 }, it), {}).state
    expect(s.objects[asObjId('weakFoe')]!.zone).toBe(BF1)
    expect(s.objects[asObjId('ch')]!.zone).toBe(BF0)                      
  })

  test('★★★「当【我】移动时」:别人移动不触发(与隐秘追踪者正好相反)', () => {
    const st = after([obj('mate', P1, BF0, 1), obj('weakFoe', P2, BF0, 1)])
    expect(detectTriggers(st, movedEv('mate', P1, BF1, BF0), [trig()], P1).length).toBe(0)
  })

  test('★★★没有合法受害者 ⇒ 不弹问(§355.17)', () => {
    expect(ask(after([obj('bigFoe', P2, BF0, 9)])).req).toBeNull()
  })

  test('★「你可以选择」= mayChoose(整条技能可选)', () => {
    expect(trig().mayChoose).toBe(true)
  })
})
