import { describe, expect, test } from 'vitest'
import { runCleanupOnce, takeDeathSnapshots } from '../../src/loop/cleanup'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  lastRitesTriggerCount, snapshotOnDeath, collectLastRites, lastRitesStillValid,
} from '../../src/keywords/lastRites'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(id: string, kws: string[], extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: 'DEF-' + id, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: kws, damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: Record<string, GameObject>): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, objects: objs }
}
   
                                                    
                                          
                                                       
                                              
   
function zonedScene(objs: Record<string, GameObject>): GameState {
  const base = createInitialState([P1, P2], 2)
  const zones = { ...base.zones }
  for (const o of Object.values(objs)) {
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects: objs, zones }
}
                                                   
function crossedInto(kind: 'discard' | 'exile', snapDefId: string, oid: string): GameObject {
  return unit(oid, ['绝念'], { defId: snapDefId, zone: asZoneId(`${kind}:${P1}`) })
}

describe('§808 绝念:被摧毁后触发', () => {
  test('§808.3 是常驻牌的特性', () => {
                                               
                                                                        
    expect(lastRitesTriggerCount(['绝念'])).toBe(1)
    expect(lastRitesTriggerCount(['壁垒'])).toBe(0)
  })

  test('§808.2 每一个[绝念]效果都【分别】触发', () => {
    expect(lastRitesTriggerCount(['绝念'])).toBe(1)
    expect(lastRitesTriggerCount(['绝念', '绝念'])).toBe(2)
    expect(lastRitesTriggerCount([])).toBe(0)
  })

  test('§808.2 与灵便§819.2/后排§826.5 相反、与百炼§821.1.d/预知§817.2 同侧', () => {
    expect(lastRitesTriggerCount(['绝念', '绝念', '绝念'])).toBe(3)
  })

  test('§323.4 只为【被标记致命伤害且有绝念】的单位产出触发', () => {
    const s = scene({
      withLR: unit('withLR', ['绝念']),
      plain: unit('plain', []),
    })
    const out = collectLastRites(s, [asObjId('withLR'), asObjId('plain')])
    expect(out).toHaveLength(1)
    expect(out[0]!.oid).toBe('withLR')
  })

  test('§808.2 同一单位多个绝念 → 产出多条触发', () => {
    const s = scene({ u: unit('u', ['绝念', '绝念']) })
    expect(collectLastRites(s, [asObjId('u')])).toHaveLength(2)
  })

  test('§808.1.d.3 死前快照要记全:位置、战力、伤害、关键词、计数标、状态', () => {
    const o = unit('u', ['绝念'], {
      damage: 2, counters: { buff: 1 }, status: { dormant: true },
      derived: { might: 7, keywords: ['绝念', '壁垒'], restrictions: [] } as never,
    })
    const snap = snapshotOnDeath(o)
    expect(snap.zone).toBe(BF0)                   
    expect(snap.might).toBe(7)                 
    expect(snap.damage).toBe(2)
    expect(snap.keywords).toContain('壁垒')
    expect(snap.counters['buff']).toBe(1)
    expect(snap.status.dormant).toBe(true)
    expect(snap.controller).toBe(P1)
  })

  test('快照是【值拷贝】:之后改原物件不影响已记录的快照', () => {
    const o = unit('u', ['绝念'], { counters: { buff: 1 } })
    const snap = snapshotOnDeath(o)
    const mutated = { ...o, counters: { buff: 99 } }
    expect(snap.counters['buff']).toBe(1)            
    expect(mutated.counters['buff']).toBe(99)
  })

  test('§808.1.d.3 临时获得的绝念也能被记下(走 §124.1 tempKeywords 这条真实通道)', () => {
                                               
                                                          
                                                 
                                                      
                                                      
    const o = unit('u', [], { status: { tempKeywords: ['绝念'] } as never })
    const s = scene({ u: o })
    expect(collectLastRites(s, [asObjId('u')])).toHaveLength(1)
  })

  test('§808.2 两个绝念【分别】产出两条快照(读去重集合就会漏掉一条)', () => {
    const s = scene({ u: unit('u', ['绝念', '绝念']) })
    expect(collectLastRites(s, [asObjId('u')])).toHaveLength(2)
  })

  test('§808.1.d.1 牌确实进了废牌堆 → 触发有效', () => {
    const o = unit('u', ['绝念'])
    const snap = snapshotOnDeath(o)
                                               
                                                        
                                                        
                                   
    const inDiscard = crossedInto('discard', o.defId, 'u#discard')
    const after = zonedScene({ [inDiscard.oid]: inDiscard })
    expect(after.objects['u']).toBeUndefined()                
    expect(after.zones[`discard:${P1}`]!.contents).toContain('u#discard')             
    expect(lastRitesStillValid(snap, after)).toBe(true)
  })

  test('★缺陷98 §427.2.a 原 oid 同样消失,但牌进的是【放逐区】→ 触发作废', () => {
                                           
                                                              
                                                                     
                                          
    const o = unit('u', ['绝念'])
    const snap = snapshotOnDeath(o)
    const exiled = crossedInto('exile', o.defId, 'u#exile')
    const after = zonedScene({ [exiled.oid]: exiled })
    expect(after.objects['u']).toBeUndefined()                           
    expect(after.zones[`exile:${P1}`]!.contents).toContain('u#exile')
    expect(after.zones[`discard:${P1}`]!.contents).toHaveLength(0)             
    expect(lastRitesStillValid(snap, after)).toBe(false)
  })

  test('★缺陷98 postDeathOid 这条首选证据也认【区域】,不是认"存在"', () => {
    const o = unit('u', ['绝念'])
    const snap = { ...snapshotOnDeath(o), postDeathOid: asObjId('u#new') }
    const exiled = crossedInto('exile', o.defId, 'u#new')
    expect(lastRitesStillValid(snap, zonedScene({ [exiled.oid]: exiled }))).toBe(false)
                                          
    const discarded = crossedInto('discard', o.defId, 'u#new')
    expect(lastRitesStillValid(snap, zonedScene({ [discarded.oid]: discarded }))).toBe(true)
  })

  test('§808.1.d.1 摧毁被替换成召回(牌没进废牌堆)→ 该触发【从结算链移除】', () => {
    const o = unit('u', ['绝念'])
    const snap = snapshotOnDeath(o)
                     
    const after = scene({ u: { ...o, zone: asZoneId('base:P1') } })
    expect(lastRitesStillValid(snap, after)).toBe(false)
  })

  test('不存在的 oid 安全跳过', () => {
    expect(collectLastRites(scene({}), [asObjId('nope')])).toHaveLength(0)
  })
})

describe('§323.4 → §323.5 顺序:快照必须先于摧毁(端到端)', () => {
  test('清理步跑完后,死前快照仍拿得到死时的位置与战力', () => {
                                  
    const dying = unit('dying', ['绝念'], { damage: 3 })
    const s = scene({ dying })
    const after = runCleanupOnce(s)
                          
    expect(after.objects['dying']).toBeUndefined()
                             
    const snaps = takeDeathSnapshots()
    expect(snaps).toHaveLength(1)
    expect(snaps[0]!.zone).toBe(BF0)                      
    expect(snaps[0]!.might).toBe(3)
  })

  test('没有绝念的单位死亡:不产生快照', () => {
    const s = scene({ plain: unit('plain', [], { damage: 5 }) })
    runCleanupOnce(s)
    expect(takeDeathSnapshots()).toHaveLength(0)
  })
})
