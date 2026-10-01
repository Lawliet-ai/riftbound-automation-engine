import { describe, expect, test } from 'vitest'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { specLookup } from '../../data/decks'
import { isUnit } from '../../src/state/cardTypes'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { attachCard } from '../../src/state/attach'
import { attachmentBonuses } from '../../src/effects/attachmentMight'
import { equipDefaultTargets } from '../../src/keywords/equip'

                                        
  
                                                                     
                                                                    
                                       
                                                                                        
                                                                               
                                               
                                                 
                                                  
  
                                                                              
                                                                      
                                                    
                                                              
                                                          
                                                                      
                                         
  
                                                 
                                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BASE = `base:${P1}`

const idsOf = (cat: string): string[] =>
  Object.entries(CARD_CATEGORIES as Record<string, string>).filter(([, c]) => c === cat).map(([i]) => i)

                                              
function fromSpec(oid: string, defId: string, extra: Record<string, unknown> = {}): GameObject {
  const sp = specLookup(defId) as unknown as { baseMight: number; baseTypes?: readonly string[] }
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BASE),
    baseMight: sp.baseMight, baseKeywords: [],
    ...(sp.baseTypes ? { baseTypes: sp.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  } as unknown as GameObject
}

function board(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const z = s.zones[BASE as never] as { contents?: unknown } | undefined
  return {
    ...s,
    objects: { ...s.objects, ...Object.fromEntries(objs.map((o) => [String(o.oid), o])) },
    zones: z ? { ...s.zones, [BASE]: { ...z, contents: objs.map((o) => o.oid) } } : s.zones,
  } as unknown as GameState
}

                                           
const gear = (): GameObject => ({
  oid: asObjId('gear'), defId: 'X-gear', owner: P1, controller: P1, zone: asZoneId(BASE),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], basePowerBonus: 2,
  damage: 0, counters: {}, status: {},
} as unknown as GameObject)

describe('★1200 传奇/战场的 §178 类型:那次真事故的回归闸(specLookupParity 明文豁免了这 190 张)', () => {
  test('⭐⭐⭐⭐⭐⭐⭐⭐【补上被豁免的 190 张】传奇与战场经 specLookup 必须给得出 baseTypes,且 isUnit 全假', () => {
    for (const cat of ['legend', 'battlefield']) {
      const ids = idsOf(cat)
      expect(ids.length).toBeGreaterThan(50)                             
      const noTypes = ids.filter((i) => (specLookup(i) as { baseTypes?: unknown }).baseTypes === undefined)
      const asUnit = ids.filter((i) => isUnit(fromSpec('probe', i)))
      expect({ cat, noTypes: noTypes.slice(0, 5), asUnit: asUnit.slice(0, 5) })
        .toEqual({ cat, noTypes: [], asUnit: [] })
    }
  })

  test('⭐⭐⭐⭐⭐⭐⭐【订正那条过期豁免的活证据】传奇【确实】经 specLookup 拿到类型', () => {
    const one = idsOf('legend')[0]!
    const sp = specLookup(one) as unknown as { baseTypes?: readonly string[] }
    expect(sp.baseTypes).toEqual(['legend'])                
  })

  test('⭐⭐⭐⭐⭐⭐⭐【事故的正脸】场上只有传奇时,它【不是】合法装配目标(§818.1.c.2)', () => {
    const lg = idsOf('legend')[0]!
    const st = board([gear(), fromSpec('lg', lg)])
                                         
    expect(Object.keys(st.objects).filter((k) => k === 'lg' || k === 'gear').sort()).toEqual(['gear', 'lg'])
    expect(equipDefaultTargets(st, String(P1), asObjId('gear')).map(String)).not.toContain('lg')
  })

  test('⭐⭐⭐⭐⭐⭐【§137.3.b 在真局里的载体就是传奇】贴到传奇头上,战力加成被无视', () => {
    const lg = idsOf('legend')[0]!
    const st = board([gear(), fromSpec('lg', lg)])
    const after = attachCard(st, asObjId('gear'), asObjId('lg'))                    
    expect(attachmentBonuses(after).map((b) => String(b.hostOid))).toEqual([])
  })

  test('⭐⭐⭐⭐⭐⭐【表的枚举完整性】卡池里出现的每一种 category 都要在 TYPES_OF_CATEGORY 里', () => {
    const KNOWN = new Set(['unit', 'equipment', 'spell', 'rune', 'legend', 'battlefield'])
    const seen = [...new Set(Object.values(CARD_CATEGORIES as Record<string, string>))].sort()
    expect(seen).toEqual([...KNOWN].sort())                        
  })
})
