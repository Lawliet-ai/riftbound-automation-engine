                                                                 
                                                                    
                                      
                                           
                         
  
                                                               
                                             
                                            
                                                             
                                                                   
                                                                          
                                                                          
                                   
                                                                     
                                                              
                                                                      
                                                                                    
                                                            
                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { pumpEvent } from './activated-batch'

export const SFD_206_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
  + '选择一名友方单位和一个法术。无效化该法术，并让该单位在本回合内获得等同于该法术法力费用的+{{s}}加成。'

export const SFD_206_PICK = 'mindblade'

export interface SFD206Deps {
                                                  
  readonly spellChainItems: (state: GameState) => string[]
                                                               
  readonly spellManaOf: (state: GameState, itemId: string) => number | undefined
}

   
                                                                            
                              
   
export function mindbladeTargets(
  state: GameState,
  deps: SFD206Deps,
  selfItem: string | undefined,
): readonly string[] {
  return deps.spellChainItems(state).filter((id) => id !== selfItem)
}

                                                     
export function makeSFD206Spec(deps: SFD206Deps): PlaySpec {
  return {
    defId: 'SFD-206', cardNo: 'SFD·206/221', name: '劳伦特心眼刀', kind: 'spell',
    cost: { mana: 2, pips: [['orange'], ['yellow']] }, // ㊶ cardCosts 实测 2 法力 2pip 双色 ⇒ 一橙一黄(★648)
    keywords: ['反应'],
                                                                           
                                                                      
    choiceTiming: 'confirm',
    target: 'custom',
                                                
    legalTargets: (state: GameState, controller: PlayerId): string[] =>
      Object.values(state.objects)
        .filter((o) => ['battlefield', 'base'].includes(state.zones[o.zone]?.kind as string)
          && isUnit(o)                                                        
          && o.controller === controller)
        .map((o) => o.oid as string)
        .sort(),
    makeNextChoice:
      ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
      (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (target === undefined || chosen[SFD_206_PICK] !== undefined) return null
                                                            
                                            
                                                                      
                                           
                                                                         
                                    
      const selfItem = state.chain.find((it) => it.cardOid === movedCardOid)?.id
      const cands = mindbladeTargets(state, deps, selfItem)
      if (cands.length === 0) return null                     
      return {
        itemId: `spell:${movedCardOid}:SFD-206`, controller, key: SFD_206_PICK,
        prompt: '劳伦特心眼刀:无效化哪一个法术?(该单位获得等同于其法力费用的加成)',
        candidates: cands.map((id) => ({ id, label: id })),
        isTarget: true, // §355.6 「选择…**和一个法术**」——第二个也是目标
      }
    },
    makeResolve:
      ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
      (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const out: GameEvent[] = []
                                                                            
                                                                          
                                                                                      
                                                             
                                                                                
      const spellItem = chosen?.[SFD_206_PICK]
      if (spellItem !== undefined) {
                                                      
        const selfItem = state.chain.find((it) => it.cardOid === movedCardOid)?.id
        if (mindbladeTargets(state, deps, selfItem).includes(spellItem)) {
          const mana = deps.spellManaOf(state, spellItem)
          if (mana !== undefined) {
            out.push({ kind: 'negate', target: spellItem } as GameEvent)                    
                                                  
            if (target !== undefined && state.objects[target as ObjId] !== undefined) {
              out.push(pumpEvent('SFD-206:pump', target, mana))
            }
          }
        }
      }
      return out
    },
  }
}

export const SFD_206: Card = {
  id: 'SFD-206', cardNo: 'SFD·206/221', name: '劳伦特心眼刀', category: 'spell',
  domains: ['orange', 'yellow'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选友方单位+链上法术:无效化并给该单位+其法力费的加成(makeSFD206Spec)' }],
}
