import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  TOKEN_BATCH_SPELLS, TOKEN_BATCH_SPECS, dropKey,
} from '../../data/cards/token-batch-spells'
import { SPRITE_TOKEN } from '../../data/cards/batch-play-triggers'                                          
import { tokenDropZones } from '../../data/cards/token-spells'
import { TENTACLE_TOKEN } from '../../data/cards/illaoi'

                                          
                                              
                                                                 
                                                
const u630 = '★630 上游 cardCosts 实测(单印次)'

                                                       
                                      
                                                    
                                                                             
  
                 
                                                                     
                                                      
                                                           
                       
                                                 
                                                     
                                                              
                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

   
                                                                  
                                  
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('mine', P1, bfs[0]!))
  put(unit('foe', P2, bfs[1]!))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!

const rowOf = (defId: string): (typeof TOKEN_BATCH_SPELLS)[number] =>
  TOKEN_BATCH_SPELLS.find((r) => r.defId === defId)!

                                  
function askAll(defId: string, s: GameState, answers: readonly string[]): string[] {
  const next = TOKEN_BATCH_SPECS[defId]!.makeNextChoice!({
    movedCardOid: asObjId('sp'), controller: P1,
  } as never)
  const chosen: Record<string, string> = {}
  const keys: string[] = []
  for (const a of answers) {
    const q = next(s, chosen)
    if (q === null) break
    keys.push(q.key)
    chosen[q.key] = a
  }
  return keys
}

describe('★ 前提:两张的类别 / 费用 / 印刷关键词 / 进表', () => {
                                                     
                                                              
                                                 
                                                  
  test('★★★★★★数量对齐:行表就这几张,多一张少一张都得红', () => {
    expect(TOKEN_BATCH_SPELLS.map((r) => r.defId).slice().sort()).toEqual(['OGN-094', 'OGS-015', 'UNL-069', 'VEN-100'])
  })

  test('★★★★★上游印刷费 ↔ 行表 `cost`(两张都是 0 pip ⇒ 只写 mana)', () => {
    expect(CARD_COSTS['OGS-015']).toEqual({ mana: 6, pips: 0, colors: ['yellow'] })
    expect(CARD_COSTS['UNL-069']).toEqual({ mana: 5, pips: 0, colors: ['blue'] })
    expect(CARD_COSTS['VEN-100'], u630).toEqual({ mana: 3, pips: 0, colors: ['purple'] })
    expect(CARD_COSTS['OGN-094'], '★693 上游实测(单印次)').toEqual({ mana: 3, pips: 0, colors: ['blue'] })
    for (const r of TOKEN_BATCH_SPELLS) {
      expect(r.cost.mana, `${r.defId} 与卡面同价`).toBe(r.energy)
      expect(r.cost.pips, `${r.defId} 不写 pips`).toBeUndefined()
    }
  })

  test('★★★★★★印刷关键词:OGS-015 有[迅捷],**UNL-069 一个都没有**', () => {
    expect(cardKeywords('OGS-015')).toEqual(['迅捷'])
    expect(cardKeywords('UNL-069'), '★上游卡文没有横幅 ⇒ 空').toEqual([])
                                                                      
                                                     
    expect(cardKeywords('VEN-100'), '★§829 流转要登印刷表').toEqual(['流转3'])
                                                          
    expect(cardKeywords('OGN-094'), '★693 待命+迅捷都要登').toEqual(['待命', '迅捷'])
  })

  test('★★★★都是法术、都进了 `PLAY_SPECS`、`legalTargets` 必填', () => {
    for (const r of TOKEN_BATCH_SPELLS) {
      expect(cardKind(r.defId), r.defId).toBe('spell')
      expect(playSpecFor(r.defId), `${r.defId} 进表`).toBeDefined()
      expect(playSpecFor(r.defId)!.legalTargets, `${r.defId} legalTargets`).toBeDefined()
    }
  })
})

describe('★★★★★★★ 数量与 token 规格:逐张钉', () => {
  test('★★★★★★打几名 / 什么规格 / 活不活跃(㊶ 只测一张的话另一张全是假绿)', () => {
    const a = rowOf('OGS-015')
    expect(a.count, '★四名').toBe(4)
    expect(a.token.baseMight, '★★1[S] 随从').toBe(1)
    expect(a.ready, '★★★卡文**没写**活跃 ⇒ 不给').toBeUndefined()
    const b = rowOf('UNL-069')
    expect(b.count, '★两名').toBe(2)
    expect(b.token.baseMight, '★★3[S] 精灵').toBe(3)
    expect(b.ready, '★★★卡文写了「处于活跃状态的」').toBe(true)
                                                         
    const c = rowOf('VEN-100')
    expect(c.count, '★两名').toBe(2)
    expect(c.token.baseMight, '★★1[S] 触手').toBe(1)
    expect(c.ready, '★★★卡文**没写**活跃 ⇒ 不给(§359.2.c 默认休眠)').toBeUndefined()
                                                           
    const d = rowOf('OGN-094')
    expect(d.count, '★★★「一个」不是两名').toBe(1)
    expect(d.token, '★㊼ 与 UNL-069 同一枚 SPRITE_TOKEN(引用相等,不许抄第二份)').toBe(SPRITE_TOKEN)
    expect(d.ready, '★★★卡文写了「处于活跃状态的」').toBe(true)
    expect(d.cardEffect, '★卡文限定语口径').toContain('打出一个处于活跃状态的3{{S}}“精灵”，它拥有{{瞬息}}')
  })

  test('★★★★★★★630 触手规格 = illaoi 那份【同一个对象】(㊼ 唯一定义,不许抄第二份)', () => {
                                                
                                                            
    expect(rowOf('VEN-100').token).toBe(TENTACLE_TOKEN)
    expect(TENTACLE_TOKEN.baseTags, '★「具有比尔吉沃特属性」= §150 标签,漏了就少半张脸')
      .toEqual(['比尔吉沃特'])
                                                                   
    expect('baseKeywords' in TENTACLE_TOKEN, '★触手不自带关键词(对照:精灵自带瞬息)').toBe(false)
  })

  test('★★★★630 卡文限定语在 cardEffect 里(刀6 救活:掉了「比尔吉沃特」这半句就红)', () => {
                                                         
    expect(rowOf('VEN-100').cardEffect).toContain('具有“比尔吉沃特”属性的1{{S}}“触手”')
    expect(rowOf('VEN-100').cardEffect, '★[流转3] 提醒句也要在').toContain('{{流转3}}')
  })

  test('★★★★★★「它们拥有{{瞬息}}」写在 token 自己的 `baseKeywords` 上', () => {
    expect(SPRITE_TOKEN.baseKeywords, '★指示物自带,不是一次性授予').toEqual(['瞬息'])
    expect(rowOf('OGS-015').token.baseKeywords ?? [], '★★随从不带关键词').toEqual([])
  })
})

describe('★★★★★★★ 落点:基地 ∪ 【我控制着的】战场', () => {
  test('★★★★★★恰好两处:我的基地 + 我控制的 bf0;对手占着的 bf1 选不到', () => {
    const s = scene()
    const zones = tokenDropZones(s, P1)
    expect(zones.slice().sort()).toEqual([`base:${P1}`, bf(s, 0)].sort())
    expect(zones, '★对手占着的那处不算').not.toContain(bf(s, 1))
  })

  test('★★★★★★收口自证:问链给的候选就是 `tokenDropZones`(改它会同时炸两族)', () => {
    const s = scene()
    const next = TOKEN_BATCH_SPECS['OGS-015']!.makeNextChoice!({
      movedCardOid: asObjId('sp'), controller: P1,
    } as never)
    const q = next(s, {})!
    expect(q.candidates.map((c) => c.id).sort()).toEqual(tokenDropZones(s, P1).slice().sort())
  })
})

describe('★★★★★★★ 问链:N 名【各问一次】', () => {
  test('★★★★★★★OGS-015 问【四】次,UNL-069 问【两】次', () => {
    const s = scene()
    const many = Array.from({ length: 9 }, () => `base:${P1}`)
    expect(askAll('OGS-015', s, many), '★四个 key,顺序 1..4')
      .toEqual([dropKey(1), dropKey(2), dropKey(3), dropKey(4)])
    expect(askAll('UNL-069', s, many), '★★两个').toEqual([dropKey(1), dropKey(2)])
    expect(askAll('VEN-100', s, many), '★★630 触手也是两个,各自选落点(§355.2.a)')
      .toEqual([dropKey(1), dropKey(2)])
    expect(askAll('OGN-094', s, many), '★★693 精灵召唤只问【一】次(抄 UNL-069 忘改数量就多问)')
      .toEqual([dropKey(1)])
  })

  test('★★★★★★★【各自选落点】:四名可以分散到两处 —— 不是共用一个', () => {
                                        
    const s = scene()
    const answers = [`base:${P1}`, bf(s, 0), `base:${P1}`, bf(s, 0)]
    const evs = TOKEN_BATCH_SPECS['OGS-015']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1,
    } as never)(s, Object.fromEntries(answers.map((a, i) => [dropKey(i + 1), a]))) as readonly { zone: string }[]
    expect(evs).toHaveLength(4)
    expect(evs.map((e) => e.zone).sort(), '★两处各两名')
      .toEqual([`base:${P1}`, `base:${P1}`, bf(s, 0), bf(s, 0)].sort())
  })

  test('★★★★★一处落点都没有 ⇒ 不问', () => {
                                                  
    const s = scene()
    const bare = { ...s, objects: {}, zones: Object.fromEntries(
      Object.entries(s.zones).map(([k, z]) => [k, { ...z, contents: [] }]),
    ) } as unknown as GameState
    expect(tokenDropZones(bare, P1), '★没有战场了,基地还在').toEqual([`base:${P1}`])
  })
})

describe('★★★★★★★ 结算:逐名 `spawnToken` + 结算侧再验落点', () => {
  const resolveWith = (defId: string, s: GameState, chosen: Record<string, string>): readonly unknown[] =>
    TOKEN_BATCH_SPECS[defId]!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1,
    } as never)(s, chosen)

  test('★★★★★★★UNL-069:两条,**都带 `ready: true`**、规格是精灵', () => {
    const s = scene()
    const evs = resolveWith('UNL-069', s, { [dropKey(1)]: `base:${P1}`, [dropKey(2)]: bf(s, 0) })
    expect(evs).toHaveLength(2)
    for (const e of evs as readonly { spec: unknown; ready?: boolean; owner: PlayerId }[]) {
      expect(e.spec, '★精灵规格').toEqual(SPRITE_TOKEN)
      expect(e.ready, '★★卡文写了活跃').toBe(true)
      expect(e.owner).toBe(P1)
    }
  })

  test('★★★★★★★693 OGN-094:恰【一】条 spawnToken、规格=精灵(自带瞬息)、带 ready、落所选战场', () => {
    const s = scene()
    const evs = resolveWith('OGN-094', s, { [dropKey(1)]: bf(s, 0) }) as readonly { spec: { baseKeywords?: readonly string[] }; ready?: boolean; zone: string; owner: PlayerId }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]!.spec, '★㊼ 同一枚 SPRITE_TOKEN').toEqual(SPRITE_TOKEN)
    expect(evs[0]!.spec.baseKeywords, '★「它拥有{{瞬息}}」=token 自带').toEqual(['瞬息'])
    expect(evs[0]!).toMatchObject({ ready: true, zone: bf(s, 0), owner: P1 })
    expect(resolveWith('OGN-094', s, {}), '★没答落点 ⇒ 空').toEqual([])
  })

  test('★★★★★★★630 VEN-100:两条 spawnToken、规格=触手、**不带 ready**、可分散两处', () => {
    const s = scene()
    const evs = resolveWith('VEN-100', s, { [dropKey(1)]: `base:${P1}`, [dropKey(2)]: bf(s, 0) })
    expect(evs, '★两名').toHaveLength(2)
    for (const e of evs as readonly { kind: string, spec?: unknown, ready?: boolean, owner?: string }[]) {
      expect(e.kind).toBe('spawnToken')
      expect(e.spec, '★触手规格(同一个对象)').toBe(TENTACLE_TOKEN)
      expect(e.ready, '★卡文没写活跃 ⇒ 字段压根不给').toBeUndefined()
      expect(e.owner).toBe(P1)
    }
    expect((evs as readonly { zone: string }[]).map((e) => e.zone).sort(),
      '★各自选落点,真的落在两处').toEqual([`base:${P1}`, bf(s, 0)].sort())
  })

  test('★★★★★★★OGS-015 **不带** `ready`(§359.2.c 默认休眠)—— 分辨断言', () => {
    const s = scene()
    const e = resolveWith('OGS-015', s, { [dropKey(1)]: `base:${P1}` })[0] as { ready?: boolean }
    expect(e.ready, '★卡文没写活跃 ⇒ 这个字段压根不给').toBeUndefined()
  })

  test('★★★★★★★结算时那处战场【已经不受我控制】⇒ 那一名不落地', () => {
                                                     
    const s0 = scene()
    const answers = { [dropKey(1)]: `base:${P1}`, [dropKey(2)]: bf(s0, 0) }
    expect(resolveWith('UNL-069', s0, answers), '前提自证:控制着的时候两条都发').toHaveLength(2)
    const intruder = unit('intruder', P2, bf(s0, 0))
    const zones = { ...s0.zones }
    const z = zones[intruder.zone]!
    zones[intruder.zone] = { ...z, contents: [...z.contents, intruder.oid] }
    const contested = { ...s0, objects: { ...s0.objects, intruder }, zones } as GameState
    expect(tokenDropZones(contested, P1), '前提自证:那处不再是合法落点').not.toContain(bf(s0, 0))
    const evs = resolveWith('UNL-069', contested, answers) as readonly { zone: string }[]
    expect(evs, '★只剩打进基地那一名').toHaveLength(1)
    expect(evs[0]!.zone).toBe(`base:${P1}`)
  })

  test('★★★★一个都没答 ⇒ 一条都不发', () => {
    expect(resolveWith('OGS-015', scene(), {})).toEqual([])
  })
})
