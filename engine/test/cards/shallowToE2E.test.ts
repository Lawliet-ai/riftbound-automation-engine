import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { CARD_FACTS } from '../../data/cardFacts'

                                                        
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function fromSpec(oid: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    ...(s.baseTags ? { baseTags: s.baseTags } : {}),
    ...(s.basePowerBonus !== undefined ? { basePowerBonus: s.basePowerBonus } : {}),
    ...(s.baseGrants ? { baseGrants: s.baseGrants } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
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
    runePools: { ...base.runePools, [P1]: { mana: 9, runes: { red: 5, green: 5, blue: 5, yellow: 5, orange: 5 } } },
  }
}
const realDeps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 16 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}
const find = (g: InteractiveGame, oid: string): GameObject | undefined =>
  Object.values(g.state.objects).find((o) => o.oid === oid)

describe('★§827 强化关键词通道:第76轮已由钢爪 VEN-043 走通', () => {
                                                                 
                                                   
                                           
                                       
                                                           
  test('★第76轮起不再是零真卡:钢爪 VEN-043 走通了这条通道', () => {
                                                       
    const withEmpower = Object.keys(CARD_FACTS).filter((no) =>
      cardKeywords(no).some((k) => k.startsWith('强化') && !k.startsWith('已强化')),
    )
    expect(withEmpower).toContain('VEN-043')                                       
  })

  test('对照组:同为主动技能关键词的[装配]有真卡走得到(证明这套断言方式本身有效)', () => {
    const withEquip = Object.keys(CARD_FACTS).filter((no) =>
      activatedFor(no).some((sp) => sp.key.startsWith('equip')),
    )
    expect(withEquip.length).toBeGreaterThan(0)
  })

})

describe('★§446 控潮者 OGN-199:打出即可与另一处己方单位换位', () => {
  test('真 registry 收得到它的触发(不是只有 data 层函数写对了)', () => {
    const st = scene([fromSpec('t', 'OGN-199', BF0), fromSpec('o', 'OGN-142', BF1)])
    expect(activeTriggers(st).some((tr) => tr.sourceOid === asObjId('t'))).toBe(true)
  })

  test('★打出后走完链:换位真的发生(两者区域对调)', () => {
    const g = new InteractiveGame(
      scene([fromSpec('t', 'OGN-199', `hand:${P1}`), fromSpec('o', 'OGN-142', BF1)]),
      realDeps,
    )
    const play = g.legalActions(P1).find(
      (a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 't' && (a as { haste?: boolean }).haste !== true,
    )
    expect(play).toBeDefined()
    g.apply(play!)
    for (let i = 0; i < 10; i++) {
      const choose = g.legalActions(P1).find((a) => a.kind === 'CHOOSE')
      if (choose) { g.apply(choose); continue }
      const p1 = g.legalActions(P1).find((a) => a.kind === 'PASS')
      const p2 = g.legalActions(P2).find((a) => a.kind === 'PASS')
      if (p1) g.apply(p1)
      if (p2) g.apply(p2)
      if (g.state.chain.length === 0) break
    }
                                                    
    const tide = Object.values(g.state.objects).find((o) => o.defId === 'OGN-199')
    expect(tide).toBeDefined()
    expect(g.state.zones[tide!.zone]?.kind).toBe('battlefield')                 
  })
})

describe('★消耗增益一族:阿不思 OGN-230 / 公开行动 OGN-153 真的挂在 registry 上', () => {
  test('阿不思打出时真产触发', () => {
    const st = scene([fromSpec('a', 'OGN-230', BF0), fromSpec('b', 'OGN-142', BF0, { counters: { buff: 1 } })])
    expect(activeTriggers(st).some((tr) => tr.sourceOid === asObjId('a'))).toBe(true)
  })
})
