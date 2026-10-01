                                                               
                                                               
                                              
                                                                         
  
                                                                       
                                                                        
                                                  
  
                                                                  
                                                           
                                                            
                                               
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import type { PlayerId } from '../../src/state/ids'

export interface NegateSpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
                                       
  readonly maxMana?: number
                                                    
  readonly maxPips?: number
     
                                                        
                                                                  
                                                                           
                                                          
     
  readonly targetsMine?: true
     
                                                
                                                            
                                             
                                         
                                                                        
                          
                                     
     
  readonly banSpellsForController?: true
     
                                                              
                         
    
                                                                     
                                                
                                                   
                                                    
                                                        
                                                   
                                                        
                                                       
                                     
                                                    
                                     
     
  readonly requiresOpponentPlayedOtherSpell?: true
  readonly cardEffect: string
}

export const NEGATE_SPELLS: readonly NegateSpellRow[] = [
  {
    defId: 'OGN-064', cardNo: 'OGN·064/298', name: '风之障壁', domain: 'green',
    cost: { mana: 3, pips: [['green'], ['green']] }, energy: 3, keywords: ['反应'],
    cardEffect: '无效化一个法术。',
  },
  {
    defId: 'OGN-045', cardNo: 'OGN·045/298', name: '蔑视', domain: 'green',
    cost: { mana: 1, pips: [['green']] }, energy: 1, keywords: ['反应'],
    maxMana: 4, // 「不得高于{4}」
    maxPips: 1, // 「也不得高于{A}」——{A} 是**一枚**任意色符能
    cardEffect: '无效化一个法术，但其费用不得高于{{4}}，也不得高于{{A}}。',
  },
                             
  {
    defId: 'SFD-045', cardNo: 'SFD·045/221', name: '极速反制', domain: 'green',
    cost: { mana: 2, pips: [['green']] }, energy: 2, keywords: ['反应'],
    targetsMine: true, // 「将**友方单位或友方装备**选为目标的**敌方**法术或技能」
    cardEffect: '无效化一个将友方单位或友方装备选为目标的敌方法术或技能。',
  },
                                 
  {
    defId: 'UNL-190', cardNo: 'UNL-190/219', name: '夜阑谣', domain: 'green',
                                                     
                                                
    cost: { mana: 2, pips: [['green'], ['blue']] }, energy: 2, keywords: ['反应'],
    banSpellsForController: true,
    cardEffect: '无效化一个法术。其控制者在本回合内无法打出法术。',
  },
                            
  {
    defId: 'VEN-039', cardNo: 'VEN·039', name: '崩解之沙', domain: 'green',
    cost: { mana: 1, pips: [['green']] }, energy: 1, keywords: ['反应'],
    requiresOpponentPlayedOtherSpell: true,
    cardEffect: '如果对手在本回合内打出过其他法术，则无效化一个法术。',
  },
]

   
                                                  
                                                                           
                 
   
export function opponentsPlayedOtherSpell(state: GameState, me: PlayerId): boolean {
  let n = 0
  for (const [p, c] of Object.entries(state.playedSpellCountThisTurn ?? {})) {
    if (p !== (me as string)) n += c                   
  }
  return n >= 2                                         
}

   
                                    
                                                                    
                                   
   
export function makeNegateSpellSpec(
  row: NegateSpellRow,
  chainItems: (state: GameState) => string[],
  chainItemsUnderCost: (state: GameState, maxMana: number, maxPips?: number) => string[],
                                               
                                       
  chainItemsTargetingMine: (state: GameState, me: PlayerId) => string[] = () => [],
): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
    target: 'chainSpell',
    legalTargets: (state, controller) => {
                                       
      if (row.targetsMine === true) return chainItemsTargetingMine(state, controller)
      return row.maxMana === undefined
        ? chainItems(state)
        : chainItemsUnderCost(state, row.maxMana, row.maxPips)
    },
    makeResolve:
      ({ target, controller }) =>
      (state: GameState): readonly GameEvent[] => {
                                                               
        if (target === undefined) return []
                                                            
                                                                 
        if (!state.chain.some((it) => it.id === target)) return []
                                                       
        if (row.requiresOpponentPlayedOtherSpell === true && !opponentsPlayedOtherSpell(state, controller)) return []
        const out: GameEvent[] = [{ kind: 'negate', target } as GameEvent]
                                                        
        if (row.banSpellsForController === true) {
                                                             
          const item = state.chain.find((it) => it.id === target)
          if (item !== undefined) out.push({ kind: 'banPlaySpells', player: item.controller } as GameEvent)
        }
        return out
      },
  }
}

export const NEGATE_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(NEGATE_SPELLS.map((r) => [r.defId, r.keywords]))

export const NEGATE_SPELL_CARDS: readonly Card[] = NEGATE_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '无效化一个法术'
    + (r.maxMana !== undefined ? `(法力≤${r.maxMana}` : '')
    + (r.maxPips !== undefined ? `、符能≤${r.maxPips})` : r.maxMana !== undefined ? ')' : '')
    + '(NEGATE_SPELL_SPECS)' }],
}) as Card)
