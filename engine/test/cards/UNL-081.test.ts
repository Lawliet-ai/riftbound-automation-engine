import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'                  
import type { GameObject } from '../../src/state/object'
import {
  UNL_081,
  UNL_081_CARD_EFFECT,
  MIRROR_TOKEN,
  SERVITOR_MIRROR_COUNT,
  spawnServitorMirrors,
  mirrorsBecomeCopies,
  makeServitorPlayTrigger,
} from '../../data/cards/UNL-081'
import { detectTriggers } from '../../src/dsl/trigger'
import { runEphemeralStep } from '../../src/keywords/ephemeral'
import type { PlayUnitEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                          
function withServitor(): { state: GameState; selfOid: ReturnType<typeof asObjId> } {
  const base = createInitialState([P1, P2])
  const selfOid = asObjId('servitor')
  const self: GameObject = {
    oid: selfOid, defId: 'UNL-081', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 1, baseKeywords: ['待命', '瞬息'], damage: 0, counters: {}, status: {},
  }
  const z = base.zones[BF0]!
  return {
    state: { ...base, objects: { [selfOid]: self }, zones: { ...base.zones, [BF0]: { ...z, contents: [selfOid] } } },
    selfOid,
  }
}

describe('赐面守侍 UNL-081(errata)', () => {
  test('卡文逐字 + 待命瞬息 + errata内嵌式("然后进行一次") + 费用/战力', () => {
    expect(UNL_081_CARD_EFFECT).toContain('在此处打出两名“映像”')
    expect(UNL_081_CARD_EFFECT).toContain('然后进行一次：它们变为我的复制体')                   
    expect(UNL_081.keywords).toEqual(['待命', '瞬息'])
    expect(UNL_081.energy).toBe(2)
    expect(UNL_081.power).toBe(1)
  })

  test('映像 token 规格 §187.6:0战力、无印刷关键词、单位指示物', () => {
    expect(MIRROR_TOKEN).toEqual({ defId: 'token:映像', baseMight: 0, baseKeywords: [] })
    expect(SERVITOR_MIRROR_COUNT).toBe(2)
  })

  test('打出触发 §383:仅"当你打出【我】时"', () => {
    const { state, selfOid } = withServitor()
    const t = makeServitorPlayTrigger(selfOid, P1)
    const mine: PlayUnitEvent = { kind: 'playUnit', unit: selfOid, player: P1 }
    const other: PlayUnitEvent = { kind: 'playUnit', unit: asObjId('someoneElse'), player: P1 }
    expect(detectTriggers(state, mine, [t], P1)).toHaveLength(1)
    expect(detectTriggers(state, other, [t], P1)).toHaveLength(0)
  })

                                                            
                                              
                                                                 
                                                 
                                                                      
                           
  test('★真触发发出的三条事件:两枚映像带同一 tag + 内嵌复制项入链(打出信号由产地派生,★1258)', () => {
    const { state, selfOid } = withServitor()
    const t = makeServitorPlayTrigger(selfOid, P1)
    const ev: PlayUnitEvent = { kind: 'playUnit', unit: selfOid, player: P1 }
    const evs = t.effect(state, ev, {})
                                                                                                                                         
    expect(evs.map((e) => e.kind), '删掉任何一条这里都会红')
      .toEqual(['spawnToken', 'spawnToken', 'enqueueItem'])
                                               
    const tags = evs.filter((e) => e.kind === 'spawnToken').map((e) => (e as { tag?: string }).tag)
    expect(tags[0]).toBeDefined()
    expect(tags[1]).toBe(tags[0])
                                                                     
    const r = applyEvents(state, evs.filter((e) => e.kind !== 'enqueueItem') as never, { getTriggers: () => [] } as never)
    const derived = (((r as unknown as { events?: readonly { kind: string; unit?: string; at?: string }[] }).events) ?? []).filter((e) => e.kind === 'playUnit')
    expect(derived, '★两枚映像 ⇒ 产地派生两条(★1258 缺陷 160 前是四条)').toHaveLength(2)
    expect(new Set(derived.map((e) => e.unit)).size, '★两条各指一枚').toBe(2)
    expect(derived.every((e) => e.at === BF0), '★★★落点都是我所在的战场(不是基地)').toBe(true)
  })

  test('第一步(造景走工具):2个映像同一战场,初始为普通0[M]无关键词(反应窗口内)', () => {
    const { state } = withServitor()
    const { state: s, tokenOids } = spawnServitorMirrors(state, asZoneId(BF0), P1)
    expect(tokenOids).toHaveLength(2)
    expect(s.zones[BF0]!.contents).toHaveLength(3)                 
    for (const oid of tokenOids) {
      const tok = s.objects[oid]!
      expect(tok.defId).toBe('token:映像')
      expect(tok.controller).toBe(P1)
      expect(tok.baseMight).toBe(0)
      expect(tok.baseKeywords).toEqual([])                                   
    }
  })

  test('第二步(内嵌触发)复制体化:映像派生为1[M]待命瞬息(§477.1.b)', () => {
    const { state, selfOid } = withServitor()
    const spawned = spawnServitorMirrors(state, asZoneId(BF0), P1)
    const s = mirrorsBecomeCopies(spawned.state, spawned.tokenOids, selfOid)
    for (const oid of spawned.tokenOids) {
      const tok = s.objects[oid]!
      expect(tok.derived!.might).toBe(1)                                 
      expect(tok.derived!.keywords).toContain('待命')                     
      expect(tok.derived!.keywords).toContain('瞬息')
    }
  })

  test('§371 两份瞬息:复制后的映像在控制者开始阶段各被瞬息摧毁', () => {
    const { state, selfOid } = withServitor()
    const spawned = spawnServitorMirrors(state, asZoneId(BF0), P1)
    const s = mirrorsBecomeCopies(spawned.state, spawned.tokenOids, selfOid)
    const after = runEphemeralStep(s, P1)               
                                             
    expect(after.zones[BF0]!.contents).toHaveLength(0)
  })

  test('复制是两步:未做 mirrorsBecomeCopies 时映像不算瞬息(不被摧毁)', () => {
    const { state } = withServitor()
    const spawned = spawnServitorMirrors(state, asZoneId(BF0), P1)
    const after = runEphemeralStep(spawned.state, P1)                      
    expect(after.zones[BF0]!.contents).toHaveLength(2)                  
  })
})
