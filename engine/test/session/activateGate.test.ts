import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activatedFor, activeTriggers, cardKeywords, cardKind, handPlaySpecs, playSpecFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'

                                                        
  
                                      
                                                                                          
                        
                                                                
                                                                                       
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const SIREN = 'OGN-184'                                         
const NOXUS = 'OGN-253'                                             

const DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, playSpecFor, cardKind, activatedFor,
}

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, types: GameObject['baseTypes'] = ['unit']): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
  }
}
function scene(extra: readonly GameObject[] = []): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of [...extra, obj('mine', 'BLK', P1, BF0), obj('foe', 'BLK', P2, BF0)]) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  return seedRunes(s, P1, 'purple', 4)
}
                              
function settle(g: InteractiveGame): void {
  for (let i = 0; i < 8; i++) {
    const p = g.pending()
    if (p.mode !== 'window') return
    g.apply({ kind: 'PASS', player: p.player })
  }
}
const zoneOf = (g: InteractiveGame, oid: string): string | undefined => g.state.objects[asObjId(oid)]?.zone

describe('★ 前提:枚举侧本来就只列合法的那几条', () => {
  const g = (): InteractiveGame => new InteractiveGame(scene([{ ...obj('gear', SIREN, P1, `base:${P1}`), baseTypes: ['equipment'] as const }]), DEPS)

  test('塞壬号只把【我方战场上的】单位列为目标', () => {
    const targets = g().legalActions(P1)
      .filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'gear')
      .map((a) => (a as { target?: string }).target)
    expect(targets).toEqual(['mine'])                   
  })

  test('[鼓舞]没点亮时,诺克萨斯之手那条【连列都不列】', () => {
    const s = scene([obj('lg', NOXUS, P1, `legend:${P1}`)])
    const acts = new InteractiveGame(s, DEPS).legalActions(P1)
    expect(acts.some((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'lg')).toBe(false)
  })
})

describe('★★ 漏洞①:§355 目标没过 legalTargets', () => {
  const withGear = (): InteractiveGame =>
    new InteractiveGame(scene([{ ...obj('gear', SIREN, P1, `base:${P1}`), baseTypes: ['equipment'] as const }]), DEPS)
  const activate = (target?: string): InteractiveGame => {
    const g = withGear()
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'gear', ability: 'OGN-184:recall', ...(target !== undefined ? { target } : {}) } as never)
    settle(g)
    return g
  }

  test('★★对照组:合法目标照样能用(㉗ 别拦多了)', () => {
    const g = activate('mine')
    expect(zoneOf(g, 'mine')).toBe(`base:${P1}`)               
  })

  test('★★★拿【敌方】单位当目标 —— 必须拒', () => {
                                            
    const g = activate('foe')
    expect(zoneOf(g, 'foe')).toBe(BF0)                           
    expect(g.state.objects[asObjId('gear')]?.status.tapped).toBeUndefined()         
  })

  test('★★★目标是个不存在的 oid / 一个都不给 —— 都必须拒', () => {
                                                   
                                                   
                                       
    for (const g of [activate('nobody'), activate()]) {
      expect(g.state.objects[asObjId('gear')]?.status.tapped).toBeUndefined()
                                                   
      const tappedRunes = Object.values(g.state.objects)
        .filter((o) => o.defId.startsWith('rune:') && o.controller === P1 && o.status.tapped === true)
      expect(tappedRunes).toHaveLength(0)
    }
  })
})

describe('★★ 漏洞②:§721 `spec.available` 那道闸执行侧没查', () => {
  const activateNoxus = (): InteractiveGame => {
    const g = new InteractiveGame(scene([obj('lg', NOXUS, P1, `legend:${P1}`)]), DEPS)
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'lg', ability: 'OGN-253:rallyMana' } as never)
    return g
  }

  test('★★★[鼓舞]没点亮就发这条动作 —— 必须拒(法力不许白拿、也不许白横置)', () => {
                                                      
    const g = activateNoxus()
    expect(g.state.objects[asObjId('lg')]?.status.tapped).toBeUndefined()
    expect(g.state.runePools[P1]?.mana ?? 0).toBe(0)
  })

  test('★★★不要目标的技能【给了目标】也必须拒(㉜ 这一半原先全项目没人压)', () => {
                                                                    
                                         
    const base = scene([obj('lg', NOXUS, P1, `legend:${P1}`)])
    const s = { ...base, confirmedThisTurn: { ...base.confirmedThisTurn, [P1]: 1 } } as GameState
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'lg', ability: 'OGN-253:rallyMana', target: 'foe' } as never)
    expect(g.state.runePools[P1]?.mana ?? 0).toBe(0)
    expect(g.state.objects[asObjId('lg')]?.status.tapped).toBeUndefined()
  })

  test('★★对照组:[鼓舞]点亮之后照样能用(㉗ 别拦多了)', () => {
                                                 
    const base = scene([obj('lg', NOXUS, P1, `legend:${P1}`)])
    const s = { ...base, confirmedThisTurn: { ...base.confirmedThisTurn, [P1]: 1 } } as GameState
    const g = new InteractiveGame(s, DEPS)
    expect(g.legalActions(P1).some((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'lg')).toBe(true)      
    g.apply({ kind: 'ACTIVATE', player: P1, oid: 'lg', ability: 'OGN-253:rallyMana' } as never)
    expect(g.state.runePools[P1]?.mana ?? 0).toBe(1)
  })
})
