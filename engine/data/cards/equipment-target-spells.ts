                                                                
                                                              
                                                         
                                              
                                                         
  
                         
                                                                        
                                                    
                                                                                      
                                                         
                                                                       
                                                                               
  
                        
                                                                    
                                                        
                                         
                                                                     
                                                                   
                                                             
                                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { destroyableEquipment } from './OGN-056'
import { grantKeywordEvent } from './activated-batch'
import { returnToOwnerHand } from './enter-triggers-batch'

                      
export type EquipmentSpellEffect =
                                            
  | 'returnToOwnerHand'
  /** 「获得{{瞬息}}」——卡文没写时限 ⇒ **永久**授予 */
  | 'grantEphemeral'

export interface EquipmentSpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
  readonly effect: EquipmentSpellEffect
  readonly cardEffect: string
}

                                 
export const EPHEMERAL_KEYWORD = '瞬息'

export const EQUIPMENT_SPELLS: readonly EquipmentSpellRow[] = [
  {
    defId: 'SFD-135', cardNo: 'SFD·135/221', name: '紧急召回', domain: 'purple',
    cost: { mana: 1 }, energy: 1, keywords: ['迅捷'], // ⚠️ 0 pip ⇒ 只写 mana
    effect: 'returnToOwnerHand',
    cardEffect: '让一件装备返回其所属的手牌。',
  },
  {
    defId: 'UNL-070', cardNo: 'UNL-070/219', name: '化为灰烬', domain: 'blue',
    cost: { mana: 2 }, energy: 2, keywords: [], // ⚠️ 上游卡文**没有**关键词横幅
    effect: 'grantEphemeral',
    cardEffect: '让一件装备获得{{瞬息}}。',
  },
]

   
                                                            
                                  
                                       
   
export function equipmentTargets(state: GameState): string[] {
  return destroyableEquipment(state) as unknown as string[]
}

                                        
export function makeEquipmentSpellSpec(row: EquipmentSpellRow): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
    target: 'custom',
    legalTargets: (state) => equipmentTargets(state),
    makeResolve: ({ target }) => (state): readonly GameEvent[] => {
      if (target === undefined) return []
                                                     
      const o = state.objects[target as ObjId]
      if (o === undefined || !equipmentTargets(state).includes(target)) return []
      if (row.effect === 'returnToOwnerHand') {
                                                                       
        return returnToOwnerHand(state, target)                              
      }
                                                     
      return [grantKeywordEvent(`${row.defId}:kw`, target, EPHEMERAL_KEYWORD, 'permanent')]
    },
  }
}

export const EQUIPMENT_SPELL_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(EQUIPMENT_SPELLS.map((r) => [r.defId, makeEquipmentSpellSpec(r)]))

export const EQUIPMENT_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(EQUIPMENT_SPELLS.map((r) => [r.defId, r.keywords]))

export const EQUIPMENT_SPELL_CARDS: readonly Card[] = EQUIPMENT_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `对一件装备:${r.effect}(EQUIPMENT_SPELL_SPECS)` }],
}) as Card)
