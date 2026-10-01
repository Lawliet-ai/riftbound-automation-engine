import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardCost, cardKind } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { detectTriggers } from '../../src/dsl/trigger'
import { CARD_COSTS } from '../../data/cardCosts'
import { EXTRA_BF_TRIGGER_FACTORIES } from '../../data/cards/battlefields-extra'
import { LONGTAIL31_DEFIDS, makeBackAlleyBarTrigger } from '../../data/cards/longtail-31'

                                                  
  
                                                              
                              
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, ctrl: typeof P1, zone: string, defId = 'BLK'): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
const legend = (oid: string, defId: string, ctrl = P1): GameObject => ({
  ...obj(oid, ctrl, `legend:${ctrl}`, defId), baseMight: 0, baseTypes: ['legend'],
})
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const specOf = (defId: string, key: string) => activatedFor(defId).find((s) => s.key === key)!
const kwsOf = (s: GameState, oid: string): readonly string[] =>
  recomputeContinuous(s).objects[asObjId(oid)]!.derived?.keywords ?? []
const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId(oid)]!).reference
                                         
const moved = (unit: string, player: typeof P1, from: string, to: string) =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player, from: asZoneId(from), to: asZoneId(to) }) as const

describe('★【长尾批次·三十一】前提', () => {
  test('登记齐;费用照卡面实测取', () => {
    expect(LONGTAIL31_DEFIDS.slice().sort()).toEqual(['OGN-277', 'VEN-193'])
    expect(cardKind('VEN-193')).toBe('legend')
    expect(cardCost('VEN-193').mana).toBe(0)                   
    expect(CARD_COSTS['VEN-193']).toEqual({ mana: 0, pips: 0, colors: ['green', 'yellow'] })
    expect(CARD_COSTS['OGN-277']).toEqual({ mana: 0, pips: 0, colors: ['colorless'] })
                           
    expect(Object.keys(EXTRA_BF_TRIGGER_FACTORIES)).toContain('OGN-277')
    expect(activatedFor('VEN-193').map((s) => s.key)).toEqual(['VEN-193:grantBulwark'])
  })
})

describe('★★ 暮光之眼 VEN-193:[迅捷][横置] 给一名【友方】单位本回合 [壁垒]', () => {
  const spec = () => specOf('VEN-193', 'VEN-193:grantBulwark')

  test('★★★候选只有【友方】单位 —— 敌方一个都不在里面(㊷ 与赏金猎人差的第②处)', () => {
    const st = scene([
      legend('eye', 'VEN-193'), obj('mine', P1, BF0), obj('inBase', P1, `base:${P1}`), obj('foe', P2, BF0),
    ])
    expect(spec().legalTargets!(st, P1, 'eye').sort()).toEqual(['inBase', 'mine'])            
                                                 
    expect(specOf('OGN-267', 'OGN-267:grantRoam').legalTargets!(st, P1, 'eye').sort())
      .toEqual(['foe', 'inBase', 'mine'])
  })

  test('★★结算后目标真的拿到 [壁垒](⑬ 授予类要走 recomputeContinuous 才看得见)', () => {
    const st = scene([legend('eye', 'VEN-193'), obj('mine', P1, BF0)])
    expect(kwsOf(st, 'mine')).not.toContain('壁垒')      
    const after = applyEvents(st, spec().makeResolve({ selfOid: 'eye', controller: P1, target: 'mine' })(st, {}), {}).state
    expect(kwsOf(after, 'mine')).toContain('壁垒')
  })

  test('★★★给的是 [壁垒] 不是 [游走](㊷ 与赏金猎人差的第①处)', () => {
    const st = scene([legend('eye', 'VEN-193'), legend('bh', 'OGN-267'), obj('mine', P1, BF0)])
    const a = applyEvents(st, spec().makeResolve({ selfOid: 'eye', controller: P1, target: 'mine' })(st, {}), {}).state
    expect(kwsOf(a, 'mine')).toContain('壁垒')
    expect(kwsOf(a, 'mine')).not.toContain('游走')
                                   
    const b = applyEvents(st, specOf('OGN-267', 'OGN-267:grantRoam').makeResolve({ selfOid: 'bh', controller: P1, target: 'mine' })(st, {}), {}).state
    expect(kwsOf(b, 'mine')).toContain('游走')
    expect(kwsOf(b, 'mine')).not.toContain('壁垒')
  })

  test('★★★权限轴:暮光之眼印着 [迅捷],赏金猎人没有(㊷ 差的第③处;⑧ 要真登记不能只写 label)', () => {
    expect(spec().keywords).toEqual(['迅捷'])
    expect(specOf('OGN-267', 'OGN-267:grantRoam').keywords ?? []).toEqual([])
    expect(spec().tapSelf).toBe(true)
    expect(spec().cost).toEqual({})              
  })

  test('★㊳b 这条是【本回合内】,不是永久 —— 直接断言效果的 duration', () => {
    const st = scene([legend('eye', 'VEN-193'), obj('mine', P1, BF0)])
    const evs = spec().makeResolve({ selfOid: 'eye', controller: P1, target: 'mine' })(st, {})
    expect((evs[0] as { effect: { duration: string } }).effect.duration).toBe('thisTurn')
  })
})

describe('★★ 后巷酒吧 OGN-277:每当一名单位【从此处向别处】移动时,让其本回合 {S}+1', () => {
                                          
  const bothCopies = () => [
    ...EXTRA_BF_TRIGGER_FACTORIES['OGN-277']!(BF0, P1),
    ...EXTRA_BF_TRIGGER_FACTORIES['OGN-277']!(BF0, P2),
  ]
                                   
  function fire(st: GameState, ev: ReturnType<typeof moved>, actor: typeof P1): GameState {
    const fired = detectTriggers(st, ev as never, bothCopies(), actor)
    let s = st
                                                                                  
    for (const it of fired) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    return s
  }

  test('★前提:两份触发真的都登记着(㊳ 不然下面"只响一次"是空的)', () => {
    expect(bothCopies().length).toBe(2)
  })

  test('★★★从此处走 ⇒ 只 +1(两份触发只许响一次,铁律78)', () => {
    const st = scene([obj('u', P1, BF0)])
    expect(mightOf(st, 'u')).toBe(3)      
    const after = fire(st, moved('u', P1, BF0, BF1), P1)
    expect(mightOf(after, 'u')).toBe(4)          
  })

  test('★★敌方的单位从此处走也算(卡文写的是「一名单位」,没写敌我)', () => {
    const st = scene([obj('foe', P2, BF0)])
    const after = fire(st, moved('foe', P2, BF0, BF1), P2)
    expect(mightOf(after, 'foe')).toBe(4)
  })

  test('★★★不是从此处走的一律不响(⑫ 对照组)', () => {
    const st = scene([obj('u', P1, BF1)])
                      
    expect(mightOf(fire(st, moved('u', P1, BF1, BF0), P1), 'u')).toBe(3)
                                       
    expect(mightOf(fire(st, moved('u', P1, `base:${P1}`, BF0), P1), 'u')).toBe(3)
  })

  test('★★同一回合从此处走两趟 = +2(㊻ 可叠加;实测 addEffect 是纯追加、不按 id 覆盖)', () => {
    const st = scene([obj('u', P1, BF0)])
    let s = fire(st, moved('u', P1, BF0, BF1), P1)
    s = fire(s, moved('u', P1, BF0, BF1), P1)           
    expect(mightOf(s, 'u')).toBe(5)
  })

  test('★★原地不动的"移动"不给加成(§355.4.a 终点须异于当前位置)', () => {
                                                               
                                                                     
                                                        
    const st = scene([obj('u', P1, BF0)])
    expect(mightOf(fire(st, moved('u', P1, BF0, BF0), P1), 'u')).toBe(3)
  })

  test('★受益人是【移动的那名单位】,不是场上别人(㉜)', () => {
    const st = scene([obj('u', P1, BF0), obj('other', P1, BF0)])
    const after = fire(st, moved('u', P1, BF0, BF1), P1)
    expect(mightOf(after, 'u')).toBe(4)
    expect(mightOf(after, 'other')).toBe(3)
  })
})
