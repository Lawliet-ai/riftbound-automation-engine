import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { nimbleAttachTargets } from '../../src/keywords/nimble'
import { nightbladeHosts } from '../../data/cards/SFD-139'
import { firstCandidates } from '../../data/cards/two-target-spells'

                                                      
  
                                                     
                                                    
                                                                                       
                                                                                         
                                                                           
                                                                           
                                                                                         
                                                                                            
                                                                                          
  
                                                                           
                                                                     
                                                
                                                             
  
                                                                           
                                                                                        
                                                   
                                                                              
  
                                                              
                                                                  
                                                   
                                                                    
                                                      
                                                           
                                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`
const BF0 = 'battlefield:shared:0'

const mk = (oid: string, types: readonly string[], zone: string, ctrl = P1): GameObject => ({
  oid: asObjId(oid), defId: `X-${oid}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 1, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function board(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const zones: Record<string, unknown> = { ...s.zones }
  for (const zid of [BASE, BF0]) {
    const z = s.zones[zid as never] as { contents?: unknown } | undefined
    if (z) zones[zid] = { ...z, contents: objs.filter((o) => String(o.zone) === zid).map((o) => o.oid) }
  }
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones,
  } as unknown as GameState
}

                                                
const MIXED = [
  mk('u', ['unit'], BASE),
  mk('lg', ['legend'], BASE),
  mk('gear', ['equipment'], BASE),
] as const

describe('★1198 attach 宿主把关函数的行为闸(补完 ★1196 的 6 处粗筛)', () => {
  test('⭐⭐⭐⭐⭐⭐⭐【灵便】nimbleAttachTargets 只收单位', () => {
    const got = nimbleAttachTargets(board(MIXED), P1).map((o) => String(o.oid))
    expect(got, '★传奇与装备都不该进候选').toEqual(['u'])
  })

  test('⭐⭐⭐⭐⭐⭐【夜之锋刃】nightbladeHosts 只收【此处】的单位', () => {
    const st = board([...MIXED, mk('u2', ['unit'], BF0)])
    expect(nightbladeHosts(st, P1, BASE), '★基地这一处只有那个单位').toEqual(['u'])
    expect(nightbladeHosts(st, P1, BF0), '★换个位置就换一批').toEqual(['u2'])
    expect(nightbladeHosts(st, P1, undefined), '★没有「此处」⇒ 一个都不给').toEqual([])
  })

  test('⭐⭐⭐⭐⭐⭐⭐【取放自如】firstCandidates 的 anyUnit 档只收单位(但不分敌我)', () => {
    const st = board([...MIXED, mk('e', ['unit'], BF0, P2), mk('elg', ['legend'], BF0, P2)])
    const got = firstCandidates(st, P1, 'anyUnit').map(String).sort()
    expect(
      got,
      '★★卡文「一名单位」不分敌我(含敌方那个),但**传奇与装备一个都不进**',
    ).toEqual(['e', 'u'])
  })

  test('⭐⭐⭐⭐⭐⭐【对照:friendlyUnit 档只收我方】证明上一条的「不分敌我」是这一档特有的', () => {
    const st = board([...MIXED, mk('e', ['unit'], BF0, P2)])
    expect(firstCandidates(st, P1, 'friendlyUnit').map(String), '★敌方那个不在里面').toEqual(['u'])
  })

  test('⭐⭐⭐⭐⭐【造景自证 · 坑十三】不写 baseTypes 的物件会被当成单位 ⇒ 上面几条必须显式写', () => {
    const noTypes = {
      oid: asObjId('ghost'), defId: 'X-ghost', owner: P1, controller: P1, zone: asZoneId(BASE),
      baseMight: 1, baseKeywords: [], damage: 0, counters: {}, status: {},
    } as unknown as GameObject
    expect(
      nimbleAttachTargets(board([noTypes]), P1).map((o) => String(o.oid)),
      '★★如实钉住 fails open:不写类型的会被收进「单位」候选 ——'
      + ' 这正是上面几条造景必须显式写 baseTypes 的原因,不写就会假绿',
    ).toEqual(['ghost'])
  })
})
