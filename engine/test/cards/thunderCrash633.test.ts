import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { computeCost } from '../../src/game/costPipeline'
import { thunderCrashCostMods } from '../../data/cards/cost-modifiers'
import { costModsFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'

                                                                 
                                                 
                                                            
  
           
                                                    
                                   
                                                            
                                         
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(id: string, zone: string, ctrl: PlayerId, might: number, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}

const PRINTED = { mana: 8, pips: [['red']] as readonly (readonly string[])[] }

describe('★633 霹天雳地:法力费用减己方最高战力', () => {
  test('★★★★★前提:上游 8费 1红pip;别的卡一条都不出', () => {
    expect(CARD_COSTS['OGN-014']).toEqual({ mana: 8, pips: 1, colors: ['red'] })
    const s = scene(unit('a', BF0, P1, 4))
    expect(thunderCrashCostMods(s, P1, 'OGN-009'), '★defId 不对 ⇒ 空').toEqual([])
  })

  test('★★★★★★②含基地 + 敌方不算:基地里 5 战力是我最高;敌方 9 战力不掺和', () => {
    const s = scene(
      unit('bf', BF0, P1, 3),
      unit('home', `base:${P1}`, P1, 5), // ★「所控制单位」没有位置词 ⇒ 基地里的也算
      unit('foe', BF0, P2, 9), // ★敌方最高 9 —— 掺和进来的话会减成 9
    )
    const mods = thunderCrashCostMods(s, P1, 'OGN-014')
    expect(mods).toHaveLength(1)
    expect(mods[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana: 5, floor: 0 })
                        
    expect(computeCost(PRINTED, mods)).toEqual({ mana: 3, pips: [['red']] })
  })

  test('★★★★★★③「最高战力值」= 引用值:derived.might 抬到 7 ⇒ 按 7 减(不是 baseMight 2)', () => {
    const boosted = unit('b', BF0, P1, 2, {
      derived: { might: 7, keywords: [] },
    } as unknown as Partial<GameObject>)
    const mods = thunderCrashCostMods(scene(boosted), P1, 'OGN-014')
    expect(mods[0], '★读 baseMight 会算成 2').toMatchObject({ mana: 7 })
  })

  test('★★★★★④没有单位 ⇒ 空(一条都不发);战力 ≥8 ⇒ 减到 0 不变负', () => {
    expect(thunderCrashCostMods(scene(), P1, 'OGN-014')).toEqual([])
    const s = scene(unit('big', BF0, P1, 12))
    expect(computeCost(PRINTED, thunderCrashCostMods(s, P1, 'OGN-014')))
      .toEqual({ mana: 0, pips: [['red']] })
  })

  test('★★★★★⑤接线:costModsFor 汇总口拿到同一条(付费管线真吃得到)', () => {
    const s = scene(unit('a', BF0, P1, 4))
    const viaHub = costModsFor(s, P1, 'OGN-014').filter((m) => (m as { source?: string }).source?.includes('OGN-014'))
    expect(viaHub).toHaveLength(1)
    expect(viaHub[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana: 4 })
  })
})
