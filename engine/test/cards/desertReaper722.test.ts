import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardKeywords, cardKind, activeTriggers } from '../../data/registry'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { VEN_145, REAPER_COST_MIN, REAPER_MAX_RUNES, makeDesertReaperTrigger } from '../../data/cards/VEN-145'

                                                        
                                                   
                        
  
           
                                                     
                                           
                                                          
                                                                     
                                                                           
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const reaper = (status: Record<string, boolean> = {}): GameObject =>
  ({ ...obj('rp', P1, `legend:${P1}`), defId: 'VEN-145', baseTypes: ['legend'], status } as GameObject)
const rune = (oid: string, who: PlayerId, tapped = true): GameObject =>
  ({ ...obj(oid, who, `base:${who}`, { baseTypes: ['rune'], status: tapped ? { tapped: true } : {} } as Partial<GameObject>), defId: 'rune:green' } as GameObject)
                                                                      
const bigUnit = (oid: string, defId: string): GameObject => ({ ...obj(oid, P1, BF0), defId } as GameObject)

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

const trigU = makeDesertReaperTrigger(asObjId('rp'), P1, 'playUnit')
const trigA = makeDesertReaperTrigger(asObjId('rp'), P1, 'activateAbility')
const pu = (unit: string, player: PlayerId = P1): GameEvent =>
  ({ kind: 'playUnit', unit: asObjId(unit), player } as unknown as GameEvent)
const aa = (baseCostMana?: number, player: PlayerId = P1): GameEvent =>
  ({ kind: 'activateAbility', source: asObjId('src'), player, ...(baseCostMana !== undefined ? { baseCostMana } : {}) } as unknown as GameEvent)

describe('★★★★★★★ ①②三类×印刷/基础费判据', () => {
  test('★★★★★★单位档:印刷7费(OGN-148)响、印刷10费(UNL-147)响;印刷2费不响;token 无号保守不响', () => {
    expect(CARD_COSTS['OGN-148']!.mana, '★场景前提:艾尼维亚印刷 7').toBe(7)
    const s = scene([reaper(), bigUnit('big', 'OGN-148'), bigUnit('huge', 'UNL-147'), bigUnit('tok', 'token:映像'), obj('small', P1, BF0, { defId: 'OGN-010' } as Partial<GameObject>)])
    expect(checkTrigger(trigU, pu('big'), s, P1), '★恰 7 响(㉙ ≥)').toBe(true)
    expect(checkTrigger(trigU, pu('huge'), s, P1)).toBe(true)
    expect(checkTrigger(trigU, pu('small'), s, P1), '★OGN-010 印刷 2 费').toBe(false)
    expect(checkTrigger(trigU, pu('tok'), s, P1), '★token 无卡号=费不明 ⇒ 保守不响').toBe(false)
    expect(REAPER_COST_MIN, '★阈值钉字面量').toBe(7)
  })

  test('★★★★★★技能档:baseCostMana 7 响/6 不响/缺字段保守不响;对手打出不响(by)', () => {
    const s = scene([reaper()])
    expect(checkTrigger(trigA, aa(7), s, P1), '★§206.1 基础费=发射点采集').toBe(true)
    expect(checkTrigger(trigA, aa(12), s, P1)).toBe(true)
    expect(checkTrigger(trigA, aa(6), s, P1)).toBe(false)
    expect(checkTrigger(trigA, aa(undefined), s, P1), '★缺=不明 ⇒ 保守').toBe(false)
    expect(checkTrigger(trigA, aa(9, P2), s, P2), '★对手激活').toBe(false)
    expect(checkTrigger(trigU, pu('big', P2), s, P2), '★对手打出').toBe(false)
  })
})

describe('★★★★★★★ ③④两问链+立即活跃', () => {
                                         
                                                                         
                                                                
                                                                       
                                                                            
                                                 
  test('★★★★★★可选走确认阶段;结算期第一问直接是选符文;费用先付=basePerform 就地把我 tapped', () => {
    const s = scene([reaper(), bigUnit('big', 'OGN-148'), rune('r1', P1), rune('r2', P1), rune('r3', P2)])
    expect(trigU.mayChoose, '★★§383.3.a「你可以选择」在效果开头 ⇒ 确认阶段问').toBe(true)
    const paid = trigU.basePerform!(s, pu('big'), {})
    expect(paid, '★付得起 ⇒ 返回付完的 state').not.toBeNull()
    expect(paid!.objects['rp' as never]!.status.tapped, '★★★费用先付:确认阶段我就已经 tapped 了(★683)').toBe(true)
    const q2 = trigU.nextChoice!(s, pu('big'), {})!
    expect(q2.candidates.map((c) => c.id), '★候选=全部基地符文(零限定词,㊼ OGN-289)+停止档').toEqual(['r1', 'r2', 'r3', '__done__'])
                                                        
    for (const reject of ['skip', 'no', 'none', 'decline']) {
      expect(q2.candidates.map((c) => c.id).includes(reject), `★不该混进拒绝项(查 ${reject})`).toBe(false)
    }
    const evs = trigU.effect(paid!, pu('big'), { reaperRune0: 'r1', reaperRune1: 'r2' })
    expect(evs.map((e) => (e as { kind: string }).kind), '★effect 只剩收益那一半').toEqual(['statusChange', 'statusChange'])
    expect(evs[0], '★立即活跃(不是巨神峰的回合末延迟)').toMatchObject({ target: 'r1', key: 'tapped', value: false })
    const after = applyEvents(paid!, evs as never, {}).state
    expect(after.objects['r1' as never]!.status.tapped).toBe(false)
    expect(after.objects['rp' as never]!.status.tapped).toBe(true)
    expect(REAPER_MAX_RUNES).toBe(2)
  })

                                                                     
                                                          
  test('★★★★★★边界:已 tapped ⇒ 连触发都不入链、basePerform 返 null;「最多」选 0 枚=只付费;死符文答案滤掉', () => {
    const s = scene([reaper(), bigUnit('big', 'OGN-148'), rune('r1', P1)])
                                                           
                                                                          
                                                           
                                                               
    const tapped = scene([reaper({ tapped: true }), bigUnit('big', 'OGN-148'), rune('r1', P1)])
    expect(checkTrigger(trigU, pu('big'), s, P1), '★前提自证:同一个景里【没休眠】时是响的').toBe(true)
    expect(checkTrigger(trigU, pu('big'), tapped, P1), '★★★付不起 ⇒ 触发不入链(§383.3.b.1)').toBe(false)
    expect(trigU.basePerform!(tapped, pu('big'), {}), '★★就算硬闯到确认阶段也付不出 ⇒ null').toBeNull()
    const evs0 = trigU.effect(s, pu('big'), { reaperRune0: '__done__' })
    expect(evs0.map((e) => (e as { kind: string }).kind), '★选 0 枚合法 ⇒ 收益侧一条都不发(费用已在确认阶段付掉)').toEqual([])
    const evsGone = trigU.effect(s, pu('big'), { reaperRune0: 'gone' })
    expect(evsGone, '★答案里的符文已不在 ⇒ 滤掉(㊼ OGN-289)').toHaveLength(0)
  })

                                                                    
  test('★★★advanceFepr 停下来问,项目还是 pending,候选是【要不要执行】', () => {
    const s = scene([reaper(), bigUnit('big', 'OGN-148'), rune('r1', P1)])
    const fired = landAndEnqueueTriggers(s, [pu('big')], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind, '★★★确认阶段就问了').toBe('choice')
    expect(step.state.chain.some((i) => i.status === 'pending'), '★★★问的时候项目还没确认').toBe(true)
    const req = (step as Extract<typeof step, { kind: 'choice' }>).request
    expect(req.candidates.map((c) => c.id).sort(), '★★★这一问是【要不要执行】').toEqual(['no', 'yes'])
  })
})

describe('★ 前提:登记(正典折叠)', () => {
  test('★★★★★传奇 0费 绿+蓝、双号一组、keywords 双号空、TRIGGERS 两条', () => {
    expect(CARD_COSTS['VEN-145']).toEqual({ mana: 0, pips: 0, colors: ['green', 'blue'] })
    expect(cardKind('VEN-145')).toBe('legend')
                                                                            
    expect(VARIANT_GROUPS['VEN-145'], '★无组实证(有组了就该改回折叠登法)').toBeUndefined()
    expect(CARD_COSTS['VEN-192'], '★双号卡库都在').toEqual({ mana: 0, pips: 0, colors: ['green', 'blue'] })
    for (const no of ['VEN-145', 'VEN-192']) expect(cardKeywords(no), no).toEqual([])
    expect(VEN_145.energy).toBe(0)
  })
})
