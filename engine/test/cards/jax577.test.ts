import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, bfCardPassives, cardCost, cardKeywords, cardKind, cardPassives, activatedFor, grantedSpec, handPlaySpecs, isArmamentDef, playSpecFor } from '../../data/registry'
import { setBattlefieldPassiveProvider, setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { SFD_054, SFD_054_CARD_EFFECT } from '../../data/cards/group-passives'
import { NIMBLE } from '../../src/keywords/nimble'

                                                     
                                    
  
                 
                                                            
                                                                                     
                                             
                                                                               
                                                                                     
                                                   
  
                                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
setCardPassiveProvider(cardPassives)
setBattlefieldPassiveProvider(bfCardPassives)

const IG_DEPS = { getTriggers: activeTriggers, handPlaySpecs, activatedFor, grantedSpec, cardCost, cardKeywords, cardKind, playSpecFor }

const obj = (oid: string, defId: string, zone: string, ctrl = P1, types: GameObject['baseTypes'] = ['equipment']): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: types, damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const jax = (oid = 'jax', ctrl = P1, zone = BF0): GameObject =>
  ({ ...obj(oid, 'SFD-054', zone, ctrl, ['unit']), baseMight: 5, baseKeywords: ['法盾'] } as GameObject)

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
                                                
const rune = (oid: string, domain: string, owner = P1): GameObject =>
  ({ ...obj(oid, `rune:${domain}`, `base:${owner}`, owner, ['rune']) } as GameObject)
const kwsOf = (s: GameState, oid: string): readonly string[] => s.objects[asObjId(oid)]?.derived?.keywords ?? []

describe('🔴🔴🔴★★★★★★577 贾克斯 SFD-054:前提与接线', () => {
  test('★前提:上游卡面一字不差 —— 5法力+1绿pip、5战力、印刷[法盾]', () => {
    expect(SFD_054.energy).toBe(5)
    expect(SFD_054.power, '★战力查上游,别凭印象').toBe(5)
    expect(SFD_054.domains).toEqual(['green'])
    expect(cardCost('SFD-054'), '★★★1 枚绿 pip —— 漏了 pip 会被 cardCosts 全仓闸咬住')
      .toEqual({ mana: 5, pips: [['green']] })
    expect(cardKeywords('SFD-054'), '★[法盾]走印刷关键词通道').toContain('法盾')
    expect(cardKeywords('SFD-054a'), '★再版也要登').toContain('法盾')
                                                                                        
    expect(SFD_054_CARD_EFFECT, '★1590 常量取 errata').toContain('你各处的武装都获得{{灵便}}')
  })

  test('★材料前提:SFD-009 是【不带】灵便的武装,SFD-022 本就印着(否则下面全白验)', () => {
    expect(isArmamentDef('SFD-009'), '★是武装').toBe(true)
    expect(cardKeywords('SFD-009'), '★★★但**不印**灵便 —— 这条前提塌了整组用例就恒绿').not.toContain(NIMBLE)
    expect(cardKeywords('SFD-022'), '★对照组本就印着').toContain(NIMBLE)
  })
})

describe('🔴🔴🔴★★★★★★577 贾克斯:授予的范围(第一条作用于【手牌】的群体被动)', () => {
  test('🔴🔴🔴★★★★★★【会换答案】我在场 ⇒ 我手牌里的武装拿到[灵便]', () => {
    const s = scene([jax(), obj('arm', 'SFD-009', `hand:${P1}`)])
    expect(kwsOf(s, 'arm'), '★★★不写这条被动的话手牌里这张一个关键词都没有').toContain(NIMBLE)
  })

  test('🔴🔴🔴★★★★★★【会换答案·另一个方向】贾克斯自己**在手牌里** ⇒ 一个都不授', () => {
                                        
                                                                    
                                                           
                                                                      
                                                 
    const s = scene([jax('jax', P1, `hand:${P1}`), obj('arm', 'SFD-009', `hand:${P1}`)])
    expect(kwsOf(s, 'arm'), '★★★手牌里的贾克斯不该给任何人授予').not.toContain(NIMBLE)
  })

  test('🔴🔴🔴★★★★★★【范围三半之一·位置】场上/废牌堆里的武装【也拿到】(★1590 按上游 errata「你各处的武装」翻转;★1590 前只管【手牌中】)', () => {
    const s = scene([jax(), obj('field', 'SFD-009', `base:${P1}`), obj('dump', 'SFD-009', `discard:${P1}`)])
                                                                                               
    expect(kwsOf(s, 'field'), '★★★errata「各处」:场上的武装也拿到').toContain(NIMBLE)
    expect(kwsOf(s, 'dump'), '★★★errata「各处」:废牌堆里的武装也拿到').toContain(NIMBLE)
  })

  test('🔴🔴🔴★★★★★★【范围三半之二·阵营】**对手**手牌里的武装拿不到(卡文写的是"你手牌中")', () => {
    const s = scene([jax(), obj('foe', 'SFD-009', `hand:${P2}`, P2)])
    expect(kwsOf(s, 'foe'), '★★★去掉 controller 判据这条会红').not.toContain(NIMBLE)
  })

  test('🔴🔴🔴★★★★★★【范围三半之三·武装】手牌里【不是武装】的卡拿不到', () => {
                                                   
    const s = scene([jax(), obj('unitCard', 'OGN-012', `hand:${P1}`, P1, ['unit'])])
    expect(isArmamentDef('OGN-012'), '★前提:它不是武装').toBe(false)
    expect(kwsOf(s, 'unitCard')).not.toContain(NIMBLE)
  })

  test('🔴★★★★★★只给[灵便],不动别的(别把档位串了)', () => {
    const s = scene([jax(), obj('arm', 'SFD-009', `hand:${P1}`)])
    expect(kwsOf(s, 'arm').filter((k) => k === NIMBLE), '★§819.2 多个只算一个,这里也只该有一份').toHaveLength(1)
    expect(s.objects[asObjId('arm')]!.derived!.might, '★战力不该被动').toBe(0)
  })
})

describe('🔴🔴🔴★★★★★★577 贾克斯:第二个消费点(反应窗口里真拿得出手)', () => {
                                            
                                                                               
                                                            
                                                                 
                                                                 
                                                  

                                                     
  const openWindow = (armDefId: string, withJax: boolean): InteractiveGame => {
    const objs: GameObject[] = [
      obj('arm', armDefId, `hand:${P1}`),
      obj('starter', 'SFD-087', `hand:${P2}`, P2, ['spell']),
      ...Array.from({ length: 8 }, (_, i) => rune(`rg${i}`, 'green', P1)),
      ...Array.from({ length: 8 }, (_, i) => rune(`rr${i}`, 'red', P1)),
      ...Array.from({ length: 8 }, (_, i) => rune(`rb${i}`, 'blue', P2)),
    ]
    if (withJax) objs.push(jax())
    const s0 = scene(objs)
    const g = new InteractiveGame({ ...s0, activePlayer: P2 } as GameState, IG_DEPS as never)
    const cast = (g.legalActions(P2) as readonly { kind: string }[]).find((a) => a.kind === 'PLAY_CARD')
    expect(cast, '★前提自证:对手起得了链').toBeDefined()
    g.apply(cast as never)
    g.apply({ kind: 'PASS', player: P2 } as never)
    expect(g.pending().mode, '★前提自证:P1 拿到了反应窗口').toBe('window')
    return g
  }
  const canPlayArm = (g: InteractiveGame): boolean =>
    (g.legalActions(P1) as readonly { kind: string; oid?: string }[])
      .some((a) => a.kind === 'PLAY_UNIT' && a.oid === 'arm')

  test('🔴🔴🔴★★★★★★【端到端·承重】授予来的[灵便]要让这张武装在反应窗口里真打得出来', () => {
                                                                       
                                                           
    expect(canPlayArm(openWindow('SFD-009', true)), '★★★改之前这里是 false:贴得上、拿不出手').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【对照组】没有贾克斯 ⇒ 同一张武装在窗口里打不出来', () => {
                                                 
    expect(canPlayArm(openWindow('SFD-009', false)), '★★★没人授予[灵便]就不该有反应权限').toBe(false)
  })

  test('🔴🔴★★★★★★印刷那份照旧生效(改的是「印刷 ∪ 派生」,不是取代)', () => {
                                                              
    expect(canPlayArm(openWindow('SFD-022', false))).toBe(true)
  })
})
