import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { InteractiveAction, InteractiveDeps } from '../../src/session/interactiveGame'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { resolveCostChoices, costChoiceVariants } from '../../src/game/costPipeline'
import {
  activeTriggers, cardCost, cardDomains, cardKeywords, cardKind, costModsFor, handPlaySpecs, playSpecFor,
} from '../../data/registry'
import { jayceGearCostMods } from '../../data/cards/jayce-gear'

                                         
                                                                       
                                                               
                                                        
                                                      
                                   
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const CHEAP = 'SFD-150'              
const RICH = 'OGN-098'               

function obj(oid: string, defId: string, ctrl = P1, zone = `hand:${P1}`, types: readonly string[] = ['equipment']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 0, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  }
}
const rune = (oid: string, ctrl = P1): GameObject =>
  ({ ...obj(oid, 'rune:blue', ctrl, `base:${ctrl}`, ['rune']) } as GameObject)
function scene(objs: GameObject[], grants = 1): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    gearManaFreeThisTurn: { [P1 as string]: grants } } as GameState
}
const deps: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, cardDomains, costModsFor, playSpecFor,
}
const grantsOf = (s: GameState): number => s.gearManaFreeThisTurn?.[P1 as string] ?? 0
const tappedRunes = (s: GameState): number =>
  Object.values(s.objects).filter((o) => (o.defId as string).startsWith('rune:') && o.owner === P1 && o.status.tapped === true).length

describe('🔴★★★★mod 形状:用/不用二选一', () => {
  test('🔴★★★带 alt;variants 两个;resolveCostChoices 按编码定形', () => {
    const s = scene([obj('g', CHEAP)])
    const mods = jayceGearCostMods(s, P1, CHEAP, { fromZone: 'hand' })
    expect(mods).toHaveLength(1)
    expect(mods[0]!.kind).toBe('zero')
    expect(mods[0]!.alt, '「不用」档在').toBeDefined()
    expect(costChoiceVariants(mods)).toEqual(['0', '1'])
    const use = resolveCostChoices(mods, '0')
    expect(use[0]!.kind, '选 0 = 用(免法力)').toBe('zero')
    const skip = resolveCostChoices(mods, '1')
    expect(skip[0]!.kind, '选 1 = 不用(reduce 0 = 原价)').toBe('reduce')
    expect(skip[0]!.mana).toBe(0)
  })
})

describe('🔴★★★★★端到端:留着免费打后面那件(收窄解除的正题)', () => {
  test('🔴★★★★枚举出两个变体;选不用 ⇒ 原价+账不动;选用 ⇒ 免费+扣账', () => {
    const g = new InteractiveGame(scene([
      obj('g1', CHEAP), obj('g2', RICH),
      rune('r1'), rune('r2'), rune('r3'), rune('r4'), rune('r5'), rune('r6'),
    ]), deps)
    const acts = g.legalActions(P1).filter((a: InteractiveAction) =>
      a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'g1')
    const choices = acts.map((a) => (a as { costChoice?: string }).costChoice ?? '')
    expect(new Set(choices).size, '同一件装备两个费用变体').toBeGreaterThanOrEqual(2)

                                      
    const skipAct = acts.find((a) => (a as { costChoice?: string }).costChoice === '1')!
    expect(skipAct, '「不用」变体在').toBeDefined()
    g.apply(skipAct)
    expect(tappedRunes(g.state), '原价付了 3 法力(横 3)').toBe(3)
    expect(grantsOf(g.state), '★账没动 —— 免费留下来了').toBe(1)

                                          
    for (let i = 0; i < 10 && g.pending().mode === 'window'; i++) {
      g.apply({ kind: 'PASS', player: (g.pending() as { player: typeof P1 }).player })
    }
                                     
    const acts2 = g.legalActions(P1).filter((a: InteractiveAction) =>
      a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'g2')
    const useAct = acts2.find((a) => (a as { costChoice?: string }).costChoice !== '1')!
    expect(useAct, '「用」变体在').toBeDefined()
    g.apply(useAct)
    expect(tappedRunes(g.state), '★免法力:横置数没涨').toBe(3)
    expect(grantsOf(g.state), '账这次才扣').toBe(0)
  })

  test('★回归:不带 costChoice(缺省=主形态)⇒ 421 老行为(免费+扣账)', () => {
    const g = new InteractiveGame(scene([
      obj('g1', CHEAP), rune('r1'), rune('r2'), rune('r3'), rune('r4'),
    ]), deps)
    const act = g.legalActions(P1).find((a: InteractiveAction) =>
      a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'g1'
      && ((a as { costChoice?: string }).costChoice ?? '') !== '1')!
    g.apply(act)
    expect(tappedRunes(g.state), '免法力').toBe(0)
    expect(grantsOf(g.state), '扣账').toBe(0)
  })

  test('★不合格的装备(无账)没有变体、原价付', () => {
    const g = new InteractiveGame({ ...scene([obj('g1', CHEAP), rune('r1'), rune('r2'), rune('r3')], 0) } as GameState, deps)
    const acts = g.legalActions(P1).filter((a: InteractiveAction) =>
      a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'g1')
    expect(acts.every((a) => ((a as { costChoice?: string }).costChoice ?? '') === ''), '无账 ⇒ 无变体').toBe(true)
    g.apply(acts[0]!)
    expect(tappedRunes(g.state), '原价').toBe(3)
  })
})
