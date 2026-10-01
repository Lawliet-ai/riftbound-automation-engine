                                                       
  
                                             
                                                           
                                                  
  
             
                                                 
                                     
                                             
                                      
                  
import { describe, expect, test } from 'vitest'
import { activeTriggers, extraPlayZonesFor } from '../../data/registry'
import { installProviders } from '../../data/gameDeps'
import { createInitialState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                    
function sceneWith(defId: string): never {
  const base = createInitialState([P1, P2], 2)
  const o = {
    oid: asObjId('mf'), defId, owner: P1, controller: P1, zone: asZoneId('base:P1'),
    baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const zones = { ...base.zones }
  const bz = zones['base:P1' as never]
  if (bz) (zones as never as Record<string, { contents: string[] }>)['base:P1'] = { ...bz, contents: ['mf'] }
  return { ...base, objects: { mf: o }, zones } as never
}

describe('★794 异画卡号与本体行为一致', () => {
  test('厄运小姐 OGN-193 / 193a / 193b:「可以打出到开放战场」三个印次都要给', () => {
    installProviders()
    const canon = extraPlayZonesFor(sceneWith('OGN-193'), P1, 'OGN-193')
    expect(canon.length, '前提:本体确实开了这条落点加宽').toBeGreaterThan(0)
    for (const alt of ['OGN-193a', 'OGN-193b']) {
      const got = extraPlayZonesFor(sceneWith(alt), P1, alt)
      expect([...got].sort(), `${alt} 必须与本体拿到同一批落点(修之前是空数组 ⇒ 整张卡退化成白板)`)
        .toEqual([...canon].sort())
    }
  })

  test('宏伟广场 OGN-293 / 293a:战场卡触发两个印次都要产', () => {
    installProviders()
    const count = (defId: string): number => {
      const base = createInitialState([P1, P2], 2)
      const st = { ...base, battlefieldCards: { [BF0]: { defId } } } as never
      return activeTriggers(st).filter((t) => (t.sourceDefId ?? t.id).includes('OGN-293')).length
    }
    const canon = count('OGN-293')
    expect(canon, '前提:本体确实产触发(§170.9 每玩家一份)').toBeGreaterThan(0)
    expect(count('OGN-293a'), '异画战场号修之前产 0 条 ⇒ 据守满 7 名单位也不判胜,不报错不提示')
      .toBe(canon)
  })
})
