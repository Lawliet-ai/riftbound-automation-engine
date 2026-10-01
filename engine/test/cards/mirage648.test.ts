import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { applyEvents } from '../../src/loop/reduce'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_200_SPEC, makeMirageCopyItem } from '../../data/cards/UNL-200'

                                                                   
                                                  
                                               
                            
  
           
                                                                                     
                                         
                                                   
                                                    
                                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, might = 3, kws: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

                                            
const mirror = (oid: string, zone: string): GameObject =>
  ({ ...obj(oid, 'token:映像', P1, zone, 0), counters: { 'mirror-of:sp': 1 } } as GameObject)

type Ev = { kind: string, spec?: { defId: string }, zone?: string, owner?: string, tag?: string, ready?: boolean, dormant?: boolean, unit?: string, player?: string, item?: ChainItem, effect?: { id: string, modification: { kind: string, sourceOid?: string, keyword?: string } } }
const resolveSpell = (s: GameState, target?: string): readonly Ev[] =>
  UNL_200_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, {}) as unknown as readonly Ev[]
const resolveEmbed = (s: GameState, sourceOid: string): readonly Ev[] =>
  makeMirageCopyItem(asObjId('sp'), P1, asObjId(sourceOid)).resolve(s, {}, undefined as never) as unknown as readonly Ev[]

describe('★ 前提:上游/接线', () => {
  test('★★★★★3费 2pip 一蓝一黄、法术、无印刷关键词、进 PLAY_SPECS;无 Trigger 不进触发区', () => {
    expect(CARD_COSTS['UNL-200']).toEqual({ mana: 3, pips: 2, colors: ['blue', 'yellow'] })
    expect(UNL_200_SPEC.cost).toEqual({ mana: 3, pips: [['blue'], ['yellow']] })
    expect(cardKind('UNL-200')).toBe('spell')
    expect(cardKeywords('UNL-200')).toEqual([])
    expect(playSpecFor('UNL-200')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('UNL-200')
  })

  test('★★★★★②「一名单位」零限定词:敌我/基地/战场都在;装备不在', () => {
    const s = scene([
      obj('mine', 'U-A', P1, BF0), obj('foes', 'U-B', P2, BF0), obj('atBase', 'U-C', P2, `base:${P2}`),
      { ...obj('gear', 'E-X', P1, BF0), baseTypes: ['equipment'] } as GameObject,
    ])
    expect([...UNL_200_SPEC.legalTargets(s, P1)].sort()).toEqual(['atBase', 'foes', 'mine'])
  })
})

describe('★★★★★★★ ①句①三事件', () => {
  test('★★★★★★spawnToken **ready**+tag 落**你的基地** + enqueueItem;卡自己不发打出信号 (集中闸 test/loop/tokenPlayOnce1258.test.ts);没答目标 ⇒ 空', () => {
    const s = scene([obj('tgt', 'U-T', P2, BF0)])
    const evs = resolveSpell(s, 'tgt')
                                                                                                                                         
    expect(evs.map((e) => e.kind)).toEqual(['spawnToken', 'enqueueItem'])
    expect(evs[0]).toMatchObject({ kind: 'spawnToken', zone: `base:${P1}`, owner: P1, tag: 'mirror-of:sp', ready: true })
    expect(evs[0]!.spec!.defId).toBe('token:映像')
    expect(evs[1]!.item!.id).toBe('UNL-200-embed-copy:sp')
    expect(resolveSpell(s, undefined)).toEqual([])
  })
})

describe('★★★★★★★ ③④内嵌项目(晚绑定)', () => {
  test('★★★★★★源在场 ⇒ [copyOf, 瞬息];③多个 tag 映像 ⇒ **全部**变(FAQ L92);别人的映像不认', () => {
    const s = scene([obj('tgt', 'U-T', P2, BF0), mirror('m1', `base:${P1}`), mirror('m2', `base:${P1}`),
      obj('other', 'token:映像', P1, `base:${P1}`, 0)])
    const evs = resolveEmbed(s, 'tgt')
    expect(evs.map((e) => [e.kind, e.effect!.modification.kind])).toEqual([
      ['addEffect', 'copyOf'], ['addEffect', 'grantKeyword'],
      ['addEffect', 'copyOf'], ['addEffect', 'grantKeyword'],
    ])
    expect(evs[0]!.effect!.modification.sourceOid).toBe('tgt')
    expect(evs[1]!.effect!.modification.keyword).toBe('瞬息')
  })

  test('★★★★★★④源已离场 ⇒ 复制那句不执行(§359.3.f.2.a)、瞬息**照给**;映像离场 ⇒ 空', () => {
    const s = scene([mirror('m1', `base:${P1}`)])
    const evs = resolveEmbed(s, 'gone')
    expect(evs.map((e) => e.effect!.modification.kind), '★两句独立:只剩瞬息').toEqual(['grantKeyword'])
    const none = scene([obj('tgt', 'U-T', P2, BF0)])
    expect(resolveEmbed(none, 'tgt')).toEqual([])
  })

  test('★★★★★★⑤端到端:挂上两条 effect ⇒ derived.might=源印刷战力、keywords=源印刷+瞬息、copiedDefId', () => {
    const s = scene([obj('tgt', 'U-T', P2, BF0, 5, ['坚守']), mirror('m1', `base:${P1}`)])
    const after = applyEvents(s, resolveEmbed(s, 'tgt') as never, {}).state
    const m = after.objects['m1' as never]!
    expect(m.derived!.might, '★复制源印刷战力(§477.1.b)').toBe(5)
    expect(m.derived!.keywords).toContain('坚守')
    expect(m.derived!.keywords, '★grantKeyword 层②在复制层①之后').toContain('瞬息')
    expect(m.derived!.copiedDefId).toBe('U-T')
  })
})
