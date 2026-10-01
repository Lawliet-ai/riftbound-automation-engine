import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { isTeemoUnitDef, OGN_263, OGN_263_CARD_EFFECT, OGN_263_SPEC, swiftScoutTargets, SWIFT_SCOUT_STANDBY_COST } from '../../data/cards/OGN-263'
import { placeStandby } from '../../src/keywords/standby'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, zone: string, ctrl: typeof P1, keywords: string[] = []): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseKeywords: keywords, baseMight: 3, damage: 0, counters: {}, status: {} }
}
                                                                           
                                                              
const TEEMO_DEF = 'OGN-121'                        
function teemoObj(id: string, zone: string, ctrl: typeof P1): GameObject {
  return { oid: asObjId(id), defId: TEEMO_DEF, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseKeywords: [], baseMight: 3, damage: 0, counters: {}, status: {}, baseTypes: ['unit'] } as GameObject
}
function place(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, objects, zones }
}

describe('迅捷斥候 OGN-263', () => {
  test('卡文逐字 + 传奇', () => {
    expect(OGN_263_CARD_EFFECT).toContain('支付{{1}}来正面朝下放置')
    expect(OGN_263_CARD_EFFECT).toContain('放入你的手牌')
    expect(OGN_263.category).toBe('legend')
  })

  test('技能一:待命布置替代费 [A]→付1', () => {
    expect(SWIFT_SCOUT_STANDBY_COST).toEqual({ energy: 1 })
  })

  test('替代费下仍可正常布置待命(付1代替付A)', () => {
                                                  
    const s = place([obj('guard', BF0, P1), obj('hidden', 'hand:P1', P1)])
    const { state } = placeStandby(s, asObjId('hidden'), BF0, P1)
    const sb = Object.values(state.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
    expect(sb.contents.length).toBe(1)
  })

                                                      
                                                              
                                                                            
  test('技能二:你拥有的场上提莫单位在候选里,结算产出返手事件', () => {
    const s = place([teemoObj('teemo', BF0, P1)])
    expect(swiftScoutTargets(s, P1)).toContain('teemo')
    const evs = OGN_263_SPEC.makeResolve({ selfOid: 'scout', controller: P1, target: 'teemo' })(s)
    expect(evs.length, '结算要真的产出事件(返手件)').toBeGreaterThan(0)
  })

  test('★非提莫单位/【非你拥有】的都不在候选里(这条守的是真路径 swiftScoutTargets)', () => {
    const s1 = place([obj('other', BF0, P1, ['据守'])])       
    expect(swiftScoutTargets(s1, P1)).not.toContain('other')
    const s2 = place([teemoObj('enemyTeemo', BF0, P2)])                   
    expect(swiftScoutTargets(s2, P1), '去掉 owner 判据就会红').not.toContain('enemyTeemo')
  })

  test('英雄区的提莫单位也在候选里(卡文「位于英雄区域或场上」)', () => {
    const s = place([teemoObj('heroTeemo', 'heroZone:P1', P1)])
    expect(swiftScoutTargets(s, P1)).toContain('heroTeemo')
  })

                                                             
                                                 
  test('isTeemoUnitDef 识别:按英雄标签查表,不认 baseKeywords 里写的"提莫"', () => {
    expect(isTeemoUnitDef(TEEMO_DEF)).toBe(true)
    expect(isTeemoUnitDef('U')).toBe(false)                
  })
})
