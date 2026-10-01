import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, activatedFor, grantedSpec, cardCost, cardKeywords, cardKind, cardPassives, bfCardPassives, handPlaySpecs } from '../../data/registry'
import { setBattlefieldPassiveProvider, setCardPassiveProvider } from '../../src/effects/cardPassives'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { CARD_COSTS } from '../../data/cardCosts'
import { GOLD_TOKEN } from '../../data/cards/gear-triggers'
import {
  UNL_228, UNL_228_SPEC, UNL_228_CARD_EFFECT, UNL_228_BOUNCE_KEY, ghostBounceTargets,
} from '../../data/cards/UNL-228'

                                                
                      
                                                           
  
                                                                 
                                                                    
                                                  
  
                                     
                                                                    
                                                           
                                                
                                       
  
                                                              
                                                  
                                                                            
                                                                   
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
setCardPassiveProvider(cardPassives)
setBattlefieldPassiveProvider(bfCardPassives)
const IG_DEPS = { getTriggers: activeTriggers, handPlaySpecs, activatedFor, grantedSpec, cardCost, cardKeywords, cardKind }

                                                  
const legend = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: 'UNL-228', owner: ctrl, controller: ctrl, zone: asZoneId(`legend:${ctrl}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {}, status: {}, ...extra,
} as unknown as GameObject)

const unit = (oid: string, ctrl = P1, zone = BF0, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as unknown as GameObject)

   
                                                                 
                                                         
   
const rune = (oid: string, owner = P1): GameObject => ({
  oid: asObjId(oid), defId: 'rune:red', owner, controller: owner, zone: asZoneId(`base:${owner}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  UNL_228_SPEC.makeNextChoice!({ selfOid: 'me', controller: P1 } as never)(s, chosen as never)
const resolve = (s: GameState, chosen: Record<string, string> = {}) =>
  UNL_228_SPEC.makeResolve({ selfOid: 'me', controller: P1 } as never)(s, chosen as never) as readonly GameEvent[]
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const bounced = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'zoneChange') as
  { obj: string; to: string } | undefined
const gold = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'spawnToken') as
  { spec: { defId: string }; zone: string; owner: string; dormant?: boolean } | undefined
                                            
const acts = (s: GameState, p = P1) =>
  (new InteractiveGame(s, IG_DEPS as never).legalActions(p) as readonly { kind: string; ability?: string; oid?: string }[])
    .filter((a) => a.kind === 'ACTIVATE' && a.ability === UNL_228_SPEC.key)

describe('🔴🔴🔴★★★★★★596 血港鬼影:前提与接线', () => {
  test('★前提:传奇、红+紫、0费0pip、卡文照 UNL-228 那份', () => {
    expect(CARD_COSTS['UNL-228']).toEqual({ mana: 0, pips: 0, colors: ['red', 'purple'] })
    expect(UNL_228.category, '★上游写 legendary,dsl 口径是 legend').toBe('legend')
    expect(UNL_228.domains).toEqual(['red', 'purple'])
    expect(UNL_228_CARD_EFFECT, '★★★UNL-185 那份尾部多一句括号提示,不采用').toBe(
      '支付{{1}}，{{横置}}：让战场上的一名友方单位返回其所属的手牌。打出一个休眠的“金币”装备指示物。')
  })

  test('★★接线:冒号前是【1点法力 + 横置】,不是 pip', () => {
    expect(UNL_228_SPEC.cost, '★★★卡面写的是 {{1}} ⇒ mana,别写成一枚红/紫 pip').toEqual({ mana: 1 })
    expect(UNL_228_SPEC.tapSelf).toBe(true)
    expect(UNL_228_SPEC.target, '★★★故意不设 target —— 见文件头那条判断').toBeUndefined()
  })

  test('🔴🔴★★★★★★接线:**三个印次都查得到同一条技能**(variantAliases 折叠)', () => {
                                                                
    for (const id of ['UNL-228', 'UNL-185', 'UNL-228*']) {
      expect(activatedFor(id).map((a) => a.key), `★${id} 查不到 = 那个卡号的这张牌是死的`)
        .toContain(UNL_228_SPEC.key)
    }
  })
})

describe('🔴🔴🔴★★★★★★596 血港鬼影:「战场上的一名友方单位」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】「**战场上的**」⇒ **基地里的不算**(与 ★595 击倒正相反)', () => {
                                                    
    const s = scene([unit('onBf', P1, BF0), unit('atBase', P1, `base:${P1}`)])
    expect(ghostBounceTargets(s, P1)).toEqual(['onBf'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**友方**」⇒ 敌方战场上的单位不算', () => {
    const s = scene([unit('mine', P1, BF0), unit('foe', P2, BF0)])
    expect(ghostBounceTargets(s, P1), '★★★漏 controller 会把 foe 列出来').toEqual(['mine'])
  })

  test('🔴🔴★★★★★★传奇自己不在候选里(既不是单位、也不在战场区)', () => {
    const s = scene([legend('me'), unit('u', P1, BF0)])
    expect(ghostBounceTargets(s, P1)).toEqual(['u'])
  })
})

describe('🔴🔴🔴★★★★★★596 血港鬼影:结算(两句并列)', () => {
  test('🔴🔴🔴★★★★★★【真结算】弹回 + 打出一个**休眠**金币到我的基地', () => {
    const s = scene([legend('me'), unit('u', P1, BF0)])
    const evs = resolve(s, { [UNL_228_BOUNCE_KEY]: 'u' })
    expect(kinds(evs), '★先弹回后金币(卡文的先后就是结算顺序)').toEqual(['zoneChange', 'spawnToken'])
    expect(bounced(evs)!.obj).toBe('u')
    expect(bounced(evs)!.to).toBe(`hand:${P1}`)
    expect(gold(evs)!.spec.defId, '★★★㊼ 金币规格全项目只有一份').toBe(GOLD_TOKEN.defId)
    expect(gold(evs)!.zone).toBe(`base:${P1}`)
    expect(gold(evs)!.owner).toBe(P1)
    expect(gold(evs)!.dormant, '★★★§149.1 装备默认活跃,卡文写了「休眠的」才横置').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「返回**其所属的**手牌」= **owner** 的,不是控制者的', () => {
                                                               
    const s = scene([legend('me'), { ...unit('stolen', P1, BF0), owner: P2 } as unknown as GameObject])
    expect(bounced(resolve(s, { [UNL_228_BOUNCE_KEY]: 'stolen' }))!.to).toBe(`hand:${P2}`)
  })

  test('🔴🔴🔴★★★★★★【会换答案·两句并列】场上**一名友方单位都没有** ⇒ 不问,但**金币照打**', () => {
    const s = scene([legend('me')])
    expect(ask(s), '★§355.17 没候选不弹问').toBeNull()
    expect(kinds(resolve(s)), '★★★把第二句写成"弹成功才打金币"会红').toEqual(['spawnToken'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】答完到结算之间那名单位**移回基地**了 ⇒ 不弹,金币照打', () => {
    const s = scene([legend('me'), unit('u', P1, `base:${P1}`)])
    expect(kinds(resolve(s, { [UNL_228_BOUNCE_KEY]: 'u' })), '★㊺ 结算复筛').toEqual(['spawnToken'])
  })

  test('🔴🔴★★★★★★答的是敌方单位(客户端乱发)⇒ 不弹,金币照打', () => {
    const s = scene([legend('me'), unit('foe', P2, BF0)])
    expect(kinds(resolve(s, { [UNL_228_BOUNCE_KEY]: 'foe' }))).toEqual(['spawnToken'])
  })

  test('🔴🔴★★★★★★答过就别再问(⑰)', () => {
    const s = scene([legend('me'), unit('u', P1, BF0)])
    expect(ask(s, { [UNL_228_BOUNCE_KEY]: 'u' })).toBeNull()
    expect(ask(s)!.key, '★没答过时要问').toBe(UNL_228_BOUNCE_KEY)
    expect(ask(s)!.controller, '★这一问是【我】答').toBe(P1)
  })
})

describe('🔴🔴🔴★★★★★★596 血港鬼影:会话层端到端(通道活优先)', () => {
  test('🔴🔴🔴★★★★★★【会换答案·§402.3】场上没有友方单位时,这条技能**列不出来**(§402.3 / 迦娜裁定)', () => {
                                                                  
                                                                           
                                                            
                                                                        
                                                              
                                                                   
                                                               
                                                                            
                                                              
                                                                              
    const s = scene([legend('me'), rune('r1')])
    expect(acts(s).length, '★★★§402.3:确认期第一问(ghostBounce)候选空 ⇒ 不列').toBe(0)
  })

  test('🔴🔴★★★★★★传奇**已横置** ⇒ 列不出(付不出 {{横置}} 这道费用)', () => {
    const s = scene([legend('me', P1, { status: { tapped: true } as never }), unit('u', P1, BF0), rune('r1')])
    expect(acts(s).length).toBe(0)
  })

  test('🔴🔴🔴★★★★★★【会换答案】法力不够 ⇒ 列不出(冒号前的 {{1}} 是真费用)', () => {
                                                           
    const rich = scene([legend('me'), unit('u', P1, BF0), rune('r1')])
    const poor = scene([legend('me'), unit('u', P1, BF0)])           
    expect(acts(rich).length, '★1 枚符文够付 {{1}}').toBe(1)
    expect(acts(poor).length, '★★★把 cost 写成 {} 这条会红').toBe(0)
  })
})
