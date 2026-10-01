import { describe, expect, test } from 'vitest'
import { solvePayment, validatePayment, type Capacity } from '../src/state/runePool'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { InteractiveGame } from '../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost, cardKind } from '../data/registry'
import { payFromState, seedRunes } from '../src/game/economy'

   
                                               
  
            
                                                            
                               
                                                       
                                                         
                                                
                                                        
  
                                                            
                                                                     
   
const cap = (o: Partial<Capacity>): Capacity => ({ mana: 0, activeRunes: 0, energy: {}, runes: {}, ...o } as Capacity)

describe('★772 validatePayment:玩家宣告的付费方案合法吗', () => {
  test('★★★★★[A] 选色:池里有绿有紫,宣告用紫就付紫(自动解会挑绿)', () => {
    const c = cap({ energy: { green: 1, purple: 1 } })
    expect(solvePayment(c, { pips: [[]] })!.energyUsed, '自动解=先试到的那个域').toEqual({ green: 1 })
    const plan = validatePayment(c, { pips: [[]] }, { energyUsed: { purple: 1 } })
    expect(plan).not.toBeNull()
    expect(plan!.energyUsed).toEqual({ purple: 1 })
    expect(plan!.runesRecycled).toEqual({})
  })

  test('★★★★★通道选择:同一枚绿 pip,可以选「回收场上绿符文」而不是花池里的绿', () => {
    const c = cap({ energy: { green: 1 }, runes: { green: 1 } })
    expect(solvePayment(c, { pips: [['green']] })!.runesRecycled, '★758 默认先花池').toEqual({})
    const plan = validatePayment(c, { pips: [['green']] }, { runesRecycled: { green: 1 } })
    expect(plan!.runesRecycled).toEqual({ green: 1 })
    expect(plan!.energyUsed).toEqual({})
  })

  test('★★★★★域不匹配拒:pip 只收蓝,宣告红', () => {
    expect(validatePayment(cap({ energy: { red: 1, blue: 1 } }), { pips: [['blue']] }, { energyUsed: { red: 1 } })).toBeNull()
  })

  test('★★★★★不多花不少花:pip 数必须与宣告枚数完全相等', () => {
    const c = cap({ energy: { blue: 2 } })
    expect(validatePayment(c, { pips: [['blue']] }, { energyUsed: { blue: 2 } }), '多花').toBeNull()
    expect(validatePayment(c, { pips: [['blue'], ['blue']] }, { energyUsed: { blue: 1 } }), '少花').toBeNull()
    expect(validatePayment(c, { pips: [['blue']] }, {}), '一枚都没宣告').toBeNull()
    expect(validatePayment(c, { pips: [['blue'], ['blue']] }, { energyUsed: { blue: 2 } })).not.toBeNull()
  })

  test('★★★★★不超持有:池内扣减 / 回收枚数 / 横置枚数三道容量门', () => {
    expect(validatePayment(cap({ energy: { blue: 1 } }), { pips: [['blue'], ['blue']] }, { energyUsed: { blue: 2 } }), '池不够').toBeNull()
    expect(validatePayment(cap({ runes: { blue: 1 } }), { pips: [['blue'], ['blue']] }, { runesRecycled: { blue: 2 } }), '符文不够').toBeNull()
    expect(validatePayment(cap({ mana: 0, activeRunes: 1 }), { mana: 2 }, { manaFromPool: 0, runesTapped: 2 }), '活跃符文不够横置').toBeNull()
    expect(validatePayment(cap({ mana: 5 }), { mana: 2 }, { manaFromPool: 3, runesTapped: 0 }), '法力多付').toBeNull()
  })

  test('★★★★★法力通道:不宣告=与自动解同口径(池优先、不足才横置)', () => {
    const plan = validatePayment(cap({ mana: 2, activeRunes: 3, energy: { blue: 1 } }), { mana: 4, pips: [['blue']] }, { energyUsed: { blue: 1 } })
    expect(plan!.manaFromPool).toBe(2)
    expect(plan!.runesTapped).toBe(2)
  })

  test('★★★★★池内 [A] 通配可付任意 pip;但不存在"通配符文"', () => {
    expect(validatePayment(cap({ energy: { '*': 1 } }), { pips: [['red']] }, { energyUsed: { '*': 1 } })).not.toBeNull()
    expect(validatePayment(cap({ runes: { '*': 1 } }), { pips: [['red']] }, { runesRecycled: { '*': 1 } }), '符文一定有真实的域').toBeNull()
  })

  test('★★★★★完美匹配(不是逐 pip 贪心):[蓝|绿]+[绿] 两枚 pip', () => {
    const c = cap({ energy: { blue: 2, green: 2 } })
    const cost = { pips: [['blue', 'green'], ['green']] }
    expect(validatePayment(c, cost, { energyUsed: { blue: 1, green: 1 } }), '蓝付第一枚、绿付第二枚').not.toBeNull()
    expect(validatePayment(c, cost, { energyUsed: { green: 2 } }), '两枚都用绿也合法').not.toBeNull()
    expect(validatePayment(c, cost, { energyUsed: { blue: 2 } }), '第二枚 pip 只收绿 ⇒ 无解').toBeNull()
  })

  test('★★★★★脏输入:负数/小数/非数字一律拒(联机反作弊面)', () => {
    const c = cap({ energy: { blue: 5 } })
    expect(validatePayment(c, { pips: [['blue']] }, { energyUsed: { blue: -1 } as never })).toBeNull()
    expect(validatePayment(c, { pips: [['blue']] }, { energyUsed: { blue: 1.5 } as never })).toBeNull()
    expect(validatePayment(c, { mana: 1 }, { manaFromPool: '1' as never, runesTapped: 0 })).toBeNull()
  })
})

                                                                             
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function scene(): GameState {
  let s = createInitialState([P1, P2], 2)
  s = { ...s, activePlayer: P1, priority: null, phase: 'main' }
  s = seedRunes(s, P1, 'blue', 2)
  s = seedRunes(s, P1, 'red', 2)
  s = seedRunes(s, P2, 'blue', 2)                                
  return s
}
const runesOf = (s: GameState, p = P1): readonly string[] =>
  (s.zones[`base:${p}`]?.contents ?? []).filter((o) => s.objects[o]!.defId.startsWith('rune:'))
const domainsOf = (s: GameState, p = P1): string[] =>
  runesOf(s, p).map((o) => s.objects[o]!.defId.slice(5)).sort()

describe('★772 payFromState:玩家点名了就按他说的付', () => {
  test('★★★★★选色端到端:场上蓝2红2,付 [A] 宣告用红 ⇒ 红被回收、蓝一枚没动', () => {
    const s = scene()
    const auto = payFromState(s, P1, { pips: [[]] })
    expect(domainsOf(auto.state), '不传 pick=老行为(先试到的域)').toEqual(['blue', 'red', 'red'])
    const picked = payFromState(s, P1, { pips: [[]] }, undefined, { runesRecycled: { red: 1 } })
    expect(picked.ok).toBe(true)
    expect(domainsOf(picked.state)).toEqual(['blue', 'blue', 'red'])
  })

  test('★★★★★回收哪一枚:默认挑已横置的,点名了就回收点名那枚(活跃的也行)', () => {
    let s = scene()
    const blues = runesOf(s).filter((o) => s.objects[o]!.defId === 'rune:blue')
    const [tapped, active] = [blues[0]!, blues[1]!]
    s = { ...s, objects: { ...s.objects, [tapped]: { ...s.objects[tapped]!, status: { tapped: true } } } }
    const auto = payFromState(s, P1, { pips: [['blue']] })
    expect(runesOf(auto.state).includes(tapped), '默认:已横置的先走').toBe(false)
    const picked = payFromState(s, P1, { pips: [['blue']] }, undefined,
      { runesRecycled: { blue: 1 }, recycleOids: [active] })
    expect(runesOf(picked.state).includes(active), '点名活跃那枚 ⇒ 它走了').toBe(false)
    expect(runesOf(picked.state).includes(tapped), '横置那枚留下').toBe(true)
  })

  test('★★★★★横置哪几枚:tapOids 点名(默认是"将被回收的活跃符文优先")', () => {
    const s = scene()
    const reds = runesOf(s).filter((o) => s.objects[o]!.defId === 'rune:red')
    const r = payFromState(s, P1, { mana: 1 }, undefined, { tapOids: [reds[1]!] })
    expect(r.ok).toBe(true)
    expect(r.state.objects[reds[1]!]!.status.tapped).toBe(true)
    expect(r.state.objects[reds[0]!]!.status.tapped ?? false).toBe(false)
  })

  test('★★★★★★反作弊:别人的符文 / 不在基地 / 已横置的拿去横置 / 重复 oid / 域对不上 —— 一律整条作废', () => {
    const s = scene()
    const foeRune = runesOf(s, P2)[0]!
    const mine = runesOf(s).filter((o) => s.objects[o]!.defId === 'rune:blue')
    const bad = (pick: Parameters<typeof payFromState>[4]): void => {
      const r = payFromState(s, P1, { pips: [['blue']] }, undefined, pick)
      expect(r.ok).toBe(false)
      expect(r.state, '拒绝时局面一字不改').toBe(s)
    }
    bad({ runesRecycled: { blue: 1 }, recycleOids: [foeRune] })                      
    bad({ runesRecycled: { blue: 1 }, recycleOids: ['nope' as ObjId] })          
                                             
    const away = { ...s, objects: { ...s.objects, [mine[0]!]: { ...s.objects[mine[0]!]!, zone: asZoneId('runeDeck:P1') } } }
    const r0 = payFromState(away, P1, { pips: [['blue']] }, undefined, { runesRecycled: { blue: 1 }, recycleOids: [mine[0]!] })
    expect(r0.ok, '★不在基地的符文不能拿来付费').toBe(false)
    bad({ runesRecycled: { blue: 1 }, recycleOids: [mine[0]!, mine[1]!] })            
    bad({ runesRecycled: { blue: 2 }, recycleOids: [mine[0]!, mine[0]!] })          
    bad({ runesRecycled: { blue: 1 }, recycleOids: [runesOf(s).find((o) => s.objects[o]!.defId === 'rune:red')!] })      
                                        
    let t = scene()
    const red0 = runesOf(t).find((o) => t.objects[o]!.defId === 'rune:red')!
    t = { ...t, objects: { ...t.objects, [red0]: { ...t.objects[red0]!, status: { tapped: true } } } }
    const r = payFromState(t, P1, { mana: 1 }, undefined, { tapOids: [red0] })
    expect(r.ok).toBe(false)
    expect(r.state).toBe(t)
  })

  test('★★★★★宣告本身付不起 ⇒ 整条作废,绝不悄悄回落自动解(否则"我选了紫"会被付成绿)', () => {
    const s = scene()
    const r = payFromState(s, P1, { pips: [[]] }, undefined, { energyUsed: { green: 1 } })            
    expect(r.ok).toBe(false)
    expect(r.state).toBe(s)
  })

  test('★★★★★★★724 受限笔仍强制优先花:同色升级(回收永久符文 → 花掉那笔只能这么用的受限符能)', () => {
    let s = scene()
    s = { ...s, runePools: { ...s.runePools, [P1]: { mana: 0, runes: {}, restricted: [{ mana: 0, energy: { blue: 1 }, purposes: ['playSpell'] }] } } }
    const blue = runesOf(s).find((o) => s.objects[o]!.defId === 'rune:blue')!
                                                  
    const r = payFromState(s, P1, { pips: [['blue']] }, 'playSpell', { runesRecycled: { blue: 1 }, recycleOids: [blue] })
    expect(r.ok).toBe(true)
    expect(runesOf(r.state).length, '★符文一枚没少(受限笔顶上了)').toBe(4)
    expect(r.state.runePools[P1]!.restricted ?? [], '★受限笔被花光').toEqual([])
                            
    const r2 = payFromState(s, P1, { pips: [['blue']] }, 'playUnit', { runesRecycled: { blue: 1 }, recycleOids: [blue] })
    expect(runesOf(r2.state).length).toBe(3)
  })

  test('★★★★★不传 pick = 一字不变(零回归闸)', () => {
    const s = scene()
    const a = payFromState(s, P1, { mana: 2, pips: [['blue'], []] })
    const b = payFromState(s, P1, { mana: 2, pips: [['blue'], []] }, undefined, undefined)
    expect(a.ok).toBe(true)
    expect(domainsOf(b.state)).toEqual(domainsOf(a.state))
    expect(b.state.runePools[P1]).toEqual(a.state.runePools[P1])
  })
})

                                                                                
function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost, cardKind }
const BF0 = 'battlefield:shared:0'

                                                    
function standbyScene(): GameState {
  let s = createInitialState([P1, P2], 2)
  const objs = [unit('p1a', 'BLK', P1, BF0, 2), unit('cone', 'OGN-097', P1, 'hand:P1', 2)]
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  s = seedRunes(s, P1, 'blue', 2)
  s = seedRunes(s, P1, 'red', 2)
  return s
}

describe('★772 待命 §811.1.b:布置付的那 1 点 [A] 也要能选色(委托人点名)', () => {
  test('★★★★★布置待命宣告用红 ⇒ 回收红符文;不宣告=老行为(蓝)', () => {
    const g = new InteractiveGame(standbyScene(), DEPS)
    const place = g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY')!
    expect((place as { due?: unknown }).due, '★枚举带 due(纯展示):这一条要付 1 点 [A]').toEqual({ pips: [[]] })

    const auto = new InteractiveGame(standbyScene(), DEPS)
    auto.apply(auto.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY')!)
    expect(domainsOf(auto.state)).toEqual(['blue', 'red', 'red'])

    g.apply({ ...place, payWith: { runesRecycled: { red: 1 } } } as never)
    expect(domainsOf(g.state), '★玩家选了红 ⇒ 红那枚回符文牌堆底').toEqual(['blue', 'blue', 'red'])
    const sb = Object.values(g.state.zones).find((z) => z.kind === 'standby' && z.parentBattlefield === BF0)!
    expect(sb.contents, '牌照样盖着放上去了').toHaveLength(1)
  })

  test('★★★★★★伪造的 payWith ⇒ 整条动作被拒(局面一字不改,牌也没被盖上去)', () => {
    const g = new InteractiveGame(standbyScene(), DEPS)
    const place = g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY')!
    const before = g.state
    g.apply({ ...place, payWith: { runesRecycled: { green: 3 } } } as never)
    expect(g.state, '★服务端权威:客户端伪造付费方案 = 什么都没发生').toBe(before)
  })

  test('★★★★★枚举侧 due 是纯展示字段:伪造它一分钱都占不到便宜(apply 侧从 state 重算)', () => {
    const g = new InteractiveGame(standbyScene(), DEPS)
    const place = g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY')!
    g.apply({ ...place, due: { pips: [] } } as never)              
    expect(domainsOf(g.state).length, '★照样收了 1 点符能').toBe(3)
  })
})
