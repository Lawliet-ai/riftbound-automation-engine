import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  DESTROY_SPELLS, DESTROY_SPELL_SPECS, destroyVictims, destroyPickKey,
} from '../../data/cards/destroy-spells'
import { destroyableEquipment } from '../../data/cards/OGN-056'
import { damageVictims } from '../../data/cards/damage-spells'
import { reviveCandidates, OGN_170_SPEC, OGN_170_CARD_EFFECT } from '../../data/cards/OGN-170'
import { retrievableFromDiscard } from '../../data/cards/SFD-035'
import { applyEvents } from '../../src/loop/reduce'
import { EQUIPMENT_DEFIDS } from '../../data/cardKinds'

                                                            
                                      
                                              
                                          
                                                    
  
                 
                                                         
                                                       
                                                               
                                                                          
                                           
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})
   
                                                      
                                                                         
                                                        
                                    
                                                                                   
                                                     
   
const GEAR_DEFIDS = [...EQUIPMENT_DEFIDS]
const gear = (oid: string, defIdIndex: number, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: GEAR_DEFIDS[defIdIndex]!, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
})

   
      
                                                   
                                                   
                                                                    
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('mine', 'U-mine', P1, BF0))
  put(unit('foe', 'U-foe', P2, BF0))
  put(gear('bfGear', 0, P1, BF0))
  put(unit('home', 'U-home', P1, `base:${P1}`))
  put(gear('homeGear', 1, P1, `base:${P1}`))
  put(unit('dUnit', 'U-dead', P1, `discard:${P1}`))
  put(gear('dGear', 2, P1, `discard:${P1}`))
  put(unit('foeDUnit', 'U-foeDead', P2, `discard:${P2}`))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

   
                                                                      
                                                                                    
                                        
   
function moveTo(s: GameState, oid: string, zone: string): GameState {
  const o = s.objects[oid as ObjId]!
  const entries = Object.entries(s.zones as unknown as Record<string, { contents: readonly string[] }>)
  const zones: Record<string, unknown> = {}
  for (const [k, z] of entries) {
    zones[k] = { ...z, contents: z.contents.filter((x) => x !== oid) }
  }
  const dest = zones[zone] as { contents: readonly string[] }
  zones[zone] = { ...dest, contents: [...dest.contents, oid] }
  return {
    ...s,
    objects: { ...s.objects, [oid]: { ...o, zone: asZoneId(zone) } },
    zones,
  } as unknown as GameState
}

describe('★ 前提:三张的类别 / 费用 / 印刷关键词 / 进表', () => {
  test('★★★★★上游印刷费 ↔ 行表 `cost`(逐张)', () => {
    expect(CARD_COSTS['OGS-012']).toEqual({ mana: 6, pips: 1, colors: ['yellow'] })
    expect(CARD_COSTS['OGN-022']).toEqual({ mana: 5, pips: 2, colors: ['red'] })
    expect(CARD_COSTS['OGN-170']).toEqual({ mana: 2, pips: 0, colors: ['purple'] })
    for (const r of DESTROY_SPELLS) {
      expect(r.cost.mana, `${r.defId} 与卡面同价`).toBe(r.energy)
      expect((r.cost.pips ?? []).length, `${r.defId} pip 枚数`).toBe(CARD_COSTS[r.defId]!.pips)
    }
    expect(OGN_170_SPEC.cost, '★0 pip ⇒ 只写 mana').toEqual({ mana: 2 })
  })

  test('★★★★三张都是法术、都印[迅捷]、都进了 `PLAY_SPECS`', () => {
    for (const id of ['OGS-012', 'OGN-022', 'OGN-170']) {
      expect(cardKind(id), id).toBe('spell')
      expect(cardKeywords(id), `${id} 印刷关键词`).toEqual(['迅捷'])
      expect(playSpecFor(id), `${id} 进表`).toBeDefined()
      expect(playSpecFor(id)!.legalTargets, `${id} legalTargets 必填`).toBeDefined()
    }
    expect(OGN_170_CARD_EFFECT).toContain('废牌堆')
  })
})

describe('★★★★★★★ 「摧毁战场上的一名单位」:有位置词 ⇒ 不含基地', () => {
  test('★★★★★★战场上两名单位都能选;基地里那名【不能】', () => {
    const c = destroyVictims('oneUnitOnBattlefield', scene())
    expect(c.slice().sort(), '★不分敌我').toEqual(['foe', 'mine'])
    expect(c, '★★基地里的 home 出局(铁律86)').not.toContain('home')
    expect(c, '★★★装备不是单位').not.toContain('bfGear')
  })

  test('★★★★★★★分辨断言:与 343 的伤害族 `oneAnywhere`【口径真的不同】', () => {
                                            
    const s = scene()
    expect(damageVictims('oneAnywhere', s, P1), '★伤害族含基地').toContain('home')
    expect(destroyVictims('oneUnitOnBattlefield', s), '★★摧毁族这档不含').not.toContain('home')
  })
})

describe('★★★★★★★ 「摧毁所有装备」:没有敌我词、没有位置词', () => {
  test('★★★★★★战场上的和基地里的装备都算', () => {
    const c = destroyVictims('allEquipment', scene())
    expect(c.slice().sort(), '★★基地里的 homeGear 也在内').toEqual(['bfGear', 'homeGear'])
    expect(c, '★单位不是装备').not.toContain('mine')
  })

  test('★★★★★★收口自证:就是 `destroyableEquipment`(改它会同时炸 OGN-056/342族/本族)', () => {
    const s = scene()
    expect(destroyVictims('allEquipment', s))
      .toEqual((destroyableEquipment(s) as unknown as string[]).slice().sort())
  })

  test('★★★★★群体档【不选目标】,单体档才列候选', () => {
    expect(DESTROY_SPELL_SPECS['OGN-022']!.target, '★群体').toBe('none')
    expect(DESTROY_SPELL_SPECS['OGN-022']!.legalTargets(scene(), P1)).toEqual([])
    expect(DESTROY_SPELL_SPECS['OGS-012']!.target, '★★单体').toBe('custom')
    expect((DESTROY_SPELL_SPECS['OGS-012']!.legalTargets(scene(), P1) as string[]).length).toBe(2)
  })
})

describe('★★★★★★★ 结算:§428.5 两个归因都要 + 结算侧再验', () => {
  const resolveOf = (defId: string, s: GameState, target?: string): readonly unknown[] =>
    DESTROY_SPELL_SPECS[defId]!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}),
    } as never)(s, {})

  test('★★★★★★★单体:一条 `destroy`,`source` 与 `sourcePlayer` 都给', () => {
    expect(resolveOf('OGS-012', scene(), 'foe')).toEqual([
      { kind: 'destroy', target: 'foe', source: 'sp', sourcePlayer: P1 },
    ])
  })

  test('★★★★★★群体:两件装备各一条,归因同样都给', () => {
    const evs = resolveOf('OGN-022', scene()) as readonly { target: string; sourcePlayer: PlayerId }[]
    expect(evs.map((e) => e.target).sort()).toEqual(['bfGear', 'homeGear'])
    expect(evs.every((e) => e.sourcePlayer === P1), '★每条都带 sourcePlayer').toBe(true)
  })

  test('★★★★★★★结算时目标【还在、但已不在范围内】(挪回基地)⇒ 不发', () => {
                                                       
    const moved = moveTo(scene(), 'foe', `base:${P2}`)
    expect(destroyVictims('oneUnitOnBattlefield', moved), '前提自证:它已不在战场上').not.toContain('foe')
    expect(resolveOf('OGS-012', moved, 'foe'), '★不在范围 ⇒ 不发').toEqual([])
  })
})

describe('★★★★★★★ OGN-170 亡者复生:只捞【自己】废牌堆里的【单位】', () => {
  test('★★★★★★★只有我废牌堆里那名单位 —— 装备不算、对手的不算', () => {
    const c = reviveCandidates(scene(), P1)
    expect(c, '★只有它').toEqual(['dUnit'])
    expect(c, '★★同一堆里的装备不算(卡文只写「一名单位」)').not.toContain('dGear')
    expect(c, '★★★对手废牌堆里的单位一张都选不到').not.toContain('foeDUnit')
                            
    expect(reviveCandidates(scene(), P2)).toEqual(['foeDUnit'])
  })

  test('★★★★★★分辨断言 + 回归闸:SFD-035 那个口【缺省仍是"单位或装备"】', () => {
    const s = scene()
    expect((retrievableFromDiscard(s, P1) as readonly string[]).slice().sort(), '★缺省不给 ⇒ 旧行为')
      .toEqual(['dGear', 'dUnit'])
    expect(reviveCandidates(s, P1), '★★收窄那一档只要单位').toEqual(['dUnit'])
  })

  test('★★★★★★★真流程 + §124:落地后**按 defId 在我手牌里**找得到(原 oid 已不在)', () => {
    const s = scene()
    const evs = OGN_170_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target: 'dUnit' } as never)(s, {})
    const after = applyEvents(s, evs as never, {}).state
    const hand = (after.zones[`hand:${P1}` as never]?.contents ?? []) as readonly ObjId[]
    expect(hand.map((oid) => after.objects[oid]?.defId), '★★按 defId 找').toContain('U-dead')
    expect(after.objects['dUnit' as ObjId], '★★★原 oid 已不在废牌堆').toBeUndefined()
  })

  test('★★★★★结算侧再验:那张牌已不在我废牌堆 ⇒ 不发', () => {
    const moved = moveTo(scene(), 'dUnit', `discard:${P2}`)
    expect(reviveCandidates(moved, P1), '前提自证:不在我这堆了').toEqual([])
    expect(OGN_170_SPEC.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: 'dUnit',
    } as never)(moved, {}), '★不发').toEqual([])
  })
})

                                                                  
                                    
                                          
                                          
                                           
describe('★★★★★★★ 第366轮:OGN-224 废物利用(第一张【可选目标】的)', () => {
  const P = { movedCardOid: 'sp', controller: P1 }
  const key = destroyPickKey('OGN-224')
  const ask = (s: GameState, chosen: Record<string, string> = {}) =>
    DESTROY_SPELL_SPECS['OGN-224']!.makeNextChoice!(P as never)(s, chosen)
  const evsOf = (s: GameState, chosen: Record<string, string>) =>
    DESTROY_SPELL_SPECS['OGN-224']!.makeResolve(P as never)(s, chosen)

  test('★★★★★★数量对齐:行表与这份清单一一对应(★348 那个漏洞,366 补上)', () => {
                                           
                                    
                                                   
                                                                      
                                                      
                                                                  
    expect(DESTROY_SPELLS.map((r) => r.defId).slice().sort())
      .toEqual(['OGN-022', 'OGN-213', 'OGN-224', 'OGS-012', 'SFD-005', 'SFD-162', 'UNL-159', 'VEN-003'])
  })

  test('★前提:法术 2费 1黄pip、印[迅捷]、进了 PLAY_SPECS', () => {
    expect(CARD_COSTS['OGN-224']).toEqual({ mana: 2, pips: 1, colors: ['yellow'] })
    expect(cardKind('OGN-224')).toBe('spell')
    expect(cardKeywords('OGN-224')).toEqual(['迅捷'])
    expect(playSpecFor('OGN-224')).toBeDefined()
    expect(DESTROY_SPELL_SPECS['OGN-224']!.target, '★可选档不走 target,走问链').toBe('none')
    expect(DESTROY_SPELL_SPECS['OGN-224']!.legalTargets(scene(), P1)).toEqual([])
  })

  test('★★★★★★收口自证:候选与「摧毁所有装备」是【同一个口】', () => {
    const s = scene()
    expect(destroyVictims('atMostOneEquipment', s), '★两档同源')
      .toEqual(destroyVictims('allEquipment', s))
    expect(destroyVictims('atMostOneEquipment', s), '★含基地、不分敌我')
      .toEqual([...destroyableEquipment(s)].map((x) => x as string).sort())
  })

  test('★★★★★问链:候选逐件列出 + 多一个【不摧毁】(「最多一件」)', () => {
    const r = ask(scene())!
    expect(r.key).toBe(key)
    expect(r.candidates.map((c) => c.id).slice().sort())
      .toEqual(['bfGear', 'homeGear', 'skip'].sort())
  })

  test('★★★★答过了就不再问;★场上一件装备都没有 ⇒ 不弹空问', () => {
    expect(ask(scene(), { [key]: 'bfGear' })).toBeNull()
    let s = moveTo(scene(), 'bfGear', `discard:${P1}`)
    s = moveTo(s, 'homeGear', `discard:${P1}`)
    expect(destroyVictims('atMostOneEquipment', s), '★前提自证:场上真没装备了').toEqual([])
    expect(ask(s), '★没得选就别弹').toBeNull()
  })

  test('★★★★★★结算:选了 ⇒ 一条 destroy(两个归因都给)+ 抽一张', () => {
    const evs = evsOf(scene(), { [key]: 'bfGear' })
    expect(evs.map((e) => e.kind)).toEqual(['destroy', 'draw'])
    const d = evs[0] as { target: string; source: string; sourcePlayer: string }
    expect(d.target).toBe('bfGear')
    expect(d.source).toBe('sp')
    expect(d.sourcePlayer).toBe(P1)
    expect((evs[1] as { count: number }).count).toBe(1)
  })

  test('★★★★★★★选了【不摧毁】⇒ 一件都不炸,但「抽一张牌」照抽(㉔ 两句各是各的)', () => {
                                                                        
    expect(evsOf(scene(), { [key]: 'skip' }).map((e) => e.kind)).toEqual(['draw'])
  })

  test('★★★★★★场上没装备(压根没问)⇒ 同样只抽牌', () => {
    let s = moveTo(scene(), 'bfGear', `discard:${P1}`)
    s = moveTo(s, 'homeGear', `discard:${P1}`)
    expect(evsOf(s, {}).map((e) => e.kind)).toEqual(['draw'])
  })

  test('★★★★★★★结算侧再验:选中的那件已挪出场 ⇒ 不炸,仍抽牌', () => {
    const s = moveTo(scene(), 'bfGear', `discard:${P1}`)
    expect(evsOf(s, { [key]: 'bfGear' }).map((e) => e.kind)).toEqual(['draw'])
  })

  test('★★★★★★★回归闸:老两张【没有 draw、也没有问链】,一字未变', () => {
    for (const id of ['OGS-012', 'OGN-022']) {
      const row = DESTROY_SPELLS.find((r) => r.defId === id)!
      expect(row.draw, `${id} 不该有 draw`).toBeUndefined()
      expect(DESTROY_SPELL_SPECS[id]!.makeNextChoice, `${id} 不该有问链`).toBeUndefined()
      const evs = DESTROY_SPELL_SPECS[id]!.makeResolve({ movedCardOid: 'sp', target: 'mine', controller: P1 } as never)(scene(), {})
      expect(evs.every((e) => e.kind === 'destroy'), `${id} 只发 destroy`).toBe(true)
    }
  })
})
