                                                 
  
                                      
                                                                       
                                              
                                                      
                                                                        
                                      
                                                                              
                                                           
                                               
                                                                
  
                                                                      
                                                   

import type { ActivatedSpec } from './playSpec'
import { equipCostOptions, equipDefaultTargets } from '../keywords/equip'

   
                          
                                                         
   
export function equipActivationSpecs(keywords: readonly string[] | undefined): {
  readonly specs: readonly ActivatedSpec[]
  readonly unparsed: readonly string[]
} {
  const { parsed, unparsed } = equipCostOptions(keywords)
  const specs = parsed.map(({ keyword, cost }, i): ActivatedSpec => ({
                                                         
    key: `equip:${i}`,
    label: `[${keyword}] 贴附到你控制的一名单位`, // 关键词字面量本身就是印刷的费用记法

    cost,
    target: 'custom',
    legalTargets: (state, controller, selfOid) => [...equipDefaultTargets(state, controller, selfOid as never)],
                                                             
    makeResolve: ({ selfOid, controller, target }) => () =>
      target === undefined ? [] : [{ kind: 'attach', obj: selfOid as never, to: target as never, player: controller }],
  }))
  return { specs, unparsed }
}
