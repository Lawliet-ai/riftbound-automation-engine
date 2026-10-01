import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { StaticEffect } from '../../src/effects/continuousView'
import { keywordSources, valuedKeywordTotal } from '../../src/effects/valuedKeyword'
import { resolveCopyBase } from '../../src/effects/copyChain'

                                          
                                                      
                                                            
                                  
  
           
                                                                 
                                                     
                                                          
                                       
                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, kws: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 2, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

const copyFx = (id: string, target: string, sourceOid: string, timestamp = 1): StaticEffect => ({
  id, duration: 'permanent', fromPassive: true, timestamp,
  predicate: (o: GameObject) => (o.oid as string) === target,
  modification: { kind: 'copyOf', sourceOid: asObjId(sourceOid) },
} as StaticEffect)
const kwFx = (id: string, target: string, keyword: string): StaticEffect => ({
  id, duration: 'permanent', fromPassive: false, timestamp: 5,
  predicate: (o: GameObject) => (o.oid as string) === target,
  modification: { kind: 'grantKeyword', keyword },
} as StaticEffect)

function scene(objs: readonly GameObject[], effects: readonly StaticEffect[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    continuousEffects: [...base.continuousEffects, ...effects] } as GameState
}

const sp = (e: StaticEffect, o: GameObject, s: GameState): boolean => { try { return e.predicate(o, s) } catch { return false } }
                                                                     
const shange = (oid: string, target: string): GameObject =>
  ({ ...obj(oid, 'SFD-059'), baseTypes: ['equipment'], status: { attachedTo: asObjId(target) } } as GameObject)

describe('★★★★★★★ ①②③①源链解析', () => {
  test('★★★★★★双层:C=copyOf B=copyOf A ⇒ C 的①源=A 印刷[法盾2](法盾总值 2,不是 0)', () => {
    const s = scene([obj('a', 'SRC', ['法盾2']), obj('b', 'token:映像'), obj('c', 'token:映像')],
      [copyFx('e1', 'b', 'a', 1), copyFx('e2', 'c', 'b', 2)])
    expect(keywordSources(s, s.objects['c' as never]!, sp), '★沿链到最终源 A 的印刷').toEqual(['法盾2'])
    expect(valuedKeywordTotal(s, s.objects['c' as never]!, '法盾', sp), '★数值=2').toBe(2)
    expect(resolveCopyBase(s, s.continuousEffects, asObjId('c'), sp)!.oid, '★共用件解到 a').toBe('a')
  })

  test('★★★★★②单层与非复制体=旧行为一字不变;③A 身上 grantKeyword 不进 C 的印刷面(化神 L142)', () => {
    const s1 = scene([obj('a', 'SRC', ['法盾2']), obj('b', 'token:映像')], [copyFx('e1', 'b', 'a')])
    expect(keywordSources(s1, s1.objects['b' as never]!, sp)).toEqual(['法盾2'])
    expect(keywordSources(s1, s1.objects['a' as never]!, sp), '★非复制体=自己印刷').toEqual(['法盾2'])
    const s2 = scene([obj('a', 'SRC'), obj('b', 'token:映像'), obj('c', 'token:映像')],
      [copyFx('e1', 'b', 'a', 1), copyFx('e2', 'c', 'b', 2), kwFx('e3', 'a', '法盾')])
    const cSources = keywordSources(s2, s2.objects['c' as never]!, sp)
    expect(cSources, '★A 被授予的[法盾]是临时调整,不进 C 的印刷面').toEqual([])
  })

  test('★★★★★⑤链断:上游 A 离场 ⇒ 停在 B(读 B 的印刷)', () => {
    const s = scene([obj('b', 'token:映像', ['坚守']), obj('c', 'token:映像')],
      [copyFx('e1', 'b', 'gone', 1), copyFx('e2', 'c', 'b', 2)])
    expect(keywordSources(s, s.objects['c' as never]!, sp), '★A 不在 ⇒ B 的可复制特质停更,读 B 印刷').toEqual(['坚守'])
  })
})

describe('★★★★★★★ ④⑤源(尚歌)同步链解析', () => {
  test('★★★★★★尚歌贴双层复制体 C ⇒ 乘的份=最终源 A 的印刷(法盾 2+2=4)', () => {
    const s = scene([obj('a', 'SRC', ['法盾2']), obj('b', 'token:映像'), obj('c', 'token:映像'), shange('sg', 'c')],
      [copyFx('e1', 'b', 'a', 1), copyFx('e2', 'c', 'b', 2)])
    expect(keywordSources(s, s.objects['c' as never]!, sp), '★①源一份+⑤源一份').toEqual(['法盾2', '法盾2'])
    expect(valuedKeywordTotal(s, s.objects['c' as never]!, '法盾', sp), '★2+2=4(QA L288 按份叠)').toBe(4)
  })
})
