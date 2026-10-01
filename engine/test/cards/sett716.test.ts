import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardKeywords, cardKind, replaceDestroy } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { BUFF_COUNTER, buffCount } from '../../src/keywords/buff'
import { OGN_269, OGN_269_COST, settSave, makeSettReadyTrigger } from '../../data/cards/OGN-269'
import type { GameEvent } from '../../src/loop/events'

                                                            
                               
                                                
                                                
                           
  
           
                                                            
                                                   
                                    
                                                  
                                  
                                                              
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 2, counters: {}, status: {},
  ...extra,
} as GameObject)
const sett = (status: Record<string, boolean> = {}, who: PlayerId = P1): GameObject =>
  ({ ...obj('st', who, `legend:${who}`, { damage: 0 } as Partial<GameObject>), defId: 'OGN-269', baseTypes: ['legend'], status } as GameObject)
const rune = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, who, `base:${who}`, { damage: 0, baseTypes: ['rune'] } as Partial<GameObject>), defId: 'rune:orange' } as GameObject)
const buffed = (oid: string, who: PlayerId, n = 1): GameObject =>
  ({ ...obj(oid, who, BF0), counters: { [BUFF_COUNTER]: n } } as GameObject)

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

describe('★★★★★★★ ①②④救人:三重费用+同族救法', () => {
  test('★★★★★★齐活:付{A}+腕豪横置+耗一枚增益 ⇒ 死者清伤休眠回基地(replaceDestroy 链也走到)', () => {
    const s = scene([buffed('u', P1, 2), sett(), rune('r1', P1)])
    const out = settSave(s, asObjId('u'))!
    expect(out, '★替换发生').not.toBeNull()
    const u = out.objects['u' as never]!
    expect(u.zone as string, '★召回基地').toBe(`base:${P1}`)
    expect(u.status.dormant, '★进入休眠').toBe(true)
    expect(u.damage, '★移除所受伤害').toBe(0)
    expect(out.objects['st' as never]!.status.tapped, '★费用②:腕豪变休眠(传奇=tapped)').toBe(true)
    expect(buffCount(u), '★费用③:消耗**单个**增益(§702.2.b,2→1)').toBe(1)
    expect(out.zones[`base:${P1}` as never]!.contents, '★费用①:那枚符文被回收(不在基地了)').not.toContain('r1')
    expect(replaceDestroy(s, asObjId('u')), '★汇总链走到第七条(前六条此场景不命中)').not.toBeNull()
  })

  test('★★★★★★②付不起 ⇒ null 且费用一并免(§137):无符文时腕豪不横置、增益不消耗', () => {
    const s = scene([buffed('u', P1), sett()])
    expect(settSave(s, asObjId('u')), '★{A}付不起 ⇒ 不替换').toBeNull()
    expect(s.objects['st' as never]!.status.tapped, '★腕豪没被横置').not.toBe(true)
    expect(buffCount(s.objects['u' as never]), '★增益没被消耗').toBe(1)
  })

  test('★★★★★③反例三连:无增益/对手的腕豪救不了我/腕豪已休眠 ⇒ 都不替换', () => {
    expect(settSave(scene([obj('u', P1, BF0), sett(), rune('r1', P1)]), asObjId('u')), '★「拥有增益」不满足').toBeNull()
    expect(settSave(scene([buffed('u', P2), sett({}, P1), rune('r1', P2)]), asObjId('u')), '★「受你控制」=腕豪控制者的单位;P2 的单位 P2 没腕豪').toBeNull()
    expect(settSave(scene([buffed('u', P1), sett({ tapped: true }), rune('r1', P1)]), asObjId('u')), '★费用②付不起(已休眠)').toBeNull()
  })
})

describe('★★★★★★★ ⑤句②:征服 ⇒ 我变活跃', () => {
  const trig = makeSettReadyTrigger(asObjId('st'), P1)
  const conquer = (player: PlayerId): GameEvent => ({ kind: 'conquer', player, battlefield: BF0 } as unknown as GameEvent)
  test('★★★★★我征服响、对手征服不响;effect=statusChange tapped:false;离场空', () => {
    const s = scene([sett({ tapped: true })])
    expect(checkTrigger(trig, conquer(P1), s, P1)).toBe(true)
    expect(checkTrigger(trig, conquer(P2), s, P2), '★「当**你**征服」').toBe(false)
    expect(trig.effect(s, conquer(P1), {})).toEqual([{ kind: 'statusChange', target: 'st', key: 'tapped', value: false }])
    expect(trig.effect(scene([]), conquer(P1), {})).toEqual([])
  })
})

describe('★ 前提:登记(正典折叠)+费用形状', () => {
  test('★★★★★传奇 0费 橙+黄、三号一组、keywords 三号空、{A}=一枚任意域', () => {
    expect(CARD_COSTS['OGN-269']).toEqual({ mana: 0, pips: 0, colors: ['orange', 'yellow'] })
    expect(cardKind('OGN-269')).toBe('legend')
    expect(VARIANT_GROUPS['OGN-269']).toEqual(['OGN-269', 'OGN-310', 'OGN-310*'])
    for (const no of ['OGN-269', 'OGN-310', 'OGN-310*']) expect(cardKeywords(no), no).toEqual([])
    expect(OGN_269_COST, '★㊶ 一个符号=一枚;空数组=任意域').toEqual({ pips: [[]] })
    expect(OGN_269.energy).toBe(0)
  })
})
