                                                      
  
                                                       
                                                          
                                                             
  
                                                                               
                                                                          
                                 
  
                                                             
                                                                      
                                             
                                                     
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { spellLegalTargets } from '../../src/loop/playSpec'
import { liveTargetOids } from '../../src/loop/chainTargets'

export type LegalTargetsFn =
  (state: GameState, controller: PlayerId, selfOid?: string, bonus?: boolean) => readonly string[]

   
                                               
                                      
  
                                                                             
                               
                                                                         
                                                                           
                                                              
                                                           
   
export function spellTargetStillLegal(
  spec: { legalTargets?: LegalTargetsFn },
  state: GameState,
  chooser: PlayerId,
  target: string | undefined,
  selfOid = '',
  bonus = false,
): boolean {
  if (target === undefined) return false
  const oids = liveTargetOids(state, target)
  if (oids.length === 0) return false
  const legal = new Set(spellLegalTargets(spec, state, chooser, selfOid, bonus))
  return oids.every((oid) => legal.has(oid))
}
