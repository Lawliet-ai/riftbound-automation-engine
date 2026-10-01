import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { addMana, emptyRunePool } from '../../src/state/runePool'
import { seedRunes } from '../../src/game/economy'
import { installProviders, makeGameDeps } from '../../data/gameDeps'

                                                      
  
                                                  
                         
                                                          
                                                 
                                            
  
                                                   
                                     
                                                      
            
  
                                                                      

installProviders()
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const sp = (specLookup(defId) ?? {}) as Partial<GameObject>
  return {
    ...sp, oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: sp.baseMight ?? 3, baseKeywords: sp.baseKeywords ?? [], baseTypes: sp.baseTypes ?? ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
const blank = (o: string, c: typeof P1, z: string, m: number): GameObject =>
  obj(o, 'OGN-175', c, z, { baseMight: m })
const mkDeps = (): InteractiveDeps => makeGameDeps(939) as InteractiveDeps

                                                          
function scene(withFlash: boolean): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(obj('void', 'OGN-024', P1, `hand:${P1}`))
  if (withFlash) put(obj('flash', 'OGS-011', P2, `hand:${P2}`))
  put(blank('prey', P2, BF1, 9))                                   
  for (const p of [P1, P2]) {
    put(blank(`d1${String(p)}`, p, `mainDeck:${p}`, 3))
    put(blank(`d2${String(p)}`, p, `mainDeck:${p}`, 3))
  }
  let st: GameState = { ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: addMana(emptyRunePool(), 9), [P2]: addMana(emptyRunePool(), 9) } }
  st = seedRunes(st as never, P1 as never, 'red', 3) as never                    
  st = seedRunes(st as never, P2 as never, 'blue', 3) as never
  return st
}

                             
function settle(g: InteractiveGame, cap = 60): void {
  for (let i = 0; i < cap; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') break
    if (p.mode === 'choice') {
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id } as InteractiveAction)
      continue
    }
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: (p as { player: typeof P1 }).player } as InteractiveAction)
  }
}
const handSize = (g: InteractiveGame, p: typeof P1): number =>
  g.state.zones[`hand:${p}` as never]?.contents.length ?? 0

describe('★939 §359.3.e 目标中途失效(规则原文举例:虚空索敌 × 闪现)', () => {
  test('前提:两张卡都打得出来', () => {
                                                                      
                                                                      
                                                           
    const g = new InteractiveGame(scene(true), mkDeps())
    expect(g.legalActions(P1).some((a) => (a as { cardOid?: string }).cardOid === 'void'), '虚空索敌打得出').toBe(true)
    g.apply(g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'void')!)
    g.apply({ kind: 'PASS', player: P1 })
    expect(g.legalActions(P2).some((a) => (a as { cardOid?: string }).cardOid === 'flash'), '闪现反应得了').toBe(true)
  })

  test('🔒基准:没人反应时,虚空索敌照常打 4 点并抽 1', () => {
    const g = new InteractiveGame(scene(false), mkDeps())
    const before = handSize(g, P1)
    const play = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'void' && (a as { target?: string }).target === 'prey')
    expect(play, '前提:能以 prey 为目标打出').toBeDefined()
    g.apply(play!)
    settle(g)
    expect(g.state.objects['prey']?.damage, '目标还在战场 ⇒ 吃满 4 点').toBe(4)
                                 
    expect(handSize(g, P1), '打出一张、抽回一张').toBe(before)
  })

  test('★★★目标被闪现撤回基地 ⇒ 伤害不发生,但【抽牌照常】(§359.3.e.5 原文举例)', () => {
    const g = new InteractiveGame(scene(true), mkDeps())
    const before = handSize(g, P1)
    const play = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'void' && (a as { target?: string }).target === 'prey')
    g.apply(play!)
    expect(g.state.chain.length, '法术上链等待结算').toBeGreaterThan(0)
                                            
    g.apply({ kind: 'PASS', player: P1 })
    const flash = g.legalActions(P2).find((a) => (a as { cardOid?: string }).cardOid === 'flash')
    expect(flash, '前提:闪现能作为反应打出').toBeDefined()
    g.apply(flash!)
    settle(g)

    expect(String(g.state.objects['prey']?.zone), '闪现把它撤回了基地').toBe(`base:${P2}`)
    expect(g.state.objects['prey']?.damage ?? 0, '★不再是合法目标 ⇒ 一点伤害都不该吃').toBe(0)
    expect(handSize(g, P1), '★但与目标无关的「抽一张牌」照常执行 ⇒ 手牌净持平').toBe(before)
  })

  test('🔒反面:不是"整个法术被吞掉" —— 抽牌那条指示必须真的跑过', () => {
                                                
    const g = new InteractiveGame(scene(true), mkDeps())
    const deckBefore = g.state.zones[`mainDeck:${P1}` as never]?.contents.length ?? 0
    const play = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'void' && (a as { target?: string }).target === 'prey')
    g.apply(play!)
    g.apply({ kind: 'PASS', player: P1 })
    const flash = g.legalActions(P2).find((a) => (a as { cardOid?: string }).cardOid === 'flash')
    g.apply(flash!)
    settle(g)
    const deckAfter = g.state.zones[`mainDeck:${P1}` as never]?.contents.length ?? 0
    expect(deckBefore - deckAfter, '牌堆真的少了一张 = 抽牌指示执行过').toBe(1)
  })
})
