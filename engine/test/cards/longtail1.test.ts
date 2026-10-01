import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind, cardPassives, playSpecFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr, applyFeprDecision, submitChoice } from '../../src/loop/chainFepr'
import type { ChainItem } from '../../src/loop/chain'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { grantBuffInState } from '../../src/keywords/buff'
import type { GameEvent } from '../../src/loop/events'
import { LONGTAIL1_DEFIDS } from '../../data/cards/longtail-1'

                                   
                                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const plain = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: extra.baseMight ?? 3 })

function scene(objs: GameObject[], deck = 6): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [...objs, ...Array.from({ length: deck }, (_, i) =>
    plain(`d${i}`, P1, { zone: asZoneId(`mainDeck:${P1}`) }))]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
               
function run(st: GameState, ev: GameEvent, actor = P1, pick?: string): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        const hit = pick === undefined ? undefined : req.candidates.find((c) => c.id === pick)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
                                                    
                                         
                                  
setCardPassiveProvider(cardPassives)

const might = (s: GameState, oid: string) => effectiveMight(recomputeContinuous(s).objects[oid]!).reference
const attackEv = (unit: string, bf = BF0): GameEvent =>
  ({ kind: 'attack', unit: asObjId(unit), player: P1, battlefield: bf })

describe('★【长尾批次·一】(第150轮)', () => {
  test('前提:6 张卡登记齐,战力/费用照卡面实测取', () => {
    expect(LONGTAIL1_DEFIDS.slice().sort())
      .toEqual(['OGN-065', 'OGN-076', 'OGN-091', 'OGN-103', 'OGN-114', 'OGN-131'])
    expect(cardKind('OGN-114')).toBe('spell')
    expect(cardCost('OGN-114')).toEqual({ mana: 6, pips: [['blue']] })
    expect(cardCost('OGN-076')).toEqual({ mana: 6, pips: [['green'], ['green']] })               
    expect(specLookup('OGN-076').baseMight).toBe(6)
    for (const [d, m, p] of [['OGN-103', 2, 2], ['OGN-131', 5, 5], ['OGN-091', 3, 3], ['OGN-065', 4, 4]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
  })

  test('★进化日 OGN-114:抽四张', () => {
    const st = scene([])
    const spec = playSpecFor('OGN-114')!
    const evs = spec.makeResolve({ movedCardOid: 'x', controller: P1 } as never)(st, {}, undefined as never)
    expect(evs).toEqual([{ kind: 'draw', player: P1, count: 4 }])
    const after = applyEvents(st, evs, {}).state
    expect(after.zones[`hand:${P1}`]!.contents).toHaveLength(4)
  })

  test('★★亚索 OGN-076:伤害等于【结算那一刻】的战力(不是印刷战力)', () => {
    const st = scene([obj('yas', 'OGN-076'), plain('foe', P2, { baseMight: 20 })])
    expect(might(run(st, attackEv('yas'), P1, 'foe'), 'foe')).toBe(20)              
    expect(run(st, attackEv('yas'), P1, 'foe').objects['foe']!.damage).toBe(6)        

                                                     
    const buffed = recomputeContinuous(grantBuffInState(st, asObjId('yas')))
    expect(might(buffed, 'yas')).toBe(7)
    expect(run(buffed, attackEv('yas'), P1, 'foe').objects['foe']!.damage).toBe(7)
  })

  test('★亚索:候选是【我所在那处】的敌方单位(别处/友方都不在)', () => {
    const st = scene([obj('yas', 'OGN-076'), plain('foeHere', P2), plain('mate', P1),
      plain('foeFar', P2, { zone: asZoneId(BF1) })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('yas'))!
    expect((t.nextChoice?.(st, attackEv('yas'), {})?.candidates ?? []).map((c) => c.id)).toEqual(['foeHere'])
  })

                                                                     
                                                                      
                                                
                                                 
                                        
                                               
                                                         
  test('★★★拉文布鲁姆学生 OGN-103:我控制的法术【结算】→我本回合+1;【对手】结算的不算', () => {
    const st = scene([obj('stu', 'OGN-103')])
    const resolvedEv = (p: typeof P1): GameEvent =>
      ({ kind: 'spellResolved', player: p, cardOid: asObjId('sp') } as GameEvent)
    expect(might(run(st, resolvedEv(P1), P1), 'stu')).toBe(3)       
    expect(might(run(st, resolvedEv(P2), P2), 'stu')).toBe(2)                   
  })

                                                     
                                                        
                                                    
                                                                
  const drainChain = (s0: GameState, answer?: string): GameState => {
    let s = s0
    for (let i = 0; i < 60; i++) {
      const step = advanceFepr(s, { triggerSource: activeTriggers } as never)
      if (step.kind === 'done') return step.state
      if (step.kind === 'choice') {
        s = submitChoice(step.state, step.request.key, answer ?? step.request.candidates[0]!.id)
        continue
      }
      s = applyFeprDecision(step.state, step.player, { kind: 'pass' })
    }
    throw new Error('链没推到底(60 步未收敛)')
  }
  const chained = (kind: string): GameState =>
    ({ ...scene([obj('stu', 'OGN-103')]),
      chain: [{ id: 'it1', controller: P1, kind, status: 'confirmed', resolve: () => [] } as unknown as ChainItem],
      priority: null, feprPasses: 0 } as GameState)
  const mightAfter = (st: GameState): number =>
    effectiveMight(recomputeContinuous(st).objects[asObjId('stu')]!).actual

  test('🔴🔴🔴★★★★★★【564·C4 端到端】法术链项目**结算完**,引擎真的发出了 spellResolved', () => {
                                                                  
                                                                             
    expect(mightAfter(drainChain(chained('spell'))), '★★★法术结算完 ⇒ 2+1').toBe(3)
  })

  test('🔴🔴★★★★★★【564·C4 端到端对照】**技能**项目结算不算「打出法术」', () => {
                                   
    expect(mightAfter(drainChain(chained('triggered'))), '★触发式技能结算不该让它长').toBe(2)
  })

  test('🔴🔴🔴★★★★★★【563·C4 承重】它【不再】吃 `playSpell` —— 那是「完成确认」那本账', () => {
                                                 
                                                  
                                             
    const st = scene([obj('stu', 'OGN-103')])
    const playEv = (p: typeof P1): GameEvent =>
      ({ kind: 'playSpell', player: p, cardOid: asObjId('sp') } as GameEvent)
    expect(might(run(st, playEv(P1), P1), 'stu'), '★★★确认信号不该让它长').toBe(2)
  })

  test('★★沙丘亚龙 OGN-131:「活跃」是 dormant 那条轴,不是 tapped', () => {
    const mk = (foe: Partial<GameObject>) => scene([obj('drake', 'OGN-131'), plain('foe', P2, foe)])
    expect(might(run(mk({}), attackEv('drake')), 'drake')).toBe(7)            
                            
    expect(might(run(mk({ status: { dormant: true } }), attackEv('drake')), 'drake')).toBe(5)
                                           
    expect(might(run(mk({ status: { tapped: true } }), attackEv('drake')), 'drake')).toBe(7)
                      
    const far = scene([obj('drake', 'OGN-131'), plain('foe', P2, { zone: asZoneId(BF1) })])
    expect(might(run(far, attackEv('drake')), 'drake')).toBe(5)
  })

  test('★竞技场勤务小队 OGN-091:打出【装备】才响,打出单位不响', () => {
    const mk = () => scene([obj('crew', 'OGN-091', P1, { status: { dormant: true } }),
      plain('gear', P1, { baseTypes: ['equipment'], zone: asZoneId(`base:${P1}`) }),
      plain('mate', P1)])
    const play = (oid: string, p: typeof P1): GameEvent => ({ kind: 'playUnit', unit: asObjId(oid), player: p })
    expect(run(mk(), play('gear', P1), P1).objects['crew']!.status.dormant).toBe(false)
                                          
    expect(run(mk(), play('mate', P1), P1).objects['crew']!.status.dormant).toBe(true)
    expect(run(mk(), play('gear', P2), P2).objects['crew']!.status.dormant).toBe(true)
  })

  test('★★睿智长者 OGN-065:「额外」+1 —— 有增益时总共 +2(增益自己那 1 要算进去)', () => {
    const st = scene([obj('elder', 'OGN-065')])
    expect(might(st, 'elder')).toBe(4)            
                                                           
    expect(might(grantBuffInState(st, asObjId('elder')), 'elder')).toBe(6)
  })
})
