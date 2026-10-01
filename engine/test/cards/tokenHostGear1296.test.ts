import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { isUnit } from '../../src/state/cardTypes'
import { attachedTo } from '../../src/state/attach'
import { forgeHosts } from '../../data/cards/SFD-208'
import { ROBOT_TOKEN } from '../../data/cards/token-spells'                                        
import { makeGameDeps } from '../../data/gameDeps'

                                           
  
                                                           
                                                                                       
                                                                         
                                              
                                                              
                                       
  
                                            
                                            
                                                            
                                                     
                                          
  
                                
                                                           
                                                              
                                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, types: readonly string[], ctrl: PlayerId = P1, zone: string = BF0): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, priority: null, phase: 'main', objects, zones } as unknown as GameState
}
                                                                         
const DEPS = { ...makeGameDeps(3), getTriggers: () => [] }
const run = (s: GameState, evs: readonly GameEvent[]): GameState => applyEvents(s, evs, DEPS as never).state

                                                               
function withToken(): { state: GameState; tokenOid: string } {
  const s0 = scene([
    obj('real', 'OGN-012', ['unit']),
    obj('gear', 'OGN-101', ['equipment'], P1, `base:${P1}`),
  ])
                                               
  const s = run(s0, [{ kind: 'spawnToken', spec: ROBOT_TOKEN, zone: BF0, owner: P1 } as unknown as GameEvent])
  const tok = Object.values(s.objects).find((o) => o.defId === 'token:机器人')
  if (!tok) throw new Error('★造景失败:指示物没落地')
  return { state: s, tokenOid: tok.oid as string }
}

describe('★1296 §185.2.d 指示物单位【是】单位 —— 装备贴得上去(指示物族 × 装备贴附族的交叉)', () => {
  test('★前提:指示物真落地,而且引擎的物件级判据认它是单位', () => {
    const { state, tokenOid } = withToken()
    const tok = state.objects[asObjId(tokenOid)]!
    expect(tok.defId, '★主角真在场(★1274:造景助手里的主角要真在场)').toBe('token:机器人')
    expect(tok.baseTypes?.includes('unit'), '★它的 baseTypes 含 unit(spec 逐字来自 ROBOT_TOKEN)').toBe(true)
    expect(isUnit(tok), '★★物件级判据 isUnit 认它 —— §185.2.d「指示物单位属于单位」').toBe(true)
  })

  test('★★★§185.2.d:「贴附到你控制的一名单位上」的宿主候选里【有】指示物单位', () => {
    const { state, tokenOid } = withToken()
    const hosts = forgeHosts(state, P1)
    expect(hosts.length, '★判别力下限:候选空了下面的 contain 就不作数').toBeGreaterThan(0)
    expect(hosts, '★★★指示物单位必须在候选里(候选若复用了 defId 级的「非指示物单位」判据,这里会红)')
      .toContain(tokenOid)
                                                 
    expect(hosts, '★对照:真卡单位同样在候选里').toContain('real')
                                            
    expect(hosts, '★★反向对照:装备不是单位,不进宿主候选').not.toContain('gear')
  })

  test('★★真贴上去:attach 落地后装备的 attachedTo 指向那枚指示物', () => {
    const { state, tokenOid } = withToken()
                                                                  
    const s = run(state, [{ kind: 'attach', obj: asObjId('gear'), to: asObjId(tokenOid), player: P1 } as unknown as GameEvent])
    const gear = s.objects[asObjId('gear')]!
                                                               
                                                                                        
                                                      
    expect(attachedTo(gear), '★★★§434 装备真贴到了指示物单位身上').toBe(tokenOid)
    expect(gear.zone, '★★§434.4 位置变为与顶部卡牌相同(装备从基地跟到了战场)').toBe(BF0)
    expect(s.objects[asObjId(tokenOid)], '★宿主仍在场(贴附不该把它弄没)').toBeDefined()
                                                             
    const s2 = run(withToken().state,
      [{ kind: 'attach', obj: asObjId('gear'), to: asObjId('real'), player: P1 } as unknown as GameEvent])
    expect(attachedTo(s2.objects[asObjId('gear')]!), '★对照:贴到真卡单位上同样成立').toBe('real')
  })
})
