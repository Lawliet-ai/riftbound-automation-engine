import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind } from '../../data/registry'
import { attachCard } from '../../src/state/attach'
import { recomputeContinuous } from '../../src/effects/continuousView'

                                                     
                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind }

function obj(id: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra }
}
function scene(extra: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
}
const movesOf = (g: InteractiveGame, oid: string): string[] =>
  g.legalActions(P1).filter((a) => a.kind === 'MOVE' && (a as { oid: string }).oid === oid).map((a) => (a as { to: string }).to)

describe('§144.4 标准移动的默认终点', () => {
  test('基地上的单位:只能去战场(144.4.a)', () => {
    const g = new InteractiveGame(scene([obj('u', P1, `base:${P1}`)]), DEPS)
    expect(movesOf(g, 'u').sort()).toEqual([BF0, BF1])
  })

  test('战场上的普通单位:只能回所属基地(144.4.b),【不能】去别的战场', () => {
    const g = new InteractiveGame(scene([obj('u', P1, BF0)]), DEPS)
    expect(movesOf(g, 'u')).toEqual([`base:${P1}`])
  })

  test('处理器同验:硬发战场→战场的 MOVE 被拒(服务端权威)', () => {
    const g = new InteractiveGame(scene([obj('u', P1, BF0)]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'u', to: BF1 })
    expect(g.state.objects['u' as never]!.zone).toBe(BF0)      
    expect(g.state.objects['u' as never]!.status.dormant).not.toBe(true)         
  })
})

describe('§810 [游走]解锁战场→战场', () => {
  test('印刷[游走]的单位可去另一战场', () => {
    const g = new InteractiveGame(scene([obj('u', P1, BF0, { baseKeywords: ['游走'] })]), DEPS)
    expect(movesOf(g, 'u').sort()).toEqual([`base:${P1}`, BF1])
  })

  test('轻灵之靴:贴附授予的[游走]同样解锁(读 derived.keywords)', () => {
    const boots: GameObject = { ...obj('boots', P1, BF0), defId: 'G-boots', baseMight: 0, baseTags: ['武装'], baseTypes: ['equipment'], baseGrants: ['游走'] }
    let s = scene([obj('u', P1, BF0), boots])
    s = recomputeContinuous(attachCard(s, asObjId('boots'), asObjId('u')))
    const g = new InteractiveGame(s, DEPS)
    expect(movesOf(g, 'u')).toContain(BF1)
  })

  test('靴子卸下(换宿主)后,原穿戴者失去权限', () => {
    const boots: GameObject = { ...obj('boots', P1, BF0), defId: 'G-boots', baseMight: 0, baseTags: ['武装'], baseTypes: ['equipment'], baseGrants: ['游走'] }
    let s = scene([obj('u', P1, BF0), obj('v', P1, BF0), boots])
    s = attachCard(s, asObjId('boots'), asObjId('u'))
    s = recomputeContinuous(attachCard(s, asObjId('boots'), asObjId('v')))                 
    const g = new InteractiveGame(s, DEPS)
    expect(movesOf(g, 'u')).not.toContain(BF1)
    expect(movesOf(g, 'v')).toContain(BF1)
  })
})
