import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_003_PICK, UNL_003_DAMAGE } from '../../data/cards/UNL-003'
import { UNL_184_ALLY, UNL_184_DEST } from '../../data/cards/UNL-184'

                                                                                                                
                                                                                             
                                                                                 
                                                                                                                   
                                                                                                

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
const rune = (i: number, color: string): GameObject => ({
  oid: asObjId(`rune_${color}${i}`), defId: `rune:${color}`, owner: P1, controller: P1, zone: asZoneId(BASE),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
function scene(objs: readonly GameObject[], mana = 0): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of objs) put(o)
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) put(obj(`deck_${p}_${k}`, 'BLK', p, `mainDeck:${p}`))
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, runePools: { ...s.runePools, [P1]: { mana, runes: {} } } } as GameState
  return s
}
type Landed = { events?: readonly { kind: string; unit?: string; at?: string }[] }
const landedPlayUnits = (r: unknown) => ((r as Landed).events ?? []).filter((e) => e.kind === 'playUnit')

describe('★★★★★★★ ★1256 收尾 缺陷 159:效果打出派生的 playUnit 要带 at(落点)', () => {
  test('★前提:鲛人滋事者 UNL-003 是 2 费单位、狩猎律动 UNL-184 2 费 1 pip(红/橙)', () => {
    expect(CARD_COSTS['UNL-003']).toMatchObject({ mana: 2, pips: 0 })
    expect(CARD_COSTS['UNL-184']).toMatchObject({ mana: 2, pips: 1 })
    expect(UNL_003_DAMAGE).toBe(2)
  })

  test('🔴★★★★★①reduce 层:playFree{to: BF0} ⇒ 派生 playUnit.at = BF0;不带 to ⇒ at = 打出者基地;②playUnit{play} 路(§419.3 重写)⇒ at = play.to', () => {
    const s = scene([obj('u', 'U-X', P1, `exile:${P1}`)])
    const a = applyEvents(s, [{ kind: 'playFree', obj: asObjId('u'), player: P1, to: asZoneId(BF0) } as unknown as GameEvent], { getTriggers: () => [] } as never)
    expect(landedPlayUnits(a).map((e) => e.at), '★playFree 带 to ⇒ at = to(修前 undefined)').toEqual([BF0])
    const b = applyEvents(s, [{ kind: 'playFree', obj: asObjId('u'), player: P1 } as unknown as GameEvent], { getTriggers: () => [] } as never)
    expect(landedPlayUnits(b).map((e) => e.at), '★不带 to ⇒ at = 缺省基地').toEqual([BASE])
    const c = applyEvents(s, [{ kind: 'playUnit', unit: asObjId('u'), player: P1, play: { card: asObjId('u'), to: asZoneId(BF0), cost: { mana: 0 } } } as unknown as GameEvent], { getTriggers: () => [] } as never)
    expect(landedPlayUnits(c).map((e) => e.at), '★playUnit{play} 路重写后也带 at(修前丢)').toEqual([BF0])
  })

  test('🔴🔴🔴★★★★★★★③真会话层:狩猎律动 UNL-184 放逐我的鲛人滋事者、拥有者把它打到有敌方单位的 BF1 ⇒ 问 marauderHit、敌方吃 2 伤;修前:不问、0 伤', () => {
    const g = new InteractiveGame(scene([
      obj('hunt', 'UNL-184', P1, `hand:${P1}`, { baseTypes: ['spell'] as never }),
      obj('mar', 'UNL-003', P1, BASE, { baseMight: 3 }),
      obj('foe', 'FOE-X', P2, BF1, { baseMight: 6 }),
      ...Array.from({ length: 3 }, (_, i) => rune(i, 'red')),
    ], 6), DEPS)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'hunt')
    expect(play, '★前提:狩猎律动打得出').toBeDefined()
    const asked: string[] = []
    const dests: string[][] = []
    g.apply(play as never)
    for (let i = 0; i < 60; i++) {
      const p = g.pending()
      if (p.mode === 'choice') {
        const req = (p as unknown as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
        asked.push(req.key)
        let answer = req.candidates[0]!.id
        if (req.key === UNL_184_ALLY) answer = req.candidates.find((c) => c.id === 'mar')?.id ?? answer
        if (req.key === UNL_184_DEST) { dests.push(req.candidates.map((c) => c.id)); answer = req.candidates.find((c) => c.id === BF1)?.id ?? answer }
        if (req.key === UNL_003_PICK) answer = req.candidates.find((c) => c.id === 'foe')?.id ?? answer
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer } as never)
      } else if (p.mode === 'window') {
        g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never)
      } else break
    }
    expect(asked, '★狩猎律动问了放逐谁').toContain(UNL_184_ALLY)
    expect(asked, '★问了落到哪').toContain(UNL_184_DEST)
    expect(dests[0], '★BF1 在落点候选里').toContain(BF1)
    const mar = Object.values(g.state.objects).find((o) => o.defId === 'UNL-003')
    expect(String(mar?.zone), '★鲛人真落到 BF1').toBe(BF1)
    expect(asked, '★★★鲛人「打出到一处战场」响了(修前不问)').toContain(UNL_003_PICK)
    expect(g.state.objects[asObjId('foe')]?.damage ?? 0, '★★★此处的敌方单位吃 2 伤(修前 0)').toBe(UNL_003_DAMAGE)
  })
})
