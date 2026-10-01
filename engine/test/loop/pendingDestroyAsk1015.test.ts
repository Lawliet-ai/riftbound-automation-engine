import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { pendingDestroyAsk, destroyOrderKey, runCleanupToFixpoint } from '../../src/loop/cleanup'
import { replaceDestroy, replaceDestroyCandidates } from '../../data/registry'
import { installProviders } from '../../data/gameDeps'

installProviders()

                                                  
  
                                                           
                                                         
                                        
                                               
                                                  
                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string
const HOOKS = { replaceDestroy, replaceDestroyCandidates }

                               
function scene(opts: { readonly lethal: boolean; readonly withAngel: boolean; readonly withExile: boolean }): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (oid: string, defId: string, types: string[], st: Record<string, unknown> = {}, dmg = 0): void => {
    objects[oid] = {
      oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF),
      baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: dmg, counters: {}, status: st,
    } as GameObject
    const z = zones[BF]!
    zones[BF] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  put('victim', 'U-A', ['unit'], {}, opts.lethal ? 3 : 0)
  if (opts.withAngel) put('ga', 'SFD-051', ['gear'], { attachedTo: asObjId('victim') })
  const s = { ...base, objects, zones } as unknown as GameState
  return opts.withExile ? ({ ...s, turnShields: { victim: { exileOnDestroy: true } } } as unknown as GameState) : s
}

describe('★★★★★★★ ★1015 §372 预扫:什么时候该问、什么时候不该问', () => {
  test('🔴该问:有单位将死 且 两条替换都成立', () => {
    const ask = pendingDestroyAsk(scene({ lethal: true, withAngel: true, withExile: true }), HOOKS)
    expect(ask, '★这一轮清理会撞上选序').not.toBeNull()
    expect(ask?.controller, '★§372:问受影响物体的**控制者**').toBe(P1)
    expect(ask?.key).toBe(destroyOrderKey(asObjId('victim')))
    expect(ask?.candidates.map((c) => c.sourceDefId), '★带出处卡号供 UI 渲染卡名')
      .toEqual(['SFD-051', 'UNL-007'])
  })

                                               
  test('🔴不问:没有单位将死(伤害没到致命)', () => {
    expect(pendingDestroyAsk(scene({ lethal: false, withAngel: true, withExile: true }), HOOKS)).toBeNull()
  })

  test('🔴不问:将死但只有【一条】替换 —— 单候选不打断玩家', () => {
    expect(pendingDestroyAsk(scene({ lethal: true, withAngel: true, withExile: false }), HOOKS)).toBeNull()
    expect(pendingDestroyAsk(scene({ lethal: true, withAngel: false, withExile: true }), HOOKS)).toBeNull()
  })

  test('🔴不问:将死但一条替换都没有 —— 照常摧毁', () => {
    expect(pendingDestroyAsk(scene({ lethal: true, withAngel: false, withExile: false }), HOOKS)).toBeNull()
  })

  test('🔴不问:多候选但【答案已经写好了】—— 同一次摧毁不重复问', () => {
    const s = {
      ...scene({ lethal: true, withAngel: true, withExile: true }),
      ruleChoices: { [destroyOrderKey(asObjId('victim'))]: 'exileInstead' },
    } as GameState
    expect(pendingDestroyAsk(s, HOOKS), '★读到答案就不该再问').toBeNull()
  })

  test('🔴不问:没注入候选钩子(老数据层)—— 一切照旧,绝不打断', () => {
    expect(pendingDestroyAsk(scene({ lethal: true, withAngel: true, withExile: true }), { replaceDestroy })).toBeNull()
  })

  test('🔴只读:预扫一个字节都不许改 state(它要能被反复调用)', () => {
    const s = scene({ lethal: true, withAngel: true, withExile: true })
    const before = JSON.stringify(s.zones)
    pendingDestroyAsk(s, HOOKS)
    pendingDestroyAsk(s, HOOKS)
    expect(JSON.stringify(s.zones), '★两次预扫后盘面原样').toBe(before)
    expect(s.objects[asObjId('victim')]?.zone, '★将死的单位还站在原处').toBe(BF)
  })

  test('🔴哨兵(将来会红):预扫说"要问"时,同步清理走的是【缺省】那条', () => {
                                                 
                                                  
    const s = scene({ lethal: true, withAngel: true, withExile: true })
    expect(pendingDestroyAsk(s, HOOKS), '★预扫说要问').not.toBeNull()
    const after = runCleanupToFixpoint(s, HOOKS)
    expect((after.zones[`base:${P1}`]?.contents ?? []).length, '★但清理没停,按缺省救了人').toBe(1)
  })
})
