import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { isEmpowered } from '../../src/keywords/empower'
import { melBanishCandidates } from '../../data/cards/VEN-110'

                                       
                                                             
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function mel(oid = 'm', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-110')
  return {
    oid: asObjId(oid), defId: 'VEN-110', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
                                                      
function inHand(oid: string, defId: string): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {},
  }
}
function enemyUnit(oid: string, might: number, zone = BF0): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: P2, controller: P2, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
    runePools: { ...base.runePools, [P1]: { mana: 9, runes: { purple: 5 } } },
  }
}
const realDeps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }
const empowerActs = (g: InteractiveGame): InteractiveAction[] =>
  g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { ability: string }).ability === 'VEN-110:empower')

                                        
const SPELL = 'OGN-047'
const NOT_SPELL = 'OGN-001'

describe('★discardFilter:「弃置一张【法术】牌」不是「弃一张牌」', () => {
  test('先确认这两张真卡的类别没记错(否则下面全测的是假前提)', () => {
    expect(cardKind(SPELL)).toBe('spell')
    expect(cardKind(NOT_SPELL)).not.toBe('spell')
  })

  test('真 registry 出得来梅尔的强化规格', () => {
    expect(activatedFor('VEN-110').some((s) => s.key === 'VEN-110:empower')).toBe(true)
  })

  test('★手上只有【非法术】→ 这条动作根本不出现(不能拿单位顶费用)', () => {
    const g = new InteractiveGame(scene([mel(), inHand('h1', NOT_SPELL)]), realDeps)
    expect(empowerActs(g)).toHaveLength(0)
  })

  test('★手上有法术 → 出得来,且【只列出法术那张】作为弃牌对象', () => {
    const g = new InteractiveGame(
      scene([mel(), inHand('h1', NOT_SPELL), inHand('h2', SPELL), inHand('h3', SPELL)]),
      realDeps,
    )
    const acts = empowerActs(g)
    expect(acts).toHaveLength(2)                  
    const discards = acts.map((a) => (a as { discardOid?: string }).discardOid).sort()
    expect(discards).toEqual(['h2', 'h3'])
  })

  test('手上空空 → 不出现', () => {
    expect(empowerActs(new InteractiveGame(scene([mel()]), realDeps))).toHaveLength(0)
  })

  test('★服务端权威:直接发一张【非法术】当弃牌 → 拒绝执行,盘面一点没动', () => {
    const g = new InteractiveGame(scene([mel(), inHand('h1', NOT_SPELL), inHand('h2', SPELL)]), realDeps)
    const legit = empowerActs(g)[0]!
    const forged = { ...legit, discardOid: 'h1' } as InteractiveAction
    const before = g.state
    g.apply(forged)
    expect(g.state).toBe(before)       
    expect(isEmpowered(g.state.objects['m']!)).toBe(false)
  })

  test('合法弃牌 → 那张法术真的进了弃牌堆,梅尔真的已强化', () => {
    const g = new InteractiveGame(scene([mel(), inHand('h2', SPELL)]), realDeps)
    g.apply(empowerActs(g)[0]!)
    for (let i = 0; i < 12 && g.state.chain.length > 0; i++) {
      for (const p of [P1, P2]) {
        const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
        if (pass) g.apply(pass)
      }
    }
    expect(g.state.zones[`discard:${P1}`]!.contents).toHaveLength(1)
    expect(isEmpowered(g.state.objects['m']!)).toBe(true)
  })
})

describe('★§441.2.a「当我变为已强化时」的放逐候选集', () => {
  test('只收【敌方】单位', () => {
    const friendly: GameObject = { ...enemyUnit('f', 2), owner: P1, controller: P1 }
    const st = scene([mel(), enemyUnit('e', 2), friendly])
    const c = melBanishCandidates(st, P1)
    expect(c).toContain(asObjId('e'))
    expect(c).not.toContain(asObjId('f'))
  })

  test('★「不高于3[S]」是 ≤3:3 收,4 不收', () => {
    const st = scene([mel(), enemyUnit('e3', 3), enemyUnit('e4', 4)])
    const c = melBanishCandidates(st, P1)
    expect(c).toContain(asObjId('e3'))
    expect(c).not.toContain(asObjId('e4'))
  })

  test('★0 力单位也在射程内(§137 引用值下钳 0)', () => {
    const st = scene([mel(), enemyUnit('e0', 0)])
    expect(melBanishCandidates(st, P1)).toContain(asObjId('e0'))
  })

  test('★「战场上」排除基地(§107.1 基地不是战场)', () => {
    const st = scene([mel(), enemyUnit('eb', 2, `base:${P2}`)])
    expect(melBanishCandidates(st, P1)).not.toContain(asObjId('eb'))
  })

  test('真 registry 收得到这条触发(字段是 sourceOid)', () => {
    const st = scene([mel(), enemyUnit('e', 2)])
    expect(activeTriggers(st).some((t) => t.sourceOid === asObjId('m'))).toBe(true)
  })
})
