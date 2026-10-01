import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeAzirEmperorTrigger, emperorTokenCandidates } from '../../data/cards/SFD-177'

                                                                
                        
                                            
  
                         
                                                     
                                                       
                                                              
                                          
                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 1, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const azir = (zone: string = BF0): GameObject => obj('az', 'SFD-177', P1, zone)
const soldier = (oid: string, zone: string, ctrl: PlayerId = P1): GameObject => obj(oid, 'token:黄沙士兵', ctrl, zone)
const trig = makeAzirEmperorTrigger(asObjId('az'), P1)
const attack = (unit: string): GameEvent => ({ kind: 'attack', unit: asObjId(unit) } as unknown as GameEvent)

describe('★ 前提:①登记/双印次', () => {
  test('★★★★★英雄单位 4费 0pip 4[S]、[急速] 两号都登、variant 两号一组', () => {
    expect(CARD_COSTS['SFD-177']).toEqual({ mana: 4, pips: 0, colors: ['yellow'] })
    expect(cardKind('SFD-177')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-177']).toEqual(['SFD-177', 'SFD-177a'])
    expect(cardKeywords('SFD-177')).toEqual(['急速'])
    expect(cardKeywords('SFD-177a'), '★异画号同登(§805 登了才真生效)').toEqual(['急速'])
    expect(cardCost('SFD-177')).toEqual({ mana: 4 })
  })

  test('★★★★★触发:我进攻响、队友进攻不响(subjectIsSelf)', () => {
    const s = scene([azir(), obj('mate', 'U-M', P1, BF0)])
    expect(checkTrigger(trig, attack('az'), s, P1)).toBe(true)
    expect(checkTrigger(trig, attack('mate'), s, P1)).toBe(false)
  })
})

describe('★★★★★★★ ②候选:L395 名称裁定四重筛', () => {
  test('★★★★★★我控 token 单位在;敌方 token/普通单位/金币装备指示物/复制改名的映像 全不在', () => {
    const s = scene([
      azir(), soldier('s1', BF1), soldier('s2', `base:${P1}`),
      soldier('foeTok', BF1, P2),                                    // 敌方 token
      obj('plain', 'U-P', P1, BF1),                                  // 普通单位
      { ...obj('gold', 'token:金币', P1, `base:${P1}`), baseTypes: ['equipment'] } as GameObject, // 装备指示物
      { ...soldier('mirror', BF1), derived: { copiedDefId: 'UNL-131', might: 4, keywords: [] } } as unknown as GameObject, // 复制改名
    ])
    expect(emperorTokenCandidates(s, P1), '★L395:复制体名称已变 ⇒ 排除;基地里的士兵也可移').toEqual(['s1', 's2'])
  })
})

describe('★★★★★★★ ①③effect:结算时现算此战场', () => {
  test('★★★★★★结算时我在 BF0 ⇒ 选中的移来(§446.1 双发);同位置的选了=落空(moveUnitEvents 早退)', () => {
    const s = scene([azir(BF0), soldier('s1', BF1), soldier('s2', BF0)])
    const evs = trig.effect(s, attack('az'), { [`azirTok0`]: 's1', [`azirTok1`]: 's2' }) as unknown as readonly { kind: string, obj?: string, to?: string }[]
    expect(evs.map((e) => e.kind), '★s1 移动双发;s2 同位置早退零事件').toEqual(['zoneChange', 'unitMoved'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 's1', to: BF0 })
  })

  test('★★★★★★⚡QA L243/452:结算时我被移回基地/离场 ⇒ 忽略战场指示=全落空;没选=空', () => {
    const atBase = scene([azir(`base:${P1}`), soldier('s1', BF1)])
    expect(trig.effect(atBase, attack('az'), { azirTok0: 's1' }), '★结算时不在战场').toEqual([])
    const gone = scene([soldier('s1', BF1)])
    expect(trig.effect(gone, attack('az'), { azirTok0: 's1' }), '★我离场').toEqual([])
    const idle = scene([azir(BF0), soldier('s1', BF1)])
    expect(trig.effect(idle, attack('az'), {}), '★「任意数量」含 0').toEqual([])
  })
})
