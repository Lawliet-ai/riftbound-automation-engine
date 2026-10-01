import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, scoringBonus } from '../../data/registry'
import * as registryAll from '../../data/registry'
import * as engineReduce from '../../src/loop/reduce'
import { specLookup } from '../../data/decks'
import { cardCost } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'

                                           
                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind }

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const spec = specLookup(defId)
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: defId === 'BLK' ? 2 : spec.baseMight, baseKeywords: spec.baseKeywords ?? [],
    damage: 0, counters: {}, status: {},
    ...(spec.baseTypes ? { baseTypes: spec.baseTypes } : {}),
    ...(spec.baseTags ? { baseTags: spec.baseTags } : {}),
    ...(spec.basePowerBonus !== undefined ? { basePowerBonus: spec.basePowerBonus } : {}),
    ...(spec.baseGrants ? { baseGrants: spec.baseGrants } : {}),
    ...extra,
  }
}

function scene(extra: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 4; k++) {
      const id = `deck${i++}`
      const c = obj(id, 'BLK', p, `mainDeck:${p}`)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
                     
  for (const p of [P1, P2]) {
    for (let k = 0; k < 2; k++) {
      const id = `rune${i++}`
      const c = obj(id, 'rune:red', p, `runeDeck:${p}`)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`runeDeck:${p}`]: { ...s.zones[`runeDeck:${p}`]!, contents: [...s.zones[`runeDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  return s
}

function drainAll(g: InteractiveGame, pickChoice?: (cands: readonly { id: string }[]) => string, max = 24): void {
  for (let i = 0; i < max; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      const answer = pickChoice ? pickChoice(p.request.candidates) : p.request.candidates[0]!.id
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer })
      continue
    }
    break
  }
}

                                                
function conquerWithWearer(gearDefId: string, pickChoice?: (cands: readonly { id: string }[]) => string, extraHand = 0): InteractiveGame {
  const extras: GameObject[] = [
    obj('wearer', 'BLK', P1, `base:${P1}`),
    obj('gear', gearDefId, P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
  ]
  for (let h = 0; h < extraHand; h++) extras.push(obj(`hand${h}`, 'BLK', P1, `hand:${P1}`))
  const g = new InteractiveGame(scene(extras), DEPS)
  g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
  drainAll(g, pickChoice)
  return g
}

describe('碎骨棒 SFD-118:当我征服一处战场时,召出一枚休眠的符文', () => {
  test('穿戴者征服 → 基地多一枚【休眠】符文', () => {
    const g = conquerWithWearer('SFD-118')
    expect(g.state.scores[P1]).toBe(1)        
    const baseRunes = g.state.zones[`base:${P1}` as never]!.contents
      .map((o) => g.state.objects[o]!).filter((o) => o.defId.startsWith('rune:'))
    expect(baseRunes).toHaveLength(1)
                                                              
    expect(baseRunes[0]!.status.tapped).toBe(true)
  })

  test('武装没贴人(自己在基地)→ 征服不触发(§150.2 没有"我")', () => {
    const g = new InteractiveGame(scene([
      obj('walker', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-118', P1, `base:${P1}`), // 未贴附
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'walker', to: BF0 })
    drainAll(g)
    expect(g.state.scores[P1]).toBe(1)
    const baseRunes = g.state.zones[`base:${P1}` as never]!.contents
      .map((o) => g.state.objects[o]!).filter((o) => o.defId.startsWith('rune:'))
    expect(baseRunes).toHaveLength(0)
  })
})

describe('多兰之戒 SFD-124:当我征服一处战场时,弃置一张手牌,然后抽一张牌', () => {
  test('有手牌:选一张弃,然后抽一张(手牌数不变、废牌堆+1)', () => {
    const g = conquerWithWearer('SFD-124', (cands) => cands[0]!.id, 2)
    expect(g.state.scores[P1]).toBe(1)
    expect(g.state.zones[`discard:${P1}` as never]!.contents).toHaveLength(1)        
    expect(g.state.zones[`hand:${P1}` as never]!.contents).toHaveLength(2)             
  })

  test('手牌为空:弃不了照样抽("然后"是顺序不是条件)', () => {
    const g = conquerWithWearer('SFD-124', undefined, 0)
    expect(g.state.scores[P1]).toBe(1)
    expect(g.state.zones[`discard:${P1}` as never]!.contents).toHaveLength(0)
    expect(g.state.zones[`hand:${P1}` as never]!.contents).toHaveLength(1)       
  })
})

describe('萃取 SFD-134 / 云游图鉴 SFD-086:金币家族', () => {
  const goldsAtBase = (g: InteractiveGame) =>
    g.state.zones[`base:${P1}` as never]!.contents.map((o) => g.state.objects[o]!).filter((o) => o.defId === 'token:金币')

  test('萃取:穿戴者征服 → 基地出一枚【横置】金币装备指示物', () => {
    const g = conquerWithWearer('SFD-134')
    expect(g.state.scores[P1]).toBe(1)
    const golds = goldsAtBase(g)
    expect(golds).toHaveLength(1)
    expect(golds[0]!.status.tapped).toBe(true)                         
    expect(golds[0]!.baseTypes).toContain('equipment')                
  })

  test('云游图鉴:穿戴者据守 → 两枚横置金币(回合开始计分步真实管线)', () => {
                                                
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, BF0),
      obj('gear', 'SFD-086', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    drainAll(g)
    g.apply({ kind: 'END_TURN', player: P2 })
    drainAll(g)
    expect(g.state.activePlayer).toBe(P1)
    expect(g.state.scores[P1]).toBe(1)        
    expect(goldsAtBase(g)).toHaveLength(2)
  })

  test('金币的 [反应] 技能:横置解除后激活 → 摧毁自己+获 1 枚任意符能', () => {
    const g = conquerWithWearer('SFD-134')
                            
    const gold = goldsAtBase(g)[0]!
    g.state = { ...g.state, objects: { ...g.state.objects, [gold.oid]: { ...gold, status: {} } } }
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === gold.oid)
    expect(acts).toHaveLength(1)
    g.apply(acts[0]!)
    expect(g.state.objects[gold.oid]).toBeUndefined()            
    const pool = g.state.runePools[P1]!
    expect(Object.values(pool.runes).reduce((a, b) => a + b, 0)).toBe(1)                  
  })

  test('横置中的金币不可激活([E] 费用付不了)', () => {
    const g = conquerWithWearer('SFD-134')
    const gold = goldsAtBase(g)[0]!
    expect(gold.status.tapped).toBe(true)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === gold.oid)
    expect(acts).toHaveLength(0)
  })
})

describe('移动触发族(unitMoved 骨架,循环第26轮)', () => {
  test('先锋之眼:穿戴者移动 → 终点打出一名 1[M] 随从', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-153', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
    const minions = g.state.zones[BF0 as never]!.contents
      .map((o) => g.state.objects[o]!).filter((o) => o.defId === 'token:随从')
    expect(minions).toHaveLength(1)
    expect(minions[0]!.baseMight).toBe(1)
    expect(g.state.scores[P1]).toBe(1)                        
  })

  test('悬摆之刃:穿戴者移动【到战场】→ 本回合 +2(基础2+加成1+2=5)', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('gear', 'VEN-011', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
    const w = g.state.objects['wearer' as never]!
    expect(w.derived!.might).toBe(5)                  
  })

  test('移动回基地:悬摆之刃不触发("移动到一处【战场】")', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, BF0),
      obj('gear', 'VEN-011', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: `base:${P1}` })
    drainAll(g)
    const w = g.state.objects['wearer' as never]!
    expect(w.derived?.might ?? w.baseMight).toBe(3)                 
  })

  test('别的单位移动不触发(我=穿戴者)', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('other', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-153', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'other', to: BF0 })
    drainAll(g)
    const minions = g.state.zones[BF0 as never]!.contents
      .map((o) => g.state.objects[o]!).filter((o) => o.defId === 'token:随从')
    expect(minions).toHaveLength(0)
  })

  test('移动触发结算后,走进敌方战场照常开战(pendingMoveContest 衔接)', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-153', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
      obj('enemy', 'BLK', P2, BF0),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
                                               
    const minionSpawned = Object.values(g.state.objects).some((o) => o.defId === 'token:随从')
    expect(minionSpawned).toBe(true)
    expect(g.state.lastCombat).toBeDefined()                   
  })
})

describe('攻防触发族(attack 事件骨架,循环第27轮)', () => {
  test('炉火斗篷:穿戴者进攻 → 战斗开启时此处敌方各吃 2 点(先于伤害步)', () => {
                                                                
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-190', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
      obj('e1', 'BLK', P2, BF0),
      obj('e2', 'BLK', P2, BF0),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g, undefined, 40)
                                                 
    expect(g.state.zones[`discard:${P2}` as never]!.contents.length).toBeGreaterThanOrEqual(2)
    expect(g.state.objects['wearer' as never]).toBeDefined()
  })

  test('反曲之弓:穿戴者防守 → 点射一名敌方 2 点(结算期选目标)', () => {
                                                     
    let s = scene([
      obj('wearer', 'BLK', P1, BF0),
      obj('gear', 'SFD-016', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
      obj('raider', 'BLK', P2, `base:${P2}`),
    ])
    s = { ...s, activePlayer: P2 }
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'MOVE', player: P2, oid: 'raider', to: BF0 })
    drainAll(g, (cands) => cands[0]!.id, 40)
                                                        
    const raider = Object.values(g.state.objects).find((o) => o.oid === 'raider')
    const died = g.state.zones[`discard:${P2}` as never]!.contents.length >= 1
    expect(died || (raider !== undefined && raider.damage >= 2)).toBe(true)
  })

  test('未贴附的斗篷不触发(没有"我")', () => {
    const g = new InteractiveGame(scene([
      obj('lone', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-190', P1, `base:${P1}`), // 未贴附
      obj('e1', 'BLK', P2, BF0),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'lone', to: BF0 })
    drainAll(g, undefined, 40)
                                                          
    const e1 = g.state.objects['e1' as never]
    if (e1) expect(e1.damage).toBe(0)
  })
})

describe('指示物进场姿态(2026-08-03 委托人拍板:§359.2.c 默认休眠)', () => {
  test('先锋之眼移动出的随从【休眠】进场,当回合不能参战', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-153', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
    const minion = Object.values(g.state.objects).find((o) => o.defId === 'token:随从')!
    expect(minion.status.dormant).toBe(true)                            
  })

  test('金币(装备指示物)不受影响:装备 §149.1 活跃进场,卡文写"休眠的"才横置', () => {
    const g = conquerWithWearer('SFD-134')
    const gold = Object.values(g.state.objects).find((o) => o.defId === 'token:金币')!
    expect(gold.status.tapped).toBe(true)                    
    expect(gold.status.dormant).not.toBe(true)                    
  })
})

describe('D 档首批:三相之力(计分修正)/ 狂徒铠甲(征服给增益),循环第30轮', () => {
  test('三相之力:穿戴者据守 → 那次据守得 2 分(基础1+修正1);仍只一次得分行动', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, BF0),
      obj('gear', 'SFD-115', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
    ]), { ...DEPS, scoringBonus })
    g.apply({ kind: 'END_TURN', player: P1 })
    drainAll(g)
    g.apply({ kind: 'END_TURN', player: P2 })
    drainAll(g)
    expect(g.state.activePlayer).toBe(P1)
    expect(g.state.scores[P1]).toBe(2)          
  })

  test('三相之力只管据守:征服照旧 1 分', () => {
    const extras: GameObject[] = [
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('gear', 'SFD-115', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
    ]
    const g = new InteractiveGame(scene(extras), { ...DEPS, scoringBonus })
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
    expect(g.state.scores[P1]).toBe(1)
  })

  test('狂徒铠甲:穿戴者征服 → 获得一枚增益(战力 +1);已有增益则不再得(§702.3)', () => {
    const g = conquerWithWearer('SFD-108')
    const w = g.state.objects['wearer' as never]!
    expect(w.counters['buff']).toBe(1)
    expect(w.derived!.might).toBe(4)                 
  })
})

describe('守护天使 SFD-051:替换摧毁(循环第31轮)', () => {
  const gaDeps = () => ({ ...DEPS, replaceDestroy: (s: GameState, oid: string) => {
    const { replaceDestroy } = registryAll
    return replaceDestroy(s, oid as never)
  } })

  test('穿戴者受致命战斗伤害 → 改为摧毁守护天使;宿主 0 伤、休眠、回基地', () => {
                                                   
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('ga', 'SFD-051', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
      obj('e1', 'BLK', P2, BF0),
      obj('e2', 'BLK', P2, BF0),
    ]), gaDeps())
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g, undefined, 40)
    const w = g.state.objects['wearer' as never]
    expect(w).toBeDefined()      
    expect(w!.zone).toBe(`base:${P1}`)       
    expect(w!.damage).toBe(0)        
    expect(w!.status.dormant).toBe(true)      
                   
    const gaInDiscard = g.state.zones[`discard:${P1}` as never]!.contents
      .map((o) => g.state.objects[o]!).some((o) => o.defId === 'SFD-051')
    expect(gaInDiscard).toBe(true)
  })

  test('destroy 事件同一出口:显式摧毁也被替换', () => {
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, BF0),
      obj('ga', 'SFD-051', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
    ]), gaDeps())
                                           
    const { applyEvents } = engineReduce
    g.state = applyEvents(g.state, [{ kind: 'destroy', target: 'wearer' as never }], {
      cleanupHooks: { replaceDestroy: (s, oid) => registryAll.replaceDestroy(s, oid) },
    }).state
    expect(g.state.objects['wearer' as never]).toBeDefined()
    expect(g.state.objects['wearer' as never]!.zone).toBe(`base:${P1}`)
    expect(g.state.objects['ga' as never]).toBeUndefined()                      
  })

  test('天使用掉后再次致命 → 正常死(替换只有一次)', () => {
    const g = new InteractiveGame(scene([
      obj('lone', 'BLK', P1, BF0, { damage: 0 }),
    ]), gaDeps())
    g.state = engineReduce.applyEvents(g.state, [{ kind: 'damage', target: 'lone' as never, amount: 5 }], {
      cleanupHooks: { replaceDestroy: (s, oid) => registryAll.replaceDestroy(s, oid) },
    }).state
    expect(g.state.objects['lone' as never]).toBeUndefined()            
  })
})

describe('枯萎战斧 UNL-019:回合末未征服→卸除+4伤(endOfTurn 骨架,循环第32轮)', () => {
  test('本回合没征服:回合结束 → 战斧卸除(被召回基地)+ 穿戴者吃 4 点', () => {
                                        
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, BF0, { baseMight: 5 }),
      obj('axe', 'UNL-019', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    drainAll(g)
    const w = g.state.objects['wearer' as never]!
    expect(w.damage).toBe(0)                                            
                                                     
    const axe = Object.values(g.state.objects).find((o) => o.defId === 'UNL-019')!
    expect((axe.status as { attachedTo?: string }).attachedTo).toBeUndefined()       
    expect(axe.zone).toBe(`base:${P1}`)              
    expect(w.zone).toBe(BF0)                                   
  })

  test('顺序是卡文写死的:卸除在前 → 2力宿主被 4 伤打死', () => {
    const g = new InteractiveGame(scene([
      obj('weak', 'BLK', P1, BF0), // 2力,佩斧后6力;卸除后回2力,4伤致命
      obj('axe', 'UNL-019', P1, BF0, { status: { attachedTo: asObjId('weak') } }),
    ]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    drainAll(g)
    expect(g.state.objects['weak' as never]).toBeUndefined()      
    expect(g.state.zones[`discard:${P1}` as never]!.contents.length).toBeGreaterThanOrEqual(1)
  })

  test('本回合征服过:回合结束战斧不发作', () => {
                                            
    const g = new InteractiveGame(scene([
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('axe', 'UNL-019', P1, `base:${P1}`, { status: { attachedTo: asObjId('wearer') } }),
    ]), DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
    expect(g.state.scores[P1]).toBe(1)       
    g.apply({ kind: 'END_TURN', player: P1 })
    drainAll(g)
    const axe = Object.values(g.state.objects).find((o) => o.defId === 'UNL-019')!
    expect((axe.status as { attachedTo?: string }).attachedTo).toBe('wearer')      
    expect(g.state.objects['wearer' as never]!.zone).toBe(BF0)
  })

  test('对手回合结束不发作("你的回合结束时")', () => {
    let s = scene([
      obj('wearer', 'BLK', P1, BF0, { baseMight: 5 }),
      obj('axe', 'UNL-019', P1, BF0, { status: { attachedTo: asObjId('wearer') } }),
    ])
    s = { ...s, activePlayer: P2 }
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'END_TURN', player: P2 })            
    drainAll(g)
    const axe = Object.values(g.state.objects).find((o) => o.defId === 'UNL-019')!
    expect((axe.status as { attachedTo?: string }).attachedTo).toBe('wearer')       
  })
})

describe('§818.1.c.3 非资源装配费用(循环第35轮)', () => {
  test('牧人的传家宝:有 1 经验才能装配,付掉后经验归零、贴附成立', () => {
    const s0 = scene([obj('gear', 'UNL-158', P1, `base:${P1}`), obj('u', 'BLK', P1, BF0)])
    const g = new InteractiveGame({ ...s0, experience: { ...s0.experience, [P1]: 1 } }, DEPS)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'gear')
    expect(acts).toHaveLength(1)
    g.apply(acts[0]!)
    drainAll(g)
    expect(g.state.experience[P1]).toBe(0)                  
    expect((g.state.objects['gear' as never]!.status as { attachedTo?: string }).attachedTo).toBe('u')
  })

  test('经验不够 → 这个装配根本不是合法动作(§203.3 付不起就不列出)', () => {
    const g = new InteractiveGame(scene([obj('gear', 'UNL-158', P1, `base:${P1}`), obj('u', 'BLK', P1, BF0)]), DEPS)
    expect(g.state.experience[P1]).toBe(0)
    expect(g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'gear')).toHaveLength(0)
  })

  test('牧人的传家宝打出时获 1 经验(打出触发)', () => {
                                                  
    const g = new InteractiveGame(seedRunes(scene([obj('h', 'UNL-158', P1, `hand:${P1}`)]), P1, 'yellow', 3), { ...DEPS, cardCost })
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'h')
    expect(play).toBeDefined()
    g.apply(play!)
    drainAll(g)
    expect(g.state.experience[P1]).toBe(1)
  })

  test('破败王者之刃:非资源费需选牺牲谁 → 逐候选枚举;付费真的摧毁那个单位', () => {
    let s = scene([
      obj('gear', 'SFD-178', P1, `base:${P1}`),
      obj('host', 'BLK', P1, BF0),
      obj('lamb', 'BLK', P1, `base:${P1}`), // 待宰的友方单位
    ])
    s = seedRunes(s, P1, 'yellow', 2)
    const g = new InteractiveGame(s, DEPS)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'gear')
                                                            
    expect(acts.length).toBeGreaterThanOrEqual(4)
    const pick = acts.find((a) => (a as { target?: string }).target === 'host' && (a as { extraChoice?: string }).extraChoice === 'lamb')!
    expect(pick).toBeDefined()
    g.apply(pick)
    drainAll(g)
    expect(g.state.objects['lamb' as never]).toBeUndefined()          
    expect((g.state.objects['gear' as never]!.status as { attachedTo?: string }).attachedTo).toBe('host')
  })
})

                                                                     
  
                                                     
                                                                       
                                                
                                                     
                         
describe('★825 临终仪式 SFD-150:穿戴者征服 ⇒ 可从废牌堆打出一名单位(仍需付费)', () => {
                                   
  const CHEAP = 'OGN-136'

  function riteGame(opts: { attached: boolean; discardUnits: number }): InteractiveGame {
    const extras: GameObject[] = [
      obj('wearer', 'BLK', P1, `base:${P1}`),
      obj('rite', 'SFD-150', P1, `base:${P1}`,
        opts.attached ? { status: { attachedTo: asObjId('wearer') } } : {}),
    ]
    for (let i = 0; i < opts.discardUnits; i++) extras.push(obj(`dz${i}`, CHEAP, P1, `discard:${P1}`))
    let s = scene(extras)
    s = seedRunes(s, P1, 'orange', 6)                  
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'MOVE', player: P1, oid: 'wearer', to: BF0 })
    drainAll(g)
    return g
  }

  const cheapOnBoard = (g: InteractiveGame): number =>
    Object.values(g.state.objects).filter((o) => o.defId === CHEAP
      && (g.state.zones[o.zone]?.kind === 'battlefield' || g.state.zones[o.zone]?.kind === 'base')).length

  test('★贴附 + 废牌堆有单位 ⇒ 征服后那名单位真的上场了(废牌堆 -1)', () => {
    const g = riteGame({ attached: true, discardUnits: 1 })
    expect(g.state.scores[P1], '征服得分').toBe(1)
    expect(cheapOnBoard(g), '从废牌堆打出来了').toBe(1)
    expect(g.state.zones[`discard:${P1}` as never]!.contents
      .filter((o) => g.state.objects[o]?.defId === CHEAP), '不该还留在废牌堆').toHaveLength(0)
  })

  test('★★未贴附 ⇒ 一点动静都没有(§136.2.b 效果文本未激活、§721.2 未激活不触发)', () => {
    const g = riteGame({ attached: false, discardUnits: 1 })
    expect(g.state.scores[P1], '征服本身照常得分').toBe(1)
    expect(cheapOnBoard(g), '躺在基地没装配出去 ⇒ 这条技能在规则上还不存在').toBe(0)
    expect(g.state.zones[`discard:${P1}` as never]!.contents
      .filter((o) => g.state.objects[o]?.defId === CHEAP), '还老实待在废牌堆').toHaveLength(1)
  })

  test('★废牌堆里一张单位都没有 ⇒ 不入链(问一个做不到的选择没意义)', () => {
    const g = riteGame({ attached: true, discardUnits: 0 })
    expect(g.state.scores[P1]).toBe(1)
    expect(cheapOnBoard(g)).toBe(0)
  })

                                                  
                                                              
                                                                    
                                                
  test('★★句①装配:付紫 pip + 从废牌堆回收两张 ⇒ 真的贴附上去了', () => {
    let s = scene([
      obj('rite', 'SFD-150', P1, `base:${P1}`),
      obj('host', 'BLK', P1, BF0),
      obj('d0', 'BLK', P1, `discard:${P1}`),
      obj('d1', 'BLK', P1, `discard:${P1}`),
    ])
    s = seedRunes(s, P1, 'purple', 2)
    const g = new InteractiveGame(s, DEPS)
    const before = g.state.zones[`discard:${P1}` as never]!.contents.length
    expect(before, '回收前废牌堆两张').toBe(2)
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE'
      && (a as { oid?: string }).oid === 'rite' && (a as { target?: string }).target === 'host')
    expect(act, '装配技能要枚举得到').toBeDefined()
    g.apply(act!)
    drainAll(g)
    expect((g.state.objects['rite' as never]!.status as { attachedTo?: string }).attachedTo,
      '贴附到选中的宿主').toBe('host')
  })

                                                     
                         
                                                            
                                                         
                                                        
                                                              
                             
                                                                 
                                                       
  test('★★句①「从废牌堆回收两张」:废牌堆真的少两张(§416.1 不是洞察主牌堆)', () => {
    let s = scene([
      obj('rite', 'SFD-150', P1, `base:${P1}`),
      obj('host', 'BLK', P1, BF0),
      obj('d0', 'BLK', P1, `discard:${P1}`),
      obj('d1', 'BLK', P1, `discard:${P1}`),
    ])
    s = seedRunes(s, P1, 'purple', 2)
    const g = new InteractiveGame(s, DEPS)
    const before = g.state.zones[`discard:${P1}` as never]!.contents.length
    expect(before).toBe(2)
    const act = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE'
      && (a as { oid?: string }).oid === 'rite' && (a as { target?: string }).target === 'host')!
    expect(act, '废牌堆够两张 ⇒ 付得起 ⇒ 装配技能要枚举得到').toBeDefined()
    g.apply(act)
    drainAll(g)
    expect((g.state.objects['rite' as never]!.status as { attachedTo?: string }).attachedTo,
      '贴附到选中的宿主').toBe('host')
    expect(g.state.zones[`discard:${P1}` as never]!.contents.length,
      '§416.1 从废牌堆回收 ⇒ 废牌堆少两张').toBe(before - 2)
  })

  test('★★★§416.3 费用形态:废牌堆只有一张 ⇒ 付不起 ⇒ 装配技能【枚举不出来】', () => {
                                                                 
                                            
    let s = scene([
      obj('rite', 'SFD-150', P1, `base:${P1}`),
      obj('host', 'BLK', P1, BF0),
      obj('d0', 'BLK', P1, `discard:${P1}`), // 只有一张
    ])
    s = seedRunes(s, P1, 'purple', 2)
    const g = new InteractiveGame(s, DEPS)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE'
      && (a as { oid?: string }).oid === 'rite')
    expect(acts, '不足两张 ⇒ 这条装配根本不该出现在合法动作里').toHaveLength(0)
  })
})
