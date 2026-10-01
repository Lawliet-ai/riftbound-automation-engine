import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { InteractiveAction, InteractiveDeps } from '../../src/session/interactiveGame'
import { InteractiveGame } from '../../src/session/interactiveGame'
import {
  activeTriggers, cardCost, cardDomains, cardKeywords, cardKind, costModsFor, handPlaySpecs, playSpecFor,
} from '../../data/registry'
import { VANILLA_UNITS } from '../../data/vanillaUnits'

                                                             
                                      
                                        
                                                        
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SHEN = 'OGN-241'                                 

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might = 3): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
                                                                                
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
                                                     
  const runes = [
    ...Array.from({ length: 8 }, (_, i) =>
      ({ ...unit(`ru${i}`, 'rune:yellow', P1, `base:${P1}`), baseTypes: ['rune'] as never })),
    ...Array.from({ length: 8 }, (_, i) =>
      ({ ...unit(`rb${i}`, 'rune:blue', P2, `base:${P2}`), baseTypes: ['rune'] as never })),
  ]
  for (const o of [...objs, ...runes]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const deps: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, cardDomains, costModsFor, playSpecFor,
}
                             
const starter = (): GameObject => unit('starter', 'SFD-087', P2, `hand:${P2}`, 0)

                                                 
function windowDestsOf(objs: GameObject[], oid: string): { g: InteractiveGame; dests: string[] } {
  const g = new InteractiveGame(scene([...objs, starter()]), deps)
  g.state = { ...g.state, activePlayer: P2 }
  const cast = g.legalActions(P2).find((a: InteractiveAction) => a.kind === 'PLAY_CARD')!
  expect(cast, '前提自证:对手起得了链').toBeDefined()
  g.apply(cast)
  g.apply({ kind: 'PASS', player: P2 })
  expect(g.pending().mode, '前提自证:P1 拿到了反应窗口').toBe('window')
  const dests = g.legalActions(P1)
    .filter((a: InteractiveAction) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === oid)
    .map((a) => (a as { to: string }).to)
    .sort()
  return { g, dests }
}

describe('★ 前提:慎在香草表里、关键词回落链通', () => {
  test('生成器收录 + cardKeywords 回落', () => {
    expect(VANILLA_UNITS[SHEN]).toBeDefined()
    expect(VANILLA_UNITS[SHEN]!.keywords).toEqual(['反应', '坚守2', '壁垒'])
    expect(cardKeywords(SHEN), '印刷表回落到 VANILLA_UNITS').toEqual(['反应', '坚守2', '壁垒'])
    expect(cardKind(SHEN)).toBe('unit')
    expect(cardCost(SHEN), '3费+1黄pip').toEqual({ mana: 3, pips: [['yellow']] })
  })
})

describe('🔴★★★★★窗口里打出[反应]单位(端到端)', () => {
  test('🔴★★★落点 = §813.3.a 基地 + 我控制的战场(BF1 只有我的单位 ⇒ 我控制;BF0 敌控 ⇒ 不行)', () => {
    const { dests } = windowDestsOf(
      [unit('shen', SHEN, P1, `hand:${P1}`), unit('foe', 'BLK', P2, BF0), unit('mine', 'BLK', P1, BF1)],
      'shen',
    )
    expect(dests).toEqual([`base:${P1}`, BF1])
  })

  test('🔴★★对照:同盘面不带[反应]的单位一处都列不出(通道只认那个词)', () => {
    const { dests } = windowDestsOf(
      [unit('plain', 'OGN-049', P1, `hand:${P1}`), unit('mine', 'BLK', P1, BF1)],
      'plain', // 贪玩的小鬼:无关键词香草
    )
    expect(dests).toEqual([])
  })

  test('🔴★★★★点下去真落地:窗口里打出慎,它真的站上基地(apply 门放行)', () => {
    const { g } = windowDestsOf([unit('shen', SHEN, P1, `hand:${P1}`)], 'shen')
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'shen', to: `base:${P1}` })
    const shen = Object.values(g.state.objects).find((o) => o.defId === SHEN)!
    expect(shen, '落地了(§124.1 换新 oid,按 defId 认)').toBeDefined()
    expect(g.state.zones[shen.zone]?.kind, '站在基地').toBe('base')
    expect(shen.controller).toBe(P1)
  })

  test('★没有控制的战场时只列基地', () => {
    const { dests } = windowDestsOf(
      [unit('shen', SHEN, P1, `hand:${P1}`), unit('foe', 'BLK', P2, BF0)],
      'shen',
    )
    expect(dests).toEqual([`base:${P1}`])
  })

  test('★付不起就列不出(付费闸照常)', () => {
                              
    const base = createInitialState([P1, P2], 2)
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
                                                 
    for (const o of [unit('shen', SHEN, P1, `hand:${P1}`), starter(),
      ...Array.from({ length: 8 }, (_, i) =>
        ({ ...unit(`fr${i}`, 'rune:blue', P2, `base:${P2}`), baseTypes: ['rune'] as never } as GameObject))]) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    const s = { ...base, activePlayer: P2, objects, zones } as GameState
    const g = new InteractiveGame(s, deps)
    const cast = g.legalActions(P2).find((a: InteractiveAction) => a.kind === 'PLAY_CARD')!
    g.apply(cast)
    g.apply({ kind: 'PASS', player: P2 })
    const dests = g.legalActions(P1)
      .filter((a: InteractiveAction) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'shen')
    expect(dests, 'P1 没符文付 3+1pip ⇒ 一条都不列').toEqual([])
  })

  test('🔴★★通道只收【单位】:带[反应]的装备走不进这条(装备的反应权限另有其人)', () => {
                                                  
                                                 
                                                                
    const kwWithReactionGear = (d: string): readonly string[] =>
      (d === 'SFD-150' ? ['反应'] : cardKeywords(d))
    const g = new InteractiveGame(scene([
      { ...unit('gear', 'SFD-150', P1, `hand:${P1}`), baseTypes: ['equipment'] as never } as GameObject,
      starter(),
    ]), { ...deps, cardKeywords: kwWithReactionGear })
    g.state = { ...g.state, activePlayer: P2 }
    const cast = g.legalActions(P2).find((a: InteractiveAction) => a.kind === 'PLAY_CARD')!
    g.apply(cast)
    g.apply({ kind: 'PASS', player: P2 })
    const acts = g.legalActions(P1)
      .filter((a: InteractiveAction) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'gear')
    expect(acts, '装备不走反应单位通道').toEqual([])
  })

  test('★主阶段照常打(反应只加时机不减时机,§813.2)', () => {
    const g = new InteractiveGame(scene([unit('shen', SHEN, P1, `hand:${P1}`)]), deps)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'shen')
    expect(acts.length, '主阶段照常列得出').toBeGreaterThan(0)
  })
})
