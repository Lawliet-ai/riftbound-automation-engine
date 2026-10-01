import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { attachedTo } from '../../src/state/attach'

                                 
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function fromSpec(oid: string, defId: string, zone: string): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    ...(s.baseTags ? { baseTags: s.baseTags } : {}),
    ...(s.basePowerBonus !== undefined ? { basePowerBonus: s.basePowerBonus } : {}),
    ...(s.baseGrants ? { baseGrants: s.baseGrants } : {}),
    damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], mana = 9): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana, runes: { red: 5, yellow: 5, orange: 5 } } },
  }
}
                             
const realDeps = {
  getTriggers: activeTriggers,
  handPlaySpecs: () => [],
  activatedFor, cardCost, cardKeywords, cardKind,
}
const play = (g: InteractiveGame, oid: string): InteractiveAction | undefined =>
  g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === oid && (a as { haste?: boolean }).haste !== true)
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 16 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const a = g.legalActions(p)
      const pass = a.find((x) => x.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}

describe('★§821 百炼:打出真卡 → 触发入链 → 弹出选择', () => {
  test('场上有己方武装 → 打出哨兵好手 SFD-008 后,链上真的多了一条待处理项目', () => {
    const g = new InteractiveGame(
      scene([fromSpec('u', 'SFD-008', `hand:${P1}`), fromSpec('gear', 'SFD-022', `base:${P1}`)]),
      realDeps,
    )
    const act = play(g, 'u')
    expect(act).toBeDefined()               
    g.apply(act!)
                                         
    const pending = g.state.chain.length > 0 || g.legalActions(P1).some((a) => a.kind === 'CHOOSE')
    expect(pending).toBe(true)
  })

  test('★场上没有己方武装 → 不弹空选择(§821.1.c.5 一件都装不起就不问)', () => {
    const g = new InteractiveGame(scene([fromSpec('u', 'SFD-008', `hand:${P1}`)]), realDeps)
    g.apply(play(g, 'u')!)
    settle(g)
    expect(g.state.chain).toHaveLength(0)
  })
})

describe('★§819 灵便:打出真装备 → 打出即贴附', () => {
  test('★场上有己方单位 → 打出长剑 SFD-022 后,它真的贴到了那个单位身上', () => {
    const g = new InteractiveGame(
      scene([fromSpec('sword', 'SFD-022', `hand:${P1}`), fromSpec('unit', 'OGN-142', BF0)]),
      realDeps,
    )
    const act = play(g, 'sword')
    expect(act).toBeDefined()
    g.apply(act!)
                          
    for (let i = 0; i < 8; i++) {
      const choose = g.legalActions(P1).find((a) => a.kind === 'CHOOSE')
      if (choose) { g.apply(choose); continue }
      const pass = g.legalActions(P1).find((a) => a.kind === 'PASS')
      const pass2 = g.legalActions(P2).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
      if (pass2) g.apply(pass2)
      if (g.state.chain.length === 0) break
    }
    const gear = Object.values(g.state.objects).find((o) => o.defId === 'SFD-022')
    expect(gear).toBeDefined()
    expect(attachedTo(gear!)).toBeDefined()                     
  })
})
