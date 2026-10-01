import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { moveDestinations, enemyUnitsOnField } from '../../data/cards/enemy-move'
import { SFD_129_SPEC, SFD_129_DEST_KEY, baitDestinations } from '../../data/cards/SFD-129'

                                        
                                               
  
                 
                                                   
                                                              
                                                      
                                         
                                             
                                           
                                  
                                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

   
            
                                                     
                                    
                            
                                               
           
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 3)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const mk = (oid: string, zone: string, controller: string, types: readonly string[] = ['unit']): GameObject => ({
    oid: asObjId(oid), defId: `U-${oid}`, owner: asPlayerId(controller), controller: asPlayerId(controller),
    zone: asZoneId(zone), baseMight: 2, baseKeywords: [], baseTypes: types as never,
    damage: 0, counters: {}, status: {},
  })
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(mk('foe', bfs[0]!, P2 as string))
  put(mk('mineA', bfs[0]!, P1 as string))
                                                  
                                                          
  put(mk('foeSame', bfs[0]!, P2 as string))
  put(mk('foeMate', bfs[1]!, P2 as string))
  put(mk('mineB', bfs[2]!, P1 as string))
  put(mk('foeHome', `base:${P2}`, P2 as string))
  put({ ...mk('sp', `hand:${P1}`, P1 as string, ['spell']), defId: 'SFD-129', baseMight: 0 })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, green: 3, blue: 3, orange: 3, colorless: 3 } },
    },
  } as GameState
}

const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()
const ask = (s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>) =>
  SFD_129_SPEC.makeNextChoice!({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const resolveOf = (
  s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] =>
  SFD_129_SPEC.makeResolve({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
                                
const without = (s: GameState, ...oids: readonly string[]): GameState => ({
  ...s,
  objects: Object.fromEntries(Object.entries(s.objects).filter(([id]) => !oids.includes(id))),
} as GameState)

describe('★ 前提:法术 2费 0pip 紫,[回响2] 走 echo 不进印刷关键词表(㊶⑪)', () => {
  test('★费用/类别/echo/关键词', () => {
    expect(CARD_COSTS['SFD-129'], '★上游印刷费').toEqual({ mana: 2, pips: 0, colors: ['purple'] })
    expect(SFD_129_SPEC.cost, '★0 pip 只写 mana').toEqual({ mana: 2 })
    expect(cardKind('SFD-129')).toBe('spell')
    expect(playSpecFor('SFD-129'), '★已登记进 PLAY_SPECS').toBeDefined()
  })

  test('★★★[回响2] = `PlaySpec.echo`,**不是**印刷关键词', () => {
    expect(playSpecFor('SFD-129')?.echo, '★§820 额外费用').toEqual({ mana: 2 })
    expect(SFD_129_SPEC.keywords, '★spec 的 keywords 必须空').toEqual([])
    expect(cardKeywords('SFD-129'), '★★印刷表侧也空(326 那条闸挂了 ECHO_EXEMPT)').toEqual([])
  })
})

describe('★★★★★★★ 落点:「其控制者的【其他】单位所在的位置」——比通用件【窄】', () => {
  test('★★★★★★★恰好是同伴站的那两处(另一战场 + 敌方基地)', () => {
    const s = scene()
    expect(baitDestinations(s, 'foe').slice().sort())
      .toEqual([bfIds(s)[1]!, `base:${P2}`].sort())
  })

  test('★★★★★★★★分辨断言:它与通用件 `moveDestinations` 【不是同一个集合】', () => {
                                                             
                                                      
                                      
    const s = scene()
    const wide = moveDestinations(s, 'foe').slice().sort()
    const narrow = baitDestinations(s, 'foe').slice().sort()
    expect(wide.length, '★通用件那份更宽').toBeGreaterThan(narrow.length)
    for (const z of narrow) expect(wide, '★窄的是宽的子集').toContain(z)
    const onlyWide = wide.filter((z) => !narrow.includes(z))
    expect(onlyWide, '★★被本卡判据挡掉的:没有同伴站着的那处战场').toContain(bfIds(s)[2]!)
  })

  test('★★★★★★「其他」排除它自己:它现在站的这处不在落点里', () => {
    const s = scene()
    const here = s.objects['foe' as ObjId]!.zone as string
    expect(baitDestinations(s, 'foe')).not.toContain(here)
                                      
    expect(baitDestinations(s, 'foe'), '★恰好两处,一个不多').toHaveLength(2)
                                                              
                                                 
    expect(s.objects['foeSame' as ObjId]!.zone as string, '前提自证:同伴确实和它同处').toBe(here)
  })

  test('★★★★★★「**其**控制者」取的是【被移动那名】的控制者,不是打出者', () => {
                                             
    const s = scene()
    expect(s.objects['mineB' as ObjId]!.zone as string, '前提自证:第三处战场只有我的单位').toBe(bfIds(s)[2]!)
    expect(baitDestinations(s, 'foe'), '★我的单位站的地方不算它的落点').not.toContain(bfIds(s)[2]!)
                                    
    expect(baitDestinations(s, 'mineA').slice().sort(), '㊵ 问这名单位自己的答案')
      .toEqual([bfIds(s)[2]!])
  })

  test('★★★★★★同伴全和它挤在一处 ⇒ 一个落点都没有,不问不动', () => {
    const s0 = scene()
    const only = without(s0, 'foeMate', 'foeHome')               
    expect(baitDestinations(only, 'foe'), '★没有"其他单位"').toEqual([])
    expect(ask(only, 'foe', {}), '★★不问').toBeNull()
    expect(resolveOf(only, 'foe', { [SFD_129_DEST_KEY]: bfIds(only)[1]! }), '★★★硬塞落点也不动').toEqual([])
  })

  test('★★★★★目标候选与通用件 `enemyUnitsOnField` 一致(这一半是该复用的)', () => {
    const s = scene()
    expect(SFD_129_SPEC.legalTargets(s, P1).slice().sort())
      .toEqual(enemyUnitsOnField(s, P1).slice().sort())
  })
})

describe('★★★★★★ 追问与结算', () => {
  test('★★★★★★追问一次落点,答过就收口', () => {
    const s = scene()
    const req = ask(s, 'foe', {})
    expect(req!.key).toBe(SFD_129_DEST_KEY)
    expect(req!.candidates.map((c) => c.id).sort(), '★候选 = baitDestinations')
      .toEqual(baitDestinations(s, 'foe').slice().sort())
    expect(ask(s, 'foe', { [SFD_129_DEST_KEY]: `base:${P2}` }), '★★答过不再问').toBeNull()
  })

  test('★★★★★★结算发两条:zoneChange + unitMoved(§446.1)', () => {
    const s = scene()
    const to = `base:${P2}`
    const evs = resolveOf(s, 'foe', { [SFD_129_DEST_KEY]: to })
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['zoneChange', 'unitMoved'])
    expect(evs[0]).toEqual({ kind: 'zoneChange', obj: 'foe', to })
    expect(evs[1], '★★`player` 是【那名单位的控制者】,不是打出者').toEqual({
      kind: 'unitMoved', unit: 'foe', player: P2, from: s.objects['foe' as ObjId]!.zone, to,
    })
  })

  test('★★★★★★★结算时【再验一次】落点:追问后同伴没了,就不该再挪过去', () => {
                                            
                                                          
    const s = scene()
    const gone = without(s, 'foeHome')
    expect(baitDestinations(gone, 'foe'), '前提自证:基地那处已不合法').not.toContain(`base:${P2}`)
    expect(resolveOf(gone, 'foe', { [SFD_129_DEST_KEY]: `base:${P2}` }), '★一条都不发').toEqual([])
                               
    expect(resolveOf(gone, 'foe', { [SFD_129_DEST_KEY]: bfIds(gone)[1]! }).length, '★对照:合法落点照走').toBe(2)
  })

  test('★★★没目标 / 没答落点 ⇒ 一条都不发', () => {
    expect(resolveOf(scene(), undefined, {})).toEqual([])
    expect(resolveOf(scene(), 'foe', {})).toEqual([])
  })
})

describe('★★★★★★★ 真流程:敌方单位真的被挪到同伴那儿', () => {
  function play(target: string, dest: string): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'sp' && (a as { target?: string }).target === target)
    expect(act, `前提自证:target=${target} 打得出来`).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const want = p.request.candidates.find((c) => c.id === dest)?.id ?? p.request.candidates[0]!.id
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: want })
        continue
      }
      break
    }
    return g
  }

  test('★★★★★★★挪到同伴所在的那处战场,控制者不变', () => {
    const s0 = scene()
    const mateZone = s0.objects['foeMate' as ObjId]!.zone as string
    const from = s0.objects['foe' as ObjId]!.zone as string
    const g = play('foe', mateZone)
    const o = g.state.objects['foe' as ObjId]!
    expect(o.zone as string, '★真的挪过去了').toBe(mateZone)
    expect(g.state.zones[mateZone]!.contents, '★新区 contents 收到了它').toContain('foe')
    expect(g.state.zones[from]!.contents, '★旧区不再挂着').not.toContain('foe')
    expect(o.controller, '★★移动不改控制者').toBe(P2)
  })

  test('★★★★★动作枚举:目标恰好是敌方那三名(★同一目标会因 §820 回响展开成多条动作)', () => {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const acts = g.legalActions(P1).filter((a) => (a as { cardOid?: string }).cardOid === 'sp')
    expect([...new Set(acts.map((a) => (a as { target?: string }).target))].sort())
      .toEqual(['foe', 'foeHome', 'foeMate', 'foeSame'])
                                                                
                                                      
    expect(acts.length, '★★确实展开成了多条(回响那条路是活的)').toBeGreaterThan(3)
  })
})
