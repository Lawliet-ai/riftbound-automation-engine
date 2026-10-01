import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

                           
function drain(g: InteractiveGame): void {
  for (let i = 0; i < 60; i++) {
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') return
    if (p.mode === 'choice') g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
    else g.apply({ kind: 'PASS', player: p.player })
  }
  throw new Error('链未收敛')
}

                                               
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const vegas: GameObject = { oid: asObjId('vegas'), defId: 'UNL-150', owner: P2, controller: P2, zone: asZoneId(BF0), baseMight: 4, baseKeywords: ['法盾'], damage: 0, counters: {}, status: {} }
  const servitor: GameObject = { oid: asObjId('servitor'), defId: 'UNL-081', owner: P1, controller: P1, zone: asZoneId('hand:P1'), baseMight: 1, baseKeywords: ['待命', '瞬息'], damage: 0, counters: {}, status: {} }
  const bz = base.zones[BF0]!, hz = base.zones['hand:P1']!
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main',
    objects: { vegas, servitor },
    zones: { ...base.zones, [BF0]: { ...bz, contents: [asObjId('vegas')] }, 'hand:P1': { ...hz, contents: [asObjId('servitor')] } },
  }
}

describe('#8 结算期事件触发检测(§321.1):赐面守侍打出的映像被对手薇古丝眩晕', () => {
  test('打赐面守侍(薇古丝在场)→ 2映像成复制体且【被薇古丝眩晕】(UNL-150 QA)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')!)
    drain(g)

    const servitor = Object.values(g.state.objects).find((o) => o.defId === 'UNL-081')
    const mz = servitor?.zone ?? BF0
    const mirrors = g.state.zones[mz]!.contents.map((o) => g.state.objects[o]!).filter((o) => o.defId === 'token:映像')
    expect(mirrors).toHaveLength(2)
                        
    for (const m of mirrors) expect(m.derived!.keywords).toContain('待命')
                                              
    for (const m of mirrors) expect(m.status.stunned).toBe(true)
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
  })

  test('无薇古丝时映像不被眩晕(对照)', () => {
    const s = scene()
    const noVegas: GameState = { ...s, objects: { servitor: s.objects['servitor']! }, zones: { ...s.zones, [BF0]: { ...s.zones[BF0]!, contents: [] } } }
    const g = new InteractiveGame(noVegas, DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')!)
    drain(g)
    const servitor = Object.values(g.state.objects).find((o) => o.defId === 'UNL-081')
    const mz = servitor?.zone ?? BF0
    const mirrors = g.state.zones[mz]!.contents.map((o) => g.state.objects[o]!).filter((o) => o.defId === 'token:映像')
    expect(mirrors).toHaveLength(2)
    for (const m of mirrors) expect(m.status.stunned).toBeUndefined()
  })
})
