import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { valuedKeywordTotal, keywordSources } from '../../src/effects/valuedKeyword'
import type { StaticEffect } from '../../src/effects/continuousView'

                                
                                                       
                                              
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, kws: readonly string[]): GameObject => ({
  oid: asObjId(oid), defId: 'U-ornn', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 4, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)
const gear = (oid: string, defId: string, host: string): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {},
  status: { attachedTo: asObjId(host) },
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
const sp = (e: StaticEffect, o: GameObject, s: GameState): boolean => { try { return e.predicate(o, s) } catch { return false } }
const total = (s: GameState, oid: string, name: string): number =>
  valuedKeywordTotal(s, s.objects[asObjId(oid)]!, name, sp)

describe('★★★★★★★ 尚歌第⑤源:印刷数值关键词×尚歌数', () => {
  test('★★★★★★QA L288 奥恩案例:印刷[法盾2]+两尚歌 ⇒ 法盾6;一尚歌 ⇒ 4;无尚歌 ⇒ 2', () => {
    const o = unit('ornn', ['法盾2'])
    expect(total(scene([o]), 'ornn', '法盾'), '★无尚歌=印刷一份').toBe(2)
    expect(total(scene([o, gear('s1', 'SFD-059', 'ornn')]), 'ornn', '法盾'), '★一尚歌=2+2').toBe(4)
    expect(total(scene([o, gear('s1', 'SFD-059', 'ornn'), gear('s2', 'SFD-059', 'ornn')]), 'ornn', '法盾'), '★★两尚歌=2+2+2(QA L288)').toBe(6)
  })

  test('★★★★★★反例:别的武装不算尚歌;贴在别人身上的尚歌不算;布尔关键词照常拥有', () => {
    const o = unit('ornn', ['法盾2', '游走'])
    const other = unit('other', [])
    const s = scene([o, other, gear('x1', 'SFD-090', 'ornn'), gear('s1', 'SFD-059', 'other')])
    expect(total(s, 'ornn', '法盾'), '★SFD-090 不是尚歌;贴 other 的尚歌不罩 ornn').toBe(2)
    expect(keywordSources(s, s.objects['ornn' as never]!, sp), '★布尔关键词一份照常').toContain('游走')
  })

  test('★★★★★★QA L184「只复制实际印刷」:被授予的[法盾2](③源)**不吃**尚歌乘', () => {
                                                                       
    const o = { ...unit('ornn', ['法盾2']), derived: { might: 4, keywords: ['法盾2', '法盾2'] } } as unknown as GameObject
    const s0 = scene([o, gear('s1', 'SFD-059', 'ornn')])
    const s = applyEvents(s0, [{
      kind: 'addEffect',
      effect: {
        id: 'grant:test', duration: 'permanent', fromPassive: true,
        predicate: (x: GameObject) => (x.oid as string) === 'ornn',
        modification: { kind: 'grantKeyword', keyword: '法盾2' },
      },
    }] as never, {}).state
                                                  
    expect(total(s, 'ornn', '法盾'), '★=4(印刷×2)+2(授予一份)=6,不是 8').toBe(6)
  })

  test('★★★★★★印刷**没有**[法盾]、只有被授予的:尚歌乘出 **0** 份法盾(只复制印刷)', () => {
                                                        
                                                        
    const bare = { ...unit('bare', []), derived: { might: 4, keywords: ['法盾2'] } } as unknown as GameObject
    const s0 = scene([bare, gear('s1', 'SFD-059', 'bare')])
    const s = applyEvents(s0, [{
      kind: 'addEffect',
      effect: {
        id: 'grant:bare', duration: 'permanent', fromPassive: true,
        predicate: (x: GameObject) => (x.oid as string) === 'bare',
        modification: { kind: 'grantKeyword', keyword: '法盾2' },
      },
    }] as never, {}).state
    expect(total(s, 'bare', '法盾'), '★印刷空 ⇒ 尚歌复制不出法盾;只剩授予那 2').toBe(2)
  })
})
