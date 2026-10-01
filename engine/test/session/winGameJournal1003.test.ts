import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { makeRng } from '../../src/util/rng'

installProviders()

                                                 
  
                                                                          
                                                                        
                                     
                                              
                                                                     
                                               
                                                 
                                                                
  
                                                            
                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const deps = makeGameDeps(1) as InteractiveDeps

                                                                 
function scene(handCount: number): InteractiveGame {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const add = (oid: string, defId: string, zone: string, types: string[]): void => {
    const o = {
      oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
      baseMight: 1, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
    } as GameObject
    objects[oid] = o
    const z = zones[zone]
    if (z) zones[zone] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  add('u1', 'U-A', bfs[0]!, ['unit'])
  add('u2', 'U-B', bfs[0]!, ['unit'])
  add('u3', 'U-C', bfs[1]!, ['unit'])
  add('u4', 'U-D', bfs[1]!, ['unit'])
  add('palace', 'UNL-088', `base:${P1}`, ['gear'])
  for (let i = 1; i <= handCount; i++) add(`h${i}`, 'U-H', `hand:${P1}`, ['unit'])
  const s = { ...base, activePlayer: P2, phase: 'main', objects, zones, rng: makeRng(7) } as GameState
  return new InteractiveGame(s, deps)
}
const winKinds = (g: InteractiveGame): string[] =>
  g.journal.projectFor(P1).filter((e) => e.kind === 'winGame').map((e) => (e as { player?: string }).player ?? '?')

describe('★★★★★★★ ★1003 判胜要留战报(除了认输,原来一条都不记)', () => {
  test('前提:动手之前既没有胜者,战报里也没有 winGame', () => {
    const g = scene(4)
    expect(g.state.winner, '前提自证:还没开始').toBe(null)
    expect(winKinds(g), '前提自证:战报干净').toEqual([])
  })

  test('🔴§195 效果指示获胜(倾颓宫殿)⇒ 战报记一条 winGame', () => {
    const g = scene(4)
    g.apply({ kind: 'END_TURN', player: P2 })
    expect(g.state.winner, '谓词满足 ⇒ P1 获胜').toBe(P1)
    expect(winKinds(g), '★战报里恰好一条,且是 P1').toEqual([P1 as string])
  })

  test('🔴§194.2 分数判胜 ⇒ 战报同样记一条(修之前这条也漏)', () => {
    const g = scene(3)                          
    g.apply({ kind: 'END_TURN', player: P2 })
    expect(g.state.winner, '前提自证:这一局确实靠分数分出了胜负').toBe(P2)
    expect(winKinds(g), '★战报里恰好一条,且是 P2').toEqual([P2 as string])
  })

  test('放开侧:认输也只记【一条】(CONCEDE 里原来那句已删,不能记两条)', () => {
    const g = scene(3)
    g.apply({ kind: 'CONCEDE', player: P1 })
    expect(g.state.winner, '§651.1 1v1 认输 ⇒ 对手获胜').toBe(P2)
    expect(winKinds(g), '★恰好一条 —— 重复记会变成两条').toEqual([P2 as string])
  })
})
