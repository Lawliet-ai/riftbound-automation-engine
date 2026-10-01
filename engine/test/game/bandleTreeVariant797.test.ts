                                                
  
                                                      
                                          
                                             
  
                                                            
                                                                 
                                                                               
import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { makeRng } from '../../src/util/rng'
import { installProviders } from '../../data/gameDeps'
import { VARIANT_GROUPS } from '../../data/variantAliases'
                                               
import { createInitialState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { holdRepeats, conquerRepeats, standbyAltCost, playBonusFor, cardPassives } from '../../data/registry'
import { ZED_EXTRA_COST } from '../../data/cards/shadow-clone'           

type Bag = {
  zones: Record<string, { capacity?: number }>
  battlefieldCards?: Record<string, { defId: string }>
}

                                     
function capacityWhenPicking(bf: string): { cap: number | undefined; onField: string | undefined } {
  installProviders()
  const { state } = setupGame(
    { ...DEMO_DECK_A, battlefields: [bf] },
    { ...DEMO_DECK_B, battlefields: ['OGN-282'] },
    specLookup, makeRng(7),
  )
  const s = state as unknown as Bag
  return { cap: s.zones['standby:shared:0']?.capacity, onField: s.battlefieldCards?.['battlefield:shared:0']?.defId }
}

describe('★797 班德尔树异画号', () => {
  test('前提:两号确实在同一别名组里(否则这条测试测不到东西)', () => {
    expect(VARIANT_GROUPS['OGN-278a']).toContain('OGN-278')
  })

  test('OGN-278 与 OGN-278a 都给待命区容量 2', () => {
    const canon = capacityWhenPicking('OGN-278')
    expect(canon.onField, '前提:本体真的摆上场了').toBe('OGN-278')
    expect(canon.cap, '§107.3.b.1 班德尔树待命区容量 2').toBe(2)

    const alt = capacityWhenPicking('OGN-278a')
    expect(alt.onField, '前提:异画号真的摆上场了').toBe('OGN-278a')
    expect(alt.cap, '★ 修之前这里是默认容量 ⇒ 玩家发现「第二张待命卡放不进去」').toBe(2)
  })

  test('反面:别的战场卡不受影响(别把容量修成人人有份)', () => {
    const other = capacityWhenPicking('OGN-282')
    expect(other.onField).toBe('OGN-282')
    expect(other.cap, '非班德尔树 ⇒ 默认容量').not.toBe(2)
  })
})

                                                                       
  
                                                      
                                                      
                                                               
                                                       
                                         
                                                    
                                                 
                                       
                                                                    
                                                      
                                               
describe('★840 同族第五次:holdRepeats / conquerRepeats 的按卡号裸串比', () => {
  const P1 = asPlayerId('P1')
  const BF = 'battlefield:shared:0'
                                       
  function repeatsWith(defId: string, fn: (s: never, p: never, bf: string) => number): number {
    const base = createInitialState([P1, asPlayerId('P2')], 2)
    const o = {
      oid: asObjId('u'), defId, owner: P1, controller: P1, zone: asZoneId(BF),
      baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    } as never
    const z = base.zones[BF as never]!
    const s = {
      ...base,
      objects: { ...base.objects, u: o },
      zones: { ...base.zones, [BF]: { ...z, contents: [...z.contents, asObjId('u')] } },
    } as never
    return fn(s, P1 as never, BF)
  }

  test('前提:两组卡号确实在同一别名组里(否则这几条测不到东西)', () => {
    expect(VARIANT_GROUPS['UNL-087a'], '★833 让 region 退出签名后并的组').toContain('UNL-087')
    expect(VARIANT_GROUPS['UNL-029a']).toContain('UNL-029')
  })

  test('🔴🔴🔴★★★★★★★ 魔像:正典号与异画号的 holdRepeats 必须一致(修之前 087a 是 1)', () => {
    const canon = repeatsWith('UNL-087', holdRepeats)
    const alt = repeatsWith('UNL-087a', holdRepeats)
    expect(canon, '场上一枚魔像 ⇒ 据守效果触发 1+1=2 次').toBe(2)
    expect(alt, '★修之前这里是 1 ⇒ 异画号的「额外触发一次」整句失效,而它另半句照常响').toBe(2)
    expect(alt, '同一张牌两个卡号行为不许分家').toBe(canon)
  })

  test('★★★ 树怪:conquerRepeats 同样两号一致(原为手写两个字面量,现走 variantSiblings)', () => {
    expect(repeatsWith('UNL-029', conquerRepeats)).toBe(2)
    expect(repeatsWith('UNL-029a', conquerRepeats)).toBe(2)
  })

  test('反面:别的卡不受影响(别把翻倍修成人人有份)', () => {
    expect(repeatsWith('OGN-175', holdRepeats), '白板单位 ⇒ 不翻倍').toBe(1)
    expect(repeatsWith('OGN-175', conquerRepeats), '白板单位 ⇒ 不翻倍').toBe(1)
  })
})

                                                                  
  
                                                       
                                                 
                                                      
                                         
                                                          
                                                  
describe('★841 族闸:同一张牌的各个印次,按 defId 判的行为必须一致', () => {
  const P1 = asPlayerId('P1')

  test('前提自证:这几组卡号确实各自同组(组塌了下面全测不到东西)', () => {
    const PAIRS: readonly (readonly [string, string])[] = [
      ['OGN-263', 'OGN-263a'], ['OGN-263', 'OGN-307'],
      ['VEN-023', 'VEN-023a'], ['SFD-141', 'SFD-141a'],
      ['SFD-149', 'SFD-149a'], ['SFD-171', 'SFD-171a'],
      ['UNL-147', 'UNL-147a'], ['UNL-087', 'UNL-087a'], ['UNL-029', 'UNL-029a'],
    ]
    for (const [a, b] of PAIRS) expect(VARIANT_GROUPS[a], `${a} 与 ${b}`).toContain(b)
  })

  test('🔴🔴🔴★★★★★★★ 迅捷斥候:四个印次都给「待命改付{1}」(修前只有正典号给)', () => {
    const legendCost = (defId: string): unknown => {
      const base = createInitialState([P1, asPlayerId('P2')], 2)
      const lz = `legend:${P1}`
      const o = { oid: asObjId('lg'), defId, owner: P1, controller: P1, zone: asZoneId(lz),
        baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {} } as never
      const z = base.zones[lz as never]!
      const s = { ...base, objects: { ...base.objects, lg: o },
        zones: { ...base.zones, [lz]: { ...z, contents: [...z.contents, asObjId('lg')] } } } as never
      return standbyAltCost(s, P1 as never)
    }
    for (const id of VARIANT_GROUPS['OGN-263']!) {
      expect(legendCost(id), `${id}:★修前三个别名号返回 null ⇒ PLACE_STANDBY 从合法动作里整条消失`)
        .toEqual({ mana: 1 })
    }
  })

  test('🔴🔴🔴★★★★★★★ 劫:三个印次都拿到打出额外费用(修前 VEN-023a 两句话全死)', () => {
    for (const id of VARIANT_GROUPS['VEN-023']!) {
      expect(playBonusFor(id), `${id}:修前 VEN-023a 退化成 4费4[M] 白板`).toBe(ZED_EXTRA_COST)
    }
  })

  test('🔴🔴🔴★★★★★★★ 纳什男爵:两个印次都挂静态被动(修前 147a 少两句,战斗结算会算错)', () => {
    const passivesOf = (defId: string): number => {
      const base = createInitialState([P1, asPlayerId('P2')], 2)
      const bf = 'battlefield:shared:0'
      const o = { oid: asObjId('br'), defId, owner: P1, controller: P1, zone: asZoneId(bf),
        baseMight: 10, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {} } as never
      const z = base.zones[bf as never]!
      const s = { ...base, objects: { ...base.objects, br: o },
        zones: { ...base.zones, [bf]: { ...z, contents: [...z.contents, asObjId('br')] } } } as never
      return cardPassives(o, s).length
    }
    const canon = passivesOf('UNL-147')
    expect(canon, '句②不可被敌方选作目标 + 句③其他友方单位+2 ⇒ 两条静态被动').toBeGreaterThan(0)
    expect(passivesOf('UNL-147a'), '★修前是 0:10 费大哥能被点杀、全场友军少 2 战力').toBe(canon)
  })
})
