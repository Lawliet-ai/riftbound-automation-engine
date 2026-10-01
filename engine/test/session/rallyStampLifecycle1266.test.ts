import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { isRallyActive } from '../../src/keywords/rally'

                                                                               
                                                                                           
                                                             
                                                               
                                                               
                                                         
                                                              
  
                                                                     
                                                                         
                                                                   
                                                                          
                                                           
const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)
const rune = (i: number, who: PlayerId): GameObject => ({
  oid: asObjId(`rune_${who}_${i}`), defId: 'rune:red', owner: who, controller: who,
  zone: asZoneId(`base:${who}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
function base(objs: readonly GameObject[], mana = 20): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}; const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o; const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of objs) put(o)
  for (const p of [P1, P2]) for (let k = 0; k < 6; k++) put(obj(`deck_${p}_${k}`, 'BLK', p, `mainDeck:${p}`))
  return { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { ...s.runePools, [P1]: { mana, runes: {} }, [P2]: { mana, runes: {} } } } as unknown as GameState
}
function withStandby(s0: GameState, os: readonly GameObject[]): GameState {
  const sb = Object.values(s0.zones).find((z) => z.kind === 'standby'
    && (z as { parentBattlefield?: string }).parentBattlefield === BF0)!
  expect(sb, '★前提:BF0 有待命区').toBeDefined()
  const objects = { ...s0.objects }; let contents = [...sb.contents]
  for (const o of os) {
    const put = { ...o, zone: asZoneId(sb.id), status: { ...o.status, faceDown: true } } as GameObject
    objects[put.oid] = put; contents = [...contents, put.oid]
  }
  return { ...s0, objects, zones: { ...s0.zones, [sb.id]: { ...sb, contents } } } as unknown as GameState
}
function drain(g: InteractiveGame): void {
  for (let i = 0; i < 80; i++) {
    const p = g.pending()
    if (p.mode === 'choice') {
      const req = (p as unknown as { request: { key: string; controller: PlayerId; candidates: readonly { id: string }[] } }).request
      const c = req.candidates[0]
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key,
        answer: req.key.startsWith('__mayChoose__') ? 'yes' : (c ? c.id : '__done__') } as never)
    } else if (p.mode === 'window') { g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never) }
    else break
  }
}
const playUnitFromHand = (g: InteractiveGame, oid: string): void => {
  const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_UNIT' && String((x as { oid?: string }).oid) === oid)
  expect(a, `★前提:${oid} 可从手牌打出`).toBeDefined()
  g.apply(a as never); drain(g)
}
const stampOf = (g: InteractiveGame, oid: string): unknown =>
  (g.state.objects[asObjId(oid)]?.status as { confirmedThisTurn?: true } | undefined)?.confirmedThisTurn

describe('★★★★★★★ ★1266 缺陷 165 / 166:鼓舞的「自己那次」戳跨回合不清 + 待命打出取错落地物件', () => {
  test('🔴★★★★★★①缺陷 165:上一回合打出的牌,这一回合确认了【别的牌】,它身上的鼓舞该亮', () => {
    const g = new InteractiveGame(base([
      obj('rally1', 'OGN-217', P1, `hand:${P1}`, { baseKeywords: ['鼓舞'] as never }),
      obj('other', 'UNL-003', P1, `hand:${P1}`),
                                                    
      ...Array.from({ length: 6 }, (_, i) => rune(i, P1)),
    ]), DEPS)
    playUnitFromHand(g, 'rally1')
    const mine = Object.values(g.state.objects).find((o) => o.defId === 'OGN-217' && o.controller === P1)!
    expect(stampOf(g, String(mine.oid)), '★前提:它自己那次确认盖了戳').toBe(true)
    expect(isRallyActive(g.state, g.state.objects[mine.oid]), '★本回合它是唯一确认 ⇒ 不该亮(§812.1.c)').toBe(false)
              
    g.apply({ kind: 'END_TURN', player: P1 } as never); drain(g)
    g.apply({ kind: 'END_TURN', player: P2 } as never); drain(g)
    expect(String(g.state.activePlayer), '★前提:回合已回到我').toBe(String(P1))
    expect(g.state.confirmedThisTurn?.[P1] ?? 0, '★前提:新回合计数器已清零').toBe(0)
    playUnitFromHand(g, 'other')
    expect(g.state.confirmedThisTurn?.[P1] ?? 0, '★前提:这回合确认了【另一张】牌').toBe(1)
    const still = Object.values(g.state.objects).find((o) => o.defId === 'OGN-217' && o.controller === P1)!
    expect.soft(stampOf(g, String(still.oid)), '★★★上一回合那次的戳该随回合清掉(修前恒 true)').not.toBe(true)
    expect.soft(isRallyActive(g.state, g.state.objects[still.oid]),
      '★★★§812.1.c 只看【同一回合】⇒ 这回合有别的牌确认过 ⇒ 它身上的鼓舞该亮(修前永久不亮)').toBe(true)
  })

  test('🔴★★★★★★②缺陷 166:待命打出一名【身上贴着装备】的单位 ⇒ 落地物件不能取成那件装备', () => {
    const s0 = base([obj('eq', 'SFD-009', P1, `base:${P1}`,
      { baseTypes: ['equipment'] as never, status: { attachedTo: asObjId('sb1') } as never })])
    const g = new InteractiveGame(withStandby(s0, [obj('sb1', 'UNL-003', P1, 'placeholder')]), DEPS)
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_STANDBY' && String((x as { oid?: string }).oid) === 'sb1')
    expect(a, '★前提:待命单位可打出').toBeDefined()
    g.apply(a as never); drain(g)
    const contents = g.state.zones[asZoneId(BF0)]!.contents.map(String)
    expect(contents, '★前提:贴附联动确实把装备也带到了 BF0、且排在被打出那张【之后】').toEqual(['sb1', 'eq'])
    expect.soft((g.state.objects[asObjId('sb1')]?.status as { faceDown?: boolean } | undefined)?.faceDown,
      '★★★被打出的那张才该被翻面(修前 faceDown 恒 true —— 翻的是装备)').not.toBe(true)
    expect.soft(stampOf(g, 'sb1'), '★★★确认戳该盖在被打出的那张身上(修前盖在装备上)').toBe(true)
    expect.soft(stampOf(g, 'eq'), '★★★装备不该被盖戳(它没有被打出)').not.toBe(true)
  })
})
