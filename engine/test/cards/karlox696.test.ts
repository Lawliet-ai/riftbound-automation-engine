import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem } from '../../src/loop/chain'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { activatedFor, cardKeywords, cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { makeKarloxEmpoweredTrigger, makeKarloxPlunderItem, karloxCandidates, VEN_114_BURN, VEN_114_SKIP } from '../../data/cards/VEN-114'

                                                              
                                                     
                                                 
  
           
                                                 
                                                                     
                                        
                                                
                                                           
                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
} as GameObject)

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

const trig = makeKarloxEmpoweredTrigger(asObjId('kx'), P1)
const empowerEv = (target: string): GameEvent => ({ kind: 'empower', target: asObjId(target) } as unknown as GameEvent)

describe('★ 前提:①登记与强化技能', () => {
  test('★★★★★单位 6费 0pip 紫、[强化6紫色紫色] 登了、通用工厂产强化技能({6}+两紫pip)、UNIT_COST 登了', () => {
    expect(CARD_COSTS['VEN-114']).toEqual({ mana: 6, pips: 0, colors: ['purple'] })
    expect(cardKind('VEN-114')).toBe('unit')
    expect(cardKeywords('VEN-114')).toEqual(['强化6紫色紫色'])
    expect(cardCost('VEN-114'), '★打出费与强化费是两笔账').toEqual({ mana: 6 })
    const specs = activatedFor('VEN-114')
    const emp = specs.find((s) => (s.key as string).includes('empower') || (s.key as string).includes('强化'))
    expect(emp, '★通用工厂产出强化技能').toBeDefined()
    expect(emp!.cost, '★parseCostSuffix 双色后缀:{6}+紫紫').toEqual({ mana: 6, pips: [['purple'], ['purple']] })
  })

  test('★★★★★★②empower+subjectIsSelf:我被强化响(外部强化也算 by any);别人被强化不响', () => {
    const s = scene([obj('kx', 'VEN-114', P1, 'battlefield:shared:0'), obj('ally', 'U-A', P1, 'battlefield:shared:0')])
    expect(checkTrigger(trig, empowerEv('kx'), s, P2), '★被【对手的效果】强化也算(by any)').toBe(true)
    expect(checkTrigger(trig, empowerEv('ally'), s, P1), '★别人被强化 ⇒ 不响').toBe(false)
  })

  test('★★★★★★②效果=[burn{**对手**,3}, enqueueItem{内嵌选牌}]', () => {
    const s = scene([obj('kx', 'VEN-114', P1, 'battlefield:shared:0')])
    const evs = trig.effect(s, empowerEv('kx'), {}) as unknown as readonly { kind: string, player?: string, count?: number, item?: ChainItem }[]
    expect(evs.map((e) => e.kind)).toEqual(['burn', 'enqueueItem'])
    expect(evs[0], '★「该玩家燃烧3」=对手不是我').toMatchObject({ kind: 'burn', player: P2, count: VEN_114_BURN })
    expect(evs[1]!.item!.id).toBe('VEN-114-embed-plunder:kx')
  })
})

describe('★★★★★★★ ③④⑤内嵌选牌+playFree', () => {
  test('★★★★★④候选=对手废牌堆单位+skip;法术/我的废牌堆不在;空 ⇒ 不问', () => {
    const s = scene([
      obj('du', 'OGN-078', P2, `discard:${P2}`), obj('dsp', 'OGN-156', P2, `discard:${P2}`, ['spell']),
      obj('mine', 'OGN-078', P1, `discard:${P1}`),
    ])
    expect([...karloxCandidates(s, P2 as string)]).toEqual(['du'])
    const item = makeKarloxPlunderItem(asObjId('kx'), P1, P2)
    const q = item.nextChoice!(s, {})!
    expect(q.controller, '★选牌的是我').toBe(P1)
    expect(q.candidates.map((c) => c.id)).toEqual(['du', VEN_114_SKIP])
    const empty = scene([])
    expect(item.nextChoice!(empty, {}), '★对手废牌堆没单位 ⇒ 不问').toBeNull()
  })

  test('★★★★★★⑤resolve:playFree{obj, player:**我**, to:我基地(★1251 无我控战场 ⇒ 不问)},不传 ready;skip/失效 ⇒ 空', () => {
    const s = scene([obj('du', 'OGN-078', P2, `discard:${P2}`)])
    const item = makeKarloxPlunderItem(asObjId('kx'), P1, P2)
    const evs = item.resolve(s, { karloxPick: 'du' } as never, undefined as never) as unknown as readonly { kind: string, obj?: string, player?: string, to?: string }[]
    expect(evs).toHaveLength(1)
    expect(evs[0], '★「当作**自己的**牌打出」⇒ player=我').toMatchObject({ kind: 'playFree', obj: 'du', player: P1 })
    expect(evs[0]!.to, '★没写位置词 ⇒ ★1251 走 §355.2.a 缺省口径:没有我控战场 ⇒ 不问、显式落我的基地').toBe(`base:${P1}`)
    expect(item.resolve(s, { karloxPick: VEN_114_SKIP } as never, undefined as never), '★「可以」不选').toEqual([])
    expect(item.resolve(scene([]), { karloxPick: 'du' } as never, undefined as never), '★结算时牌已不在').toEqual([])
  })

  test('★★★★★★③E2E 时序:燃烧落地后废牌堆多三张 ⇒ 内嵌候选含刚烧的单位;playFree 落我基地我控制休眠', () => {
                                                        
    const deckUnits = ['b1', 'b2'].map((id) => obj(id, 'OGN-078', P2, `mainDeck:${P2}`))
    const deckSpell = obj('b3', 'OGN-156', P2, `mainDeck:${P2}`, ['spell'])
    const s = scene([...deckUnits, deckSpell])
    expect(karloxCandidates(s, P2 as string), '★烧之前废牌堆空').toEqual([])
    const burned = applyEvents(s, [{ kind: 'burn', player: P2, count: 3 }] as never, {}).state
    const cands = karloxCandidates(burned, P2 as string)
    expect(cands.length, '★烧完两名单位进了废牌堆(法术被 isUnit 筛掉)——内嵌候选现算才看得见').toBe(2)
    const item = makeKarloxPlunderItem(asObjId('kx'), P1, P2)
    const pick = cands[0] as string
    const evs = item.resolve(burned, { karloxPick: pick } as never, undefined as never)
    const after = applyEvents(burned, evs as never, {}).state
    const landed = (after.zones[`base:${P1}` as never]?.contents ?? []).map((id) => after.objects[id]!).find((o) => o.defId === 'OGN-078')!
    expect(landed, '★§124 换 oid 按落点差集找').toBeDefined()
    expect(landed.controller, '★「当作自己的牌」⇒ 我控制').toBe(P1)
    expect(landed.owner, '★owner 仍是对手(分岔)').toBe(P2)
    expect(landed.status.dormant, '★没写活跃 ⇒ 休眠').toBe(true)
  })
})
