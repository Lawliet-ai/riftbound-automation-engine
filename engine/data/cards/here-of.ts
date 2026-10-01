                                                            
  
                                             
                                      
                  
                                                    
                                                            
                                            
                                                    
                                              
  
                                              
import type { EffectCtx } from '../../src/dsl/effectSpec'

                                                 
export function hereOf(ctx: EffectCtx): string {
  const me = ctx.selfOid ? ctx.state.objects[ctx.selfOid] : undefined
  return (me?.zone as string | undefined) ?? `base:${ctx.controller}`
}
