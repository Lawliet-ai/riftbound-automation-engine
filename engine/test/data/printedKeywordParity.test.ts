import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKeywords } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { CARD_COSTS } from '../../data/cardCosts'
import { recomputeContinuous } from '../../src/effects/continuousView'

                                          
  
                               
                         
                                                                     
                                                       
                                                                        
                                                                        
                                       
                                                
                                               
                                                                      
                                                  
                               
describe('★★★★★★ 印刷关键词:spec.baseKeywords 与 CARD_KEYWORDS 必须一字不差', () => {
  test('★全仓逐张对账(漏登记会让"按关键词扫描"的触发工厂彻底看不见它)', () => {
    const mismatch: string[] = []
    for (const id of Object.keys(CARD_COSTS)) {
      let spec: ReturnType<typeof specLookup> | undefined
      try { spec = specLookup(id) } catch { continue }
      if (!spec) continue
      const fromSpec = [...(spec.baseKeywords ?? [])].sort()
      const fromReg = [...cardKeywords(id)].sort()
      if (fromSpec.join(',') !== fromReg.join(',')) {
        mismatch.push(`${id}: spec=[${fromSpec.join(',')}] CARD_KEYWORDS=[${fromReg.join(',')}]`)
      }
    }
    expect(mismatch, `★以下卡两处印刷关键词对不上:\n${mismatch.join('\n')}`).toEqual([])
  })
})

                                                         
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function fielded(defId: string): GameState {
  const base = createInitialState([P1, P2], 2)
  const s = specLookup(defId)
  const o: GameObject = {
    oid: asObjId('me'), defId, owner: P1, controller: P1,
    zone: asZoneId('battlefield:shared:0'),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords, baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  }
  const zones = { ...base.zones }
  const z = zones[o.zone]!
  zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  return { ...base, activePlayer: P1, phase: 'main', objects: { me: o }, zones } as GameState
}

describe('★★★★★ 活证据:奥恩 SFD-085 的 [百炼] 现在真的发得出触发了', () => {
  test('★前提:它确实印着 [法盾2][百炼],而且两处表都认', () => {
    expect(specLookup('SFD-085').baseKeywords).toEqual(['法盾2', '百炼'])
    expect(cardKeywords('SFD-085')).toEqual(['法盾2', '百炼'])
  })

  test('★★★★★命门:`activeTriggers` 里有它的 forge 触发(第316轮之前是【0 条】)', () => {
    const s = fielded('SFD-085')
    const forge = activeTriggers(s).filter((t) => (t.id ?? '').includes('forge'))
    expect(forge.length, '★百炼要发得出触发来').toBeGreaterThan(0)
  })

  test('★对照组:不印百炼的卡一条 forge 触发都不该有', () => {
                                                         
    const forge = activeTriggers(fielded('OGN-240')).filter((t) => (t.id ?? '').includes('forge'))
    expect(forge, '★壁垒不该被当成百炼').toHaveLength(0)
  })

  test('★两条消费路都要通:布尔那半(derived)本来就通,别把它改坏了', () => {
    const o = recomputeContinuous(fielded('SFD-085')).objects[asObjId('me')]!
    expect(o.derived?.keywords).toContain('百炼')
    expect(o.derived?.keywords).toContain('法盾2')
  })
})
