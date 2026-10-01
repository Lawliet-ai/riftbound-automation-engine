import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem } from '../../src/loop/chain'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, playSpecFor, spellChainItems } from '../../data/registry'
import { canPayFromState } from '../../src/game/economy'
import {
  makeSFD136Spec, chainItemController,
  SFD_136_PAY_KEY, SFD_136_PAY_YES, SFD_136_PAY_NO, SFD_136_RANSOM,
} from '../../data/cards/SFD-136'

                                                 
                                           
  
                 
                                                    
                                                           
                                                       
                                                    
                                                   
                                                
                                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const SPEC = makeSFD136Spec(spellChainItems)

   
                                               
                                                      
                                            
   
function scene(foeMana: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const mk = (oid: string, defId: string, owner: string): GameObject => ({
    oid: asObjId(oid), defId, owner: asPlayerId(owner), controller: asPlayerId(owner),
    zone: asZoneId('chain:'), baseMight: 0, baseKeywords: [], baseTypes: ['spell'] as never,
    damage: 0, counters: {}, status: {},
  })
  const objects: Record<string, GameObject> = {
    foeSpell: mk('foeSpell', 'OGN-009', P2 as string),
    mySpell: mk('mySpell', 'OGN-133', P1 as string),
    sp: { ...mk('sp', 'SFD-136', P1 as string), zone: asZoneId(`hand:${P1}`) },
  }
  const chain: ChainItem[] = [
    { id: 'item:foe', controller: P2, kind: 'spell', cardOid: asObjId('foeSpell') } as ChainItem,
    { id: 'item:mine', controller: P1, kind: 'spell', cardOid: asObjId('mySpell') } as ChainItem,
  ]
  return {
    ...base, activePlayer: P1, phase: 'main', objects, chain,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, colorless: 3 } },
      [P2]: { mana: foeMana, runes: {} },
    },
  } as GameState
}

const ask = (s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>) =>
  SPEC.makeNextChoice!({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const resolveOf = (
  s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] =>
  SPEC.makeResolve({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const idsOf = (req: { candidates: readonly { id: string }[] } | null): string[] =>
  (req?.candidates ?? []).map((c) => c.id)

describe('★ 前提:法术 2费 0pip 紫,[反应] 进印刷表、[回响2] 走 echo(㊶⑪)', () => {
  test('★费用/类别/两条关键词各走各的路', () => {
    expect(CARD_COSTS['SFD-136'], '★上游印刷费').toEqual({ mana: 2, pips: 0, colors: ['purple'] })
    expect(SPEC.cost, '★0 pip 只写 mana').toEqual({ mana: 2 })
    expect(cardKind('SFD-136')).toBe('spell')
    expect(playSpecFor('SFD-136')?.keywords, '★spec 侧时机权限').toEqual(['反应'])
    expect(cardKeywords('SFD-136'), '★印刷表侧只有[反应]').toEqual(['反应'])
    expect(playSpecFor('SFD-136')?.echo, '★★[回响2] 是额外费用,走 echo 不进关键词表').toEqual({ mana: 2 })
    expect(SFD_136_RANSOM, '㊶ 赎金从常量取').toEqual({ mana: 2 })
  })

  test('★目标候选 = 链上的法术项目(与 `spellChainItems` 一致,卡文没限敌我)', () => {
    const s = scene(9)
    expect(SPEC.legalTargets(s, P1).slice().sort()).toEqual(spellChainItems(s).slice().sort())
    expect(SPEC.legalTargets(s, P1).slice().sort(), '★两条都在:对手的和我自己的')
      .toEqual(['item:foe', 'item:mine'])
  })

  test('★「其控制者」查得对(㊼ 只有这一处定义)', () => {
    const s = scene(9)
    expect(chainItemController(s, 'item:foe')).toBe(P2)
    expect(chainItemController(s, 'item:mine'), '★我自己那条归我').toBe(P1)
    expect(chainItemController(s, 'item:nope'), '★不在链上 ⇒ undefined').toBeUndefined()
  })
})

describe('★★★★★★★ 决策权在【那个法术的控制者】手上', () => {
  test('★★★★★★★这一问派给【对手】,不是打出者', () => {
    const s = scene(9)
    const req = ask(s, 'item:foe', {})
    expect(req, '★必须问一次').not.toBeNull()
    expect(req!.controller, '★★★由对手本人决定').toBe(P2)
    expect(req!.key).toBe(SFD_136_PAY_KEY)
  })

  test('★★★★★★选中【我自己】的法术 ⇒ 这一问就归我(㊵ 问那条链项自己的答案)', () => {
    const s = scene(9)
    expect(ask(s, 'item:mine', {})!.controller, '★控制者是谁就派给谁').toBe(P1)
  })

  test('★★★★★答过一次就不再问;目标不在链上 ⇒ 不问', () => {
    const s = scene(9)
    expect(ask(s, 'item:foe', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO }), '★答过 ⇒ 收口').toBeNull()
    expect(ask(s, 'item:nope', {}), '★不在链上').toBeNull()
    expect(ask(s, undefined, {}), '★没目标').toBeNull()
  })
})

describe('★★★★★★★ 付得起 / 付不起:两档候选各不相同', () => {
  test('★★★★★★★付得起 ⇒ 两个选项;付不起 ⇒ 只剩"不支付"', () => {
    const rich = scene(9)
    expect(canPayFromState(rich, P2, SFD_136_RANSOM), '前提自证:他付得起').toBe(true)
    expect(idsOf(ask(rich, 'item:foe', {})), '★两个选项,掏钱那个在前')
      .toEqual([SFD_136_PAY_YES, SFD_136_PAY_NO])

    const broke = scene(1)                   
    expect(canPayFromState(broke, P2, SFD_136_RANSOM), '前提自证:他付不起').toBe(false)
    expect(idsOf(ask(broke, 'item:foe', {})), '★★★付不起 ⇒ 连"支付"这个选项都看不到')
      .toEqual([SFD_136_PAY_NO])
  })
})

describe('★★★★★★★ 结算:二选一,没有第三种结果', () => {
  test('★★★★★★★他掏钱 ⇒ 只发一条 `spend`,【不】无效化', () => {
    const s = scene(9)
    const evs = resolveOf(s, 'item:foe', { [SFD_136_PAY_KEY]: SFD_136_PAY_YES })
    expect(evs, '★扣的是【他】的钱,不是我的').toEqual([
      { kind: 'spend', player: P2, cost: { mana: 2 } },
    ])
  })

  test('★★★★★★★他不掏 ⇒ 只发一条 `negate`,【不】扣钱', () => {
    const s = scene(9)
    expect(resolveOf(s, 'item:foe', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO }))
      .toEqual([{ kind: 'negate', target: 'item:foe' }])
  })

  test('★★★★★★没答(等于没选择支付)⇒ 走"否则"那半:无效化', () => {
    expect(resolveOf(scene(9), 'item:foe', {}), '★「除非…选择支付」⇒ 没选就是没付')
      .toEqual([{ kind: 'negate', target: 'item:foe' }])
  })

  test('★★★★★★★★结算侧【再验一次】:答了要付但已经付不起 ⇒ 照样无效化', () => {
                                           
                                                        
    const broke = scene(1)
    expect(canPayFromState(broke, P2, SFD_136_RANSOM), '前提自证:此刻付不起').toBe(false)
    expect(resolveOf(broke, 'item:foe', { [SFD_136_PAY_KEY]: SFD_136_PAY_YES }), '★走"否则"那半')
      .toEqual([{ kind: 'negate', target: 'item:foe' }])
  })

  test('★★★「无效化」不返手(§425 缺省进废牌堆)', () => {
    const ev = resolveOf(scene(9), 'item:foe', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO })[0] as
      { returnToHand?: boolean }
    expect(ev.returnToHand, '★不给这个字段 —— 遗弃 UNL-131 那张才返手').toBeUndefined()
  })

  test('★★★没目标 / 目标已离链 ⇒ 一条都不发', () => {
    expect(resolveOf(scene(9), undefined, {})).toEqual([])
    expect(resolveOf(scene(9), 'item:nope', { [SFD_136_PAY_KEY]: SFD_136_PAY_NO })).toEqual([])
  })

  test('★★★★★选自己的法术时,扣的是【我自己】的钱(归属跟着链项走)', () => {
    const s = scene(9)
    expect(resolveOf(s, 'item:mine', { [SFD_136_PAY_KEY]: SFD_136_PAY_YES })).toEqual([
      { kind: 'spend', player: P1, cost: { mana: 2 } },
    ])
  })
})
