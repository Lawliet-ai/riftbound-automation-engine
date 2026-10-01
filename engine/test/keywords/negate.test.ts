import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { negate } from '../../src/keywords/negate'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                                 
function spellOnChain(resolvedFlag: { r: boolean }): GameState {
  const base = createInitialState([P1, P2])
  const card: GameObject = { oid: asObjId('spell'), defId: 'SPELL', owner: P2, controller: P2, zone: asZoneId('chain:shared'), baseMight: 0, damage: 0, counters: {}, status: {} }
  const item: ChainItem = { id: 'ci', controller: P2, kind: 'spell', cardOid: asObjId('spell'), status: 'confirmed', resolve: () => (resolvedFlag.r = true, []) }
  const chainZone = base.zones['chain:shared']!
  return { ...base, objects: { spell: card }, chain: [item], zones: { ...base.zones, 'chain:shared': { ...chainZone, contents: [asObjId('spell')] } } }
}

describe('无效化 negate §425', () => {
  test('§425.1.a 移出结算链(法术不结算)+ §425.1.a.1 卡牌进拥有者弃牌堆', () => {
    const flag = { r: false }
    const s = spellOnChain(flag)
    const after = negate(s, 'ci')
    expect(after.chain).toHaveLength(0)       
    expect(after.zones['discard:P2']!.contents).toHaveLength(1)            
    expect(flag.r).toBe(false)                     
  })

  test('negate_return(遗弃):无效化并返回拥有者手牌而非弃牌堆', () => {
    const s = spellOnChain({ r: false })
    const after = negate(s, 'ci', { returnToHand: true })
    expect(after.chain).toHaveLength(0)
    expect(after.zones['hand:P2']!.contents).toHaveLength(1)        
    expect(after.zones['discard:P2']!.contents).toHaveLength(0)
  })

  test('可无效化任意控制者的法术(含自我无效化,遗弃QA L375/493)', () => {
                                
    const base = createInitialState([P1, P2])
    const card: GameObject = { oid: asObjId('mine'), defId: 'S', owner: P1, controller: P1, zone: asZoneId('chain:shared'), baseMight: 0, damage: 0, counters: {}, status: {} }
    const item: ChainItem = { id: 'c', controller: P1, kind: 'spell', cardOid: asObjId('mine'), status: 'confirmed', resolve: () => [] }
    const z = base.zones['chain:shared']!
    const s: GameState = { ...base, objects: { mine: card }, chain: [item], zones: { ...base.zones, 'chain:shared': { ...z, contents: [asObjId('mine')] } } }
    const after = negate(s, 'c', { returnToHand: true })
    expect(after.chain).toHaveLength(0)
    expect(after.zones['hand:P1']!.contents).toHaveLength(1)
  })

  test('无匹配链项目:恒等', () => {
    const s = createInitialState([P1, P2])
    expect(negate(s, 'nope')).toBe(s)
  })
})
