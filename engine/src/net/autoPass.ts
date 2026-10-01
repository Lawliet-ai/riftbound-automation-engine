                                       
  
                                             
                                                        
                                                
  
                         
                          
               
                               
                                  
  
                                             
                                                   
                                              
                                          
                                          
  
                                                 
                                                
                     
  
                                                  

import type { ClientView } from './project'

   
                                        
                                                                   
                                                   
   
export interface AutoPassInput {
  readonly view: ClientView
  readonly seat: string
  readonly pendingMode: string
  readonly pendingPlayer?: string | undefined
}

                                                              
export interface AutoPassVerdict {
  readonly auto: boolean
  readonly reason: string
}

   
                 
                                          
   
export function autoPassVerdict(i: AutoPassInput): AutoPassVerdict {
  if (i.pendingMode !== 'window') return { auto: false, reason: '不在优先权窗口' }
  if (String(i.pendingPlayer) !== String(i.seat)) return { auto: false, reason: '这一拍不轮到我' }

  const chain = i.view.chain ?? []
                                                       
  if (chain.length === 0) return { auto: false, reason: '战斗/对决反应窗口,必须由你决定' }

                                                     
  let newest: (typeof chain)[number] | undefined
  for (const it of chain) if (it.status === 'confirmed') newest = it
  if (!newest) return { auto: false, reason: '链上还没有已确认的项目' }
  if (String(newest.controller) !== String(i.seat)) return { auto: false, reason: '这条链是对手发起的,要不要回应由你决定' }

                                    
  if ((i.view.feprPasses ?? 0) < 1) return { auto: false, reason: '对手还没让过,先等他' }

  return { auto: true, reason: '我发起的链,对手已让过,自动让过进结算' }
}
