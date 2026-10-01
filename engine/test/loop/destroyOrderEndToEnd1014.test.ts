import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { runCleanupToFixpoint, chooseDestroyReplacement, destroyOrderKey } from '../../src/loop/cleanup'
import { replaceDestroyCandidates } from '../../data/registry'
import { installProviders } from '../../data/gameDeps'

installProviders()

                                                       
  
                                                    
                                                
                                                     
                                                      
                                                                    
  
                                                          
                                                    
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string
const HOOKS = { replaceDestroyCandidates }

                                            
function scene(): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (oid: string, defId: string, types: string[], st: Record<string, unknown> = {}, dmg = 0, might = 2): void => {
    const o = {
      oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF),
      baseMight: might, baseKeywords: [], baseTypes: types as never, damage: dmg, counters: {}, status: st,
    } as GameObject
    objects[oid] = o
    const z = zones[BF]!
    zones[BF] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  put('victim', 'U-A', ['unit'], {}, 3, 3)
  put('ga', 'SFD-051', ['gear'], { attachedTo: asObjId('victim') })
  return { ...base, objects, zones, turnShields: { victim: { exileOnDestroy: true } } } as unknown as GameState
}
const where = (s: GameState, oid: string): string => String(s.objects[asObjId(oid)]?.zone ?? '(不在场上)')
                                                      
const count = (s: GameState, zone: string): number => (s.zones[zone]?.contents ?? []).length

describe('★★★★★★★ ★1014 §372 端到端:保人还是保甲,由控制者选', () => {
  test('前提自证:这个盘面确实有【两条】替换同时成立(否则下面全是空转)', () => {
    const cands = replaceDestroyCandidates(scene(), asObjId('victim'))
    expect(cands.map((c) => c.id), '★复活甲与惩戒都够得着这次死亡')
      .toEqual(['guardianAngel', 'exileInstead'])
  })

  test('🔴决策:要问,而且问的是【受影响单位的控制者】', () => {
    const r = chooseDestroyReplacement(scene(), asObjId('victim'), HOOKS, { canAsk: true })
    expect(r.kind).toBe('ask')
    if (r.kind !== 'ask') return
    expect(r.controller, '★§372 说的是"受影响物体的控制者",不是出牌的那一方').toBe(P1)
    expect(r.candidates.map((c) => c.sourceDefId), '★候选带出处卡号,UI 据此渲染卡名与卡面原文')
      .toEqual(['SFD-051', 'UNL-007'])
  })

  test('🔴选择一(缺省·保人):单位活着回基地,复活甲被烧掉', () => {
    const s = runCleanupToFixpoint(scene(), HOOKS)
    expect(where(s, 'victim'), '★人活了,回基地').toBe(`base:${P1}`)
    expect(where(s, 'ga'), '★甲没了').toBe('(不在场上)')
  })

  test('🔴选择二(保甲):选"先惩戒" ⇒ 单位被放逐,复活甲完好留在场上', () => {
    const withAns = {
      ...scene(),
      ruleChoices: { [destroyOrderKey(asObjId('victim'))]: 'exileInstead' },
    } as GameState
    const s = runCleanupToFixpoint(withAns, HOOKS)
                                                      
                                                                     
                                                   
    expect(count(s, `exile:${P1}`), '★放逐区里多了一张(那就是被放逐的单位)').toBe(1)
    expect(s.objects[asObjId('victim')], '★旧 oid 不再存在(跨区换号)').toBeUndefined()
    expect(where(s, 'ga'), '★甲保住了,还在战场上').toBe(BF)
  })

  test('🔴差异条:两种选择的结局【确实不同】—— 这个选择权有硬后果', () => {
    const a = runCleanupToFixpoint(scene(), HOOKS)
    const b = runCleanupToFixpoint(
      { ...scene(), ruleChoices: { [destroyOrderKey(asObjId('victim'))]: 'exileInstead' } } as GameState,
      HOOKS,
    )
                                         
    expect(count(a, `base:${P1}`), 'a 路:人回基地').toBe(1)
    expect(count(a, `exile:${P1}`), 'a 路:放逐区空').toBe(0)
    expect(count(b, `exile:${P1}`), 'b 路:人进放逐区').toBe(1)
    expect(where(a, 'ga'), '★复活甲的去向也不同').not.toBe(where(b, 'ga'))
  })

  test('放开侧:只有复活甲(没有惩戒标记)⇒ 单候选,不问,照旧救人', () => {
    const s0 = scene()
    const noExile = { ...s0, turnShields: {} } as unknown as GameState
    const cands = replaceDestroyCandidates(noExile, asObjId('victim'))
    expect(cands.map((c) => c.id), '★只剩一条候选').toEqual(['guardianAngel'])
    const r = chooseDestroyReplacement(noExile, asObjId('victim'), HOOKS, { canAsk: true })
    expect(r.kind, '★单候选不问').toBe('apply')
    const s = runCleanupToFixpoint(noExile, HOOKS)
    expect(where(s, 'victim'), '★照旧救人').toBe(`base:${P1}`)
  })
})
