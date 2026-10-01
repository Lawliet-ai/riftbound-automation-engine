import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardCost, cardKind } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { effectiveMight } from '../../src/state/might'
import { ACTIVATED_BATCH_DEFIDS } from '../../data/cards/activated-batch'

                                   
  
                                        
                                                            
                                                   
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function unit(oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
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
                         
const host = (oid: string, defId: string, zone = `base:${P1}`): GameObject =>
  unit(oid, P1, { defId, zone: asZoneId(zone), baseMight: 0, baseTypes: ['equipment'] })
const legendHost = (oid: string, defId: string): GameObject =>
  unit(oid, P1, { defId, zone: asZoneId(`legend:${P1}`), baseMight: 0, baseTypes: ['legend'] })

const specOf = (defId: string, key: string) => activatedFor(defId).find((s) => s.key === key)!
const might = (s: GameState, oid: string) => effectiveMight(s.objects[oid]!).reference
                                          
function resolve(
  defId: string, key: string, st: GameState, selfOid: string,
  target?: string, chosen: Record<string, string> = {},
): GameState {
  const spec = specOf(defId, key)
  return applyEvents(st, spec.makeResolve({ selfOid, controller: P1, ...(target !== undefined ? { target } : {}) })(st, chosen), {}).state
}

describe('★【主动技能批量】(第147轮)', () => {
  test('★★前提:activatedFor 对【每个卡号】都真的取得到技能(含再版)', () => {
    expect(ACTIVATED_BATCH_DEFIDS.slice().sort()).toEqual([
      'FND-259', 'FND-265', 'OGN-090', 'OGN-184', 'OGN-259',
      'OGN-265', 'OGN-305', 'OGN-308', 'SFD-052',
    ])
                                                                   
                                                     
    for (const defId of ACTIVATED_BATCH_DEFIDS) {
      expect(activatedFor(defId).length, `${defId} 取不到主动技能`).toBeGreaterThan(0)
    }
  })

  test('前提:费用与类别照卡面实测取', () => {
    expect(cardKind('OGN-090')).toBe('equipment')
    expect(cardCost('OGN-090').mana).toBe(1)
    expect(cardCost('SFD-052').mana).toBe(3)
    expect(cardCost('SFD-052').pips).toEqual([['green']])
    expect(cardCost('OGN-184').mana).toBe(2)
    for (const d of ['OGN-259', 'OGN-305', 'FND-259', 'OGN-265', 'OGN-308', 'FND-265']) {
      expect(cardKind(d), d).toBe('legend')
      expect(cardCost(d).mana, d).toBe(0)
    }
                                            
    expect(specOf('OGN-090', 'OGN-090:weaken').cost).toEqual({})
    expect(specOf('SFD-052', 'SFD-052:pump').cost).toEqual({})
    expect(specOf('OGN-184', 'OGN-184:recall').cost).toEqual({ mana: 1 })
    expect(specOf('OGN-259', 'OGN-259:shuttle').cost).toEqual({ mana: 2 })
    expect(specOf('OGN-265', 'OGN-265:minion').cost).toEqual({ mana: 1 })
                                 
    for (const [d, k] of [['OGN-090', 'OGN-090:weaken'], ['SFD-052', 'SFD-052:pump'],
      ['OGN-184', 'OGN-184:recall'], ['OGN-259', 'OGN-259:shuttle'], ['OGN-265', 'OGN-265:minion']]) {
      expect(specOf(d!, k!).tapSelf, d).toBe(true)
    }
  })

  test('★懊悔法球 OGN-090:-1 且 floor 到 1;候选含敌我、含基地', () => {
    const st = scene([host('orb', 'OGN-090'), unit('foe', P2, { baseMight: 3 }),
      unit('weak', P2, { baseMight: 1 }), unit('mine', P1, { zone: asZoneId(`base:${P1}`) })])
    expect(might(resolve('OGN-090', 'OGN-090:weaken', st, 'orb', 'foe'), 'foe')).toBe(2)
                                   
    expect(might(resolve('OGN-090', 'OGN-090:weaken', st, 'orb', 'weak'), 'weak')).toBe(1)
    const cands = specOf('OGN-090', 'OGN-090:weaken').legalTargets!(st, P1, 'orb')
    expect(cands.sort()).toEqual(['foe', 'mine', 'weak'])                 
  })

  test('★玄冰之心 SFD-052:+3(反向同形,没有 floor)', () => {
    const st = scene([host('heart', 'SFD-052'), unit('u', P1, { baseMight: 3 })])
    expect(might(resolve('SFD-052', 'SFD-052:pump', st, 'heart', 'u'), 'u')).toBe(6)
  })

  test('★塞壬号 OGN-184:只收【战场上的友方】单位;移动要补发 unitMoved', () => {
    const st = scene([host('ship', 'OGN-184'),
      unit('mineBf', P1), unit('foeBf', P2),
      unit('mineBase', P1, { zone: asZoneId(`base:${P1}`) })])
    const cands = specOf('OGN-184', 'OGN-184:recall').legalTargets!(st, P1, 'ship')
    expect(cands).toEqual(['mineBf'])                    
    const evs = specOf('OGN-184', 'OGN-184:recall')
      .makeResolve({ selfOid: 'ship', controller: P1, target: 'mineBf' })(st, {})
                                              
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
    const after = applyEvents(st, evs, {}).state
    expect(after.objects['mineBf']!.zone).toBe(`base:${P1}`)
  })

  test('★疾风剑豪 OGN-259:双向 —— 在战场则回基地(不追问),在基地则问去哪处战场', () => {
    const spec = specOf('OGN-259', 'OGN-259:shuttle')
    const st = scene([legendHost('lg', 'OGN-259'),
      unit('onBf', P1), unit('inBase', P1, { zone: asZoneId(`base:${P1}`) }), unit('foe', P2)])
    expect(spec.legalTargets!(st, P1, 'lg').sort()).toEqual(['inBase', 'onBf'])             

                                  
    expect(spec.makeNextChoice!({ selfOid: 'lg', controller: P1, target: 'onBf' })(st, {})).toBeNull()
    const back = applyEvents(st, spec.makeResolve({ selfOid: 'lg', controller: P1, target: 'onBf' })(st, {}), {}).state
    expect(back.objects['onBf']!.zone).toBe(`base:${P1}`)

                               
    const req = spec.makeNextChoice!({ selfOid: 'lg', controller: P1, target: 'inBase' })(st, {})
    expect(req).not.toBeNull()
    expect(req!.controller).toBe(P1)                 
    expect(req!.candidates.map((c) => c.id).sort()).toEqual([BF0, BF1])
    const out = applyEvents(st,
      spec.makeResolve({ selfOid: 'lg', controller: P1, target: 'inBase' })(st, { yasuoDest: BF1 }), {}).state
    expect(out.objects['inBase']!.zone).toBe(BF1)

                            
    expect(spec.makeNextChoice!({ selfOid: 'lg', controller: P1, target: 'inBase' })(st, { yasuoDest: BF1 })).toBeNull()
  })

  test('★奥术先驱 OGN-265:目标【就是落点】,按 §355.2.a 只有基地+我控制着单位的战场', () => {
    const spec = specOf('OGN-265', 'OGN-265:minion')
                                     
    const st = scene([legendHost('lg', 'OGN-265'), unit('mine', P1), unit('foe', P2, { zone: asZoneId(BF1) })])
    expect(spec.legalTargets!(st, P1, 'lg').sort()).toEqual([`base:${P1}`, BF0])                          
                                
    const bare = scene([legendHost('lg', 'OGN-265')])
    expect(spec.legalTargets!(bare, P1, 'lg')).toEqual([`base:${P1}`])

    const after = applyEvents(st, spec.makeResolve({ selfOid: 'lg', controller: P1, target: BF0 })(st, {}), {}).state
    const born = (after.zones[BF0]?.contents ?? []).map((o) => after.objects[o]!).filter((o) => o.defId === 'token:随从')
    expect(born).toHaveLength(1)
    expect(born[0]!.baseMight).toBe(1)
    expect(born[0]!.status.dormant).toBe(true)                             
  })
})
