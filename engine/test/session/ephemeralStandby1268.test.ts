import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { UNL_081 } from '../../data/cards/UNL-081'

                                            
                                                              
                                                                              
                                       
                                                                                  
                                                                 
                                                                     
const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const rune = (i: number, who: PlayerId): GameObject => ({
  oid: asObjId(`rune_${who}_${i}`), defId: 'rune:blue', owner: who, controller: who,
  zone: asZoneId(`base:${who}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
function base(objs: readonly GameObject[]): GameState {
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
    runePools: { ...s.runePools, [P1]: { mana: 20, runes: {} }, [P2]: { mana: 20, runes: {} } } } as unknown as GameState
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
  for (let i = 0; i < 90; i++) {
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
                                     
const zoneOfDef = (g: InteractiveGame, defId: string): string =>
  String(Object.values(g.state.objects).find((o) => o.defId === defId)?.zone)
function playStandbyThenTwoTurns(g: InteractiveGame, oid: string): void {
  const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_STANDBY' && String((x as { oid?: string }).oid) === oid)
  expect(a, `★前提:待命的 ${oid} 可打出`).toBeDefined()
  g.apply(a as never); drain(g)
  g.apply({ kind: 'END_TURN', player: P1 } as never); drain(g)
  g.apply({ kind: 'END_TURN', player: P2 } as never); drain(g)
}

                                                                              
                                            
describe('★★★★★★ ★1268 [瞬息] × 待命打出(此前零覆盖;缺陷 166 修前【贴装备】那一格会让它永久留场)', () => {
  test('★前提:UNL-081 这张真卡确实同时带[待命]与[瞬息](造景声明与卡表不许脱钩)', () => {
    expect(UNL_081.keywords, '★真卡关键词表').toEqual(expect.arrayContaining(['待命', '瞬息']))
  })

  test('★★★①从待命翻开打出的[瞬息]单位 ⇒ 下一个开始阶段被摧毁(§816.1.b + §811.1.c.3)', () => {
    const g = new InteractiveGame(withStandby(base([...Array.from({ length: 6 }, (_, i) => rune(i, P1))]),
      [obj('eph', 'UNL-081', P1, 'placeholder', { baseKeywords: ['瞬息'] as never })]), DEPS)
    playStandbyThenTwoTurns(g, 'eph')
    expect(String(g.state.activePlayer), '★前提:回合已回到我').toBe(String(P1))
    expect(zoneOfDef(g, 'UNL-081'), '★★★§816.1.b:控制者开始阶段被摧毁 ⇒ 进废牌堆').toBe(`discard:${P1}`)
  })

  test('★②阴性对照:同一条路、不带[瞬息]的单位 ⇒ 留在场上(证明 ① 是瞬息干的)', () => {
    const g = new InteractiveGame(withStandby(base([...Array.from({ length: 6 }, (_, i) => rune(i, P1))]),
      [obj('plain', 'UNL-003', P1, 'placeholder')]), DEPS)
    playStandbyThenTwoTurns(g, 'plain')
    expect(zoneOfDef(g, 'UNL-003'), '★不带瞬息 ⇒ 仍在战场').toBe(BF0)
  })

  test('🔴★★★★★③缺陷 166 那一格:待命打出【身上贴着装备】的[瞬息]单位 ⇒ 照样该被摧毁', () => {
                                                                 
                                                                             
    const s0 = base([...Array.from({ length: 6 }, (_, i) => rune(i, P1)),
      obj('eq', 'SFD-009', P1, `base:${P1}`,
        { baseTypes: ['equipment'] as never, status: { attachedTo: asObjId('eph') } as never })])
    const g = new InteractiveGame(withStandby(s0, [obj('eph', 'UNL-081', P1, 'placeholder', { baseKeywords: ['瞬息'] as never })]), DEPS)
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_STANDBY' && String((x as { oid?: string }).oid) === 'eph')
    expect(a, '★前提:待命的瞬息单位可打出').toBeDefined()
    g.apply(a as never); drain(g)
    expect((g.state.objects[asObjId('eph')]?.status as { faceDown?: boolean } | undefined)?.faceDown,
      '★前提:被打出的那张真被翻面(缺陷 166 修前这里恒 true —— 翻的是装备)').not.toBe(true)
    g.apply({ kind: 'END_TURN', player: P1 } as never); drain(g)
    g.apply({ kind: 'END_TURN', player: P2 } as never); drain(g)
    expect(zoneOfDef(g, 'UNL-081'), '★★★贴着装备也照样吃瞬息(修前永久留场)').toBe(`discard:${P1}`)
  })
})
