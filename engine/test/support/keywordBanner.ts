                                  
  
                                                                        
                                                               
                                                                  
                                                      
                             
  
                                                       
                                                                       
                                                         
                                                     
                                                        
  
                            
                                                            
                                                                      
                                                    
                                                                    
  
                
                                                                       
                                                                       
                                                               
                                                              
                      

const COLORS = ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '无色'] as const

   
                                              
                                 
                                                  
                                                              
                                                  
   
export function keywordRoot(kw: string): string {
  let s = kw.replace(/[>＞]/gu, '')
  for (;;) {
    const before = s
    for (const c of COLORS) if (s.endsWith(c)) s = s.slice(0, -c.length)
    s = s.replace(/[0-9AS]+$/u, '')
    if (s === before) return s
  }
}

   
                                                  
                                                                 
   
export function bannerTokens(effect: string): string[] {
  const out: string[] = []
  for (const line of effect.split('\n')) {
    let s = line.trim()
    while (s.startsWith('{{')) {
      const m = /^\{\{([^}]*)\}\}/.exec(s)
      if (m === null) break
      out.push(m[1]!)
      s = s.slice(m[0].length).trimStart()
      const note = /^（[^）]*）/.exec(s)
      if (note !== null) s = s.slice(note[0].length).trimStart()
    }
  }
  return out
}

   
                                                   
             
   
export function missingRoots(
  banner: readonly string[], registered: readonly string[], known: ReadonlySet<string>,
): string[] {
  const have = new Set(registered.map(keywordRoot))
  const out = new Set<string>()
  for (const t of banner) {
    if (t.includes('>')) continue                                     
    const r = keywordRoot(t)
    if (r.length === 0) continue                                 
    if (!known.has(r)) continue                               
    if (!have.has(r)) out.add(r)
  }
  return [...out].sort()
}
