                                                                
                                                                
                                                                   
                                                     
                                                                       
  
                         
                                                
                                                                    
                                                            
                                                      
                                            
                                                                
  
                                                                                   
                                                  
                                                                 
                                                       
                                                                   
                                           
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { experienceOf, spendExperience } from '../../src/keywords/level'

   
                                                               
                                
                                                          
                                                                       
                                                                                
                                                  
                                                                  
                                                                                                               
                                                                
                                                              
                                                              
   
export function spendExperienceCost(n: number, label = `消耗${n}经验`): {
  readonly label: string
  readonly pay: (state: GameState, controller: PlayerId) => GameState | null
  readonly asEvents: (state: GameState, controller: PlayerId) => readonly GameEvent[] | null
} {
  return {
    label,
    pay: (state: GameState, controller: PlayerId): GameState | null =>
      experienceOf(state, controller) >= n ? spendExperience(state, controller, n) : null,
                                                                        
    asEvents: (state: GameState, controller: PlayerId): readonly GameEvent[] | null =>
      experienceOf(state, controller) >= n ? [{ kind: 'spend', player: controller, cost: { mana: 0, pips: [] }, experience: n } as GameEvent] : null,
  }
}

export interface SpendXpBuffRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                                
  readonly energy: number
  readonly power: number
                              
  readonly keywords: readonly string[]
                     
  readonly xp: number
  readonly cardEffect: string
}

export const SPEND_XP_BUFF_UNITS: readonly SpendXpBuffRow[] = [
  {
    defId: 'UNL-102', cardNo: 'UNL-102/219', name: '竞技场人气王', domain: 'orange',
    cost: { mana: 3 }, energy: 3, power: 3, keywords: ['狩猎'], xp: 2,
    cardEffect:
      '{{狩猎}}（当我征服或据守一处战场时，获得1点经验值。）\n消耗2经验：给予我{{增益}}。（如果我未拥有增益，则获得一个{{S}}+1增益。）',
  },
  {
    defId: 'UNL-162', cardNo: 'UNL-162/219', name: '惊艳守护者', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, power: 2, keywords: ['狩猎'], xp: 2,
    cardEffect:
      '{{狩猎}}（当我征服或据守一处战场时，获得1经验。）\n消耗2经验：给予我{{增益}}。（如果我未拥有增益，则获得一个{{S}}+1增益。）',
  },
]

   
                             
                                                            
                                                                 
                                                                 
                       
   
export function makeSpendXpBuffSpec(row: SpendXpBuffRow): ActivatedSpec {
  return {
    key: `${row.defId}:buffSelf`,
    label: `[消耗${row.xp}经验] 给予我增益`,
    cost: {},
    target: 'none',
    extraCost: spendExperienceCost(row.xp),
    makeResolve: ({ selfOid }) => (): readonly GameEvent[] =>
      [{ kind: 'grantBuff', target: selfOid as ObjId }],
  }
}

export const SPEND_XP_BUFF_SPECS: Readonly<Record<string, readonly ActivatedSpec[]>> =
  Object.fromEntries(SPEND_XP_BUFF_UNITS.map((r) => [r.defId, [makeSpendXpBuffSpec(r)]]))

export const SPEND_XP_BUFF_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(SPEND_XP_BUFF_UNITS.map((r) => [r.defId, r.keywords]))

export const SPEND_XP_BUFF_UNIT_COST: Readonly<Record<string, Cost>> =
  Object.fromEntries(SPEND_XP_BUFF_UNITS.map((r) => [r.defId, r.cost]))

export const SPEND_XP_BUFF_CARDS: readonly Card[] = SPEND_XP_BUFF_UNITS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'unit',
  domains: [r.domain], energy: r.energy, power: r.power, keywords: r.keywords,
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `消耗${r.xp}经验:给予我增益(SPEND_XP_BUFF_SPECS)` }],
}) as Card)
