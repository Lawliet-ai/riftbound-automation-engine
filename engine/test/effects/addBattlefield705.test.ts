import { describe, expect, test } from 'vitest'
import { asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'
import { tokenDropZones } from '../../data/cards/token-spells'

                                                     
                                                     
                                                                  
                                                                   
                                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const NEST = asZoneId('battlefield:token:巢穴:1')

const addEv = (zoneId = NEST) => ({ kind: 'addBattlefieldZone', zoneId, defId: 'token:男爵巢穴', owner: P1 })
const base = (): GameState => ({ ...createInitialState([P1, P2], 2), activePlayer: P1, phase: 'main' } as GameState)

describe('★★★★★★★ addBattlefieldZone', () => {
  test('★★★★★★①②③加 zone:zonesByKind 2→3;standby 配套;battlefieldCards 身份', () => {
    const s = base()
    expect(zonesByKind(s, 'battlefield')).toHaveLength(2)
    const after = applyEvents(s, [addEv()] as never, {}).state
    expect(zonesByKind(after, 'battlefield'), '★动态枚举自动看见').toHaveLength(3)
    const nest = after.zones[NEST]!
    expect(nest).toMatchObject({ kind: 'battlefield', owner: null, contents: [] })
    const standby = after.zones[asZoneId('standby:token:巢穴:1')]!
    expect(standby, '★§107.3.a 每处战场配待命区').toBeDefined()
    expect(standby).toMatchObject({ kind: 'standby', parentBattlefield: NEST })
    expect(standby.capacity, '★容量与建局一致').toBe(s.zones[asZoneId('standby:shared:0')]!.capacity)
    expect(after.battlefieldCards?.[NEST as string], '★身份进 battlefieldCards(战场卡通道认它)')
      .toEqual({ defId: 'token:男爵巢穴', owner: P1 })
  })

  test('★★★★★★④已存在=无操作(防撞车):对既有战场 id 发 ⇒ 整个 state 原样', () => {
    const s = base()
    const shared0 = asZoneId('battlefield:shared:0')
    const after = applyEvents(s, [{ kind: 'addBattlefieldZone', zoneId: shared0, defId: 'token:X', owner: P2 }] as never, {}).state
    expect(after.zones[shared0], '★旧战场没被覆盖').toBe(s.zones[shared0])
    expect(after.battlefieldCards?.[shared0 as string], '★身份表也没被塞').toBeUndefined()
  })

  test('★★★★★⑤新战场没人 ⇒ 不受我控制(tokenDropZones 不含);重复添置第二次无操作', () => {
    const s = applyEvents(base(), [addEv()] as never, {}).state
    expect(tokenDropZones(s, P1), '★空战场不受控 ⇒ 只剩基地').not.toContain(NEST as string)
    const twice = applyEvents(s, [addEv()] as never, {}).state
    expect(twice.zones, '★第二次无操作').toBe(s.zones)
  })
})
