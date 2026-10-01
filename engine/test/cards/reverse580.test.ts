import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { playSpecFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { specLookup } from '../../data/decks'
import { OGN_080, OGN_080_CARD_EFFECT } from '../../data/cards/OGN-080'

                                                
                                         
  
                                           
                                              
                                                             
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const spec = () => playSpecFor('OGN-080')!

                              
function scene(items: readonly ChainItem[], units: readonly { oid: string; ctrl: string }[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const u of units) {
    const o = {
      oid: asObjId(u.oid), defId: 'OGN-012', owner: asPlayerId(u.ctrl), controller: asPlayerId(u.ctrl),
      zone: asZoneId(BF0), baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    } as unknown as GameObject
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, chain: items } as GameState
}
const spellItem = (id: string, ctrl: string = P1 as string, chosenTarget?: string): ChainItem =>
  ({ id, controller: asPlayerId(ctrl), kind: 'spell', status: 'confirmed', resolve: () => [],
    ...(chosenTarget ? { chosenTarget } : {}) } as unknown as ChainItem)
   
                                                                  
                                                      
                                                                                                     
                                                                                
   
function withSeizedSpell(s: GameState, itemId: string, cardOid: string, defId: string): GameState {
  const card = {
    oid: asObjId(cardOid), defId, owner: P2, controller: P2, zone: asZoneId(`discard:${P2}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['spell'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  return {
    ...s,
    objects: { ...s.objects, [cardOid]: card },
    chain: s.chain.map((i) => (i.id === itemId ? { ...i, cardOid: asObjId(cardOid) } : i)),
  }
}
const abilityItem = (id: string, ctrl: string = P2 as string): ChainItem =>
  ({ id, controller: asPlayerId(ctrl), kind: 'ability', status: 'confirmed', resolve: () => [] } as unknown as ChainItem)

describe('🔴🔴🔴★★★★★★580 倒转神通:前提与接线', () => {
  test('★前提:法术、4法力+**3绿pip**、印刷[反应]', () => {
    expect(CARD_COSTS['OGN-080'], '★★★费用查 CARD_COSTS 不从卡文推(579 教训)')
      .toEqual({ mana: 4, pips: 3, colors: ['green'] })
    expect(spec().cost, '★★★PlaySpec 那份也要是 3 枚绿 pip').toEqual({ mana: 4, pips: [['green'], ['green'], ['green']] })
    expect(cardKind('OGN-080')).toBe('spell')
    expect(cardKeywords('OGN-080')).toContain('反应')
    expect(specLookup('OGN-080').baseKeywords, '★★★两处印刷关键词要一字不差(全仓闸)').toContain('反应')
    expect(OGN_080.category).toBe('spell')
    expect(OGN_080_CARD_EFFECT).toContain('获得一个法术的控制权')
    expect(OGN_080_CARD_EFFECT).toContain('你可以选择为其指定新的目标')
  })

  test('★接线:target 轴是 chainSpell(选的是链上项目,不是场上物件)', () => {
    expect(spec().target).toBe('chainSpell')
  })
})

describe('🔴🔴🔴★★★★★★580 合法目标:全部法术项目(无费用上限、不分敌我)', () => {
  const legal = (s: GameState): readonly string[] => spec().legalTargets!(s, P1) as readonly string[]

  test('🔴🔴🔴★★★★★★【会换答案·不分敌我】对手的法术**和自己的法术**都是合法目标', () => {
                                                      
                                   
    const s = scene([spellItem('foe'), spellItem('mine', 'P1')])
    expect([...legal(s)].sort(), '★★★两条都在').toEqual(['foe', 'mine'])
  })

  test('🔴🔴🔴★★★★★★【无费用上限】高费法术照样能选(VEN-152 的 ≤4 门不属于这张)', () => {
                                            
                                                                    
                                                     
    const s = scene([spellItem('big', 'P2')])
    expect(legal(s), '★★★套上费用门这里会变空').toEqual(['big'])
  })

  test('🔴🔴🔴★★★★★★【只认法术】技能/触发式项目不是合法目标', () => {
                                                       
    const s = scene([abilityItem('abil', 'P2'), spellItem('sp', 'P2')])
    expect(legal(s), '★★★卡文写的是"一个【法术】"').toEqual(['sp'])
  })

  test('🔴★★★★★★链上空 ⇒ 一个合法目标都没有', () => {
    expect(legal(scene([]))).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★580 追问:「你可以选择」指定新目标', () => {
  const ask = (s: GameState, target: string, chosen: Record<string, string> = {}) =>
    spec().makeNextChoice!({ movedCardOid: asObjId('me'), target, controller: P1 } as never)(s, chosen as never)

  test('🔴🔴🔴★★★★★★【承重】候选里必须有「不重选」一档(卡文是"你**可以**选择")', () => {
    const s = withSeizedSpell(scene([spellItem('ci', 'P2')], [{ oid: 'e1', ctrl: 'P2' }]), 'ci', 'spcard', 'OGN-172')
    const q = ask(s, 'ci') as { candidates: readonly { id: string }[] }
    expect(q.candidates.map((c) => c.id), '★★★少了 keep 就成了强制重选').toContain('keep')
    expect(q.candidates.map((c) => c.id), '★也要能真选一个新目标').toContain('e1')
  })

  test('🔴🔴🔴★★★★★★【§751.1】不得重选回它**原来的**目标 ⇒ 原目标要从候选里排掉', () => {
                                                        
    const s = withSeizedSpell(scene([spellItem('ci', 'P2', 'e1')], [{ oid: 'e1', ctrl: 'P2' }, { oid: 'e2', ctrl: 'P2' }]), 'ci', 'spcard', 'OGN-172')
    const q = ask(s, 'ci') as { candidates: readonly { id: string }[] }
    const ids = q.candidates.map((c) => c.id)
    expect(ids, '★★★§751.1 原目标不许重选回去').not.toContain('e1')
    expect(ids, '★别的还在').toContain('e2')
  })

  test('🔴🔴★★★★★★答过一次就不再追问(免得死循环)', () => {
    const s = scene([spellItem('ci', 'P2')], [{ oid: 'e1', ctrl: 'P2' }])
    expect(ask(s, 'ci', { rechoose: 'keep' })).toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★580 结算:只夺控,不无效化', () => {
                                                                        
                                                                    
  const resolve = (target: string | undefined, chosen: Record<string, string> = {}) =>
    spec().makeResolve!({ target, controller: P1 } as never)(scene(target === undefined ? [] : [spellItem(target, 'P2')]) as never, chosen as never, undefined as never) as readonly GameEvent[]

  test('🔴🔴🔴★★★★★★【会换答案】发一条 seize,新控制者是我;不重选时不带 rechoiceTarget', () => {
    const evs = resolve('ci', { rechoose: 'keep' }) as readonly { kind: string; target?: string; newController?: string; rechoiceTarget?: string }[]
    expect(evs.length).toBe(1)
    expect(evs[0]!.kind).toBe('seize')
    expect(evs[0]!.target).toBe('ci')
    expect(evs[0]!.newController).toBe(P1)
    expect(evs[0]!.rechoiceTarget, '★★★答了 keep 就不该带重选').toBeUndefined()
  })

  test('🔴🔴🔴★★★★★★【另一个方向】答了新目标 ⇒ seize 带上 rechoiceTarget', () => {
    const evs = resolve('ci', { rechoose: 'e2' }) as readonly { rechoiceTarget?: string }[]
    expect(evs[0]!.rechoiceTarget).toBe('e2')
  })

  test('🔴🔴🔴★★★★★★【承重·与 VEN-152 的分野】**永远不发 negate** —— 这张不会无效化任何东西', () => {
                                               
    const cases: readonly Record<string, string>[] = [{}, { rechoose: 'keep' }, { rechoose: 'e2' }]
    for (const chosen of cases) {
      expect(resolve('ci', chosen).map((e) => e.kind), '★★★一条 negate 都不该有').toEqual(['seize'])
    }
  })

  test('🔴★★★★★★没目标(目标已离链)⇒ 一条都不发', () => {
    expect(resolve(undefined)).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★580 落地:seize 事件真把控制权改过来', () => {
  test('🔴🔴🔴★★★★★★【端到端】applyEvents 之后链项目的 controller 变成我、目标被重选', () => {
                                                       
    const s = scene([spellItem('ci', 'P2', 'e1')], [{ oid: 'e1', ctrl: 'P2' }, { oid: 'e2', ctrl: 'P2' }])
    const out = applyEvents(s, [{ kind: 'seize', target: 'ci', newController: P1, rechoiceTarget: 'e2' } as GameEvent], {})
    expect(out.state.chain[0]!.controller, '★★★夺得控制权').toBe(P1)
    expect(out.state.chain[0]!.rechoice?.target, '★★★新目标写进 rechoice(§752.1)').toBe('e2')
    expect(out.state.chain.length, '★★★链项目还在 —— 这张不是无效化').toBe(1)
  })
})
