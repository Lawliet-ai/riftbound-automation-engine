import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind, cardCost } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import type { GameEvent } from '../../src/loop/events'
import { DELAYED_RETURN_DEFIDS } from '../../data/cards/delayed-return'

                              
                                                      
  
                       
                                                      
                                                             
                               
                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function card(oid: string, defId: string, ctrl = P1, zone = BF0): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {},
  }
}
function handCard(oid: string, defId: string, owner: typeof P1): GameObject {
  return {
    oid: asObjId(oid), defId, owner, controller: owner, zone: asZoneId(`hand:${owner}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const playEv = (self: string): GameEvent => ({ kind: 'playUnit', unit: asObjId(self), player: P1 })
const holdEv = (p: typeof P1): GameEvent => ({ kind: 'hold', player: p, battlefield: BF0 })
const exileOf = (s: GameState, p: typeof P1) => (s.zones[`exile:${p}`]?.contents ?? [])
const handOf = (s: GameState, p: typeof P1) => (s.zones[`hand:${p}`]?.contents ?? [])
      .map((o) => s.objects[o]?.defId)

                            
function playAshe(st: GameState, pick: string): GameState {
  const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('ashe'))!
  return applyEvents(st, t.effect(st, playEv('ashe'), { card: pick }), {}).state
}
   
                                                    
  
                                                
                                                   
                                                    
                                                
   
function runHold(st: GameState, who: typeof P1): GameState {
  let s = landAndEnqueueTriggers(st, [holdEv(who)], activeTriggers, who, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('★【延迟返回】一族(第143轮):艾希 UNL-169', () => {
  test('前提:登记齐、费用照卡面(5费+1黄pip 4[M])', () => {
    expect(DELAYED_RETURN_DEFIDS).toEqual(['UNL-169'])
    expect(cardKind('UNL-169')).toBe('unit')
    expect(cardCost('UNL-169').pips).toEqual([['yellow']])
    expect(specLookup('UNL-169').baseMight).toBe(4)
  })

  test('★放逐进【对手的】放逐区,并挂上一条待办(记的是落地后的新 oid)', () => {
    const st = scene([card('ashe', 'UNL-169'), handCard('foeA', 'OGN-013', P2)])
    const s2 = playAshe(st, 'foeA')
    expect(exileOf(s2, P2)).toHaveLength(1)
    expect(exileOf(s2, P1)).toHaveLength(0)                  
    const todo = s2.delayedReturns ?? []
    expect(todo).toHaveLength(1)
    expect(todo[0]!.watch).toBe(P2)
                                                   
    expect(todo[0]!.card).not.toBe('foeA')
    expect(exileOf(s2, P2)).toContain(todo[0]!.card)
    expect(s2.objects[todo[0]!.card]).toBeDefined()         
  })

  test('★★源【离场】后待办照样生效 —— 这就是这条通道存在的全部理由', () => {
    const st = scene([card('ashe', 'UNL-169'), handCard('foeA', 'OGN-013', P2)])
    let s = playAshe(st, 'foeA')
                                               
    const { ashe: _gone, ...rest } = s.objects
    s = {
      ...s,
      objects: rest,
      zones: { ...s.zones, [BF0]: { ...s.zones[BF0]!, contents: s.zones[BF0]!.contents.filter((o) => o !== 'ashe') } },
    }
    expect(s.objects['ashe']).toBeUndefined()             
    const s2 = runHold(s, P2)
    expect(handOf(s2, P2)).toEqual(['OGN-013'])            
    expect(exileOf(s2, P2)).toHaveLength(0)
  })

  test('★盯的是【被点名的那个对手】:我自己据守不触发', () => {
    const st = scene([card('ashe', 'UNL-169'), handCard('foeA', 'OGN-013', P2)])
    const s = playAshe(st, 'foeA')
    const s2 = runHold(s, P1)       
    expect(exileOf(s2, P2)).toHaveLength(1)          
    expect(handOf(s2, P2)).toEqual([])
  })

  test('★对照组:那个对手据守时【确实】会触发(否则上一条恒真)', () => {
                                                
    const st = scene([card('ashe', 'UNL-169'), handCard('foeA', 'OGN-013', P2)])
    const s = playAshe(st, 'foeA')
    expect(handOf(runHold(s, P2), P2)).toEqual(['OGN-013'])
  })

  test('★★读时剪枝:牌已经离开放逐区 ⇒ 待办不再产出触发(不靠删账)', () => {
    const st = scene([card('ashe', 'UNL-169'), handCard('foeA', 'OGN-013', P2)])
    const s = playAshe(st, 'foeA')
    const banished = (s.delayedReturns ?? [])[0]!.card
                                 
    const moved = applyEvents(s, [{ kind: 'zoneChange', obj: banished, to: asZoneId(`discard:${P2}`) }], {}).state
    expect(moved.delayedReturns).toHaveLength(1)          
    const fired = activeTriggers(moved).filter((t) => t.sourceDefId === 'UNL-169' && t.event === 'hold')
    expect(fired).toHaveLength(0)                  
  })

  test('★触发一次之后不会再触发第二次(牌已回手 ⇒ 待办自动失效)', () => {
    const st = scene([card('ashe', 'UNL-169'), handCard('foeA', 'OGN-013', P2)])
    const s = playAshe(st, 'foeA')
    const once = runHold(s, P2)
    expect(handOf(once, P2)).toEqual(['OGN-013'])
    const twice = runHold(once, P2)
    expect(handOf(twice, P2)).toEqual(['OGN-013'])                
  })

  test('★候选是【对手手牌】,我自己的手牌不在里面', () => {
    const st = scene([card('ashe', 'UNL-169'),
      handCard('foeA', 'OGN-013', P2), handCard('mine', 'OGN-169', P1)])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('ashe'))!
    const req = t.nextChoice?.(st, playEv('ashe'), {})!
    expect(req.candidates.map((c) => c.id)).toEqual(['foeA'])
  })
})
