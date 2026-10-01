                                                      
                                                  
                                                 

import type { ObjId, PlayerId, ZoneId } from './ids'
import type { CardType } from './cardTypes'
import { zoneCategory, type ZoneKind } from './zones'

                                  
export interface ObjectStatus {
  readonly ready?: boolean      
  readonly dormant?: boolean      
  readonly stunned?: boolean            
  readonly faceDown?: boolean              
  readonly standbyFresh?: boolean                                               
  readonly nimbleOnPlay?: boolean                                                                                                       
  readonly attacking?: boolean       
  readonly defending?: boolean       
  readonly tapped?: boolean                            
  readonly empowered?: boolean       
  readonly attachedTo?: ObjId       
  readonly tempKeywords?: readonly string[]                   
                                                       
  readonly confirmedThisTurn?: true
}

                                                          
export interface DerivedState {
                                           
  readonly might: number
                
  readonly keywords: readonly string[]
                                                                    
  readonly restrictions: readonly string[]
                               
  readonly controller: PlayerId
     
                                                        
                                                                      
     
  readonly copiedDefId?: string
     
                                                           
                                                     
                                                
                                                   
     
  readonly empowerLimit?: number
                                                  
  readonly buffLimit?: number
     
                                                     
                                            
                                                                     
                                                                   
     
  readonly grantedActivated?: readonly string[]
     
                                                                  
                                                                  
                                              
     
  readonly tags?: readonly string[]
}

export interface GameObject {
  readonly oid: ObjId
                                        
  readonly defId: string
  readonly owner: PlayerId           
  readonly controller: PlayerId                           
  readonly zone: ZoneId
  readonly baseMight: number
                               
  readonly baseKeywords?: readonly string[]
     
                                                                 
                                              
     
  readonly baseTypes?: readonly CardType[]
     
                                                     
                                                             
     
  readonly baseTags?: readonly string[]
     
                                                       
                         
                                               
                                                             
                             
                                                                     
                                                 
     
  readonly basePowerBonus?: number
     
                                              
                                                      
                                                      
     
  readonly baseGrants?: readonly string[]
                                                 
  readonly damage: number
     
                                                         
                                                 
                                                              
     
  readonly damagedBy?: readonly string[]
                             
  readonly counters: Readonly<Record<string, number>>
  readonly status: ObjectStatus
                                                                   
  readonly derived?: DerivedState
                                                               
  readonly revealedTo?: readonly PlayerId[]
     
                                            
    
                                                              
                                                                
                                    
                                                                 
                                                        
                                                            
    
                                                         
                                                           
                                                   
                                                         
     
  readonly declared?: Readonly<Record<string, string>>
}

   
                      
                                         
                                    
   
                                     
  
                                                           
                                                        
                                                             
                                                                             
                                                                   
                                                              
                                                     
  
                                                       
                                                                           
                                                                                             
                                                       
                                                 
export function currentKeywords(o: { readonly derived?: { readonly keywords: readonly string[] }; readonly baseKeywords?: readonly string[] }): readonly string[] {
  return o.derived ? o.derived.keywords : (o.baseKeywords ?? [])
}

export function crossesNonFieldBoundary(from: ZoneKind, to: ZoneKind): boolean {
  return zoneCategory(from) === 'non-fielded' || zoneCategory(to) === 'non-fielded'
}

   
             
                                                             
                                              
                                       
   
export function moveObject(
  obj: GameObject,
  toZone: ZoneId,
  fromKind: ZoneKind,
  toKind: ZoneKind,
  freshOid: ObjId,
): GameObject {
                                                          
                                                          
                                                                       
                                                                                              
                                                                     
                                                           
    
                               
                                                                          
                                                                                         
                                                     
                                   
                                                                           
                                                              
                                                              
                                                      
                                              
                                                        
  if (obj.zone === toZone) return { ...obj }                                       
  if (!crossesNonFieldBoundary(fromKind, toKind)) {
    return { ...obj, zone: toZone }                    
  }
  return {
    oid: freshOid,
    defId: obj.defId,
    owner: obj.owner,
    controller: obj.owner, // §124.2 受控制被清 → 回归拥有者控制
    zone: toZone,
    baseMight: obj.baseMight,
    baseKeywords: obj.baseKeywords, // 印刷关键词=永久特质,非 §124.1 临时状态,跨界保留
                                                     
                                                 
    ...(obj.baseTypes ? { baseTypes: obj.baseTypes } : {}),
    ...(obj.baseTags ? { baseTags: obj.baseTags } : {}),
    ...(obj.basePowerBonus !== undefined ? { basePowerBonus: obj.basePowerBonus } : {}),
    ...(obj.baseGrants ? { baseGrants: obj.baseGrants } : {}),
    damage: 0, // §124.1 伤害清除
    counters: {}, // §124.1 计数标移除
    status: {}, // §124.1 临时状态全清
  }
}

