import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind, replacementShieldsFor } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { detectTriggers } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { seedRunes } from '../../src/game/economy'
import { LONGTAIL33_DEFIDS, VEN_025_RUNES, makeOgn177FollowTrigger } from '../../data/cards/longtail-33'
import { EXTRA_BF_TRIGGER_FACTORIES } from '../../data/cards/battlefields-extra'

                                                   
  
                                                                   
                                                    
                                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, ctrl: typeof P1, zone: string, defId = 'BLK'): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 9, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const moved = (unit: string, player: typeof P1, from: string, to: string) =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player, from: asZoneId(from), to: asZoneId(to) }) as unknown as GameEvent
                                      
function follow(st: GameState, ev: GameEvent): { fired: number; state: GameState } {
  const items = detectTriggers(st, ev, [makeOgn177FollowTrigger(asObjId('tracker'), P1)], P1)
  let s = st
  for (const it of items) s = applyEvents(s, it.resolve(s, {}, it), {}).state
  return { fired: items.length, state: s }
}
const zoneOf = (s: GameState, oid: string): string => s.objects[asObjId(oid)]!.zone as string

describe('★【长尾批次·三十三】前提', () => {
  test('登记齐;费用/战力照卡面实测取', () => {
    expect(LONGTAIL33_DEFIDS.slice().sort()).toEqual(['OGN-177', 'VEN-025'])
    expect(cardKind('OGN-177')).toBe('unit')
    expect(cardKind('VEN-025')).toBe('unit')
    expect(cardCost('OGN-177')).toEqual({ mana: 4, pips: [['purple']] })
    expect(cardCost('VEN-025')).toEqual({ mana: 5 })
    expect(CARD_COSTS['OGN-177']).toEqual({ mana: 4, pips: 1, colors: ['purple'] })
                                              
    expect(specLookup('OGN-177').baseMight).toBe(4)
    expect(specLookup('VEN-025').baseMight).toBe(5)
    expect(VEN_025_RUNES).toBe(7)
  })

  test('★追踪者的触发本身登记着(铁律83)', () => {
    const st = scene([obj('tracker', P1, BF0, 'OGN-177')])
    expect(activeTriggers(st).some((t) => String(t.id).includes('OGN-177'))).toBe(true)
  })
})

describe('★★ 隐秘追踪者 OGN-177:友方单位从【我的位置】移走 → 我可以跟随', () => {
  const board = () => scene([obj('tracker', P1, BF0, 'OGN-177'), obj('mate', P1, BF0), obj('foe', P2, BF0)])

  test('★★友方从我这儿走 → 我跟到【它的落点】', () => {
    const st = board()
    const r = follow(st, moved('mate', P1, BF0, BF1))
    expect(r.fired).toBe(1)
    expect(zoneOf(r.state, 'tracker')).toBe(BF1)
  })

  test('★★★只认【友方】:敌方单位从我这儿走,不触发(㊷ 与后巷酒吧差的第②处)', () => {
    const st = board()
    expect(follow(st, moved('foe', P2, BF0, BF1)).fired).toBe(0)
                                       
    const bar = EXTRA_BF_TRIGGER_FACTORIES['OGN-277']!(BF0, P2)
    expect(detectTriggers(st, moved('foe', P2, BF0, BF1), bar, P2).length).toBe(1)
  })

  test('★★★「我的位置」是【现算】的:我换到别处,原来那处的移动就不关我事了(㊷ 差的第①处)', () => {
    const st = scene([obj('tracker', P1, BF1, 'OGN-177'), obj('mate', P1, BF0)])
    expect(follow(st, moved('mate', P1, BF0, BF1)).fired).toBe(0)                  
                  
    const st2 = scene([obj('tracker', P1, BF0, 'OGN-177'), obj('mate', P1, BF0)])
    expect(follow(st2, moved('mate', P1, BF0, BF1)).fired).toBe(1)
  })

  test('★★★「我可以选择」= mayChoose(㊷ 差的第③处:后巷酒吧是强制的)', () => {
    const t = makeOgn177FollowTrigger(asObjId('tracker'), P1)
    expect(t.mayChoose).toBe(true)
    expect(EXTRA_BF_TRIGGER_FACTORIES['OGN-277']!(BF0, P1)[0]!.mayChoose ?? false).toBe(false)
  })

  test('★我自己移动不触发我自己(subjectIsNotSelf)', () => {
    const st = board()
    expect(follow(st, moved('tracker', P1, BF0, BF1)).fired).toBe(0)
  })

  test('★★我已经在它的落点上 ⇒ 不动(§355.4.a 终点须异于当前位置;moveUnitEvents 自己拒发)', () => {
                                                     
    const st = scene([obj('tracker', P1, BF0, 'OGN-177'), obj('mate', P1, `base:${P1}`)])
    expect(follow(st, moved('mate', P1, `base:${P1}`, BF0)).fired).toBe(0)
                                                    
    const st2 = scene([obj('tracker', P1, BF0, 'OGN-177'), obj('mate', P1, BF0)])
    const r = follow(st2, moved('mate', P1, BF0, BF0))
    expect(zoneOf(r.state, 'tracker')).toBe(BF0)
  })
})

describe('★★ 圣职尊者 VEN-025:符文≥7 时抵挡【敌方法术/技能】对【我】的伤害', () => {
  const cleric = (runes: number): GameState =>
    seedRunes(scene([obj('cleric', P1, BF0, 'VEN-025'), obj('mate', P1, BF0)]), P1, 'green', runes)
  const dmg = (s: GameState, target: string, from: typeof P1): GameState =>
    applyEvents(s, [{ kind: 'damage', target: asObjId(target), amount: 3, sourcePlayer: from } as GameEvent],
      { replacementShields: replacementShieldsFor }).state
  const hurt = (s: GameState, oid: string): number => s.objects[asObjId(oid)]?.damage ?? -1

  test('★★阈值三档 6/7/8(⑩ 含边界值)', () => {
    expect(hurt(dmg(cleric(VEN_025_RUNES - 1), 'cleric', P2), 'cleric')).toBe(3)          
    expect(hurt(dmg(cleric(VEN_025_RUNES), 'cleric', P2), 'cleric')).toBe(0)             
    expect(hurt(dmg(cleric(VEN_025_RUNES + 1), 'cleric', P2), 'cleric')).toBe(0)
  })

  test('★★★只挡【敌方】的:我自己的法术照样打得动我(㉕ 拦多了也是错)', () => {
    expect(hurt(dmg(cleric(9), 'cleric', P1), 'cleric')).toBe(3)
  })

  test('★★★只挡【对我】的:同处的队友该吃还是吃', () => {
    const s = dmg(cleric(9), 'mate', P2)
    expect(hurt(s, 'mate')).toBe(3)
  })

  test('★★★战斗伤害挡不住(卡文写的是「法术和技能」)', () => {
    const s = applyEvents(cleric(9),
      [{ kind: 'damage', target: asObjId('cleric'), amount: 3, sourcePlayer: P2, combat: true } as GameEvent],
      { replacementShields: replacementShieldsFor }).state
    expect(hurt(s, 'cleric')).toBe(3)
  })

  test('★★现算的门:符文掉回 6 枚,这条立刻失效(⑲)', () => {
    expect(replacementShieldsFor(cleric(9)).length).toBe(1)         
    expect(replacementShieldsFor(cleric(3)).length).toBe(1)                            
    expect(hurt(dmg(cleric(3), 'cleric', P2), 'cleric')).toBe(3)
  })

  test('★在手牌里的圣职尊者不产护盾(⑩「场上」含基地,手牌不算)', () => {
    const inHand = seedRunes(scene([obj('cleric', P1, `hand:${P1}`, 'VEN-025')]), P1, 'green', 9)
    expect(replacementShieldsFor(inHand).length).toBe(0)
  })
})
