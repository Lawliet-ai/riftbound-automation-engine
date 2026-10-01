import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { SAND_SOLDIER_TOKEN } from '../../data/cards/token-spells'
import { SFD_154_SPEC, SFD_154_PICK, makeGuardActivateItem, guardSoldierTag } from '../../data/cards/SFD-154'                       

                                                            
                                                              
                                                  
                   
  
           
                                                                  
                                                                         
                                        
                                                                  
                                                                           
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
} as GameObject)

                                                    
const rune = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, 'rune:yellow', who, `base:${who}`, ['rune']), baseMight: 0 } as GameObject)

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

type Ev = { kind: string, spec?: { defId: string, baseMight?: number }, zone?: string, owner?: string, ready?: boolean, unit?: string, player?: string, item?: { id: string }, target?: string, key?: string, value?: boolean, cost?: { pips?: readonly (readonly string[])[] } }
                                                                                 
const soldier = (oid: string, who: PlayerId): GameObject => ({ ...obj(oid, SAND_SOLDIER_TOKEN.defId, who, `base:${who}`), counters: { [guardSoldierTag(asObjId('sp'))]: 1 }, status: { dormant: true } } as GameObject)
const ITEM = (_soldierOid: string) => makeGuardActivateItem(asObjId('sp'), P1)                                   

describe('★ 前提:①登记/②resolve 三事件', () => {
  test('★★★★★3费 0pip 黄、[待命] 两份、target none、纯 spec 不登触发区', () => {
    expect(CARD_COSTS['SFD-154']).toEqual({ mana: 3, pips: 0, colors: ['yellow'] })
    expect(cardKind('SFD-154')).toBe('spell')
    expect(cardKeywords('SFD-154'), '★§811 引擎统一管 ⇒ 只登 keyword').toEqual(['待命'])
    const reg = playSpecFor('SFD-154')!
    expect(reg.target).toBe('none')
    expect(reg.cost).toEqual({ mana: 3 })
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('SFD-154')
  })

  test('★★★★★★②spawnToken(2[S] 共用件/我的基地/缺省休眠)+enqueueItem;卡自己不发打出信号 (集中闸 test/loop/tokenPlayOnce1258.test.ts)', () => {
    const s = scene([])
    const evs = SFD_154_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, {} as never) as unknown as readonly Ev[]
                                                                                                                                         
    expect(evs.map((e) => e.kind), '★勘误点:激活走 enqueueItem(对手可反应)').toEqual(['spawnToken', 'enqueueItem'])
    expect(evs[0]).toMatchObject({ kind: 'spawnToken', zone: `base:${P1}`, owner: P1 })
    expect(evs[0]!.spec!.defId).toBe(SAND_SOLDIER_TOKEN.defId)
    expect(evs[0]!.spec!.baseMight, '★「2{S}」').toBe(2)
    expect(evs[0]!.ready, '★卡文没写活跃 ⇒ §359.2.c 缺省休眠(活跃要付黄)').toBeUndefined()
    expect(evs[1]!.item!.id).toBe('SFD-154-embed-activate:sp')
  })
})

describe('★★★★★★★ ③内嵌 nextChoice', () => {
  test('★★★★★★「可以选择」pay/skip 二档;付不出黄 ⇒ 不问;士兵没了 ⇒ 不问;答过 ⇒ 不问', () => {
    const ok = scene([soldier('sd', P1), rune('r0', P1)])
    const q = ITEM('sd').nextChoice!(ok, {})!
    expect(q.key).toBe(SFD_154_PICK)
    expect(q.candidates.map((c) => c.id), '★mayChoose 二档(skip 档在)').toEqual(['pay', 'skip'])
    expect(ITEM('sd').nextChoice!(scene([soldier('sd', P1)]), {}), '★零黄符文 ⇒ 付不出 ⇒ 连问都不问').toBeNull()
    expect(ITEM('sd').nextChoice!(scene([rune('r0', P1)]), {}), '★士兵没了 ⇒ 不问').toBeNull()
    expect(ITEM('sd').nextChoice!(ok, { [SFD_154_PICK]: 'skip' })).toBeNull()
  })
})

describe('★★★★★★★ ④内嵌 resolve', () => {
  test('★★★★★★pay ⇒ [spend 一枚黄, statusChange dormant:false](§204.1.b 费用在前)', () => {
    const s = scene([soldier('sd', P1), rune('r0', P1)])
    const evs = ITEM('sd').resolve(s, { [SFD_154_PICK]: 'pay' }) as unknown as readonly Ev[]
    expect(evs.map((e) => e.kind)).toEqual(['spend', 'statusChange'])
    expect(evs[0]).toMatchObject({ kind: 'spend', player: P1 })
    expect(evs[0]!.cost!.pips, '★㊶ 一枚黄').toEqual([['yellow']])
    expect(evs[1]).toMatchObject({ kind: 'statusChange', target: 'sd', key: 'dormant', value: false })
  })

  test('★★★★★skip/没答 ⇒ 空;结算复验:士兵没了 ⇒ 空;黄被用掉 ⇒ 空(spend 静默 no-op 先验)', () => {
    const ok = scene([soldier('sd', P1), rune('r0', P1)])
    expect(ITEM('sd').resolve(ok, { [SFD_154_PICK]: 'skip' })).toEqual([])
    expect(ITEM('sd').resolve(ok, {})).toEqual([])
    expect(ITEM('sd').resolve(scene([rune('r0', P1)]), { [SFD_154_PICK]: 'pay' }), '★士兵结算时没了').toEqual([])
    expect(ITEM('sd').resolve(scene([soldier('sd', P1)]), { [SFD_154_PICK]: 'pay' }), '★入链后黄符文被用掉 ⇒ 复验兜住').toEqual([])
  })
})
