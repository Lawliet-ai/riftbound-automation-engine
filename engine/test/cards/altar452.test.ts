import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { seedRunes } from '../../src/game/economy'
import { checkTrigger } from '../../src/dsl/trigger'                          
import { installProviders } from '../../data/gameDeps'                                   
import { SFD_207, SFD_207_COST, SFD_207_CARD_EFFECT, makeEmperorAltarTrigger, EXTRA_BF_TRIGGER_FACTORIES } from '../../data/cards/battlefields-extra'
import { SAND_SOLDIER_TOKEN } from '../../data/cards/token-spells'

                                                                
                                                               
                                              
                                                      
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function unit(id: string, defId: string, owner: typeof P1, zone: string, controller = owner): GameObject {
  return { oid: asObjId(id), defId, owner, controller, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[], runes = 1): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, phase: 'main', objects, zones } as GameState
  if (runes > 0) s = seedRunes(s, P1, 'green', runes)
  return s
}
const conquer = (bf = BF0, p = P1): GameEvent => ({ kind: 'conquer', player: p, battlefield: bf } as GameEvent)
                                           
const board = (runes = 1): GameState => scene([
  unit('u1', 'BLK', P1, BF0),
  unit('e1', 'BLK', P2, BF0),
  unit('far', 'BLK', P1, BF1),
], runes)

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('战场卡;费{1};卡文;EXTRA_BF 表接线', () => {
    expect(SFD_207.category).toBe('battlefield')
    expect(SFD_207_COST).toBe(1)
    expect(SFD_207_CARD_EFFECT).toContain('黄沙士兵')
    expect(SFD_207_CARD_EFFECT).toContain('返回其所属的手牌')
    expect(SAND_SOLDIER_TOKEN.baseMight, '2S(SFD-197 同一常量)').toBe(2)
    const made = EXTRA_BF_TRIGGER_FACTORIES['SFD-207']!(BF0, P1)
    expect(made).toHaveLength(1)
    expect(made[0]!.sourceDefId, '表行接到本轮工厂').toBe('SFD-207')
  })
})

describe('🔴★★★★判据与两问', () => {
  const trig = makeEmperorAltarTrigger(BF0, P1)

  test('🔴★★★我征服此处才响;别处/对手征服不响', () => {
    expect(trig.filter!(conquer(), board())).toBe(true)
    expect(trig.filter!(conquer(BF1), board()), '征服的是别处').toBe(false)
    expect(trig.filter!(conquer(BF0, P2), board()), '对手征服此处').toBe(false)
  })

  test('🔴★★★三道门(★1494 搬家后):两道【费用门】都在 `when`,那一问在确认阶段', () => {
                                                        
                                                                         
                                                                                
                                                          
                                                         
    installProviders()
    expect(trig.mayChoose, '★★§383.3.a:那一问搬到确认阶段').toBe(true)
    expect(checkTrigger(trig, conquer(), board(), P1), '★正常盘:入链 ⇒ 确认阶段问得到').toBe(true)
    expect(checkTrigger(trig, conquer(), board(0), P1), '★付不起{1} ⇒ 不入链 = 不问').toBe(false)
    const empty = scene([unit('e1', 'BLK', P2, BF0), unit('far', 'BLK', P1, BF1)], 1)
    expect(checkTrigger(trig, conquer(), empty, P1), '★此处无我控单位(敌方不算、别处不算)⇒ 不问').toBe(false)
  })

  test('🔴★★★结算期那一问=此处我控单位:敌方 e1 与别处 far 都不进;答完就不问了', () => {
                                                                
                                       
    const req = trig.nextChoice!(board(), conquer(), {})
    expect(req!.key, '★★第一问已经是 unit(pay 那一问搬去确认阶段了)').toBe('unit')
    expect(req!.candidates.map((c) => c.id)).toEqual(['u1'])
    expect(trig.nextChoice!(board(), conquer(), { unit: 'u1' }), '问完').toBeNull()
    // ⚠️**「答 skip 就不问了」那条去哪了**:玩家现在是在**确认阶段**答「不执行」,
    //   §383.3.a.2 直接把项目**从结算链移除、视为未触发** ⇒ 结算期根本走不到这里
    //   (那条路是引擎通用件,`chainFepr` 的 `MAY_CHOOSE_DECLINE` 分支管着,有自己的闸)。
  })
})

describe('🔴★★★★结算:付{1}+返手 ⇒ 此处出黄沙士兵', () => {
  const trig = makeEmperorAltarTrigger(BF0, P1)

  test('🔴★★★事件三段:付费在前 + u1 返 owner 手牌 + spawnToken(spec/zone/无 ready ⇒ 默认休眠)', () => {
    const evs = trig.effect!(board(), conquer(), { pay: 'yes', unit: 'u1' })
    const kinds = evs.map((e) => (e as { kind: string }).kind)
    expect(kinds).toContain('zoneChange')
    expect(kinds).toContain('spawnToken')
    const zc = evs.find((e) => (e as { kind: string }).kind === 'zoneChange') as { obj: string; to: string }
    expect(zc.obj).toBe('u1')
    expect(String(zc.to), '返回【其所属】的手牌').toContain('P1')
    const st = evs.find((e) => (e as { kind: string }).kind === 'spawnToken') as
      { spec: typeof SAND_SOLDIER_TOKEN; zone: string; owner: string; ready?: boolean }
    expect(st.spec).toBe(SAND_SOLDIER_TOKEN)
    expect(st.zone, '「在此处打出」= 被征服那处').toBe(BF0)
    expect(st.owner).toBe(P1)
    expect(st.ready, '卡文没写活跃 ⇒ 不豁免 §359.2.c 默认休眠').not.toBe(true)
    expect(kinds.indexOf('spawnToken'), '出兵在返手之后(「以此」)').toBeGreaterThan(kinds.indexOf('zoneChange'))
    expect(evs.length, '除返手+出兵外还有付{1}的产物').toBeGreaterThan(2)
  })

  test('🔴★★★owner≠controller:我控的【对手单位】返的是对手的手牌(「其所属」= owner)', () => {
    const stolen = scene([unit('s1', 'BLK', P2, BF0, P1)], 1)                          
    const req = trig.nextChoice!(stolen, conquer(), { pay: 'yes' })
    expect(req!.candidates.map((c) => c.id), '我【控制】的就算,owner 是谁不管').toEqual(['s1'])
    const evs = trig.effect!(stolen, conquer(), { pay: 'yes', unit: 's1' })
    const zc = evs.find((e) => (e as { kind: string }).kind === 'zoneChange') as { to: string }
    expect(String(zc.to), '返 owner P2 的手牌').toContain('P2')
  })

  test('🔴★★★依赖结构(㉙):单位在结算前没了 ⇒ 整条不执行【也不付{1}】', () => {
    const evs = trig.effect!(board(), conquer(), { pay: 'yes', unit: 'gone' })
    expect(evs, 'guard 挡整条:无 spend 无出兵').toEqual([])
  })

  test('★skip ⇒ 空;没选单位 ⇒ 空', () => {
    expect(trig.effect!(board(), conquer(), { pay: 'skip' })).toEqual([])
    expect(trig.effect!(board(), conquer(), { pay: 'yes' })).toEqual([])
  })
})
