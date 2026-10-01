import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
                                                                
                                                                        
import { recomputeContinuous } from '../../src/effects/continuousView'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { canDealCombatDamage } from '../../src/combat/battleRoles'
import { isStunned } from '../../src/keywords/stun'
import {
  UNL_171, UNL_171_KEYWORDS, VEN_129, GROUP_PASSIVE_BATCH_DEFIDS,
} from '../../data/cards/group-passives'

                                                             
                                                    
  
                     
                                                                   
                   
                                                          
                              
                                                      
                                               
                          
                                              
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

setCardPassiveProvider(cardPassives)

const mk = (oid: string, defId: string, who: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: specLookup(defId).baseKeywords ?? [],
  baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}
                               
const canDeal = (s: GameState, oid: string): boolean =>
  canDealCombatDamage(recomputeContinuous(s).objects[asObjId(oid)]!)

describe('★ 前提:卡面与接线', () => {
  test('★3费 1黄pip、6 战力,印 [法盾]+[壁垒]', () => {
    expect(CARD_COSTS['UNL-171']).toEqual({ mana: 3, pips: 1, colors: ['yellow'] })
    expect([UNL_171.power, UNL_171.energy]).toEqual([6, 3])
    expect(cardKind('UNL-171')).toBe('unit')
    expect(cardKeywords('UNL-171'), '★② 印刷关键词三处同源').toEqual(['法盾', '壁垒'])
    expect(UNL_171_KEYWORDS).toEqual(['法盾', '壁垒'])
    expect(specLookup('UNL-171').baseKeywords, '★闸读的那份也要有').toEqual(['法盾', '壁垒'])
  })

  test('★进了群体被动那批的对账清单', () => {
    expect(GROUP_PASSIVE_BATCH_DEFIDS).toContain('UNL-171')
  })
})

describe('🔴🔴🔴★★★★★★【无条件】:盘面怎么摆都不出力', () => {
  test('🔴★★★★★★场上只有我 ⇒ 不能造成战斗伤害', () => {
    expect(canDeal(scene([mk('galio', 'UNL-171', P1)]), 'galio')).toBe(false)
  })

  test('🔴★★★★★★身边【恰好一个】友军也照样不能 —— 这正是与条件式那张的分野', () => {
                                                 
    const s = scene([mk('galio', 'UNL-171', P1), mk('ally', 'OGN-012', P1)])
    expect(canDeal(s, 'galio'), '★★★盘面变了它也不变').toBe(false)
  })

  test('🔴★★★★★★身边两个友军、还有敌人 ⇒ 仍然不能', () => {
    const s = scene([
      mk('galio', 'UNL-171', P1), mk('a', 'OGN-012', P1), mk('b', 'OGN-012', P1),
      mk('foe', 'OGN-012', P2),
    ])
    expect(canDeal(s, 'galio')).toBe(false)
  })

  test('🔴★★★★★★对照组:神圣守护者【恰好一个友军】时【可以】造成战斗伤害', () => {
    const s = scene([mk('ward', 'VEN-129', P1), mk('ally', 'OGN-012', P1)])
    expect(canDeal(s, 'ward'), '★★★条件满足 ⇒ 不加限制(这条就是"无条件"的分辨证据)').toBe(true)
    const s2 = scene([mk('ward', 'VEN-129', P1)])                
    expect(canDeal(s2, 'ward')).toBe(false)
    const s3 = scene([mk('ward', 'VEN-129', P1), mk('a', 'OGN-012', P1), mk('b', 'OGN-012', P1)])
    expect(canDeal(s3, 'ward'), '★两个也不行(㉙ 两头都压)').toBe(false)
  })

  test('🔴★★★★★★别的单位【不受影响】(它只罩我自己)', () => {
    const s = scene([mk('galio', 'UNL-171', P1), mk('ally', 'OGN-012', P1), mk('foe', 'OGN-012', P2)])
    expect(canDeal(s, 'ally'), '★★★友军照常出力').toBe(true)
    expect(canDeal(s, 'foe'), '★★★敌人更不关它事').toBe(true)
  })

  test('🔴★★★★★换个战场也一样(不是按位置生效的)', () => {
    const s = scene([mk('galio', 'UNL-171', P1, 'battlefield:shared:1')])
    expect(canDeal(s, 'galio')).toBe(false)
  })

  test('🔴★★★★★在【基地】里也照样带着这条限制', () => {
    const s = scene([mk('galio', 'UNL-171', P1, `base:${P1}`)])
    expect(canDeal(s, 'galio')).toBe(false)
  })
})

describe('🔴🔴★★★★★★它是【限制】不是【离场】:人还在、照样挨打', () => {
  test('🔴★★★★★★战力一分没少(限制只在战力总和那一步生效,不改战力本身)', () => {
    const s = recomputeContinuous(scene([mk('galio', 'UNL-171', P1)]))
    const o = s.objects[asObjId('galio')]!
    expect((o.derived?.might ?? o.baseMight), '★★★还是 6 —— 不是把它变成 0').toBe(6)
  })

  test('🔴★★★★★★它没有被眩晕(两条并列的限制,别混成一个)', () => {
    const s = recomputeContinuous(scene([mk('galio', 'UNL-171', P1)]))
    const o = s.objects[asObjId('galio')]!
    expect(isStunned(o), '★★★眩晕是回合性的 status,这条是持续效果层的 restriction').toBe(false)
    expect(canDealCombatDamage(o)).toBe(false)
  })

  test('🔴★★★★★★关键词还在身上([法盾]/[壁垒] 不受这条限制影响)', () => {
    const s = recomputeContinuous(scene([mk('galio', 'UNL-171', P1)]))
    const kw = s.objects[asObjId('galio')]!.derived?.keywords ?? []
    expect([...kw].sort(), '★★★壁垒还得让它照样先挨打').toEqual(['famehide', '壁垒', '法盾'].filter((x) => x !== 'famehide'))
  })
})

describe('🔴🔴★★★★★★只挡【战斗】伤害', () => {
  test('🔴★★★★★★这条限制的判据只认 restriction,与"能不能被打"无关', () => {
    const s = recomputeContinuous(scene([mk('galio', 'UNL-171', P1)]))
    const o = s.objects[asObjId('galio')]!
    expect((o.derived?.restrictions ?? []).length, '★★★身上确实挂了限制').toBeGreaterThan(0)
                                 
    const plain = recomputeContinuous(scene([mk('p', 'OGN-012', P1)])).objects[asObjId('p')]!
    expect((plain.derived?.restrictions ?? []).includes('noCombatDamage' as never)).toBe(false)
    expect(canDealCombatDamage(plain)).toBe(true)
  })

  test('🔴★★★★★判据口本身:传一个身上没有限制的对象 ⇒ 恒真', () => {
    expect(canDealCombatDamage({ derived: undefined } as unknown as GameObject),
      '★没有 derived 也不该当成"不能打"').toBe(true)
    expect(canDealCombatDamage({ derived: { restrictions: [] } } as unknown as GameObject)).toBe(true)
  })
})
