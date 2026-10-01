import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  activeTriggers, bfCardPassives, cardCost, cardKind, cardPassives, handPlaySpecs, playSpecFor,
} from '../../data/registry'
import { setBattlefieldPassiveProvider, setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { LONGTAIL7_DEFIDS } from '../../data/cards/longtail-7'
import { BF_PASSIVE_DEFIDS } from '../../data/cards/group-passives'

                                          
                                                    
                                                                   
                                                     

setCardPassiveProvider(cardPassives)
setBattlefieldPassiveProvider(bfCardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const unit = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: extra.baseMight ?? 3 })
const gear = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'OGN-090', ctrl, extra), baseTypes: ['equipment'] as const })
const rune = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'rune:blue', ctrl, extra), baseTypes: ['rune'] as const })
const asGear = (o: GameObject): GameObject => ({ ...o, baseTypes: ['equipment'] as const })
                                                              
const handDefIds = (st: GameState, p = P1): string[] =>
  (st.zones[`hand:${p}`]?.contents ?? []).map((oid) => st.objects[oid]!.defId).sort()

function scene(objs: GameObject[], bfCards: Record<string, { defId: string; owner: string }> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(Object.keys(bfCards).length > 0 ? { battlefieldCards: bfCards } : {}),
  } as GameState
}
const play = (defId: string, ctx: Record<string, unknown> = {}, chosen: Record<string, string> = {}) =>
  (st: GameState) => {
    const spec = playSpecFor(defId)!
    return spec.makeResolve({ movedCardOid: 'x', controller: P1, ...ctx } as never)(st, chosen, undefined as never)
  }
                     
function moveTargets(st: GameState, oid: string, player = P1): string[] {
  const g = new InteractiveGame(recomputeContinuous(st), { getTriggers: activeTriggers, handPlaySpecs })
  return g.legalActions(player)
    .filter((a) => a.kind === 'MOVE' && (a as { oid: string }).oid === oid)
    .map((a) => (a as { to: string }).to).sort()
}

describe('★【长尾批次·七】前提', () => {
  test('登记齐,费用照卡面实测取', () => {
    expect(LONGTAIL7_DEFIDS.slice().sort()).toEqual(['OGS-002', 'SFD-147', 'SFD-204', 'VEN-131', 'VEN-150'])
    for (const d of LONGTAIL7_DEFIDS) expect(cardKind(d), d).toBe('spell')
    expect(cardCost('SFD-204')).toEqual({ mana: 1, pips: [['orange', 'purple'], ['orange', 'purple']] })
    expect(cardCost('VEN-150')).toEqual({ mana: 3, pips: [['blue', 'orange']] })
    expect(cardCost('OGS-002')).toEqual({ mana: 6, pips: [['red']] })
    expect(cardCost('SFD-147')).toEqual({ mana: 8, pips: [['purple'], ['purple']] })
    expect(cardCost('VEN-131')).toEqual({ mana: 2, pips: [['yellow']] })
                                              
    expect(BF_PASSIVE_DEFIDS.slice().sort()).toEqual(
                                                       
                                                                
      ['OGN-294', 'OGN-295', 'OGN-297', 'SFD-208', 'UNL-208', 'UNL-210', 'UNL-213', 'VEN-159',
        'token:草丛'])                                           
  })
})

describe('★★成对的一组:狩猎 SFD-204 vs 加速之门 VEN-150(同动词、范围与轴都不同)', () => {
  test('★★狩猎:只叫醒【我的】单位,含基地里的;敌方一个都不许醒', () => {
    const st = scene([
      unit('mineBf', P1, { status: { dormant: true } }),
      unit('mineBase', P1, { status: { dormant: true }, zone: asZoneId(`base:${P1}`) }),
      unit('foe', P2, { status: { dormant: true } }),
    ])
    const after = applyEvents(st, play('SFD-204')(st), {}).state
    expect(after.objects['mineBf']!.status.dormant).toBe(false)
    expect(after.objects['mineBase']!.status.dormant).toBe(false)                      
    expect(after.objects['foe']!.status.dormant).toBe(true)                       
  })

  test('★狩猎不碰装备和符文(卡文只说「单位」)', () => {
    const st = scene([
      unit('u', P1, { status: { dormant: true } }),
      gear('g', P1, { status: { tapped: true } }),
      rune('r', P1, { status: { tapped: true } }),
    ])
    const after = applyEvents(st, play('SFD-204')(st), {}).state
    expect(after.objects['u']!.status.dormant).toBe(false)
    expect(after.objects['g']!.status.tapped).toBe(true)                   
    expect(after.objects['r']!.status.tapped).toBe(true)
  })

  test('★★加速之门:三类物件各走各的轴——单位 dormant、装备与符文 tapped(⑯)', () => {
    const st = scene([
      unit('u', P1, { status: { dormant: true } }),
      gear('g', P1, { status: { tapped: true } }),
      rune('r', P1, { status: { tapped: true } }),
    ])
    const chosen = { accelGate0: 'u', accelGate1: 'g', accelGate2: 'r' }
    const after = applyEvents(st, play('VEN-150', {}, chosen)(st), {}).state
                                                           
    expect(after.objects['u']!.status.dormant).toBe(false)
    expect(after.objects['g']!.status.tapped).toBe(false)
    expect(after.objects['r']!.status.tapped).toBe(false)
  })

  test('★★加速之门:卡文没写敌我 ⇒ 敌方的也能选(与狩猎正好相反)', () => {
    const st = scene([unit('mine', P1, { status: { dormant: true } }), unit('foe', P2, { status: { dormant: true } })])
    const req = playSpecFor('VEN-150')!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)(st, {})!
                                                               
    expect(req.candidates.map((c) => c.id).filter((i) => i !== '__done__').sort())
      .toEqual(['foe', 'mine'])                  
    const after = applyEvents(st, play('VEN-150', {}, { accelGate0: 'foe' })(st), {}).state
    expect(after.objects['foe']!.status.dormant).toBe(false)
  })

  test('★加速之门「最多四个」两头都压:含零个 / 封顶四个(㉙)', () => {
    const five = Array.from({ length: 5 }, (_, i) => unit(`u${i}`, P1, { status: { dormant: true } }))
    const st = scene(five)
    const nc = playSpecFor('VEN-150')!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)
    expect(nc(st, {})).not.toBeNull()                                  
    expect(play('VEN-150', {}, {})(st)).toEqual([])                            
    const four = { accelGate0: 'u0', accelGate1: 'u1', accelGate2: 'u2', accelGate3: 'u3' }
    expect(nc(st, four)).toBeNull()                                       
    expect(play('VEN-150', {}, { ...four, accelGate4: 'u4' })(st)).toHaveLength(4)              
  })

  test('★加速之门:已经活跃的不进候选(不占那四个名额)', () => {
    const st = scene([unit('awake', P1), unit('asleep', P1, { status: { dormant: true } })])
    const req = playSpecFor('VEN-150')!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)(st, {})!
    expect(req.candidates.map((c) => c.id).filter((i) => i !== '__done__')).toEqual(['asleep'])
  })
})

describe('★移动限制第三档:卑鄙之喉的巢穴 OGN-295(此处)', () => {
  const bf = { [BF0]: { defId: 'OGN-295', owner: P1 as string } }

  test('★★只锁【此处】的单位:BF0 上的走不了,BF1 上的照走(与 SFD-014 全场锁相区分)', () => {
    const st = scene([unit('here'), unit('elsewhere', P1, { zone: asZoneId(BF1) })], bf)
    expect(moveTargets(st, 'here')).not.toContain(`base:${P1}`)
    expect(moveTargets(st, 'elsewhere')).toContain(`base:${P1}`)                      
  })

  test('★★此处的【敌方】单位同样走不了(卡文没写敌我)', () => {
    const st = scene([unit('foe', P2)], bf)
    expect(recomputeContinuous(st).objects['foe']!.derived?.restrictions).toContain('moveToBase')
  })

  test('★对照组:换成疾风山丘 OGN-297 就没有这条限制', () => {
    const st = scene([unit('here')], { [BF0]: { defId: 'OGN-297', owner: P1 as string } })
    expect(moveTargets(st, 'here')).toContain(`base:${P1}`)
  })

  test('★持续效果只一份(铁律78:被动不按玩家复制)', () => {
    const st = scene([unit('here')], bf)
    const effs = bfCardPassives('OGN-295', BF0, P1, st)
    expect(effs).toHaveLength(1)
  })
})

describe('★烈火风暴 OGS-002:一处战场 × 只敌方', () => {
  test('★★只打【选中那处】的【敌方】单位,各3点', () => {
    const st = scene([
      unit('foeHere', P2, { baseMight: 9 }), unit('mineHere', P1, { baseMight: 9 }),
      unit('foeThere', P2, { baseMight: 9, zone: asZoneId(BF1) }),
      unit('foeBase', P2, { baseMight: 9, zone: asZoneId(`base:${P2}`) }),
    ])
    const after = applyEvents(st, play('OGS-002', {}, { firestormZone: BF0 })(st), {}).state
    expect(after.objects['foeHere']!.damage).toBe(3)
    expect(after.objects['mineHere']!.damage).toBe(0)                      
    expect(after.objects['foeThere']!.damage).toBe(0)                     
    expect(after.objects['foeBase']!.damage).toBe(0)
  })

  test('★战场结算期挑,答过不再追问(⑰);候选只有战场', () => {
    const st = scene([unit('foe', P2)])
    const nc = playSpecFor('OGS-002')!.makeNextChoice!({ movedCardOid: 'x', controller: P1 } as never)
    const req = nc(st, {})!
    expect(req.controller).toBe(P1)     
    expect(req.candidates.map((c) => c.id).sort()).toEqual([BF0, BF1].sort())
    expect(nc(st, { firestormZone: BF0 })).toBeNull()
  })
})

describe('★坠渊之流 SFD-147:所有单位和装备回【所属者】手牌', () => {
  test('★★双方 + 含基地 + 装备也算;符文不算', () => {
    const st = scene([
      unit('mine'), unit('foe', P2), gear('g'),
      unit('inBase', P1, { zone: asZoneId(`base:${P1}`) }),
      rune('r'),
    ])
    const after = applyEvents(st, play('SFD-147')(st), {}).state
    expect(handDefIds(after, P1)).toEqual(['BLK', 'BLK', 'OGN-090'])               
    expect(handDefIds(after, P2)).toEqual(['BLK'])                             
    expect(after.objects['r']!.zone).toBe(BF0)                     
    expect(after.zones[BF0]!.contents).toEqual([asObjId('r')])
  })

  test('★★回的是【所属者】的手牌,不是控制者的(㉑)', () => {
                                  
    const stolen = { ...unit('stolen', P1), owner: P2 }
    const st = scene([stolen])
    const after = applyEvents(st, play('SFD-147')(st), {}).state
    expect(handDefIds(after, P2)).toEqual(['BLK'])                          
    expect(handDefIds(after, P1)).toEqual([])
  })
})

describe('★团结箴言 VEN-131:紫色特性 × 敌方 × 单位或装备', () => {
                                                       
  test('★★候选:紫色的敌方单位与装备都收,非紫与友方都不收', () => {
    const st = scene([
      obj('foePurple', 'OGN-073', P2),                                          // 绿色单位
      obj('foeChaos', 'OGN-201', P2),                                           // 紫色
      obj('minePurple', 'OGN-201', P1),                                         // 紫色但是友方
      asGear(obj('foeGearChaos', 'SFD-052', P2)),                                // 装备
    ])
    const cands = [...playSpecFor('VEN-131')!.legalTargets(st, P1)].sort()
    expect(cands).toContain('foeChaos')
    expect(cands).not.toContain('minePurple')           
    expect(cands).not.toContain('foePurple')            
  })

  test('★★装备这一半单独压(㉔ / ㉗ 别照抄只有单位的先例)', () => {
    const gearOnly = asGear(obj('foeGear', 'OGN-201', P2))
    const st = scene([gearOnly])
    expect([...playSpecFor('VEN-131')!.legalTargets(st, P1)]).toEqual(['foeGear'])
  })

  test('★结算发 destroy 事件(㊾)', () => {
    const st = scene([obj('foeChaos', 'OGN-201', P2)])
    const evs = play('VEN-131', { target: 'foeChaos' })(st)
    expect(evs).toEqual([{ kind: 'destroy', target: 'foeChaos' }])
  })
})
