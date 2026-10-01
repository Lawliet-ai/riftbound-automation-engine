                                                                     
  
                                      
                                                                            
                                                                 
                                         
                                   
                                   
                                                               
                                                        
                                                             
                                                             
                                                               
                                                       
                                                       
  
                                                                  

import type { ActivatedSpec } from './playSpec'
import type { Cost } from '../state/runePool'
import { parseCostSuffix } from '../keywords/costSuffix'
import type { ObjId } from '../state/ids'
import { empowerCount, empowerLimitOf } from '../keywords/empower'

export const EMPOWER_KEYWORD = '强化'

                                               
export function parseEmpowerCost(kw: string): Cost | null {
  if (!kw.startsWith(EMPOWER_KEYWORD)) return null
  const suffix = kw.slice(EMPOWER_KEYWORD.length)
  if (suffix.length === 0) return null                                    
  return parseCostSuffix(suffix)
}

   
                                         
                                                     
                                   
   
export function empowerActivationSpecs(keywords: readonly string[] | undefined): {
  readonly specs: readonly ActivatedSpec[]
  readonly unparsed: readonly string[]
} {
  const specs: ActivatedSpec[] = []
  const unparsed: string[] = []
  let i = 0
  for (const k of keywords ?? []) {
    if (!k.startsWith(EMPOWER_KEYWORD)) continue
                                                    
    if (k.startsWith('已强化')) continue
    const cost = parseEmpowerCost(k)
    if (!cost) { unparsed.push(k); continue }
    specs.push({
      key: `empower:${i++}`,
      label: `[${k}] 强化我`,
      cost,
      target: 'none', // §827.1.b.1 源物件【不是】目标
                                                               
                                            
        
                                      
                                                             
                                                      
                                                         
                                              
                                                                     
                                                        
      available: (state, _controller, selfOid) => {
        const o = state.objects[selfOid as ObjId]
        if (o === undefined) return false
        if (empowerLimitOf(o) > 1) return true                    
        return empowerCount(o) < empowerLimitOf(o)
      },
      makeResolve: ({ selfOid }) => () => [{ kind: 'empower', target: selfOid as ObjId }], // §827.2 走事件
    })
  }
  return { specs, unparsed }
}
