import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardKind, cardCost, cardKeywords, cardPassives, activeTriggers } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { specLookup } from '../../data/decks'
import { COUNT_SCALED_DEFIDS } from '../../data/cards/count-scaled-passives'
import { MUNDO_RECYCLE_COUNT, mundoRecycleCount, makeMundoStartTrigger, OGN_109, OGN_109_CARD_EFFECT } from '../../data/cards/OGN-109'

                                                      
                                                     
                                 
  
                                        
                                                    
                                            
                                                      
  
                                                 
                                                          
                                                                      
                                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
setCardPassiveProvider(cardPassives)

const mundo = (oid = 'md', ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-109', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 6, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const junk = (oid: string, owner = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner, controller: owner, zone: asZoneId(`discard:${owner}`),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState)
}
                       
const withJunk = (n: number, owner = P1, extra: readonly GameObject[] = []): GameState =>
  scene([mundo(), ...extra, ...Array.from({ length: n }, (_, i) => junk(`j${owner}${i}`, owner))])
const mightOf = (s: GameState, oid = 'md'): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId(oid)]!).actual
const trig = (selfOid = 'md', ctrl = P1) => makeMundoStartTrigger(asObjId(selfOid), ctrl)

describe('🔴🔴🔴★★★★★★585 蒙多医生:前提与接线', () => {
  test('★前提:8费 **2蓝pip**、战力 6、不印关键词', () => {
    expect(CARD_COSTS['OGN-109'], '★★★2 枚蓝 pip —— 照抄别人的 {mana} 写法会被 cardCosts 闸咬住')
      .toEqual({ mana: 8, pips: 2, colors: ['blue'] })
    expect(cardCost('OGN-109')).toEqual({ mana: 8, pips: [['blue'], ['blue']] })
    expect(cardKind('OGN-109')).toBe('unit')
    expect(specLookup('OGN-109').baseMight, '★卡面 6,不是被动加成后的数').toBe(6)
    expect(cardKeywords('OGN-109')).toEqual([])
    expect(OGN_109_CARD_EFFECT).toContain('提升我的战力，数值等同于你废牌堆的卡牌数量')
    expect(MUNDO_RECYCLE_COUNT, '★㊶ 卡面数额只有一处定义').toBe(3)
  })

  test('★接线:进了数量缩放族的名单;开始阶段触发从 `activeTriggers` 拿得到', () => {
    expect([...COUNT_SCALED_DEFIDS]).toContain('OGN-109')
    const s = withJunk(1)
    expect(activeTriggers(s).some((t) => t.sourceOid === asObjId('md')), '★★★触发真的挂上了').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★585 句①:战力 = 6 + 你废牌堆张数', () => {
  test('🔴🔴🔴★★★★★★【会换答案·三档】废牌堆 0/3/5 张 ⇒ 战力 6/9/11', () => {
    expect(mightOf(withJunk(0)), '★空堆 ⇒ 就是卡面 6').toBe(6)
    expect(mightOf(withJunk(3)), '★★★+3').toBe(9)
    expect(mightOf(withJunk(5)), '★★★+5').toBe(11)
  })

  test('🔴🔴🔴★★★★★★【承重·是 addMight 不是 raiseTo】6 战力 + 3 张 ⇒ **9**,不是 6', () => {
                                                                   
    expect(mightOf(withJunk(3)), '★★★raiseTo 写法给 6,addMight 给 9').toBe(9)
  })

  test('🔴🔴🔴★★★★★★【「你的」废牌堆】对手那堆一张都不算(§740.1.a)', () => {
                                  
    const s = scene([mundo(), junk('mine0', P1), ...Array.from({ length: 7 }, (_, i) => junk(`foe${i}`, P2))])
    expect(mightOf(s), '★★★只数我那 1 张 ⇒ 7').toBe(7)
  })

  test('🔴🔴★★★★★★【夺控盘面】数的是【控制者】那堆,不是拥有者那堆', () => {
    const stolen = { ...mundo(), controller: P2 } as GameObject
    const s = scene([stolen, junk('m0', P1), junk('m1', P1), junk('f0', P2)])
    expect(mightOf(s), '★★★控制者是 P2 ⇒ 只数 P2 那 1 张 ⇒ 7').toBe(7)
  })
})

describe('🔴🔴🔴★★★★★★585 句②:你的开始阶段回收三张', () => {
  test('🔴🔴🔴★★★★★★【张数·两个方向】堆里 ≥3 ⇒ 收 3;堆里 2 张 ⇒ 只收 2(§416 尽可能多)', () => {
    expect(mundoRecycleCount(withJunk(5), P1), '★够 ⇒ 3').toBe(3)
    expect(mundoRecycleCount(withJunk(2), P1), '★★★不够 ⇒ 有几张收几张').toBe(2)
    expect(mundoRecycleCount(withJunk(0), P1), '★空堆 ⇒ 0').toBe(0)
  })

  test('🔴🔴🔴★★★★★★【会换答案】追问列得出候选,且**不给「不回收」档**(强制)', () => {
                                                
    const s = withJunk(3)
    const q = trig().nextChoice!(s, {} as never, {}) as { candidates: readonly { id: string }[] } | null
    expect(q, '★★★问得出来').not.toBeNull()
    expect(q!.candidates.length).toBeGreaterThan(0)
    expect(q!.candidates.map((c) => c.id), '★★★强制回收 ⇒ 没有"不回收"这一档').not.toContain('skip')
  })

  test('🔴🔴🔴★★★★★★【空堆】废牌堆一张都没有 ⇒ 不追问、也不发事件', () => {
    const s = withJunk(0)
    expect(trig().nextChoice!(s, {} as never, {}), '★★★没得收就别问').toBeNull()
    expect(trig().effect!(s, {} as never, {}), '★★★也别发事件').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【承重】答完 ⇒ 发 `recycle`(不是 recycleObjects)+ 一条 `recycled` 信号', () => {
                                                                       
                                                                 
    const s = withJunk(3)
    const picks = ['jP10', 'jP11', 'jP12']
    const evs = trig().effect!(s, {} as never, { pick: picks.join('|') }) as readonly { kind: string; count?: number }[]
                                                                       
                                                       
    expect(evs.map((e) => e.kind), '★★★效果层只发回收动作;recycled 由产地派生').toEqual(['recycle'])
  })

  test('🔴🔴🔴★★★★★★【端到端】`recycle` 落地后那三张真离开废牌堆', () => {
                                                        
    const s = withJunk(3)
    const picks = ['jP10', 'jP11', 'jP12']
    const evs = trig().effect!(s, {} as never, { pick: picks.join('|') }) as readonly GameEvent[]
    const landed = applyEvents(s, evs, {})
    const out = landed.state
                                                             
    const rec = (landed.events as readonly { kind: string; count?: number }[]).filter((e) => e.kind === 'recycled')
    expect(rec, '★产地派生的 §416 完成信号').toHaveLength(1)
    expect(rec[0]!.count).toBe(3)
    const left = out.zones[asZoneId(`discard:${P1}`)]!.contents
    expect(left.length, '★★★三张都回收走了').toBe(0)
    expect(mightOf(out), '★★★战力跟着掉回 6(常驻被动每次重算现判)').toBe(6)
  })

  test('🔴🔴🔴★★★★★★【结算期复判·承重】答完之后堆里【换成了别的牌】⇒ 一条都不发', () => {
                                                             
                                                       
                                            
    const s = withJunk(3)
    const swapped = {
      ...s,
      objects: { ...s.objects, x0: junk('x0'), x1: junk('x1'), x2: junk('x2') },
      zones: {
        ...s.zones,
        [asZoneId(`discard:${P1}`)]: {
          ...s.zones[asZoneId(`discard:${P1}`)]!,
          contents: [asObjId('x0'), asObjId('x1'), asObjId('x2')],
        },
      },
    } as unknown as GameState
    expect(mundoRecycleCount(swapped, P1), '★前提自证:堆里仍有三张 ⇒ 走得到复判那一步').toBe(3)
    expect(trig().effect!(swapped, {} as never, { pick: 'jP10|jP11|jP12' }),
      '★★★服务端权威:玩家答的那三张已经不在堆里了').toEqual([])
  })

  test('🔴🔴★★★★★★【无条件触发】与蘑菇袋的分野:它有「如果…」,这张【没有】', () => {
                                                           
    expect(trig().additionalCondition, '★★★本卡不该有附加条件').toBeUndefined()
  })
})
