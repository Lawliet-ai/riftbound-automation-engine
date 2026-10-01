import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind } from '../../data/registry'
import { effectiveMight } from '../../src/state/might'
import { recomputeContinuous } from '../../src/effects/continuousView'
import {
  battlefieldPassives, BF_PASSIVE_DEFIDS, isAlone, UNL_210_CARD_EFFECT,
} from '../../data/cards/group-passives'

                           
                                                          
  
                 
                                                           
                                                        
                                                   
                                                
                            
                                                
                                   
                                           
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (
  oid: string, zone: string, who: PlayerId, extra: Partial<GameObject> = {},
): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who,
  zone: asZoneId(zone), baseMight: 5, baseKeywords: [], baseTypes: ['unit'] as never,
  damage: 0, counters: {}, status: {}, ...extra,
})

   
                      
                                     
                                   
                                                                   
                                        
                                       
   
function scene(extraUnits: readonly GameObject[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(unit('lone', bfs[0]!, P2, { status: { defending: true } }))
  put(unit('atk', bfs[0]!, P1, { status: { attacking: true } }))
  put(unit('farLone', bfs[1]!, P2, { status: { defending: true } }))
  for (const o of extraUnits) put(o)
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!
                                    
const mightWithKeep = (s: GameState, keepAt: string, oid: string): number => {
  const effects = battlefieldPassives('UNL-210', keepAt, P1, s)
  const view = recomputeContinuous({ ...s, continuousEffects: [...s.continuousEffects, ...effects] })
  return effectiveMight(view.objects[oid as ObjId]!).actual
}

describe('★ 前提:战场卡 + 已进 BF_PASSIVES(㊶)', () => {
  test('★类别、权威清单、卡文常量', () => {
    expect(cardKind('UNL-210'), '★战场卡').toBe('battlefield')
    expect(BF_PASSIVE_DEFIDS.slice().sort(), '★★两份权威清单(longtail5/longtail7)已同步')
      .toContain('UNL-210')
    expect(UNL_210_CARD_EFFECT).toContain('落单')
    expect(battlefieldPassives('UNL-210', bf(scene(), 0), P1, scene()), '★出得来持续效果')
      .toHaveLength(1)
  })
})

describe('★★★★★★ 「落单」= §740.2.a:同位置、没有【其他】【友方】单位', () => {
  test('★★★★★★孤零零一个 ⇒ 落单', () => {
    const s = scene()
    expect(isAlone(s, s.objects['lone' as ObjId]!), '★同处只有敌方 `atk`,不影响').toBe(true)
  })

  test('★★★★★★★【友方】同伴一到就不落单了;【敌方】再多也还是落单', () => {
    const s0 = scene()
    const here = s0.objects['lone' as ObjId]!.zone as string
                      
    const withMate = scene([unit('mate', here, P2)])
    expect(isAlone(withMate, withMate.objects['lone' as ObjId]!), '★★有友方同伴 ⇒ 不落单').toBe(false)
                                
    const withFoe = scene([unit('foe2', here, P1)])
    expect(isAlone(withFoe, withFoe.objects['lone' as ObjId]!), '★★敌方不算"友方同伴"').toBe(true)
  })

  test('★★★★★★「其他」⇒ 不把自己算进去(否则永远不落单)', () => {
    const s = scene()
                                          
    const here = s.objects['lone' as ObjId]!.zone as string
    const mine = Object.values(s.objects).filter((o) => (o.zone as string) === here && o.controller === P2)
    expect(mine.map((o) => o.oid as string), '前提自证:这处只有它一名 P2 单位').toEqual(['lone'])
    expect(isAlone(s, s.objects['lone' as ObjId]!)).toBe(true)
  })

  test('★★★★★【同一位置】:友方在【别处】不解除落单', () => {
    const s = scene()
                                       
    expect(s.objects['farLone' as ObjId]!.controller, '前提自证:它也是 P2 的').toBe(P2)
    expect(isAlone(s, s.objects['lone' as ObjId]!), '★别处的友方不算数').toBe(true)
  })
})

describe('★★★★★★★ 效果:落单的【防守方】-2', () => {
  test('★★★★★★★落单 + 防守中 ⇒ 5 变 3', () => {
    const s = scene()
    expect(mightWithKeep(s, bf(s, 0), 'lone'), '★5 - 2 = 3').toBe(3)
  })

  test('★★★★★★★【身份】不符就不减:同处同为 P2、但没有防守身份的那名不受影响', () => {
                                                             
                                    
    const s0 = scene()
    const here = s0.objects['lone' as ObjId]!.zone as string
    const s = scene([unit('plain', here, P2)])
    expect(s.objects['plain' as ObjId]!.status.defending, '前提自证:它没有防守身份').toBeUndefined()
    expect(mightWithKeep(s, bf(s, 0), 'plain'), '★没身份 ⇒ 不减').toBe(5)
                                            
    expect(mightWithKeep(s, bf(s, 0), 'lone'), '★★★条件是动态的:同伴一到,-2 当场消失').toBe(5)
  })

  test('★★★★★★进攻方不吃这一刀(哪怕它也落单)', () => {
    const s = scene()
    expect(s.objects['atk' as ObjId]!.status.attacking, '前提自证:它是进攻身份').toBe(true)
    expect(isAlone(s, s.objects['atk' as ObjId]!), '前提自证:它也是落单的').toBe(true)
    expect(mightWithKeep(s, bf(s, 0), 'atk'), '★只减防守方').toBe(5)
  })

  test('★★★★★★「此处」:别处那名落单防守方一点事没有', () => {
    const s = scene()
                                      
    expect(mightWithKeep(s, bf(s, 0), 'farLone'), '★别处不受这张战场卡管').toBe(5)
                                               
    expect(mightWithKeep(s, bf(s, 1), 'farLone')).toBe(3)
  })

  test('★★★★★是 **-2** 不是 +2,而且压得下去(§143.2.b 实际值可负)', () => {
    const s0 = scene()
    const here = s0.objects['lone' as ObjId]!.zone as string
                                        
    const weak = {
      ...s0,
      objects: { ...s0.objects, lone: { ...s0.objects['lone' as ObjId]!, baseMight: 1 } },
    } as GameState
    expect(mightWithKeep(weak, here, 'lone'), '★★实际值可以是负的').toBe(-1)
  })
})
