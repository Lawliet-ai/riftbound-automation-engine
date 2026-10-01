import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { activatedFor } from '../../data/registry'
import { GEAR_CARDS } from '../../data/gearCards'
import { CARD_COSTS } from '../../data/cardCosts'
import { glassesCopyCandidates } from '../../data/cards/VEN-137'

                                                                      
                                                 
                   
  
           
                                                              
                                                              
                        
                                                                   
                                                                      
                                                        
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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

const glasses = (): GameObject => ({ ...obj('gl', 'VEN-137', P1, `base:${P1}`), baseTypes: ['equipment'] } as GameObject)
const SPEC = activatedFor('VEN-137')[0]!
const std = (): GameState => scene([
  glasses(), obj('host', 'U-H', P1, BF0),
  obj('srcU', 'U-S', P1, BF1, { baseMight: 5, baseKeywords: ['坚守'] }),
  obj('atBase', 'U-B', P1, `base:${P1}`), obj('foe', 'U-F', P2, BF0),
])
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  SPEC.makeNextChoice!({ selfOid: 'gl', controller: P1, target: 'host' } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>) =>
  SPEC.makeResolve({ selfOid: 'gl', controller: P1, target: 'host' } as never)(s, chosen, undefined as never)

describe('★ 前提:①登记与 rewrite 真挂上', () => {
  test('★★★★★武装 4费 0pip 黄在 GEAR_CARDS;工厂 equip:0 被 rewrite(makeNextChoice 存在=工厂原版没有)', () => {
    expect(GEAR_CARDS['VEN-137']).toMatchObject({ name: '可疑的眼镜', keywords: ['装配1黄色'] })
    expect(CARD_COSTS['VEN-137']).toEqual({ mana: 4, pips: 0, colors: ['yellow'] })
    const specs = activatedFor('VEN-137')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.key).toBe('equip:0')
    expect(specs[0]!.cost, '★装配费=1法力+1黄pip(关键词解析)').toEqual({ mana: 1, pips: [['yellow']] })
    expect(specs[0]!.makeNextChoice, '★rewrite 真挂上(工厂原版无第二问)').toBeDefined()
  })

  test('★★★★★★②候选:「另一名」排装配对象、「友方」排敌方、零位置词含基地;没另一名 ⇒ 问不出', () => {
    expect(glassesCopyCandidates(std(), P1, 'host')).toEqual(['atBase', 'srcU'])
    const q = ask(std())!
    expect(q.candidates.map((c) => c.id)).toEqual(['atBase', 'srcU'])
    expect((q as { isTarget?: boolean }).isTarget, '★§355.6「选择」=目标').toBe(true)
    const only = scene([glasses(), obj('host', 'U-H', P1, BF0), obj('foe', 'U-F', P2, BF0)])
    expect(ask(only), '★没有另一名友方 ⇒ 复制半落空,不问').toBeNull()
    expect(ask(std(), { copy: 'srcU' }), '★答过不再问').toBeNull()
  })
})

describe('★★★★★★★ ②③④结算与贴附期生命周期', () => {
  test('★★★★★★QA L585:事件序 [attach, addEffect](先贴附再复制,同一结算不入链)', () => {
    const evs = resolveWith(std(), { copy: 'srcU' }) as unknown as readonly { kind: string, obj?: string, to?: string }[]
    expect(evs.map((e) => e.kind)).toEqual(['attach', 'addEffect'])
    expect(evs[0]).toMatchObject({ kind: 'attach', obj: 'gl', to: 'host', player: P1 })
  })

  test('★★★★★★★③④E2E:复制**印刷**特质(源临时+2不跟,化神 L134);卸除/眼镜离场自动失效', () => {
    const s = std()
    const after = applyEvents(s, resolveWith(s, { copy: 'srcU' }) as never, {}).state
                                       
    const boosted = { ...after, continuousEffects: [...after.continuousEffects, {
      id: 'test-boost', duration: 'permanent', fromPassive: false, timestamp: 1,
      predicate: (o: GameObject) => (o.oid as string) === 'srcU',
      modification: { kind: 'addMight', delta: 2 },
    }] } as unknown as GameState
    const view = recomputeContinuous(boosted)
    expect(view.objects[asObjId('srcU')]!.derived!.might, '★源自己 5+2=7').toBe(7)
    const h = view.objects[asObjId('host')]!
    expect(h.derived!.might, '★host 只拿印刷 5(临时调整不复制)').toBe(5)
    expect(h.derived!.keywords).toContain('坚守')
    expect(h.derived!.copiedDefId).toBe('U-S')
                                     
    const detached = { ...after, objects: { ...after.objects, gl: { ...after.objects[asObjId('gl')]!, status: {} } } } as GameState
    const v2 = recomputeContinuous(detached)
    expect(v2.objects[asObjId('host')]!.derived?.might ?? 2, '★卸除 ⇒ 复制失效回印刷 2').toBe(2)
    expect(v2.objects[asObjId('host')]!.derived?.copiedDefId).toBeUndefined()
                       
    const gone = { ...after, objects: Object.fromEntries(Object.entries(after.objects).filter(([k]) => k !== 'gl')) } as unknown as GameState
    expect(recomputeContinuous(gone).objects[asObjId('host')]!.derived?.copiedDefId, '★眼镜离场 ⇒ 失效').toBeUndefined()
  })

  test('★★★★★⑤落空档:源结算时已离场 ⇒ 只贴附(★676 并列);没答 copy ⇒ 只贴附', () => {
    const evs = resolveWith(std(), { copy: 'ghost' }) as unknown as readonly { kind: string }[]
    expect(evs.map((e) => e.kind), '★§359.3.f.2.a 源没了复制不执行').toEqual(['attach'])
    expect((resolveWith(std(), {}) as unknown as readonly { kind: string }[]).map((e) => e.kind)).toEqual(['attach'])
  })
})
