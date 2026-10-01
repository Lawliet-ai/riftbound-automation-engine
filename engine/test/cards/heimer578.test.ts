import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, bfCardPassives, cardCost, cardKeywords, cardKind, cardPassives, activatedFor, grantedSpec, handPlaySpecs, playSpecFor } from '../../data/registry'
import { setBattlefieldPassiveProvider, setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { OGN_111, ARC_003, OGN_111_CARD_EFFECT } from '../../data/cards/OGN-111'

                                                               
                                       
  
                                                              
                                                         
                                                                               
                                                                  
  
               
                                                               
                                                              
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
                                                             
                                                            
                                                                  
const SUN = 'OGN-098:gain'                      
const RECYCLE = 'OGN-212:recycle'            
setCardPassiveProvider(cardPassives)
setBattlefieldPassiveProvider(bfCardPassives)

const IG_DEPS = { getTriggers: activeTriggers, handPlaySpecs, activatedFor, grantedSpec, cardCost, cardKeywords, cardKind, playSpecFor }

const obj = (oid: string, defId: string, zone: string, ctrl = P1, types: GameObject['baseTypes'] = ['equipment']): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const heimer = (oid = 'hd', ctrl = P1, zone = BF0, defId = 'OGN-111'): GameObject =>
  ({ ...obj(oid, defId, zone, ctrl, ['unit']), baseMight: 3 } as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState)
}
const borrowed = (s: GameState, oid = 'hd'): readonly string[] =>
  s.objects[asObjId(oid)]?.derived?.grantedActivated ?? []

describe('🔴🔴🔴★★★★★★578 黑默丁格:前提与接线', () => {
  test('★前提:上游卡面 —— 3法力+1蓝pip、3战力、蓝;两印次卡文一字不差', () => {
    expect(OGN_111.energy).toBe(3)
    expect(OGN_111.power, '★战力查上游').toBe(3)
    expect(OGN_111.domains).toEqual(['blue'])
    expect(cardCost('OGN-111'), '★★★别漏 pip(577 栽过)').toEqual({ mana: 3, pips: [['blue']] })
    expect(cardCost('ARC-003'), '★★★再版也要登费用(别名不折叠)').toEqual({ mana: 3, pips: [['blue']] })
    expect(ARC_003.name).toBe(OGN_111.name)
    expect(OGN_111_CARD_EFFECT).toBe('我拥有场上其他友方传奇、单位、装备卡牌的所有{{横置}}技能。')
  })

  test('★材料前提:OGN-098 带横置技能、OGN-212 与 UNL-030 不带(前提塌了整组恒绿)', () => {
    expect(activatedFor('OGN-098').some((a) => a.key === SUN && a.tapSelf === true), '★★★该被抄的').toBe(true)
    expect(activatedFor('OGN-212').some((a) => a.key === RECYCLE && a.tapSelf === true), '★★★不该被抄的').toBe(false)
    expect(activatedFor('UNL-030').some((a) => a.tapSelf === true), '★蔚的技能是付法力不是横置').toBe(false)
  })

  test('★★两级查表:借来的 key 查得回真 spec(第一级 GRANTED_SPECS 里【没有】它)', () => {
    const sp = grantedSpec(SUN)
    expect(sp, '★★★查不到 = 派生态里存了 key 却没人认识它').toBeDefined()
    expect(sp!.tapSelf).toBe(true)
    expect(sp!.key).toBe(SUN)
  })
})

describe('🔴🔴🔴★★★★★★578 黑默丁格:抄谁的技能(范围四半)', () => {
  test('🔴🔴🔴★★★★★★【会换答案】场上有友方带横置技能的装备 ⇒ 我拿到那条 key', () => {
    const s = scene([heimer(), obj('disc', 'OGN-098', `base:${P1}`)])
    expect(borrowed(s), '★★★不写这个 provider 的话我一条都没有').toEqual([SUN])
  })

  test('🔴🔴🔴★★★★★★【只抄[横置]那些】不带 tapSelf 的主动技能一条都不抄', () => {
                                                      
    const s = scene([heimer(), obj('rec', 'OGN-212', `base:${P1}`), obj('vi', 'UNL-030', BF0, P1, ['unit'])])
    expect(borrowed(s), '★★★这两条都不带横置').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【范围·其他】我自己的技能不算(否则同 key 抄一份给自己)', () => {
                                                    
    const s = scene([heimer()])
    expect(borrowed(s), '★场上没有别人 ⇒ 空').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【范围·友方】**对手**的装备抄不到', () => {
    const s = scene([heimer(), obj('foeDisc', 'OGN-098', `base:${P2}`, P2)])
    expect(borrowed(s), '★★★去掉 controller 判据这条会红').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【范围·场上·两个方向】手牌里的抄不到;挪到场上就抄得到', () => {
                                               
    const inHand = scene([heimer(), obj('disc', 'OGN-098', `hand:${P1}`)])
    expect(borrowed(inHand), '★手牌里的不算').toEqual([])
    const onField = scene([heimer(), obj('disc', 'OGN-098', `base:${P1}`)])
    expect(borrowed(onField), '★★★同一张挪到基地就该抄得到').toEqual([SUN])
  })

  test('🔴★★★★★★战场卡授予的技能抄不到(它不是"某张卡印的技能")', () => {
                                                         
                                                                
                                                          
                                                          
    const s = scene([heimer(), obj('bf', 'UNL-213', BF0, P1, ['battlefield'])])
    expect(borrowed(s)).toEqual([])
  })

  test('🔴★★★★★★两张同款装备 ⇒ 只拿到【一条】key(§721 一条技能就是一条)', () => {
                                                                  
                                                                    
    const s = scene([heimer(), obj('d1', 'OGN-098', `base:${P1}`), obj('d2', 'OGN-098', BF0)])
    expect(borrowed(s), '★★★两层去重任何一层还在,这里就该是一条').toEqual([SUN])
  })

  test('🔴★★★★★★再版 ARC-003 走同一条判据(别只登一个卡号)', () => {
    const s = scene([heimer('hd', P1, BF0, 'ARC-003'), obj('disc', 'OGN-098', `base:${P1}`)])
    expect(borrowed(s)).toEqual([SUN])
  })
})

describe('🔴🔴🔴★★★★★★578 黑默丁格:抄来的技能真能按下去(端到端)', () => {
  const tapActions = (s: GameState, p = P1): readonly { oid?: string; ability?: string }[] =>
    (new InteractiveGame(s, IG_DEPS as never).legalActions(p) as readonly { kind: string; ability?: string; oid?: string }[])
      .filter((a) => a.kind === 'ACTIVATE' && a.ability === SUN)

  test('🔴🔴🔴★★★★★★【端到端·承重】黑默丁格自己能激活那条借来的[横置]技能', () => {
                                                
                                                           
    const s = scene([heimer(), obj('disc', 'OGN-098', `base:${P1}`)])
    const acts = tapActions(s)
    expect(acts.some((a) => a.oid === 'hd'), '★★★黑默丁格自己列得出这条').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【承重·费用照旧】黑默丁格**已横置** ⇒ 这条就列不出来了', () => {
                                                  
                                   
    const s = scene([{ ...heimer(), status: { tapped: true } } as GameObject, obj('disc', 'OGN-098', `base:${P1}`)])
    expect(tapActions(s).some((a) => a.oid === 'hd'), '★★★横置费付不出').toBe(false)
  })

  test('🔴🔴★★★★★★【对照组】没有黑默丁格时,这条技能只有原主人列得出', () => {
    const s = scene([obj('disc', 'OGN-098', `base:${P1}`)])
    const acts = tapActions(s)
    expect(acts.some((a) => a.oid === 'disc'), '★前提自证:原主人自己当然能用').toBe(true)
    expect(acts.some((a) => a.oid === 'hd'), '★场上压根没有黑默丁格').toBe(false)
  })
})
