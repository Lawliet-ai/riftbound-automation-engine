                                                            
                                                            
  
                         
                                            
                                                          
                                    
                                                          
                                                
                              
                                              
  
                                                     
                               

                                         
export const MIGHT_BONUS: Readonly<Record<string, number>> = {
  "SFD-009": 0,
  "SFD-016": 0,
  "SFD-022": 2,
  "SFD-030": 2,
  "SFD-033": 1,
  "SFD-042": 1,
  "SFD-051": 1,
  "SFD-056": 3,
  "SFD-059": 0,
  "SFD-064": 0,
  "SFD-073": 1,
  "SFD-086": 2,
  "SFD-090": 2,
  "SFD-095": 2,
  "SFD-102": 1,
  "SFD-108": 1,
  "SFD-115": 2,
  "SFD-118": 2,
  "SFD-124": 1,
  "SFD-133": 2,
  "SFD-134": 1,
  "SFD-139": 2,
  "SFD-150": 2,
  "SFD-153": 0,
  "SFD-161": 3,
  "SFD-172": 1,
  "SFD-178": 4,
  "SFD-186": 3,
  "SFD-190": 3,
  "SFD-191": 3,
  "SFD-192": 2,
  "UNL-019": 4,
  "UNL-039": 1,
  "UNL-096": 2,
  "UNL-158": 2,
  "UNL-188": 3,
  "VEN-011": 1,
  "VEN-027": 1,
  "VEN-073": 2,
  "VEN-137": 0,
}

                                                  
export const IS_ARMAMENT: Readonly<Record<string, true>> = {
  "SFD-009": true,
  "SFD-016": true,
  "SFD-022": true,
  "SFD-030": true,
  "SFD-033": true,
  "SFD-042": true,
  "SFD-051": true,
  "SFD-056": true,
  "SFD-059": true,
  "SFD-064": true,
  "SFD-073": true,
  "SFD-086": true,
  "SFD-090": true,
  "SFD-095": true,
  "SFD-102": true,
  "SFD-108": true,
  "SFD-115": true,
  "SFD-118": true,
  "SFD-124": true,
  "SFD-133": true,
  "SFD-134": true,
  "SFD-139": true,
  "SFD-150": true,
  "SFD-153": true,
  "SFD-161": true,
  "SFD-172": true,
  "SFD-178": true,
  "SFD-186": true,
  "SFD-190": true,
  "SFD-191": true,
  "SFD-192": true,
  "UNL-019": true,
  "UNL-039": true,
  "UNL-096": true,
  "UNL-158": true,
  "UNL-188": true,
  "VEN-011": true,
  "VEN-027": true,
  "VEN-073": true,
  "VEN-137": true,
}

   
                                     
                                                        
                                        
                                                               
   
export function mightBonusOf(defId: string | undefined): number {
  if (!defId) return 0
  return MIGHT_BONUS[defId] ?? 0
}
