import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { playBannedFor } from '../../data/cards/longtail-12'
import { unitDestinations } from '../../data/cards/play-from-deck'
import { CARD_COSTS } from '../../data/cardCosts'
import { playBonusFor, cardKind } from '../../data/registry'
import { CARD_TAGS } from '../../data/cardTags'
import { DRAGON_TAG } from '../../data/cards/VEN-157'

                                                                       
                                                                        
                                                                                                     
                                                                      
                                                              
                                                                      
                                                      
                                                                       
                                                                                 
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const BASE = `base:${P1}`
const DEPS = makeGameDeps(1)

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const rune = (i: number): GameObject => ({
  oid: asObjId(`rune${i}`), defId: 'rune:red', owner: P1, controller: P1, zone: asZoneId(BASE),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                                                                       
function scene(objs: readonly GameObject[], extra: Partial<GameState> = {}): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of [obj('drake', 'SFD-015', P1, `hand:${P1}`, { baseMight: 5 }), ...Array.from({ length: 6 }, (_, i) => rune(i)), ...objs]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, ...extra } as GameState
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 4; k++) {
      const id = `deck${i++}`
      const c = obj(id, 'BLK', p, `mainDeck:${p}`)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  return s
}
const guard = (bf: string) => obj('guard', 'U-guard', P1, bf)
const conquered = (...bfs: string[]) => ({ conqueredBattlefieldsThisTurn: { [P1]: bfs } } as unknown as Partial<GameState>)
const perchAt = (bf: string) => ({ battlefieldCards: { [bf]: { defId: 'VEN-157', owner: P2 } } } as unknown as Partial<GameState>)
type PlayAct = { kind: string; oid?: string; to?: string; bonus?: boolean }
const plays = (s: GameState, oid = 'drake'): PlayAct[] =>
  (new InteractiveGame(s, DEPS).legalActions(P1) as unknown as PlayAct[]).filter((a) => a.kind === 'PLAY_UNIT' && a.oid === oid)
const tos = (s: GameState): string[] => [...new Set(plays(s).map((a) => a.to ?? '?'))].sort()
const tosOf = (s: GameState, bonus: boolean): string[] => [...new Set(plays(s).filter((a) => (a.bonus === true) === bonus).map((a) => a.to ?? '?'))].sort()

describe('★★★★★★★ ★1253 栖息的冥龙 SFD-015 手牌打出路 × 龙栖峰权限(真会话层 legalActions)', () => {
  test('★前提:4 费 0 pip、「龙」属性(龙栖峰那笔可选额外费用挂得上)', () => {
    expect(CARD_COSTS['SFD-015']).toMatchObject({ mana: 4, pips: 0 })
    expect(playBonusFor('SFD-015')?.label, '★龙栖峰 AA 变体对冥龙可用').toContain('龙栖峰')
  })

  test('★★★★★★①没征服 ⇒ 一个落点都没有(连基地);②征服且仍控 BF0 ⇒ 只列 BF0、基地不在', () => {
    const none = scene([guard(BF0)])
    expect(playBannedFor(none, P1, 'SFD-015', BASE), '★前提:基地被第四档禁').toBe(true)
    expect(tos(none), '★没征服 ⇒ 不列(连基地)').toEqual([])
    const ok = scene([guard(BF0)], conquered(BF0))
    expect(playBannedFor(ok, P1, 'SFD-015', BF0), '★前提:征服过的 BF0 放行').toBe(false)
    expect(tos(ok), '★只列征服过且仍控的 BF0').toEqual([BF0])
    expect(plays(ok).length, '★至少一条普通变体').toBeGreaterThan(0)
  })

  test('★★★★★★③征服过 BF0 但已失控(那处没有我的单位)⇒ 不列 —— 限制是减法,不给权限;对照仍控 ⇒ 列', () => {
    const lost = scene([], conquered(BF0))
    expect(playBannedFor(lost, P1, 'SFD-015', BF0), '★第四档本身放行 BF0(征服账在)').toBe(false)
    expect(tos(lost), '★但 BF0 已不是 §355.2.a 有效位置 ⇒ 不列').toEqual([])
    expect(tos(scene([guard(BF0)], conquered(BF0))), '★对照').toEqual([BF0])
  })

  test('★★★★★★④龙栖峰在 BF1、本回合只征服了 BF0 ⇒ 付 AA 的变体照列、但 BF1 不在其落点里(权限压不过限制,FAQ L442-451)', () => {
    const s = scene([guard(BF0)], { ...conquered(BF0), ...perchAt(BF1) })
    expect(playBannedFor(s, P1, 'SFD-015', BF1), '★前提:未征服的龙栖峰被第四档禁').toBe(true)
    expect(tosOf(s, true), '★龙栖峰变体列了,但只剩 BF0').toEqual([BF0])
    expect(tosOf(s, false), '★普通变体也只 BF0').toEqual([BF0])
    expect(tos(s)).not.toContain(BF1)
  })

  test('★★★★★★⑤本回合征服了龙栖峰所在的 BF1 且仍控 ⇒ 不付 AA 的普通变体也列 BF1(FAQ L455-457);龙栖峰变体亦列', () => {
    const s = scene([guard(BF1)], { ...conquered(BF1), ...perchAt(BF1) })
    expect(tosOf(s, false), '★不需支付龙栖峰的额外费用也能打到征服过的战场').toEqual([BF1])
    expect(tosOf(s, true), '★付了也是那一格').toEqual([BF1])
  })

  test('★★★★★⑥效果打出路 unitDestinations 同口径:征服且控 ⇒ [BF0];征服但失控 ⇒ [];龙栖峰付费格不在效果路(设计边界)', () => {
    expect([...unitDestinations(scene([guard(BF0)], conquered(BF0)), P1, undefined, 'SFD-015')]).toEqual([BF0])
    expect([...unitDestinations(scene([], conquered(BF0)), P1, undefined, 'SFD-015')], '★已失控 ⇒ 不在 §355.2.a 缺省集').toEqual([])
    expect([...unitDestinations(scene([guard(BF0)], { ...conquered(BF0), ...perchAt(BF1) }), P1, undefined, 'SFD-015')], '★效果路没有龙栖峰付费格').toEqual([BF0])
  })
  test('★★★★★★★⑦★1253 收尾【缺陷 156】龙栖峰权限本身要活着(正控):普通龙 + 龙栖峰在空的 BF1 ⇒ 付 AA 的变体列 BF1、不付不列;apply 真落 BF1;同盘面冥龙付 AA 仍不列 BF1(④ 这才是第四档真拦的)', () => {
                                                  
    const DRAGON = Object.entries(CARD_TAGS)
      .filter(([id, t]) => String(t).split('|').includes(DRAGON_TAG) && cardKind(id) === 'unit' && id !== 'SFD-015' && CARD_COSTS[id]?.pips === 0)
      .map(([id]) => id).sort((a, b) => (CARD_COSTS[a]!.mana - CARD_COSTS[b]!.mana))
      .find((id) => playBonusFor(id)?.label?.includes('龙栖峰') === true)
    expect(DRAGON, '★前提:卡池里有这样一张龙').toBeDefined()
    const more = Array.from({ length: 8 }, (_, i) => ({ ...rune(i + 6), oid: asObjId(`rune${i + 6}`) }) as GameObject)                    
    const s = scene([obj('wyrm', DRAGON!, P1, `hand:${P1}`, { baseMight: 5 }), guard(BF0), ...more], perchAt(BF1))
    expect(playBannedFor(s, P1, DRAGON!, BF1), '★前提:普通龙没有落点限制').toBe(false)
    expect([...new Set(plays(s, 'wyrm').filter((a) => a.bonus !== true).map((a) => a.to))].sort(), '★不付 AA ⇒ 基地 + 我控 BF0').toEqual([BASE, BF0])
    expect([...new Set(plays(s, 'wyrm').filter((a) => a.bonus === true).map((a) => a.to))].sort(), '★付 AA ⇒ 龙栖峰 BF1 进候选(修前:一次都没进过)').toEqual([BASE, BF0, BF1])
    const g = new InteractiveGame(s, DEPS)
    const act = (g.legalActions(P1) as unknown as (PlayAct & { player: string })[]).find((a) => a.kind === 'PLAY_UNIT' && a.oid === 'wyrm' && a.bonus === true && a.to === BF1)
    expect(act).toBeDefined()
    g.apply(act as never)
    for (let i = 0; i < 8 && g.pending().mode === 'window'; i++) { const pd = g.pending(); if (pd.mode === 'window') g.apply({ kind: 'PASS', player: pd.player } as never) }
    const st = (g as unknown as { state: GameState }).state
    expect(Object.values(st.objects).find((o) => o.defId === DRAGON && (o.zone as string) === BF1), '★真落到龙栖峰').toBeDefined()
                                                                             
    const d = scene([guard(BF0)], { ...conquered(BF0), ...perchAt(BF1) })
    expect(tosOf(d, true), '★冥龙付 AA ⇒ 只剩 BF0').toEqual([BF0])
  })

  test('★★★★★⑤′【推论,非逐字裁定】征服了龙栖峰所在的 BF1 但已失控 ⇒ 普通变体不列;付 AA ⇒ §355.2.b 权限使 BF1 变为有效位置、冥龙限制也满足 ⇒ 列 BF1', () => {
    const s = scene([], { ...conquered(BF1), ...perchAt(BF1) })
    expect(playBannedFor(s, P1, 'SFD-015', BF1), '★前提:征服过 ⇒ 第四档放行').toBe(false)
    expect(tosOf(s, false), '★失控 ⇒ 不在 §355.2.a 缺省集 ⇒ 普通变体不列').toEqual([])
    expect(tosOf(s, true), '★付 AA ⇒ 龙栖峰权限把 BF1 变为有效位置(化神 FAQ L442-457 + §355.2.b 合推;修前权限没进门 ⇒ 空)').toEqual([BF1])
  })

})
