import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, chainItemsTargetingMine, playSpecFor, spellChainItems } from '../../data/registry'
import { NEGATE_SPELLS } from '../../data/cards/negate-spells'
import { TWO_TARGET_SPELLS, TWO_TARGET_SPECS, TWO_TARGET_KEY, OGS_008_DELTA } from '../../data/cards/two-target-spells'
import { EQUIPMENT_DEFIDS } from '../../data/cardKinds'

                                                  
                                      
                                                               
                                                                            
  
                 
                                                              
                                                                       
                                     
                                               
                                                                   
                                                                 
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, who: PlayerId, might: number, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})
                                                         
const gear = (oid: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: [...EQUIPMENT_DEFIDS][0]!, owner: who, controller: who, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
})

                                                
function scene(chain: readonly unknown[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('mine', P1, 4))
  put(unit('foe', P2, 6))
  put(gear('myGear', P1))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, chain } as unknown as GameState
}

             
const item = (
  id: string, controller: PlayerId, kind: string, chosenTarget?: string,
): unknown => ({ id, controller, kind, status: 'confirmed', ...(chosenTarget !== undefined ? { chosenTarget } : {}) })

describe('★ 前提:两张都进表了', () => {
  test('★类别 / 印刷关键词 / 进 `PLAY_SPECS`', () => {
    for (const [id, kw] of [['SFD-045', '反应'], ['OGN-128', '迅捷']] as const) {
      expect(cardKind(id), id).toBe('spell')
      expect(cardKeywords(id), `${id} 印刷关键词`).toEqual([kw])
      expect(playSpecFor(id), `${id} 进表`).toBeDefined()
    }
    expect(NEGATE_SPELLS.find((r) => r.defId === 'SFD-045')!.targetsMine, '★走新档').toBe(true)
    expect(TWO_TARGET_SPELLS.find((r) => r.defId === 'OGN-128')!.onBoth, '★★走新列').toBeDefined()
  })
})

describe('★★★★★★★ SFD-045:三半判据缺一不可', () => {
  test('★★★★★★★正面:敌方法术、选中了我的单位 ⇒ 抓得到', () => {
    const s = scene([item('i1', P2, 'spell', 'mine')])
    expect(chainItemsTargetingMine(s, P1)).toEqual(['i1'])
  })

  test('★★★★★★★【敌方】那半:我自己的法术不算', () => {
    const s = scene([item('i1', P1, 'spell', 'mine')])
    expect(chainItemsTargetingMine(s, P1), '★自己打的不该被自己反制').toEqual([])
  })

  test('★★★★★★★【法术**或技能**】那半:`ability`/`triggered` 也算 —— 别只认 spell', () => {
                                                          
    const s = scene([
      item('i1', P2, 'ability', 'mine'),
      item('i2', P2, 'triggered', 'myGear'),
    ])
    expect(chainItemsTargetingMine(s, P1).slice().sort(), '★两条技能都算').toEqual(['i1', 'i2'])
    expect(spellChainItems(s), '★★对照:老的那个口只认法术 ⇒ 一条都不认').toEqual([])
  })

  test('★★★★★★★【选中的是【我的】】那半:打对手自己人的不算', () => {
    const s = scene([item('i1', P2, 'spell', 'foe')])
    expect(chainItemsTargetingMine(s, P1), '★目标是他自己的单位 ⇒ 不归我反制').toEqual([])
  })

  test('★★★★★★装备也算(卡文「友方单位**或友方装备**」)', () => {
    const s = scene([item('i1', P2, 'spell', 'myGear')])
    expect(chainItemsTargetingMine(s, P1)).toEqual(['i1'])
  })

  test('★★★★★★【没锁目标】的链项不算', () => {
    const s = scene([item('i1', P2, 'spell')])
    expect(chainItemsTargetingMine(s, P1), '★`chosenTarget` 缺省 ⇒ 谈不上"选为目标"').toEqual([])
  })

  test('★★★★★★回归闸:老两张仍然走【不筛/按费用筛】那两条路', () => {
    const s = scene([item('i1', P1, 'spell', 'mine')])          
                                  
    expect((playSpecFor('OGN-064')!.legalTargets(s, P1) as string[]), '★老档不受新档影响')
      .toEqual(['i1'])
                                 
    expect((playSpecFor('SFD-045')!.legalTargets(s, P1) as string[])).toEqual([])
  })
})

describe('★★★★★★★ OGN-128 决斗:相互、各按【自身】战力', () => {
  const resolveDuel = (s: GameState, first: string, second: string): readonly unknown[] =>
    TWO_TARGET_SPECS['OGN-128']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: first,
    } as never)(s, { [TWO_TARGET_KEY]: second })

  test('★★★★★★★两条伤害,**点数各按出手那名的战力**(4 打 6、6 打 4)', () => {
    const s = scene()
    const evs = resolveDuel(s, 'mine', 'foe') as readonly {
      target: string; amount: number; source: string; sourcePlayer: PlayerId
    }[]
    expect(evs).toHaveLength(2)
    const toFoe = evs.find((e) => e.target === 'foe')!
    const toMine = evs.find((e) => e.target === 'mine')!
    expect(toFoe.amount, '★我 4 力 ⇒ 打他 4 点').toBe(4)
    expect(toMine.amount, '★★他 6 力 ⇒ 打我 6 点(不是同一个数)').toBe(6)
  })

  test('★★★★★★★§428.5 归因指向【出手那名单位】,不是法术', () => {
    const s = scene()
    const evs = resolveDuel(s, 'mine', 'foe') as readonly {
      target: string; source: string; sourcePlayer: PlayerId
    }[]
    const toFoe = evs.find((e) => e.target === 'foe')!
    expect(toFoe.source, '★来源是我那名单位,不是 sp').toBe('mine')
    expect(toFoe.sourcePlayer, '★★归到它的控制者').toBe(P1)
    const toMine = evs.find((e) => e.target === 'mine')!
    expect(toMine.source).toBe('foe')
    expect(toMine.sourcePlayer, '★★★对手那条归到对手').toBe(P2)
  })

  test('★★★★★★【相互】少一边就不成立 ⇒ 整条不发', () => {
    const s = scene()
    expect(TWO_TARGET_SPECS['OGN-128']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: 'mine',
    } as never)(s, {}), '★第二个没选 ⇒ 一条都不发').toEqual([])
    expect(TWO_TARGET_SPECS['OGN-128']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1,
    } as never)(s, { [TWO_TARGET_KEY]: 'foe' }), '★★第一个没选也一样').toEqual([])
  })

  test('★★★★★★★回归闸:【不给 `onBoth`】的那几张仍然两半各自独立', () => {
                                                  
    const s = scene()
    const evs = TWO_TARGET_SPECS['OGN-206']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: 'mine',
    } as never)(s, {})
    expect(evs, '★老档:第二个没选,第一半照发').toHaveLength(1)
                                                         
                                                        
                                                 
                                                      
                                  
    const BOTH_USERS = ['OGN-108', 'OGN-128', 'OGS-008', 'SFD-011', 'UNL-083']                       
    expect(TWO_TARGET_SPELLS.filter((x) => x.onBoth !== undefined).map((x) => x.defId).slice().sort(),
      '★★清单数量对齐:谁用 onBoth 只此两张').toEqual([...BOTH_USERS].sort())
    for (const r of TWO_TARGET_SPELLS.filter((x) => !BOTH_USERS.includes(x.defId))) {
      expect(r.onBoth, `${r.defId} 不该有 onBoth`).toBeUndefined()
    }
  })

  test('★★★★★战力取【引用值】:负战力按 0 算(§143.2.b)', () => {
    const s0 = scene()
    const weak = {
      ...s0,
      objects: { ...s0.objects, mine: { ...s0.objects['mine' as ObjId]!, baseMight: -3 } },
    } as GameState
    const evs = resolveDuel(weak, 'mine', 'foe') as readonly { target: string; amount: number }[]
    expect(evs.find((e) => e.target === 'foe')!.amount, '★引用值下钳 0,不会打出负伤害').toBe(0)
  })
})

                                                                    
                                                             
  
                                                               
                                                                 
                                                                         
                                   
describe('★★★★★★★ 第367轮:OGS-008 绅士决斗(先 +3、随后对砍)', () => {
  const resolveGent = (s: GameState, first: string, second: string): readonly unknown[] =>
    TWO_TARGET_SPECS['OGS-008']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: first,
    } as never)(s, { [TWO_TARGET_KEY]: second })

  test('★★★★★★三条事件,次序是【先加成、后两条伤害】', () => {
    const evs = resolveGent(scene(), 'mine', 'foe') as readonly { kind: string }[]
    expect(evs.map((e) => e.kind)).toEqual(['addEffect', 'damage', 'damage'])
  })

  test('★★★★★★★★核心裁定:我 4 力 +3 ⇒ 打他【7】点;他 6 力照旧打我 6 点', () => {
                                                                      
    const evs = resolveGent(scene(), 'mine', 'foe') as readonly {
      kind: string; target: string; amount: number
    }[]
    const dmg = evs.filter((e) => e.kind === 'damage')
    expect(dmg.find((e) => e.target === 'foe')!.amount, `★4 + ${OGS_008_DELTA} = 7`).toBe(4 + OGS_008_DELTA)
    expect(dmg.find((e) => e.target === 'mine')!.amount, '★★他那条一点加成都没有').toBe(6)
  })

  test('★★★★★★加成那条是【本回合内】、落在第一名身上', () => {
    const evs = resolveGent(scene(), 'mine', 'foe') as readonly {
      kind: string; effect?: { id: string; duration: string }
    }[]
    const eff = evs.find((e) => e.kind === 'addEffect')!.effect!
    expect(eff.duration, '★卡文写了「本回合内」').toBe('thisTurn')
    expect(eff.id, '★★挂在第一名身上').toContain('mine')
  })

  test('★★★★★★★分辨断言 + 回归闸:决斗 OGN-128 **一点加成都没有**(缺省 bonus=0)', () => {
                                      
    const duel = TWO_TARGET_SPECS['OGN-128']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: 'mine',
    } as never)(scene(), { [TWO_TARGET_KEY]: 'foe' }) as readonly {
      kind: string; target: string; amount: number
    }[]
    expect(duel.map((e) => e.kind), '★老卡仍然只发两条伤害、没有 addEffect').toEqual(['damage', 'damage'])
    expect(duel.find((e) => e.target === 'foe')!.amount, '★★老卡照旧是 4 点').toBe(4)
  })

  test('★★★★★★【相互】少一边就不成立 ⇒ 整条不发(加成也不发)', () => {
    const evs = TWO_TARGET_SPECS['OGS-008']!.makeResolve!({
      movedCardOid: asObjId('sp'), controller: P1, target: 'mine',
    } as never)(scene(), {})
    expect(evs, '★没选第二个目标 ⇒ 一条都不发').toEqual([])
  })
})
