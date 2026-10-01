import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { VEN_152, VEN_152_CARD_EFFECT } from '../../data/cards/VEN-152'
                                                                    
                                     
import { playSpecFor } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                   
function scene(): GameState {
  const base = createInitialState([P1, P2])
  const spell: GameObject = { oid: asObjId('spell'), defId: 'S', owner: P2, controller: P2, zone: asZoneId('chain:shared'), baseMight: 0, damage: 0, counters: {}, status: {} }
  const item: ChainItem = { id: 'ci', controller: P2, kind: 'spell', cardOid: asObjId('spell'), rechoice: { target: asObjId('oldT') }, status: 'confirmed', resolve: () => [] }
  const z = base.zones['chain:shared']!
  return { ...base, objects: { spell }, chain: [item], zones: { ...base.zones, 'chain:shared': { ...z, contents: [asObjId('spell')] } } }
}

                                                  
function withPriceySpell(s: GameState): GameState {
  const spell: GameObject = { oid: asObjId('priceyCard'), defId: 'OGN-123', owner: P2, controller: P2, zone: asZoneId('chain:shared'), baseMight: 0, damage: 0, counters: {}, status: {} }
  const item: ChainItem = { id: 'pricey', controller: P2, kind: 'spell', cardOid: asObjId('priceyCard'), status: 'confirmed', resolve: () => [] }
  const z = s.zones['chain:shared']!
  return { ...s, objects: { ...s.objects, priceyCard: spell }, chain: [...s.chain, item],
    zones: { ...s.zones, 'chain:shared': { ...z, contents: [...z.contents, asObjId('priceyCard')] } } }
}

describe('灵魂折镜 VEN-152', () => {
  test('卡文逐字(反应+费用≤4+付A夺控重选/否则无效化)', () => {
    expect(VEN_152_CARD_EFFECT).toContain('法力费用不高于{{4}}')
    expect(VEN_152_CARD_EFFECT).toContain('获得此法术的控制权')
    expect(VEN_152_CARD_EFFECT).toContain('否则将其无效化')
    expect(VEN_152.keywords).toContain('反应')
  })

  test('★合法目标=费用≤4(这条守的是真路径:registry 里那份 spec 的 legalTargets)', () => {
    const spec = playSpecFor('VEN-152')!
    const s = scene()
                                                  
    expect(spec.legalTargets!(s, P1)).toContain('ci')
                                                  
    const pricey = withPriceySpell(s)
    expect(spec.legalTargets!(pricey, P1), '把真路径的 4 改成 99,这一句会红').not.toContain('pricey')
  })


                                                                       
                                                                          
                                                            
  test('★付A ⇒ 真路径产出「付[A] + 夺控(带重选目标)」两条事件(§751/§754)', () => {
    const spec = playSpecFor('VEN-152')!
    const evs = spec.makeResolve({ movedCardOid: 'self', controller: P1, target: 'ci' })(scene(), { payA: 'yes', rechoose: 'newT' })
    expect(evs.map((e) => e.kind)).toEqual(['spend', 'seize'])
    expect(evs[1]).toMatchObject({ kind: 'seize', target: 'ci', newController: P1, rechoiceTarget: 'newT' })
  })

  test('★付A但选「保持原目标」⇒ 不带 rechoiceTarget(keep 不是一个目标)', () => {
    const spec = playSpecFor('VEN-152')!
    const evs = spec.makeResolve({ movedCardOid: 'self', controller: P1, target: 'ci' })(scene(), { payA: 'yes', rechoose: 'keep' })
    expect(evs[1]).toMatchObject({ kind: 'seize', target: 'ci' })
    expect((evs[1] as { rechoiceTarget?: string }).rechoiceTarget).toBeUndefined()
  })

  test('★不付A ⇒ 真路径产出无效化(§425 不返手,去废牌堆)', () => {
    const spec = playSpecFor('VEN-152')!
    const evs = spec.makeResolve({ movedCardOid: 'self', controller: P1, target: 'ci' })(scene(), { payA: 'no' })
    expect(evs).toEqual([{ kind: 'negate', target: 'ci', returnToHand: false }])
  })
})
