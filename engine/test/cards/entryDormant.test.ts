import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor } from '../../data/registry'

                                                    
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function handCard(oid: string, defId: string): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 9, runes: { orange: 5 } } },
  }
}
const baseDeps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }

describe('§149.1 装备默认活跃进场;卡文写「以休眠状态进场」才横置落地', () => {
  test('data 层判据认得 VEN-075、不认别的装备', () => {
    const st = scene([])
    expect(entryDormantFor(st, P1, 'VEN-075')).toBe(true)
    expect(entryDormantFor(st, P1, 'OGN-101')).toBe(false)            
  })

  test('★接上通道 → 剑头蛟的卵打出后是【横置】的', () => {
    const g = new InteractiveGame(scene([handCard('e', 'VEN-075')]), { ...baseDeps, entryDormantFor })
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'e')
    expect(play).toBeDefined()
    g.apply(play!)
    const placed = Object.values(g.state.objects).find((o) => o.defId === 'VEN-075')!
    expect(placed.status.tapped).toBe(true)
  })

  test('对照:普通装备打出后是活跃的(§149.1)', () => {
    const g = new InteractiveGame(scene([handCard('m', 'OGN-101')]), { ...baseDeps, entryDormantFor })
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'm')
    if (play) {
      g.apply(play)
      const placed = Object.values(g.state.objects).find((o) => o.defId === 'OGN-101')!
      expect(placed.status.tapped).not.toBe(true)
    }
  })

  test('★不提供 entryDormantFor ⇒ 通道关闭,行为与接线前一致(仍活跃进场)', () => {
    const g = new InteractiveGame(scene([handCard('e', 'VEN-075')]), baseDeps)
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'e')
    if (play) {
      g.apply(play)
      const placed = Object.values(g.state.objects).find((o) => o.defId === 'VEN-075')!
      expect(placed.status.tapped).not.toBe(true)
    }
  })
})
