import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { confirmedCountThisTurn, isRallyActive } from '../../src/keywords/rally'
import { UNL_139_BF_KEY, UNL_139_PICK_KEY } from '../../data/cards/UNL-139'
import { SFD_111_PICK, SFD_111_DEST } from '../../data/cards/SFD-111'

                                                                            
                                                                  
                                                                         
                                                      
                                                         
                                                                  
                                                                 
                                                                 
                                            
                                                                
                                                                  
                                                            
                                                                           
                                                                      
const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const spell = (oid: string, defId: string, who: PlayerId, zone: string): GameObject =>
  obj(oid, defId, who, zone, { baseTypes: ['spell'] as never })
const rune = (i: number, color: string, who: PlayerId = P1): GameObject => ({
  oid: asObjId(`rune_${who}_${color}${i}`), defId: `rune:${color}`, owner: who, controller: who,
  zone: asZoneId(`base:${who}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
function scene(objs: readonly GameObject[], mana: { P1?: number; P2?: number } = {}): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}; const zones = { ...s.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o; const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of objs) put(o)
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) put(obj(`deck_${p}_${k}`, 'BLK', p, `mainDeck:${p}`))
  return { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { ...s.runePools, [P1]: { mana: mana.P1 ?? 0, runes: {} }, [P2]: { mana: mana.P2 ?? 0, runes: {} } } } as unknown as GameState
}
type Req = { key: string; controller: PlayerId; candidates: readonly { id: string }[] }
function drain(g: InteractiveGame, action: unknown, answer: (req: Req) => string): void {
  g.apply(action as never)
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'choice') {
      const req = (p as unknown as { request: Req }).request
      g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: answer(req) } as never)
    } else if (p.mode === 'window') { g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as never) }
    else break
  }
}
const conf = (g: InteractiveGame, p: PlayerId): number => confirmedCountThisTurn(g.state, p)
const played = (g: InteractiveGame, p: PlayerId): number => g.state.playedCardCountThisTurn?.[p] ?? 0
                                          
const watcher = (who: PlayerId): GameObject =>
  obj(`w_${who}`, 'OGN-243', who, BF0, { baseKeywords: ['鼓舞'] as never })
const rallyOf = (g: InteractiveGame, who: PlayerId): boolean =>
  isRallyActive(g.state, g.state.objects[asObjId(`w_${who}`)])
                                                                       
const zoneOfDef = (g: InteractiveGame, defId: string, who: PlayerId): string =>
  String(Object.values(g.state.objects).find((o) => o.defId === defId && o.controller === who)?.zone)

describe('★★★★★★★ ★1265 缺陷 164:【效果打出】两条路不记确认账 ⇒ 鼓舞点不亮(缺陷 163 同族)', () => {
  test('🔴★★★★★★①playFree 路:透骨尖钉让【对手】把单位打出 ⇒ 确认账该记【对手】的', () => {
    const g = new InteractiveGame(scene([
      spell('spike', 'UNL-139', P1, `hand:${P1}`), obj('fu', 'UNL-003', P2, `hand:${P2}`),
      watcher(P2), rune(0, 'purple'), rune(1, 'purple'),
    ], { P1: 5, P2: 3 }), DEPS)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'spike')
    expect(play, '★前提:透骨尖钉打得出').toBeDefined()
    drain(g, play, (req) => {
      if (req.key === UNL_139_BF_KEY) return BF0
      if (req.key === UNL_139_PICK_KEY) return req.candidates.find((c) => c.id === 'fu')?.id ?? req.candidates[0]!.id
      return req.candidates[0]!.id
    })
    expect(zoneOfDef(g, 'UNL-003', P2), '★前提:对手的单位真被打到 BF0').toBe(BF0)
    expect(played(g, P2), '★前提:打出账已经记了对手一次 —— 说明这一步确实是「打出」').toBe(1)
    expect.soft(conf(g, P2), '★★★§419.3.b「所有打出步骤」+ §337.1 ⇒ 打出者【对手】该记一次确认(修前 0)').toBe(1)
    expect.soft(rallyOf(g, P2), '★★★对手场上的鼓舞该被点亮(化神 FAQ:302 逐字裁定)').toBe(true)
    expect(conf(g, P1), '★对照:我只打了尖钉这一张 ⇒ 我这边恰 1(不因对手那次而多记)').toBe(1)
  })

  test('★③修法的另一半:playFree 打出的那张【自己带鼓舞】⇒ 不许用自己那次确认点亮自己(§812.1.c)', () => {
                                                                               
                                                           
    const g = new InteractiveGame(scene([
      spell('spike', 'UNL-139', P1, `hand:${P1}`),
      obj('fu', 'OGN-243', P2, `hand:${P2}`, { baseKeywords: ['鼓舞'] as never }),
      rune(0, 'purple'), rune(1, 'purple'),
    ], { P1: 5, P2: 3 }), DEPS)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'spike')
    expect(play, '★前提:透骨尖钉打得出').toBeDefined()
    drain(g, play, (req) => {
      if (req.key === UNL_139_BF_KEY) return BF0
      if (req.key === UNL_139_PICK_KEY) return req.candidates.find((c) => c.id === 'fu')?.id ?? req.candidates[0]!.id
      return req.candidates[0]!.id
    })
    expect(zoneOfDef(g, 'OGN-243', P2), '★前提:对手那张鼓舞单位真被打到 BF0').toBe(BF0)
    expect(conf(g, P2), '★它自己那次确认确实记进了对手的账本').toBe(1)
    const self = Object.values(g.state.objects).find((o) => o.defId === 'OGN-243' && o.controller === P2)
    expect(isRallyActive(g.state, self), '★★★但自己那次不算数 ⇒ 它身上的鼓舞【不该】亮(§812.1.c「另一张卡牌不同于…」)').toBe(false)
  })

  test('🔴★★★★★★②playUnit{play} 路:前来相助从手牌打出一名单位 ⇒ 我该记【两次】确认(法术 1 + 单位 1)', () => {
    const g = new InteractiveGame(scene([
      spell('assist', 'SFD-111', P1, `hand:${P1}`), obj('mu', 'UNL-003', P1, `hand:${P1}`),
      obj('g', 'U-guard', P1, BF0), watcher(P1), rune(0, 'orange'), rune(1, 'orange'),
    ], { P1: 6 }), DEPS)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'assist')
    expect(play, '★前提:前来相助打得出').toBeDefined()
    drain(g, play, (req) => {
      if (req.key === SFD_111_PICK) return req.candidates.find((c) => c.id === 'mu')?.id ?? req.candidates[0]!.id
      if (req.key === SFD_111_DEST) return req.candidates.find((c) => c.id === BF0)?.id ?? req.candidates[0]!.id
      return req.candidates[0]!.id
    })
    expect(zoneOfDef(g, 'UNL-003', P1), '★前提:鲛人真落到 BF0').toBe(BF0)
    expect(played(g, P1), '★前提:打出账记了两次(法术 + 单位)').toBe(2)
    expect.soft(conf(g, P1), '★★★两本账该一致:确认也该是 2(修前只有法术那 1)').toBe(2)
  })
})
