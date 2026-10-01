import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { checkTrigger } from '../../src/dsl/trigger'
import { activeTriggers, cardKind } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { delayedTriggersOf } from '../../src/effects/delayedTriggers'
import {
  EXTRA_BF_TRIGGER_FACTORIES, makeMountainPeakTrigger, peakRuneCandidates,
  OGN_289_CARD_EFFECT, OGN_289_MAX_RUNES,
} from '../../data/cards/battlefields-extra'

                                 
                                                             
                                                        
  
                 
                                                
                                                     
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

                                         
function scene(n = 2): GameState {
  const base = createInitialState([P1, P2], 2)
  let s: GameState = { ...base, activePlayer: P1, phase: 'main' } as GameState
  s = seedRunes(s, P1, 'red', n)
  s = seedRunes(s, P2, 'blue', n)
  const objects: Record<string, GameObject> = {}
  for (const [k, o] of Object.entries(s.objects)) {
    objects[k] = o.defId.startsWith('rune:') ? { ...o, status: { ...o.status, tapped: true } } : o
  }
  return { ...s, objects, battlefieldCards: { [BF0]: { defId: 'OGN-289', owner: P1 } } } as GameState
}

const trig = (bf = BF0, ctrl = P1) => makeMountainPeakTrigger(bf, ctrl)
const conquer = (p = P1, bf = BF0): GameEvent => ({ kind: 'conquer', player: p, battlefield: bf } as GameEvent)
const endTurn = (p = P1): GameEvent => ({ kind: 'endOfTurn', player: p } as GameEvent)
const tapped = (s: GameState, oid: string): boolean => s.objects[asObjId(oid)]?.status.tapped === true

                                                          
const myRunes = (s: GameState): string[] =>
  peakRuneCandidates(s).filter((oid) => s.objects[oid]!.controller === P1).map((o) => o as string)

describe('巨神峰之巅 OGN-289:前提与接线', () => {
  test('★前提:战场卡;卡文按 errata 走(带「最多」);数额是 2(㊶)', () => {
    expect(cardKind('OGN-289')).toBe('battlefield')
    expect(OGN_289_CARD_EFFECT, '★以 errata 为准 —— 少了「最多」就是另一张卡').toContain('最多')
    expect(OGN_289_MAX_RUNES).toBe(2)
  })

  test('★★接线:进了战场卡触发工厂表', () => {
    expect(Object.keys(EXTRA_BF_TRIGGER_FACTORIES)).toContain('OGN-289')
    expect(EXTRA_BF_TRIGGER_FACTORIES['OGN-289']!(BF0, P1)).toHaveLength(1)
  })

  test('★★候选是【符文物件】,双方基地都算(铁律263:不是 runePools 里的计数)', () => {
    const s = scene(2)
    const cands = peakRuneCandidates(s)
    expect(cands.length, '双方各 2 枚').toBe(4)
    for (const oid of cands) expect(s.objects[oid]!.defId.startsWith('rune:')).toBe(true)
    expect(cands.some((oid) => s.objects[oid]!.controller === P2), '★对手的符文也在候选里').toBe(true)
  })
})

describe('★★★ 触发时机:当【你】征服【此处】', () => {
  test('★★此处 + 我征服 ⇒ 触发;别处 / 对手征服 ⇒ 不触发', () => {
    const s = scene()
    const t = trig()
    expect(checkTrigger(t, conquer(P1, BF0), s, P1)).toBe(true)
    expect(checkTrigger(t, conquer(P1, BF1), s, P1), '★别处').toBe(false)
    expect(checkTrigger(t, conquer(P2, BF0), s, P2), '★对手征服的是他自己那条').toBe(false)
  })
})

describe('★★★★★ 「最多两枚」+ 延迟到回合末', () => {
  test('★★★★选满两枚 ⇒ 挂一条延迟待办,targets 就是那两枚', () => {
    const s = scene()
    const [a, b] = myRunes(s)
    const evs = trig().effect(s, conquer(), { peakRune0: a!, peakRune1: b! })
    expect(evs).toHaveLength(1)
    const add = (evs[0] as { add?: { kind: string; targets: readonly string[] } }).add!
    expect(add.kind).toBe('readyRunesAtTurnEnd')
    expect([...add.targets].sort()).toEqual([a, b].sort())
  })

  test('★★★★★「最多」⇒ 一枚都不选是合法结果,什么都不挂', () => {
                                                            
    expect(trig().effect(scene(), conquer(), {})).toEqual([])
  })

  test('★★★选到上限就不再追问(「最多两枚」的上界)', () => {
    const s = scene()
    const [a, b] = myRunes(s)
    expect(trig().nextChoice?.(s, conquer(), { peakRune0: a!, peakRune1: b! }), '★两枚满了').toBeNull()
    expect(trig().nextChoice?.(s, conquer(), { peakRune0: a! }), '★只选了一枚 ⇒ 还问').not.toBeNull()
  })

  test('★★★结算这一刻再筛一次:挑的那枚已经不在了就不算', () => {
    const s = scene()
    const [a] = myRunes(s)
    expect(trig().effect(s, conquer(), { peakRune0: 'ghost' }), '★不存在的 oid 一律丢掉').toEqual([])
    expect(trig().effect(s, conquer(), { peakRune0: a! })).toHaveLength(1)
  })
})

describe('★★★★★ 真流程:征服那一刻不醒,回合末才醒', () => {
  test('★★★★★挂上待办 → `activeTriggers` 现造出那条 endOfTurn → 符文真的变活跃', () => {
    const s0 = scene()
    const [a, b] = myRunes(s0)
    expect(tapped(s0, a!) && tapped(s0, b!), '前提自证:两枚都是横置的').toBe(true)

                                          
    const evs = trig().effect(s0, conquer(), { peakRune0: a!, peakRune1: b! })
    const s1 = applyEvents(s0, evs, {}).state
    expect(delayedTriggersOf(s1)).toHaveLength(1)
    expect(tapped(s1, a!), '★征服这一刻还不能醒').toBe(true)

                                                          
    const t = activeTriggers(s1).find((x) => x.sourceDefId === 'OGN-289' && x.event === 'endOfTurn')!
    expect(t, '★延迟待办要能被现造成触发').toBeDefined()
    const s2 = landAndEnqueueTriggers(s1, [endTurn(P1)], activeTriggers, P1, {})
    let s3 = s2
    for (const it of s2.chain) s3 = landAndEnqueueTriggers(s3, it.resolve(s3, {}, it), activeTriggers, P1, {})
    expect(tapped(s3, a!), '★回合末醒了').toBe(false)
    expect(tapped(s3, b!), '★两枚都醒').toBe(false)
    expect(delayedTriggersOf(s3), '★一次性:响过就摘').toHaveLength(0)
  })
})
