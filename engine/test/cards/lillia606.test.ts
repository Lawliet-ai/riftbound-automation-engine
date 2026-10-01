import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind, cardPassives, cardCost } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_FACTS } from '../../data/cardFacts'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { GOLD_TOKEN } from '../../data/cards/gear-triggers'
import { MINION } from '../../data/cards/reprint-batch'
import { MIRROR_TOKEN } from '../../data/cards/UNL-081'
import {
  UNL_058, UNL_058_CARD_EFFECT, UNL_058_BONUS, isTokenUnitPlay, makeLilliaTokenTrigger,
} from '../../data/cards/UNL-058'

                                                                
                                        
                                           
                                                                    
                                                            
  
                                                                
                                                                  
                                           

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl = P1, zone = BF0, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as unknown as GameObject)
                      
const lillia = (oid = 'lil', ctrl = P1, zone = BF0): GameObject =>
  ({ ...obj(oid, 'UNL-058', ctrl, zone), baseMight: 4 })

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

                   
const spawn = (spec: unknown, owner = P1, zone = BF0): GameEvent =>
  ({ kind: 'spawnToken', spec, zone: asZoneId(zone), owner } as unknown as GameEvent)
const trig = (selfOid = 'lil', ctrl = P1) => makeLilliaTokenTrigger(asObjId(selfOid), ctrl)
const kws = (s: GameState, oid: string): readonly string[] => s.objects[asObjId(oid)]?.derived?.keywords ?? []

describe('🔴🔴🔴★★★★★★606 莉莉娅:前提与接线', () => {
  test('★前提:英雄单位 5费 **0pip** 绿 4[S]、**两印次**、卡文一字不差', () => {
    expect(CARD_COSTS['UNL-058'], '★★★0 pip —— 有颜色 ≠ 有 pip(★594)')
      .toEqual({ mana: 5, pips: 0, colors: ['green'] })
    expect(CARD_COSTS['UNL-058a'], '★再版同费').toEqual({ mana: 5, pips: 0, colors: ['green'] })
    expect(cardKind('UNL-058')).toBe('unit')
    expect(CARD_FACTS['UNL-058']?.heroUnit, '★英雄单位').toBe(true)
    expect(UNL_058.energy).toBe(5)
    expect(UNL_058.power).toBe(4)
    expect(UNL_058.domains).toEqual(['green'])
    expect(UNL_058_CARD_EFFECT).toBe(
      '当你打出一名指示物单位时，让我本回合内{{S}}+1。\n你的指示物单位获得{{壁垒}}。（其在战斗中首先承担伤害。）')
  })

  test('🔴🔴★★★★★★接线:触发表两个卡号**都查得到**(再版走 variantAliases 折叠,只登一行)', () => {
    for (const id of ['UNL-058', 'UNL-058a']) {
      const s = scene([{ ...lillia(), defId: id } as GameObject])
      const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'UNL-058')
      expect(mine.length, `★${id} 登记漏了 ⇒ 这张牌在真对局里第一句是死的`).toBe(1)
      expect(mine[0]!.event).toBe('spawnToken')
    }
                                                                                 
                                                          
    expect(cardCost('UNL-058'), '★★★登了触发/被动就得登费用;0pip 别写成有 pip')
      .toEqual({ mana: 5 })
  })

  test('🔴🔴★★★★★★接线:群体被动表里有本卡(第二句是死的就在这儿露馅)', () => {
    const s = scene([lillia(), obj('tok', 'token:随从')])
    const mine = cardPassives(s.objects[asObjId('lil')]!, s)
    expect(mine.some((e) => e.id.includes('UNL-058')), '★cardPassives 里查得到本卡的效果').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★606 第①句:「当你打出一名指示物单位时」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·通道错就整张卡是死的】通道是 **spawnToken**,不是 playUnit', () => {
                                                               
                                                 
    expect(trig().event, '★★★挂 playUnit 这条当场红').toBe('spawnToken')
    const s = scene([lillia()])
    const playUnitEv = { kind: 'playUnit', unit: asObjId('x'), player: P1 } as unknown as GameEvent
    expect(trig().filter?.(playUnitEv, s) ?? true, '★反方向:playUnit 事件不该被本卡吃下').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【真触发】我打出一名指示物单位 ⇒ 条件成立', () => {
    const s = scene([lillia()])
    expect(trig().filter?.(spawn(MINION), s) ?? true).toBe(true)
    expect(isTokenUnitPlay(spawn(MINION), P1)).toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**你**打出的」——对手打出的不算(判 ev.owner,不是批次归因)', () => {
    const s = scene([lillia()])
    expect(isTokenUnitPlay(spawn(MINION, P2), P1), '★★★漏掉 owner 判据这条当场红').toBe(false)
    expect(trig().filter?.(spawn(MINION, P2), s) ?? true).toBe(false)
                                                               
    expect(isTokenUnitPlay(spawn(MINION, P2), P2)).toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「一名指示物**单位**」——**装备**指示物(金币)不算', () => {
    expect(isTokenUnitPlay(spawn(GOLD_TOKEN), P1), '★★★§187.5 金币是装备指示物').toBe(false)
  })

  test('🔴🔴★★★★★★TokenSpec 缺省 baseTypes ⇒ **按单位算**(与 typesOf 同口径)', () => {
                                                      
    expect(MIRROR_TOKEN.baseTypes, '★前提:这个 spec 确实没声明类型').toBeUndefined()
    expect(isTokenUnitPlay(spawn(MIRROR_TOKEN), P1)).toBe(true)
  })

  test('🔴🔴🔴★★★★★★【真结算】加成落在**我自己**身上、**本回合内**、幅度 +1', () => {
    const s = scene([lillia(), obj('other', 'OGN-012')])
    const evs = trig().effect(s, spawn(MINION), {}) as readonly GameEvent[]
    const eff = evs.find((e) => (e as { kind: string }).kind === 'addEffect') as unknown as
      { effect: { duration: string; ops?: unknown } } | undefined
    expect(evs.length, '★只发这一条').toBe(1)
    expect(eff, '★★★发的是持续效果(⑳ 别揉进 baseMight)').toBeDefined()
    expect(eff!.effect.duration, '★★★「**本回合内**」不是永久').toBe('thisTurn')
    expect(JSON.stringify(evs), '★★★打在我自己身上,不是 other').toContain('lil')
    expect(JSON.stringify(evs), '★不该碰别人').not.toContain('other')
    expect(UNL_058_BONUS).toBe(1)
  })

  test('🔴🔴★★★★★★端到端:效果落地后我的**派生**战力 4 → 5', () => {
    const s = scene([lillia()])
    expect(effectiveMight(s.objects[asObjId('lil')]!).reference, '★前提:印刷 4').toBe(4)
    const evs = trig().effect(s, spawn(MINION), {}) as readonly GameEvent[]
    const after = recomputeContinuous({
      ...s,
      continuousEffects: [...(s.continuousEffects ?? []),
        (evs[0] as unknown as { effect: never }).effect],
    } as GameState)
    expect(effectiveMight(after.objects[asObjId('lil')]!).reference).toBe(5)
  })
})

describe('🔴🔴🔴★★★★★★606 第②句:「你的指示物单位获得{壁垒}」', () => {
  test('🔴🔴🔴★★★★★★【真结算】我的指示物单位拿到[壁垒]', () => {
    const s = scene([lillia(), obj('tok', 'token:随从')])
    expect(kws(s, 'tok')).toContain('壁垒')
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**你的**」——对手的指示物单位不给', () => {
    const s = scene([lillia(), obj('foeTok', 'token:随从', P2)])
    expect(kws(s, 'foeTok'), '★★★漏 controller 判据会把敌方也加强').not.toContain('壁垒')
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**指示物**单位」——我的**普通**单位不给', () => {
    const s = scene([lillia(), obj('plain', 'OGN-012')])
    expect(kws(s, 'plain'), '★★★漏 isToken 判据会给全场友军发壁垒').not.toContain('壁垒')
  })

  test('🔴🔴🔴★★★★★★【会换答案】指示物**单位**——金币那种**装备**指示物不给', () => {
    const s = scene([lillia(), obj('gold', 'token:金币', P1, BF0, { baseTypes: ['equipment'] })])
    expect(kws(s, 'gold'), '★★★漏 isUnit 判据会给金币发壁垒').not.toContain('壁垒')
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】**卡文没写位置** ⇒ 全场,基地里的也给', () => {
                                                        
                                             
    const s = scene([lillia('lil', P1, BF0), obj('tokBase', 'token:随从', P1, `base:${P1}`)])
    expect(kws(s, 'tokBase'), '★★★基地里的指示物单位照样有壁垒').toContain('壁垒')
  })

  test('🔴🔴★★★★★★莉莉娅自己没有[壁垒](她不是指示物;卡文也没印这个关键词)', () => {
    const s = scene([lillia(), obj('tok', 'token:随从')])
    expect(kws(s, 'lil')).not.toContain('壁垒')
    expect(UNL_058.keywords, '★卡面没印任何关键词').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】莉莉娅**自己在基地**时照样生效(她没有「如果我位于战场上」那道闸)', () => {
                                                           
                                               
                                                         
                                                             
                                                              
                                                   
    const s = scene([lillia('lil', P1, `base:${P1}`), obj('tok', 'token:随从', P1, BF0)])
    expect(kws(s, 'tok'), '★★★源在基地也照发').toContain('壁垒')
  })
})
