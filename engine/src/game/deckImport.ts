                                                            
  
                                                                  
                                                         
                                                                 
                                                      
                                                         
  
                          
                                                            
                                                                   
                                     
                                                                                 
                               
  
             
                                                     
                                                          
                                                                       
                                         
                                                          
                                
                                                            
                                      

import type { DecodeError } from './deckCode'

   
                                  
                                                    
                                                               
                                                           
                                           
                                                         
                                                     
                                                     
                                                          
   
const CARD_CODE = /^[A-Z]{2,5}-[A-Z0-9]{2,}$/
                          
const TRAILING_CODE = /^(.*?)\s*\[([^\]]+)\]$/

                                                      
const SECTIONS: Readonly<Record<string, string>> = {
  main: 'main', maindeck: 'main',
  sideboard: 'side',
  legend: 'legend',
  champion: 'champion',
  battlefields: 'battlefield', battlefield: 'battlefield',
  runes: 'rune', rune: 'rune',
}

export interface ForeignEntry {
                                                              
  readonly section: string
  readonly count: number
                    
  readonly defId: string
                                   
  readonly name: string
                         
  readonly line: number
                                          
  readonly resolvedKind?: string
}

export interface ForeignDeck {
  readonly name?: string
  readonly entries: readonly ForeignEntry[]
                               
  readonly warnings: readonly string[]
}

export type ImportResult =
  | { readonly ok: true; readonly deck: ForeignDeck }
  | { readonly ok: false; readonly errors: readonly DecodeError[] }

export interface ImportOptions {
                                                                                
  readonly kindOf?: (defId: string) => string | undefined
}

                                                        
function expectedKind(section: string): string | undefined {
  if (section === 'battlefield') return 'battlefield'
  if (section === 'rune') return 'rune'
  if (section === 'legend') return 'legend'
  return undefined                                   
}

   
                                                          
                                               
                                                                 
   
function parseEntryLine(raw: string): { count: number; defId: string; name: string } | null {
  const m = /^(\d+)\s+(.+)$/.exec(raw)
  if (!m) return null
  const count = Number(m[1])
  if (!Number.isInteger(count) || count <= 0) return null
  const rest = m[2]!.trim()

                       
  const b = TRAILING_CODE.exec(rest)
  if (b) {
    const code = b[2]!.trim()
    if (!CARD_CODE.test(code)) return null                        
    return { count, defId: code, name: b[1]!.trim() }
  }

                                             
  const a = /^(\S+)\s*(.*)$/.exec(rest)
  if (!a) return null
  const code = a[1]!
  if (!CARD_CODE.test(code)) return null
  return { count, defId: code, name: a[2]!.trim() }
}

   
            
                                                                
                                                        
   
export function importForeignDeck(text: string, opts: ImportOptions = {}): ImportResult {
  const errors: DecodeError[] = []
  const entries: ForeignEntry[] = []
  const warnings: string[] = []
  let name: string | undefined
  let section: string | undefined

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const t = raw.trim()
    const line = i + 1
    if (t === '') continue

                                                        
    const nm = /^Name\s*:\s*(.+)$/i.exec(t)
    if (nm) { name = nm[1]!.trim(); continue }

                  
    if (/:$/.test(t)) {
      const key = t.slice(0, -1).trim().toLowerCase().replace(/\s+/g, '')
      const sec = SECTIONS[key]
      if (!sec) {
        errors.push({ line, text: t, reason: `未知的段名「${t}」——段名定不了类,后面每一行都会归错,不猜` })
        continue
      }
      section = sec
      continue
    }

    const e = parseEntryLine(t)
    if (!e) {
      errors.push({ line, text: t, reason: '这行既不是「数量 卡号 名称」也不是「数量 名称 [卡号]」' })
      continue
    }
    if (section === undefined) {
      errors.push({ line, text: t, reason: '条目出现在任何段标题之前,无法判断它属于哪一段' })
      continue
    }

                                    
    const kind = opts.kindOf?.(e.defId)
    const want = expectedKind(section)
    const conflict = kind !== undefined && want !== undefined && kind !== want
    entries.push({
      section, count: e.count, defId: e.defId, name: e.name, line,
      ...(conflict ? { resolvedKind: kind } : {}),
    })
    if (conflict) {
      warnings.push(`第 ${line} 行:段名是「${section}」但卡表说 ${e.defId} 是「${kind}」——以卡表为准`)
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, deck: { ...(name !== undefined ? { name } : {}), entries, warnings } }
}
