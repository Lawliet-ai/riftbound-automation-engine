import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { activeTriggers, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { applyEvents } from '../../src/loop/reduce'
import { makeJayceHammerTrigger, VEN_088_PICK, VEN_088_MODES } from '../../data/cards/VEN-088'

                                                                 
                          
                                                 
  
           
                                                               
                                                     
                                                  
                                                                    
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'VEN-088', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

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

const trig = makeJayceHammerTrigger(asObjId('jc'), P1)
const status = (target: string, key: string, value: boolean, by: PlayerId = P1): GameEvent =>
  ({ kind: 'statusChange', target: asObjId(target), key, value, player: by } as unknown as GameEvent)

describe('★ 前提:①登记', () => {
  test('★★★★★4费 1橙pip 5[S]、两号都登、UNIT_COST 带 pip、TRIGGERS 接线、两号一组', () => {
    expect(CARD_COSTS['VEN-088']).toEqual({ mana: 4, pips: 1, colors: ['orange'] })
    expect(cardKind('VEN-088')).toBe('unit')
    expect(VARIANT_GROUPS['VEN-088']).toEqual(['VEN-088', 'VEN-088a'])
    expect(cardKeywords('VEN-088')).toEqual([])
    expect(cardKeywords('VEN-088a')).toEqual([])
    expect(cardCost('VEN-088'), '★㊶ 1 橙 pip 别当没有').toEqual({ mana: 4, pips: [['orange']] })
    const ids = activeTriggers(scene([obj('jc', P1, BF0)])).map((t) => t.id)
    expect(ids.some((i) => i.startsWith('VEN-088:active')), '★TRIGGERS 表接线').toBe(true)
  })
})

describe('★★★★★★★ ②触发+③三选一+④效果', () => {
  test('★★★★★★②我变为活跃响(对手弄活也响);变休眠/别的单位/tapped 轴都不响', () => {
    const s = scene([obj('jc', P1, BF0), obj('ally', P1, BF0)])
    expect(checkTrigger(trig, status('jc', 'dormant', false), s, P1)).toBe(true)
    expect(checkTrigger(trig, status('jc', 'dormant', false, P2), s, P2), '★by any').toBe(true)
    expect(checkTrigger(trig, status('jc', 'dormant', true), s, P1), '★变为休眠 ⇒ 不响').toBe(false)
    expect(checkTrigger(trig, status('ally', 'dormant', false), s, P1), '★别的单位 ⇒ 不响').toBe(false)
    expect(checkTrigger(trig, status('jc', 'tapped', false), s, P1), '★「活跃」是 dormant 轴').toBe(false)
  })

  test('★★★★★★③三档必选无 skip;答过不问;我离场不问', () => {
    const s = scene([obj('jc', P1, BF0)])
    const q = trig.nextChoice!(s, status('jc', 'dormant', false), {})!
    expect(q.key).toBe(VEN_088_PICK)
    expect(q.candidates.map((c) => c.id), '★「选择一个」三档必选,无 skip').toEqual(['强攻2', '法盾2', '游走'])
    expect(trig.nextChoice!(s, status('jc', 'dormant', false), { [VEN_088_PICK]: '游走' })).toBeNull()
    expect(trig.nextChoice!(scene([]), status('jc', 'dormant', false), {}), '★我离场不问').toBeNull()
  })

  test('★★★★★★④三档各一 grantKeyword thisTurn 给我;端到端 derived 含所选;非法答案 ⇒ 空', () => {
    const s = scene([obj('jc', P1, BF0)])
    for (const mode of VEN_088_MODES) {
      const evs = trig.effect(s, status('jc', 'dormant', false), { [VEN_088_PICK]: mode }) as unknown as readonly { kind: string, effect?: { duration?: string, modification: { kind: string, keyword?: string } } }[]
      expect(evs).toHaveLength(1)
      expect(evs[0]!.effect!.duration, '★「在本回合内」').toBe('thisTurn')
      expect(evs[0]!.effect!.modification).toEqual({ kind: 'grantKeyword', keyword: mode })
    }
                                          
    const evs = trig.effect(s, status('jc', 'dormant', false), { [VEN_088_PICK]: '法盾2' })
    const after = recomputeContinuous(applyEvents(s, evs as never, {}).state)
    expect(after.objects[asObjId('jc')]!.derived?.keywords).toContain('法盾2')
    expect(trig.effect(s, status('jc', 'dormant', false), { [VEN_088_PICK]: '瞬息' }), '★不在三档里 ⇒ 空').toEqual([])
    expect(trig.effect(s, status('jc', 'dormant', false), {})).toEqual([])
  })
})
