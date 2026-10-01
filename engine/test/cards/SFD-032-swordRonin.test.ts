import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { destroyableEquipment } from '../../data/cards/OGN-056'

                                      
  
                                                
                                                    
                                              
                                                       
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function ronin(oid = 'r', zone = BF0, controller = P1): GameObject {
  const s = specLookup('SFD-032')
  return {
    oid: asObjId(oid), defId: 'SFD-032', owner: controller, controller, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {},
  }
}
                                              
function gear(oid: string, controller = P1, zone?: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'OGN-101', owner: controller, controller,
    zone: asZoneId(zone ?? `base:${controller}`), baseMight: 0, baseKeywords: [],
    baseTypes: ['equipment'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
                                
function grunt(oid: string, controller = P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: controller, controller, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                                                              
function playAndResolve(
  st: GameState, unit = 'r', player = P1, take = true, want?: string,
): GameState {
  let s = landAndEnqueueTriggers(
    st, [{ kind: 'playUnit', unit: asObjId(unit), player }], activeTriggers, player, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      if (!take) continue
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        const hit = want === undefined ? undefined : req.candidates.find((c) => c.label === want)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const discardDefIds = (s: GameState, p = P1): readonly string[] =>
  (s.zones[`discard:${p}`]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '')

describe('前提', () => {
  test('这张卡在真 registry 里是单位,印刷 2[M]', () => {
    expect(cardKind('SFD-032')).toBe('unit')
    expect(specLookup('SFD-032').baseMight).toBe(2)
  })

  test('费用 3 法力 + 1 枚绿 pip(JSON energy=3 / returnEnergy=1 / green)', () => {
    expect(cardCost('SFD-032')).toEqual({ mana: 3, pips: [['green']] })
  })

  test('真 registry 收得到它的打出触发', () => {
    expect(activeTriggers(scene([ronin()])).some((t) => t.sourceOid === asObjId('r'))).toBe(true)
  })
})

describe('★打出时可摧毁一件装备', () => {
  test('★接受触发 → 选中的装备被摧毁,落到【其所属者】的废牌堆(走 destroy 通道)', () => {
    const s = playAndResolve(scene([ronin(), gear('g1')]), 'r', P1, true, '摧毁 OGN-101')
    expect(s.objects['g1']).toBeUndefined()                      
    expect(discardDefIds(s)).toEqual(['OGN-101'])                 
  })

  test('★对手的装备也能拆——卡文没写敌我,不能只准拆友方', () => {
    const st = scene([ronin(), gear('g2', P2)])
    expect(destroyableEquipment(st)).toContain(asObjId('g2'))
    const s = playAndResolve(st, 'r', P1, true, '摧毁 OGN-101')
    expect(s.objects['g2']).toBeUndefined()
    expect(discardDefIds(s, P2)).toEqual(['OGN-101'])                   
    expect(discardDefIds(s, P1)).toEqual([])
  })

  test('★贴在战场上单位身上的装备也在候选内(位置随宿主 §434.4)', () => {
    const st = scene([ronin(), grunt('u'), gear('worn', P1, BF0, { status: { attachedTo: asObjId('u') } })])
    expect(destroyableEquipment(st)).toContain(asObjId('worn'))
    const s = playAndResolve(st, 'r', P1, true, '摧毁 OGN-101')
    expect(s.objects['worn']).toBeUndefined()
  })

  test('★不接受(可选)→ 装备一件不少(§383.3.a「你可以选择」)', () => {
    const s = playAndResolve(scene([ronin(), gear('g1')]), 'r', P1, false)
    expect(s.objects['g1']).toBeDefined()
    expect(discardDefIds(s)).toEqual([])
  })

  test('场上没有装备 → 什么都不做(不报错,也不误伤单位)', () => {
    const s = playAndResolve(scene([ronin(), grunt('u')]))
    expect(s.objects['u']).toBeDefined()
    expect(discardDefIds(s)).toEqual([])
  })

  test('★结算前那件装备已经离场 → 效果发空(不能拿着陈旧的 oid 硬发 destroy)', () => {
    const st = scene([ronin(), gear('g1')])
    const trig = activeTriggers(st).find((t) => t.sourceOid === asObjId('r'))!
    const ev = { kind: 'playUnit', unit: asObjId('r'), player: P1 } as const
                     
    const gone: GameState = {
      ...st,
      objects: Object.fromEntries(Object.entries(st.objects).filter(([k]) => k !== 'g1')),
      zones: { ...st.zones, [`base:${P1}`]: { ...st.zones[`base:${P1}`]!, contents: [] } },
    }
    expect(trig.effect(gone, ev, { gear: 'g1' })).toEqual([])
  })
})

describe('★不该触发的情形', () => {
  test('★打出的是【另一名单位】→ 我这张不触发(filter 必须指名自己)', () => {
    const st = scene([ronin(), grunt('u'), gear('g1')])
    const s = playAndResolve(st, 'u')             
    expect(s.objects['g1']).toBeDefined()
    expect(s.chain.some((it) => it.id.includes('SFD-032-shatter:r'))).toBe(false)
  })

  test('★对手打出【他自己的】斩剑浪客 → 链上没有一条是我这张发的', () => {
                                              
    const st = scene([ronin('r', BF0, P1), ronin('foe', BF0, P2), gear('g1')])
    const s = landAndEnqueueTriggers(
      st, [{ kind: 'playUnit', unit: asObjId('foe'), player: P2 }], activeTriggers, P2, {})
    expect(s.chain.some((it) => it.id.includes('SFD-032-shatter:r'))).toBe(false)
    expect(s.chain.some((it) => it.id.includes('SFD-032-shatter:foe'))).toBe(true)            
  })
})
