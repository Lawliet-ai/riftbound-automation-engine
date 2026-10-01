                                                           
  
                                                             
                                                         
                                                                    
                               
                                                                                   
                            
                                                                          
                             
  
                                  
                                                         
                          
  
                                                         
                                                                         
                                                        
                                                      
                                                          

                                          
export function stripPyComments(src: string): string {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]!
                                   
    const tri = src.startsWith("'''", i) ? "'''" : src.startsWith('"""', i) ? '"""' : ''
    if (tri) {
      const end = src.indexOf(tri, i + 3)
      const stop = end === -1 ? n : end + 3
      out += src.slice(i, stop)
      i = stop
      continue
    }
                                                     
    if (c === "'" || c === '"') {
      out += c
      i++
      while (i < n) {
        const d = src[i]!
        if (d === '\\' && i + 1 < n) { out += src.slice(i, i + 2); i += 2; continue }
        out += d
        i++
        if (d === c || d === '\n') break
      }
      continue
    }
                                
    if (c === '#') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    out += c
    i++
  }
  return out
}
