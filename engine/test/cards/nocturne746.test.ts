import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { cardKind, cardCost, cardKeywords, activeTriggers } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeNocturneTrigger, NOCTURNE_BANISH, NOCTURNE_PLAY } from '../../data/cards/OGN-194'
import { checkTrigger } from '../../src/dsl/trigger'

                                                          
                                                     
                                                 
  
                                                             
                                                                         
                                                                 
                                                                
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], pips = 3): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (let i = 0; i < pips; i++) {
    const r = { oid: asObjId(`rn${i}`), defId: 'rune:紫色', owner: P1, controller: P1,
      zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
      damage: 0, counters: {}, status: {} } as GameObject
    objects[r.oid] = r
    const z = zones[r.zone]
    if (z) zones[r.zone] = { ...z, contents: [...z.contents, r.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const noct = () => obj('nc', 'OGN-194', P1, `mainDeck:${P1}`)
const trig = makeNocturneTrigger(asObjId('nc'), P1)
const seen = (player: PlayerId, cards: string[]): GameEvent =>
  ({ kind: 'revealed', player, cards } as unknown as GameEvent)

describe('★ 前提:登记面(半步:PARTIAL 挂名单)+触发注册与活性', () => {
  test('★★★★★4费1pip紫、unit、无组、[游走];牌堆里触发活(TRIGGER_ZONES mainDeck)', () => {
    expect(CARD_COSTS['OGN-194']).toEqual({ mana: 4, pips: 1, colors: ['purple'] })
    expect(cardKind('OGN-194')).toBe('unit')
    expect(VARIANT_GROUPS['OGN-194'], '★单印次无组实证').toBeUndefined()
    expect(cardKeywords('OGN-194'), '★[游走] §810.1.b 行为面已有').toEqual(['游走'])
    expect(cardCost('OGN-194')).toEqual({ mana: 4, pips: [['purple']] })
    const inDeck = activeTriggers(scene([noct()]))
    expect(inDeck.some((t) => t.id.startsWith('OGN-194:seen')), '★②牌堆里活').toBe(true)
    const onField = activeTriggers(scene([obj('nc', 'OGN-194', P1, 'battlefield:shared:0')]))
    expect(onField.some((t) => t.id.startsWith('OGN-194:seen')), '★②场上的魔腾这条不响(只登 mainDeck)').toBe(false)
  })
})

describe('★★★★★★★ ①触发条件:看到我', () => {
  test('★★★★★★cards 含我 ⇒ 响;含别的魔腾 oid ⇒ 不响;别人展示 ⇒ 不响', () => {
    const s = scene([noct()])
    expect(checkTrigger(trig, seen(P1, ['nc', 'x']), s, P1), '★看到我').toBe(true)
    expect(checkTrigger(trig, seen(P1, ['other']), s, P1), '★①同名别张不响(按 oid 不按 defId)').toBe(false)
    expect(checkTrigger(trig, seen(P2, ['nc']), s, P1), '★「你」= 对手展示他的堆(哪怕神奇地含我)不响').toBe(false)
  })
})

describe('★★★★★★★ ①-B【查看半边】的行为档(★1243 补;★747 起 registry 登双实例)', () => {
                                                         
                                                      
                                                                       
                                                        
  const trigV = makeNocturneTrigger(asObjId('nc'), P1, 'viewed')
  const viewed = (player: PlayerId, cards: string[]): GameEvent =>
    ({ kind: 'viewed', player, cards } as unknown as GameEvent)

  test('★★★★★★查看到我 ⇒ 响;同名别张不响;对手查看他自己的堆不响', () => {
    const s = scene([noct()])
    expect(checkTrigger(trigV, viewed(P1, ['nc', 'x']), s, P1), '★查看看到我').toBe(true)
    expect(checkTrigger(trigV, viewed(P1, ['other']), s, P1), '★★同名别张不响(按 oid 不按 defId)').toBe(false)
    expect(checkTrigger(trigV, viewed(P2, ['nc']), s, P1), '★★★「你」= 对手查看他的堆不响').toBe(false)
  })

  test('🔴🔴★★★★★★★【两条各走各的】§436/§424:查看实例不吃 revealed,展示实例不吃 viewed', () => {
                                           
    const s = scene([noct()])
    expect(checkTrigger(trigV, seen(P1, ['nc']), s, P1), '★查看那一实例【不该】被展示事件触发').toBe(false)
    expect(checkTrigger(trig, viewed(P1, ['nc']), s, P1), '★★展示那一实例【不该】被查看事件触发').toBe(false)
                                                
    expect(checkTrigger(trigV, viewed(P1, ['nc']), s, P1), '★★★对照:查看实例吃 viewed').toBe(true)
    expect(checkTrigger(trig, seen(P1, ['nc']), s, P1), '★★★★对照:展示实例吃 revealed').toBe(true)
  })

  test('★★★★★查看那一实例的问链与展示那半【同款】(放逐 → 可选付)', () => {
    const s = scene([noct()])
    const q1 = trigV.nextChoice!(s, viewed(P1, ['nc']), {})!
    expect(q1.key, '★问1 还是放逐').toBe(NOCTURNE_BANISH)
    expect(trigV.nextChoice!(s, viewed(P1, ['nc']), { [NOCTURNE_BANISH]: 'no' }), '★★答 no 收口').toBeNull()
    const q2 = trigV.nextChoice!(s, viewed(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes' })!
    expect(q2.key, '★★★答 yes ⇒ 问2 付 A').toBe(NOCTURNE_PLAY)
  })
})

describe('★★★★★★★ ③④两问链与 resolve', () => {
  test('★★★★★问1 放逐两档;答 no 收口;答 yes ⇒ 问2 付{{A}};付不起不问(★715)', () => {
    const s = scene([noct()])
    const q1 = trig.nextChoice!(s, seen(P1, ['nc']), {})!
    expect(q1.key).toBe(NOCTURNE_BANISH)
    expect(trig.nextChoice!(s, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'no' })).toBeNull()
    const q2 = trig.nextChoice!(s, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes' })!
    expect(q2.key).toBe(NOCTURNE_PLAY)
    const poor = scene([noct()], 0)
    expect(trig.nextChoice!(poor, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes' }), '★付不起不问').toBeNull()
  })

  test('★★★★★★④QA L53「先放逐、再可选付」:不付=只 banish;付=banish+spend+playFree(oid 预测)', () => {
    const s = scene([noct()])
    const noPay = trig.effect(s, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'no' }) as unknown as readonly { kind: string }[]
    expect(noPay.map((e) => e.kind), '★不付也放逐').toEqual(['banish'])
    const pay = trig.effect(s, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' }) as unknown as readonly { kind: string, obj?: string }[]
    expect(pay.map((e) => e.kind)).toEqual(['banish', 'spend', 'playFree'])
    expect(pay[2]!.obj, '★§185 oid 预测=o{nextOid}(banish 是本列第一个换 oid 的)').toBe(`o${s.nextOid}`)
    expect(trig.effect(s, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'no' })).toEqual([])
  })

  test('★★★★★⑤我已被拿走(跨区换 oid)⇒ 引用无 ⇒ 问不出+落空(刀:引用现验丢)', () => {
    const gone = scene([])                           
    expect(trig.nextChoice!(gone, seen(P1, ['nc']), {})).toBeNull()
    expect(trig.effect(gone, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' })).toEqual([])
  })
})

describe('★★★★★★★ ⑥E2E:放逐+付 ⇒ 魔腾落基地', () => {
  test('★★★★★★applyEvents 全链落地:魔腾出牌堆→放逐→打出到基地(休眠进场 §359.2.c)', () => {
    const s = scene([noct()])
    const evs = trig.effect(s, seen(P1, ['nc']), { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' })
    const after = applyEvents(s, evs as never, {}).state
    const landed = Object.values(after.objects).find((o) => o.defId === 'OGN-194')
    expect(landed, '★魔腾还在(经放逐区两跳换 oid,按 defId 验 ㊼ ★738)').toBeDefined()
    expect(after.zones[landed!.zone]?.kind, '★落基地(㊼ OGN-037 缺省落点口径)').toBe('base')
    expect(landed!.status.dormant, '★§359.2.c 休眠进场(卡文没写活跃)').toBe(true)
    expect(after.zones[`mainDeck:${P1}` as never]?.contents ?? [], '★牌堆里没有它了').toEqual([])
  })
})
