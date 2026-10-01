                                                  
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { effectiveMight } from '../../src/state/might'
import { recomputeContinuous, expireThisTurnEffects } from '../../src/effects/continuousView'
import { applyEvents } from '../../src/loop/reduce'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number, kws: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: kws, damage: 0, counters: {}, status: {} }
}
function scene(objs: GameObject[], bfCards?: Record<string, { defId: string; owner: typeof P1 }>): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, ...(bfCards ? { battlefieldCards: bfCards } : {}) }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 5; k++) {
    const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  s = seedRunes(s, P1, 'purple', 4)
  s = seedRunes(s, P2, 'blue', 4)
  return s
}
   
                                               
                                                        
                                                      
                                                   
                                     
   
const DAMAGE_ORDER_KEY = '§465.2.c.7:'
function walk(g: InteractiveGame, answers: Record<string, string> = {}): number {
  let prompts = 0
  for (let i = 0; i < 14; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      if (!p.request.key.startsWith(DAMAGE_ORDER_KEY)) prompts++
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: answers[p.request.key] ?? p.request.candidates[0]!.id })
      continue
    }
    break
  }
  return prompts
}

describe('审查B修复回归', () => {
  test('§466.7.a 战斗结束移除攻防身份 → 坚守2 不再永久加成(审查#9场景)', () => {
    const g = new InteractiveGame(scene([
      unit('golem', 'UNL-087', P1, BF0, 4, ['坚守2']),
      unit('weak', 'BLK', P2, BF0, 1),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    walk(g)
    const golem = Object.values(g.state.objects).find((o) => o.defId === 'UNL-087')!
    expect(golem.status.defending).not.toBe(true)                  
    expect(golem.status.attacking).not.toBe(true)
    expect(effectiveMight(g.state.objects[golem.oid]!).actual).toBe(4)         
  })

  test('§466.7.c thisCombat 效果在战斗结束时失效', () => {
    let s = scene([unit('u', 'BLK', P1, BF0, 2), unit('e', 'BLK', P2, BF0, 1)])
    s = { ...s, continuousEffects: [{ id: 'c1', duration: 'thisCombat', fromPassive: false, predicate: (o) => o.oid === 'u', modification: { kind: 'addMight', delta: 5 }, timestamp: 1 }] }
    const g = new InteractiveGame({ ...s, activePlayer: P2 }, DEPS)
    expect(g.state.continuousEffects).toHaveLength(1)
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    walk(g)
    expect(g.state.continuousEffects.filter((e) => e.duration === 'thisCombat')).toHaveLength(0)
  })

  test('效果层不再悬停:thisTurn 到期后战力回落(审查#29场景)', () => {
    let s = scene([unit('u', 'BLK', P1, BF0, 2)])
    s = recomputeContinuous({ ...s, continuousEffects: [{ id: 'buff', duration: 'thisTurn', fromPassive: false, predicate: (o) => o.oid === 'u', modification: { kind: 'addMight', delta: 3 }, timestamp: 1 }] })
    expect(effectiveMight(s.objects['u']!).actual).toBe(5)
    s = expireThisTurnEffects(s)           
    expect(s.continuousEffects).toHaveLength(0)
    expect(effectiveMight(s.objects['u']!).actual).toBe(2)             
  })

  test('§383.4.f.2.a 强化阵地每场战斗只触发一次(审查#2/#18/#34场景:2名防守单位)', () => {
    const g = new InteractiveGame(scene([
      unit('d1', 'BLK', P1, BF0, 2),
      unit('d2', 'BLK', P1, BF0, 2),
      unit('atk', 'BLK', P2, BF0, 3),
    ], { [BF0]: { defId: 'OGN-279', owner: P1 } }), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    const prompts = walk(g)
    expect(prompts).toBe(1)                      
  })

  test('★★★1019 同一盘面:§465.2.c.7 分伤选序【确实会问】—— 别把新行为藏进过滤器', () => {
                                          
                                                 
    const g = new InteractiveGame(scene([
      unit('d1', 'BLK', P1, BF0, 2),
      unit('d2', 'BLK', P1, BF0, 2),
      unit('atk', 'BLK', P2, BF0, 3),
    ], { [BF0]: { defId: 'OGN-279', owner: P1 } }), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    let asked = 0
    for (let i = 0; i < 14; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        if (p.request.key.startsWith(DAMAGE_ORDER_KEY)) {
          asked++
          expect(p.player, '★问的是分配方(进攻方 P2 的战力打防守方单位)').toBe(P2)
          expect(p.request.candidates.length, '★两名防守单位都是候选').toBe(2)
        }
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
        continue
      }
      break
    }
    expect(asked, '★3 点伤害打两个各需 2 点的 ⇒ 不够全杀 ⇒ 必问').toBeGreaterThanOrEqual(1)
  })

  test('★★★1019🔴🔴一次性凭据:战斗结算完,分伤答案必须【被删掉】', () => {
                                                                       
                                             
                                                          
                                         
                              
    const g = new InteractiveGame(scene([
      unit('d1', 'BLK', P1, BF0, 2),
      unit('d2', 'BLK', P1, BF0, 2),
      unit('atk', 'BLK', P2, BF0, 3),
    ], { [BF0]: { defId: 'OGN-279', owner: P1 } }), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    let answered = false
    for (let i = 0; i < 14; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        if (p.request.key.startsWith(DAMAGE_ORDER_KEY)) answered = true
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
        continue
      }
      break
    }
    expect(answered, '★前提:这一局确实答过分伤选序(否则下面是空转)').toBe(true)
    const leftover = Object.keys(g.state.ruleChoices).filter((k) => k.startsWith(DAMAGE_ORDER_KEY))
    expect(leftover, '★战斗结算完,这个战场的分伤答案一条都不许留').toEqual([])
  })

  test('军事家(单位级"当我防守时")仍然每个自己触发一次,不被玩家级信号误伤', () => {
    const g = new InteractiveGame(scene([
      unit('mil', 'OGN-121', P1, BF0, 2),
      unit('atk', 'BLK', P2, BF0, 3),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    const prompts = walk(g)
    expect(prompts).toBe(1)                 
  })
})

describe('审查B修复回归(第2批)', () => {
  test('§822.3 伏击:打出后【不】计为让过,对手仍得响应窗口(审查#19场景)', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-149', P1, 'hand:P1', 3, ['伏击']),
      unit('anchor', 'BLK', P1, BF0, 2),
      unit('bolt', 'DEMO-BOLT', P2, 'hand:P2', 0),
      unit('foe', 'BLK', P2, BF0, 2),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!)
    g.apply({ kind: 'PASS', player: P2 })                 
    const ambush = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')!
    g.apply(ambush)
                                                   
    const p = g.pending()
    expect(p.mode).toBe('window')                                       
    expect(g.state.chain.length).toBeGreaterThan(0)             
    expect(g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]?.defId)).toContain('UNL-149')         
  })

  test('§822.3 该处已无己方单位 → 伏击权限失效,打出被拒', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-149', P1, 'hand:P1', 3, ['伏击']),
      unit('foe', 'BLK', P2, BF0, 2), // BF0 只有敌方
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    expect(g.legalActions(P1).some((a) => a.kind === 'PLAY_UNIT')).toBe(false)
  })

                                     
    
                                       
                                                               
                                                                
                                                               
                                                          
                                                                
    
                                 
                                                                      
                                                                            
                                                          
                                                                     
                                                         
                                                          
                                                    
    
                                                  
                                           
                                                             
    
                                               
                                                 
                                                 
  test('★★★★★★★1349 §822.3【时间差】:枚举时合法,确认前锚点单位没了 ⇒ apply 被拒', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-149', P1, 'hand:P1', 3, ['伏击']),
      unit('anchor', 'BLK', P1, BF0, 2), // ★这枚就是伏击落点的凭据
      unit('bolt', 'DEMO-BOLT', P2, 'hand:P2', 0),
      unit('foe', 'BLK', P2, BF0, 2),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!)
    g.apply({ kind: 'PASS', player: P2 })                 
                                                
    expect(g.pending().mode, '★前提:P1 拿到反应窗口').toBe('window')
    const ambush = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && a.to === BF0)
    expect(ambush, '★前提:伏击到 BF0 这个动作枚举得出来(锚点单位还在)').toBeDefined()

                                                        
                                                                     
                                                                                  
                                                     
                                                                             
                                               
    const snap = g.snapshot()
    const drop = (st: GameState): GameState => ({
      ...st,
      objects: { ...st.objects, anchor: { ...st.objects[asObjId('anchor')]!, zone: asZoneId(`discard:${P1}`) } },
      zones: { ...st.zones, [BF0]: { ...st.zones[BF0]!, contents: st.zones[BF0]!.contents.filter((o) => o !== 'anchor') } },
    } as GameState)
    g.restore({ ...snap, state: drop(snap.state), window: { ...snap.window!, state: drop(snap.window!.state) } })
                                                
    expect(g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]?.controller), '★前提:BF0 只剩敌方')
      .not.toContain(P1)
                                       
                                                             
    const stillListed = g.legalActions(P1).some((a) => a.kind === 'PLAY_UNIT' && a.to === BF0)
    expect(stillListed, '★分因锚:记录枚举侧此刻的答案(改了实现要回来重读这条,别当噪音删掉)').toBe(false)

    g.apply(ambush!)
                                          
    expect(g.state.objects[asObjId('diana')]?.zone, '★§822.3 打出被拒 ⇒ 黛安娜还在手上').toBe(`hand:${P1}`)
    expect(g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]?.defId), '★BF0 没多出这张牌')
      .not.toContain('UNL-149')
  })

  test('★★★★★1349 对照组(防修过头):同一套动作【不移走】锚点 ⇒ 照样打得出', () => {
    const g = new InteractiveGame(scene([
      unit('diana', 'UNL-149', P1, 'hand:P1', 3, ['伏击']),
      unit('anchor', 'BLK', P1, BF0, 2),
      unit('bolt', 'DEMO-BOLT', P2, 'hand:P2', 0),
      unit('foe', 'BLK', P2, BF0, 2),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply(g.legalActions(P2).find((a) => a.kind === 'PLAY_CARD')!)
    g.apply({ kind: 'PASS', player: P2 })
    const ambush = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && a.to === BF0)
    expect(ambush, '★前提:与上一条同一个动作').toBeDefined()
    g.apply(ambush!)
                                               
                                  
    expect(g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]?.defId), '★这次真的落地了')
      .toContain('UNL-149')
  })

  test('牌堆约定统一(尾=顶):抽牌/洞察/召出都取同一端', () => {
    let s = scene([])
    const ids = ['bot', 'mid', 'top']
    for (const id of ids) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const g = new InteractiveGame(s, DEPS)
    const deckBefore = g.state.zones['mainDeck:P1']!.contents
    expect(deckBefore[deckBefore.length - 1]).toBe('top')       
                                
    const after = applyEvents(g.state, [{ kind: 'draw', player: P1, count: 1 }], {}).state
    expect(after.zones['mainDeck:P1']!.contents).toHaveLength(deckBefore.length - 1)
    expect(after.zones['mainDeck:P1']!.contents.map(String)).not.toContain('top')           
    expect(after.zones['mainDeck:P1']!.contents.map(String)).toContain('bot')         
  })

  test('§416.1 卡牌骗术"回收其余"落牌堆【底】而非顶(审查#1/#30场景)', () => {
    let s = scene([unit('pt', 'OGN-183', P1, 'hand:P1', 0)])
    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const g = new InteractiveGame(s, DEPS)
                         
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && g.state.objects[(a as { cardOid: string }).cardOid]?.defId === 'OGN-183')!)
    walk(g)                
    const deck = g.state.zones['mainDeck:P1']!.contents
                                                   
    const topOne = g.state.objects[deck[deck.length - 1]!]
    expect(topOne?.oid).toBe('c1')                                    
                                              
    const bottom2 = [deck[0]!, deck[1]!].map((o) => g.state.objects[o]?.defId)
    expect(bottom2.every((d) => d === 'BLK')).toBe(true)
  })
})

describe('审查B修复回归(第3批)', () => {
  test('§814.2 同名坚守多来源【相加】不被去重(审查#10场景:两次给予坚守)', () => {
    let s = scene([unit('u', 'BLK', P1, BF0, 3)])
    s = { ...s, objects: { ...s.objects, u: { ...s.objects['u']!, status: { defending: true } } },
      continuousEffects: [
        { id: 'g1', duration: 'thisTurn', fromPassive: false, predicate: (o) => o.oid === 'u', modification: { kind: 'grantKeyword', keyword: '坚守' }, timestamp: 1 },
        { id: 'g2', duration: 'thisTurn', fromPassive: false, predicate: (o) => o.oid === 'u', modification: { kind: 'grantKeyword', keyword: '坚守' }, timestamp: 2 },
      ] }
    s = recomputeContinuous(s)
    expect(effectiveMight(s.objects['u']!).actual).toBe(5)                        
  })

  test('§814.2 印刷坚守2 + 获得坚守 = +3(强强魄罗形态)', () => {
    let s = scene([unit('g', 'UNL-087', P1, BF0, 4, ['坚守2'])])
    s = { ...s, objects: { ...s.objects, g: { ...s.objects['g']!, status: { defending: true } } },
      continuousEffects: [{ id: 'g1', duration: 'thisTurn', fromPassive: false, predicate: (o) => o.oid === 'g', modification: { kind: 'grantKeyword', keyword: '坚守' }, timestamp: 1 }] }
    s = recomputeContinuous(s)
    expect(effectiveMight(s.objects['g']!).actual).toBe(7)         
  })

  test('§820.2.a 回响可为额外执行另选目标(审查#6场景:两个进攻单位各眩晕一次)', () => {
    const g = new InteractiveGame(scene([
      unit('ea', 'UNL-134', P1, 'hand:P1', 0),
      unit('atkA', 'BLK', P2, BF0, 3),
      unit('atkB', 'BLK', P2, BF0, 3),
    ]), DEPS)
    g.state = { ...g.state, objects: {
      ...g.state.objects,
      atkA: { ...g.state.objects['atkA']!, status: { attacking: true } },
      atkB: { ...g.state.objects['atkB']!, status: { attacking: true } },
    } }
                                                                       
                                                                   
    g.restore({ ...g.snapshot(), pendingCombat: { battlefield: BF0, attacker: P2, defender: P1 } })
                        
    const act = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && a.target === 'atkA' && (a as { echoTarget?: string }).echoTarget === 'atkB')
    expect(act).toBeDefined()                         
    g.apply(act!)
    walk(g)
    expect(g.state.objects['atkA']!.status.stunned).toBe(true)
    expect(g.state.objects['atkB']!.status.stunned).toBe(true)           
  })

  test('换换乐用计算层差值:互换后既有增益不被二次叠加', () => {
    const g = new InteractiveGame(scene([
      unit('hh', 'SFD-145', P1, 'hand:P1', 0),
      unit('wk', 'BLK', P1, BF0, 1),
      unit('st', 'BLK', P2, BF0, 4),
    ]), DEPS)
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && String(x.target).includes('wk'))!)
    walk(g)
    expect(effectiveMight(g.state.objects['wk']!).actual).toBe(4)
    expect(effectiveMight(g.state.objects['st']!).actual).toBe(1)
                                        
    const s2 = recomputeContinuous({ ...g.state, continuousEffects: [...g.state.continuousEffects,
      { id: 'buff', duration: 'thisTurn', fromPassive: false, predicate: (o) => o.oid === 'wk', modification: { kind: 'addMight', delta: 2 }, timestamp: 99 }] })
    expect(effectiveMight(s2.objects['wk']!).actual).toBe(6)
  })
})

describe('审查B修复回归(第4批·收尾)', () => {
  test('§429.2 皎月女神获资源快捷结算:不入链、不开反应窗口、优先权不传递', () => {
    let s = scene([])
    s = { ...s, objects: { ...s.objects, moon: unit('moon', 'UNL-197', P1, 'legend:P1', 0) },
      zones: { ...s.zones, 'legend:P1': { ...s.zones['legend:P1']!, contents: [asObjId('moon')] } } }
    const g = new InteractiveGame(s, { ...DEPS, activatedFor })
                                                                   
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === 'moon')
    expect(act).toBeDefined()
    g.apply(act!)
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })                     
    expect(g.state.chain).toHaveLength(0)       
    expect(g.state.runePools['P1']!.duelMana).toBe(1)
  })

  test('§430.3 符文牌堆不足时召休眠符文:不误横置既有活跃符文(审查#25场景)', () => {
    let s = scene([])
    s = seedRunes(s, P1, 'purple', 2)            
                                     
    const before = s.zones['base:P1']!.contents.filter((o) => s.objects[o]!.status.tapped !== true).length
    const after = applyEvents(s, [{ kind: 'summonRune', player: P1, count: 1, dormant: true }], {}).state
    const activeAfter = after.zones['base:P1']!.contents.filter((o) => after.objects[o]!.status.tapped !== true).length
    expect(activeAfter).toBe(before)                         
  })

  test('装备不算单位:鬼影湾对"装备返手"不触发(审查#8场景)', () => {
    const g = new InteractiveGame(scene([
      unit('satchel', 'OGN-181', P1, BF0, 0), // 装备在战场
    ], { [BF0]: { defId: 'UNL-214', owner: P1 } }), DEPS)
    const s2 = applyEvents(g.state, [{ kind: 'zoneChange', obj: asObjId('satchel'), to: asZoneId('hand:P1') }], { triggerSource: activeTriggers }).state
                     
    expect(s2.chain.filter((i) => i.id.includes('UNL-214'))).toHaveLength(0)
  })
})

describe('委托人实测反馈修复(第4批):打出位置/休眠进场/标准移动/自动引战', () => {
  test('§355.2.a 单位默认打到【基地】;不可控战场不是有效位置', () => {
    const g = new InteractiveGame(scene([
      unit('u', 'BLK', P1, 'hand:P1', 2),
      unit('foe', 'BLK', P2, BF0, 2), // BF0 被敌方占着 → 非我方控制
    ]), DEPS)
    const dests = g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT').map((a) => (a as { to: string }).to)
    expect(dests).toContain('base:P1')          
    expect(dests).not.toContain(BF0)                               
  })

  test('§359.2.c 单位以【休眠】状态进场;唤醒阶段才变活跃', () => {
    const g = new InteractiveGame(scene([unit('u', 'BLK', P1, 'hand:P1', 2)]), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')!)
    walk(g)
    const played = g.state.zones['base:P1']!.contents.map((o) => g.state.objects[o]!).find((o) => o.defId === 'BLK')!
    expect(played.status.dormant).toBe(true)
                                           
    expect(g.legalActions(P1).some((a) => a.kind === 'MOVE' && (a as { oid: string }).oid === played.oid)).toBe(false)
  })

  test('§144 标准移动:活跃单位可从基地推上战场,费用=变休眠', () => {
    const g = new InteractiveGame(scene([unit('u', 'BLK', P1, 'base:P1', 2)]), DEPS)       
    const mv = g.legalActions(P1).find((a) => a.kind === 'MOVE' && (a as { to: string }).to === BF0)
    expect(mv).toBeDefined()
    g.apply(mv!)
    walk(g)
    const moved = g.state.zones[BF0]!.contents.map((o) => g.state.objects[o]!).find((o) => o.controller === P1)!
    expect(moved).toBeDefined()
    expect(moved.status.dormant).toBe(true)               
  })

  test('§316.7.a 移动到有敌方单位的战场 → 【自动】引发战斗(无需手动点)', () => {
    const g = new InteractiveGame(scene([
      unit('mine', 'BLK', P1, 'base:P1', 3),
      unit('foe', 'BLK', P2, BF0, 1),
    ]), DEPS)
                      
    expect(g.legalActions(P1).some((a) => a.kind === 'ATTACK')).toBe(false)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'MOVE' && (a as { to: string }).to === BF0)!)
    walk(g)
                          
    expect(g.state.lastCombat).toBeDefined()
    expect(g.state.lastCombat!.attacker).toBe(P1)
    expect(g.state.zones[BF0]!.contents.some((o) => g.state.objects[o]?.controller === P2)).toBe(false)
  })
})
