import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { cardKeywords, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { DAMAGE_SPELL_SPECS, DAMAGE_SPELLS, makeMissile252Trigger } from '../../data/cards/damage-spells'

                                          
                                                                                   
                                            
                                                       
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('missile')

function obj(id: string, ctrl: typeof P1, zone: string, types: readonly string[] = ['unit']): GameObject {
  return { oid: asObjId(id), defId: types.includes('spell') ? 'OGN-252' : 'BLK', owner: ctrl, controller: ctrl,
    zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const conquer = (p = P1): GameEvent => ({ kind: 'conquer', player: p, battlefield: BF0 } as GameEvent)
                    
const board = (): GameState => scene([
  obj('missile', P1, `discard:${P1}`, ['spell']),
  obj('h1', P1, `hand:${P1}`), obj('h2', P1, `hand:${P1}`),
])

describe('★ 前提:卡面事实与两条通道接线(四步查法落测)', () => {
  test('官方名;4费1pip红/紫;rows 行 oneAnywhere 5 点;spec 运行时;加宽表登了;无印刷关键词', () => {
    const row = DAMAGE_SPELLS.find((r) => r.defId === 'OGN-252')!
    expect(row.name, '③教训:卡名以 cardNames.ts 为准(含全角叹号)').toBe('超究极死神飞弹！')
    expect(CARD_COSTS['OGN-252']).toEqual({ mana: 4, pips: 1, colors: ['red', 'purple'] })
    expect(row.cost).toEqual({ mana: 4, pips: [['red', 'purple']] })
    expect(row.scope, '「对一名单位」无位置词 ⇒ 含基地档').toBe('oneAnywhere')
    expect(row.amount).toBe(5)
    expect(playSpecFor('OGN-252'), '⑥运行时为准').toBe(DAMAGE_SPELL_SPECS['OGN-252'])
    expect(TRIGGER_ZONE_DEFIDS, '废牌堆加宽登了').toContain('OGN-252')
    expect(cardKeywords('OGN-252'), '无印刷关键词(普通速度)').toEqual([])
  })
})

describe('🔴★★★★第二句:废牌堆里征服可弃一回手', () => {
  const trig = makeMissile252Trigger(SELF, P1)

  test('🔴★★★我征服+我在废牌堆 ⇒ 响(mayChoose);我在手牌 ⇒ 不响;对手征服 ⇒ 不响', () => {
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose).toBe(true)
    expect(trig.filter!(conquer(), board())).toBe(true)
    const inHand = scene([obj('missile', P1, `hand:${P1}`, ['spell'])])
    expect(trig.filter!(conquer(), inHand), '不在废牌堆 ⇒ 语义门挡住').toBe(false)
    expect(trig.filter!(conquer(P2), board()), '对手征服').toBe(false)
  })

  test('🔴★★★问:手牌候选;没手牌 ⇒ 费用付不出不问', () => {
    const req = trig.nextChoice!(board(), conquer(), {})
    expect(req!.key).toBe('discardCard')
    expect([...req!.candidates.map((c) => c.id)].sort()).toEqual(['h1', 'h2'])
    const empty = scene([obj('missile', P1, `discard:${P1}`, ['spell'])])
    expect(trig.nextChoice!(empty, conquer(), {})).toBeNull()
  })

  test('🔴★★★effect 两段:弃牌进废牌堆 + 此牌回手;弃牌张已不在手 ⇒ 全空;此牌已不在废牌堆 ⇒ 全空', () => {
    const evs = trig.effect!(board(), conquer(), { discardCard: 'h1' })
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'h1', to: `discard:${P1}` })
    expect(evs[1]).toMatchObject({ kind: 'zoneChange', obj: 'missile', to: `hand:${P1}` })
    const cardGone = scene([obj('missile', P1, `discard:${P1}`, ['spell']), obj('h1', P1, `discard:${P1}`)])
    expect(trig.effect!(cardGone, conquer(), { discardCard: 'h1' }), '㉙ 弃牌张已不在手 ⇒ 整条不执行').toEqual([])
    const selfGone = scene([obj('missile', P1, `hand:${P1}`, ['spell']), obj('h1', P1, `hand:${P1}`)])
    expect(trig.effect!(selfGone, conquer(), { discardCard: 'h1' }), '㉙ 此牌已离开废牌堆 ⇒ 整条不执行').toEqual([])
    expect(trig.effect!(board(), conquer(), {}), '没选 ⇒ 空').toEqual([])
  })
})
