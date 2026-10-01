                                         
  
                                    
                                                            
                                                       
                                         
                                                
                                      
  
                                     
                                                                                       
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { moveDestinations } from '../../data/cards/enemy-move'
import { UNL_202_FRIEND_DEST, UNL_202_FOE_PICK } from '../../data/cards/UNL-202'
import { UNL_054_PREFIX } from '../../data/cards/UNL-054'
import { VEN_140_MOVE_KEY } from '../../data/cards/VEN-140'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
type Any = Record<string, any>

                                                                              
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[], battlefieldCount = 2): GameState {
  const s = createInitialState([P1, P2], battlefieldCount)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `deck${i++}`
    const c = obj(id, 'BLK', p, `mainDeck:${p}`)
    objects[id] = c
    zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
  }
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState)
}

const game = (s: GameState, seed = 0x1816): InteractiveGame => new InteractiveGame(s, makeGameDeps(seed) as never)
const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const playsOf = (g: InteractiveGame, player: PlayerId, cardOid: string): readonly Any[] =>
  (g.legalActions(player) as readonly Any[]).filter((a) => (a.kind === 'PLAY_CARD' || a.kind === 'PLAY_STANDBY')
    && String(a.cardOid ?? a.oid) === cardOid)
const isListed = (g: InteractiveGame, player: PlayerId, cardOid: string): boolean => playsOf(g, player, cardOid).length > 0
const playAction = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null =>
  (playsOf(g, player, cardOid).find((a) => target === undefined || String(a.target) === target) ?? null) as InteractiveAction | null
const choicePending = (g: InteractiveGame): Any => {
  const p = g.pending() as Any
  if (p.mode !== 'choice') throw new Error(`期望 choice 步,实为 ${String(p.mode)}`)
  return p
}
const choose = (g: InteractiveGame, key: string, answer: string): void =>
  g.apply({ kind: 'CHOOSE', player: P1, key, answer } as never)

                                                                                  
describe('★1816 ① UNL-202 真打出:问2 摘掉「无落点」的敌方候选', () => {
                                                                        
                                    
  const build = (): GameState => scene([
    inHand('card', 'UNL-202', P1),
    obj('mine', 'BLK', P1, `base:${P2}`),
    obj('foeA', 'BLK', P2, `base:${P2}`),
    obj('foeB', 'BLK', P2, `base:${P1}`),
  ], 0)

  test('前提自证:foeA 无落点、foeB 有落点、mine 有落点', () => {
    const s = curState(game(build()))
    expect(moveDestinations(s, 'foeA'), '★foeA 落点空').toEqual([])
    expect(moveDestinations(s, 'foeB'), '★foeB 落点非空').toEqual([`base:${P2}`])
    expect(moveDestinations(s, 'mine'), '★mine 落点非空').toEqual([`base:${P1}`])
  })

  test('③ 枚举侧不回归:∃ 活路(foeB)⇒ legalActions 仍列出 UNL-202', () => {
    expect(isListed(game(build()), P1, 'card'), '★有活分支 ⇒ 列出').toBe(true)
  })

  test('① 答完问1后,问2(选敌方)候选不得含 foeA、必含 foeB', () => {
    const g = game(build())
    const act = playAction(g, P1, 'card', 'mine')
    expect(act, '★真打出动作存在(target=mine)').toBeTruthy()
    g.apply(act!)
              
    let p = choicePending(g)
    expect(p, '★问1 是 choice').toBeTruthy()
    expect(String(p.request.key), '★问1 是友方落点').toBe(UNL_202_FRIEND_DEST)
    expect((p.request.candidates as Any[]).map((c) => String(c.id)), '★问1 候选 = mine 的落点')
      .toEqual([`base:${P1}`])
    choose(g, UNL_202_FRIEND_DEST, `base:${P1}`)
                         
    p = choicePending(g)
    expect(p, '★问2 是 choice').toBeTruthy()
    expect(String(p.request.key), '★问2 是敌方选谁').toBe(UNL_202_FOE_PICK)
    const ids = (p.request.candidates as Any[]).map((c) => String(c.id))
    expect(ids, '★无落点的 foeA 被前瞻摘除').not.toContain('foeA')
    expect(ids, '★有落点的 foeB 保留').toContain('foeB')
  })
})

                                                                        
describe('★1816 ② UNL-202 对照:两敌方都有落点 ⇒ 问2 候选含两者', () => {
  test('两个敌方(均在 base:P1 ⇒ 落点 base:P2)都留在问2 候选里', () => {
    const g = game(scene([
      inHand('card', 'UNL-202', P1),
      obj('mine', 'BLK', P1, `base:${P2}`),
      obj('foeA', 'BLK', P2, `base:${P1}`),
      obj('foeB', 'BLK', P2, `base:${P1}`),
    ], 0))
    const s = curState(g)
    expect(moveDestinations(s, 'foeA'), '★foeA 有落点').toEqual([`base:${P2}`])
    expect(moveDestinations(s, 'foeB'), '★foeB 有落点').toEqual([`base:${P2}`])
    g.apply(playAction(g, P1, 'card', 'mine')!)
    let p = choicePending(g)
    expect(String(p.request.key)).toBe(UNL_202_FRIEND_DEST)
    choose(g, UNL_202_FRIEND_DEST, `base:${P1}`)
    p = choicePending(g)
    expect(String(p.request.key)).toBe(UNL_202_FOE_PICK)
    const ids = (p.request.candidates as Any[]).map((c) => String(c.id))
    expect(ids, '★过滤不误伤:两者都在').toEqual(expect.arrayContaining(['foeA', 'foeB']))
    expect(ids.length, '★一个都没被摘').toBe(2)
  })
})

                                                                                
describe('★1816 ④ 可选问不错杀:UNL-054 确认期首问候选不因过滤被清空', () => {
  test('场上一名敌方 ⇒ 首问(多选)候选非空(含该敌方 + 「够了」)', () => {
    const g = game(scene([inHand('card', 'UNL-054', P1), obj('foe', 'BLK', P2, BF0)]))
    const act = playAction(g, P1, 'card')
    expect(act, '★真打出动作存在').toBeTruthy()
    g.apply(act!)
    const p = choicePending(g)
    expect(p, '★确认期首问是 choice').toBeTruthy()
    expect(String(p.request.key), '★多选首问').toBe(`${UNL_054_PREFIX}0`)
    const ids = (p.request.candidates as Any[]).map((c) => String(c.id))
    expect(ids.length, '★候选非空(过滤没清空可选问)').toBeGreaterThan(0)
    expect(ids, '★合法目标保留').toContain('foe')
  })
})

                                                                                               
describe('★1816 ⑥ VEN-140 真打出:问2 摘掉「无落点」的友方候选', () => {
                                                                
                                   
                                                                  
                                                                      
                                                                     
                                                                    
                                                              
                                                  
  const build = (): GameState => scene([
    inHand('card', 'VEN-140', P1),
    obj('foe', 'BLK', P2, `base:${P2}`),
    obj('mineA', 'BLK', P1, `base:${P2}`),
    obj('mineB', 'BLK', P1, `base:${P1}`),
  ], 0)

  test('前提自证:mineA 有落点(base:P1)、mineB 无落点', () => {
    const s = curState(game(build()))
    expect(moveDestinations(s, 'mineA'), '★mineA 落点非空').toEqual([`base:${P1}`])
    expect(moveDestinations(s, 'mineB'), '★mineB 落点空').toEqual([])
  })

  test('真打出 VEN-140 ⇒ 问2(移动哪名友方)候选不得含 mineB、必含 mineA', () => {
    const g = game(build())
                                                                                       
    const act = playAction(g, P1, 'card')
    expect(act, '★真打出动作存在(VEN-140 target=none)').toBeTruthy()
    g.apply(act!)
                                          
    const p = choicePending(g)
    expect(String(p.request.key), '★问1 无候选被跳过 ⇒ 直接问2(VEN_140_MOVE_KEY)').toBe(VEN_140_MOVE_KEY)
    const ids = (p.request.candidates as Any[]).map((c) => String(c.id))
    expect(ids, '★无落点的 mineB 被前瞻摘除').not.toContain('mineB')
    expect(ids, '★有落点的 mineA 保留').toContain('mineA')
  })
})

                                                                                       
describe('★1816 ⑧ ③ noRealTarget:isTarget 问候选非空但无一在场', () => {
                                                          
                                                                
                                                                       
                                                                           
                                      
                                                                     
                                       
  const gateReason = (g: InteractiveGame, raw: Any): Any =>
    (g as unknown as { askGateReason: (s: GameState, r: Any) => Any }).askGateReason(curState(g), raw)
  const resolves = (g: InteractiveGame, id: string): boolean =>
    (g as unknown as { askCandidateResolves: (s: GameState, id: string) => boolean })
      .askCandidateResolves(curState(g), id)
  const targetAsk = (ids: readonly string[]): Any => ({
    itemId: 'play:ghost', controller: P1, key: 'GHOST:tgt', prompt: '选择目标',
    stage: 'confirm', isTarget: true, candidates: ids.map((id) => ({ id, label: id })),
  })

  test('候选非空但无一在场 ⇒ noRealTarget;对照有真候选 ⇒ ok', () => {
    const g = game(scene([obj('real', 'BLK', P1, BF0)]))
    const ghost = targetAsk(['ghostA', 'ghostB'])
    const live = targetAsk(['real'])
                          
    expect(ghost.candidates.length, '★候选非空(③ 只对「候选非空却无真候选」生效,不是 empty)').toBeGreaterThan(0)
    expect(ghost.candidates.map((c: Any) => String(c.id)).filter((id: string) => resolves(g, id)),
      '★③ 前提:无一候选解得出一件此刻在场者').toEqual([])
    expect(live.candidates.map((c: Any) => String(c.id)).filter((id: string) => resolves(g, id)),
      '★对照前提:real 解得出一件此刻在场者').toEqual(['real'])
                  
    expect(gateReason(g, ghost).kind, '★★③ noRealTarget:目标问候选非空但无一在场 ⇒ 问不出').toBe('noRealTarget')
                                                     
    expect(gateReason(g, live).kind, '★对照:候选解得出一件在场者 ⇒ ok').toBe('ok')
  })
})

                                                          
                                                                                                                    
                                                  
                                                 
             
