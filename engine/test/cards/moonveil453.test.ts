import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { SFD_221, SFD_221_CARD_EFFECT, makeMoonveilAltarTrigger, myGearOnField221, EXTRA_BF_TRIGGER_FACTORIES } from '../../data/cards/battlefields-extra'

                                                                            
                                                                        
                                                       
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, ctrl: typeof P1, zone: string, types: readonly string[], status: Record<string, unknown> = {}): GameObject {
  return { oid: asObjId(id), defId: types.includes('equipment') ? 'SFD-150' : 'BLK', owner: ctrl, controller: ctrl,
    zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status } as GameObject
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const conquer = (bf = BF0, p = P1): GameEvent => ({ kind: 'conquer', player: p, battlefield: bf } as GameEvent)
                                                             
                                     
const board = (): GameState => scene([
  obj('u1', P1, BF0, ['unit']),
  obj('armed', P1, BF0, ['equipment'], { attachedTo: asObjId('u1') }),
  obj('loose', P1, `base:${P1}`, ['equipment'], { tapped: true }),
  obj('foe', P2, `base:${P2}`, ['equipment']),
  obj('handG', P1, `hand:${P1}`, ['equipment']),
])

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('战场卡;卡文;mayChoose 编译后还在;EXTRA_BF 表接线', () => {
    expect(SFD_221.category).toBe('battlefield')
    expect(SFD_221.cardNo).toBe('SFD·221/221')
    expect(SFD_221_CARD_EFFECT).toContain('变为活跃状态')
    expect(SFD_221_CARD_EFFECT).toContain('将其卸除')
    const trig = makeMoonveilAltarTrigger(BF0, P1)
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose, '「可以选择」紧跟时机从句').toBe(true)
    const made = EXTRA_BF_TRIGGER_FACTORIES['SFD-221']!(BF0, P1)
    expect(made).toHaveLength(1)
    expect(made[0]!.sourceDefId).toBe('SFD-221')
  })
})

describe('🔴★★★★判据与两问', () => {
  const trig = makeMoonveilAltarTrigger(BF0, P1)

  test('🔴★★★我征服此处才响;别处/对手征服不响', () => {
    expect(trig.filter!(conquer(), board())).toBe(true)
    expect(trig.filter!(conquer('battlefield:shared:1'), board()), '征服的是别处').toBe(false)
    expect(trig.filter!(conquer(BF0, P2), board()), '对手征服').toBe(false)
  })

  test('🔴★★★问1候选=场上我控装备(武装+散装备+休眠的都算);敌方/手牌装备/单位不进;没装备不问', () => {
    const req = trig.nextChoice!(board(), conquer(), {})
    expect(req!.key).toBe('gear')
    expect([...req!.candidates.map((c) => c.id)].sort(), '武装 armed + 散装备 loose(休眠照选)').toEqual(['armed', 'loose'])
    const bare = scene([obj('u1', P1, BF0, ['unit']), obj('foe', P2, `base:${P2}`, ['equipment'])])
    expect(trig.nextChoice!(bare, conquer(), {}), '场上没友方装备 ⇒ 不问').toBeNull()
  })

  test('🔴★★★问2只对武装问;散装备到此为止;装备中途没了也不问', () => {
    const req = trig.nextChoice!(board(), conquer(), { gear: 'armed' })
    expect(req!.key).toBe('detach')
    expect(req!.candidates.map((c) => c.id)).toEqual(['yes', 'no'])
    expect(trig.nextChoice!(board(), conquer(), { gear: 'loose' }), '散装备没有第二问').toBeNull()
    expect(trig.nextChoice!(board(), conquer(), { gear: 'gone' }), '装备没了 ⇒ 不问').toBeNull()
    expect(trig.nextChoice!(board(), conquer(), { gear: 'armed', detach: 'no' }), '问完').toBeNull()
  })
})

describe('🔴★★★★结算:变活跃 ± 卸除', () => {
  const trig = makeMoonveilAltarTrigger(BF0, P1)

  test('🔴★★★散装备 ⇒ 只有 statusChange tapped false(休眠→活跃)', () => {
    const evs = trig.effect!(board(), conquer(), { gear: 'loose' })
    expect(evs).toEqual([{ kind: 'statusChange', target: 'loose', key: 'tapped', value: false }])
  })

  test('🔴★★★武装+卸除 ⇒ statusChange 在前 + detach 在后;答 no ⇒ 只变活跃', () => {
    const evs = trig.effect!(board(), conquer(), { gear: 'armed', detach: 'yes' })
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'statusChange', target: 'armed', key: 'tapped', value: false })
    expect(evs[1]).toMatchObject({ kind: 'detach', obj: 'armed' })
    expect(trig.effect!(board(), conquer(), { gear: 'armed', detach: 'no' })).toHaveLength(1)
  })

  test('🔴★★★答了卸除但结算时已不是武装(§435.1.a.1)⇒ 只变活跃不发 detach', () => {
    const detached = scene([
      obj('u1', P1, BF0, ['unit']),
      obj('armed', P1, BF0, ['equipment']), // 中途已被别的效果卸掉:attachedTo 没了
    ])
    const evs = trig.effect!(detached, conquer(), { gear: 'armed', detach: 'yes' })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'statusChange', target: 'armed' })
  })

  test('★装备没了 ⇒ 整条落空', () => {
    expect(trig.effect!(board(), conquer(), { gear: 'gone' })).toEqual([])
  })

  test('★候选助手直测:武装 zone 跟着单位在战场,照样算「在场」', () => {
    expect([...myGearOnField221(board(), P1)].sort()).toEqual(['armed', 'loose'])
    expect(myGearOnField221(board(), P2)).toEqual(['foe'])
  })
})
