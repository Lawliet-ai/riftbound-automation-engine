import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { resetTurnLedgers } from '../../src/scoring/score'
import { activeTriggers, handPlaySpecs, cardCost, cardKeywords, cardKind, activatedFor, cardDomains } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { SFD_050_SPEC, armamentsOn } from '../../data/cards/SFD-050'

                                                                    
                         
                                                
                                             
                  
  
                      
                                                          
                                                            
                                                        
                                                
                                                        
                                                
                                                      
                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

                                                  
const gearOn = (oid: string, unit: string, zone: string, defId = 'SFD-009'): GameObject =>
  ({ ...obj(oid, defId, P1, zone), baseTypes: ['equipment'], status: { attachedTo: asObjId(unit) } } as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const runes = (n: number): GameObject[] =>
  Array.from({ length: n }, (_, i) => ({
    ...obj(`rg${i}`, 'rune:green', P1, `base:${P1}`), baseTypes: ['rune'] as never,
  }))

const deps = { getTriggers: activeTriggers, handPlaySpecs, cardCost, cardKeywords, cardKind, activatedFor, cardDomains }

                                                      
const std = (): GameState => scene([
  obj('az', 'SFD-050', P1, BF0), obj('sold', 'U-S', P1, BF1), obj('foe', 'U-F', P2, BF1),
  gearOn('gw', 'sold', BF1), ...runes(2),
])
const azActs = (g: InteractiveGame): InteractiveAction[] =>
  g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === 'az')
                               
function drain(g: InteractiveGame): void {
  let guard = 0
  while (g.state.chain.length > 0 && guard++ < 10) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}

describe('★ 前提:①登记/双印次/SPEC 形状', () => {
  test('★★★★★英雄单位 6费 1绿pip 6[S]、卡面零横幅关键词、[迅捷]+oncePerTurn 在 SPEC 上', () => {
    expect(CARD_COSTS['SFD-050']).toEqual({ mana: 6, pips: 1, colors: ['green'] })
    expect(cardKind('SFD-050')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-050']).toEqual(['SFD-050', 'SFD-050a'])
    expect(cardKeywords('SFD-050'), '★[迅捷]是技能权限词,不印在单位横幅').toEqual([])
    expect(cardCost('SFD-050')).toEqual({ mana: 6, pips: [['green']] })
    const specs = activatedFor('SFD-050')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.keywords).toEqual(['迅捷'])
    expect(specs[0]!.oncePerTurn, '★「每回合仅可使用一次」').toBe(true)
    expect(specs[0]!.cost).toEqual({ pips: [['green']] })
    expect(activatedFor('SFD-050a'), '★异画号经 variantAliases 折叠到同一份').toHaveLength(1)
  })

  test('★★★★★②armamentsOn:武装贴它=在;普通装备贴它/武装贴别人=不在', () => {
    const s = scene([obj('u1', 'U-1', P1, BF0), obj('u2', 'U-2', P1, BF0),
      gearOn('g1', 'u1', BF0), gearOn('g2', 'u2', BF0),
      { ...gearOn('g3', 'u1', BF0, 'OGN-017'), baseTypes: ['equipment'] } as GameObject])
    expect(armamentsOn(s, 'u1'), '★普通装备 OGN-017 不是[武装]').toEqual(['g1'])
    expect(armamentsOn(s, 'u2')).toEqual(['g2'])
    expect(armamentsOn(s, undefined)).toEqual([])
  })
})

describe('★★★★★★★ ③枚举:目标×武装候选(QA L278 Q2 宣告期锁定)', () => {
  test('★★★★★★受控单位含自己、敌方不在;武装候选按所选单位现算+不转移档恒在', () => {
    const g = new InteractiveGame(std(), deps)
    const vs = azActs(g).map((a) => {
      const x = a as { target?: string, extraChoice?: string }
      return `${x.target}:${x.extraChoice}`
    }).sort()
    expect(vs, '★az 自己无武装 ⇒ 只 none;sold 有 gw ⇒ {gw,none} 两档;foe 敌方不在').toEqual(
      ['az:none', 'sold:gw', 'sold:none'])
  })
})

describe('★★★★★★★ ④⑤apply 全流程', () => {
  test('★★★★★★★互换+武装转贴+账 oid:key;本回合不再列、手写第二次 apply 被拒;回合末清账后恢复', () => {
    const g = new InteractiveGame(std(), deps)
    const act = azActs(g).find((a) => (a as { target?: string, extraChoice?: string }).target === 'sold'
      && (a as { extraChoice?: string }).extraChoice === 'gw')!
    expect(act).toBeDefined()
    g.apply(act)
    drain(g)
    const st = g.state
    const az = Object.values(st.objects).find((o) => o.defId === 'SFD-050')!
    const sold = Object.values(st.objects).find((o) => o.defId === 'U-S')!
    const gw = Object.values(st.objects).find((o) => o.defId === 'SFD-009')!
    expect(az.zone, '★「将我移动到它的位置」').toBe(BF1)
    expect(sold.zone, '★「再将它移动到我原来的位置」(移动前快照)').toBe(BF0)
    expect(gw.status.attachedTo, '★武装转贴到我身上').toBe(az.oid)
    expect(st.activatedThisTurn, '★账键=oid:技能key(QA L290 实例语义)').toEqual({ 'az:SFD-050:swap': true })
    expect(azActs(g), '★「每回合仅可使用一次」⇒ 枚举不再列').toHaveLength(0)
    const before = g.state
    g.apply(act)                                              
    expect(g.state, '★枚举拦得住 ≠ 真拦住').toBe(before)
    expect((resetTurnLedgers(st).activatedThisTurn ?? {})['az:SFD-050:swap'], '★清=回合末,下回合恢复额度').toBeUndefined()
  })

  test('★★★★★★③同位置=可选但不移动(QA L278 Q1;含选自己);武装那半照走(★676 并列)', () => {
    const s = scene([obj('az', 'SFD-050', P1, BF0), obj('mate', 'U-M', P1, BF0), gearOn('g1', 'mate', BF0), ...runes(2)])
    const mk = SFD_050_SPEC.makeResolve({ selfOid: 'az', controller: P1, target: 'mate', extraChoice: 'g1' } as never)
    const evs = mk(s, {} as never, undefined as never) as unknown as readonly { kind: string, obj?: string, to?: string }[]
    expect(evs.map((e) => e.kind), '★同位置 ⇒ 零移动事件;武装独立句照转').toEqual(['attach'])
    expect(evs[0]).toMatchObject({ kind: 'attach', obj: 'g1', to: 'az', player: P1 })
    const self = SFD_050_SPEC.makeResolve({ selfOid: 'az', controller: P1, target: 'az', extraChoice: 'none' } as never)
    expect(self(s, {} as never, undefined as never), '★选自己=同位置,全落空').toEqual([])
  })

  test('★★★★★⑤落空档:目标离场 ⇒ 全空;武装结算时已不在该单位 ⇒ 只互换', () => {
    const s = std()
    const gone = SFD_050_SPEC.makeResolve({ selfOid: 'az', controller: P1, target: 'ghost', extraChoice: 'none' } as never)
    expect(gone(s, {} as never, undefined as never), '★§355.8 目标离场').toEqual([])
                                                          
    const moved = { ...s, objects: { ...s.objects, gw: { ...s.objects[asObjId('gw')]!, status: { attachedTo: asObjId('foe') } } } } as GameState
    const mk = SFD_050_SPEC.makeResolve({ selfOid: 'az', controller: P1, target: 'sold', extraChoice: 'gw' } as never)
    const evs = mk(moved, {} as never, undefined as never) as unknown as readonly { kind: string }[]
    expect(evs.map((e) => e.kind), '★互换 4 事件(两组双发),无 attach').toEqual(
      ['zoneChange', 'unitMoved', 'zoneChange', 'unitMoved'])
  })
})
