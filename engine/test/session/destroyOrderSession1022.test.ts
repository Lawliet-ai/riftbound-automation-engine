import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { destroyOrderKey } from '../../src/loop/cleanup'
import { replaceDestroy, replaceDestroyCandidates, activeTriggers, handPlaySpecs, cardCost } from '../../data/registry'
import { installProviders } from '../../data/gameDeps'

installProviders()

                                        
  
                                                       
                                           
                                                     
  
                                        
                                                            
                                     
                                               
                                             
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string
                                                         
                                     
const BF2 = zonesByKind(base, 'battlefield')[1]!.id as string
const DEPS = {
  getTriggers: activeTriggers, handPlaySpecs, cardCost,
  replaceDestroy, replaceDestroyCandidates,
} as unknown as InteractiveDeps

                                            
function scene(): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (oid: string, defId: string, types: string[], st: Record<string, unknown> = {}, dmg = 0, might = 3): void => {
    objects[oid] = {
      oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF),
      baseMight: might, baseKeywords: [], baseTypes: types as never, damage: dmg, counters: {}, status: st,
    } as GameObject
    const z = zones[BF]!
    zones[BF] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  put('victim', 'U-A', ['unit'], {}, 3, 3)       
  put('ga', 'SFD-051', ['gear'], { attachedTo: asObjId('victim') })
                                                        
                                                      
                          
  put('mover', 'U-A', ['unit'], {}, 0, 3)
                                                 
                                                            
  for (const pl of [P1, P2]) {
    const zid = `mainDeck:${pl}`
    const z = zones[zid]
    if (!z) continue
    const ids: ObjId[] = []
    for (let i = 0; i < 5; i++) {
      const oid = `deck-${pl}-${i}`
      objects[oid] = {
        oid: asObjId(oid), defId: 'U-A', owner: pl, controller: pl, zone: asZoneId(zid),
        baseMight: 1, baseKeywords: [], baseTypes: ['unit'] as never, damage: 0, counters: {}, status: {},
      } as GameObject
      ids.push(asObjId(oid) as ObjId)
    }
    zones[zid] = { ...z, contents: [...z.contents, ...ids] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main',
    objects, zones, turnShields: { victim: { exileOnDestroy: true } },
  } as unknown as GameState
}
const 在哪 = (s: GameState, oid: string): string => String(s.objects[asObjId(oid)]?.zone ?? '(不在场上)')
const 区里几张 = (s: GameState, zone: string): number => (s.zones[zone]?.contents ?? []).length
   
                                                     
                                                            
                                                      
                                           
   
                                              
                                                                   
const TRIGGER_ACTION = { kind: 'MOVE', player: P1, oid: 'mover', to: `base:${P1}` } as never
void BF2

describe('★★★★★★★ ★1022 §372 摧毁选序:会话层', () => {
  test('🔴前提自证:这个盘面确实【两条候选都成立】', () => {
    expect(replaceDestroyCandidates(scene(), asObjId('victim')).map((c) => c.id))
      .toEqual(['guardianAngel', 'exileInstead'])
  })

  test('🔴🔴试跑把动作拦下来了 —— 而且【一个字节都没落地】', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const before = JSON.stringify(g.state.zones)
    g.apply(TRIGGER_ACTION)
    const p = g.pending()
    expect(p.mode, '★停下来问了').toBe('choice')
    if (p.mode !== 'choice') return
    expect(p.request.key).toBe(destroyOrderKey(asObjId('victim')))
    expect(p.player, '★§372:问受影响物体的控制者').toBe(P1)
    expect(JSON.stringify(g.state.zones), '★试跑跑的是副本,真盘面纹丝不动').toBe(before)
  })

  test('🔴候选带卡号供 UI 渲染,label 里【不许出现内部代号】', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply(TRIGGER_ACTION)
    const p = g.pending()
    if (p.mode !== 'choice') throw new Error('前提不成立')
    expect(p.request.candidates.map((c) => c.sourceDefId)).toEqual(['SFD-051', 'UNL-007'])
    for (const c of p.request.candidates) {
      expect(c.label, `★label「${c.label}」把内部代号露出来了`).not.toBe(c.id)
      expect(/guardianAngel|exileInstead/.test(c.label)).toBe(false)
    }
  })

  test('🔴🔴答"守护天使" ⇒ 保人丢甲', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply(TRIGGER_ACTION)
    const p = g.pending()
    if (p.mode !== 'choice') throw new Error('前提不成立')
    g.apply({ kind: 'CHOOSE', player: P1, key: p.request.key, answer: 'guardianAngel' } as never)
    expect(在哪(g.state, 'ga'), '★甲被烧掉 —— 这是"保人丢甲"那条路的标志').toBe('(不在场上)')
                                                                  
                                                    
    expect(g.state.objects[asObjId('victim')], '★人被救下来了,还在场上').toBeDefined()
    expect(区里几张(g.state, `exile:${P1}`), '★没进放逐区 ⇒ 走的不是惩戒那条').toBe(0)
  })

  test('🔴🔴答"先惩戒" ⇒ 丢人保甲(这就是裁判说的另一条路)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply(TRIGGER_ACTION)
    const p = g.pending()
    if (p.mode !== 'choice') throw new Error('前提不成立')
    g.apply({ kind: 'CHOOSE', player: P1, key: p.request.key, answer: 'exileInstead' } as never)
    expect(区里几张(g.state, `exile:${P1}`), '★人进放逐区').toBe(1)
    expect(在哪(g.state, 'ga'), '★甲保住了,还在战场上').toBe(BF)
  })

  test('🔴🔴差异条:两种答案的结局【确实不同】', () => {
    const run = (ans: string): GameState => {
      const g = new InteractiveGame(scene(), DEPS)
      g.apply(TRIGGER_ACTION)
      const p = g.pending()
      if (p.mode !== 'choice') throw new Error('前提不成立')
      g.apply({ kind: 'CHOOSE', player: P1, key: p.request.key, answer: ans } as never)
      return g.state
    }
    const a = run('guardianAngel'), b = run('exileInstead')
    expect(在哪(a, 'ga')).not.toBe(在哪(b, 'ga'))
    expect(区里几张(a, `exile:${P1}`), '★一条进放逐区、一条没有').not.toBe(区里几张(b, `exile:${P1}`))
  })

  test('🔴一次性凭据:答完就删,不留给下一次摧毁', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply(TRIGGER_ACTION)
    const p = g.pending()
    if (p.mode !== 'choice') throw new Error('前提不成立')
    g.apply({ kind: 'CHOOSE', player: P1, key: p.request.key, answer: 'exileInstead' } as never)
    expect(Object.keys(g.state.ruleChoices).filter((k) => k.startsWith('§372:')), '★用完即焚').toEqual([])
  })

  test('🔴🔴下界:没有多候选的局面【绝不试跑、绝不打断】', () => {
                                        
    const s = scene()
    const noExile = { ...s, turnShields: {} } as unknown as GameState
    const g = new InteractiveGame(noExile, DEPS)
    g.apply(TRIGGER_ACTION)
    expect(g.pending().mode, '★不该弹窗').not.toBe('choice')
    expect(在哪(g.state, 'ga'), '★照旧救人 ⇒ 甲被烧掉').toBe('(不在场上)')
    expect(区里几张(g.state, `exile:${P1}`), '★没走惩戒那条').toBe(0)
  })

  test('🔴🔴下界:没注入候选钩子(老数据层)⇒ 一切照旧', () => {
    const bare = { getTriggers: activeTriggers, handPlaySpecs, cardCost, replaceDestroy } as unknown as InteractiveDeps
    const g = new InteractiveGame(scene(), bare)
    g.apply(TRIGGER_ACTION)
    expect(g.pending().mode).not.toBe('choice')
  })
})
