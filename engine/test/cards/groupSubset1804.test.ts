                                   
  
                                                                      
                                                                         
  
                                              
                                                   
                                                    
                                                   
                                                     
                         
  
                                                                   
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { GROUP_SUBSET_PREFIX, subsetKeyPrefix } from '../../src/loop/groupTargets'
import {
  OGN_256_SPEC, OGN_256_ZONE, OGN_256_PICKS, OGN_256_STOP,
} from '../../data/cards/OGN-256'
import {
  UNL_054_SPEC, UNL_054_PREFIX, UNL_054_DEST_KEY, UNL_054_PATROL_PAY,
} from '../../data/cards/UNL-054'
import {
  VEN_107_SPEC, VEN_107_PREFIX, VEN_107_GROUP,
} from '../../data/cards/VEN-107'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
type Any = Record<string, any>

const obj = (oid: string, who: PlayerId, zone: string, might: number, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState
}
const at = (s: GameState, oid: string, patch: Partial<GameObject>): GameState =>
  ({ ...s, objects: { ...s.objects, [oid]: { ...(s.objects as Any)[oid], ...patch } } } as GameState)
const untargetable = (who: PlayerId, might: number): Partial<GameObject> =>
  ({ derived: { might, keywords: [], restrictions: [NO_ENEMY_TARGET], controller: who } } as Partial<GameObject>)

                    
const foxConfirm = (s: GameState, chosen: Record<string, string> = {}) =>
  OGN_256_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen)
const foxNext = (s: GameState, chosen: Record<string, string>) =>
  OGN_256_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen)
const foxResolve = (s: GameState, chosen: Record<string, string>) =>
  OGN_256_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen) as readonly Any[]

const tentNext = (s: GameState, chosen: Record<string, string>) =>
  UNL_054_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen)
const tentResolve = (s: GameState, chosen: Record<string, string>) =>
  UNL_054_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen) as readonly Any[]

                                                       
function foxChosen(zone: string, picks: readonly (string | undefined)[]): Record<string, string> {
  const o: Record<string, string> = { [OGN_256_ZONE]: zone }
  picks.forEach((v, i) => { if (v !== undefined) o[OGN_256_PICKS[i]!] = v })
  return o
}
                                                                  
function withSubset(base: Record<string, string>, group: string, sub: readonly string[]): Record<string, string> {
  const o = { ...base }
  sub.forEach((v, i) => { o[`${GROUP_SUBSET_PREFIX}${group}${i}`] = v })
  o[`${GROUP_SUBSET_PREFIX}${group}${sub.length}`] = MULTI_SELECT_DONE
  return o
}
const destroyed = (evs: readonly Any[]): string[] =>
  evs.filter((e) => e.kind === 'destroy').map((e) => String(e.target)).sort()
const subsetCands = (req: unknown): string[] =>
  (((req as Any)?.candidates ?? []) as Any[]).map((c) => String(c.id)).filter((x) => x !== MULTI_SELECT_DONE)
const movesOf = (evs: readonly Any[]): string[] =>
  evs.filter((e) => e.kind === 'zoneChange').map((e) => String(e.obj)).sort()

                                                             
describe('★1804 ① 规则举例:响应期两只 +1 ⇒ 结算必须问子集;两种合法子集都走得通', () => {
  const build = (): GameState => scene([
    obj('m1', P2, BF0, 1), obj('m2', P2, BF0, 1), obj('m3', P2, BF0, 1), obj('m4', P2, BF0, 1),
    obj('e5', P2, BF0, 1), // 同战场上**最初未被选中**的第五名(§355.11.b 末句:不可选)
  ])
  const chosen = foxChosen(BF0, ['m1', 'm2', 'm3', 'm4'])
  const pumped = (): GameState => at(at(build(), 'm3', { baseMight: 2 }), 'm4', { baseMight: 2 })

  test('组破 ⇒ 问子集;候选恒 ⊆ 初始组(第五名 e5 不在);「两名2[M]」⇒ 只毁那两名', () => {
    const s = pumped()
    const q = foxNext(s, chosen)!
    expect(q.key, '★子集第一格键').toBe(`${GROUP_SUBSET_PREFIX}fox0`)
    expect(subsetCands(q), '★候选=初始组四名;未选中的 e5 不在').toEqual(['m1', 'm2', 'm3', 'm4'])
    const ans = withSubset(chosen, 'fox', ['m3', 'm4'])
    expect(foxNext(s, ans), '★已答完子集 ⇒ 收口').toBeNull()
    expect(destroyed(foxResolve(s, ans)), '★只毁那两名 2[M]').toEqual(['m3', 'm4'])
  })

  test('「两名1[M] + 一名2[M]」⇒ 毁那三名;「两名1 + 两名2」在第四名被谓词挡掉', () => {
    const s = pumped()
    const ans = withSubset(chosen, 'fox', ['m1', 'm2', 'm3'])
    expect(destroyed(foxResolve(s, ans)), '★毁那三名').toEqual(['m1', 'm2', 'm3'])
                                            
    const partial = { ...chosen, [`${GROUP_SUBSET_PREFIX}fox0`]: 'm1', [`${GROUP_SUBSET_PREFIX}fox1`]: 'm2', [`${GROUP_SUBSET_PREFIX}fox2`]: 'm3' }
    const q = foxNext(s, partial)!
    expect(subsetCands(q), '★第四名(m4)被一步前瞻挡掉').not.toContain('m4')
    expect(subsetCands(q), '★候选只剩「够了」+ 无其它合法者').toEqual([])
  })
})

                                                    
describe('★1804 ② 组没破:一问不出,全组照施(与修前逐字节相同)', () => {
  test('2 名 1[M]+3[M](Σ4、同处)⇒ makeNextChoice null、resolve 全毁', () => {
    const s = scene([obj('a1', P2, BF0, 1), obj('d3', P2, BF0, 3)])
    const chosen = foxChosen(BF0, ['a1', 'd3', undefined])
    expect(foxNext(s, chosen), '★组没破 ⇒ 一问不出').toBeNull()
    expect(destroyed(foxResolve(s, chosen))).toEqual(['a1', 'd3'])
  })

  test('全部离场 ⇒ 一问不出、零事件(§359.3.e.2 静默跳过)', () => {
    const s = scene([])                
    const chosen = foxChosen(BF0, ['a1', 'a2'])
    expect(foxNext(s, chosen), '★判据集为空 ⇒ groupOk([]) 真 ⇒ 不问').toBeNull()
    expect(foxResolve(s, chosen), '★零事件').toEqual([])
  })
})

                                                
describe('★1804 ③ D1 反例一:先剪枝会把「已破」翻成「没破」⇒ 自家单位被烧', () => {
                                                                            
  const build = (): GameState => scene([
    obj('A', P2, BF0, 1), obj('B', P2, BF0, 1), obj('C', P1, BF0, 1), obj('D', P2, BF0, 1),
  ])
  const chosen = foxChosen(BF0, ['A', 'B', 'C', 'D'])
  const mutated = (): GameState => at(at(at(build(), 'C', { baseMight: 2 }), 'D', { baseMight: 2 }), 'D', untargetable(P2, 2))

  test('组破(Σ6)⇒ 必须问;玩家可选 {A,B} 保住自家 C;D(不可被选取)不在候选', () => {
    const s = mutated()
    const q = foxNext(s, chosen)
    expect(q, '★必须问(修前先剪枝会 Σ4 判真 ⇒ 不问 ⇒ 烧 C)').not.toBeNull()
    expect(subsetCands(q), '★D 不可被选取 ⇒ 不在候选').not.toContain('D')
    const ans = withSubset(chosen, 'fox', ['A', 'B'])
    expect(destroyed(foxResolve(s, ans)), '★只毁 A、B;自家 C 保住').toEqual(['A', 'B'])
  })

  test('对照:把 D 的「不可被选取」拿掉,组照样破(Σ6)—— 破的判据是整组谓词,不是个体门', () => {
    const s = at(at(build(), 'C', { baseMight: 2 }), 'D', { baseMight: 2 })
    const q = foxNext(s, chosen)!
    expect(subsetCands(q)).toEqual(['A', 'B', 'C', 'D'])
  })
})

                                                     
describe('★1804 ③b D3:任何时刻都走不进非法子集(初始组横跨两处战场)', () => {
                                                              
  const s = scene([obj('a1', P2, BF0, 1), obj('a2', P2, BF0, 1), obj('a3', P2, BF1, 3), obj('a4', P2, BF1, 3)])
  const chosen = foxChosen(BF0, ['a1', 'a2', 'a3', 'a4'])

  test('选 a3 之后:跨场/超额的续选全被一步前瞻挡掉 ⇒ 问题收口、不进入非法子集', () => {
    const q = foxNext(s, chosen)!
    expect(subsetCands(q), '★第一步每个单元素子集都合法 ⇒ 四名都在').toEqual(['a1', 'a2', 'a3', 'a4'])
    const afterA3 = { ...chosen, [`${GROUP_SUBSET_PREFIX}fox0`]: 'a3' }
                                                              
                                
    expect(foxNext(s, afterA3), '★一步前瞻把三个非法续选全挡掉 ⇒ 收口').toBeNull()
    expect(destroyed(foxResolve(s, withSubset(chosen, 'fox', ['a3']))), '★子集 = {a3}(合法)').toEqual(['a3'])
  })
})

                                                      
describe('★1804 ⑤ 初始目标离开所选战场:最终同处一处 ⇒ 仍可施加;分处两处 ⇒ 组破', () => {
  test('两只集体挪到 BF1 ⇒ 组仍满足 ⇒ 一问不出、照样全毁', () => {
    let s = scene([obj('a1', P2, BF0, 1), obj('a2', P2, BF0, 1)])
    s = at(at(s, 'a1', { zone: asZoneId(BF1) }), 'a2', { zone: asZoneId(BF1) })
    const chosen = foxChosen(BF0, ['a1', 'a2'])
    expect(foxNext(s, chosen), '★集体转场 ⇒ 一问不出').toBeNull()
    expect(destroyed(foxResolve(s, chosen)), '★照样全毁').toEqual(['a1', 'a2'])
  })

  test('三只里一只去 BF1 ⇒ 组破;选了 BF0 的一个之后,BF1 那只自动出局', () => {
    let s = scene([obj('a1', P2, BF0, 1), obj('a2', P2, BF0, 1), obj('a3', P2, BF0, 1)])
    s = at(s, 'a3', { zone: asZoneId(BF1) })
    const chosen = foxChosen(BF0, ['a1', 'a2', 'a3'])
    const q = foxNext(s, chosen)!
    expect(subsetCands(q).sort()).toEqual(['a1', 'a2', 'a3'])
    const afterA1 = { ...chosen, [`${GROUP_SUBSET_PREFIX}fox0`]: 'a1' }
    expect(subsetCands(foxNext(s, afterA1)!), '★选了 BF0 的 a1 ⇒ BF1 的 a3 出局').toEqual(['a2'])
  })
})

                                                   
describe('★1804 ⑥ 单目标:移到【另一处战场】⇒ 仍毁;移进【基地】⇒ 救下', () => {
  test('单目标搬到 BF1 ⇒ 单元素组天然同处一地 ⇒ 一问不出、照样被毁', () => {
    let s = scene([obj('a1', P2, BF0, 1)])
    s = at(s, 'a1', { zone: asZoneId(BF1) })
    const chosen = foxChosen(BF0, ['a1', undefined])
    expect(foxNext(s, chosen), '★不破 ⇒ 不问').toBeNull()
    expect(destroyed(foxResolve(s, chosen)), '★仍毁(行为相对修前翻转,PM 签字 #1)').toEqual(['a1'])
  })

  test('单目标搬进基地 ⇒ 不满足「战场之上」⇒ 组破但问不出 ⇒ 零事件(这一格正是"用键在场性"会炸的)', () => {
    let s = scene([obj('a1', P2, BF0, 1)])
    s = at(s, 'a1', { zone: asZoneId('base:P2') })
    const chosen = foxChosen(BF0, ['a1', undefined])
    expect(foxNext(s, chosen), '★候选池里它自己不合法/一步前瞻全灭 ⇒ 问不出').toBeNull()
    expect(foxResolve(s, chosen), '★零事件(救下)').toEqual([])
  })
})

                                                           
describe('★1804 ⑦ UNL-054:响应期换控制者致初始组不再同控 ⇒ 问子集;落点对子集复验', () => {
  const build = (): GameState => scene([
    obj('e1', P2, BF0, 2), obj('e2', P2, BF0, 2), obj('e3', P2, BF0, 2),
  ])
  const tChosen = (dest: string, picks: readonly string[]): Record<string, string> => {
    const o: Record<string, string> = { [UNL_054_DEST_KEY]: dest }
    picks.forEach((p, i) => { o[`${UNL_054_PREFIX}${i}`] = p })
    o[`${UNL_054_PREFIX}${picks.length}`] = MULTI_SELECT_DONE
    return o
  }
                                    
  const flipE2 = (): GameState => at(build(), 'e2', { controller: P3, owner: P3 } as Partial<GameObject>)
                                                 
  const flipE1 = (): GameState => at(build(), 'e1', { controller: P3, owner: P3 } as Partial<GameObject>)

  test('组破 ⇒ 问子集;子集必须同控(选 e1 后 e2 出局、e3 仍在)', () => {
    const s = flipE2()
    const chosen = tChosen(BF0, ['e1', 'e2', 'e3'])
    const q = tentNext(s, chosen)
    expect(q, '★控制者维破组 ⇒ 必须问').not.toBeNull()
    expect(subsetCands(q).sort()).toEqual(['e1', 'e2', 'e3'])
    const afterE1 = { ...chosen, [`${GROUP_SUBSET_PREFIX}tentacle0`]: 'e1' }
    expect(subsetCands(tentNext(s, afterE1)!), '★选了 P2 的 e1 ⇒ P3 的 e2 出局').toEqual(['e3'])
  })

  test('落点 base:P2 对子集 {e1}(此刻 P3)不再合法 ⇒ 那名不移(moveUnitEvents 的 moveDestinations 复验挡住)', () => {
    const s = flipE1()
    const chosen = tChosen('base:P2', ['e1', 'e2', 'e3'])
    const sub = withSubset(chosen, 'tentacle', ['e1'])
    expect(movesOf(tentResolve(s, sub)), '★base:P2 不是 P3 单位 e1 的落点 ⇒ 不移').toEqual([])
                            
    const chosen2 = tChosen(BF1, ['e1', 'e2', 'e3'])
    const sub2 = withSubset(chosen2, 'tentacle', ['e1'])
    expect(movesOf(tentResolve(s, sub2)).sort(), '★战场是合法落点 ⇒ e1 移').toEqual(['e1'])
  })
})

                                                                  
describe('★1804 ⑨ §757 交互 && PM 签字 #2:不可被选取进不了候选、但不构成组破', () => {
  test('组因【战力】破 + 一名不可被选取 ⇒ 候选里没有它,其余照可选', () => {
    let s = scene([obj('A', P2, BF0, 1), obj('B', P2, BF0, 1), obj('C', P2, BF0, 1)])
    s = at(at(s, 'B', untargetable(P2, 1)), 'C', { baseMight: 3 })              
    const chosen = foxChosen(BF0, ['A', 'B', 'C'])
    const q = foxNext(s, chosen)!
    expect(subsetCands(q), '★B 不可被选取 ⇒ 候选不含它').toEqual(['A', 'C'])
  })

  test('PM 签字 #2:仅因不可被选取而「仍在场」的那名【不算组破】⇒ 不问,§758.1 静默跳过', () => {
                                                     
    let s = scene([obj('A', P2, BF0, 1), obj('D', P2, BF0, 1)])
    s = at(s, 'D', untargetable(P2, 1))
    const chosen = foxChosen(BF0, ['A', 'D'])
    expect(foxNext(s, chosen), '★不可被选取 ⇒ 不算组破 ⇒ 一问不出').toBeNull()
    expect(destroyed(foxResolve(s, chosen)), '★只毁 A;D 被 §758.1 静默跳过').toEqual(['A'])
  })
})

                                                  
describe('★1804 ⑧ 机械断言:子集键与父前缀不相交、确认期键不含子集前缀', () => {
  test('OGN-256:确认期键不含 §355.11.b:;子集键不以父前缀(fox/foxZone)开头', () => {
    const confirmKeys = [OGN_256_ZONE, ...OGN_256_PICKS, OGN_256_STOP]
    expect(confirmKeys.join(''), '★确认期键不带子集前缀').not.toContain(GROUP_SUBSET_PREFIX)
    const subKey = `${subsetKeyPrefix('fox')}0`
    expect(subKey.startsWith('fox')).toBe(false)
    expect(subKey.startsWith(OGN_256_ZONE)).toBe(false)
  })

  test('UNL-054:确认期键不含 §355.11.b:;子集键不以 tentaclePick/tentacleDest 开头', () => {
    const confirmKeys = [UNL_054_PREFIX, UNL_054_DEST_KEY]
    expect(confirmKeys.join(''), '★确认期键不带子集前缀').not.toContain(GROUP_SUBSET_PREFIX)
    const subKey = `${subsetKeyPrefix('tentacle')}0`
    expect(subKey.startsWith(UNL_054_PREFIX)).toBe(false)
    expect(subKey.startsWith(UNL_054_DEST_KEY)).toBe(false)
  })
})

                                                                          
  
                                                                                
                                                                                   
                                            
                                                            
                                                              
const selfAt = (controller: PlayerId, frozen?: Record<string, string>): Any => ({
  id: 'play:sp', controller, kind: 'spell', status: 'confirmed', cardOid: 'sp',
  ...(frozen !== undefined ? { frozenChoices: frozen } : {}),
})
const withChain = (s: GameState, items: readonly Any[]): GameState => ({ ...s, chain: items } as GameState)
const foxResolveAs = (s: GameState, chosen: Record<string, string>, self: Any) =>
  OGN_256_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen, self as never) as readonly Any[]
const tentResolveAs = (s: GameState, chosen: Record<string, string>, self: Any) =>
  UNL_054_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen, self as never) as readonly Any[]
const tChosenOf = (dest: string, picks: readonly string[]): Record<string, string> => {
  const o: Record<string, string> = { [UNL_054_DEST_KEY]: dest }
  picks.forEach((p, i) => { o[`${UNL_054_PREFIX}${i}`] = p })
  o[`${UNL_054_PREFIX}${picks.length}`] = MULTI_SELECT_DONE
  return o
}

describe('★1804c ⑩ §751 夺控:§757/§758.1 的 chooser = 结算这一刻的控制者', () => {
                                                    
                                                                  
  const build = (): GameState => scene([
    obj('u1', P1, BF0, 1, untargetable(P1, 1)), obj('u2', P2, BF0, 1),
  ])
  const chosen = foxChosen(BF0, ['u1', 'u2'])

  test('㈠ 组没破 + 夺控 ⇒ 只毁 u2、u1 毫发无伤(§758.1:u1 对 P2 不可被选取)', () => {
    const s = build()
    expect(destroyed(foxResolveAs(s, chosen, selfAt(P2, chosen))),
      '★§757 按新控制者 P2 过滤 ⇒ u1 出局').toEqual(['u2'])
  })

  test('㈠ 对照:不夺控(P1)⇒ 两个都毁「敌方法术…」只挡敌方,u1 是 P1 自家', () => {
    const s = build()
    expect(destroyed(foxResolve(s, chosen)), '★无 self ⇒ 回落打出时 P1').toEqual(['u1', 'u2'])
    expect(destroyed(foxResolveAs(s, chosen, selfAt(P1, chosen))), '★显式 self=P1 同解').toEqual(['u1', 'u2'])
  })

  test('㈡ 组破 + 夺控 ⇒ 子集问 controller 是新控制者、候选已过新控制者的 §757 门', () => {
                                                                    
    let s = scene([
      obj('A', P1, BF0, 1, untargetable(P1, 1)), obj('B', P2, BF0, 1), obj('C', P2, BF0, 1),
    ])
    s = at(at(s, 'B', { baseMight: 2 }), 'C', { baseMight: 2 })
    const ch = foxChosen(BF0, ['A', 'B', 'C'])
                                                                       
    s = withChain(s, [{ id: 'play:sp', controller: P2, kind: 'spell', status: 'confirmed', cardOid: 'sp' }])
    const q = foxNext(s, ch)
    expect(q, '★组破 ⇒ 必须问').not.toBeNull()
    expect(q!.controller, '★chooser = 结算这一刻的控制者 P2').toBe(P2)
    expect(subsetCands(q), '★A 对 P2 不可被选取 ⇒ 出候选').toEqual(['B', 'C'])
  })

  test('㈢ UNL-054 同型:夺控后成员不再是「敌方」⇒ 个体门全灭 ⇒ 零移动;对照两个都移', () => {
    const s = scene([obj('e1', P2, BF0, 2), obj('e2', P2, BF0, 2)])
    const ch = tChosenOf(BF1, ['e1', 'e2'])
    expect(movesOf(tentResolve(s, ch)), '★对照:P1 控 ⇒ 两个都移').toEqual(['e1', 'e2'])
    expect(movesOf(tentResolveAs(s, ch, selfAt(P2, ch))),
      '★夺控给 P2 ⇒ e1/e2 是 P2 自家、非「敌方」⇒ 零移动').toEqual([])
  })
})

                                                               
const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, who, `hand:${who}`, 0, { defId, baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })
function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}
interface AskRec { step: number; key: string; stage: 'confirm' | 'resolve'; reqStage: string | undefined; passesBefore: number; candidates: string[] }
function runScene(g: InteractiveGame, initial: InteractiveAction, onChoice: (key: string, req: Any) => string, onWindow: (st: { confirmDone: boolean; mutated: boolean }) => void): { asks: AskRec[]; error: string | null } {
  const asks: AskRec[] = []
  const st = { confirmDone: false, mutated: false }
  let steps = 0
  let passes = 0
  let error: string | null = null
  try {
    g.apply(initial as never); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const key = String(req.key)
        const ans = onChoice(key, req)
        asks.push({ step: steps, key, stage: passes === 0 ? 'confirm' : 'resolve', reqStage: req.stage, passesBefore: passes, candidates: ((req.candidates ?? []) as Any[]).map((c) => String(c.id)) })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never); steps++
        continue
      }
      if (raw.mode === 'window') {
        if (asks.length > 0) st.confirmDone = true
        onWindow(st)
        passes++; g.apply({ kind: 'PASS', player: raw.player } as never); steps++
        continue
      }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { asks, error }
}

describe('★1804 真流程:OGN-256 打出 → 确认期选 4 名 → P2 响应抬战力 → 结算期子集问 → 只毁子集', () => {
  const build = (): InteractiveGame => new InteractiveGame(scene([
    obj('m1', P2, BF0, 1), obj('m2', P2, BF0, 1), obj('m3', P2, BF0, 1), obj('m4', P2, BF0, 1),
    inHand('fox', 'OGN-256', P1),
  ]), makeGameDeps(0x1804) as never)

  test('确认期问 zone+picks(全在 confirm);结算期子集键在 resolve;distroyed 恰子集', () => {
    const g = build()
    const initial = (g.legalActions(P1) as readonly Any[]).find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === 'fox') as InteractiveAction
    expect(initial, '前提:OGN-256 打得出来').toBeTruthy()
    const R = runScene(
      g, initial,
      (key, req) => {
        if (key === OGN_256_ZONE) return BF0
        if (OGN_256_PICKS.includes(key as never)) {
          const n = OGN_256_PICKS.indexOf(key as never)
          return ['m1', 'm2', 'm3', 'm4'][n]!
        }
        if (key.startsWith(GROUP_SUBSET_PREFIX)) {
                                   
          const subIdx = Number(key.slice(`${GROUP_SUBSET_PREFIX}fox`.length))
          return subIdx === 0 ? 'm3' : subIdx === 1 ? 'm4' : MULTI_SELECT_DONE
        }
        return String((req.candidates ?? [])[0]?.id ?? '')
      },
      (st) => {
        if (st.confirmDone && !st.mutated) {
                                                                               
                                                           
          const pump = (s: GameState, oid: string): GameState => {
            const o = (s.objects as unknown as Record<string, GameObject>)[oid]!
            return at(s, oid, { baseMight: 2, ...(o.derived ? { derived: { ...o.derived, might: 2 } } : {}) } as Partial<GameObject>)
          }
          mutateInWindow(g, (s) => pump(pump(s, 'm3'), 'm4'))
          st.mutated = true
        }
      },
    )
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const confirmAsks = R.asks.filter((a) => a.key === OGN_256_ZONE || OGN_256_PICKS.includes(a.key as never))
    expect(confirmAsks.map((a) => a.key)).toEqual([OGN_256_ZONE, ...OGN_256_PICKS])
    expect(confirmAsks.every((a) => a.stage === 'confirm' && a.reqStage === 'confirm' && a.passesBefore === 0)).toBe(true)
    const subAsks = R.asks.filter((a) => a.key.startsWith(GROUP_SUBSET_PREFIX))
    expect(subAsks.length, '★结算期确实问了子集').toBeGreaterThan(0)
    expect([subAsks[0]!.stage, subAsks[0]!.reqStage], '★子集问在结算期').toEqual(['resolve', 'resolve'])
    expect(subAsks[0]!.passesBefore).toBeGreaterThan(0)
    const st = curState(g).objects as unknown as Record<string, GameObject | undefined>
    expect(st['m3'] === undefined && st['m4'] === undefined, '★m3/m4(两名2[M])已被毁(离场)').toBe(true)
    expect(st['m1'] !== undefined && st['m2'] !== undefined, '★m1/m2 未被毁').toBe(true)
  })
})

                                                                              
describe('★1804c 真流程:OGN-256 确认期选 {u1,u2} → 响应期 P2 夺控该法术 → 结算只毁 u2', () => {
                                                                            
                                                                        
  const build = (): InteractiveGame => new InteractiveGame(scene([
    obj('u1', P1, BF0, 1, { defId: 'SFD-105' }), obj('u2', P2, BF0, 1),
    inHand('fox', 'OGN-256', P1),
  ]), makeGameDeps(0x1804c) as never)

  test('走完整会话层:§751 夺控后 §757 门按新控制者 P2 ⇒ u1 免毁、u2 被毁', () => {
    const g = build()
    const initial = (g.legalActions(P1) as readonly Any[])
      .find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === 'fox') as InteractiveAction
    expect(initial, '前提:OGN-256 打得出来').toBeTruthy()
    const R = runScene(
      g, initial,
      (key, req) => {
        if (key === OGN_256_ZONE) return BF0
        if (OGN_256_PICKS.includes(key as never)) {
          const n = OGN_256_PICKS.indexOf(key as never)
          return ['u1', 'u2'][n] ?? OGN_256_STOP
        }
        return String((req.candidates ?? [])[0]?.id ?? '')
      },
      (st) => {
        if (st.confirmDone && !st.mutated) {
                                                                              
                                                                 
          mutateInWindow(g, (s) => ({
            ...s,
            chain: s.chain.map((it) =>
              (it.kind === 'spell' && s.objects[it.cardOid as never]?.defId === 'OGN-256'
                ? { ...it, controller: P2 } : it)),
          } as GameState))
          st.mutated = true
        }
      },
    )
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const st = curState(g).objects as unknown as Record<string, GameObject | undefined>
    expect(st['u1'] !== undefined, '★u1(对结算控制者 P2 不可被选取)毫发无伤').toBe(true)
    expect(st['u2'] === undefined, '★u2 被毁').toBe(true)
  })
})

                                                                               
  
                                                        
                                                                 
                                                             
  
                                                                           
                                                                                    
  
                                                                     
                                                     
                               
                                                             
const YEL_A = 'OGN-206'            
const YEL_B = 'OGN-208'                            
const VEN_SUB = subsetKeyPrefix(VEN_107_GROUP)
const venChosen = (picks: readonly string[]): Record<string, string> => {
  const o: Record<string, string> = {}
  picks.forEach((p, i) => { o[`${VEN_107_PREFIX}${i}`] = p })
  o[`${VEN_107_PREFIX}${picks.length}`] = MULTI_SELECT_DONE
  return o
}
const venNext = (s: GameState, chosen: Record<string, string>) =>
  VEN_107_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen)
const venNextAs = (s: GameState, chosen: Record<string, string>, cardOid: string, fallback: PlayerId) =>
  VEN_107_SPEC.makeNextChoice!({ movedCardOid: cardOid, controller: fallback } as never)(s, chosen)
const venResolve = (s: GameState, chosen: Record<string, string>) =>
  VEN_107_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen) as readonly Any[]
const venHandMoves = (evs: readonly Any[]): string[] =>
  evs.filter((e) => e.kind === 'zoneChange' && String(e.to).startsWith('hand:')).map((e) => String(e.obj)).sort()

describe('★1804d ⑫ VEN-107:组破 ⇒ 问子集;没破 ⇒ 一问不出;夺控按新控制者', () => {
                                                      
  const build = (): GameState => scene([
    obj('a', P2, BF0, 2, { defId: YEL_A }), obj('b', P2, BF0, 3, { defId: YEL_B }),
  ])
  const pumped = (): GameState => at(build(), 'b', { baseMight: 4 })               

  test('㈠ ㈠批评者场景:Σ6 ⇒ 必须问子集;答 {b} ⇒ 只退 b(旧贪心只会给 {a})', () => {
    const s = pumped()
    const ch = venChosen(['a', 'b'])
    const q = venNext(s, ch)!
    expect(q, '★组破 ⇒ 必须问子集').not.toBeNull()
    expect(q.key, '★子集第一格键').toBe(`${VEN_SUB}0`)
    expect(subsetCands(q), '★候选 = 初始组两名(各自是合法单元素子集)').toEqual(['a', 'b'])
                                                     
    expect(venHandMoves(venResolve(s, withSubset(ch, VEN_107_GROUP, ['b']))), '★★只退玩家答的 b')
      .toEqual(['b'])
    expect(venHandMoves(venResolve(s, withSubset(ch, VEN_107_GROUP, ['b']))), '★不含 a').not.toContain('a')
                       
    expect(venHandMoves(venResolve(s, withSubset(ch, VEN_107_GROUP, ['a']))), '★改答 {a} ⇒ 只退 a')
      .toEqual(['a'])
  })

  test('㈡ 组没破(Σ5)⇒ 一问不出、全组照退(与修前逐字节相同)', () => {
    const s = build()
    const ch = venChosen(['a', 'b'])
    expect(venNext(s, ch), '★Σ5 ≤5 ⇒ 一问都不出').toBeNull()
    expect(venHandMoves(venResolve(s, ch)), '★全组照退,按所选次序').toEqual(['a', 'b'])
  })

  test('㈢ 夺控维:夺控后子集问的 controller 与 §757 过滤都按新控制者(P2)', () => {
                                                                 
                                                  
    let s = scene([
      obj('p2u', P2, BF0, 2, { defId: YEL_B }),
      obj('p1u', P1, BF0, 1, { defId: YEL_A, ...untargetable(P1, 1) }),
      obj('p1v', P1, BF0, 2, { defId: YEL_A }),
    ])
    s = at(s, 'p2u', { baseMight: 4 })
    const ch = venChosen(['p2u', 'p1u', 'p1v'])
                                                       
    const q1 = venNext(s, ch)!
    expect(q1.controller, '★对照:不夺控 ⇒ chooser = P1').toBe(P1)
    expect(subsetCands(q1), '★P1 控 ⇒ 只有 p2u 是敌方').toEqual(['p2u'])
                                                          
                                                        
    const seized = withChain(s, [{ id: 'play:sp', controller: P2, kind: 'spell', status: 'confirmed', cardOid: 'sp' }])
    const q2 = venNextAs(seized, ch, 'sp', P1)
    expect(q2, '★夺控后组破 ⇒ 仍必须问').not.toBeNull()
    expect(q2!.controller, '★chooser = 结算这一刻的控制者 P2').toBe(P2)
    expect(subsetCands(q2!), '★§757 按 P2 过滤 ⇒ p1u 出局;p2u 是 P2 自家 ⇒ 出局;只剩 p1v').toEqual(['p1v'])
  })
})

                                                                    
  
                                                                  
                                                         
                                                  
                                                                     
                                 
  
                                                                       
                                                            
                                                
                                                  
describe('★1804 ⑦-2 设计稿 §7 第 ⑦ 格:UNL-054 子集 × 巡管税', () => {
                                                
  const build = (): GameState => scene([
    obj('e1', P2, `base:${P2}`, 2), obj('e2', P2, `base:${P2}`, 2), obj('e3', P2, `base:${P2}`, 2),
    obj('pt', P2, BF0, 4, { defId: 'UNL-163' }),
  ])
                                              
  const pumped = (): GameState =>
    at(at(at(build(), 'e1', { baseMight: 3 }), 'e2', { baseMight: 3 }), 'e3', { baseMight: 3 })
                                            
  const chosen3 = tChosenOf(BF0, ['e1', 'e2', 'e3'])
  const spendsOf = (evs: readonly Any[]): number => evs.filter((e) => e.kind === 'spend').length

  test('响应期顶破 ⇒ 子集问(键带 §355.11.b:)→ 选 2 名 ⇒ 只问 1 次 patrolPay、只发 1 条 spend、只移 2 名', () => {
    const s = pumped()
                                                         
    const q = tentNext(s, chosen3)
    expect(q, '★组破 ⇒ 子集问必出(否则本格是假绿)').not.toBeNull()
    expect(q!.key.startsWith(GROUP_SUBSET_PREFIX), '★是子集问,带 §355.11.b: 前缀').toBe(true)
    expect(q!.key).toBe(`${GROUP_SUBSET_PREFIX}tentacle0`)
                                         
    expect(subsetCands(q!).sort()).toEqual(['e1', 'e2', 'e3'])

                                                    
    const sub = withSubset(chosen3, 'tentacle', ['e1', 'e2'])
                                       
    expect(Object.keys(sub).some((k) => k.startsWith(GROUP_SUBSET_PREFIX)), '★答卷里确有子集键').toBe(true)

                                             
    const pay = tentNext(s, sub)
    expect(pay, '★子集 2 名 ⇒ 巡管税问 1 次').not.toBeNull()
    expect(pay!.key).toBe(`${UNL_054_PATROL_PAY}e2`)
                                            
    expect(tentNext(s, { ...sub, [`${UNL_054_PATROL_PAY}e2`]: 'yes' }), '★只问 1 次 patrolPay').toBeNull()

                                      
    const evs = tentResolve(s, { ...sub, [`${UNL_054_PATROL_PAY}e2`]: 'yes' })
    expect(movesOf(evs), '★只移子集那 2 名').toEqual(['e1', 'e2'])
    expect(movesOf(evs), '★第 3 名(e3)不在移动事件里(前提自证③)').not.toContain('e3')
    expect(spendsOf(evs), '★只发 1 条 spend(2 名 − 第 1 名免费)').toBe(1)
  })

  test('前提对照:组没破(Σ6)⇒ 无子集问,按初始 3 名逐名问税(第 2、3 名各一问)', () => {
    const s = build()
    const q = tentNext(s, chosen3)
    expect(q, '★有巡管 ⇒ 组没破时直接落巡管税问').not.toBeNull()
    expect(q!.key.startsWith(GROUP_SUBSET_PREFIX), '★组没破 ⇒ 子集问不出').toBe(false)
    expect(q!.key, '★按初始组第 2 名(e2)问税').toBe(`${UNL_054_PATROL_PAY}e2`)
                                                 
    const q3 = tentNext(s, { ...chosen3, [`${UNL_054_PATROL_PAY}e2`]: 'yes' })
    expect(q3!.key, '★组没破 ⇒ 还要问第 3 名').toBe(`${UNL_054_PATROL_PAY}e3`)
    expect(tentNext(s, { ...chosen3, [`${UNL_054_PATROL_PAY}e2`]: 'yes', [`${UNL_054_PATROL_PAY}e3`]: 'yes' }),
      '★初始 3 名全答完 ⇒ 收口').toBeNull()
  })
})
