import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { costModsFor, cardKind, cardKeywords, activatedFor } from '../../data/registry'
import { computeCost } from '../../src/game/costPipeline'

                                   
                                                         
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                        
const SPELL = 'OGN-047'
const NOT_SPELL = 'OGN-001'

function helm(oid: string, controller = P2, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'VEN-045', owner: controller, controller,
    zone: asZoneId(`base:${controller}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['equipment'],
    damage: 0, counters: {}, status: {}, ...extra,
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
                                      
const costForP1 = (st: GameState, defId = SPELL): ReturnType<typeof computeCost> =>
  computeCost({ mana: 3 }, costModsFor(st, P1, defId))

describe('前提', () => {
  test('这两张真卡的类别没记错', () => {
    expect(cardKind(SPELL)).toBe('spell')
    expect(cardKind(NOT_SPELL)).not.toBe('spell')
  })

  test('抑制之盔的印刷关键词是 [强化4绿色],通用工厂出得来规格', () => {
    expect(cardKeywords('VEN-045')).toContain('强化4绿色')
    const spec = activatedFor('VEN-045').find((s) => s.key.startsWith('empower'))
    expect(spec?.cost).toEqual({ mana: 4, pips: [['green']] })
  })
})

describe('★方向:作用于【对手】,不是自己', () => {
  test('★对手控制着盔 → 我的法术贵 1', () => {
    expect(costForP1(scene([helm('h', P2)])).mana).toBe(4)
  })

  test('★【我自己】控制着盔 → 我的法术不涨价(写反了这条会红)', () => {
    expect(costForP1(scene([helm('h', P1)])).mana).toBe(3)
  })

  test('场上没有盔 → 原价', () => {
    expect(costForP1(scene([])).mana).toBe(3)
  })
})

describe('★「改为」是替换不是叠加', () => {
  test('未强化:只加 {1},不加符能', () => {
    const c = costForP1(scene([helm('h', P2)]))
    expect(c.mana).toBe(4)
    expect(c.pips ?? []).toHaveLength(0)
  })

  test('★已强化:改为 {1} 和 {A} —— 法力仍只 +1,另加一枚任意特性符能', () => {
    const c = costForP1(scene([helm('h', P2, { counters: { empower: 1 } })]))
    expect(c.mana).toBe(4)            
    expect(c.pips).toHaveLength(1)
    expect(c.pips![0]).toEqual([])            
  })
})

describe('作用面与时机', () => {
  test('★只对法术生效:单位不吃这条增费', () => {
    expect(costForP1(scene([helm('h', P2)]), NOT_SPELL).mana).toBe(3)
  })

  test('★§383.2.c 源须在场地上:手牌里的盔不生效', () => {
    const inHand = helm('h', P2)
    const st = scene([{ ...inHand, zone: asZoneId(`hand:${P2}`) }])
    expect(costForP1(st).mana).toBe(3)
  })

  test('★两张盔 = 两条独立增费,各按自己的强化状态算', () => {
    const c = costForP1(scene([helm('h1', P2), helm('h2', P2, { counters: { empower: 1 } })]))
    expect(c.mana).toBe(5)             
    expect(c.pips).toHaveLength(1)              
  })
})
