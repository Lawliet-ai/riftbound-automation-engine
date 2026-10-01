import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { checkTrigger } from '../../src/dsl/trigger'                          
import { MAY_CHOOSE_KEY, MAY_CHOOSE_DECLINE } from '../../src/loop/chainFepr'                          
import { seedRunes, canPayFromState } from '../../src/game/economy'                
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_048, UNL_048_CARD_EFFECT, makeTrevorTrigger } from '../../data/cards/battlefield-timing'
import { SFD_214, SFD_214_COST, SFD_214_PIPS, SFD_214_POINTS, SFD_214_CARD_EFFECT, makeEnergyHubTrigger } from '../../data/cards/battlefields-extra'

                                                                
                                                                       
                                         
                                                                  
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might = 3): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[], bf0Def?: string, runeCount = 2): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    ...(bf0Def !== undefined ? { battlefieldCards: { [BF0]: { defId: bf0Def, owner: P1 } } } : {}) }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  s = seedRunes(s, P1, 'green', 2)
  s = seedRunes(s, P2, 'yellow', runeCount)
  return s
}
function walk(g: InteractiveGame, answers: Record<string, string> = {}): void {
  for (let i = 0; i < 12; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
                                                                                     
                                                                    
                                                
      const ans = answers[p.request.key]
        ?? (p.request.key.startsWith(MAY_CHOOSE_KEY) ? answers[MAY_CHOOSE_KEY] : undefined)
        ?? p.request.candidates[0]!.id
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: ans })
      continue
    }
    break
  }
}

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('特雷弗 3费0pip 绿 3S [坚守];能量枢纽是战场卡;卡文', () => {
    expect(CARD_COSTS['UNL-048']).toEqual({ mana: 3, pips: 0, colors: ['green'] })
    expect(UNL_048.power, '上游实测 3S').toBe(3)
    expect(cardKeywords('UNL-048'), '[坚守] 两条通道都登').toEqual(['坚守'])
    expect(SFD_214.category).toBe('battlefield')
                                                                             
                                                                                  
                                                                
    expect(SFD_214_PIPS, '数额钉住卡面').toBe(4)
    expect(SFD_214_COST, '★835 是【符能】不是法力:四个 [A] pip').toEqual({ mana: 0, pips: [[], [], [], []] })
    expect(SFD_214_POINTS).toBe(1)
    expect(UNL_048_CARD_EFFECT).toContain('瞬息')
    expect(SFD_214_CARD_EFFECT).toContain('额外获得1分')
  })
})

describe('🔴★★★★特雷弗 UNL-048:据守→在此处打出活跃3S精灵带瞬息', () => {
  test('🔴★★★端到端:P2 特雷弗据守 BF0 → BF0 多一名活跃精灵(带瞬息、非休眠、在事件战场不在基地)', () => {
    const g = new InteractiveGame(scene([unit('t', 'UNL-048', P2, BF0)]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g)
    const sprite = Object.values(g.state.objects).find((o) => o.defId === 'token:精灵')
    expect(sprite, '精灵出来了').toBeTruthy()
    expect(sprite!.zone, '落在「此处」= BF0,不是基地').toBe(asZoneId(BF0))
    expect(sprite!.owner, '归据守者 P2').toBe(P2)
    expect(sprite!.baseKeywords, 'SPRITE_TOKEN 自带[瞬息]').toContain('瞬息')
    expect(sprite!.status.dormant, '「活跃状态的」⇒ ready 豁免 §359.2.c').not.toBe(true)
    expect(sprite!.baseMight, '3S').toBe(3)
  })

  test('★单元:conquer 不响(hold 专属)', () => {
    const trig = makeTrevorTrigger(asObjId('t'), P2)
    expect(trig.event).toBe('hold')
  })
})

describe('🔴★★★★能量枢纽 SFD-214(战场卡):据守此处可付{4}额外得1分', () => {
  test('🔴★★★付得起+答 yes ⇒ 据守1分+枢纽1分=2;付4后活跃符文横掉', () => {
    const g = new InteractiveGame(scene([unit('h', 'BLK', P2, BF0)], 'SFD-214', 4), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g, { [MAY_CHOOSE_KEY]: 'yes' })
    expect(g.state.scores['P2'], '据守 1 + 枢纽 1').toBe(1 + SFD_214_POINTS)
  })

  test('🔴★★★答 skip ⇒ 只有据守那 1 分', () => {
    const g = new InteractiveGame(scene([unit('h', 'BLK', P2, BF0)], 'SFD-214', 4), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g, { [MAY_CHOOSE_KEY]: MAY_CHOOSE_DECLINE })                                      
    expect(g.state.scores['P2']).toBe(1)
  })

  test('🔴★★★付不起(只有2符文)⇒ 压根不问,只有据守 1 分', () => {
    const g = new InteractiveGame(scene([unit('h', 'BLK', P2, BF0)], 'SFD-214', 2), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
                                                              
    walk(g)
    expect(g.state.scores['P2']).toBe(1)
  })

                                                         
                                                                
                                                   
                                  
                                                                      
                                                                                     
                                                                    
                                      
                                               
                                     
  test('🔴🔴🔴★★★★★★★【符能≠法力】4 枚【已横置】符文:符能付得起、法力付不起', () => {
    let s = createInitialState([P1, P2], 2)
    s = seedRunes(s, P2, 'yellow', 4)
    s = { ...s, objects: Object.fromEntries(Object.entries(s.objects).map(([k, o]) =>
      [k, o.defId.startsWith('rune:') && o.controller === P2
        ? { ...o, status: { ...o.status, tapped: true } } : o])) } as typeof s
    expect(canPayFromState(s, P2, SFD_214_COST), '★卡面 {{A}}×4 = 符能 ⇒ 已横置符文可回收产出').toBe(true)
    expect(canPayFromState(s, P2, { mana: SFD_214_PIPS }), '★★★同样场景下「4 法力」付不起 —— 这就是两者的实质差别').toBe(false)
                                              
    let act = createInitialState([P1, P2], 2)
    act = seedRunes(act, P2, 'yellow', 4)
    expect(canPayFromState(act, P2, SFD_214_COST)).toBe(true)
    expect(canPayFromState(act, P2, { mana: SFD_214_PIPS }), '全活跃时法力也付得起 ⇒ 老场景是「双解都过」').toBe(true)
  })

  test('★★单元分辨:付不起时【触发压根不入链】(§444.2.c 那道门,★1493 从 nextChoice 搬进 when)', () => {
                                                             
                                                                  
                                                                         
    const trig = makeEnergyHubTrigger(BF0, P2)
    const poor = scene([unit('h', 'BLK', P2, BF0)], 'SFD-214', 2)
    const rich = scene([unit('h', 'BLK', P2, BF0)], 'SFD-214', 4)
    const ev = { kind: 'hold', player: P2, battlefield: BF0 } as never
    expect(checkTrigger(trig, ev, poor, P2), '2 符文付不起 4 ⇒ 不入链 = 不问').toBe(false)
    expect(checkTrigger(trig, ev, rich, P2), '4 符文付得起 ⇒ 入链 ⇒ 确认阶段问得到').toBe(true)
  })

  test('★对手视角:P1 据守别人家枢纽照样能用(「你」对称,每玩家一份触发)', () => {
                                             
    let s = scene([unit('m', 'BLK', P1, BF0)], 'SFD-214', 2)
    s = seedRunes(s, P1, 'green', 2)                 
    const g = new InteractiveGame({ ...s, activePlayer: P2 }, DEPS)
    g.apply({ kind: 'END_TURN', player: P2 })
    walk(g, { [MAY_CHOOSE_KEY]: 'yes' })
    expect(g.state.scores['P1']).toBe(1 + SFD_214_POINTS)
  })
})
