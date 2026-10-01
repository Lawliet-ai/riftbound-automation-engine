import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { buffCount } from '../../src/keywords/buff'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { OGN_270_SPEC, OGN_270_DEST_KEY, baseAlliesOf } from '../../data/cards/OGN-270'

                                          
                                      
                                           
  
                            
                                                             
                                                     
                                                    
                            
                                            
                                
                                                            
                                                                 
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

interface Row {
  readonly oid: string
  readonly zone: string
  readonly owner: string
  readonly controller: string
  readonly types: readonly string[]
}
                                        
const ROWS: readonly Row[] = [
  { oid: 'mine', zone: `base:${P1}`, owner: P1, controller: P1, types: ['unit'] }, // ★正例
                                             
  { oid: 'charmed', zone: `base:${P1}`, owner: P2, controller: P1, types: ['unit'] },
  { oid: 'stolen', zone: `base:${P1}`, owner: P1, controller: P2, types: ['unit'] }, // 位置对、控制者错
  { oid: 'myRune', zone: `base:${P1}`, owner: P1, controller: P1, types: ['rune'] }, // 不是单位
  { oid: 'foeHome', zone: `base:${P2}`, owner: P2, controller: P2, types: ['unit'] }, // 在对手基地
]

                                                   
function scene(battlefields = 2): GameState {
  const base = createInitialState([P1, P2], battlefields)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const mk = (oid: string, zone: string, owner: string, controller: string, types: readonly string[]): GameObject => ({
    oid: asObjId(oid), defId: `U-${oid}`, owner: asPlayerId(owner), controller: asPlayerId(controller),
    zone: asZoneId(zone), baseMight: 2, baseKeywords: [], baseTypes: types as never,
    damage: 0, counters: {}, status: {},
  })
  for (const r of ROWS) put(mk(r.oid, r.zone, r.owner, r.controller, r.types))
  const bf0 = zonesByKind(base, 'battlefield')[0]
  if (bf0) put(mk('myFront', bf0.id as string, P1 as string, P1 as string, ['unit']))
  put({
    ...mk('sp', `hand:${P1}`, P1 as string, P1 as string, ['spell']),
    defId: 'OGN-270', baseMight: 0,
  })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { orange: 3, yellow: 3, green: 3, blue: 3, colorless: 3 } },
    },
  } as GameState
}

const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()
const resolveOf = (
  s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] =>
  OGN_270_SPEC.makeResolve({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)

describe('★ 前提:它是法术,费用/域照上游表(㊶⑪ pip 与域只能查 cardCosts.ts)', () => {
  test('★费用 1 法力 + 1 枚(橙或黄)、类别是法术、不印关键词', () => {
    expect(CARD_COSTS['OGN-270'], '★上游印刷费').toEqual({ mana: 1, pips: 1, colors: ['orange', 'yellow'] })
    expect(OGN_270_SPEC.cost, '★spec 侧:双色单 pip 写成一组两色').toEqual({ mana: 1, pips: [['orange', 'yellow']] })
    expect(cardKind('OGN-270'), '★「专属」是构筑限制不是类别 ⇒ 照常 spell').toBe('spell')
    expect(OGN_270_SPEC.keywords, '★卡面不印关键词').toEqual([])
    expect(cardKeywords('OGN-270'), '★印刷关键词表侧同样为空(316 那条闸盯着两处一致)').toEqual([])
    expect(playSpecFor('OGN-270'), '★已登记进 PLAY_SPECS').toBeDefined()
  })
})

describe('★★★★★★ 目标范围:「你基地中」+「友方」两半【各管一头】', () => {
  test('★★★★★★合法目标恰好是【我控制的、在我基地里的单位】两张', () => {
    const s = scene()
    expect(OGN_270_SPEC.legalTargets(s, P1).slice().sort())
      .toEqual(['charmed', 'mine'])
  })

  test('★★★★★「友方」按 §740.1.a 是【控制者】,不是拥有者', () => {
    const s = scene()
    const got = new Set(OGN_270_SPEC.legalTargets(s, P1))
    expect(got.has('charmed'), '★对手【拥有】但我【控制】⇒ 是友方').toBe(true)
    expect(got.has('stolen'), '★我拥有但对手控制、就躺在我基地 ⇒ 不是友方').toBe(false)
  })

  test('★★★★★「你基地中」是【位置】判据:我控制但站在战场上的进不来', () => {
    const s = scene()
    expect(s.objects[asObjId('myFront')]!.controller, '前提自证:它确实是我控制的').toBe(P1)
    expect(OGN_270_SPEC.legalTargets(s, P1)).not.toContain('myFront')
  })

  test('★★★★非单位不算(我基地里那枚符文)', () => {
    expect(OGN_270_SPEC.legalTargets(scene(), P1)).not.toContain('myRune')
  })

  test('★★★视角对称:换对手来问,只列得出【他】基地里【他】控制的那张', () => {
                                                                      
    expect(baseAlliesOf(scene(), P2 as string)).toEqual(['foeHome'])
  })
})

describe('★★★★★★ 第二问:只问【去哪】,不再问【选谁】', () => {
  const ask = (s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>) =>
    OGN_270_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}) })(s, chosen)

  test('★★★★★★候选 = 场上【所有】战场(卡文没写"你控制的"),键是落点键', () => {
    const s = scene(3)
    const req = ask(s, 'mine', {})
    expect(req, '★必须问一次').not.toBeNull()
    expect(req!.key).toBe(OGN_270_DEST_KEY)
    expect(req!.candidates.map((c) => c.id).sort(), '★三处战场一处不少').toEqual(bfIds(s))
  })

  test('★★★★★★「其」= 刚被增益的那个 ⇒ 答过一次就【不再问】(不追问第二个目标)', () => {
    const s = scene()
    const first = bfIds(s)[0]!
    expect(ask(s, 'mine', { [OGN_270_DEST_KEY]: first }), '★已答 ⇒ 收工').toBeNull()
  })

  test('★★★★没有目标 / 目标已不在场上 ⇒ 不问', () => {
    const s = scene()
    expect(ask(s, undefined, {})).toBeNull()
    expect(ask(s, 'ghost', {})).toBeNull()
  })

  test('★★★★场上【一处战场都没有】⇒ 不问', () => {
    const s = scene(0)
    expect(bfIds(s), '前提自证:确实零处战场').toEqual([])
    expect(ask(s, 'mine', {})).toBeNull()
  })
})

describe('★★★★★★★ 结算:先增益【然后】移动,移动发两条', () => {
  test('★★★★★★★次序即卡文次序:grantBuff 在前,移动在后', () => {
    const s = scene()
    const to = bfIds(s)[0]!
    const evs = resolveOf(s, 'mine', { [OGN_270_DEST_KEY]: to })
    expect(evs.map((e) => (e as { kind: string }).kind))
      .toEqual(['grantBuff', 'zoneChange', 'unitMoved'])
    expect(evs[0]).toEqual({ kind: 'grantBuff', target: 'mine' })
    expect(evs[1], '★zoneChange 用 obj + to,没有 from(㊳②)').toEqual({ kind: 'zoneChange', obj: 'mine', to })
    expect(evs[2], '★§446.1 补发的移动信号').toEqual({
      kind: 'unitMoved', unit: 'mine', player: P1, from: `base:${P1}`, to,
    })
  })

  test('★★★★★★移动那半做不成,增益那半【照给】(卡文是两句,不是"移得动才给")', () => {
    const s = scene(0)
    expect(resolveOf(s, 'mine', {}), '★零处战场:只剩增益').toEqual([{ kind: 'grantBuff', target: 'mine' }])
                          
    expect(resolveOf(scene(), 'mine', { [OGN_270_DEST_KEY]: 'battlefield:nope' }))
      .toEqual([{ kind: 'grantBuff', target: 'mine' }])
  })

  test('★★★没目标 / 目标已消失 ⇒ 一条都不发', () => {
    expect(resolveOf(scene(), undefined, {})).toEqual([])
    expect(resolveOf(scene(), 'ghost', {})).toEqual([])
  })
})

describe('★★★★★★★ 真流程:从手牌打得出来,增益与移动都真落地', () => {
  function play(target: string): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'sp' && (a as { target?: string }).target === target)
    expect(act, `前提自证:target=${target} 这条打出动作列得出来`).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
        continue
      }
      break
    }
    return g
  }

  test('★★★★★★★打完之后:那名单位【身上有增益】且【站到了战场上】', () => {
    const g = play('mine')
    const o = g.state.objects['mine' as ObjId]!
    expect(buffCount(o), '★增益真的加上了(不是只发了事件)').toBe(1)
    expect(bfIds(g.state), '前提自证:战场还在').toHaveLength(2)
    expect(bfIds(g.state)).toContain(o.zone as string)
    const z = g.state.zones[o.zone]!
    expect(z.contents, '★区域的 contents 也跟着更新了').toContain('mine')
    expect(g.state.zones[`base:${P1}`]!.contents, '★不能两头都挂着').not.toContain('mine')
  })

  test('★★★★★★动作枚举:恰好列得出【两条】,对应两名合法目标', () => {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const targets = g.legalActions(P1)
      .filter((a) => (a as { cardOid?: string }).cardOid === 'sp')
      .map((a) => (a as { target?: string }).target).sort()
    expect(targets).toEqual(['charmed', 'mine'])
  })

  test('★★★★★被我控制的【对手的】单位也真移得动(友方按控制者,一路走到底)', () => {
    const g = play('charmed')
    const o = g.state.objects['charmed' as ObjId]!
    expect(buffCount(o)).toBe(1)
    expect(bfIds(g.state)).toContain(o.zone as string)
    expect(o.owner, '★拥有者不变,变的只是位置').toBe(P2)
  })
})
