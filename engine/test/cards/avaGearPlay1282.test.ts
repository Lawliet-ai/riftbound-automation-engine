import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { activeTriggers, cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { makeAva107Trigger, OGN_107_PICK_KEY, STANDBY_KEYWORD, type Ava107Deps } from '../../data/cards/OGN-107'
import { SFD_139_PICK } from '../../data/cards/SFD-139'

                                                       
  
                                                             
                                                       
                                                                    
                                                                            
                                                                                                      
                           
  
                                                                
                                                                                        
                                                         
                                                                   
                                                                         

const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BASE = `base:${P1}`
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const gear = (oid: string, defId: string, zone: string): GameObject =>
  obj(oid, defId, P1, zone, { baseMight: 0, baseTypes: ['equipment'] as never })
function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}; const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]; if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
}
const DEPS: Ava107Deps = {
  hasStandby: (d) => cardKeywords(d).includes(STANDBY_KEYWORD),
  isUnitCard: (d) => cardKind(d) === 'unit',
  specFor: (d) => playSpecFor(d),
}
const playFreeOf = (evs: readonly GameEvent[]): { to?: string } | undefined =>
  evs.find((e) => (e as { kind?: string }).kind === 'playFree') as { to?: string } | undefined
                                   
const findDef = (s: GameState, defId: string): GameObject | undefined =>
  Object.values(s.objects).find((o) => o.defId === defId)

describe('★1282 艾娃 OGN-107 打出【装备】:落基地(§149.2),且 SFD-139 的「从正面朝下打出」触发不响', () => {
  test('★前提:全库带[待命]的装备就这 2 张,且都是 equipment', () => {
    for (const c of ['OGN-077', 'SFD-139']) {
      expect(cardKind(c), `★${c} 是装备`).toBe('equipment')
      expect(cardKeywords(c).includes(STANDBY_KEYWORD), `★${c} 带[待命]`).toBe(true)
    }
  })

  test('★★★① 中娅沙漏 OGN-077 经艾娃打出 ⇒ playFree【不带 to】⇒ 真落【基地】而不是艾娃所在战场', () => {
    const s = scene([obj('ava', 'OGN-107', P1, BF0), gear('g', 'OGN-077', `hand:${P1}`)])
    expect(s.objects[asObjId('ava')]?.zone, '★前提:艾娃在 BF0(「此处」非空 —— 否则这条测不出分流)').toBe(BF0)
    const evs = makeAva107Trigger(asObjId('ava'), P1, DEPS).effect(s, {} as GameEvent, { [OGN_107_PICK_KEY]: 'g' })
    const pf = playFreeOf(evs)
    expect(pf, '★前提:真发了 playFree').toBeDefined()
    expect(pf?.to, "★★★装备【不传 to】—— 「打出到此处」那句只管单位,装备走 playFree 缺省落点(§149.2 :227「装备仅可打出至玩家的基地」)").toBeUndefined()
    const after = applyEvents(s, evs, { getTriggers: () => [] } as never).state
    expect(String(findDef(after, 'OGN-077')?.zone), '★★★真落地在【我的基地】,不是 BF0').toBe(BASE)
  })

  test('★★★② 夜之锋刃 SFD-139 经艾娃打出 ⇒ 落基地,且「从正面朝下打出」的贴附触发【不响】', () => {
    const s = scene([
      obj('ava', 'OGN-107', P1, BF0), gear('g', 'SFD-139', `hand:${P1}`),
      obj('host', 'OGN-011', P1, BF0), // ⚠️「此处」有我的单位 —— 让 ③ 那条真问得出来,②③ 才是单变量
    ])
    const evs = makeAva107Trigger(asObjId('ava'), P1, DEPS).effect(s, {} as GameEvent, { [OGN_107_PICK_KEY]: 'g' })
    expect(playFreeOf(evs)?.to, '★装备照样不传 to').toBeUndefined()
    const landed = landAndEnqueueTriggers(s, evs, activeTriggers, P1, {})
    expect(String(findDef(landed, 'SFD-139')?.zone), '★★落地在基地').toBe(BASE)
    expect((landed.chain ?? []).filter((i) => String(i.id).includes('SFD-139')),
      '★★★卡文是「当你将此牌【从正面朝下的状态】打出时」—— 艾娃是【从手牌正面朝上】打出(playFree,不带 fromStandby)⇒ 这条贴附触发不该入链').toEqual([])
  })

  test('★★★③ 单变量对照:同一张牌【真从待命打出】(fromStandby)⇒ 贴附触发【要响】—— 证明 ② 的「不响」不是恒不响', () => {
    const s = scene([
      obj('ava', 'OGN-107', P1, BF0), gear('g', 'SFD-139', BF0), // 已在 BF0(模拟从待命翻上来那一刻)
      obj('host', 'OGN-011', P1, BF0),
    ])
    const ev = { kind: 'playUnit', unit: asObjId('g'), player: P1, at: BF0, fromStandby: true, fromZoneKind: 'standby' } as unknown as GameEvent
    const landed = landAndEnqueueTriggers(s, [ev], activeTriggers, P1, {})
    const mine = (landed.chain ?? []).filter((i) => String(i.id).includes('SFD-139'))
    expect(mine.length, '★★★带 fromStandby ⇒ 贴附触发【真的会】入链(② 的造景与这里只差这一个字段)').toBe(1)
    expect(mine[0]?.sourceDefId, '★入链的确实是 SFD-139 那条触发').toBe('SFD-139')
                                                                                           
                                                                               
                                                   
    const q = mine[0]?.nextChoice?.(landed, {})
    expect(q?.key, '★★它问的正是「贴附到此处哪名单位」—— 问得出来才证明这条路是通的').toBe(SFD_139_PICK)
                                                                           
                                                                    
    expect(q?.candidates.map((c) => c.id), "★候选 = 「此处」我控的【全部】单位(含艾娃自己),`nightbladeHosts` 返回时已排序").toEqual(['ava', 'host'])
  })
})
