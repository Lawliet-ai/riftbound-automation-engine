                      
  
                                                                 
                                                       
                           
                                                 
                                                          
  
                             
                                                                 
                                                         

import type { Cost } from '../state/runePool'

                               
export const DOMAIN_BY_CN: Readonly<Record<string, string>> = {
  红色: 'red', 绿色: 'green', 蓝色: 'blue', 橙色: 'orange', 紫色: 'purple', 黄色: 'yellow',
}

   
                                                     
               
   
export function parseCostSuffix(suffix: string): Cost | null {
  let rest = suffix
  const m = /^(\d+)/.exec(rest)
  const mana = m ? Number(m[1]) : 0
  if (m) rest = rest.slice(m[1]!.length)
  const pips: string[][] = []
  while (rest.length > 0) {
    if (rest.startsWith('A')) { pips.push([]); rest = rest.slice(1); continue }            
    const cn = Object.keys(DOMAIN_BY_CN).find((k) => rest.startsWith(k))
    if (cn) { pips.push([DOMAIN_BY_CN[cn]!]); rest = rest.slice(cn.length); continue }
    return null
  }
  return pips.length > 0 ? { mana, pips } : { mana }
}
