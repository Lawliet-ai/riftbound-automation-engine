                                                                
                                                              
                                                               
                                                                 
  
                                                                   
                                                            
                                                              
                                                                        
                                                                        
                                                      
                                          
  
                          
                                                    
                                              
                                                                         
                                                      
                                         
                                                           
                                                       
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { fieldedUnits } from './activated-batch'

                          
export type StunScope =
                                     
  | 'anyUnit'
  /** 「眩晕一名**进攻方**单位」——§323.2 **战斗身份**,不分敌我 */
  | 'attacker'

export interface StunSpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
  readonly scope: StunScope
                                       
  readonly echo?: Cost
     
                                                  
    
                                                          
                                            
                                           
                                                      
     
  readonly drawIfFromHand?: number
  readonly cardEffect: string
}

export const STUN_SPELLS: readonly StunSpellRow[] = [
  {
    defId: 'OGN-050', cardNo: 'OGN·050/298', name: '符文禁锢', domain: 'green',
    cost: { mana: 2, pips: [['green']] }, energy: 2, keywords: ['迅捷'],
    scope: 'anyUnit',
    cardEffect: '眩晕一名单位。（使其在本回合内无法造成战斗伤害。）',
  },
  {
    defId: 'SFD-040', cardNo: 'SFD·040/221', name: '扑咚！', domain: 'green',
    cost: { mana: 2 }, energy: 2, keywords: ['迅捷'], // ⚠️ 0 pip ⇒ 只写 mana
    scope: 'attacker', echo: { mana: 2 }, // §820 [回响2]
    cardEffect: '眩晕一名进攻方单位。（使其在本回合内无法造成战斗伤害。）',
  },
                                                              
                                                                
  {
    defId: 'UNL-042', cardNo: 'UNL-042/219', name: '走开', domain: 'green',
    cost: { mana: 3 }, energy: 3, keywords: ['待命', '迅捷'], // cardCosts 实测:3 法力 **0 pip**
    scope: 'anyUnit', drawIfFromHand: 1,
    cardEffect: '{{眩晕}}一名单位。（使其在本回合内无法造成战斗伤害。）\n如果你从手牌中打出此牌，则抽一张牌。',
  },
]

   
                                  
                                                   
   
export function stunCandidates(scope: StunScope, state: GameState): string[] {
  const all = fieldedUnits(state) as string[]
  switch (scope) {
    case 'anyUnit':
      return all.slice().sort()                       
    case 'attacker':
                                                   
      return all.filter((oid) => state.objects[oid as ObjId]?.status.attacking === true).sort()
  }
}

                                        
export function makeStunSpellSpec(row: StunSpellRow): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    ...(row.echo !== undefined ? { echo: row.echo } : {}), // §820 只有印了才给
    keywords: row.keywords,
    target: 'custom',
    legalTargets: (state) => stunCandidates(row.scope, state),
    makeResolve: ({ target, controller, fromZoneKind }) => (state): readonly GameEvent[] => {
      const out: GameEvent[] = []
                                                   
                                                 
      if (target !== undefined && stunCandidates(row.scope, state).includes(target)) {
        out.push({ kind: 'stun', target: target as ObjId } as GameEvent)
      }
                                            
                                                    
      if (row.drawIfFromHand !== undefined && fromZoneKind === 'hand') {
        out.push({ kind: 'draw', player: controller, count: row.drawIfFromHand } as GameEvent)
      }
      return out
    },
  }
}

export const STUN_SPELL_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(STUN_SPELLS.map((r) => [r.defId, makeStunSpellSpec(r)]))

export const STUN_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(STUN_SPELLS.map((r) => [r.defId, r.keywords]))

export const STUN_SPELL_CARDS: readonly Card[] = STUN_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `眩晕一名${r.scope === 'attacker' ? '进攻方' : ''}单位(STUN_SPELL_SPECS)` }],
}) as Card)

                                             
export const STUN_EVENT_KIND = 'stun'
