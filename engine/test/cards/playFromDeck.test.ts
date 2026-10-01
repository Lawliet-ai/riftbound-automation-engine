import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind, cardCost } from '../../data/registry'
import { controlsBattlefield } from '../../src/state/battlefieldControl'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import { seedRunes } from '../../src/game/economy'
import type { GameEvent } from '../../src/loop/events'

                                                              
                                                       
                                          
                                                        
                                                            
  
                                                        
                                                                  
                                                          
                                                            
                                                                  
                                                                          
                                                              
                                                                       
                                              
  
                                     
                         
                                                
                                                           
                                   
                                                     
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function o(id: string, defId: string, zone: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}

   
                                         
                                                     
                                                             
   
function scene(deckTopDown: readonly { id: string; defId: string }[], runes: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const rek = o('rek', 'SFD-170', BF0)
  objects[rek.oid] = rek
  zones[BF0] = { ...zones[BF0]!, contents: [...zones[BF0]!.contents, rek.oid] }
  for (const c of [...deckTopDown].reverse()) { // 尾=顶 ⇒ 倒着塞
    const g = o(c.id, c.defId, `mainDeck:${P1}`)
    objects[g.oid] = g
    zones[`mainDeck:${P1}`] = { ...zones[`mainDeck:${P1}`]!, contents: [...zones[`mainDeck:${P1}`]!.contents, g.oid] }
  }
  let s: GameState = { ...base, activePlayer: P1, phase: 'main', objects, zones }
  if (runes > 0) s = seedRunes(s, P1, 'yellow', runes)
  return s
}

const attackEv = (): GameEvent => ({ kind: 'attack', unit: asObjId('rek'), player: P1, battlefield: BF0 })

                                            
function run(st: GameState, picks: Record<string, string> = {}): { state: GameState; asked: string[] } {
  const asked: string[] = []
  let s = landAndEnqueueTriggers(st, [attackEv()], activeTriggers, P1, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 5; q++) {
        const req = it.nextChoice?.(s, chosen)                        
        if (!req) break
        asked.push(req.key)
        const want = picks[req.key]
        const hit = want === undefined ? undefined : req.candidates.find((c) => c.id === want)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
                                                                       
                                                                        
                                                              
                                                                        
      s = landAndEnqueueTriggers(s, it.resolve(s, chosen, it), activeTriggers, P1, {})
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return { state: s, asked }
}
const topDown = (s: GameState): string[] =>
  [...(s.zones[`mainDeck:${P1}`]?.contents ?? [])].reverse() as string[]
                                                     
const defIdsIn = (s: GameState, zone: string): string[] =>
  (s.zones[zone]?.contents ?? []).map((oid) => s.objects[oid]?.defId ?? '?')
const activeRunes = (s: GameState): number =>
  Object.values(s.objects).filter((x) => x.defId.startsWith('rune:') && x.controller === P1 && x.status.tapped !== true).length

                                                  
const NEWBIE = 'OGN-136'
                                          
const SPELL = 'OGN-169'

describe('★雷克塞 SFD-170 与 §419.3 从牌堆打出通道', () => {
  test('前提:三处登记齐、费用 5+1黄pip、道具卡的类别就是我以为的那样', () => {
    expect(cardKind('SFD-170')).toBe('unit')
    expect(cardCost('SFD-170').mana).toBe(5)
    expect(cardCost('SFD-170').pips).toEqual([['yellow']])
    expect(specLookup('SFD-170').baseMight).toBe(5)                     
    expect(cardKind(NEWBIE)).toBe('unit')
    expect(cardKind(SPELL)).toBe('spell')
    expect(cardCost(NEWBIE).mana).toBe(2)
  })

                                                 
                                                   
                                              
                                                           
  test('★★★【自证①】走真流程:advanceFepr 在**确认阶段**就问,项目还是 pending;答「不执行」⇒ 项目离链、牌堆纹丝不动', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const fired = landAndEnqueueTriggers(st, [attackEv()], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind, '★★★确认阶段就问了(不是 decision = 进 FEPR 优先权轮)').toBe('choice')
    expect(step.state.chain.some((i: { readonly status: string }) => i.status === 'pending'),
      '★★★问的时候项目还没确认 ⇒ 对手还没拿到优先权').toBe(true)
    const req = (step as Extract<typeof step, { kind: 'choice' }>).request
    expect(req.candidates.map((c) => c.id).sort(), '★★★这一问是【要不要执行】').toEqual(['no', 'yes'])
                                                
    const declined = advanceFepr(
      { ...step.state, resolveChoices: { ...(step.state.resolveChoices ?? {}), [req.key]: 'no' } }, {})
    expect(declined.state.chain.filter((i: { readonly id: string }) => i.id.includes('SFD-170:play')),
      '★★★答了不执行 ⇒ 这个项目已离链').toHaveLength(0)
    expect(topDown(declined.state), '★牌堆纹丝不动').toEqual(['t1', 't2', 'd3', 'd4'])
  })

  test('★★【自证②】结算期候选表里【只剩㈡那一问】——「展示不展示」不在里面了', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const t = activeTriggers(st).find((x) => x.id.includes(':play:'))!
    expect(t.mayChoose, '★★§383.3.a:㈠ 那一问在确认阶段').toBe(true)
    const req = t.nextChoice?.(st, attackEv(), {})
    expect(req?.key, '★结算期第一问直接就是「放逐哪张」').toBe('play')
                                            
    expect(req!.candidates.map((c) => c.id), '★候选里没有 yes/no 那一档了').toEqual(['t1', 't2', 'skip'])
                                                       
    expect(req!.candidates.find((c) => c.id === 'skip')?.label, '★★㈡ 的退出口照旧').toBe('不放逐')
  })

  test('★★牌堆空时**仍然会问**「要不要执行」(§420 收益落空 ≠ 不触发;旧的收益门已放开)', () => {
                                                     
                                                         
    const empty = scene([], 5)
    const fired = landAndEnqueueTriggers(empty, [attackEv()], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind).toBe('choice')
    const req = (step as Extract<typeof step, { kind: 'choice' }>).request
    expect(req.candidates.map((c) => c.id).sort()).toEqual(['no', 'yes'])
                                              
    const t = activeTriggers(empty).find((x) => x.id.includes(':play:'))!
    expect(t.nextChoice?.(empty, attackEv(), {}), '★前提自证:牌堆空 ⇒ 结算期不弹问').toBeNull()
  })

  test('★展示但不打出(㈡ 答「不放逐」)⇒ 顶两张【全部】回收', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const { state, asked } = run(st, { play: 'skip' })
    expect(asked, '★结算期只问㈡ 这一问').toEqual(['play'])
    expect(topDown(state).slice(0, 2)).toEqual(['d3', 'd4'])
  })

  test('★展示但不打出 ⇒ 顶两张【全部】回收,顶换成 d3、d4', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const { state } = run(st, { play: 'skip' })
    expect(topDown(state).slice(0, 2)).toEqual(['d3', 'd4'])
    expect(new Set(topDown(state).slice(2))).toEqual(new Set(['t1', 't2']))
  })

  test('★打出一张单位:它离开牌堆、以【休眠】状态进场,只剩的那张被回收(回收张数按有没有打出现算)', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const { state } = run(st, { play: 't1', to: `base:${P1}` })
    expect(defIdsIn(state, `base:${P1}`).filter((d) => d === NEWBIE)).toHaveLength(1)
    const placed = (state.zones[`base:${P1}`]!.contents).map((x) => state.objects[x]!).find((x) => x.defId === NEWBIE)!
    expect(placed.status.dormant).toBe(true)                    
                                          
    expect(topDown(state)).toEqual(['d3', 'd4', 't2'])
  })

  test('★§419.3.b 真的付费:打出 2 费单位后,可用符文少了 2 枚', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const before = activeRunes(st)
    const { state } = run(st, { play: 't1', to: `base:${P1}` })
    expect(activeRunes(state)).toBe(before - 2)              
  })

  test('★★★§419.3.c 付不起:牌**照样被放逐**,只是打出那一步不发生(errata 改动点)', () => {
                           
                                                 
                                                           
                                                            
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 0)
    const { state, asked } = run(st, { play: 't1' })
    expect(asked).toEqual(['play'])                       
    expect(defIdsIn(state, `exile:${P1}`), '牌进了放逐区').toContain(NEWBIE)
    expect(defIdsIn(state, `base:${P1}`), '但没被打出来(付不起)').not.toContain(NEWBIE)
    expect(topDown(state).slice(0, 1)).toEqual(['d3'])               
  })

  test('★★★法术:**放逐照做**,打出那一步不发生(§359.3 法术要停在结算链上)', () => {
                                         
                                              
    const st = scene([{ id: 't1', defId: SPELL }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const t = activeTriggers(st).find((x) => x.id.includes(':play:'))!
    const req = t.nextChoice?.(st, attackEv(), {})
    expect(req?.key).toBe('play')
    expect(req!.candidates.map((c) => c.id), '法术也在候选里(放逐不挑类别)').toEqual(['t1', 't2', 'skip'])
                        
    const { state } = run(st, { play: 't1' })
    expect(defIdsIn(state, `exile:${P1}`)).toContain(SPELL)
    expect(defIdsIn(state, `base:${P1}`)).not.toContain(SPELL)
  })

  test('★★★★落点在【句②】问,不在句①(铁律240:接力读不到前一段的 chosen)', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
                                                
    const t1 = activeTriggers(st).find((x) => x.id.includes(':play:'))!
    expect(t1.nextChoice?.(st, attackEv(), { play: 't1' }), '句①问完就该收口').toBeNull()
                         
    const banished = applyEvents(st, [{ kind: 'banish', target: asObjId('t1'), by: asObjId('rek') } as GameEvent], {})
    const card = (banished.events.find((e) => e.kind === 'banished') as { card: string }).card
    const t2 = activeTriggers(banished.state).find((x) => x.id.includes(':relay:'))!
    const req = t2.nextChoice?.(banished.state, { kind: 'banished', player: P1, card: asObjId(card), defId: NEWBIE } as GameEvent, {})
    expect(req?.key).toBe('to')
    expect(req!.candidates.map((c) => c.id)).toEqual([`base:${P1}`, BF0])
    // ⚠️ 这里 BF0 出现在候选里其实**有两个理由**:①卡文授权的「此处」;
    //   ②雷克塞独占着 BF0 ⇒ `controlsBattlefield` 本来就算我控制(§190.4)。
    //   ⇒ **这条用例分不出是哪个理由在起作用**(第270轮破坏验证当场证过:
    //     把「此处」授权拿掉,这条照样全绿 —— 那是一条冗余 guard)。真判据在下一条。
  })

  test('★★★★「此处」的授权是**真的在起作用**:造一处【我并不控制】的战场', () => {
                                             
                                                                 
                                                
    const st0 = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const foe = o('foe', NEWBIE, BF0, P2)
    const st: GameState = {
      ...st0,
      objects: { ...st0.objects, [foe.oid]: foe },
      zones: { ...st0.zones, [BF0]: { ...st0.zones[BF0]!, contents: [...st0.zones[BF0]!.contents, foe.oid] } },
    }
                             
    expect(controlsBattlefield(st, P1, BF0), '前提:敌方单位在场 ⇒ 我不控制这处').toBe(false)
    const banished = applyEvents(st, [{ kind: 'banish', target: asObjId('t1'), by: asObjId('rek') } as GameEvent], {})
    const card = (banished.events.find((e) => e.kind === 'banished') as { card: string }).card
    const t2 = activeTriggers(banished.state).find((x) => x.id.includes(':relay:'))!
    const req = t2.nextChoice?.(banished.state, { kind: 'banished', player: P1, card: asObjId(card), defId: NEWBIE } as GameEvent, {})
    expect(req?.candidates.map((c) => c.id), 'BF0 还在 ⇒ 只可能是「此处」授的').toEqual([`base:${P1}`, BF0])
  })

  test('★选「此处」⇒ 单位真的落在那处战场上(不是落回基地)', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const { state } = run(st, { play: 't1', to: BF0 })
    expect(defIdsIn(state, BF0)).toContain(NEWBIE)
    expect(defIdsIn(state, `base:${P1}`)).not.toContain(NEWBIE)
  })

  test('★§419.3.c 执行侧也必须拒:付不起时【一个动作都不做】(不是先扣一半再说)', () => {
                                        
                                         
                                                   
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 0)           
    const r = applyEvents(st, [{
      kind: 'playUnit', unit: asObjId('t1'), player: P1,
      play: { card: asObjId('t1'), to: asZoneId(`base:${P1}`), cost: { mana: 2 } },
    }], {})
    expect(defIdsIn(r.state, `base:${P1}`)).not.toContain(NEWBIE)        
    expect(topDown(r.state)).toEqual(['t1', 't2', 'd3', 'd4'])          
    expect(r.events.filter((e) => e.kind === 'playUnit')).toEqual([])           
  })

  test('★★★★errata 的整条路径:放逐 → 从【放逐区】打出 → 其余回收(一次跑通)', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const { state } = run(st, { show: 'yes', play: 't1', to: `base:${P1}` })
                                               
    expect(topDown(state), 't1 已离堆').toEqual(['d3', 'd4', 't2'])
    expect(defIdsIn(state, `exile:${P1}`), '放逐区是中转站,不该留人').not.toContain(NEWBIE)
                             
    const placed = (state.zones[`base:${P1}`]!.contents).map((x) => state.objects[x]!).find((x) => x.defId === NEWBIE)!
    expect(placed.status.dormant).toBe(true)
                                   
    expect(topDown(state).slice(0, 2)).toEqual(['d3', 'd4'])
  })

  test('★★★★接力认人:【别人】放逐的牌不归雷克塞打(断言落在**入没入链**上)', () => {
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const banish = (by: string): GameEvent =>
      ({ kind: 'banish', target: asObjId('t1'), by: asObjId(by) } as GameEvent)
                                                     
                                          
    const mine = landAndEnqueueTriggers(st, [banish('rek')], activeTriggers, P1, {})
    expect(mine.chain.filter((c: { id: string }) => c.id.includes(':relay:')),
      '我放逐的 ⇒ 接力应当入链').toHaveLength(1)
    const theirs = landAndEnqueueTriggers(st, [banish('someone-else')], activeTriggers, P1, {})
    expect(theirs.chain.filter((c: { id: string }) => c.id.includes(':relay:')),
      '别人放逐的 ⇒ 一条都不该入链').toHaveLength(0)
  })

  test('★§419.4.a 打出信号带的是【落地后的新 oid】:「当你打出我时」类触发才认得出它', () => {
                                                      
    const st = scene([{ id: 't1', defId: NEWBIE }, { id: 't2', defId: NEWBIE },
      { id: 'd3', defId: NEWBIE }, { id: 'd4', defId: NEWBIE }], 5)
    const r = applyEvents(st, [{
      kind: 'playUnit', unit: asObjId('t1'), player: P1,
      play: { card: asObjId('t1'), to: asZoneId(`base:${P1}`), cost: { mana: 2 } },
    }], {})
    const landed = r.events.find((e) => e.kind === 'playUnit')!
    expect(landed.kind).toBe('playUnit')
    const unit = (landed as { unit: string }).unit
    expect(unit).not.toBe('t1')                 
    expect(r.state.objects[asObjId(unit)]?.defId).toBe(NEWBIE)                
    expect(r.state.objects[asObjId('t1')]).toBeUndefined()                
  })
})
