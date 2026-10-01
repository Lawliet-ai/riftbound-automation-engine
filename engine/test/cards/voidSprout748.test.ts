import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { voidSproutChoice, voidSproutRecycleEvents, voidSproutFilter, VOID_SPROUT_KEY } from '../../data/cards/SFD-018'
import { militaristEffectEvents } from '../../data/cards/OGN-121'
import { makeSmithMoveTrigger } from '../../data/cards/move-reveal-units'

                                                           
                                          
                                                    
                   
                                                     
                                                               
                                                    
                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, kws: string[] = []): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: kws, baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

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

const sprout = (who: PlayerId = P1) => obj('vs', 'SFD-018', who, BF0)
const deck = (oid: string, who: PlayerId = P1) => obj(oid, `C-${oid}`, who, `mainDeck:${who}`)

describe('★ 前提:登记面+①问档三件套', () => {
  test('★★★★★2费0pip红、unit、无组;有兽苗+堆非空才问,prompt 带牌名(私密查看)', () => {
    expect(CARD_COSTS['SFD-018']).toEqual({ mana: 2, pips: 0, colors: ['red'] })
    expect(cardKind('SFD-018')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-018'], '★单印次无组实证(731 现场量)').toBeUndefined()
    expect(cardCost('SFD-018')).toEqual({ mana: 2 })
    const s = scene([sprout(), deck('a'), deck('b')])        
    const q = voidSproutChoice(s, P1, {})!
    expect(q.key).toBe(VOID_SPROUT_KEY)
    expect(q.controller, '★问的是展示者本人').toBe(P1)
    expect(q.prompt, '★①带牌名=私密查看').toContain('C-b')
    expect(voidSproutChoice(scene([deck('a')]), P1, {}), '★无兽苗不问').toBeNull()
    expect(voidSproutChoice(scene([sprout()]), P1, {}), '★堆空不问').toBeNull()
    expect(voidSproutChoice(s, P1, { [VOID_SPROUT_KEY]: 'keep' }), '★答过收口').toBeNull()
    expect(voidSproutChoice(scene([sprout(P2), deck('a')]), P1, {}), '★对手的兽苗不管我(「你」=展示者)').toBeNull()
  })
})

describe('★★★★★★★ ②OGN-121 军事家宿主(多张展示)', () => {
  test('★★★★★★答回收:recycle 最前+展示4张(顶1不在)+insight count=4;答保留/无 chosen=旧行为', () => {
    const s = scene([sprout(), deck('d1'), deck('d2'), deck('d3'), deck('d4'), deck('d5'), obj('foe', 'U-f', P2, BF0)])
                                           
    const evs = militaristEffectEvents(s, asObjId('foe'), P1, { [VOID_SPROUT_KEY]: 'recycle' }) as unknown as readonly { kind: string, cards?: readonly string[], count?: number, objs?: readonly string[] }[]
    expect(evs[0], '★recycle 排最前').toMatchObject({ kind: 'recycle', objs: ['d5'] })
    const rev = evs.find((e) => e.kind === 'revealed')!
    expect([...(rev.cards ?? [])].sort(), '★「这些卡牌」=原顶5 减 d5(刀:没扣=展示了已回收那张)').toEqual(['d1', 'd2', 'd3', 'd4'])
    expect(evs.find((e) => e.kind === 'insight')!.count, '★②insight 跟减=4(自洽:恰=新顶4)').toBe(4)
    const old = militaristEffectEvents(s, asObjId('foe'), P1) as unknown as readonly { kind: string, count?: number }[]
    expect(old[0]!.kind, '★④无 chosen=旧行为(revealed 打头、5张)').toBe('revealed')
    expect(old.find((e) => e.kind === 'insight')!.count).toBe(5)
  })
})

describe('★★★★★★★ ③单张展示宿主(move-reveal 族)+⑤E2E', () => {
  test('★★★★★★铁匠触发:答回收 ⇒ 只 recycle 不展示(③落空);答保留 ⇒ 照展示;E2E 顶一张真去堆底', () => {
    const s = scene([sprout(), deck('x'), deck('y')])       
    const trig = makeSmithMoveTrigger(asObjId('vs'), P1)
    const moved = { kind: 'unitMoved', unit: asObjId('vs'), player: P1 } as never
    const recycled = trig.effect(s, moved, { [VOID_SPROUT_KEY]: 'recycle' }) as unknown as readonly { kind: string }[]
    expect(recycled.map((e) => e.kind), '★③回收的正是要展示那张 ⇒ 展示落空(不补位锚)').toEqual(['recycle'])
    const kept = trig.effect(s, moved, { [VOID_SPROUT_KEY]: 'keep' }) as unknown as readonly { kind: string }[]
    expect(kept[0]!.kind, '★答保留=照展示').toBe('revealed')
                                                     
    const after = applyEvents(s, trig.effect(s, moved, { [VOID_SPROUT_KEY]: 'recycle' }) as never, {}).state
    const deckNow = after.zones[`mainDeck:${P1}` as never]!.contents
                                                                     
    const defAt = (i: number) => after.objects[deckNow[i] as never]?.defId
    expect(defAt(0), '★y 真去了堆底').toBe('C-y')
    expect(defAt(deckNow.length - 1), '★新顶=x').toBe('C-x')
  })
})

                                                                  
import { UNL_054_SPEC as _u54 } from '../../data/cards/UNL-054'                
import { OGN_025_SPEC } from '../../data/cards/OGN-025'

describe('★★★★★★★ ★749 OGN-025 对手展示档(revealer=对手,吃对手的兽苗)', () => {
  test('★★★★★★对手有兽苗 ⇒ 问档 controller=对手;答回收 ⇒ rec 前置+其展示集合少那张+PICK 候选剔它', () => {
    const s = scene([obj('vs', 'SFD-018', P2, BF0), // 兽苗是 P2(展示者=对手)的
      obj('fa', 'C-fa', P2, `mainDeck:${P2}`), obj('fb', 'C-fb', P2, `mainDeck:${P2}`)])        
    const ask = OGN_025_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)
    const q = ask(s, {})!
    expect(q.key, '★兽苗问先出').toBe(VOID_SPROUT_KEY)
    expect(q.controller, '★「当你要展示」的你=展示者=对手 P2').toBe(P2)
                                                            
                                                
    expect(ask(s, { [VOID_SPROUT_KEY]: 'recycle' }), '★展示落空 ⇒ PICK 问不弹').toBeNull()
    const evs = OGN_025_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, { [VOID_SPROUT_KEY]: 'recycle' }) as unknown as readonly { kind: string, cards?: readonly string[], objs?: readonly string[] }[]
    expect(evs.map((e) => e.kind), '★只发 rec(fb 去 P2 堆底),无 revealed 无 banish').toEqual(['recycle'])
    expect(evs[0]).toMatchObject({ kind: 'recycle', objs: ['fb'] })
                       
    const kept = OGN_025_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, { [VOID_SPROUT_KEY]: 'keep' }) as unknown as readonly { kind: string, cards?: readonly string[] }[]
    expect(kept.find((e) => e.kind === 'revealed')?.cards, '★答保留=旧行为').toEqual(['fb'])
  })
})
