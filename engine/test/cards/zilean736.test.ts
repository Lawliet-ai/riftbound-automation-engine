import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { landEvent, type GameEvent } from '../../src/loop/events'
import { cardKind, cardCost, tokenSpawnDoublerFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { TOKEN_DOUBLE_LEDGER_SUFFIX } from '../../data/cards/UNL-086'

                                                            
                                             
                       
  
           
                                                                 
                                                   
                                                          
                                    
                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

const DEPS = { tokenSpawnDoublerFor } as never
const spawn = (owner: PlayerId): GameEvent => ({
  kind: 'spawnToken', spec: { defId: 'token:映像', baseMight: 3 }, zone: asZoneId(BF0), owner, tag: 'mirror',
} as unknown as GameEvent)
const tokensOf = (s: GameState) => Object.values(s.objects).filter((o) => o.defId === 'token:映像')

describe('★ 前提:登记面(单印次无组)', () => {
  test('★★★★★5费 1pip 蓝、unit、无 variant 组、UNIT_COST 带 pips(★729)', () => {
    expect(CARD_COSTS['UNL-086']).toEqual({ mana: 5, pips: 1, colors: ['blue'] })
    expect(cardKind('UNL-086')).toBe('unit')
    expect(cardCost('UNL-086')).toEqual({ mana: 5, pips: [['blue']] })
    expect(VARIANT_GROUPS['UNL-086'], '★单印次无组实证(736 现场量)').toBeUndefined()
  })
})

describe('★★★★★★★ ①②一变二+每实例每回合账', () => {
  test('★★★★★★基兰在战场 ⇒ 两枚(③同 spec 同 tag 全等);账已记;同回合第二次 ⇒ 只一枚', () => {
    const s0 = scene([obj('zl', 'UNL-086', P1, BF0)])
    const s1 = landEvent(s0, spawn(P1), DEPS)
    const toks = tokensOf(s1)
    expect(toks, '★一变二').toHaveLength(2)
    for (const t of toks) {
      expect(t.defId).toBe('token:映像')
      expect(t.baseMight, '★复制体参数全等(刀:参数没抄全)').toBe(3)
      expect(t.counters['mirror'], '★tag 都写(QA L373 后续按 tag 关联两个都抓)').toBe(1)
      expect(t.status.dormant, '★两枚都按 §359.2.c 默认休眠落地').toBe(true)
    }
    expect(s1.abilityFiredThisTurn?.[`zl:${TOKEN_DOUBLE_LEDGER_SUFFIX}`], '★账记在实例上').toBe(true)
    const s2 = landEvent(s1, spawn(P1), DEPS)
    expect(tokensOf(s2), '★同回合第二次:账满不响 ⇒ 2+1=3').toHaveLength(3)
  })

  test('★★★★★★两个基兰各响一次 ⇒ 三枚(裁判 L95);账各记各的', () => {
    const s0 = scene([obj('z1', 'UNL-086', P1, BF0), obj('z2', 'UNL-086', P1, BF0)])
    const s1 = landEvent(s0, spawn(P1), DEPS)
    expect(tokensOf(s1), '★1 原枚 + z1 复制 + z2 复制(递归链)').toHaveLength(3)
    expect(s1.abilityFiredThisTurn?.[`z1:${TOKEN_DOUBLE_LEDGER_SUFFIX}`]).toBe(true)
    expect(s1.abilityFiredThisTurn?.[`z2:${TOKEN_DOUBLE_LEDGER_SUFFIX}`]).toBe(true)
  })
})

describe('★★★★★★★ ④三反例+判据单元', () => {
  test('★★★★★★敌方 spawn 不响(「若**你**要打出」);基兰在基地不响;装备指示物不响', () => {
    const zl = obj('zl', 'UNL-086', P1, BF0)
    expect(tokensOf(landEvent(scene([zl]), spawn(P2), DEPS)), '★P2 的指示物,P1 基兰不管(刀:敌我丢)').toHaveLength(1)
    expect(tokensOf(landEvent(scene([obj('zl', 'UNL-086', P1, `base:${P1}`)]), spawn(P1), DEPS)), '★「位于战场上」基地不算').toHaveLength(1)
    const gearSpawn = { kind: 'spawnToken', spec: { defId: 'token:金币', baseMight: 0, baseTypes: ['equipment'] }, zone: asZoneId(`base:${P1}`), owner: P1 } as unknown as GameEvent
    const s = landEvent(scene([zl]), gearSpawn, DEPS)
    expect(Object.values(s.objects).filter((o) => o.defId === 'token:金币'), '★「指示物**单位**」装备不响').toHaveLength(1)
  })

  test('★★★★★账清后再可用(resetTurnLedgers 唯一清零点的字段);无基兰 ⇒ 判据返 undefined', () => {
    const s0 = scene([obj('zl', 'UNL-086', P1, BF0)])
    const used = { ...s0, abilityFiredThisTurn: { [`zl:${TOKEN_DOUBLE_LEDGER_SUFFIX}`]: true } } as GameState
    expect(tokenSpawnDoublerFor(used, spawn(P1) as never), '★账满 ⇒ 不响').toBeUndefined()
    const cleared = { ...used, abilityFiredThisTurn: {} } as GameState
    expect(tokenSpawnDoublerFor(cleared, spawn(P1) as never), '★清账后复活').toBe('zl')
    expect(tokenSpawnDoublerFor(scene([]), spawn(P1) as never)).toBeUndefined()
  })
})
