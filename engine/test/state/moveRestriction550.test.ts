import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardPassives } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { moveRestricted } from '../../src/state/moveRestriction'
import { moveDestinations, moveUnitEvents } from '../../data/cards/enemy-move'
import { OGN_173_SPEC, OGN_173_DEST_KEY } from '../../data/cards/OGN-173'

setCardPassiveProvider(cardPassives)

                                   
  
                                                                    
                                        
                                     
                                         
                                             
                                             
                                                  
                                    
  
                                                
                                                    
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const plain = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: 3 })

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState)
}
                             
const withLimit = (s: GameState, oid: string, ...limits: string[]): GameState => {
  const o = s.objects[asObjId(oid)]!
  return { ...s, objects: { ...s.objects, [oid]: { ...o, derived: { ...o.derived, restrictions: limits } } } } as GameState
}

describe('🔴🔴🔴★★★★★★共用闸 moveRestricted 本身', () => {
  test('★前提:三种取值只有 move / moveToBase 两个,别的一律放行', () => {
    const s = withLimit(scene([plain('u')]), 'u', 'moveToBase')
    const u = s.objects[asObjId('u')]!
    expect(moveRestricted(s, u, `base:${P1}`), '终点是基地 ⇒ 挡').toBe(true)
    expect(moveRestricted(s, u, BF1), '⚠️ 别锁多:战场↔战场照走').toBe(false)
  })

  test("★★'move' 是全禁:去哪都挡", () => {
    const s = withLimit(scene([plain('u')]), 'u', 'move')
    const u = s.objects[asObjId('u')]!
    expect(moveRestricted(s, u, `base:${P1}`)).toBe(true)
    expect(moveRestricted(s, u, BF1)).toBe(true)
  })

  test('★对照组:没有限制时一律放行', () => {
    const s = scene([plain('u')])
    const u = s.objects[asObjId('u')]!
    expect(moveRestricted(s, u, `base:${P1}`)).toBe(false)
    expect(moveRestricted(s, u, BF1)).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★效果驱动的移动【也吃】移动限制(第550轮补,此前零覆盖)', () => {
  test('🔴★★★★★★候选侧:moveDestinations【含】被锁的基地(★1801f 缺陷 264 · FAQ :552)', () => {
                                                          
                                                       
                                                  
                                                        
    const s = withLimit(scene([plain('u')]), 'u', 'moveToBase')
    const dests = moveDestinations(s, 'u')
    expect(dests, '★★★基地照给(候选给得出 ≠ 执行得了,执行侧才撤销)').toContain(`base:${P1}`)
    expect(dests, '⚠️ 别锁多:别处战场照选').toContain(BF1)
  })

  test('🔴🔴🔴★★★★★★【承重】发事件侧:落点写死直调也要挡 —— moveUnitEvents 返空', () => {
                                                                    
                                                                
                                                 
    const s = withLimit(scene([plain('u')]), 'u', 'moveToBase')
    expect(moveUnitEvents(s, 'u', `base:${P1}`), '★★★被赶回基地 ⇒ 一个事件都不发').toEqual([])
    expect(moveUnitEvents(s, 'u', BF1).length, '⚠️ 别锁多:挪去别处战场照发两条').toBe(2)
  })

  test("🔴★★★★★'move' 全禁:候选照给(基地 + 别处战场)、moveUnitEvents 去哪都不发", () => {
                                                                    
    const s = withLimit(scene([plain('u')]), 'u', 'move')
    expect(moveDestinations(s, 'u').slice().sort(), '★候选照给(基地 + 别处战场)').toEqual([`base:${P1}`, BF1].sort())
    expect(moveUnitEvents(s, 'u', BF1)).toEqual([])
    expect(moveUnitEvents(s, 'u', `base:${P1}`)).toEqual([])
  })

  test('🔴🔴★★★★★★【承重分野】效果移动**不需要[游走]** —— 别把 §810 一起下沉', () => {
                                                   
                                                   
    const s = scene([plain('noRush')])          
    expect(moveDestinations(s, 'noRush'), '★★★战场→别处战场,无游走照样是合法落点').toContain(BF1)
    expect(moveUnitEvents(s, 'noRush', BF1).length).toBe(2)
  })

  test('🔴★★★★★【承重分野】效果移动可以把敌方单位挪去【我方】战场侧,不受 §144.4 方向约束', () => {
    const s = scene([plain('foe', P2)])
    expect(moveDestinations(s, 'foe'), '敌方单位的落点里有它自己的基地').toContain(`base:${P2}`)
    expect(moveDestinations(s, 'foe')).toContain(BF1)
  })
})

describe('🔴🔴🔴★★★★★★真卡接线:UNL-111 / SFD-014 挡得住效果移动', () => {
  test('🔴★★★★★★坚定的哨兵 UNL-111:敌方效果也赶不回基地,但队友照赶', () => {
    const s = scene([obj('sentry', 'UNL-111'), plain('mate')])
    expect(s.objects[asObjId('sentry')]!.derived?.restrictions, '★前提:限制真的算出来了').toContain('moveToBase')
    expect(moveUnitEvents(s, 'sentry', `base:${P1}`), '★★★效果移动同样挡').toEqual([])
    expect(moveUnitEvents(s, 'mate', `base:${P1}`).length, '⚠️ 只锁我自己,别把队友一起锁了').toBe(2)
  })

  test('🔴★★★★★★牛头人清算者 SFD-014:连【敌方】单位也赶不回它自己的基地', () => {
    const s = scene([obj('minotaur', 'SFD-014'), plain('foe', P2)])
    expect(s.objects[asObjId('foe')]!.derived?.restrictions, '★前提:敌方也被锁').toContain('moveToBase')
    expect(moveUnitEvents(s, 'foe', `base:${P2}`), '★★★我打法术想把它赶回基地 ⇒ 挡下').toEqual([])
    expect(moveUnitEvents(s, 'foe', BF1).length, '⚠️ 挪去别处战场仍可以').toBe(2)
  })
})

describe('🔴🔴🔴★★★★★★挡下移动【不许短路整条指示】(被撤销 ≠ 被无视)', () => {
  test('🔴🔴★★★★★★驭风而行 OGN-173:移动被挡,后半句「变为活跃」照发', () => {
                                    
                                        
    const s = withLimit(scene([plain('u', P1, { status: { dormant: true } as never })]), 'u', 'move')
    const evs = OGN_173_SPEC.makeResolve!({ target: 'u' } as never)(s, { [OGN_173_DEST_KEY]: BF1 })
    expect(evs.map((e) => (e as { kind: string }).kind), '★★★只剩活跃那一条,但它必须在').toEqual(['statusChange'])
    expect((evs[0] as { key: string; value: unknown }).value, '真的是唤醒').toBe(false)
  })

  test('🔴★★★★★对照组:没有限制时两条都发(移动 2 条 + 活跃 1 条)', () => {
    const s = scene([plain('u', P1, { status: { dormant: true } as never })])
    const evs = OGN_173_SPEC.makeResolve!({ target: 'u' } as never)(s, { [OGN_173_DEST_KEY]: BF1 })
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['zoneChange', 'unitMoved', 'statusChange'])
  })
})
