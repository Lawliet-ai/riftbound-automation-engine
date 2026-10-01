import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'

                                  
  
                                                             
                                             
                                                      
                                                            
                                                                          
               
                                             
                        

const P1 = asPlayerId('P1'), P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string

                                  
function scene(): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (oid: string, owner: typeof P1, zone: string): void => {
    objects[oid] = {
      oid: asObjId(oid), defId: 'U-A', owner, controller: owner, zone: asZoneId(zone),
      baseMight: 2, baseKeywords: [], baseTypes: ['unit'] as never, damage: 0, counters: {}, status: {},
    } as GameObject
    const z = zones[zone]!
    zones[zone] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  put('victim', P2, BF)
  for (let i = 0; i < 4; i++) put(`d${i}`, P2, `mainDeck:${P2}`)
  return { ...base, objects, zones } as unknown as GameState
}
const DESTROY_THEN_DRAW = (): GameEvent[] => [
  { kind: 'destroy', target: asObjId('victim'), sourcePlayer: P1 } as GameEvent,
  { kind: 'drawForDestroyVictim', victim: asObjId('victim'), player: P2, count: 2, victimOwner: P2, victimDefId: 'U-A' } as unknown as GameEvent,
]

describe('★★★★★★★ ★1031 嵌套落地的抽牌也要进战报', () => {
  test('🔴前提自证:这两条事件真的让 P2 抽了 2 张', () => {
    const { state } = applyEvents(scene(), DESTROY_THEN_DRAW(), {})
    expect(state.zones[`hand:${P2}`]?.contents.length, '★P2 手牌 0→2').toBe(2)
    expect(state.objects[asObjId('victim')], '★目标已不在(跨区换 oid)').toBeUndefined()
  })

  test('🔴🔴承重:战报旁路能看到那次 draw(player=P2, count=2)', () => {
    const seen: GameEvent[] = []
    applyEvents(scene(), DESTROY_THEN_DRAW(), { onEvent: (ev) => { seen.push(ev) } })
    const draws = seen.filter((e) => e.kind === 'draw') as { player: string; count: number }[]
    expect(draws.length, '★修之前这里是 0 —— 嵌套落地不经过 applyEvents 的循环').toBe(1)
    expect(draws[0]?.player).toBe(P2)
    expect(draws[0]?.count).toBe(2)
  })

  test('🔴下界:顶层 draw 事件不许被记两遍', () => {
    const seen: GameEvent[] = []
    applyEvents(scene(), [{ kind: 'draw', player: P2, count: 1 } as GameEvent], { onEvent: (ev) => { seen.push(ev) } })
    expect(seen.filter((e) => e.kind === 'draw').length, '★顶层的 reduce 已经记过,落地层不许再记').toBe(1)
  })

  test('🔴下界:分支③(受害者被送去非场地区)不抽也不记', () => {
                                                                     
    const s0 = scene()
    const v = s0.objects[asObjId('victim')]!
    const exile = `exile:${P2}`
    const s = {
      ...s0,
      objects: { ...s0.objects, victim: { ...v, zone: asZoneId(exile) } },
      zones: {
        ...s0.zones,
        [BF]: { ...s0.zones[BF]!, contents: s0.zones[BF]!.contents.filter((x) => String(x) !== 'victim') },
        [exile]: { ...s0.zones[exile]!, contents: [...s0.zones[exile]!.contents, asObjId('victim') as ObjId] },
      },
    } as GameState
    const seen: GameEvent[] = []
    const { state } = applyEvents(s, [DESTROY_THEN_DRAW()[1]!], { onEvent: (ev) => { seen.push(ev) } })
    expect(state.zones[`hand:${P2}`]?.contents.length, '★没抽').toBe(0)
    expect(seen.filter((e) => e.kind === 'draw').length, '★也没记').toBe(0)
  })
})
