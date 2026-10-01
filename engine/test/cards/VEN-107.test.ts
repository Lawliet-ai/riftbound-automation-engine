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
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { subsetKeyPrefix } from '../../src/loop/groupTargets'
import { enemyUnitsOnField } from '../../data/cards/enemy-move'
import {
  VEN_107_SPEC, VEN_107_PREFIX, VEN_107_LIMIT, VEN_107_GROUP, ORDER_DOMAIN,
  discordCandidates, hasOrderDomain, referencedMight,
} from '../../data/cards/VEN-107'

                                      
                                                          
  
                 
                                                             
                                          
                            
                                                            
                                                   
                                                              
                                                        
                      
                                                                    
                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

   
                                             
                                          
                                                        
                                                       
   
const YELLOW = 'OGN-206'
const Y2 = 'OGN-208'
const Y5 = 'OGN-209'
const Y_STOLEN = 'OGN-210'
const Y_NEG = 'ARC-006'
const RED = 'OGN-001'

   
            
                                           
                                                       
                                         
                                 
           
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const mk = (
    oid: string, defId: string, zone: string, controller: string, might: number,
    extra: Partial<GameObject> = {},
  ): GameObject => ({
    oid: asObjId(oid), defId, owner: asPlayerId(controller), controller: asPlayerId(controller),
    zone: asZoneId(zone), baseMight: might, baseKeywords: [], baseTypes: ['unit'] as never,
    damage: 0, counters: {}, status: {}, ...extra,
  })
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(mk('y3', YELLOW, bfs[0]!, P2 as string, 3))
  put(mk('y2', Y2, bfs[0]!, P2 as string, 2))
  put(mk('y5', Y5, bfs[1]!, P2 as string, 5))
  put(mk('rFoe', RED, bfs[0]!, P2 as string, 1))
  put(mk('yMine', YELLOW, bfs[0]!, P1 as string, 1))
  put({ ...mk('yStolen', Y_STOLEN, bfs[1]!, P2 as string, 1), owner: P1 })            
  put(mk('yNeg', Y_NEG, `base:${P2}`, P2 as string, -3))
  put({
    ...mk('sp', 'VEN-107', `hand:${P1}`, P1 as string, 0),
    baseTypes: ['spell'] as never,
  })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, yellow: 3, green: 3, blue: 3, colorless: 3 } },
    },
  } as GameState
}

const askConfirm = (s: GameState, chosen: Readonly<Record<string, string>>) =>
  VEN_107_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1 })(s, chosen)
                                            
const askSubset = (s: GameState, chosen: Readonly<Record<string, string>>) =>
  VEN_107_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const resolveOf = (s: GameState, chosen: Readonly<Record<string, string>>): readonly GameEvent[] =>
  VEN_107_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const k = (i: number): string => `${VEN_107_PREFIX}${i}`
                                                   
const SUB = subsetKeyPrefix(VEN_107_GROUP)
const withSubset = (base: Readonly<Record<string, string>>, sub: readonly string[]): Record<string, string> => {
  const o: Record<string, string> = { ...base }
  sub.forEach((v, i) => { o[`${SUB}${i}`] = v })
  o[`${SUB}${sub.length}`] = MULTI_SELECT_DONE
  return o
}
const idsOf = (req: { candidates: readonly { id: string }[] } | null): string[] =>
  (req?.candidates ?? []).map((c) => c.id).filter((id) => id !== MULTI_SELECT_DONE).sort()

describe('★ 前提:法术 1费 + 1紫pip,不印关键词(㊶⑪)', () => {
  test('★费用/类别;样本卡号的域确实一黄一红(㊳ 样例先自证前提)', () => {
    expect(CARD_COSTS['VEN-107'], '★上游印刷费').toEqual({ mana: 1, pips: 1, colors: ['purple'] })
    expect(VEN_107_SPEC.cost).toEqual({ mana: 1, pips: [['purple']] })
    expect(cardKind('VEN-107')).toBe('spell')
    expect(cardKeywords('VEN-107')).toEqual([])
    expect(playSpecFor('VEN-107')).toBeDefined()
    for (const id of [YELLOW, Y2, Y5, Y_STOLEN, Y_NEG]) {
      expect(hasOrderDomain(id), `★${id} 是序理(黄)`).toBe(true)
    }
    expect(hasOrderDomain(RED), `★${RED} 不是序理`).toBe(false)
    expect(hasOrderDomain('NO-SUCH-CARD-999'), '★查不到域的(如指示物单位)天然不入选').toBe(false)
    expect(VEN_107_LIMIT, '㊶ 上限从常量取').toBe(5)
  })
})

describe('★★★★★★ 三道筛各管一头', () => {
  test('★★★★★★一个都没选时:恰好是【敌方 + 序理 + 装得下】的那几名', () => {
    const s = scene()
                                        
    expect(discordCandidates(s, P1, [])).toEqual(['y2', 'y3', 'y5', 'yNeg', 'yStolen'].sort())
  })

  test('★★★★★【域】筛:同为敌方,红色那名进不来', () => {
    const s = scene()
    expect(enemyUnitsOnField(s, P1), '前提自证:它确实算敌方单位').toContain('rFoe')
    expect(discordCandidates(s, P1, []), '★域不符 ⇒ 出局').not.toContain('rFoe')
  })

  test('★★★★★【敌我】筛:同为序理,我控制的那名进不来', () => {
    const s = scene()
    expect(hasOrderDomain(s.objects['yMine' as ObjId]!.defId), '前提自证:它确实是序理').toBe(true)
    expect(discordCandidates(s, P1, []), '★我控制 ⇒ 出局').not.toContain('yMine')
                                 
    expect(discordCandidates(s, P2, []), '㊵ 问对手自己的答案').toEqual(['yMine'])
  })

  test('★★★★★★【战力】筛 + §143.2.b:负战力按【引用值 0】计', () => {
    const s = scene()
    expect(s.objects['yNeg' as ObjId]!.baseMight, '前提自证:它的实际战力是负的').toBe(-3)
    expect(referencedMight(s, 'yNeg'), '★★被法术引用时下钳 0,不是 -3').toBe(0)
                                                           
    const afterNeg = discordCandidates(s, P1, ['yNeg'])
    expect(afterNeg, '★选了它之后额度【一点没少也一点没多】,y5 仍恰好装得下').toContain('y5')
                                                
                                                 
    const afterNegAndY5 = discordCandidates(s, P1, ['y5'])
    expect(afterNegAndY5, '★★选了 5 力那名之后,只剩 0 力的 yNeg').toEqual(['yNeg'])
  })
})

describe('★★★★★★★ 候选【随已选动态收窄】', () => {
  test('★★★★★★★选了 3 力那名之后,5 力那名当场从候选里消失', () => {
    const s = scene()
    expect(idsOf(askConfirm(s, {})), '★第一问:五名都在').toEqual(['y2', 'y3', 'y5', 'yNeg', 'yStolen'].sort())
    const after3 = idsOf(askConfirm(s, { [k(0)]: 'y3' }))
    expect(after3, '★★剩余额度 2 ⇒ 5 力那名装不下了').not.toContain('y5')
    expect(after3, '★2 力那名还装得下').toContain('y2')
    expect(after3, '★已选的不再出现').not.toContain('y3')
  })

  test('★★★★★★额度用满:战力 >0 的全没了,【0 力的仍可选】(「不得高于」的正确读法)', () => {
    const s = scene()
                                                              
    expect(idsOf(askConfirm(s, { [k(0)]: 'y3', [k(1)]: 'y2' })), '★只剩 0 力那名').toEqual(['yNeg'])
                               
    expect(askConfirm(s, { [k(0)]: 'y3', [k(1)]: 'y2', [k(2)]: 'yNeg' }), '★★候选空 ⇒ 不再问').toBeNull()
  })

  test('★★★★★「任意数量」含【零个】:第一问就带退出口,答"够了"什么都不发', () => {
    const s = scene()
    expect(askConfirm(s, {})!.candidates.map((c) => c.id), '★末尾是退出口').toContain(MULTI_SELECT_DONE)
    expect(askConfirm(s, { [k(0)]: MULTI_SELECT_DONE }), '★收口').toBeNull()
    expect(resolveOf(s, { [k(0)]: MULTI_SELECT_DONE }), '★零个:一条事件都不发').toEqual([])
  })
})

describe('★★★★★★★ 结算:返回【其所属】的手牌', () => {
  test('★★★★★★★返回的是 `owner` 的手牌,不是控制者的', () => {
    const s = scene()
    const o = s.objects['yStolen' as ObjId]!
    expect(o.owner, '前提自证:我拥有').toBe(P1)
    expect(o.controller, '前提自证:对手控制(所以它算"敌方单位")').toBe(P2)
    expect(resolveOf(s, { [k(0)]: 'yStolen' }), '★★回【我】的手牌').toEqual([
      { kind: 'zoneChange', obj: 'yStolen', to: `hand:${P1}` },
    ])
                                            
    expect(resolveOf(s, { [k(0)]: 'y3' })).toEqual([
      { kind: 'zoneChange', obj: 'y3', to: `hand:${P2}` },
    ])
  })

  test('★★★★★★选两名:两条 zoneChange,按所选次序', () => {
    const evs = resolveOf(scene(), { [k(0)]: 'y3', [k(1)]: 'y2' })
    expect(evs).toEqual([
      { kind: 'zoneChange', obj: 'y3', to: `hand:${P2}` },
      { kind: 'zoneChange', obj: 'y2', to: `hand:${P2}` },
    ])
  })

  test('★★★★★★★【★1804d §355.11.b】组破(Σ>5)⇒ 控制者选子集;改答另一个合法子集 ⇒ 施加面随之不同', () => {
                                                                        
                                              
                                                                              
                                                           
                                                
                                                      
    const s0 = scene()
    const pumped = {
      ...s0,
      objects: { ...s0.objects, y2: { ...s0.objects['y2' as ObjId]!, baseMight: 4 } },
    } as GameState
    expect(referencedMight(pumped, 'y2'), '前提自证:它现在是 4 力').toBe(4)
    const base = { [k(0)]: 'y3', [k(1)]: 'y2' }
                                                     
    const q = askSubset(pumped, base)
    expect(q, '★组破 ⇒ 必须问子集(旧口径:引擎自动裁掉)').not.toBeNull()
    expect(q!.key, '★子集第一格键(形态现算,不写字面量)').toBe(`${SUB}0`)
    expect(idsOf(q), '★候选 = 初始组两名各自合法(y5/yNeg/yStolen 不在初始组 ⇒ 结构性出局)').toEqual(['y2', 'y3'])
    expect(q!.candidates.map((c) => c.id), '★§355.13:空集是合法答案 ⇒「够了」出口恒在').toContain(MULTI_SELECT_DONE)
                            
    expect(resolveOf(pumped, withSubset(base, ['y3'])), '★只退回玩家答的 y3').toEqual([
      { kind: 'zoneChange', obj: 'y3', to: `hand:${P2}` },
    ])
                                                               
    expect(resolveOf(pumped, withSubset(base, ['y2'])), '★★改答 {y2} ⇒ 只退 y2').toEqual([
      { kind: 'zoneChange', obj: 'y2', to: `hand:${P2}` },
    ])
                                            
    expect(askSubset(s0, base), '★组没破 ⇒ 一问都不出').toBeNull()
    expect(resolveOf(s0, base).length, '★组没破 ⇒ 全组照退').toBe(2)
  })

  test('★★★★结算前离场 / 换了阵营 ⇒ 那一个跳过,其余照走', () => {
    const s0 = scene()
    const gone = {
      ...s0,
      objects: Object.fromEntries(Object.entries(s0.objects).filter(([id]) => id !== 'y3')),
    } as GameState
    expect(resolveOf(gone, { [k(0)]: 'y3', [k(1)]: 'y2' })).toEqual([
      { kind: 'zoneChange', obj: 'y2', to: `hand:${P2}` },
    ])
                                         
    const flipped = {
      ...s0,
      objects: { ...s0.objects, y3: { ...s0.objects['y3' as ObjId]!, controller: P1 } },
    } as GameState
    expect(resolveOf(flipped, { [k(0)]: 'y3' }), '★★结算侧那道筛真的在跑').toEqual([])
  })
})

describe('★★★★★★★ 真流程:序理敌方单位真的回到手牌', () => {
  function play(picks: readonly string[]): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'sp')
    expect(act, '前提自证:不和箴言打得出来').toBeDefined()
    g.apply(act!)
    let i = 0
    for (let step = 0; step < 20; step++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const want = picks[i++] ?? MULTI_SELECT_DONE
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: want })
        continue
      }
      break
    }
    return g
  }
     
                          
                                                                   
                                                            
     
  const handDefIds = (g: InteractiveGame, p: string): string[] =>
    (g.state.zones[`hand:${p}`]!.contents).map((oid) => g.state.objects[oid]!.defId)

  test('★★★★★★★撤两名:都进了对手手牌,战场上不再挂着', () => {
    const s0 = scene()
    const from = s0.objects['y3' as ObjId]!.zone as string
    const before = handDefIds(new InteractiveGame(scene(), IG_DEPS), P2 as string).length
    const g = play(['y3', 'y2'])
    const inHand = handDefIds(g, P2 as string)
    expect(inHand.length - before, '★对手手牌净增两张').toBe(2)
    for (const defId of [YELLOW, Y2]) {
      expect(inHand, `★对手手牌收到 ${defId}`).toContain(defId)
    }
    expect(g.state.zones[from]!.contents, '★旧战场清空了那两名').toHaveLength(
      s0.zones[from]!.contents.length - 2,
    )
  })

  test('★★★★★★"我拥有、对手控制"那名:真流程里也回【我】的手牌', () => {
    const g = play(['yStolen'])
    expect(handDefIds(g, P1 as string), '★★进的是【我】的手牌(所属 = owner)').toContain(Y_STOLEN)
    expect(handDefIds(g, P2 as string), '★★★不是控制者的手牌').not.toContain(Y_STOLEN)
  })

  test('★★★★★一个都不选:场面一动不动(「任意数量」含零)', () => {
    const before = scene()
    const g = play([])
                                          
    for (const oid of ['y3', 'y2', 'y5', 'rFoe', 'yMine', 'yStolen', 'yNeg']) {
      expect(g.state.objects[oid as ObjId]!.zone, `★${oid} 没动`)
        .toBe(before.objects[oid as ObjId]!.zone)
    }
  })

  test('★★★★★ORDER_DOMAIN 常量与卡文一致(㊶ 别在别处写字面量)', () => {
    expect(ORDER_DOMAIN).toBe('yellow')
  })
})
