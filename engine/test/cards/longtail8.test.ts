import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind, playSpecFor } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import type { GameEvent } from '../../src/loop/events'
import { LONGTAIL8_DEFIDS } from '../../data/cards/longtail-8'

                                               
                                         
                                            
                                    
  
                            
                                                         
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const unit = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: extra.baseMight ?? 3 })
const gear = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'OGN-090', ctrl, extra), baseTypes: ['equipment'] as const })
const runeObj = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'rune:blue', ctrl, extra), baseTypes: ['rune'] as const })

function scene(objs: GameObject[], deck = 6): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [
    ...objs,
                              
    ...[P1, P2].flatMap((p) => Array.from({ length: deck }, (_, i) =>
      unit(`d${p}${i}`, p, { zone: asZoneId(`mainDeck:${p}`) }))),
  ]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const nc = (defId: string) =>
  playSpecFor(defId)!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)
const play = (defId: string, chosen: Record<string, string> = {}, ctx: Record<string, unknown> = {}) =>
  (st: GameState) =>
    playSpecFor(defId)!.makeResolve({ movedCardOid: 'x', controller: P1, ...ctx } as never)(st, chosen, undefined as never)
const handSize = (st: GameState, p: string) => st.zones[`hand:${p}`]?.contents.length ?? 0
const handDefIds = (st: GameState, p: string) =>
  (st.zones[`hand:${p}`]?.contents ?? []).map((o) => st.objects[o]!.defId).sort()

describe('★【长尾批次·八】前提', () => {
  test('登记齐,费用照卡面实测取', () => {
                                                             
                                           
    expect(LONGTAIL8_DEFIDS.slice().sort()).toEqual(['OGN-187', 'OGN-209', 'OGS-017', 'VEN-103'])
    expect(cardCost('OGN-209')).toEqual({ mana: 2, pips: [['yellow']] })
    expect(cardCost('OGN-187')).toEqual({ mana: 4, pips: [['purple']] })
                                                 
                                                      
    expect(playSpecFor('SFD-005')!.cost).toEqual({ mana: 1, pips: [['red']] })
    expect(cardCost('VEN-103')).toEqual({ mana: 3, pips: [['purple']] })
    expect(cardKind('OGS-017')).toBe('legend')
    expect(cardCost('OGS-017')).toEqual({ mana: 0 })             
  })
})

describe('★★成对的一组:清理门户 OGN-209 vs 飓风席卷 OGN-187', () => {
  test('★★清理门户:【每名玩家各答一次】,而且第二问是问【对手】的(路由压这里)', () => {
    const st = scene([unit('mine'), unit('foe', P2)])
    const q1 = nc('OGN-209')(st, {})!
    expect(q1.controller).toBe(P1)                                         
    expect(q1.candidates.map((c) => c.id)).toEqual(['mine'])          
    const q2 = nc('OGN-209')(st, { [q1.key]: 'mine' })!
    expect(q2.controller).toBe(P2)                                                 
    expect(q2.key).not.toBe(q1.key)                                                   
    expect(q2.candidates.map((c) => c.id)).toEqual(['foe'])
    expect(nc('OGN-209')(st, { [q1.key]: 'mine', [q2.key]: 'foe' })).toBeNull()            
  })

  test('★★清理门户:两边各摧毁一名,谁也不许漏', () => {
    const st = scene([unit('mine'), unit('foe', P2)])
    const evs = play('OGN-209', { 'purge:P1': 'mine', 'purge:P2': 'foe' })(st)
    expect(evs).toEqual([
      { kind: 'destroy', target: 'mine' },
      { kind: 'destroy', target: 'foe' },
    ])                       
  })

  test('★★清理门户是【必须】的:候选里没有 skip(§355.10.f)', () => {
    const st = scene([unit('mine'), unit('foe', P2)])
    expect(nc('OGN-209')(st, {})!.candidates.map((c) => c.id)).not.toContain('skip')
  })

  test('★清理门户:某方没单位就跳过他,别卡死', () => {
    const st = scene([unit('foe', P2)])              
    const q = nc('OGN-209')(st, {})!
    expect(q.controller).toBe(P2)                
    expect(nc('OGN-209')(st, { [q.key]: 'foe' })).toBeNull()
  })

  test('★★飓风席卷:【从下一名玩家开始】—— 对手先答,我最后答', () => {
    const st = scene([unit('mine'), unit('foe', P2)])
    const q1 = nc('OGN-187')(st, {})!
    expect(q1.controller).toBe(P2)                      
    const q2 = nc('OGN-187')(st, { [q1.key]: 'skip' })!
    expect(q2.controller).toBe(P1)
  })

  test('★★飓风席卷是【可以】的,而且能指【任意】单位(不限自己的)', () => {
    const st = scene([unit('mine'), unit('foe', P2)])
    const q1 = nc('OGN-187')(st, {})!
    expect(q1.candidates.map((c) => c.id)).toContain('skip')           
                                           
    expect(q1.candidates.map((c) => c.id).sort()).toEqual(['foe', 'mine', 'skip'])
  })

  test('★★飓风席卷:回的是【所属者】手牌;选了 skip 的那人什么都不发生(铁律64)', () => {
    const stolen = { ...unit('stolen', P1), owner: P2 }               
    const st = scene([stolen, unit('foe', P2)])
    const after = applyEvents(st, play('OGN-187', { 'gale:P2': 'stolen', 'gale:P1': 'skip' })(st), {}).state
    expect(handDefIds(after, P2)).toEqual(['BLK'])                               
    expect(handDefIds(after, P1)).toEqual([])                     
  })
})

describe('★印爆术 SFD-005:抽牌的是【那件装备的控制者】', () => {
  test('★★炸敌方装备 ⇒ 送对手抽两张(不是我抽)', () => {
    const st = scene([gear('foeGear', P2)])
    const before = handSize(st, P2)
    const after = applyEvents(st, play('SFD-005', {}, { target: 'foeGear' })(st), {}).state
    expect(handSize(after, P2)).toBe(before + 2)                 
    expect(handSize(after, P1)).toBe(0)
  })

  test('★炸自己的装备 ⇒ 我抽两张(同一条实现的另一头,㉑ 的对照组)', () => {
    const st = scene([gear('myGear', P1)])
    const after = applyEvents(st, play('SFD-005', {}, { target: 'myGear' })(st), {}).state
    expect(handSize(after, P1)).toBe(2)
    expect(handSize(after, P2)).toBe(0)
  })

  test('★候选只有装备,双方的都收(卡文没写敌我)', () => {
    const st = scene([gear('mine'), gear('foe', P2), unit('u')])
    expect([...playSpecFor('SFD-005')!.legalTargets(st, P1)].sort()).toEqual(['foe', 'mine'])
  })
})

describe('★黑暗之女 OGS-017:与娑娜 OGN-073 成对', () => {
  const endTurn = { kind: 'endOfTurn' as const, player: P1 }
                                            
                                  
  const answerAll = (t: { nextChoice?: (s: GameState, ev: GameEvent, c: Record<string, string>) => { key: string; candidates: readonly { id: string; label?: string }[] } | null },
    st: GameState, ev: GameEvent, pickAll = true): Record<string, string> => {
    const chosen: Record<string, string> = {}
    for (let q = 0; q < 6; q++) {
      const req = t.nextChoice?.(st, ev, chosen)
      if (!req) break
      const done = req.candidates.find((c) => c.id === '__done__')
      const first = req.candidates.find((c) => c !== done) ?? req.candidates[0]!
      chosen[req.key] = (pickAll ? first : (done ?? first)).id
    }
    return chosen
  }

                                                         
  test('★868 按现行文本:「最多两枚」问链——不限敌我、选满封顶两枚、可一枚不选', () => {
    const st = scene([
      runeObj('mine1', P1, { status: { tapped: true } }),
      runeObj('foe1', P2, { status: { tapped: true } }),
      runeObj('foe2', P2, { status: { tapped: true } }),
      obj('annie', 'OGS-017', P1, { zone: asZoneId(`legend:${P1}`) }),
    ])
    const t = activeTriggers(st).find((x) => x.sourceOid === asObjId('annie'))!
                                      
    const q1 = t.nextChoice!(st, endTurn, {})
    expect(q1!.candidates.map((c) => c.id).filter((x) => x !== '__done__').sort()).toEqual(['foe1', 'foe2', 'mine1'])
                
    const evs = t.effect(st, endTurn, answerAll(t as never, st, endTurn))
    expect(evs).toHaveLength(2)
    expect(evs.every((e) => (e as { key: string }).key === 'tapped')).toBe(true)                   
                         
    expect(t.effect(st, endTurn, answerAll(t as never, st, endTurn, false)), '★§355.13 可一枚不选').toHaveLength(0)
  })

  test('★★只挑【横置着的】,已经活跃的不进候选(★868 问链形态)', () => {
    const st = scene([
      runeObj('active', P1),
      runeObj('tapped1', P1, { status: { tapped: true } }),
      obj('annie', 'OGS-017', P1, { zone: asZoneId(`legend:${P1}`) }),
    ])
    const t = activeTriggers(st).find((x) => x.sourceOid === asObjId('annie'))!
    const q = t.nextChoice!(st, endTurn, {})
    expect(q!.candidates.map((c) => c.id).filter((x) => x !== '__done__'), '★活跃的不进候选').toEqual(['tapped1'])
    const evs = t.effect(st, endTurn, answerAll(t as never, st, endTurn))
    expect(evs.map((e) => (e as { target: string }).target)).toEqual(['tapped1'])
  })

  test('★★对手的回合结束不响(eventPlayerIs)——走真触发流程(⑯)', () => {
    const mk = () => scene([
      runeObj('r', P1, { status: { tapped: true } }),
      obj('annie', 'OGS-017', P1, { zone: asZoneId(`legend:${P1}`) }),
    ])
    const fire = (player: string): number => {
      const st = mk()
      const ev: GameEvent = { kind: 'endOfTurn', player: player as never }
      return landAndEnqueueTriggers(st, [ev], activeTriggers, player as never, {}).chain.length
    }
    expect(fire(P1)).toBe(1)               
    expect(fire(P2)).toBe(0)                                          
  })
})

describe('★往日阴影 VEN-103:任意废牌堆 → 所属者手牌', () => {
  test('★★双方废牌堆都能挑,而且回的是【各自所属者】的手牌', () => {
    const st = scene([
      unit('mineDead', P1, { zone: asZoneId(`discard:${P1}`) }),
      unit('foeDead', P2, { zone: asZoneId(`discard:${P2}`) }),
    ])
    const req = nc('VEN-103')(st, {})!
    expect(req.controller).toBe(P1)             
    expect(req.candidates.map((c) => c.id).filter((i) => i !== '__done__').sort())
      .toEqual(['foeDead', 'mineDead'])                       
    const after = applyEvents(st,
      play('VEN-103', { echoesPast0: 'mineDead', echoesPast1: 'foeDead' })(st), {}).state
    expect(handDefIds(after, P1)).toEqual(['BLK'])
    expect(handDefIds(after, P2)).toEqual(['BLK'])                   
  })

  test('★废牌堆里的非单位不算;场上的单位也不算', () => {
    const st = scene([
      gear('gearDead', P1, { zone: asZoneId(`discard:${P1}`) }),
      unit('alive', P1),
      unit('dead', P1, { zone: asZoneId(`discard:${P1}`) }),
    ])
    const req = nc('VEN-103')(st, {})!
    expect(req.candidates.map((c) => c.id).filter((i) => i !== '__done__')).toEqual(['dead'])
  })

  test('★「最多两名」两头压:含零个 / 封顶两个(㉙)', () => {
    const three = ['a', 'b', 'c'].map((x) => unit(x, P1, { zone: asZoneId(`discard:${P1}`) }))
    const st = scene(three)
    expect(nc('VEN-103')(st, {})).not.toBeNull()
    expect(play('VEN-103', {})(st)).toEqual([])                                        
    expect(nc('VEN-103')(st, { echoesPast0: 'a', echoesPast1: 'b' })).toBeNull()      
    expect(play('VEN-103', { echoesPast0: 'a', echoesPast1: 'b', echoesPast2: 'c' })(st)).toHaveLength(2)
  })
})
