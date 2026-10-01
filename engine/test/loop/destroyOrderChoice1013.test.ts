import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { chooseDestroyReplacement, destroyOrderKey, type CleanupHooks } from '../../src/loop/cleanup'

                                                      
  
                                         
                                          
                                 
                                            
                                                      
                                                                    
  
                                  
                                                                        
                                                               
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string

function scene(): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const o = {
    oid: asObjId('u'), defId: 'U-A', owner: P1, controller: P1, zone: asZoneId(BF),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'] as never, damage: 2, counters: {}, status: {},
  } as GameObject
  objects['u'] = o
  const z = zones[BF]!
  zones[BF] = { ...z, contents: [...z.contents, asObjId('u') as ObjId] }
  return { ...base, objects, zones } as GameState
}
                                                      
function hooksWith(...ids: string[]): CleanupHooks {
  return {
    replaceDestroyCandidates: () => ids.map((id) => ({
      id, sourceDefId: `CARD-${id}`,
      apply: (s: GameState, oid: ObjId): GameState => {
        const o = s.objects[oid]!
        return { ...s, objects: { ...s.objects, [oid]: { ...o, damage: 0, counters: { [id]: 1 } } } }
      },
    })),
  }
}

describe('★★★★★★★ ★1013 §372 摧毁替换的选序权', () => {
  test('0 个候选 ⇒ none(照常摧毁,不问)', () => {
    const r = chooseDestroyReplacement(scene(), asObjId('u'), { replaceDestroyCandidates: () => [] })
    expect(r.kind).toBe('none')
  })

  test('🔴1 个候选 ⇒ 直接用,【不问】(§372 无从选起;绝大多数局面走这里)', () => {
    const r = chooseDestroyReplacement(scene(), asObjId('u'), hooksWith('a'), { canAsk: true })
    expect(r.kind, '★单候选即使允许问也不该问').toBe('apply')
    expect(r.kind === 'apply' && r.chosen.id).toBe('a')
  })

  test('🔴≥2 个候选 + 允许问 + 没答案 ⇒ ask(把选择权交回控制者)', () => {
    const r = chooseDestroyReplacement(scene(), asObjId('u'), hooksWith('a', 'b'), { canAsk: true })
    expect(r.kind, '★这正是规则要交回玩家的那一刻').toBe('ask')
    if (r.kind !== 'ask') return
    expect(r.controller, '★问的是【受影响物体的控制者】').toBe(P1)
    expect(r.candidates.map((c) => c.id), '★候选全给出去,顺序=缺省序').toEqual(['a', 'b'])
    expect(r.key, '★key 认"哪一次摧毁"').toBe(destroyOrderKey(asObjId('u')))
  })

  test('🔴≥2 个候选 + 已有答案 ⇒ 照答案走(不再问)', () => {
    const s = scene()
    const withAns = { ...s, ruleChoices: { [destroyOrderKey(asObjId('u'))]: 'b' } } as GameState
    const r = chooseDestroyReplacement(withAns, asObjId('u'), hooksWith('a', 'b'), { canAsk: true })
    expect(r.kind).toBe('apply')
    expect(r.kind === 'apply' && r.chosen.id, '★用的是玩家选的 b,不是缺省的 a').toBe('b')
  })

  test('🔴缺省(不允许问、也没答案)⇒ 取首候选 = 接活前的行为【同步局的安全网】', () => {
    const r = chooseDestroyReplacement(scene(), asObjId('u'), hooksWith('a', 'b'))                   
    expect(r.kind, '★同步局绝不能停下来问,否则长跑当场死').toBe('apply')
    expect(r.kind === 'apply' && r.chosen.id, '★缺省=注册序第一条').toBe('a')
  })

  test('放开侧:答案对不上候选(盘面变了)⇒ 回落缺省,【不抛】', () => {
    const s = scene()
    const stale = { ...s, ruleChoices: { [destroyOrderKey(asObjId('u'))]: 'ghost' } } as GameState
    const r = chooseDestroyReplacement(stale, asObjId('u'), hooksWith('a', 'b'), { canAsk: true })
                                   
    expect(r.kind, '★陈旧答案不该让它崩,也不该当成有效答案').toBe('ask')
  })

  test('key 认对象:不同 oid 的 key 不同(不串味)', () => {
    expect(destroyOrderKey(asObjId('u'))).not.toBe(destroyOrderKey(asObjId('v')))
  })

  test('源码级:key 里带 §372,便于定位是哪条规则的选择权', () => {
    expect(destroyOrderKey(asObjId('u'))).toContain('§372')
  })
})
