                                    
  
                                               
                                                        
                                                                      
  
           
                                                                   
                                                                  
                                     
                                                             
                                          
                                                     
                                   
                                             

import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardPassives } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { objectCardTags, objectHasCardTag } from '../../data/cardTagQuery'
import { GEAR_HOST_PASSIVES } from '../../data/cards/gear-host-passives'

setCardPassiveProvider(cardPassives)                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const HOST_MIGHT = 2

function obj(oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: HOST_MIGHT, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
                                         
const rig = (attached = true, extra: readonly GameObject[] = []): GameState => scene([
  obj('host', 'BLK', P1, BF0),
  obj('wall', 'SFD-073', P1, BF0, {
    baseTypes: ['equipment'] as const, baseMight: 0,
    ...(attached ? { status: { attachedTo: asObjId('host') } } : { status: {} }),
  }),
  ...extra,
])
const hostOf = (s: GameState): GameObject => recomputeContinuous(s).objects[asObjId('host')]!

describe('★865 前提与标签落点', () => {
  test('表行:grantTag 机械;卡文逐字来自补录', () => {
    const row = GEAR_HOST_PASSIVES.find((r) => r.defId === 'SFD-073')!
    expect(row.cardText).toBe('我拥有“机械”属性。')
    expect(row.modification).toEqual({ kind: 'grantTag', tag: '机械' })
  })

  test('★★★贴附 ⇒ 宿主 objectCardTags 含「机械」;素单位的印刷标签没被顶掉', () => {
    const h = hostOf(rig())
    expect(objectHasCardTag(h, '机械')).toBe(true)
    expect(h.derived?.tags).toEqual(['机械'])
  })

  test('★★★★§136.2.b 未贴附 ⇒ 一个标签都不给', () => {
    const h = hostOf(rig(false))
    expect(objectHasCardTag(h, '机械')).toBe(false)
    expect(h.derived?.tags).toBeUndefined()
  })

  test('★★★★§719.1「只要保持贴附」⇒ 卸除即刻消失(与 declared 路线的分辨格)', () => {
                                                         
    const s1 = rig()
    expect(objectHasCardTag(hostOf(s1), '机械')).toBe(true)
    const wall = s1.objects[asObjId('wall')]!
    const s2 = { ...s1, objects: { ...s1.objects, wall: { ...wall, status: {} } } } as GameState
    expect(objectHasCardTag(hostOf(s2), '机械'), '★卸除后必须即刻消失').toBe(false)
  })

  test('★★武装自己仍是「武装」标签,没被授予效果覆盖(§718.5.a)', () => {
    const s = recomputeContinuous(rig())
    const wall = s.objects[asObjId('wall')]!
    expect(objectCardTags(wall)).toContain('武装')
    expect(objectHasCardTag(wall, '机械'), '★授的是宿主不是武装自己').toBe(false)
  })
})

describe('★865 端到端:消费侧真的认得被授予的机械(本轮的价值落点)', () => {
  test('★★★★★兰博 SFD-089「你的机械单位 S+1(包括我)」:贴上刚壁的素单位吃到 +1', () => {
                                                  
    const h = hostOf(rig(true, [obj('rumble', 'SFD-089', P1, BF0, { baseMight: 4 })]))
    expect(effectiveMight(h).actual, '★grantTag→derivedEq 收敛→group-passives 物件级,一条线全通').toBe(HOST_MIGHT + 1)
  })

  test('★★★★对照组:不贴 ⇒ 兰博不认它(闸不是常开的)', () => {
    const h = hostOf(rig(false, [obj('rumble', 'SFD-089', P1, BF0, { baseMight: 4 })]))
    expect(effectiveMight(h).actual).toBe(HOST_MIGHT)
  })

  test('★★★机械公敌 SFD-181「你的机械单位获得坚守」同样认得', () => {
    const h = hostOf(rig(true, [obj('hater', 'SFD-181', P1, BF0, { baseMight: 3 })]))
    expect(h.derived?.keywords ?? []).toContain('坚守')
  })

  test('★★★「你的」界线没被迁移弄丢:对手的兰博不给我的宿主加', () => {
    const h = hostOf(rig(true, [obj('rumble', 'SFD-089', P2, BF0, { baseMight: 4 })]))
    expect(effectiveMight(h).actual).toBe(HOST_MIGHT)
  })
})

                                                                          
                                                                       
  
                                                             
                                                              
                                     
                                                              
                                                       
                                                                  
                                                  
                                                          
                                                
                                                                          
describe('★865 derivedEq·tags 行为档(合成三跳链)', () => {
  test('★★★★★tags 中途出现也要再转一轮:兰博最终认得,host = 2+1+1 = 4', () => {
    const base = rig(false, [obj('rumble', 'SFD-089', P1, BF0, { baseMight: 4 })])                    
    const s: GameState = {
      ...base,
      continuousEffects: [
        ...base.continuousEffects,
        { id: 'syn:pump', duration: 'permanent', fromPassive: true, timestamp: 1,
          predicate: (x) => x.oid === asObjId('host'),
          modification: { kind: 'addMight', delta: 1 } },
        { id: 'syn:tagIfStrong', duration: 'permanent', fromPassive: true, timestamp: 2,
                                                                  
          predicate: (x) => x.oid === asObjId('host') && (x.derived?.might ?? 0) >= 3,
          modification: { kind: 'grantTag', tag: '机械' } },
      ],
    }
    const h = recomputeContinuous(s).objects[asObjId('host')]!
    expect(h.derived?.tags ?? [], '★第一跳:标签中途出现').toContain('机械')
    expect(effectiveMight(h).actual, '★第二跳:兰博在下一轮认得它(derivedEq 比 tags 才转得到那一轮)')
      .toBe(HOST_MIGHT + 1 + 1)
  })
})
