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
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
function base(): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}; const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o; const z = zones[o.zone]
    if (!z) throw new Error(`区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) put(obj(`deck_${p}_${k}`, 'BLK', p, `mainDeck:${p}`))
  return { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { ...s.runePools, [P1]: { mana: 20, runes: {} }, [P2]: { mana: 0, runes: {} } } } as unknown as GameState
}
                            
function withStandby(s0: GameState, o: GameObject): GameState {
  const sb = Object.values(s0.zones).find((z) => z.kind === 'standby'
    && (z as { parentBattlefield?: string }).parentBattlefield === BF0)!
  expect(sb, '★前提:BF0 有待命区').toBeDefined()
  const put = { ...o, zone: asZoneId(sb.id), status: { ...o.status, faceDown: true } } as GameObject
  return { ...s0, objects: { ...s0.objects, [put.oid]: put },
    zones: { ...s0.zones, [sb.id]: { ...sb, contents: [put.oid] } } } as unknown as GameState
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
const confirmed = (g: InteractiveGame): number => g.state.confirmedThisTurn?.[P1] ?? 0
const played = (g: InteractiveGame): number => g.state.playedCardCountThisTurn?.[P1] ?? 0
                                                   
const rallyWatcher = (g: InteractiveGame): boolean =>
  isRallyActive(g.state, g.state.objects[asObjId('watch')])

describe('★★★★★★★ ★1264 缺陷 163:§812 鼓舞的账本在【从待命打出】那条路上一次都不记', () => {
  test('★①正控:从【手牌】打出一名单位 ⇒ 确认账本 +1,场上的鼓舞被点亮', () => {
    const s = base()
    const g = new InteractiveGame({ ...s,
      objects: { ...s.objects,
        u1: obj('u1', 'UNL-003', P1, `hand:${P1}`),
        watch: obj('watch', 'OGN-243', P1, BF0, { baseKeywords: ['鼓舞'] as never }) },
      zones: { ...s.zones,
        [`hand:${P1}`]: { ...s.zones[`hand:${P1}`]!, contents: [asObjId('u1')] },
        [BF0]: { ...s.zones[BF0]!, contents: [asObjId('watch')] } } } as unknown as GameState, DEPS)
    expect(rallyWatcher(g), '★前提:开局鼓舞没亮').toBe(false)
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_UNIT' && String((x as { oid?: string }).oid) === 'u1')
    expect(a, '★前提:手牌单位可打出').toBeDefined()
    g.apply(a as never); drain(g)
    expect(played(g), '★两本账都该 +1(打出账)').toBe(1)
    expect(confirmed(g), '★两本账都该 +1(确认账)').toBe(1)
    expect(rallyWatcher(g), '★★★鼓舞被点亮 —— 这条正控证明观测口有效').toBe(true)
  })

  test('★③修法的另一半:待命打出的那张【自己带鼓舞】⇒ 不许用自己那次确认点亮自己(§812.1.c)', () => {
                                                                           
                                                                
                                                               
    const s0 = base()
    const g = new InteractiveGame(withStandby(s0,
      obj('sb1', 'OGN-243', P1, 'placeholder', { baseKeywords: ['鼓舞'] as never })), DEPS)
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_STANDBY' && String((x as { oid?: string }).oid) === 'sb1')
    expect(a, '★前提:待命的鼓舞单位可打出').toBeDefined()
    g.apply(a as never); drain(g)
    expect(confirmed(g), '★它自己那次确认确实记进了账本').toBe(1)
    const self = Object.values(g.state.objects).find((o) => o.defId === 'OGN-243')
    expect(self, '★它真落地了(§108 换区可能换 oid ⇒ 按 defId 找)').toBeDefined()
    expect(isRallyActive(g.state, self), '★★★但自己那次不算数 ⇒ 它身上的鼓舞【不该】亮').toBe(false)
  })

  test('🔴★★★★★★②缺陷 163:从【待命】打出一名单位 ⇒ 确认账本一动不动、鼓舞点不亮', () => {
    const s0 = base()
    const withWatcher = { ...s0,
      objects: { ...s0.objects, watch: obj('watch', 'OGN-243', P1, BF0, { baseKeywords: ['鼓舞'] as never }) },
      zones: { ...s0.zones, [BF0]: { ...s0.zones[BF0]!, contents: [asObjId('watch')] } } } as unknown as GameState
    const g = new InteractiveGame(withStandby(withWatcher, obj('sb1', 'UNL-003', P1, 'placeholder')), DEPS)
    expect(rallyWatcher(g), '★前提:开局鼓舞没亮').toBe(false)
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_STANDBY' && String((x as { oid?: string }).oid) === 'sb1')
    expect(a, '★前提:待命单位可打出(§811.1.c.3 待命打出【就是打出】)').toBeDefined()
    g.apply(a as never); drain(g)
    expect(played(g), '★前提:打出账记了 —— 说明这一步确实是「打出」').toBe(1)
    expect.soft(confirmed(g), '★★★§419.4.b 该记一次确认(修前是 0)').toBe(1)
    expect.soft(rallyWatcher(g), '★★★§812.1.c 鼓舞该被点亮(修前点不亮)').toBe(true)
  })
})
