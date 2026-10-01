import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { DelayedTrigger } from '../../src/effects/delayedTriggers'
import { activeTriggers, cardKeywords, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { SFD_202, SFD_202_SPEC, SFD_202_CARD_EFFECT } from '../../data/cards/SFD-202'

                                                                          
                                                                               
                                                               
                                                                                                    
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(id: string, ctrl: typeof P1, zone: string): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: { dormant: true } } as GameObject
}
function scene(objs: GameObject[], extra: Partial<GameState> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, ...extra } as GameState
}
const DELAYED: DelayedTrigger = {
  kind: 'loseControlAtTurnEnd', id: 'SFD-202:sp:e1', controller: P1, sourceDefId: 'SFD-202',
  target: asObjId('e1'), returnTo: P2,
} as DelayedTrigger

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('官方名;5费2pip蓝/黄;[待命] 两条通道;无变体;spell 表运行时', () => {
    expect(SFD_202.name).toBe('恶意收购')
    expect(CARD_COSTS['SFD-202']).toEqual({ mana: 5, pips: 2, colors: ['blue', 'yellow'] })
    expect(SFD_202_SPEC.cost).toEqual({ mana: 5, pips: [['blue', 'yellow'], ['blue', 'yellow']] })
    expect(SFD_202_SPEC.keywords, 'spec 侧(时机权限)').toEqual(['待命'])
    expect(cardKeywords('SFD-202'), 'CARD_KEYWORDS 侧(教训②)').toEqual(['待命'])
    expect(VARIANT_GROUPS['SFD-202']).toBeUndefined()
    expect(SFD_202_CARD_EFFECT).toContain('失去该单位的控制权')
    expect(playSpecFor('SFD-202'), '⑥运行时为准').toBe(SFD_202_SPEC)
  })

  test('🔴★★★候选=战场上敌方(OGN-203 逐字同口径复用):基地敌方/我方单位不进', () => {
    const s = scene([unit('e1', P2, BF0), unit('e2', P2, `base:${P2}`), unit('m1', P1, BF0)])
    expect(SFD_202_SPEC.legalTargets!(s, P1)).toEqual(['e1'])
  })
})

describe('🔴★★★★结算三段(夺控不召回)与延时档', () => {
  const resolve = SFD_202_SPEC.makeResolve({ movedCardOid: 'sp', target: 'e1', controller: P1 } as never)

  test('🔴★★★changeController 我 + dormant false + 延时档 returnTo=【夺控前原控制者】(㉗);不发 recall', () => {
    const evs = resolve(scene([unit('e1', P2, BF0)]))
    expect(evs).toHaveLength(3)
    expect(evs[0]).toMatchObject({ kind: 'changeController', target: 'e1', player: P1 })
    expect(evs[1]).toMatchObject({ kind: 'statusChange', target: 'e1', key: 'dormant', value: false })
    expect(evs[2]).toMatchObject({ kind: 'delayedTrigger',
      add: { kind: 'loseControlAtTurnEnd', target: 'e1', returnTo: P2, controller: P1 } })
    expect(evs.map((e) => (e as { kind: string }).kind), '夺过来【不召回】(与 OGN-203 的差)').not.toContain('recall')
  })

  test('🔴★★★目标没了 ⇒ 一条都不发', () => {
    expect(resolve(scene([]))).toEqual([])
  })

  test('🔴★★★延时档注入:账在+活人 ⇒ activeTriggers 有;人死 ⇒ 剪掉(盯活人)', () => {
    const alive = scene([unit('e1', P2, BF0)], { delayedTriggers: [DELAYED] } as Partial<GameState>)
    expect(activeTriggers(alive).filter((t) => t.id.includes('SFD-202:delayed'))).toHaveLength(1)
    const dead = scene([], { delayedTriggers: [DELAYED] } as Partial<GameState>)
    expect(activeTriggers(dead).filter((t) => t.id.includes('SFD-202:delayed')), '死了就没什么好还的').toHaveLength(0)
  })

  test('🔴★★★回合结束:先 clear + 还控回原主【在前】+ recall【在后】(还控后召回 = 落原主基地)', () => {
    const s = scene([unit('e1', P1, BF0)], { delayedTriggers: [DELAYED] } as Partial<GameState>)
    const t = activeTriggers(s).find((x) => x.id.includes('SFD-202:delayed'))!
    const evs = t.effect!(s, { kind: 'endOfTurn' } as GameEvent, {})
    expect(evs[0]).toMatchObject({ kind: 'delayedTrigger', clear: 'SFD-202:sp:e1' })
    expect(evs[1]).toMatchObject({ kind: 'changeController', target: 'e1', player: P2 })
    expect(evs[2]).toMatchObject({ kind: 'recall', target: 'e1' })
    expect(evs.map((e) => (e as { kind: string }).kind), '「不算作移动」⇒ 无 unitMoved').not.toContain('unitMoved')
  })
})
