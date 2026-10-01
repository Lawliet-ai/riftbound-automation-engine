                                            
  
                                           
                                                      
                                                  
                                         
  
                 
                                                
                            
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { project } from '../../src/net/project'
import { attachCard, detachCard } from '../../src/state/attach'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, damage: 0, counters: {}, status: {}, ...extra,
  }
}

function scene(objs: GameObject[]) {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    zones[o.zone] = { ...zones[o.zone]!, contents: [...zones[o.zone]!.contents, o.oid] }
  }
  return { ...s, objects, zones }
}

describe('§434 贴附关系进投影', () => {
  test('未贴附时不下发这个字段(别让界面把 undefined 画成一条关系)', () => {
    const s = scene([obj('u', P1, BF0), obj('g', P1, BF0, { baseTypes: ['equipment'], baseTags: ['武装'] })])
    expect(project(s, P1).objects['g']!.attachedTo).toBeUndefined()
  })

  test('★贴附后下发顶部卡牌的 oid —— 界面据此画叠放', () => {
    const s = attachCard(scene([obj('u', P1, BF0), obj('g', P1, BF0, { baseTypes: ['equipment'], baseTags: ['武装'] })]), asObjId('g'), asObjId('u'))
    expect(project(s, P1).objects['g']!.attachedTo).toBe('u')
  })

  test('★对手也看得见(§434.1 场上两张牌连在一起是公开信息,不是密封信息)', () => {
    const s = attachCard(scene([obj('u', P1, BF0), obj('g', P1, BF0, { baseTypes: ['equipment'], baseTags: ['武装'] })]), asObjId('g'), asObjId('u'))
    expect(project(s, P2).objects['g']!.attachedTo).toBe('u')
  })

  test('§434.1.f 卸除后字段跟着消失(叠放要还原成两张各自摆着)', () => {
    let s = attachCard(scene([obj('u', P1, BF0), obj('g', P1, BF0, { baseTypes: ['equipment'], baseTags: ['武装'] })]), asObjId('g'), asObjId('u'))
    s = detachCard(s, asObjId('g'))
    expect(project(s, P1).objects['g']!.attachedTo).toBeUndefined()
  })
})
