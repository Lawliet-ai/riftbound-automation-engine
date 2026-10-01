import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { cardKeywords } from '../../data/registry'
import { OGN_112, OGN_112A, OGN_112_CARD_EFFECT, makeKaisa112Trigger } from '../../data/cards/SFD-140'

                                                      
                                                                                           
                                                             
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('kaisa')
const CHEAP = 'SFD-087'                                    

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 6, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as GameObject
}
const rune = (oid: string, color: string): GameObject =>
  ({ ...obj(oid, `rune:${color}`, P1, `base:${P1}`, ['rune']) } as GameObject)
function scene(objs: GameObject[], score = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    scores: { ...base.scores, [P1]: score } } as GameState
}
const conquer = (bf = BF0, p = P1): GameEvent => ({ kind: 'conquer', player: p, battlefield: bf } as GameEvent)
                        
const board = (score: number): GameState => scene([
  obj('kaisa', 'OGN-112', P1, BF0),
  obj('sp', CHEAP, P1, `discard:${P1}`, ['spell']),
  rune('r1', 'blue'), rune('r2', 'blue'), rune('r3', 'blue'),
], score)

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('双号并组;6费1蓝pip 6S;[游走] 两条通道;mayChoose;样本自证', () => {
    expect(CARD_COSTS['OGN-112']).toEqual({ mana: 6, pips: 1, colors: ['blue'] })
    expect(CARD_COSTS['OGN-112a']).toEqual(CARD_COSTS['OGN-112'])
    expect(VARIANT_GROUPS['OGN-112']).toEqual(['OGN-112', 'OGN-112a'])
    expect(OGN_112.power, '上游实测 6S').toBe(6)
    expect(OGN_112A.id).toBe('OGN-112a')
    expect(OGN_112.keywords).toEqual(['游走'])
    expect(cardKeywords('OGN-112'), 'CARD_KEYWORDS 通道(教训②)').toEqual(['游走'])
    expect(cardKeywords('OGN-112a')).toEqual(['游走'])
    expect(CARD_COSTS[CHEAP]!.mana, '样本自证:先知之兆 2 费').toBe(2)
    expect(OGN_112_CARD_EFFECT).toContain('低于你当前分数')
    const trig = makeKaisa112Trigger(SELF, P1)
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose).toBe(true)
  })
})

describe('🔴★★★★判据与费用谓词', () => {
  const trig = makeKaisa112Trigger(SELF, P1)

  test('🔴★★★我征服此处才响;别处/对手征服不响', () => {
    expect(trig.filter!(conquer(), board(3))).toBe(true)
    expect(trig.filter!(conquer('battlefield:shared:1'), board(3)), '我不在被征服那处').toBe(false)
    expect(trig.filter!(conquer(BF0, P2), board(3)), '对手征服').toBe(false)
  })

  test('🔴★★★费用谓词三档:分数3(2<3 进)/分数2(2<2 不进)/分数0(不问)', () => {
    const req3 = trig.nextChoice!(board(3), conquer(), {})
    expect(req3!.candidates.map((c) => c.id)).toEqual(['sp'])
    expect(trig.nextChoice!(board(2), conquer(), {}), '严格小于:2 费卡 2 分打不出').toBeNull()
    expect(trig.nextChoice!(board(0), conquer(), {}), '0 分谁都打不出').toBeNull()
  })

  test('🔴★★★effect = playSpellFromZone(freeMana+recycleOnLeave)', () => {
    const evs = trig.effect!(board(3), conquer(), { kaisa: 'sp' })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({
      kind: 'playSpellFromZone', player: P1, card: 'sp', freeMana: true, recycleOnLeave: true,
    })
    expect(trig.effect!(board(3), conquer(), { kaisa: 'gone' }), '牌没了 ⇒ 静默').toEqual([])
  })
})
