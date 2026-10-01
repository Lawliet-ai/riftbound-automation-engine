import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, cardCost, cardPassives, activatedFor, activeTriggers } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { canDealCombatDamage } from '../../src/combat/battleRoles'
import {
  SFD_082, SFD_082A, SFD_082B, SFD_082_SPEC, SFD_082_DEFIDS, makeEzreal082Triggers,
} from '../../data/cards/SFD-082'
import { GROUP_PASSIVE_DEFIDS } from '../../data/cards/group-passives'

                                                                    
                                           
                                                 
  
                                    
                                                                                            
                                                             
                                                     
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const mk = (oid: string, defId: string, who: PlayerId, zone: string, might = 3): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}
function live(objs: readonly GameObject[]): GameState {
  setCardPassiveProvider(cardPassives)
  return recomputeContinuous(scene(objs))
}

describe('★ 前提:卡面与接线', () => {
  test('★4费 1蓝pip、3 战力;三个卡号规格一致', () => {
    expect(CARD_COSTS['SFD-082']).toEqual({ mana: 4, pips: 1, colors: ['blue'] })
    expect([SFD_082.power, SFD_082.energy]).toEqual([3, 4])
    expect(cardKind('SFD-082')).toBe('unit')
    for (const id of SFD_082_DEFIDS) {
      expect(cardCost(id).pips, `${id} 的 pip`).toEqual([['blue']])
    }
    expect([SFD_082A.cardNo, SFD_082B.cardNo], '★527 卡号照上游原样抄(082b 带 ·P)')
      .toEqual(['SFD·082a/221', 'SFD·082b/221·P'])
  })

  test('🔴🔴★★★★★★[迅捷] 是【技能的时机权限】,不是印刷关键词(⑪)', () => {
                                                                    
                                   
    expect(cardKeywords('SFD-082'), '★★★卡面印刷关键词为空').toEqual([])
    expect(SFD_082.keywords).toEqual([])
    expect(SFD_082_SPEC.keywords, '★★★权限挂在技能上').toEqual(['迅捷'])
                              
    expect(activatedFor('SFD-082').map((s) => s.key)).toContain('SFD-082:blink')
  })

  test('★★★【逐表折叠口径】折叠的登一份就够、不折叠的三个卡号都要登', () => {
                              
    for (const id of SFD_082_DEFIDS) {
      expect(activatedFor(id).map((s) => s.key), `${id} 走 ACTIVATED(折叠)`).toContain('SFD-082:blink')
      expect(cardKeywords(id), `${id} 走 CARD_KEYWORDS(折叠)`).toEqual([])
    }
                                                
    for (const id of SFD_082_DEFIDS) {
      expect(GROUP_PASSIVE_DEFIDS, `${id} 必须单独登一行`).toContain(id)
    }
  })
})

describe('🔴🔴🔴★★★★★★句①:进攻【或】防守,伤害等同于我战力', () => {
  const trigs = () => makeEzreal082Triggers(asObjId('ez'), P1)

  test('🔴★★★★★★两个时机各一条,共用一个 abilityKey(⑧)', () => {
    const t = trigs()
    expect(t.map((x) => x.event).sort(), '★★★attack 与 defend 都要').toEqual(['attack', 'defend'])
    const keys = new Set(t.map((x) => (x as unknown as { abilityKey?: string }).abilityKey))
    expect(keys.size, '★一卡多时机只算一个技能').toBe(1)
  })

  test('🔴★★★★★★伤害数额 = 我【当前】战力,不是印刷战力', () => {
    const s0 = scene([mk('ez', 'SFD-082', P1, BF0), mk('foe', 'OGN-012', P2, BF0, 9)])
    const buffed = {
      ...s0.objects[asObjId('ez')]!, derived: { might: 7, keywords: [], restrictions: [] },
    } as unknown as GameObject
    const s = { ...s0, objects: { ...s0.objects, ez: buffed } } as GameState
    const evs = trigs()[0]!.effect!(s, { kind: 'attack', unit: asObjId('ez') } as never, { foe: 'foe' })
    expect(evs, '★★★印的是 3、现在是 7').toEqual([
                                                             
                                              
                                                      
      { kind: 'damage', target: asObjId('foe'), amount: 7, source: asObjId('ez'), sourcePlayer: P1 },
    ])
  })

                                                               
                                                                         
  test('🔴🔴★★★★★★候选只列【此处】的【敌方】单位(这两道门在 selector 层)', () => {
    const s = scene([
      mk('ez', 'SFD-082', P1, BF0),
      mk('foeHere', 'OGN-012', P2, BF0), // ← 唯一合法目标
      mk('mineHere', 'OGN-012', P1, BF0), // 我方,不是「敌方」
      mk('foeFar', 'OGN-012', P2, BF1), // 敌方但在别处,不是「此处」
    ])
    const ask = trigs()[0]!.nextChoice!(s, { kind: 'attack', unit: asObjId('ez') } as never, {})
    expect(ask?.candidates.map((c) => c.id).sort(), '★★★两道门各挡掉一个')
      .toEqual(['foeHere'])
  })

  test('🔴★★★★★答过就不再问(⑰)', () => {
    const s = scene([mk('ez', 'SFD-082', P1, BF0), mk('foeHere', 'OGN-012', P2, BF0)])
    expect(trigs()[0]!.nextChoice!(s, { kind: 'attack', unit: asObjId('ez') } as never, { foe: 'foeHere' })).toBeNull()
  })

  test('🔴★★★★★结算时我已离场 ⇒ 整条无视(§359.3.e.12)', () => {
    const s = scene([mk('foe', 'OGN-012', P2, BF0, 9)])           
    expect(trigs()[0]!.effect!(s, { kind: 'attack' } as never, { foe: 'foe' })).toEqual([])
  })

  test('🔴★★★★★没选到目标 / 目标已离场 ⇒ 一条都不发', () => {
    const s = scene([mk('ez', 'SFD-082', P1, BF0)])
    expect(trigs()[0]!.effect!(s, { kind: 'attack' } as never, {})).toEqual([])
    expect(trigs()[0]!.effect!(s, { kind: 'attack' } as never, { foe: 'gone' })).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★句②:我无法造成战斗伤害(与加里奥【逐字相同】⇒ 复用同一条)', () => {
  test('🔴★★★★★★限制真的打在他身上', () => {
    const s = live([mk('ez', 'SFD-082', P1, BF0)])
    expect(canDealCombatDamage(s.objects[asObjId('ez')]!)).toBe(false)
  })

  test('🔴★★★★★★三个卡号答案全等(共用判据的证据,不是抄了三份)', () => {
    const answers = SFD_082_DEFIDS.map((id) =>
      canDealCombatDamage(live([mk('ez', id, P1, BF0)]).objects[asObjId('ez')]!))
    expect(answers).toEqual([false, false, false])
  })

  test('🔴★★★★★对照:别的单位照常能造成战斗伤害(⑩① 会换答案的反例)', () => {
    const s = live([mk('plain', 'OGN-012', P1, BF0)])
    expect(canDealCombatDamage(s.objects[asObjId('plain')]!)).toBe(true)
  })

  test('🔴🔴★★★★★★句①与句②【不矛盾】:战斗不出力,但技能照打(相邻概念防混)', () => {
                                   
                                         
    const s0 = live([mk('ez', 'SFD-082', P1, BF0), mk('foe', 'OGN-012', P2, BF0, 9)])
    expect(canDealCombatDamage(s0.objects[asObjId('ez')]!), '★战斗那一步:不出力').toBe(false)
    const evs = makeEzreal082Triggers(asObjId('ez'), P1)[0]!
      .effect!(s0, { kind: 'attack' } as never, { foe: 'foe' })
    expect((evs[0] as unknown as { amount: number }).amount, '★★★技能那一步:照打 3 点').toBe(3)
  })
})

describe('🔴🔴🔴★★★★★★句③:[迅捷] 付{蓝} — 把我移回【我控制者的】基地', () => {
  const resolve = (s: GameState, oid: string, ctrl: PlayerId) =>
    SFD_082_SPEC.makeResolve({ selfOid: oid, controller: ctrl })(s) as readonly GameEvent[]

  test('★费用是一枚蓝符能、【没有法力】', () => {
    expect(SFD_082_SPEC.cost).toEqual({ pips: [['blue']] })
  })

  test('🔴★★★★★★真移动要【两条事件】—— 只发换区的话盯移动的触发全不响(§446.1)', () => {
    const s = scene([mk('ez', 'SFD-082', P1, BF0)])
    const evs = resolve(s, 'ez', P1)
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
    expect(evs[1] as unknown as { from: string; to: string })
      .toMatchObject({ from: BF0, to: `base:${P1}` })
  })

  test('🔴★★★★★★去的是【控制者】的家 —— 被夺控之后跟着换(§477.1)', () => {
    const s0 = scene([mk('ez', 'SFD-082', P1, BF0)])
    const seized = { ...s0.objects[asObjId('ez')]!, controller: P2 } as GameObject
    const s = { ...s0, objects: { ...s0.objects, ez: seized } } as GameState
    const evs = resolve(s, 'ez', P2)
    expect((evs[1] as unknown as { to: string }).to, '★★★不是原主人 P1 的基地').toBe(`base:${P2}`)
  })

  test('🔴★★★★★★已经在基地里 ⇒ 一条都不发(§355.4.a 终点须异于当前位置)', () => {
    const s = scene([mk('ez', 'SFD-082', P1, `base:${P1}`)])
    expect(resolve(s, 'ez', P1)).toEqual([])
  })

  test('🔴★★★★★在别的战场也照样回家(不是只认某一格)', () => {
    const s = scene([mk('ez', 'SFD-082', P1, BF1)])
    expect((resolve(s, 'ez', P1)[1] as unknown as { from: string }).from).toBe(BF1)
  })

  test('🔴★★★★★我已离场 ⇒ 不发事件', () => {
    expect(resolve(scene([]), 'ez', P1)).toEqual([])
  })
})

describe('🔴🔴★★★★★端到端:三个卡号都真的挂得上触发', () => {
  test('🔴★★★★★★异画/促销卡号走 TRIGGER_FACTORIES 的【别名折叠】,一样响', () => {
    for (const id of SFD_082_DEFIDS) {
      const s = scene([mk('ez', id, P1, BF0)])
      const mine = activeTriggers(s).filter((t) => (t as unknown as { sourceDefId?: string }).sourceDefId === 'SFD-082')
      expect(mine.map((t) => t.event).sort(), `${id} 两条都在`).toEqual(['attack', 'defend'])
    }
  })

  test('★spec 里存的卡文是三句(逐字)', () => {
    expect(specLookup('SFD-082').baseKeywords, '★印刷关键词为空(见上面那条的理由)').toEqual([])
  })
})
