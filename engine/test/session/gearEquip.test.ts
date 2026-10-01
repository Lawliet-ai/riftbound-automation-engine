import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, cardCost } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { seedRunes } from '../../src/game/economy'
import { attachedTo } from '../../src/state/attach'
import { isGeared, equipDefaultTargets } from '../../src/keywords/equip'
import { effectiveMight } from '../../src/state/might'
import { GEAR_CARDS, UNPARSED_EQUIP } from '../../data/gearCards'
import { equipActivationSpecs } from '../../src/loop/equipActivation'

                                                     
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind }

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const spec = specLookup(defId)
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: spec.baseMight, baseKeywords: spec.baseKeywords ?? [], damage: 0, counters: {}, status: {},
    ...(spec.baseTypes ? { baseTypes: spec.baseTypes } : {}),
    ...(spec.baseTags ? { baseTags: spec.baseTags } : {}),
    ...(spec.basePowerBonus !== undefined ? { basePowerBonus: spec.basePowerBonus } : {}),
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
  return seedRunes(s, P1, 'red', 5)
}

function drain(g: InteractiveGame, max = 8): void {
  for (let i = 0; i < max && g.pending().mode === 'window'; i++) {
    const p = g.pending()
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: p.player })
  }
}

describe('批量接入的数据面', () => {
  test('40 张武装全部进表;裸装配 3 张在 UNPARSED_EQUIP 挂号', () => {
    expect(Object.keys(GEAR_CARDS).length).toBe(40)
    expect(Object.keys(UNPARSED_EQUIP).sort()).toEqual(['SFD-150', 'SFD-178', 'UNL-158'])
  })

  test('registry 三通道就位:cardKind/cardCost/activatedFor', () => {
    expect(cardKind('SFD-030')).toBe('equipment')
    expect(cardCost('SFD-030')).toEqual({ mana: 3 })
    const specs = activatedFor('SFD-030')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.cost).toEqual({ mana: 1, pips: [['red']] })         
  })

  test('★★裸装配的卡:【批量层】不产装配规格(宁缺毋滥),而人写的那几张汇总口查得到', () => {
                                                       
                                                                
                                                       
    for (const [defId, kws] of Object.entries(UNPARSED_EQUIP)) {
      const out = equipActivationSpecs(kws)
      expect(out.specs, `${defId} 是裸【装配】⇒ 批量层解析不出费用,不许编规格`).toHaveLength(0)
      expect(out.unparsed, `⇒ 而且要把它【报出来】,不能静默略过`).toContain('装配')
    }
                                                     
    for (const defId of Object.keys(UNPARSED_EQUIP)) {
      expect(activatedFor(defId).length, `${defId} 的装配技能应当人写过`).toBeGreaterThan(0)
    }
                                        
    const red = equipActivationSpecs(['装配红色'])
    expect(red.specs.length).toBeGreaterThan(0)
    expect(red.unparsed, '带颜色的解析得出 ⇒ 没有未解析残留').toEqual([])
  })

  test('specLookup 给武装配齐类型/标签/加成', () => {
    const s = specLookup('SFD-030')
    expect(s.baseTypes).toEqual(['equipment'])
    expect(s.baseTags).toEqual(['武装'])
    expect(s.basePowerBonus).toBe(2)
    expect(s.baseMight).toBe(0)
  })
})

describe('端到端:打出→激活装配→贴附→加成→配装', () => {
  test('全真实管线走通', () => {
    const g = new InteractiveGame(scene([
      obj('gear', 'SFD-030', P1, `hand:${P1}`),
      obj('u', 'BLK', P1, BF0),
    ]), { ...DEPS, cardCost })

                       
    const plays = g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'gear')
    expect(plays).toHaveLength(1)
    expect((plays[0] as { to: string }).to).toBe(`base:${P1}`)
    g.apply(plays[0]!)
    drain(g)
    const fielded = g.state.zones[`base:${P1}` as never]!.contents.map((o) => g.state.objects[o]!).find((o) => o.defId === 'SFD-030')!
    expect(fielded).toBeDefined()
    expect(fielded.baseTags).toEqual(['武装'])                                 
                                                                 

                                 
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === fielded.oid)
    expect(acts.length).toBe(1)
    expect((acts[0] as { target?: string }).target).toBe('u')
    g.apply(acts[0]!)
    drain(g)

                             
    const gear = g.state.objects[fielded.oid]!
    expect(attachedTo(gear)).toBe('u')
    expect(gear.zone).toBe(BF0)                      
    expect(effectiveMight(g.state.objects['u' as never]!).reference).toBe(4)
    expect(isGeared(g.state, asObjId('u'))).toBe(true)
  })

  test('付不起装配费就不枚举(§357 同口径)', () => {
    let s = scene([obj('gear2', 'SFD-030', P1, `base:${P1}`), obj('u', 'BLK', P1, BF0)])
    s = { ...s, runePools: { ...s.runePools, [P1]: { mana: 0, runes: {} } }, zones: s.zones }
                                                           
    const g = new InteractiveGame({ ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([, o]) => !o.defId.startsWith('rune:'))) }, { ...DEPS, cardCost })
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'gear2')
    expect(acts).toHaveLength(0)
  })
})

                                            
  
                                   
                                                              
                                                              
                                                        
  
                                                             
                                                                                 
                                                                
                                             
                                                                    
describe('§818.1.c.2 × §173-176:武装不能装配给传奇', () => {
  test('★根因:specLookup 必须把传奇标成 legend(漏了就回落成 unit)', () => {
                                                              
    expect(specLookup('OGN-263').baseTypes).toEqual(['legend'])
    expect(specLookup('FND-249').baseTypes).toEqual(['legend'])
  })

  test('★★传奇不进[装配]的合法目标(哪怕它是场上唯一的友方物件)', () => {
    const s = scene([
      obj('gearL', 'SFD-030', P1, `base:${P1}`),
      obj('legend', 'OGN-263', P1, `legend:${P1}`), // §107.4 传奇区算【场地】,所以"在场上"这一关拦不住它
    ])
    expect(equipDefaultTargets(s, P1, asObjId('gearL'))).toEqual([])
  })

  test('★★同一盘面上有真单位时,只枚举单位,传奇仍被排除', () => {
    const s = scene([
      obj('gearL', 'SFD-030', P1, `base:${P1}`),
      obj('legend', 'OGN-263', P1, `legend:${P1}`),
      obj('u', 'BLK', P1, BF0),
    ])
    expect(equipDefaultTargets(s, P1, asObjId('gearL'))).toEqual(['u'])
  })

  test('★★★端到端:整条 legalActions 里没有一条装配指向传奇', () => {
    const g = new InteractiveGame(scene([
      obj('gearL', 'SFD-030', P1, `base:${P1}`),
      obj('legend', 'OGN-263', P1, `legend:${P1}`),
      obj('u', 'BLK', P1, BF0),
    ]), { ...DEPS, cardCost })
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'gearL')
    expect(acts.map((a) => (a as { target?: string }).target)).toEqual(['u'])
  })
})
