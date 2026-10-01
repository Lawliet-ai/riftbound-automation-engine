import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'

                                                      
                                                
                                                   
                                                      
                     
  
           
                                                               
                                                        
                                                                    
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, might: number, kws: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: might, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

const copyEffect = (id: string, target: string, sourceOid: string) => ({
  kind: 'addEffect',
  effect: {
    id, duration: 'permanent', fromPassive: true,
    predicate: (o: GameObject) => (o.oid as string) === target,
    modification: { kind: 'copyOf', sourceOid: asObjId(sourceOid) },
  },
})
const addMightEffect = (id: string, target: string, delta: number) => ({
  kind: 'addEffect',
  effect: {
    id, duration: 'permanent', fromPassive: true,
    predicate: (o: GameObject) => (o.oid as string) === target,
    modification: { kind: 'addMight', delta },
  },
})
const grantKwEffect = (id: string, target: string, keyword: string) => ({
  kind: 'addEffect',
  effect: {
    id, duration: 'permanent', fromPassive: true,
    predicate: (o: GameObject) => (o.oid as string) === target,
    modification: { kind: 'grantKeyword', keyword },
  },
})

const view = (s: GameState, oid: string) => recomputeContinuous(s).objects[asObjId(oid)]!

describe('★★★★★★★ ①③复制套复制跟随(§477.1.b.1.b 乐芙兰举例)', () => {
  test('★★★★★★①B copyOf A、A copyOf S ⇒ B=S 印刷(5[S]+坚守)、copiedDefId=U-S;A 同', () => {
    const s0 = scene([obj('S', 'U-S', 5, ['坚守']), obj('A', 'token:映像', 0), obj('B', 'token:映像', 0)])
    const s = applyEvents(s0, [copyEffect('cp:A', 'A', 'S'), copyEffect('cp:B', 'B', 'A')] as never, {}).state
    const b = view(s, 'B')
    expect(b.derived!.might, '★复制复制体=最终源印刷,不是映像的 0').toBe(5)
    expect(b.derived!.keywords).toContain('坚守')
    expect(b.derived!.copiedDefId, '★三个「诚实掮客」——身份也到底').toBe('U-S')
    expect(view(s, 'A').derived!.copiedDefId).toBe('U-S')
  })

  test('★★★★★③三层 C→B→A→S 也解到底', () => {
    const s0 = scene([obj('S', 'U-S', 5), obj('A', 'token:映像', 0), obj('B', 'token:映像', 0), obj('C', 'token:映像', 0)])
    const s = applyEvents(s0, [copyEffect('cp:A', 'A', 'S'), copyEffect('cp:B', 'B', 'A'), copyEffect('cp:C', 'C', 'B')] as never, {}).state
    expect(view(s, 'C').derived!.might).toBe(5)
    expect(view(s, 'C').derived!.copiedDefId).toBe('U-S')
  })
})

describe('★★★★★★★ ②临时调整不复制(化神 L142)', () => {
  test('★★★★★★A 身上的 +3 战力与被授予的[瞬息]都不进 B;A 自己有(8[S]+瞬息)、B 没有(5[S])', () => {
    const s0 = scene([obj('S', 'U-S', 5), obj('A', 'token:映像', 0), obj('B', 'token:映像', 0)])
    const s = applyEvents(s0, [
      copyEffect('cp:A', 'A', 'S'), addMightEffect('pm:A', 'A', 3), grantKwEffect('kw:A', 'A', '瞬息'),
      copyEffect('cp:B', 'B', 'A'),
    ] as never, {}).state
    expect(view(s, 'A').derived!.might, '★A 自己:复制 5 + 临时 +3').toBe(8)
    expect(view(s, 'A').derived!.keywords).toContain('瞬息')
    expect(view(s, 'B').derived!.might, '★战力增减是临时调整,不被复制').toBe(5)
    expect(view(s, 'B').derived!.keywords, '★被授予的瞬息也是临时调整').not.toContain('瞬息')
  })
})

describe('★★★★★★★ ④⑤时间戳与链断', () => {
  test('★★★★★★④A 先复制 S1 再复制 S2 ⇒ B 拿 S2(「更新为新获得的」=最后一次)', () => {
    const s0 = scene([obj('S1', 'U-S1', 4), obj('S2', 'U-S2', 7), obj('A', 'token:映像', 0), obj('B', 'token:映像', 0)])
    const s1 = applyEvents(s0, [copyEffect('cp:A1', 'A', 'S1'), copyEffect('cp:B', 'B', 'A')] as never, {}).state
    expect(view(s1, 'B').derived!.might, '★先只有 S1').toBe(4)
    const s2 = applyEvents(s1, [copyEffect('cp:A2', 'A', 'S2')] as never, {}).state
    expect(view(s2, 'A').derived!.might, '★A 更新为 S2').toBe(7)
    expect(view(s2, 'B').derived!.might, '★B 跟随 A 的**最新**复制').toBe(7)
    expect(view(s2, 'B').derived!.copiedDefId).toBe('U-S2')
  })

  test('★★★★★⑤直接源离场 ⇒ copyOf 不应用(回落印刷);上游 S 离场 ⇒ B 停在 A 的印刷(与 A 自己回落一致)', () => {
    const s0 = scene([obj('A', 'token:映像', 0), obj('B', 'token:映像', 0)])
    const s = applyEvents(s0, [copyEffect('cp:A', 'A', 'S-gone'), copyEffect('cp:B', 'B', 'A')] as never, {}).state
    expect(view(s, 'A').derived!.might, '★S 不在 ⇒ A 回落映像印刷').toBe(0)
    expect(view(s, 'A').derived!.copiedDefId, '★没复制成').toBeUndefined()
    expect(view(s, 'B').derived!.might, '★B 停在 A 的印刷(链断口径一致)').toBe(0)
    expect(view(s, 'B').derived!.copiedDefId, '★B 的身份=A 的 defId?——不,A 是最终解,复制的是映像').toBe('token:映像')
  })
})
