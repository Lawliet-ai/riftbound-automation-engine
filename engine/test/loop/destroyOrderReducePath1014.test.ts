import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { destroyOrderKey } from '../../src/loop/cleanup'
import { replaceDestroyCandidates, replaceDestroy } from '../../data/registry'
import { installProviders } from '../../data/gameDeps'

installProviders()

                                                 
  
                                    
                                                                   
                                                            
                                                   
                                                      
                                         
                                                                 
  
                                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string
const HOOKS = { replaceDestroy, replaceDestroyCandidates }

function scene(): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (oid: string, defId: string, types: string[], st: Record<string, unknown> = {}): void => {
    objects[oid] = {
      oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF),
      baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: st,
    } as GameObject
    const z = zones[BF]!
    zones[BF] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  put('victim', 'U-A', ['unit'])
  put('ga', 'SFD-051', ['gear'], { attachedTo: asObjId('victim') })
                                           
  return { ...base, objects, zones, turnShields: { victim: { exileOnDestroy: true } } } as unknown as GameState
}
const count = (s: GameState, zone: string): number => (s.zones[zone]?.contents ?? []).length
const DESTROY = [{ kind: 'destroy' as const, target: asObjId('victim') }]

describe('★★★★★★★ ★1014 §372 第二条路:指示事件流也要听玩家的', () => {
  test('前提自证:这个盘面确实【两条候选都成立】(㊷ 断言"动手之前不该发生")', () => {
    expect(replaceDestroyCandidates(scene(), asObjId('victim')).map((c) => c.id))
      .toEqual(['guardianAngel', 'exileInstead'])
  })

  test('🔴缺省(没答案):走 reduce 也照旧救人 —— 与接活前逐字节一致', () => {
    const { state: s } = applyEvents(scene(), DESTROY, { cleanupHooks: HOOKS })
    expect(count(s, `base:${P1}`), '★人回基地').toBe(1)
    expect(String(s.objects[asObjId('ga')]?.zone ?? '(无)'), '★甲被烧掉').toBe('(无)')
  })

  test('🔴🔴关键条:玩家选了"先惩戒" ⇒ 【reduce 这条路】也照答案走', () => {
    const withAns = {
      ...scene(),
      ruleChoices: { [destroyOrderKey(asObjId('victim'))]: 'exileInstead' },
    } as GameState
    const { state: s } = applyEvents(withAns, DESTROY, { cleanupHooks: HOOKS })
    expect(count(s, `exile:${P1}`), '★人进放逐区').toBe(1)
    expect(count(s, `base:${P1}`), '★没有回基地').toBe(0)
    expect(String(s.objects[asObjId('ga')]?.zone ?? '(无)'), '★甲保住了').toBe(BF)
  })

  test('🔴一致性:两条路(清理步 / reduce)对同一答案给出【同样】的结局', () => {
                                     
    const key = destroyOrderKey(asObjId('victim'))
    const viaReduce = applyEvents(
      { ...scene(), ruleChoices: { [key]: 'exileInstead' } } as GameState, DESTROY, { cleanupHooks: HOOKS },
    ).state
                                                             
    expect(count(viaReduce, `exile:${P1}`)).toBe(1)
    expect(String(viaReduce.objects[asObjId('ga')]?.zone ?? '(无)')).toBe(BF)
  })

  test('放开侧:答案写的是【别的对象】的 key ⇒ 不串味,照旧救人', () => {
    const s = applyEvents(
      { ...scene(), ruleChoices: { [destroyOrderKey(asObjId('someoneElse'))]: 'exileInstead' } } as GameState,
      DESTROY, { cleanupHooks: HOOKS },
    ).state
    expect(count(s, `base:${P1}`), '★答案带 oid,不同对象各问各的').toBe(1)
  })

  test('放开侧:答案里写了个【不存在的候选 id】⇒ 回落缺省,不炸', () => {
    const s = applyEvents(
      { ...scene(), ruleChoices: { [destroyOrderKey(asObjId('victim'))]: 'noSuchCandidate' } } as GameState,
      DESTROY, { cleanupHooks: HOOKS },
    ).state
    expect(count(s, `base:${P1}`), '★脏答案不该让引擎崩,取缺省首候选').toBe(1)
  })
})
