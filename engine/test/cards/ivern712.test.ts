import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { setBattlefieldPassiveProvider } from '../../src/effects/cardPassives'
import { cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { UNL_195, GRASS_BF_DEFID, makeIvernSwapTrigger } from '../../data/cards/UNL-195'
import { makeGrassSwapBackTrigger, EXTRA_BF_DEFIDS } from '../../data/cards/battlefields-extra'
import { battlefieldPassives, BF_PASSIVE_DEFIDS } from '../../data/cards/group-passives'
import { GRASS_TAGS, ANIMAL_TAGS } from '../../data/cards/animal-tags'
import { GAINED_TAG_KEY } from '../../data/cardTagQuery'

                                                                   
                                                
                                                         
                     
  
           
                                                               
                                                               
                                                         
                                                                 
                                         
                                                                   
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const IVERN = asObjId('iv')

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)

function scene(objs: readonly GameObject[], bfCards?: Record<string, { defId: string; owner: PlayerId; originalDefId?: string }>): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(bfCards ? { battlefieldCards: bfCards } : {}) } as GameState
}

const ivern = (status: Record<string, boolean> = {}): GameObject =>
  ({ ...obj('iv', P1, `legend:${P1}`), defId: 'UNL-195', baseTypes: ['legend'], status } as GameObject)
const conquerEv = (player: PlayerId, battlefield = BF0): GameEvent =>
  ({ kind: 'conquer', player, battlefield } as unknown as GameEvent)
const holdEv = (player: PlayerId, battlefield = BF0): GameEvent =>
  ({ kind: 'hold', player, battlefield } as unknown as GameEvent)
const swapTrig = makeIvernSwapTrigger(IVERN, P1, 'conquer')
const swapTrigHold = makeIvernSwapTrigger(IVERN, P1, 'hold')

describe('★ 前提:①登记(正典一行,三号折叠)+两道对账闸', () => {
  test('★★★★★传奇 0费 绿+黄、variant 三号一组、keywords 三号都空(折叠)、两张表行都在', () => {
    expect(CARD_COSTS['UNL-195']).toEqual({ mana: 0, pips: 0, colors: ['green', 'yellow'] })
    expect(cardKind('UNL-195')).toBe('legend')
    expect(VARIANT_GROUPS['UNL-195']).toEqual(['UNL-195', 'UNL-233', 'UNL-233*'])
    for (const no of ['UNL-195', 'UNL-233', 'UNL-233*']) expect(cardKeywords(no), no).toEqual([])
    expect(UNL_195.energy).toBe(0)
    expect(BF_PASSIVE_DEFIDS, '★草丛+1 表行').toContain(GRASS_BF_DEFID)
    expect(EXTRA_BF_DEFIDS, '★换回触发表行').toContain(GRASS_BF_DEFID)
  })

  test('★★★★★GRASS_TAGS=四动物+艾翁(新集合,ANIMAL_TAGS 一字不动)', () => {
    expect([...GRASS_TAGS].sort()).toEqual(['犬形', '猫科', '艾翁', '魄罗', '鸟类'].sort())
    expect([...ANIMAL_TAGS].sort(), '★老集合别被改').toEqual(['犬形', '猫科', '魄罗', '鸟类'].sort())
    expect(GRASS_TAGS.size, '★五种(阈值钉字面量)').toBe(5)
  })
})

describe('★★★★★★★ ②换过去:可选+费用先付', () => {
                                        
                                                                                    
                                                           
                                                                  
                                           
                                                         
                                             
  test('★★★★★★E2E:可选走确认阶段;费用先付=basePerform 就地把我打成 tapped;effect 只剩换壳;落地全验', () => {
    const s = scene([ivern()], { [BF0]: { defId: 'UNL-210', owner: P2 } })
    expect(swapTrig.mayChoose, '★★§383.3.a「你可以选择」在效果开头 ⇒ 确认阶段问').toBe(true)
    expect(swapTrig.nextChoice, '★★旧的结算期二选已经不在了').toBeUndefined()
    const paid = swapTrig.basePerform!(s, conquerEv(P1), {})
    expect(paid, '★付得起 ⇒ 返回付完的 state').not.toBeNull()
    expect(paid!.objects['iv' as never]!.status.tapped, '★★★费用先付:确认阶段我就已经 tapped 了(★683)').toBe(true)
    const evs = swapTrig.effect(paid!, conquerEv(P1), {})
    expect(evs.map((e) => (e as { kind: string }).kind), '★effect 只剩收益那一半').toEqual(['replaceBattlefieldCard'])
    expect(evs[0]).toMatchObject({ kind: 'replaceBattlefieldCard', zoneId: BF0, defId: GRASS_BF_DEFID, owner: P2 })
    const after = applyEvents(paid!, evs as never, {}).state
    expect(after.objects['iv' as never]!.status.tapped, '★传奇休眠=tapped(★683)').toBe(true)
    expect(after.battlefieldCards?.[BF0], '★身份换草丛+记最初+owner 沿用').toEqual({ defId: GRASS_BF_DEFID, owner: P2, originalDefId: 'UNL-210' })
  })

                                                            
                                                                  
  test('★★★★★★已 tapped ⇒ 付不起:连触发都不入链、basePerform 也返 null;hold 档同形', () => {
    const s = scene([ivern()], { [BF0]: { defId: 'UNL-210', owner: P2 } })
    const tapped = scene([ivern({ tapped: true })], { [BF0]: { defId: 'UNL-210', owner: P2 } })
    expect(checkTrigger(swapTrig, conquerEv(P1), tapped, P1), '★★付不起 ⇒ 触发不入链(§383.3.b.1)').toBe(false)
    expect(swapTrig.basePerform!(tapped, conquerEv(P1), {}), '★★就算硬闯到确认阶段也付不出 ⇒ null').toBeNull()
    const paidHold = swapTrigHold.basePerform!(s, holdEv(P1), {})
    expect(swapTrigHold.effect(paidHold!, holdEv(P1), {}).map((e) => (e as { kind: string }).kind), '★据守档同形').toEqual(['replaceBattlefieldCard'])
  })

                                                   
                                                          
                                          
                                                   
                                                                      
                                                 
                                           
                                                          
  test('★★★★★⑤by you:对手征服不响;⭐白板战场【照样触发、照样问】(§420 收益落空≠不触发)', () => {
    const s = scene([ivern()], { [BF0]: { defId: 'UNL-210', owner: P2 } })
    expect(checkTrigger(swapTrig, conquerEv(P1), s, P1), '★我征服 ⇒ 响').toBe(true)
    expect(checkTrigger(swapTrig, conquerEv(P2), s, P2), '★对手征服 ⇒ 不响').toBe(false)
    const blank = scene([ivern()])
    expect(checkTrigger(swapTrig, conquerEv(P1), blank, P1), '★★★白板战场:技能【照样触发】(§420)').toBe(true)
    const paid = swapTrig.basePerform!(blank, conquerEv(P1), {})
    expect(paid, '★★白板也照样付得起休眠费(费用与收益是两回事)').not.toBeNull()
    expect(paid!.objects['iv' as never]!.status.tapped, '★★★费用照付(§203.2 不可回退)').toBe(true)
    expect(swapTrig.effect(paid!, conquerEv(P1), {}), '★★★而收益落空:白板没得换,一条事件都不发(§420)').toEqual([])
  })
})

describe('★★★★★★★ ③草丛+1:五标签物件级', () => {
  const fx = () => battlefieldPassives(GRASS_BF_DEFID, BF0, P1, scene([]))
  test('★★★★★★predicate:魄罗印刷✓/艾翁 declared✓/第六标签(龙)✗/无标签✗/别的 zone ✗/敌方魄罗✓(无敌我词)', () => {
    const effects = fx()
    expect(effects).toHaveLength(1)
    expect(effects[0]!.modification).toEqual({ kind: 'addMight', delta: 1 })
    const pred = effects[0]!.predicate!
    const s = scene([])
    expect(pred(obj('poro', P1, BF0, { defId: 'OGN-013' }), s), '★魄罗(印刷)在草丛 ⇒ 吃').toBe(true)
    expect(pred(obj('iv2', P1, BF0, { declared: { [GAINED_TAG_KEY]: '艾翁' } } as Partial<GameObject>), s), '★艾翁=declared 获得(全卡池 0 张印刷)⇒ 必须物件级才吃').toBe(true)
    expect(pred(obj('dragon', P1, BF0, { declared: { [GAINED_TAG_KEY]: '龙' } } as Partial<GameObject>), s), '★第六标签不在五种 ⇒ 不吃').toBe(false)
    expect(pred(obj('plain', P1, BF0), s), '★无标签 ⇒ 不吃').toBe(false)
    expect(pred(obj('far', P1, BF1, { defId: 'OGN-013' }), s), '★「位于草丛」⇒ 别的 zone 不吃').toBe(false)
    expect(pred(obj('foePoro', P2, BF0, { defId: 'OGN-013' }), s), '★无敌我词 ⇒ 敌方也吃').toBe(true)
  })

  test('★★★★★E2E:注册 provider 后 recompute ⇒ 草丛上的魄罗 derived.might=4', () => {
    setBattlefieldPassiveProvider(battlefieldPassives)
    try {
      const s = scene([obj('poro', P1, BF0, { defId: 'OGN-013' })], { [BF0]: { defId: GRASS_BF_DEFID, owner: P1, originalDefId: 'UNL-210' } })
      const after = recomputeContinuous(s)
      expect(after.objects['poro' as never]!.derived?.might).toBe(4)
    } finally { setBattlefieldPassiveProvider(null) }
  })
})

describe('★★★★★★★ ④换回:草丛战场触发', () => {
  const backTrig = makeGrassSwapBackTrigger(BF0, P1, 'conquer')
  test('★★★★★★E2E:得分问二档;答 back ⇒ replaceBattlefieldCard(读 originalDefId=最初);落地=身份还原+清记忆', () => {
    const s = scene([], { [BF0]: { defId: GRASS_BF_DEFID, owner: P2, originalDefId: 'UNL-210' } })
    const q = backTrig.nextChoice!(s, conquerEv(P1), {})!
    expect(q.candidates.map((c) => c.id)).toEqual(['back', 'keep'])
    const evs = backTrig.effect(s, conquerEv(P1), { grassBack: 'back' })
    expect(evs, '★换回读 originalDefId(不是现 defId)+owner 沿用').toEqual([
      { kind: 'replaceBattlefieldCard', zoneId: BF0, defId: 'UNL-210', owner: P2 }])
    const after = applyEvents(s, evs as never, {}).state
    expect(after.battlefieldCards?.[BF0], '★还原+清记忆(★711 reduce)').toEqual({ defId: 'UNL-210', owner: P2 })
  })

  test('★★★★★可选:答 keep ⇒ 不发;无记忆(防御)⇒ 不问不发;hold 档也在;对手得分不问我这份', () => {
    const s = scene([], { [BF0]: { defId: GRASS_BF_DEFID, owner: P2, originalDefId: 'UNL-210' } })
    expect(backTrig.effect(s, conquerEv(P1), { grassBack: 'keep' })).toEqual([])
    const noMem = scene([], { [BF0]: { defId: GRASS_BF_DEFID, owner: P2 } })
    expect(backTrig.nextChoice!(noMem, conquerEv(P1), {})).toBeNull()
    expect(backTrig.effect(noMem, conquerEv(P1), { grassBack: 'back' })).toEqual([])
    const holdBack = makeGrassSwapBackTrigger(BF0, P1, 'hold')
    expect(holdBack.effect(s, holdEv(P1), { grassBack: 'back' })).toHaveLength(1)
    expect(checkTrigger(backTrig, conquerEv(P2), s, P2), '★得分者是对手 ⇒ 我这份(每玩家一份 ★686)不响').toBe(false)
  })
})
