import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'

                                                         
                                                     
                                                                
                                                                             
                                                      
  
                                                        
                                                                    
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const u: GameObject = {
    oid: asObjId('u'), defId: 'U-x', owner: P1, controller: P1,
    zone: asZoneId(`exile:${P1}`), baseMight: 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  } as GameObject
  const ex = base.zones[`exile:${P1}` as never]!
  return { ...base, activePlayer: P1, phase: 'main',
    objects: { u },
    zones: { ...base.zones, [`exile:${P1}` as never]: { ...ex, contents: [asObjId('u')] } } } as GameState
}

describe('★★★★★★★ ★743 playFree 派生打出信号', () => {
  test('★★★★★★①②放逐区 playFree 到战场 ⇒ 触发系统看见 playUnit(fromZoneKind=exile、新 oid)', () => {
    const s = scene()
    const seen: { kind: string, unit?: string, fromZoneKind?: string }[] = []
    const deps = {
      getTriggers: () => [],
      onEvent: undefined,
    } as never
                                                          
    const r = applyEvents(s, [{ kind: 'playFree', obj: asObjId('u'), player: P1, to: asZoneId(BF0) } as unknown as GameEvent], deps)
    const landed = (r as unknown as { events?: readonly { kind: string, unit?: string, fromZoneKind?: string }[] }).events ?? []
    const pu = landed.find((e) => e.kind === 'playUnit')
    expect(pu, '★★派生信号出现(修前=零信号,「打出时」全族不响)').toBeDefined()
    expect(pu!.fromZoneKind, '★①来源真读=exile(狂暴之心「手牌以外」判据吃它)').toBe('exile')
    const landedUnit = r.state.zones[BF0 as never]!.contents[0]
    expect(pu!.unit, '★②新 oid(§124 跨界换号,subjectIsSelf 对得上)').toBe(landedUnit)
    void seen
  })

  test('★★★★★④牌不在 ⇒ 不派生;③playUnit 主事件路无双发(一条 playUnit 进 landed 只一次)', () => {
    const s = scene()
    const gone = applyEvents(s, [{ kind: 'playFree', obj: asObjId('nope'), player: P1, to: asZoneId(BF0) } as unknown as GameEvent], {} as never)
    const landedGone = (gone as unknown as { events?: readonly { kind: string }[] }).events ?? []
    expect(landedGone.filter((e) => e.kind === 'playUnit'), '★④防御档').toHaveLength(0)
                                           
    const sig = applyEvents(s, [{ kind: 'playUnit', unit: asObjId('u'), player: P1 } as unknown as GameEvent], {} as never)
    const landedSig = (sig as unknown as { events?: readonly { kind: string }[] }).events ?? []
    expect(landedSig.filter((e) => e.kind === 'playUnit'), '★③无双发').toHaveLength(1)
  })
})
