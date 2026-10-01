import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { StaticEffect } from '../../src/effects/continuousView'
import type { GameEvent } from '../../src/loop/events'
import { playSpecFor, cardKind, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { canPlayInTiming } from '../../src/loop/timing'
import { recomputeContinuous } from '../../src/effects/continuousView'
import {
  OGN_260, OGN_260_SPEC, OGN_260_CARD_EFFECT, OGN_260_FOE_KEY,
  gustAllies, gustFoes, gustAllyLive,
} from '../../data/cards/OGN-260'

                                                                 
                            
                                                
                             
                                       
  
                                
                                       
                                            
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const CARD = 'sp'

const unit = (
  oid: string, ctrl = P1, zone = BF0, might = 4, dormant = false,
): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: dormant ? { dormant: true } : {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[], effects: readonly StaticEffect[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(effects.length > 0 ? { continuousEffects: effects } : {}),
  } as GameState)
}
const bump = (target: string, delta: number): StaticEffect => ({
  id: `bump:${target}`, duration: 'permanent', fromPassive: false, timestamp: 1,
  predicate: (x: GameObject) => (x.oid as string) === target,
  modification: { kind: 'addMight', delta },
} as unknown as StaticEffect)

const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  OGN_260_SPEC.makeNextChoice!({ movedCardOid: CARD, controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  OGN_260_SPEC.makeResolve({ movedCardOid: CARD, controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const dmg = (evs: readonly GameEvent[]) => evs
  .find((e) => (e as { kind: string }).kind === 'damage') as unknown as
  { target: string; amount: number; source: string; sourcePlayer: string } | undefined

describe('🔴🔴🔴★★★★★★611 狂风绝息斩:前提与接线', () => {
  test('★前提:专属法术 3费 **两枚单色pip**(绿+紫)、**单印次**、卡文一字不差', () => {
    expect(CARD_COSTS['OGN-260']).toEqual({ mana: 3, pips: 2, colors: ['green', 'purple'] })
    expect(CARD_COSTS['OGN-260a'], '★单印次:没有 a 号').toBeUndefined()
    expect(OGN_260_SPEC.cost, '★★★pips=2 且两色 ⇒ 两枚单色(★592 的分野)')
      .toEqual({ mana: 3, pips: [['green'], ['purple']] })
    expect(cardKind('OGN-260')).toBe('spell')
    expect(OGN_260.domains).toEqual(['green', 'purple'])
    expect(OGN_260_CARD_EFFECT).toBe(
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n让一名友方单位变为活跃状态，并对任意战场上的一名敌方单位造成等同于该友方单位战力的伤害。')
  })

  test('🔴🔴★★★★★★接线:PLAY_SPECS 查得到(登记漏了 ⇒ 这张牌在真对局里打不出来)', () => {
    expect(playSpecFor('OGN-260')).toBeDefined()
    expect(playSpecFor('OGN-260')!.defId).toBe('OGN-260')
  })

  test('🔴🔴🔴★★★★★★【会换答案】[迅捷] 登**两处**;法术对决态下才打得出(§308.1.a)', () => {
    expect(OGN_260_SPEC.keywords).toEqual(['迅捷'])
    expect(cardKeywords('OGN-260'), '★★★印刷表那份(★605 的教训)').toContain('迅捷')
    const duel = { ...scene([]), spellDuelActive: true } as GameState
    expect(canPlayInTiming(duel, OGN_260_SPEC.keywords, false), '★★★keywords 漏了迅捷这条当场红').toBe(true)
    expect(canPlayInTiming(duel, [], false), '★反方向:不带权限关键词的法术在对决里打不出').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★611「一名友方单位」——没写位置 ⇒ 全场', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】**基地与战场都算**(与 ★604「你基地中的」正相反)', () => {
                                  
    const s = scene([unit('onBf', P1, BF0), unit('atBase', P1, `base:${P1}`)])
    expect(gustAllies(s, P1)).toEqual(['atBase', 'onBf'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**友方**」——对手的单位不算', () => {
    const s = scene([unit('mine'), unit('foe', P2)])
    expect(gustAllies(s, P1), '★★★漏 controller 会把敌方也列出来').toEqual(['mine'])
    expect(OGN_260_SPEC.legalTargets(s, P1), '★legalTargets 与判据同源').toEqual(['mine'])
    expect(gustAllyLive(s, P1, 'foe')).toBe(false)
    expect(gustAllyLive(s, P1, undefined)).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★611「任意战场上的一名敌方单位」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】**任意**战场取并集,但**不含基地**(⑳)', () => {
    const s = scene([unit('mine'), unit('f0', P2, BF0), unit('f1', P2, BF1),
      unit('fBase', P2, `base:${P2}`)])
    expect(gustFoes(s, P1), '★★★对手基地里那名不是候选;两处战场都要取').toEqual(['f0', 'f1'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】问的是敌方那一问;那名友方没了 ⇒ **连问都不问**', () => {
    const s = scene([unit('mine'), unit('foe', P2)])
    const q = ask(s, 'mine')
    expect(q!.key).toBe(OGN_260_FOE_KEY)
    expect(q!.itemId).toBe(`play:${CARD}`)
    expect(q!.candidates.map((c) => c.id)).toEqual(['foe'])
    expect(ask(s, 'gone'), '★★★友方已离场 ⇒ §359.3.e.12 不问').toBeNull()
    expect(ask(scene([unit('mine')]), 'mine'), '★一个敌方都没有 ⇒ 不问(§355.17)').toBeNull()
    expect(ask(s, 'mine', { [OGN_260_FOE_KEY]: 'foe' }), '★答过就别再问(⑰)').toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★611 结算', () => {
  test('🔴🔴🔴★★★★★★【真结算·顺序承重】先解除休眠、再打伤害;伤害量=**那名友方**的战力', () => {
    const s = scene([unit('mine', P1, BF0, 4, true), unit('foe', P2, BF0, 9)])
    const evs = resolve(s, 'mine', { [OGN_260_FOE_KEY]: 'foe' })
    expect(kinds(evs), '★★★活跃在前、伤害在后').toEqual(['statusChange', 'damage'])
    expect(evs[0]).toMatchObject({ target: 'mine', key: 'dormant', value: false })
    expect(dmg(evs), '★★★4 是**我方**那名的战力,不是敌方的 9')
      .toMatchObject({ target: 'foe', amount: 4, source: CARD, sourcePlayer: P1 })
  })

  test('🔴🔴🔴★★★★★★【会换答案】伤害量**结算时现读派生值**(4[S] 被加到 7 ⇒ 打 7)', () => {
    const s = scene([unit('mine', P1, BF0, 4, true), unit('foe', P2)], [bump('mine', 3)])
    expect(s.objects[asObjId('mine')]!.baseMight, '★前提:印刷仍是 4').toBe(4)
    expect(dmg(resolve(s, 'mine', { [OGN_260_FOE_KEY]: 'foe' })), '★★★写成 baseMight 这条当场红')
      .toMatchObject({ amount: 7 })
  })

  test('🔴🔴🔴★★★★★★【会换答案·两半互不连坐】没选敌方 / 答了非法敌方 ⇒ **只做前半**(仍解除休眠)', () => {
    const s = scene([unit('mine', P1, BF0, 4, true), unit('foe', P2), unit('ally2', P1)])
    expect(kinds(resolve(s, 'mine')), '★★★没选 ⇒ 前半照做').toEqual(['statusChange'])
    expect(kinds(resolve(s, 'mine', { [OGN_260_FOE_KEY]: 'ally2' })), '★★★答的是友方 ⇒ 不打,但前半照做')
      .toEqual(['statusChange'])
    expect(kinds(resolve(s, 'mine', { [OGN_260_FOE_KEY]: 'ghost' })), '★答的是不存在的').toEqual(['statusChange'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·被撤销 ≠ 被无视】那名友方**本来就活跃** ⇒ 伤害照打', () => {
    const s = scene([unit('mine', P1, BF0, 4, false), unit('foe', P2)])
    const evs = resolve(s, 'mine', { [OGN_260_FOE_KEY]: 'foe' })
    expect(kinds(evs), '★★★「变为活跃」是无操作,但不影响后半句').toEqual(['statusChange', 'damage'])
    expect(dmg(evs)).toMatchObject({ amount: 4 })
  })

  test('🔴🔴🔴★★★★★★【会换答案·被无视 vs 没发生】那名友方已离场/是敌方 ⇒ **两半一并不发**', () => {
    const s = scene([unit('foe', P2)])
    expect(resolve(s, 'gone'), '★★★§359.3.e.12 引用返回「无」').toEqual([])
    expect(resolve(s, 'foe'), '★★★选的是敌方 ⇒ 不合法目标').toEqual([])
    expect(resolve(s, undefined), '★没目标').toEqual([])
  })
})
