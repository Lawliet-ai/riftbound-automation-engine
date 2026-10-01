import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardCost, cardKind } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { buffCount } from '../../src/keywords/buff'
import {
  SIGIL_BATCH_DEFIDS, SIGIL_DEFIDS, SIGIL_DOMAIN_OF, sigilCardEffect,
} from '../../data/cards/sigils'

                      
  
                                                         
                        
                                                
                                                                
                                               
                                                           
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const runesOf = (s: GameState, p = P1) => s.runePools[p]?.runes ?? {}

describe('★【六色之印】+ 盲僧(第148轮)', () => {
  test('★★前提:14 个卡号逐个都取得到主动技能(只登记了 7 个正典,其余靠别名解析)', () => {
    expect(SIGIL_BATCH_DEFIDS.slice().sort()).toEqual([
      'OGN-040', 'OGN-081', 'OGN-120', 'OGN-163', 'OGN-204', 'OGN-245', 'OGN-257', 'OGN-304',
      'SFD-222', 'SFD-226', 'SFD-229', 'SFD-231', 'SFD-234', 'SFD-238',
    ])
    for (const defId of SIGIL_BATCH_DEFIDS) {
      expect(activatedFor(defId).length, `${defId} 取不到主动技能`).toBe(1)
    }
  })

  test('★★六色【别串色】:每个卡号给的正好是它自己那一色,1 点', () => {
                                              
    for (const defId of SIGIL_DEFIDS) {
      const st = scene([obj('sig', defId, P1, { zone: asZoneId(`base:${P1}`), baseTypes: ['equipment'] })])
      const spec = activatedFor(defId)[0]!
      const after = applyEvents(st, spec.makeResolve({ selfOid: 'sig', controller: P1 })(st, {}), {}).state
      expect(runesOf(after), defId).toEqual({ [SIGIL_DOMAIN_OF[defId]!]: 1 })
    }
                                      
    expect(new Set(SIGIL_DEFIDS.map((d) => SIGIL_DOMAIN_OF[d]!)).size).toBe(6)
  })

  test('★★[反应] 权限与 fastResolve 都真的挂上了(§337.2/§429.2)', () => {
    for (const defId of SIGIL_DEFIDS) {
      const spec = activatedFor(defId)[0]!
                                                        
                                               
      expect(spec.fastResolve, `${defId} 缺 fastResolve`).toBe(true)
      expect(spec.keywords, `${defId} 缺[反应]权限`).toEqual(['反应'])
      expect(spec.tapSelf, defId).toBe(true)
      expect(spec.cost, defId).toEqual({})             
      expect(spec.target, defId).toBe('none')
    }
  })

  test('前提:之印是【0法力 + 1枚本色pip】的装备(不是纯0费);卡文模板逐字', () => {
                                                                      
                                             
    for (const defId of SIGIL_DEFIDS) {
      expect(cardKind(defId), defId).toBe('equipment')
      expect(cardCost(defId).mana, defId).toBe(0)
      expect(cardCost(defId).pips, defId).toEqual([[SIGIL_DOMAIN_OF[defId]!]])
    }
    expect(sigilCardEffect('红色')).toBe(
      '{{横置}}：{{反应}}—{{获得}}{{红色}}，用以支付符能费用。（获得费用资源的技能无法成为其他法术的反应目标。）')
  })

  test('★之印给的是【符能池那一色】,不是通用法力(两条账不能混)', () => {
    const st = scene([obj('sig', 'OGN-040', P1, { zone: asZoneId(`base:${P1}`), baseTypes: ['equipment'] })])
    const before = st.runePools[P1]?.mana ?? 0
    const spec = activatedFor('OGN-040')[0]!
    const after = applyEvents(st, spec.makeResolve({ selfOid: 'sig', controller: P1 })(st, {}), {}).state
    expect(after.runePools[P1]?.mana).toBe(before)          
    expect(runesOf(after)).toEqual({ red: 1 })
  })

  test('★盲僧 OGN-257:候选只有【友方】单位,给的是增益', () => {
    const st = scene([obj('lg', 'OGN-257', P1, { zone: asZoneId(`legend:${P1}`), baseTypes: ['legend'] }),
      obj('mine', 'BLK', P1), obj('foe', 'BLK', P2)])
    const spec = activatedFor('OGN-257')[0]!
    expect(spec.legalTargets!(st, P1, 'lg')).toEqual(['mine'])              
    expect(spec.cost).toEqual({ mana: 1 })
    const after = applyEvents(st, spec.makeResolve({ selfOid: 'lg', controller: P1, target: 'mine' })(st, {}), {}).state
    expect(buffCount(after.objects['mine']!)).toBe(1)
  })

  test('★盲僧再版 OGN-304 与正典共用同一份规格(registry 里没有它,靠别名表解析)', () => {
                                                               
    expect(activatedFor('OGN-304')[0]!.key).toBe(activatedFor('OGN-257')[0]!.key)
    expect(cardKind('OGN-304')).toBe('legend')
  })
})
