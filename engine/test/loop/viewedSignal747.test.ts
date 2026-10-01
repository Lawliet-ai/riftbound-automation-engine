import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { makeNocturneTrigger } from '../../data/cards/OGN-194'
import { activeTriggers } from '../../data/registry'
import { checkTrigger } from '../../src/dsl/trigger'

                                                    
                                                               
                                                                  
                                                         
  
                                                         
                                                                               
                                                                
             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const card = (oid: string, defId: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(`mainDeck:${who}`),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(deckCards: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of deckCards) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }                             
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const insight = (player: PlayerId, count: number): GameEvent =>
  ({ kind: 'insight', player, count, recycleAll: true } as unknown as GameEvent)

describe('★★★★★★★ ①⑤派生:insight ⇒ viewed(before 现读)', () => {
  test('★★★★★★查看顶2 ⇒ viewed cards=顶2(含将被回收的);牌堆空 ⇒ 不派生;不发 revealed(②垓兽反档)', () => {
    const s = scene([card('a', 'U-a', P1), card('b', 'U-b', P1), card('c', 'U-c', P1)])
    const r = applyEvents(s, [insight(P1, 2)], {} as never)
    const evs = (r as unknown as { events: readonly { kind: string, player?: string, cards?: readonly string[] }[] }).events
    const v = evs.find((e) => e.kind === 'viewed')
    expect(v, '★①派生出现').toBeDefined()
    expect([...(v!.cards ?? [])].sort(), '★cards=回收前的顶2(c 最后 push=顶;before 现读)').toEqual(['b', 'c'])
    expect(v!.player).toBe(P1)
    expect(evs.find((e) => e.kind === 'revealed'), '★②§436 洞察(查看)≠ §424 展示:绝不发 revealed(刀:发错垓兽误触发)').toBeUndefined()
    const empty = applyEvents(scene([]), [insight(P1, 3)], {} as never)
    const evs2 = (empty as unknown as { events: readonly { kind: string }[] }).events
    expect(evs2.find((e) => e.kind === 'viewed'), '★⑤空堆不派生').toBeUndefined()
  })
})

describe('★★★★★★★ ③④魔腾双收', () => {
  test('★★★★★★viewed 实例:看到我响/别张不响;registry 产双实例(revealed+viewed)', () => {
    const s = scene([card('nc', 'OGN-194', P1)])
    const trigV = makeNocturneTrigger(asObjId('nc'), P1, 'viewed')
    const seenV = { kind: 'viewed', player: P1, cards: ['nc'] } as unknown as GameEvent
    expect(checkTrigger(trigV, seenV, s, P1), '★③viewed 路响').toBe(true)
    expect(checkTrigger(trigV, { kind: 'viewed', player: P1, cards: ['x'] } as unknown as GameEvent, s, P1)).toBe(false)
    const trigs = activeTriggers(s).filter((t) => t.id.startsWith('OGN-194:seen'))
    expect(trigs.map((t) => t.id).sort(), '★④双实例都在(牌堆里活)').toEqual([
      'OGN-194:seen:revealed:nc', 'OGN-194:seen:viewed:nc'])
  })

  test('★★★★★★E2E:查看顶1看到魔腾 ⇒ 派生 viewed ⇒ 触发条件成立(全链)', () => {
    const s = scene([card('x', 'U-x', P1), card('nc', 'OGN-194', P1)])         
    const r = applyEvents(s, [insight(P1, 1)], {} as never)
    const evs = (r as unknown as { events: readonly GameEvent[] }).events
    const v = evs.find((e) => e.kind === 'viewed')!
    expect((v as unknown as { cards: readonly string[] }).cards).toEqual(['nc'])
    const trigV = makeNocturneTrigger(asObjId('nc'), P1, 'viewed')
    expect(checkTrigger(trigV, v, s, P1), '★查看顶1正好是魔腾 ⇒ 响').toBe(true)
  })
})
