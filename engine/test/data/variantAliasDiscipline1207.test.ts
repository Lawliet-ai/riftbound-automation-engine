import { describe, expect, test } from 'vitest'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { cardCost, cardKind, playSpecFor, activatedFor, lastRitesChoice, battlefieldName } from '../../data/registry'
import { extraAmbushZonesFor } from '../../data/cards/VEN-179'
import { unitLastRitesEffect, unitLastRitesBasePerform } from '../../data/cards/last-rites-units'
import { GEAR_CARDS } from '../../data/gearCards'
import { resolveImplDefId } from '../../data/variantAlias'
import { equipCostOptions } from '../../src/keywords/equip'
import { createInitialState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'

                                                
  
                                                                     
                                                         
                                                
                        
                                                                             
                                                     
                                                                           
                                                                     
                                                                             
                                                                      
                     
                                                                      
                                                                                   
                                                          
  
                                                       
                                   
                                                      
                                                 
                                                      
                                                              
                                                               
                                                   

const groupsOf = (): string[][] => {
  const all = Object.values(VARIANT_GROUPS as Record<string, readonly string[]>)
  return [...new Set(all.map((g) => [...g].sort().join('|')))].map((k) => k.split('|'))
}

const snap = (defId: string): never => ({
  defId, oid: 'x', owner: 'P1', controller: 'P1', zone: 'discard:P1',
  baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {},
} as never)

   
                                                      
                                                                            
                                                                         
                                                   
   
function probeState(): never {
  const s = createInitialState([asPlayerId('P1'), asPlayerId('P2')], 2)
  const bf = 'battlefield:shared:0'
  const enemy = {
    oid: asObjId('enemy'), defId: 'X-enemy', owner: asPlayerId('P2'), controller: asPlayerId('P2'),
    zone: asZoneId(bf), baseMight: 1, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const z = s.zones[bf as never] as { contents?: unknown } | undefined
  return {
    ...s,
    objects: { ...s.objects, enemy },
    zones: z ? { ...s.zones, [bf]: { ...z, contents: [enemy.oid] } } : s.zones,
  } as never
}

const emptyState = probeState()

                                            
const hit = (f: () => unknown): string => {
  try {
    const r = f()
    return r === null || r === undefined ? 'none' : 'has'
  } catch { return 'threw' }
}

const PROBES: Readonly<Record<string, (id: string) => string>> = {
  cardCost: (id) => hit(() => cardCost(id)),
  cardKind: (id) => hit(() => cardKind(id)),
  playSpec: (id) => hit(() => playSpecFor(id)),
  activated: (id) => { try { return String(activatedFor(id).length) } catch { return 'threw' } },
  ambush: (id) => { try { return String(extraAmbushZonesFor(emptyState, 'P1' as never, id).length) } catch { return 'threw' } },
                                                                
                                                              
                                                          
  lastRitesChoice: (id) => hit(() => lastRitesChoice(snap(id), 'item' as never, undefined as never, {})),
  unitLastRites: (id) => { try { return String(unitLastRitesEffect(snap(id), {} as never, emptyState).length) } catch { return 'threw' } },
  unitLRBase: (id) => hit(() => unitLastRitesBasePerform(snap(id))),
}

describe('★1207 别名解析纪律:行为级全仓闸(同组各印次答案必须一致)', () => {
  test('⭐⭐⭐⭐⭐⭐⭐⭐【全仓不变量】182 组 × 8 个查表口,组内答案零不一致', () => {
    const groups = groupsOf()
    const bad: string[] = []
    for (const g of groups) {
      for (const [name, probe] of Object.entries(PROBES)) {
        const vals = g.map(probe)
        if (new Set(vals).size > 1) bad.push(`${name} | ${g.join(',')} => ${JSON.stringify(vals)}`)
      }
    }
    expect(bad).toEqual([])
  })

  test('⭐⭐⭐⭐⭐⭐【量法自证】那些组确实是【多印次】组 —— 不是空扫', () => {
    const groups = groupsOf()
    expect(groups.length).toBe(182)
    expect(groups.every((g) => g.length >= 2), '★每组至少两个卡号').toBe(true)
                        
    const flat = groups.map((g) => g.join(','))
    for (const pair of ['UNL-179,UNL-179a', 'UNL-172,UNL-172a', 'SFD-118,SFD-118a', 'OGN-278,OGN-278a']) {
      expect(flat, `★${pair} 在组里`).toContain(pair)
    }
  })

  test('⭐⭐⭐⭐⭐⭐⭐【修好的正脸 · 绝念】UNL-179a 现在命中 CHOICE_ROWS(修前返回 null)', () => {
                                                                           
    expect(PROBES.lastRitesChoice!('UNL-179a')).toBe(PROBES.lastRitesChoice!('UNL-179'))
    expect(PROBES.lastRitesChoice!('UNL-179a'), '★走进了实现才会抛').toBe('threw')
  })

  test('⭐⭐⭐⭐⭐【百炼装配费 · ⚠️判别力有限,如实标注】SFD-118a 的解析口径对得上', () => {
                                                                         
                                                                  
                                                  
                                                            
                                                    
    const costOf = (id: string): unknown =>
      equipCostOptions(GEAR_CARDS[resolveImplDefId(id, (x) => x in GEAR_CARDS)]?.keywords).parsed[0]?.cost
    expect(costOf('SFD-118'), '★造景凭据:本体确实有装配费').toEqual({ mana: 1, pips: [['orange']] })
    expect(costOf('SFD-118a'), '★异画号现在与本体一致(修前 undefined)').toEqual(costOf('SFD-118'))
  })

  test('⭐⭐⭐⭐⭐【战场名那一处 · ⚠️同样只验解析口径】OGN-278a 折叠得到本体', () => {
                                                                    
                                                                 
    void battlefieldName
    expect(resolveImplDefId('OGN-278a', (x) => x === 'OGN-278')).toBe('OGN-278')
  })
})
