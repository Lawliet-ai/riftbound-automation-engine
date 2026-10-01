import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { CARD_COSTS } from '../../data/cardCosts'
import { ROBOT_TOKEN } from '../../data/cards/token-spells'
import {
  UTILITY_SPELLS, makeUtilitySpellSpec, mightyUnitsOf, MIGHTY_THRESHOLD,
} from '../../data/cards/utility-spells'

                                                         
                                                                                  
  
                 
                                                                        
                                                    
                                                
                                                                     
                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const row = (id: string) => UTILITY_SPELLS.find((r) => r.defId === id)!
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

                      
function scene(defId: string): GameState {
  const base = createInitialState([P1, P2], 2)
  const card: GameObject = {
    oid: asObjId('sp'), defId, owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: [] as never, damage: 0, counters: {}, status: {},
  }
                                        
  const deck: GameObject[] = [0, 1, 2, 3].map((i) => ({
    oid: asObjId(`dk${i}`), defId: `U-DK${i}`, owner: P1, controller: P1,
    zone: asZoneId(`mainDeck:${P1}`), baseMight: 1, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  }))
  const objects: Record<string, GameObject> = { sp: card }
  const zones = { ...base.zones }
  const h = zones[`hand:${P1}`]!
  zones[`hand:${P1}`] = { ...h, contents: [card.oid] }
  const d = zones[`mainDeck:${P1}`]!
  zones[`mainDeck:${P1}`] = { ...d, contents: deck.map((x) => x.oid) }
  for (const o of deck) objects[o.oid] = o
                                                                       
  const runes: GameObject[] = [0, 1].map((i) => ({
    oid: asObjId(`rn${i}`), defId: `rune:green`, owner: P1, controller: P1,
    zone: asZoneId(`runeDeck:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
    damage: 0, counters: {}, status: {},
  }))
  const rd = zones[`runeDeck:${P1}`]
  if (rd) zones[`runeDeck:${P1}`] = { ...rd, contents: runes.map((x) => x.oid) }
  for (const o of runes) objects[o.oid] = o
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 9, runes: { green: 3, blue: 3, orange: 3, colorless: 3 } } },
  } as GameState
}
const evsOf = (defId: string, p = P1): readonly GameEvent[] =>
  makeUtilitySpellSpec(row(defId)).makeResolve({ movedCardOid: 'sp', controller: p })(scene(defId), {})
const kindsOf = (defId: string): string[] =>
  evsOf(defId).map((e) => (e as { kind: string }).kind)

describe('★ 前提:五张都是法术,费用/域/关键词照上游表(㊶⑪)', () => {
  const FACTS = [
    { defId: 'OGN-047', name: '御衡守念', mana: 3, pips: 0, color: 'green', kw: ['迅捷'] },
    { defId: 'SFD-076', name: '产量激增', mana: 4, pips: 1, color: 'blue', kw: [] },
    { defId: 'UNL-091', name: '聚心凝神', mana: 5, pips: 0, color: 'orange', kw: [] },
                  
    { defId: 'UNL-061', name: '台前作秀', mana: 2, pips: 0, color: 'blue', kw: ['反应'] },
                  
    { defId: 'SFD-106', name: '实力至上', mana: 2, pips: 1, color: 'orange', kw: ['反应'] },
                  
    { defId: 'VEN-049', name: '深水打捞', mana: 2, pips: 0, color: 'blue', kw: ['流转2'] },
                                                          
    { defId: 'OGN-144', name: '以战养战', mana: 4, pips: 1, color: 'orange', kw: ['反应'] },
                                                     
    { defId: 'OGN-129', name: '迎敌号令', mana: 2, pips: 0, color: 'orange', kw: ['迅捷'] },
                                                         
    { defId: 'SFD-004', name: '丛林伏击', mana: 2, pips: 1, color: 'red', kw: ['待命'] },
                                                      
    { defId: 'VEN-056', name: '千里眼', mana: 7, pips: 0, color: 'blue', kw: ['反应'] },
  ] as const

  test('★逐张钉费用/pip/域/卡名', () => {
                                                                 
    expect(UTILITY_SPELLS.map((r) => r.defId).slice().sort(), '★行表与 FACTS 一一对应')
      .toEqual(FACTS.map((f) => f.defId).slice().sort())
    for (const f of FACTS) {
      const r = row(f.defId)
      expect(CARD_COSTS[f.defId], `${f.defId} 上游费用`).toEqual({ mana: f.mana, pips: f.pips, colors: [f.color] })
      expect(cardKind(f.defId), `${f.defId} 是法术`).toBe('spell')
      expect(r.name).toBe(f.name)
      expect(r.energy, `${f.defId} 卡面法力与 cost.mana 一致`).toBe(f.mana)
      expect((r.cost.pips ?? []).length, `${f.defId} pip 枚数`).toBe(f.pips)
      expect(r.domain).toBe(f.color)
    }
  })

  test('★★★[迅捷] 是【时机权限】⇒ 必须在 `PlaySpec.keywords` 里(322 量到的第四条消费路)', () => {
    expect(playSpecFor('OGN-047')?.keywords, '★spec 侧').toEqual(['迅捷'])
    expect(cardKeywords('OGN-047'), '★印刷表侧同样要有(316 的对账闸盯着)').toEqual(['迅捷'])
    expect(playSpecFor('UNL-061')?.keywords, '★★[反应] 同样是时机权限').toEqual(['反应'])
    expect(cardKeywords('UNL-061'), '★★★印刷表侧;★[回响2] **不在**里面(§820 走 echo)').toEqual(['反应'])
                          
    for (const id of ['SFD-076', 'UNL-091']) {
      expect(playSpecFor(id)?.keywords ?? [], `${id} spec 侧`).toEqual([])
      expect(cardKeywords(id), `${id} 印刷表侧`).toEqual([])
    }
  })
})

describe('★★★★★★ 效果:逐张钉"发哪几条、什么次序"', () => {
  test('★★★★★★OGN-047:抽一张牌【然后】召出一枚【休眠的】符文', () => {
    const evs = evsOf('OGN-047')
    expect(kindsOf('OGN-047'), '★次序即卡文次序:先抽后召').toEqual(['draw', 'summonRune'])
    expect(evs[0]).toEqual({ kind: 'draw', player: P1, count: 1 })
    expect(evs[1], '★★「休眠的」⇒ dormant: true').toEqual({
      kind: 'summonRune', player: P1, count: 1, dormant: true,
    })
  })

  test('★★★★★SFD-076:先在【你的基地】打出 3[S] 机器人,再抽一张牌', () => {
    const evs = evsOf('SFD-076')
    expect(kindsOf('SFD-076')).toEqual(['spawnToken', 'draw'])
    const e = evs[0] as { spec: unknown; zone: string; owner: string }
    expect(e.spec, '★复用 ROBOT_TOKEN(3[S]),不另写一份').toBe(ROBOT_TOKEN)
    expect(ROBOT_TOKEN.baseMight, '★机器人是 3[S]').toBe(3)
    expect(e.zone, '★卡文明写「到你的基地」').toBe(`base:${P1}`)
    expect(evs[1]).toEqual({ kind: 'draw', player: P1, count: 1 })
  })

  test('★★★★UNL-091:抽两张牌 = 【一条】count:2,不是两条 count:1(§418)', () => {
    expect(evsOf('UNL-091')).toEqual([{ kind: 'draw', player: P1, count: 2 }])
  })

  test('★★★落点/归属跟着【控制者】走:对手打出就落对手那边', () => {
    const evs = evsOf('SFD-076', P2) as readonly { zone?: string; player?: string }[]
    expect(evs[0]!.zone).toBe(`base:${P2}`)
    expect(evs[1]!.player).toBe(P2)
  })
})

describe('★★★★★★★ 真流程:从手牌真打得出来(322 之前这三张一条规格都列不出)', () => {
  function play(defId: string): InteractiveGame {
    const g = new InteractiveGame(scene(defId), IG_DEPS)
    const act = g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'sp')
    expect(act, `★${defId} 必须列得出打出动作`).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
        continue
      }
      break
    }
    return g
  }
  const handCount = (s: GameState): number => s.zones[`hand:${P1}`]?.contents.length ?? 0

  test('★★★★★★★三张都打得出来,且抽到的牌数对得上', () => {
                                          
    for (const [id, drawn] of [['OGN-047', 1], ['SFD-076', 1], ['UNL-091', 2]] as const) {
      const before = handCount(scene(id))
      const g = play(id)
      expect(handCount(g.state), `★${id} 抽了 ${drawn} 张`).toBe(before - 1 + drawn)
    }
  })

  test('★★★★★OGN-047 真流程:符文是【休眠】进场的', () => {
    const g = play('OGN-047')
                                                              
                                                    
    const inBase = (g.state.zones[`base:${P1}`]?.contents ?? [])
      .map((oid) => g.state.objects[oid]!)
      .filter((o) => o.defId.startsWith('rune:'))
    expect(inBase.length, '★召出了一枚到基地').toBe(1)
    expect(inBase[0]!.status['tapped'], '★★「休眠的」= 横置进场').toBe(true)
  })

  test('★★★★★SFD-076 真流程:基地里多了一名 3[S] 机器人', () => {
    const g = play('SFD-076')
    const inBase = (g.state.zones[`base:${P1}`]?.contents ?? [])
      .map((oid) => g.state.objects[oid]!)
      .filter((o) => o.defId === ROBOT_TOKEN.defId)
    expect(inBase, '★正好一名').toHaveLength(1)
    expect(inBase[0]!.baseMight, '★3[S]').toBe(3)
  })
})

describe('★★★★★★ 回归闸:减费那半【一字不变】(它在 cost-modifiers.ts,本族没碰)', () => {
  test('★OGN-047:对手接近胜利时减 2(㊵ 问这张卡自己的答案)', () => {
    const near = { ...scene('OGN-047'), scores: { [P1]: 0, [P2]: 5 } } as GameState
    const mods = costModsFor(near, P1, 'OGN-047')
    expect(mods.some((m) => (m as { mana?: number }).mana === 2), '★减费仍在').toBe(true)
                     
    const far = { ...scene('OGN-047'), scores: { [P1]: 0, [P2]: 0 } } as GameState
    expect(costModsFor(far, P1, 'OGN-047'), '★条件不成立就不减').toEqual([])
  })
})

                                                               
                                              
             
                                                                                   
                                                             
                            
                                              
                                                           
                                                 
                         
             
                                                                   
                                                                    
                                                                  
                                                  
describe('★★★★★★★ 第348轮:SFD-106 按【强力单位数】抽牌', () => {
                                                   
  function board(mights: readonly number[], foeMighty = 0): GameState {
    const s0 = scene('SFD-106')
    const objects: Record<string, GameObject> = { ...s0.objects }
    const zones = { ...s0.zones }
    const put = (oid: string, might: number, who: typeof P1): void => {
      const o = {
        oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who,
        zone: asZoneId(`base:${who}`), baseMight: might, baseKeywords: [],
        baseTypes: ['unit'], damage: 0, counters: {}, status: {},
      } as GameObject
      objects[oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, asObjId(oid)] }
    }
    mights.forEach((m, i) => put(`u${i}`, m, P1))
    for (let i = 0; i < foeMighty; i += 1) put(`f${i}`, 9, P2)
    return { ...s0, objects, zones } as GameState
  }
  const drawnBy = (s: GameState): number => {
    const evs = makeUtilitySpellSpec(row('SFD-106')).makeResolve(
      { movedCardOid: 'sp', controller: P1 } as never,
    )(s, {}) as readonly { kind: string; count?: number }[]
    return evs.length === 0 ? 0 : (evs[0]!.count ?? 0)
  }

  test('★★★★★★★数的是【战力≥5】那些:5/9 算,4 不算', () => {
    expect(MIGHTY_THRESHOLD, '㊶ 门槛从常量取').toBe(5)
    expect(drawnBy(board([9, 5, 4])), '★两名强力 ⇒ 抽 2').toBe(2)
    expect(drawnBy(board([4, 4, 4])), '★★一个都不够格 ⇒ 0').toBe(0)
    expect(drawnBy(board([5])), '★★★恰好 5 算强力(是 ≥ 不是 >)').toBe(1)
  })

  test('★★★★★★★【你控制】:对手的强力单位一个都不算', () => {
    expect(drawnBy(board([9], 3)), '★对手三名 9 力也不算数').toBe(1)
  })

  test('★★★★★★一个都没有 ⇒ **一条事件都不发**(不是发 count 0)', () => {
    const evs = makeUtilitySpellSpec(row('SFD-106')).makeResolve(
      { movedCardOid: 'sp', controller: P1 } as never,
    )(board([4]), {})
    expect(evs, '★空手 ⇒ 空数组').toEqual([])
  })

  test('★★★★★★收口自证:判据就是那个共用选择器(改它会同时炸 OGN-038)', () => {
    const s = board([9, 5, 4])
    expect(mightyUnitsOf(s, P1).length, '★与抽牌数同源').toBe(drawnBy(s))
  })

                                                                     
                                                        
                                                              
                                              
  test('★「场上」这道门:手牌/废牌堆里的高战力单位【不算】(§708 强力只看场上,含基地)', () => {
    const s0 = board([9])                     
    const put = (oid: string, might: number, zone: string): void => {
      const o = {
        oid: asObjId(oid), defId: `U-${oid}`, owner: P1, controller: P1,
        zone: asZoneId(zone), baseMight: might, baseKeywords: [],
        baseTypes: ['unit'], damage: 0, counters: {}, status: {},
      } as GameObject
      ;(s0.objects as Record<string, GameObject>)[oid] = o
      const z = s0.zones[o.zone]
      if (z) (s0.zones as Record<string, typeof z>)[o.zone] = { ...z, contents: [...z.contents, asObjId(oid)] }
    }
    put('inHand', 9, `hand:${P1}`)                  
    put('inDiscard', 9, `discard:${P1}`)             
    const ids = mightyUnitsOf(s0, P1).map(String)
    expect(ids, '基地上的算').toContain('u0')
    expect(ids, '手牌里的不算 —— 去掉 selector 的 fielded 这条会红').not.toContain('inHand')
    expect(ids, '废牌堆里的不算').not.toContain('inDiscard')
  })

  test('★★★★★★★回归闸:【不看 `state`】的老四张一字未变', () => {
                                                         
    for (const id of ['OGN-047', 'SFD-076', 'UNL-091', 'UNL-061']) {
      expect(evsOf(id).length, `${id} 照旧发得出事件`).toBeGreaterThan(0)
    }
                                              
    expect(row('UNL-091').effects(P1), '★不给 state 照样是抽两张')
      .toEqual([{ kind: 'draw', player: P1, count: 2 }])
  })
})

describe('★★★★★★★ 第343轮:UNL-061 的 §820 [回响2]', () => {
  test('★★★★★★★[回响2] 落在 `PlaySpec.echo` 上,**不在** `CARD_KEYWORDS` 里', () => {
    expect(playSpecFor('UNL-061')?.echo, '★额外费用轴').toEqual({ mana: 2 })
    expect(cardKeywords('UNL-061'), '★★印刷关键词只有[反应]').toEqual(['反应'])
  })

  test('★★★★★★效果只有【一条】`draw` count 1(重复由 §820 引擎层管)', () => {
    expect(evsOf('UNL-061'), '★不是 count 2').toEqual([{ kind: 'draw', player: P1, count: 1 }])
  })

  test('★★★★★★★回归闸:【不给 `echo`】的前三张一字未变', () => {
    const olds = ['OGN-047', 'SFD-076', 'UNL-091']
    for (const id of olds) {
      expect(row(id).echo, `${id} 行表没有 echo`).toBeUndefined()
      expect(playSpecFor(id)?.echo, `${id} spec 上也不该冒出这个字段`).toBeUndefined()
    }
    expect(UTILITY_SPELLS.filter((r) => r.echo !== undefined).map((r) => r.defId), '★只有它一张带回响')
      .toEqual(['UNL-061'])
  })
})

describe('★★★★★★★ 第362轮:VEN-049 深水打捞的 §829 [流转2]', () => {
  test('★★★★★[流转2] 是【印刷关键词】,真的进了 `CARD_KEYWORDS`', () => {
                                                 
                                                                      
    expect(cardKeywords('VEN-049'), '★漏登记 = 这半张脸完全不存在').toEqual(['流转2'])
    expect(playSpecFor('VEN-049')?.keywords, '★spec 上也带着(时机权限那条消费路)').toEqual(['流转2'])
  })

  test('★★★★★分辨断言:它【没有】echo —— 流转不是回响', () => {
    expect(row('VEN-049').echo, '★行表不该给').toBeUndefined()
    expect(playSpecFor('VEN-049')?.echo, '★spec 上也不该冒出来').toBeUndefined()
                         
    expect(cardKeywords('UNL-061'), '★UNL-061 的印刷表里没有流转').toEqual(['反应'])
  })

  test('★★★★★★效果侧就一句「抽一张牌。」(流转那半一个事件都不发)', () => {
    expect(evsOf('VEN-049')).toEqual([{ kind: 'draw', player: P1, count: 1 }])
  })

  test('★★★★★★★照霞阵 VEN-031 的先例(同一个关键词、同一条登记路)', () => {
    expect(cardKeywords('VEN-031'), '★前提自证:先例真印着流转2').toEqual(['流转2'])
  })

  test('★★★★真流程:它在手里就能打出来(`handPlaySpecs` 列得出规格)', () => {
    const g = new InteractiveGame(scene('VEN-049'), IG_DEPS)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'PLAY_CARD'
      && g.state.objects[(a as { cardOid: string }).cardOid]?.defId === 'VEN-049')
    expect(acts.length, '★列不出来就是 322 那个老毛病又犯了').toBeGreaterThan(0)
  })
})


                                                                 
  
                                           
                                                                        
                                                 
                                             
  
                                                        
                                                         
describe('★★★★★★ VEN-056 千里眼:洞察5 + 抽两张(本族第一张带洞察的)', () => {
  const SELF = 'VEN-056'
  const spec = () => makeUtilitySpellSpec(row(SELF))
                                                              
  const deep = (): GameState => {
    const s = scene(SELF)
    const objects = { ...s.objects }
    const extra = [4, 5, 6].map((i) => ({
      oid: asObjId(`dk${i}`), defId: `U-DK${i}`, owner: P1, controller: P1,
      zone: asZoneId(`mainDeck:${P1}`), baseMight: 1, baseKeywords: [], baseTypes: ['unit'],
      damage: 0, counters: {}, status: {},
    })) as unknown as GameObject[]
    for (const o of extra) objects[o.oid] = o
    const d = s.zones[`mainDeck:${P1}`]!
    return {
      ...s, objects,
      zones: { ...s.zones, [`mainDeck:${P1}`]: { ...d, contents: [...d.contents, ...extra.map((x) => x.oid)] } },
    } as GameState
  }
  const ask = (st: GameState, chosen: Record<string, string> = {}) =>
    spec().makeNextChoice!({ movedCardOid: 'sp', controller: P1 })(st, chosen)
  const evs = (chosen: Record<string, string> = {}, st?: GameState) =>
    spec().makeResolve({ movedCardOid: 'sp', controller: P1 })(st ?? deep(), chosen) as readonly GameEvent[]

  test('★前提:7费 0pip 蓝法术;印的是 [反应](②③ 已查 errata 空)', () => {
    expect(CARD_COSTS[SELF]).toEqual({ mana: 7, pips: 0, colors: ['blue'] })
    expect(cardKind(SELF)).toBe('spell')
    expect(cardKeywords(SELF), '★[反应] 是印刷关键词').toEqual(['反应'])
    expect(row(SELF).cost, '★★★0 pip ⇒ 一枚都不写').toEqual({ mana: 7 })
    expect(row(SELF).insight, '★洞察的数额是 5,不是缺省的 1').toBe(5)
  })

  test('🔴★★★★★★产出两条、且【洞察在前抽牌在后】(卡文逐字同序)', () => {
    const out = evs()
    expect(out.map((e) => (e as { kind: string }).kind)).toEqual(['insight', 'draw'])
    expect(out[0]).toMatchObject({ kind: 'insight', player: P1, count: 5 })
    expect(out[1]).toMatchObject({ kind: 'draw', player: P1, count: 2 })
  })

  test('🔴★★★★★★它【不是】lookTakeRecycle 那条路:一条 moveTo 都不发、也不 revealed', () => {
    const kinds = evs().map((e) => (e as { kind: string }).kind)
    expect(kinds, '★★★拿一张进手/展示那两条是另一族的动作').not.toContain('zoneChange')
    expect(kinds).not.toContain('revealed')
                                                              
    expect(kindsOf('UNL-091'), '★对照那张:纯抽牌、不洞察').not.toContain('insight')
  })

  test('🔴★★★★★★【含零个】:一张都没挑 ⇒ insight 事件【不带 recycle】(§436.1.a)', () => {
    const out = evs({}) as unknown as ReadonlyArray<Record<string, unknown>>
    expect(out[0]!.recycle, '★没挑 = 五张原样放回顶部').toBeUndefined()
    expect(out[0]!.recycleAll, '★★★也不是"全回收"那一档').toBeUndefined()
  })

  test('🔴★★★★★★挑了就带上:答案从追问的 key 里读,前缀必须对得上', () => {
                                                                       
                                                                   
    const out = evs({ [`${SELF}:ins0`]: 'dk0', [`${SELF}:ins1`]: 'dk1' }) as unknown as ReadonlyArray<Record<string, unknown>>
    expect(out[0]!.recycle, '★挑了两张就回收两张').toEqual(['dk0', 'dk1'])
                                               
    const wrong = evs({ 'OGN-047:ins0': 'dk0' }) as unknown as ReadonlyArray<Record<string, unknown>>
    expect(wrong[0]!.recycle, '★别人的前缀读不出来').toBeUndefined()
  })

  test('🔴★★★★★★追问:候选就是牌堆顶【五张】,不多不少', () => {
    const q = ask(deep())
    expect(q, '★带 insight 的行才配追问').not.toBeNull()
    expect(q!.controller, '★归打出者答').toBe(P1)
                                                              
                                                   
    expect(q!.candidates.map((c) => c.id).filter((x) => x !== '__done__'))
      .toEqual(['dk6', 'dk5', 'dk4', 'dk3', 'dk2'])
  })

  test('🔴★★★★★边界:牌堆只剩四张时,候选就只有四张(见底才是真正的刹车)', () => {
    const q = ask(scene(SELF))                       
    expect(q!.candidates.map((c) => c.id).filter((x) => x !== '__done__'))
      .toEqual(['dk3', 'dk2', 'dk1', 'dk0'])
  })

  test('🔴★★★★★★㉖ 回归闸:老九张【一条 insight 都不发、一次追问都不问】(★1394 判据改一处:SFD-076 有了【行级】急速问口,与洞察无关,雷克塞不在的景里仍一次都不问;其余老行照旧不配追问)', () => {
    const olds = UTILITY_SPELLS.filter((r) => r.defId !== SELF)
    expect(olds.length, '前提:老卡不止一张').toBeGreaterThan(5)
    let checked = 0
    for (const r of olds) {
      expect(r.insight, `${r.defId} 不该带洞察`).toBeUndefined()
                                                                                                                     
      if (r.defId === 'SFD-076') expect(makeUtilitySpellSpec(r).makeNextChoice!({ movedCardOid: 'x', controller: P1 })(scene(r.defId), {}), `${r.defId} 行级问口在没有雷克塞的景里一次都不问`).toBeNull()
      else expect(makeUtilitySpellSpec(r).makeNextChoice, `${r.defId} 不该配追问`).toBeUndefined()
      expect(kindsOf(r.defId), `${r.defId} 产出里不该有 insight`).not.toContain('insight')
      checked += 1
    }
    expect(checked, '★★防空转:老卡真的逐张跑过').toBe(olds.length)
  })
})
