                                                                
                                                          
                                 
  
                         
                                         
                                                                
                                       
                                                          
                                                   
  
                                
                                                       
                                                    
                                    
                                                            
  
            
                                                       
                                                          
                                                     
                                                    

import type { Card } from '../../src/dsl/card'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import { isArmament } from '../../src/keywords/equip'
import { zoneCategory } from '../../src/state/zones'

                                
export const SFD_183_GRANT = '强攻'
                            
export const LUCIAN_LEGEND_DEFIDS: readonly string[] = ['SFD-183', 'SFD-241']

   
                        
                                                              
   
function lucianControllers(state: GameState): ReadonlySet<string> {
  const out = new Set<string>()
  for (const o of Object.values(state.objects)) {
    if (!LUCIAN_LEGEND_DEFIDS.includes(o.defId)) continue
    const k = state.zones[o.zone]?.kind
    if (k === undefined || zoneCategory(k) !== 'fielded') continue
    out.add(o.controller as string)
  }
  return out
}

   
                                                  
  
                                                 
                                                       
   
export function extraAttachmentGrants(gear: GameObject, state: GameState): readonly string[] {
  if (!isArmament(gear)) return []                        
  const owners = lucianControllers(state)
  if (owners.size === 0) return []
  return owners.has(gear.controller as string) ? [SFD_183_GRANT] : []              
}

const lucian = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '圣枪游侠', category: 'legend',
  domains: ['red', 'orange'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你的每件武装各多提供一份[强攻](extraAttachmentGrants)' }],
})
export const SFD_183: Card = lucian('SFD-183', 'SFD·183/221')
export const SFD_241: Card = lucian('SFD-241', 'SFD·241/221')
