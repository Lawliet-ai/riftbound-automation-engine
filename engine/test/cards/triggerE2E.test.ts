import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind, cardCost, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardPassives } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { detectTriggers } from '../../src/dsl/trigger'

                                
                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function board(defId: string, zone = BF0, types: GameObject['baseTypes'] = ['unit'], kws: readonly string[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const o: GameObject = {
    oid: asObjId('u'), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: kws, baseTypes: types, damage: 0, counters: {}, status: {},
  }
  const z = base.zones[zone]!
  return { ...base, activePlayer: P1, objects: { u: o }, zones: { ...base.zones, [z.id]: { ...z, contents: [asObjId('u')] } } }
}
const idsOn = (s: GameState): string[] => activeTriggers(s).map((t) => t.id)

describe('★真 registry 的 activeTriggers 收不收得到各关键词触发', () => {
  test('§821 百炼:真卡 SFD-008 哨兵好手', () => {
    expect(idsOn(board('SFD-008')).some((i) => i.startsWith('forge:'))).toBe(true)
  })

  test('§819 灵便:真卡 SFD-022 长剑(装备)', () => {
    expect(idsOn(board('SFD-022', `base:${P1}`, ['equipment'])).some((i) => i.startsWith('nimble:'))).toBe(true)
  })

  test('§817 预知:真卡 OGN-171 叨叨魄罗', () => {
    expect(idsOn(board('OGN-171')).some((i) => i.startsWith('foresight'))).toBe(true)
  })

  test('§823 狩猎:印刷即收(征服/据守两条)', () => {
    const ids = idsOn(board('X', BF0, ['unit'], ['狩猎']))
    expect(ids.filter((i) => i.startsWith('hunt:'))).toHaveLength(2)
  })

  test('§441 强化传奇:真卡 VEN-151 流光镜影', () => {
    expect(idsOn(board('VEN-151', `legend:${P1}`)).some((i) => i.includes('empowerOnOther'))).toBe(true)
  })

  test('白板卡:一条触发都不产(不误收)', () => {
    expect(idsOn(board('OGN-142'))).toEqual([])
  })
})

describe('★关键词来源的不对称(实测记录,不是推测)', () => {
  test('狩猎读【物件身上】的关键词 ⇒ 临时/贴附获得的也算', () => {
    expect(idsOn(board('NO-SUCH-CARD', BF0, ['unit'], ['狩猎'])).length).toBeGreaterThan(0)
  })

  test('★★★★★第317轮起【不对称没了】:预知也读物件身上的关键词', () => {
                                                               
                                                                                 
                                               
    expect(idsOn(board('NO-SUCH-CARD', BF0, ['unit'], ['预知'])).some((i) => i.startsWith('foresight'))).toBe(true)
  })

                                                           
                                               
                                                          
  test.todo('★若将来有卡授予[预知],makeForesightTriggers 需改读 keywordSources')
})

                                                           
  
                          
                                                                 
                                                  
                                                                
                                        
                                                                                
                                                       
                                              
setCardPassiveProvider(cardPassives)

describe('★★★★★★ OGN-100 宝石真知者:其他友方单位获得 [预知]', () => {
                                                  
  function scene(): GameState {
    const base = createInitialState([P1, P2], 2)
    const mk = (oid: string, defId: string, ctrl: typeof P1, zone: string): GameObject => ({
      oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
      baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    })
    const objs = [
      mk('seer', 'OGN-100', P1, BF0),
      mk('mate', 'BLK-mate', P1, BF0),
      mk('foe', 'BLK-foe', P2, BF0),
      mk('home', 'BLK-home', P1, `base:${P1}`),
    ]
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of objs) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
                                                               
    objects['seer'] = { ...objects['seer']!, baseKeywords: ['预知'] }
    return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
  }
  const foresightOn = (oid: string): string[] =>
    activeTriggers(scene()).filter((t) => (t.id ?? '').startsWith('foresight') && t.sourceOid === asObjId(oid))
      .map((t) => t.id)

  test('★前提:3费 1蓝pip 3[S] 单位,印刷 [预知] 进了 CARD_KEYWORDS(㊶⑪)', () => {
    expect(CARD_COSTS['OGN-100']).toEqual({ mana: 3, pips: 1, colors: ['blue'] })
    expect(cardKind('OGN-100')).toBe('unit')
    expect(cardCost('OGN-100')).toEqual({ mana: 3, pips: [['blue']] })
    expect(cardKeywords('OGN-100'), '★印刷那份').toEqual(['预知'])
  })

  test('★★★★★★命门:被动给出去的 [预知] 真的发得出触发(第317轮之前是 0 条)', () => {
    expect(foresightOn('mate').length, '★同战场的友方单位吃到了').toBeGreaterThan(0)
  })

  test('★★★★范围三半:【其他】/【友方】/**没有位置词**', () => {
    expect(foresightOn('foe'), '★敌方不给').toHaveLength(0)
    expect(foresightOn('home').length, '★卡文没写位置词 ⇒ 基地里的友军也算').toBeGreaterThan(0)
                                        
    expect(foresightOn('seer'), '★我自己只有印刷那一份 ⇒ 恰好 1 条').toHaveLength(1)
  })

  test('★★★★★★★逐份语义:【两个】宝石真知者互相给 ⇒ 各自 2 条触发(印刷1 + 对方给1)', () => {
                                           
                                                              
                                            
    const base = createInitialState([P1, P2], 2)
    const mk = (oid: string): GameObject => ({
      oid: asObjId(oid), defId: 'OGN-100', owner: P1, controller: P1, zone: asZoneId(BF0),
      baseMight: 3, baseKeywords: ['预知'], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    })
    const a1 = mk('seerA'); const a2 = mk('seerB')
    const z = base.zones[BF0]!
    const s = {
      ...base, activePlayer: P1, phase: 'main',
      objects: { seerA: a1, seerB: a2 },
      zones: { ...base.zones, [BF0]: { ...z, contents: [a1.oid, a2.oid] } },
    } as GameState
    const on = (oid: string): number => activeTriggers(s)
      .filter((t) => (t.id ?? '').startsWith('foresight') && t.sourceOid === asObjId(oid)).length
    expect(on('seerA'), '★印刷 1 份 + 对方给 1 份 = 2 条').toBe(2)
    expect(on('seerB'), '★对称').toBe(2)
  })

  test('★★★★★对照组:把宝石真知者从场上拿掉,友军的预知就没了', () => {
    const s = scene()
    const { seer: _gone, ...rest } = s.objects as Record<string, GameObject>
    const without = { ...s, objects: rest } as GameState
    const still = activeTriggers(without)
      .filter((t) => (t.id ?? '').startsWith('foresight') && t.sourceOid === asObjId('mate'))
    expect(still, '★被动源没了就该跟着没').toHaveLength(0)
  })
})

                                                                  
  
                             
                                                                     
                                                                
                                                            
                                       
                                                 
describe('★★★★★★ SFD-065 先见机甲:你的「机械」属性单位获得 [预知]', () => {
  function scene(): GameState {
    const base = createInitialState([P1, P2], 2)
    const mk = (oid: string, defId: string, ctrl: typeof P1, zone: string): GameObject => ({
      oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
      baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    })
    const objs = [
      mk('mech', 'SFD-065', P1, BF0),        // 我自己(tag 含「机械」)
                                                                         
                                                  
      mk('mate', 'OGN-016', P1, BF0),        // 友方【机械】(cardTags: OGN-016 = 机械)
      mk('plain', 'BLK-plain', P1, BF0),     // 友方【非机械】
      mk('foeMech', 'OGN-016', P2, BF0),     // 敌方机械
    ]
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of objs) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
  }
  const foresightOn = (oid: string): number => activeTriggers(scene())
    .filter((t) => (t.id ?? '').startsWith('foresight') && t.sourceOid === asObjId(oid)).length

  test('★前提:2费 0pip 蓝 2[S] 单位,【不印任何关键词】(与 OGN-100 相反)', () => {
    expect(CARD_COSTS['SFD-065']).toEqual({ mana: 2, pips: 0, colors: ['blue'] })
    expect(cardKind('SFD-065')).toBe('unit')
    expect(cardCost('SFD-065')).toEqual({ mana: 2 })
    expect(cardKeywords('SFD-065'), '★它一个印刷关键词都没有').toEqual([])
    expect(cardKeywords('OGN-100'), '★对照:那张印了 [预知]').toEqual(['预知'])
  })

  test('★★★★★★命门:它【自己】也吃到那份预知(tag 含「机械」,卡文没有「其他」)', () => {
    expect(foresightOn('mech'), '★正好 1 条 —— 来自被动,不是印刷').toBe(1)
  })

  test('★★★★范围:友方机械给、友方非机械不给、敌方机械也不给', () => {
    expect(foresightOn('mate'), '★友方机械').toBe(1)
    expect(foresightOn('plain'), '★同为友方但不是机械 ⇒ 不给').toBe(0)
    expect(foresightOn('foeMech'), '★敌方机械 ⇒ 不给(§740.1.a 按控制者)').toBe(0)
  })

  test('★★★★★对照组:把先见机甲拿掉,友方机械的预知就没了', () => {
    const s = scene()
    const { mech: _gone, ...rest } = s.objects as Record<string, GameObject>
    const without = { ...s, objects: rest } as GameState
    expect(activeTriggers(without)
      .filter((t) => (t.id ?? '').startsWith('foresight') && t.sourceOid === asObjId('mate')))
      .toHaveLength(0)
  })
})
