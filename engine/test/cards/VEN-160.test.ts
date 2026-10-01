import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardCost, cardKeywords, cardKind, costModsFor } from '../../data/registry'
import { openCombat } from '../../src/combat/battle'
import {
  allCostMods, astralSurgeCostMods, ASTRAL_SURGE_PIPS, VEN_160_CARD_EFFECT,
} from '../../data/cards/cost-modifiers'

                                                              
                                            
                                  
  
                 
                                                                    
                                                   
                                                                           
                                                       
                                                
                                                                                        
                                                                    
                                                                       
  
                                                    
                                                                         
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                           
const REACTION_CARD = 'SFD-136'                  
const PLAIN_CARD = 'OGN-050'                     

const unit = (oid: string, zone: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who,
  zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

   
                                                      
                                         
   
function scene(opts: {
  readonly bf0Card?: string
  readonly duelAt?: number
  readonly active?: boolean
} = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const duelOn = opts.active ?? (opts.duelAt !== undefined)
  return {
    ...base,
    activePlayer: P1,
    phase: 'main',
    spellDuelActive: duelOn,
    ...(opts.duelAt !== undefined ? { duelBattlefield: bfs[opts.duelAt] } : {}),
    battlefieldCards: {
      [bfs[0]!]: { defId: opts.bf0Card ?? 'VEN-160', owner: P1 },
      [bfs[1]!]: { defId: 'VEN-164', owner: P1 },
    },
  } as GameState
}

const astral = (s: GameState, defId: string): readonly unknown[] =>
  astralSurgeCostMods(s, defId, cardKeywords)

describe('★ 前提:它是战场卡;卡文;常量;样例卡的关键词', () => {
  test('★类别、费用、卡文、增量', () => {
    expect(cardKind('VEN-160'), '★战场卡').toBe('battlefield')
    expect(cardCost('VEN-160'), '★战场卡 0 费').toEqual({ mana: 0 })
    expect(ASTRAL_SURGE_PIPS, '㊶ 增量从常量取').toBe(1)
    expect(VEN_160_CARD_EFFECT).toContain('拥有{{反应}}的卡牌费用增加')
  })

  test('★★★★★㊳ 前提自证:样例卡的[反应]是真的从印刷表来的', () => {
    expect(cardKeywords(REACTION_CARD), '★这张真带[反应]').toContain('反应')
    expect(cardKeywords(PLAIN_CARD), '★这张真不带').not.toContain('反应')
  })
})

describe('★★★★★★★ 「在此处的法术对决中」', () => {
  test('★★★★★★对决就在这处 ⇒ [反应]卡增 {A}(1 枚任意域 pip)', () => {
    const s = scene({ duelAt: 0 })
    expect(astral(s, REACTION_CARD)).toEqual([
      { kind: 'increase', part: 'pips', pips: 1, source: 'VEN-160 神秘星旋' },
    ])
  })

  test('★★★★★★★对决在【别处】⇒ 不增(㊵ 换一处问,答案就变)', () => {
    const s = scene({ duelAt: 1 })
    expect(s.spellDuelActive, '前提自证:确实在对决中').toBe(true)
    expect(astral(s, REACTION_CARD), '★别处的对决不归这张管').toEqual([])
  })

  test('★★★★★★★【根本没在对决里】就不增 —— 哪怕地点字段还残留着值', () => {
                                                            
    const s = scene({ duelAt: 0, active: false })
    expect(s.duelBattlefield, '前提自证:地点还在').toBeDefined()
    expect(s.spellDuelActive, '前提自证:但没在对决').toBe(false)
    expect(astral(s, REACTION_CARD), '★不在对决 ⇒ 不增').toEqual([])
  })

  test('★★★★★★这处摆的是【别的战场卡】⇒ 不增', () => {
    const s = scene({ bf0Card: 'VEN-164', duelAt: 0 })
    expect(astral(s, REACTION_CARD), '★沙蚀墓穴不是星旋').toEqual([])
  })

  test('★★★★★地点【缺省不给】⇒ 一条都不出(接线前行为完全不变)', () => {
    const s = { ...scene({ active: true }), duelBattlefield: undefined } as GameState
    expect(s.spellDuelActive, '前提自证:在对决中').toBe(true)
    expect(astral(s, REACTION_CARD), '★答不出「哪处」就不生效').toEqual([])
  })
})

describe('★★★★★★★ 「拥有{{反应}}的卡牌」', () => {
  test('★★★★★★★不带[反应]的卡一分钱不多付', () => {
    const s = scene({ duelAt: 0 })
    expect(astral(s, REACTION_CARD), '前提自证:带的那张是增的').toHaveLength(1)
    expect(astral(s, PLAIN_CARD), '★不带[反应] ⇒ 不增').toEqual([])
  })

  test('★★★★★这条判据【真的读了关键词表】:换个恒空的查法进去 ⇒ 不增', () => {
    const s = scene({ duelAt: 0 })
    expect(astralSurgeCostMods(s, REACTION_CARD, () => []), '★查法说没有 ⇒ 不增').toEqual([])
  })
})

describe('★★★★★★ 增费的【形状】:任意域、没有 floor', () => {
  test('★★★★★★不给 `pipColors` ⇒ §135.2.e.5 任意域;也不给 `floor`(那是减费的字段)', () => {
    const m = astral(scene({ duelAt: 0 }), REACTION_CARD)[0] as Record<string, unknown>
    expect(m.kind, '★是 increase 不是 reduce').toBe('increase')
    expect(m.part).toBe('pips')
    expect(m.pipColors, '★任意域 ⇒ 不给颜色').toBeUndefined()
    expect(m.floor, '★增费没有下限这一说').toBeUndefined()
  })
})

describe('★★★★★★ 接线:进了 `allCostMods` + 生产侧真接上', () => {
  test('★★★★★★`allCostMods` 汇总里有它', () => {
    const s = scene({ duelAt: 0 })
    const mods = allCostMods(s, P1, REACTION_CARD, () => true, undefined, cardKeywords)
    expect(mods.filter((m) => m.source === 'VEN-160 神秘星旋')).toHaveLength(1)
  })

  test('★★★★★★★生产侧 `costModsFor` 真的接上了(registry 一路到底)', () => {
    const s = scene({ duelAt: 0 })
    expect(costModsFor(s, P1, REACTION_CARD).filter((m) => m.source === 'VEN-160 神秘星旋'))
      .toHaveLength(1)
    expect(costModsFor(s, P1, PLAIN_CARD).filter((m) => m.source === 'VEN-160 神秘星旋'))
      .toEqual([])
  })
})

describe('★★★★★★★ 活证据:`duelBattlefield` 与 `spellDuelActive` 真的成对', () => {
                                 
  function combatScene(): GameState {
    const base = scene()
    const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of [unit('atk', bfs[0]!, P1), unit('def', bfs[0]!, P2)]) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return { ...base, spellDuelActive: false, objects, zones } as GameState
  }

  test('★★★★★★★走【真的】`openCombat`:地点落进 state,VEN-160 当场生效', () => {
    const s0 = combatScene()
    const bf0 = zonesByKind(s0, 'battlefield').map((z) => z.id as string)[0]!
    expect(astral(s0, REACTION_CARD), '前提自证:开战前不增').toEqual([])
    const { state: s } = openCombat(s0, bf0, P1)
    expect(s.spellDuelActive, '★对决开了').toBe(true)
    expect(s.duelBattlefield, '★★地点跟着一起落地(成对)').toBe(bf0)
    expect(astral(s, REACTION_CARD), '★★★真流程里也增费').toHaveLength(1)
  })

  test('★★★★★建局初值:没在对决、地点为空(㊳ 两个字段一起起步)', () => {
    const s = createInitialState([P1, P2], 2)
    expect(s.spellDuelActive).toBe(false)
    expect(s.duelBattlefield).toBeUndefined()
  })
})
