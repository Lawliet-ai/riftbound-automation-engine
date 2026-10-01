                          
  
                                      
                                             
                            
                                       
                                                            
                                                  
                                                
                               
  
                         
                                                  
                                                          
                                               
  
                                                 
                                                            

import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import { attachedTo } from '../state/attach'
import { isUnit } from '../state/cardTypes'
import type { StaticEffect } from './continuousView'

                                           
export interface AttachmentBonus {
  readonly sourceOid: string
  readonly hostOid: string
  readonly delta: number
}

   
                          
                                             
                                     
                                                   
                          
   
function hasMightValue(o: GameObject | undefined): boolean {
  return isUnit(o)
}

                                                
export function attachmentBonuses(state: GameState): readonly AttachmentBonus[] {
  const out: AttachmentBonus[] = []
  for (const o of Object.values(state.objects)) {
    const bonus = o.basePowerBonus
    if (bonus === undefined) continue                
    const host = attachedTo(o)
    if (host === undefined) continue                          
    if (!hasMightValue(state.objects[host])) continue                            
                                                 
                                          
                                       
    out.push({ sourceOid: o.oid, hostOid: host, delta: bonus })
  }
  return out
}

   
                                    
                                                    
                         
   
export function attachmentMightEffects(state: GameState): StaticEffect[] {
  return attachmentBonuses(state).map((b) => ({
    id: `attach:${b.sourceOid}`, // 一张武装同一时刻只贴一处(§434.1.f),故以来源为唯一键
    duration: 'permanent' as const,
    fromPassive: true,
    predicate: (x: GameObject) => x.oid === b.hostOid,
    modification: { kind: 'addMight' as const, delta: b.delta },
    timestamp: 0, // 与关键词/增益的隐含效果同批,先于显式效果
  }))
}
