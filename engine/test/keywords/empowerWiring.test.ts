import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { EMPOWER_COUNTER, empowerCount, isEmpowered } from '../../src/keywords/empower'
import { empowerActivationSpecs, parseEmpowerCost } from '../../src/loop/empowerActivation'

                                              
                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}

describe('§827.1.c 费用解析', () => {
  test('强化5 → 5 法力', () => {
    expect(parseEmpowerCost('强化5')).toEqual({ mana: 5 })
  })

  test('强化3绿色 → 3 法力 + 一枚绿', () => {
    expect(parseEmpowerCost('强化3绿色')).toEqual({ mana: 3, pips: [['green']] })
  })

  test('★裸「强化」= §827.1.c.2 非资源费用变体 → 不可机器生成', () => {
    expect(parseEmpowerCost('强化')).toBeNull()
  })

  test('不是强化的关键词 → null', () => {
    expect(parseEmpowerCost('装配红色')).toBeNull()
  })
})

describe('§827 激活规格生成', () => {
  test('印着强化5 → 一条主动技能,费用照卡面', () => {
    const { specs } = empowerActivationSpecs(['强化5'])
    expect(specs).toHaveLength(1)
    expect(specs[0]!.cost).toEqual({ mana: 5 })
  })

  test('★§827.1.b.1 源物件【不是】目标(误设目标会招来法盾加价等一串错)', () => {
    expect(empowerActivationSpecs(['强化5']).specs[0]!.target).toBe('none')
  })

  test('★§827.3 多个强化 = 多个可分别激活的技能', () => {
    expect(empowerActivationSpecs(['强化2', '强化5']).specs).toHaveLength(2)
  })

  test('🔴🔴★★★★★★★【A3·548】满层【仍可激活】,只是结算时无操作', () => {
                                                            
                                         
                                     
                                                   
                                                    
    const spec = empowerActivationSpecs(['强化5']).specs[0]!
    const kayle = obj('kayle', BF0, {
      derived: { empowerLimit: 3 } as never,
      counters: { [EMPOWER_COUNTER]: 3 },
    })
    const s = scene(kayle)                       
    expect(empowerCount(s.objects[asObjId('kayle')]), '★前提:已经满 3 层').toBe(3)
    expect(spec.available!(s, P1, 'kayle'), '★★★满层仍可激活').toBe(true)
  })

  test('🔴★★★★★★二元档(缺省 limit=1)一字不变:已强化就不再可激活', () => {
                                                  
    const spec = empowerActivationSpecs(['强化5']).specs[0]!
    const plain = obj('plain', BF0, { counters: { [EMPOWER_COUNTER]: 1 } })
    const s = scene(plain)
    expect(spec.available!(s, P1, 'plain'), '★★★卡面写着「仅在未强化时可用」').toBe(false)
               
    const fresh = scene(obj('fresh'))
    expect(spec.available!(fresh, P1, 'fresh')).toBe(true)
  })

  test('★「已强化」是 §828 依赖性关键词,不能被当成强化费用去解析', () => {
    const { specs, unparsed } = empowerActivationSpecs(['已强化'])
    expect(specs).toEqual([])
    expect(unparsed).toEqual([])
  })

  test('裸「强化」进 unparsed(显式报出来,不静默丢)', () => {
    expect(empowerActivationSpecs(['强化']).unparsed).toEqual(['强化'])
  })

  test('★§827.2 结算产出 empower【事件】,不是偷改计数(否则"当我变为已强化时"收不到)', () => {
    const evs = empowerActivationSpecs(['强化5']).specs[0]!.makeResolve({ selfOid: 'u', controller: P1 })(scene(obj('u')))
    expect(evs).toEqual([{ kind: 'empower', target: 'u' }])
  })
})

describe('§441/§442 事件落地', () => {
  test('empower 事件 → 物件变为已强化', () => {
    const s = applyEvents(scene(obj('u')), [{ kind: 'empower', target: asObjId('u') }]).state
    expect(isEmpowered(s.objects['u' as never])).toBe(true)
  })

  test('★§441.1.b 已强化的再强化 → 无操作(不叠第二层)', () => {
    let s = applyEvents(scene(obj('u')), [{ kind: 'empower', target: asObjId('u') }]).state
    s = applyEvents(s, [{ kind: 'empower', target: asObjId('u') }]).state
    expect(empowerCount(s.objects['u' as never])).toBe(1)
  })

                                                          
                                                            
                                                  
                                                                   
                                                        
  test('缺省上限 1:连续强化多次仍只有一层', () => {
    let s = scene(obj('u'))
    for (let i = 0; i < 5; i++) s = applyEvents(s, [{ kind: 'empower', target: asObjId('u') }]).state
    expect(empowerCount(s.objects['u' as never])).toBe(1)
  })

                                                                          

  test('§442 解除强化 → 归零', () => {
    let s = applyEvents(scene(obj('u')), [{ kind: 'empower', target: asObjId('u') }]).state
    s = applyEvents(s, [{ kind: 'disempower', target: asObjId('u') }]).state
    expect(isEmpowered(s.objects['u' as never])).toBe(false)
  })

  test('§442.1.a.1 对未强化的解除 → 无操作', () => {
    const s = applyEvents(scene(obj('u')), [{ kind: 'disempower', target: asObjId('u') }]).state
    expect(isEmpowered(s.objects['u' as never])).toBe(false)
  })

  test('★§441.2 只有【场上】物件能持有已强化(手牌里的不行)', () => {
    const s = applyEvents(scene(obj('h', `hand:${P1}`)), [{ kind: 'empower', target: asObjId('h') }]).state
    expect(isEmpowered(s.objects['h' as never])).toBe(false)
  })
})
