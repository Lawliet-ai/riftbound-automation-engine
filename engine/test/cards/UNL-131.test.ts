import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { UNL_131, UNL_131_CARD_EFFECT } from '../../data/cards/UNL-131'
                                                                
                                                           
import { playSpecFor } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                       
function scene(spellOwner = P2): GameState {
  const base = createInitialState([P1, P2])
  const spell: GameObject = { oid: asObjId('spell'), defId: 'S', owner: spellOwner, controller: spellOwner, zone: asZoneId('chain:shared'), baseMight: 0, damage: 0, counters: {}, status: {} }
  const deckCards = ['d1', 'd2'].map((id): GameObject => ({ oid: asObjId(id), defId: 'C', owner: P1, controller: P1, zone: asZoneId('mainDeck:P1'), baseMight: 0, damage: 0, counters: {}, status: {} }))
  const item: ChainItem = { id: 'ci', controller: spellOwner, kind: 'spell', cardOid: asObjId('spell'), status: 'confirmed', resolve: () => [] }
  const chainZ = base.zones['chain:shared']!
  const deckZ = base.zones['mainDeck:P1']!
  return {
    ...base,
    objects: { spell, d1: deckCards[0]!, d2: deckCards[1]! },
    chain: [item],
    zones: { ...base.zones, 'chain:shared': { ...chainZ, contents: [asObjId('spell')] }, 'mainDeck:P1': { ...deckZ, contents: [asObjId('d1'), asObjId('d2')] } },
  }
}

describe('遗弃 UNL-131', () => {
  test('卡文逐字(反应+无效化返手+洞察)', () => {
    expect(UNL_131_CARD_EFFECT).toContain('无效化一个法术')
    expect(UNL_131_CARD_EFFECT).toContain('返回所属的手牌')
    expect(UNL_131_CARD_EFFECT).toContain('{{洞察}}')
    expect(UNL_131.keywords).toContain('反应')
  })

                                                          
                                             
  test('★negate_return:真路径产出的无效化带 returnToHand(遗弃特例,不进废牌堆)', () => {
    const spec = playSpecFor('UNL-131')!
    const evs = spec.makeResolve({ movedCardOid: 'self', controller: P1, target: 'ci' })(scene(P2), {}, undefined as never)
    expect(evs[0]).toMatchObject({ kind: 'negate', target: 'ci', returnToHand: true })
  })

  test('★洞察1:同一批里还要产出 insight(§436),数量为 1', () => {
    const spec = playSpecFor('UNL-131')!
    const evs = spec.makeResolve({ movedCardOid: 'self', controller: P1, target: 'ci' })(scene(P2), {}, undefined as never)
    expect(evs.map((e) => e.kind)).toEqual(['negate', 'insight'])
    expect(evs[1]).toMatchObject({ kind: 'insight', player: P1, count: 1 })
  })

  test('★合法目标=链上的法术项目(不分敌我:自己的法术也能选)', () => {
    const spec = playSpecFor('UNL-131')!
    expect(spec.legalTargets!(scene(P2), P1), '对手的法术在候选里').toContain('ci')
    expect(spec.legalTargets!(scene(P1), P1), '自己的法术也在候选里(卡文无阵营词)').toContain('ci')
  })
})
