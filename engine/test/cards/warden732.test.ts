import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { runAwakenPhase } from '../../src/loop/turnStructure'
import { cardKind, cardCost, replacementShieldsFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { playBannedFor } from '../../data/cards/longtail-12'
import { warden070BansUnitPlay, wardenReadyShields } from '../../data/cards/OGN-070'

                                                               
                               
                                           
  
           
                                                        
                                              
                                                               
                                   
                                                                
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string,
  types: readonly string[] = ['unit'], status: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status,
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

const warden = (zone: string = BF0) => obj('wd', 'OGN-070', P1, zone)
                                                               
const UNIT = 'OGN-078'
const SPELL = 'OGN-071'
const GEAR = 'OGN-101'

describe('★ 前提:登记面(单印次无组实证)', () => {
  test('★★★★★6费 1pip 绿、unit、无 variant 组、UNIT_COST 与生成表一致', () => {
    expect(CARD_COSTS['OGN-070']).toEqual({ mana: 6, pips: 1, colors: ['green'] })
    expect(cardKind('OGN-070')).toBe('unit')
    expect(cardCost('OGN-070'), '★729 有 pip 必登 pips').toEqual({ mana: 6, pips: [['green']] })
    expect(VARIANT_GROUPS['OGN-070'], '★单印次无组实证(732 现场量)').toBeUndefined()
  })
})

describe('★★★★★★★ 句①:对手只能把单位打到自己的基地', () => {
  test('★★★★★★典狱长在战场:对手打单位到战场被禁、到自己基地放行;经统一闸 playBannedFor 同判', () => {
    const s = scene([warden()])
    expect(warden070BansUnitPlay(s, P2, UNIT, BF0), '★打到战场 ⇒ 禁').toBe(true)
    expect(warden070BansUnitPlay(s, P2, UNIT, `base:${P2}`), '★打到自己基地 ⇒「只能」的允许项').toBe(false)
    expect(playBannedFor(s, P2, UNIT, BF0), '★统一闸第六档接上了').toBe(true)
    expect(playBannedFor(s, P2, UNIT, `base:${P2}`)).toBe(false)
  })

  test('★★★★★★㊶「把**单位**打到」:法术/装备不禁(刀:禁了装备=近似实现冒充)', () => {
    const s = scene([warden()])
    expect(warden070BansUnitPlay(s, P2, SPELL, BF0), '★法术照打').toBe(false)
    expect(warden070BansUnitPlay(s, P2, GEAR, BF0), '★装备照打(卡文只说单位)').toBe(false)
  })

  test('★★★★★「对手」:典狱长自家 P1 不受限;「位于战场上」:典狱长在基地 ⇒ 不禁;离场 ⇒ 不禁', () => {
    expect(warden070BansUnitPlay(scene([warden()]), P1, UNIT, BF0), '★自家照打').toBe(false)
    expect(warden070BansUnitPlay(scene([warden(`base:${P1}`)]), P2, UNIT, BF0), '★在基地=「位于战场上」不成立').toBe(false)
    expect(warden070BansUnitPlay(scene([]), P2, UNIT, BF0), '★不在场').toBe(false)
  })
})

describe('★★★★★★★ 句②:禁敌方单位/装备经效果变活跃', () => {
  const wake = (target: string): GameEvent =>
    ({ kind: 'statusChange', target: asObjId(target), key: 'dormant', value: false } as unknown as GameEvent)

  test('★★★★★★盾族在汇总口;敌方单位/装备的变活跃被拦(predicate)、变休眠方向不拦、我方不拦', () => {
    const s = scene([warden(), obj('eu', 'U-eu', P2, BF0, ['unit'], { dormant: true }),
      obj('eg', 'G-eg', P2, `base:${P2}`, ['equipment'], { dormant: true }),
      obj('mu', 'U-mu', P1, BF0, ['unit'], { dormant: true })])
    const shields = wardenReadyShields(s)
    expect(shields).toHaveLength(1)
    expect(replacementShieldsFor(s).some((sh) => sh.id === shields[0]!.id), '★汇总口第七族接上了').toBe(true)
    const sh = shields[0]!
    expect(sh.predicate(wake('eu'), s), '★敌方单位 ⇒ 拦').toBe(true)
    expect(sh.predicate(wake('eg'), s), '★敌方装备 ⇒ 拦').toBe(true)
    expect(sh.predicate(wake('mu'), s), '★我方(典狱长同控)⇒ 不拦(刀:敌我判丢)').toBe(false)
    const sleep = { kind: 'statusChange', target: asObjId('eu'), key: 'dormant', value: true } as unknown as GameEvent
    expect(sh.predicate(sleep, s), '★变休眠方向不拦(只禁「变为活跃」)').toBe(false)
    expect(sh.rewrite(wake('eu'), s), '★「禁止」= §443 替换为无').toBeNull()
  })

  test('★★★★★典狱长在基地 ⇒ 盾不存在(「位于战场上」)', () => {
    expect(wardenReadyShields(scene([warden(`base:${P1}`)]))).toHaveLength(0)
  })

  test('★★★★★★E2E(QA L129 风味):效果发变活跃 ⇒ 单位保持休眠;典狱长不在 ⇒ 照常醒', () => {
    const mk = (withWarden: boolean) => scene([
      ...(withWarden ? [warden()] : []),
      obj('eu', 'U-eu', P2, BF0, ['unit'], { dormant: true })])
    const deps = { replacementShields: replacementShieldsFor } as never
    const blocked = applyEvents(mk(true), [wake('eu')], deps).state
    expect(blocked.objects['eu' as never]!.status.dormant, '★被盾拦下 ⇒ 仍休眠').toBe(true)
    const free = applyEvents(mk(false), [wake('eu')], deps).state
    expect(free.objects['eu' as never]!.status.dormant, '★没典狱长 ⇒ 照常醒').toBe(false)
  })

  test('★★★★★★③唤醒分辨档:runAwakenPhase 直改 state 不发事件 ⇒ 典狱长拦不住唤醒(刀:过宽冒充)', () => {
                                                 
    const s = { ...scene([warden(), obj('eu', 'U-eu', P2, BF0, ['unit'], { dormant: true })]), activePlayer: P2 } as GameState
    const after = runAwakenPhase(s)
    expect(after.objects['eu' as never]!.status.dormant, '★§315.1.b 是回合流程不是效果 ⇒ 照醒').toBe(false)
  })
})
