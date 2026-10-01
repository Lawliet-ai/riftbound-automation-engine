                                           
  
                                                                  
                                                                
                                                              
                                                                       
                                   
                                                    
                                                 
                                       
  
                                               
                                                                        
                                                            
                                                    
                                                                        
                                                                              
                                                        
                                
                                                            
                                                           
                                             
                                                           
                                                  

                                               
export const MAX_BLOCK_LINES = 60

   
                                           
  
                                                          
                                             
                            
                                                        
                                          
                                              
   
export const stripSourceComments = (src: string): string => {
                                                      
  const noLine = src
    .split('\n')
    .map((l) => (l.includes('//') ? l.slice(0, l.indexOf('//')) : l))
    .join('\n')
                                                 
  return noLine.replace(/\/\*[\s\S]*?\*\//g, (m) => {
    const lines = (m.match(/\n/g) ?? []).length
    if (lines > MAX_BLOCK_LINES) {
      throw new Error(
        `stripSourceComments: 块注释跨度 ${lines} 行 > ${MAX_BLOCK_LINES},几乎肯定是误匹配` +
          `(本仓中文注释常用 \`**粗体**\`,紧跟斜杠会凑出块注释开头)。开头:${JSON.stringify(m.slice(0, 80))}`,
      )
    }
    return '\n'.repeat(lines)
  })
}

   
                                         
  
                                                             
                                                                                      
                                                                        
                                                   
                                                
                                                
                                        
                                   
                                                             
                                                                       
                                                               
                                                         
                                               
                               
   
export const stripSourceCommentsKeepUrls = (src: string): string => {
                                                     
  const noLine = src
    .split('\n')
    .map((l) => {
      const m = /(^|[^:])\/\//.exec(l)
      return m === null ? l : l.slice(0, m.index + (m[1] === '' ? 0 : 1))
    })
    .join('\n')
                                            
  return noLine.replace(/\/\*[\s\S]*?\*\//g, (m) => {
    const lines = (m.match(/\n/g) ?? []).length
    if (lines > MAX_BLOCK_LINES) {
      throw new Error(
        `stripSourceCommentsKeepUrls: 块注释跨度 ${lines} 行 > ${MAX_BLOCK_LINES},几乎肯定是误匹配`,
      )
    }
    return '\n'.repeat(lines)
  })
}
