import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { spellNeedsTarget } from '../../src/loop/playSpec'               
import { makeAva107Trigger, standbySpellPlayable, OGN_107_PICK_KEY, OGN_107_SPELL_TARGET, STANDBY_KEYWORD, type Ava107Deps } from '../../data/cards/OGN-107'

                                                                           
                                                                   
                                                                                         
                                                                            
                                                                                            
                                                                                      
                                                                                               
                                                                                                
                                                                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BASE = `base:${P1}`
const DEPS = makeGameDeps(1)
const AVA_DEPS: Ava107Deps = { hasStandby: (d) => cardKeywords(d).includes(STANDBY_KEYWORD), isUnitCard: (d) => cardKind(d) === 'unit', specFor: (d) => playSpecFor(d) }

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const rune = (i: number, color = 'blue'): GameObject => ({
  oid: asObjId(`rune${i}`), defId: `rune:${color}`, owner: P1, controller: P1, zone: asZoneId(BASE),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                                                                    
const inHand = (oid: string, defId: string): GameObject => obj(oid, defId, P1, `hand:${P1}`, { baseTypes: [cardKind(defId) === 'unit' ? 'unit' : CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'equipment'] as never })
                                                                                                                         
function scene(objs: readonly GameObject[], runes: readonly GameObject[] = Array.from({ length: 6 }, (_, i) => rune(i))): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of [obj('ava', 'OGN-107', P1, BF0, { baseMight: 4 }), obj('foe', 'BLK', P2, BF0, { baseMight: 1 }), ...runes, ...objs]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 4; k++) {
      const id = `deck${i++}`
      const c = obj(id, 'BLK', p, `mainDeck:${p}`)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, c.oid] } } }
    }
  }
  return s
}
type Req = { key: string; controller: PlayerId; candidates: readonly { id: string }[] }
                                                                          
function attackAndDrain(g: InteractiveGame, answer: (req: Req) => string): string[] {
  const asked: string[] = []
  g.apply({ kind: 'ATTACK', player: P1, battlefield: BF0 } as never)
  for (let i = 0; i < 40; i++) {
    const p = g.pending()
    if (p.mode === 'choice') {
      const req = (p as unknown as { request: Req }).request
      asked.push(req.key)
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: answer(req) } as never)
    } else if (p.mode === 'window') {
      g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never)
    } else break
  }
  return asked
}
const yesPick = (pick: string, target?: string) => (req: Req): string =>
  req.key.startsWith('__mayChoose__') ? 'yes' : req.key === OGN_107_PICK_KEY ? pick : req.key === OGN_107_SPELL_TARGET ? (target ?? req.candidates[0]!.id) : req.candidates[0]!.id
                                                         
const findDef = (g: InteractiveGame, defId: string) => Object.values(g.state.objects).find((o) => o.defId === defId)
const zoneOf = (g: InteractiveGame, defId: string): string => String(findDef(g, defId)?.zone ?? '(gone)')
const handN = (g: InteractiveGame): number => g.state.zones[`hand:${P1}`]?.contents.length ?? 0
const blueRunesAtBase = (g: InteractiveGame): number => (g.state.zones[BASE]?.contents ?? []).filter((o) => g.state.objects[o]?.defId === 'rune:blue').length

describe('★★★★★★★ ★1254 艾娃 OGN-107 打出待命【法术】—— 真会话层 E2E(缺陷 157)', () => {
  test('★前提:样本卡面(借鉴历史 OGN-083 法术·待命·反应·无目标 4 费;慈悲度魂落 OGN-053 法术·待命·目标 custom;丛林伏击 SFD-004 法术·待命·1 红 pip;禁军之墙 SFD-043 targetlessChoice)', () => {
    for (const id of ['OGN-083', 'OGN-053', 'SFD-004', 'SFD-043']) {
      expect(CARD_CATEGORIES[id], id).toBe('spell')
      expect(cardKeywords(id), `${id} 带待命`).toContain(STANDBY_KEYWORD)
      expect(playSpecFor(id), `${id} 有 spec`).toBeDefined()
    }
    expect(CARD_COSTS['OGN-083']).toMatchObject({ mana: 4, pips: 0 })
    expect(playSpecFor('OGN-083')!.target).toBe('none')
    expect(playSpecFor('OGN-053')!.target).toBe('custom')
    expect(CARD_COSTS['SFD-004']).toMatchObject({ mana: 2, pips: 1, colors: ['red'] })
    expect(playSpecFor('SFD-043')!.targetlessChoice, '★反驳者 ①:禁军之墙 target custom 但选择全走问链').toBe(true)
    expect(spellNeedsTarget(playSpecFor('SFD-043')!), '★targetlessChoice 当无目标').toBe(false)
    expect(spellNeedsTarget(playSpecFor('OGN-053')!)).toBe(true)
    expect(spellNeedsTarget(playSpecFor('OGN-083')!)).toBe(false)
  })

  test('🔴🔴🔴★★★★★★★①借鉴历史 OGN-083(无目标 · [反应])⇒ 付 1 蓝 pip → 法术上链结算 → 抽两张 → 进废牌堆;修前:躺进 base:P1 休眠、没抽牌', () => {
    const g = new InteractiveGame(scene([inHand('sp', 'OGN-083')]), DEPS)
    const hand0 = handN(g), blue0 = blueRunesAtBase(g)
    const asked = attackAndDrain(g, yesPick('sp'))
    expect(asked.some((k) => k.startsWith('__mayChoose__')), '★确认问出现了(§383.3.a)').toBe(true)
    expect(asked, '★选卡问出现').toContain(OGN_107_PICK_KEY)
    expect(asked, '★无目标法术不问目标').not.toContain(OGN_107_SPELL_TARGET)
    expect(zoneOf(g, 'OGN-083'), '★★★法术结算完进废牌堆(§351.2),不是 base:P1').toBe(`discard:${P1}`)
    expect(findDef(g, 'OGN-083')?.status?.dormant, '★不是休眠物件').not.toBe(true)
    expect(handN(g) - hand0, '★-1 打出 +2 抽(「抽两张牌」真结算)').toBe(1)
    expect(blue0 - blueRunesAtBase(g), '★门槛费:1 枚蓝 pip 真付了(回收进符文牌库)').toBe(1)
    expect((g.state.zones[BASE]?.contents ?? []).map((o) => g.state.objects[o]?.defId), '★基地区没有法术物件').not.toContain('OGN-083')
    expect(g.pending().mode, '★链清空回到行动').toBe('action')
  })

  test('🔴🔴🔴★★★★★★★②慈悲度魂落 OGN-053(目标 custom)⇒ 先问 avaSpellTarget(候选 = 我的在场单位)→ 目标拿到增益 → 进废牌堆;修前:根本不问目标', () => {
    const g = new InteractiveGame(scene([inHand('sp', 'OGN-053')]), DEPS)
    const asked = attackAndDrain(g, yesPick('sp', 'ava'))
    expect(asked, '★目标类法术问了目标').toContain(OGN_107_SPELL_TARGET)
    expect(zoneOf(g, 'OGN-053'), '★结算完进废牌堆').toBe(`discard:${P1}`)
    expect(findDef(g, 'OGN-107')?.counters?.buff ?? 0, '★句①「给予一名友方单位增益」真落到目标').toBeGreaterThanOrEqual(1)
  })

  test('🔴🔴★★★★★③丛林伏击 SFD-004(1 红 pip)+ 基地只有蓝符文、法力 0 ⇒ freeAll 真全免(法力 + pip 一分不付):照样上链进废牌堆', () => {
    const g = new InteractiveGame(scene([inHand('sp', 'SFD-004')]), DEPS)
    expect(g.state.runePools?.[P1]?.mana ?? 0, '★前提:法力 0').toBe(0)
    attackAndDrain(g, yesPick('sp'))
    expect(zoneOf(g, 'SFD-004'), '★零红符文也打得出 = §356.1.b.1「无视其费用」法力与符能都归零').toBe(`discard:${P1}`)
  })

  test('★★★★★④对照:凯南 VEN-135(单位)照旧走 playFree 落「此处」BF0 休眠;⑤禁军之墙 SFD-043(targetlessChoice)候选侧列得出、不问目标', () => {
    const g = new InteractiveGame(scene([inHand('u', 'VEN-135')]), DEPS)
    attackAndDrain(g, (req) => req.key.startsWith('__mayChoose__') ? (req.key.includes('OGN-107') ? 'yes' : 'no') : req.key === OGN_107_PICK_KEY ? 'u' : req.candidates[0]!.id)
    expect(zoneOf(g, 'VEN-135'), '★单位打到此处').toBe(BF0)
    expect(findDef(g, 'VEN-135')?.status?.dormant, '★单位休眠进场').toBe(true)
    const s = scene([inHand('w', 'SFD-043')])
    expect(standbySpellPlayable(s, P1, 'SFD-043', 'w', AVA_DEPS), '★反驳者 ①:legalTargets 为空也列(选择全走问链)').toBe(true)
    const trig = makeAva107Trigger(asObjId('ava'), P1, AVA_DEPS)
    const ev = { kind: 'attack', player: P1, battlefield: BF0, attackers: [asObjId('ava')] } as never
    expect(trig.nextChoice?.(s, ev, { [OGN_107_PICK_KEY]: 'w' }), '★不问目标').toBeNull()
    expect(trig.effect(s, ev, { [OGN_107_PICK_KEY]: 'w' }).map((e) => e.kind), '★照发 playSpellFromZone').toEqual(['playSpellFromZone'])
  })

  test('★★★★★⑥候选侧闸(反驳者 ③):目标类法术零合法目标 ⇒ 不列(pip 别白扣);⑦第三态 fail-closed(反驳者 ②):不给 specFor ⇒ 法术不列、effect 不发', () => {
                                                              
    const s0 = scene([inHand('sp', 'OGN-053')])
    const noUnit = { ...s0, objects: Object.fromEntries(Object.entries(s0.objects).filter(([k]) => k !== 'ava')), zones: { ...s0.zones, [BF0]: { ...s0.zones[BF0]!, contents: s0.zones[BF0]!.contents.filter((o) => o !== 'ava') } } } as GameState
    expect(playSpecFor('OGN-053')!.legalTargets(noUnit, P1), '★前提:零合法目标').toEqual([])
    expect(standbySpellPlayable(noUnit, P1, 'OGN-053', 'sp', AVA_DEPS), '★零目标 ⇒ 不列(§355.8 / §419.3.c)').toBe(false)
    expect(standbySpellPlayable(s0, P1, 'OGN-053', 'sp', AVA_DEPS), '★对照:有目标 ⇒ 列').toBe(true)
    const bare: Ava107Deps = { hasStandby: AVA_DEPS.hasStandby, isUnitCard: AVA_DEPS.isUnitCard }
    expect(standbySpellPlayable(s0, P1, 'OGN-083', 'sp', bare), '★第三态:没 specFor ⇒ 不列').toBe(false)
    const trig = makeAva107Trigger(asObjId('ava'), P1, bare)
    const ev = { kind: 'attack', player: P1, battlefield: BF0, attackers: [asObjId('ava')] } as never
    const s1 = scene([inHand('sp', 'OGN-083')])
    expect(trig.effect(s1, ev, { [OGN_107_PICK_KEY]: 'sp' }), '★第三态:effect 不发(fail-closed,别不带目标硬发)').toEqual([])
                                          
    const full = makeAva107Trigger(asObjId('ava'), P1, AVA_DEPS)
    expect(full.effect(s0, ev, { [OGN_107_PICK_KEY]: 'sp', [OGN_107_SPELL_TARGET]: 'foe' }), '★答案不在 legalTargets(敌方单位)⇒ 静默').toEqual([])
    expect(full.effect(s0, ev, { [OGN_107_PICK_KEY]: 'sp', [OGN_107_SPELL_TARGET]: 'ava' }).map((e) => e.kind), '★对照:合法目标 ⇒ 发').toEqual(['playSpellFromZone'])
  })
})
