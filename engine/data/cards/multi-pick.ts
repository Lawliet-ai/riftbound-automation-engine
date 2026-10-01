                            
  
                                                                       
                                                                                  
                                                              
                                                    
  
                                                   
                                                                    
                               
                                                                               
                                                    
                                                                
                                           
  
                                     

                                                   
export const MAX_PICK_VARIANTS = 20

const SEP = '|'

                                        
export function encodePick(ids: readonly string[]): string {
  return ids.join(SEP)
}

                                              
export function decodePick(choice: string | undefined, count: number): string[] | null {
  if (choice === undefined || choice === '') return null
  const parts = choice.split(SEP)
  if (parts.length !== count) return null
  if (new Set(parts).size !== parts.length) return null          
  return parts
}

                                             
function choose(n: number, k: number): number {
  if (k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

                                              
export function combinations(pool: readonly string[], k: number): string[][] {
  const out: string[][] = []
  const cur: string[] = []
  const walk = (start: number): void => {
    if (cur.length === k) { out.push([...cur]); return }
    for (let i = start; i <= pool.length - (k - cur.length); i++) {
      cur.push(pool[i]!)
      walk(i + 1)
      cur.pop()
    }
  }
                                                                                
                                                              
                                          
                                                                   
  if (k > 0) walk(0)
  return out
}

   
                                           
                                            
   
export function boundedPickOptions(
  pool: readonly string[],
  k: number,
  describe: (ids: readonly string[]) => string,
): { readonly id: string; readonly label: string }[] {
                                                             
                                             
                                                                     
  if (choose(pool.length, k) <= MAX_PICK_VARIANTS) {
    return combinations(pool, k).map((c) => ({ id: encodePick(c), label: describe(c) }))
  }
  const canonical = pool.slice(0, k)
  return [{ id: encodePick(canonical), label: `${describe(canonical)}(候选过多,仅列此一种;可自行提交其他挑法)` }]
}
