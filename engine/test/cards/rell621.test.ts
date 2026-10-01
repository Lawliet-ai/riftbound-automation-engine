import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { activeTriggers, cardKind, cardCost, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  SFD_024, SFD_024_CARD_EFFECT, SFD_024_UPSTREAM_STALE_EFFECT, SFD_024_KEYWORDS,
  SFD_024_MAX_MANA, SFD_024_ASK, rellGearCandidates, makeRellForgeItem, makeRellAttackTrigger,
} from '../../data/cards/SFD-024'

                                                                 
                                                         
                                                             
                                                         
                                       
  
             
                               
                                                                
                              
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'rell'

const rell = (): GameObject => ({
  oid: asObjId(SELF), defId: 'SFD-024', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                  
const card = (oid: string, defId: string, zone = `hand:${P1}`, tags: readonly string[] = ['武装']): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: tags,
  damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                      
const cheapGear = 'SFD-022'             
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [rell(), ...objs]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const trig = () => makeRellAttackTrigger(asObjId(SELF), P1)
const attack = (who: string): GameEvent =>
  ({ kind: 'attack', unit: asObjId(who), player: P1, battlefield: BF0, responsible: [P1] } as unknown as GameEvent)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
                                           
const manaOf = (defId: string): number | undefined => CARD_COSTS[defId]?.mana

describe('🔴🔴🔴★★★★★★621 芮尔:前提与接线', () => {
  test('★前提:单位 4费 **0pip** 红 4战力、**单印次**;⚠️用的是 **errata** 不是印刷卡文', () => {
    expect(cardKind('SFD-024')).toBe('unit')
    expect(CARD_COSTS['SFD-024']).toEqual({ mana: 4, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['SFD-024a'], '★单印次:没有 a 号').toBeUndefined()
    expect(SFD_024.energy).toBe(4)
    expect(SFD_024.power).toBe(4)
                                                               
    expect(SFD_024_CARD_EFFECT).toContain('若如此做，则进行一次：将其贴附到我身上。')
    expect(SFD_024_CARD_EFFECT, '★★★没照旧卡文做').not.toBe(SFD_024_UPSTREAM_STALE_EFFECT)
    expect(SFD_024_UPSTREAM_STALE_EFFECT, '★前提自证:旧卡文写的是「然后」').toContain('然后将其贴附到我身上')
  })

  test('🔴🔴🔴★★★★★★接线:触发查得到;[壁垒] **必须登**印刷表;单位**要**进 `UNIT_COST`', () => {
    const s = scene([])
    const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'SFD-024')
    expect(mine.length, '★★★登记漏了 ⇒ 这张卡的第二句是死的').toBe(1)
    expect(mine[0]!.event).toBe('attack')
    expect(cardKeywords('SFD-024'), '★★★[壁垒] 在 IMPL_KEYWORDS 白名单里,漏登就不生效').toEqual(['壁垒'])
    expect(SFD_024_KEYWORDS).toEqual(['壁垒'])
    expect(cardCost('SFD-024'), '★单位要进 UNIT_COST;4费 0pip').toEqual({ mana: 4 })
  })

  test('🔴🔴🔴★★★★★★【会换答案】「当**我**进攻时」——队友进攻不响;卡文写了「可以选择」⇒ `mayChoose`', () => {
    const s = scene([])
    expect(trig().filter?.(attack(SELF), s) ?? true, '★我进攻').toBe(true)
    expect(trig().filter?.(attack('teammate'), s) ?? true, '★★★只写 by:you 队友进攻也会响(★112)').toBe(false)
    expect(trig().mayChoose, '★★★卡文写了「你可以选择」⇒ 必须给').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★621 候选:「一件法力费用不高于{2}的武装」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·场景要造到位】只列**手牌里**的;场上那件不算', () => {
                                                
    const s = scene([card('inHand', cheapGear), card('onField', cheapGear, BF0)])
    expect(rellGearCandidates(s, P1), '★★★场上那件谈不上"打出"').toEqual(['inHand'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】只列 §150.1 **[武装]标签**,不是"装备"泛指', () => {
    const s = scene([card('arm', cheapGear), card('plain', cheapGear, `hand:${P1}`, [])])
    expect(rellGearCandidates(s, P1), '★★★换成 isEquipment 这条当场红').toEqual(['arm'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「**不高于**{2}」= ≤,**2 费正好能选**、3 费不行', () => {
    expect(SFD_024_MAX_MANA).toBe(2)
                          
    const two = Object.keys(CARD_COSTS).find((id) => manaOf(id) === 2)!
    const three = Object.keys(CARD_COSTS).find((id) => manaOf(id) === 3)!
    expect(manaOf(two), '★前提自证').toBe(2)
    expect(manaOf(three), '★前提自证').toBe(3)
    const s = scene([card('g2', two), card('g3', three)])
    const got = rellGearCandidates(s, P1)
    expect(got, '★★★写成 `< 2` 这条当场红(2 费正好能选)').toContain('g2')
    expect(got, '★★★3 费不该进来').not.toContain('g3')
  })

  test('🔴🔴★★★★★★手里一件合格的都没有 ⇒ **不问**(§355.17)', () => {
    const s = scene([])
    expect(trig().nextChoice?.(s, attack(SELF), {}) ?? null, '★★★没候选还问 = 逼玩家点一个空对话框').toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★621 产出:打出 + §388.1 内嵌式触发', () => {
  const two = () => Object.keys(CARD_COSTS).find((id) => manaOf(id) === 2)!
  const withGear = () => scene([card('g', two())])
  const resolveEvs = (pick?: string): readonly GameEvent[] =>
    trig().effect(withGear(), attack(SELF), pick === undefined ? {} : { [SFD_024_ASK]: pick }) as readonly GameEvent[]

  test('🔴🔴🔴★★★★★★【真结算】发**两条**:先打出、再入链那条内嵌触发', () => {
    const evs = resolveEvs('g')
    expect(kinds(evs), '★★★顺序照卡文').toEqual(['playUnit', 'enqueueItem'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「无视其**费用**」= **整笔全免**(连 pip)', () => {
                                                                       
                                                        
    const play = (resolveEvs('g')[0] as unknown as { play: { cost: unknown } }).play
    expect(play.cost, '★★★写成 { mana: 0 } 这条当场红').toEqual({})
  })

  test('🔴🔴🔴★★★★★★【会换答案】落点=**基地**、**活跃**进场(§359.2.d)、`by` 记账', () => {
    const play = (resolveEvs('g')[0] as unknown as {
      play: { card: string; to: string; readyOnEntry?: boolean; by?: string }
    }).play
    expect(play.card).toBe('g')
    expect(play.to, '★★★装备只能进基地').toBe(`base:${P1}`)
    expect(play.readyOnEntry, '★★★漏了它装备会休眠进场(§359.2.d 说的是活跃)').toBe(true)
    expect(play.by, '★★★漏了 by ⇒ 下一条项目用 playedBy 认不出人').toBe(SELF)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**若如此做**」= 因果:没选 ⇒ **两条都不发**', () => {
    expect(resolveEvs(undefined), '★★★mayChoose 跳过时不能白给').toEqual([])
    expect(resolveEvs('ghost'), '★选了个不存在的也一样').toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★621 内嵌链项目:「进行一次:将其贴附到我身上」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】它是**独立链项目**(§388.1),形状对得上', () => {
                                                        
                                            
    const item = makeRellForgeItem(asObjId(SELF), P1) as unknown as {
      id: string; controller: PlayerId; kind: string; status: string; sourceDefId?: string
    }
    expect(item.kind).toBe('triggered')
    expect(item.status).toBe('pending')
    expect(item.controller).toBe(P1)
    expect(item.sourceDefId).toBe('SFD-024')
  })

  test('🔴🔴🔴★★★★★★【真结算】靠 `playedBy` 认出刚打出那件,发 `attach`;⚠️**必须带 `player`**', () => {
                                               
    const s0 = scene([card('g', Object.keys(CARD_COSTS).find((id) => manaOf(id) === 2)!)])
    const played = applyEvents(s0, trig().effect(s0, attack(SELF), { [SFD_024_ASK]: 'g' }).slice(0, 1), {}).state
    const item = makeRellForgeItem(asObjId(SELF), P1) as unknown as {
      resolve: (st: GameState) => readonly GameEvent[]
    }
    const evs = item.resolve(played)
    expect(kinds(evs)).toEqual(['attach'])
    expect(evs[0], '★★★漏了 player 会让「当【你】为我贴附武装时」那族认不出人(§437/479)')
      .toMatchObject({ to: SELF, player: P1 })
  })

  test('🔴🔴🔴★★★★★★【会换答案】没打出成功(账上没有)⇒ 一条都不发', () => {
    const item = makeRellForgeItem(asObjId(SELF), P1) as unknown as {
      resolve: (st: GameState) => readonly GameEvent[]
    }
    expect(item.resolve(scene([])), '★★★不能对着空气发 attach').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【端到端】打出后武装真的落在基地、且**活跃**;随后贴附真的挂上', () => {
    const s0 = scene([card('g', Object.keys(CARD_COSTS).find((id) => manaOf(id) === 2)!)])
    const evs = trig().effect(s0, attack(SELF), { [SFD_024_ASK]: 'g' })
    const played = applyEvents(s0, evs.slice(0, 1), {}).state
    const landed = Object.values(played.objects).find((o) => o.defId !== 'SFD-024' && o.zone === asZoneId(`base:${P1}`))
    expect(landed, '★★★打出那条没落地').toBeDefined()
    expect(landed!.status.dormant, '★★★§359.2.d 装备活跃进场').not.toBe(true)
    const item = makeRellForgeItem(asObjId(SELF), P1) as unknown as {
      resolve: (st: GameState) => readonly GameEvent[]
    }
    const after = applyEvents(played, item.resolve(played), {}).state
    expect(after.objects[landed!.oid as ObjId]!.status.attachedTo, '★★★贴到我身上了').toBe(asObjId(SELF))
  })
})
