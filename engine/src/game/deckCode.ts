                                       
  
                                               
                                                  
  
                                  
                                            
                                 
  
                                           
               
               
               
                  
                                       
              
                                                           
              
  
                                                
                                                    
                                
                                             
                                                         
                                                   
                                                                   
                                                          
                                                 
  
                                                   
                                      
                                                         
                                                            
                                                 

import type { DeckDraft } from './deckDraft'

const RUNE_PREFIX = 'rune:'

export interface DecodeError {
                             
  readonly line: number
  readonly text: string
  readonly reason: string
}

export type DecodeResult =
                                                        
                                                       
  | { readonly ok: true; readonly draft: DeckDraft; readonly name?: string }
  | { readonly ok: false; readonly errors: readonly DecodeError[] }

   
                                  
                                                                  
                                                         
                                           
   
export interface DecodeOptions {
                                                      
  readonly runeIdOf?: (defId: string) => string | undefined
                                                             
  readonly kindOf?: (defId: string) => string | undefined
}

                                                       
function countByDefId(ids: readonly string[]): readonly (readonly [string, number])[] {
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

                            
function runeLines(runes: readonly string[]): readonly string[] {
  const m = new Map<string, number>()
  for (const r of runes) {
    const color = r.startsWith(RUNE_PREFIX) ? r.slice(RUNE_PREFIX.length) : r
    m.set(color, (m.get(color) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([c, n]) => `符文 ${c} x${n}`)
}

   
                                          
                         
   
export function encodeDeck(draft: DeckDraft, name?: string, nameOf?: (defId: string) => string | undefined): string {
  const out: string[] = []
  if (name) out.push(`# ${name}`)
  if (draft.legend) out.push(`传奇 ${draft.legend}`)
  if (draft.hero) out.push(`英雄 ${draft.hero}`)
  for (const bf of draft.battlefields) out.push(`战场 ${bf}`)
  if (draft.runeDeck) out.push(...runeLines(draft.runeDeck))
  for (const [id, n] of countByDefId(draft.mainDeck)) {
    const cn = nameOf?.(id)
    out.push(cn ? `${n} ${id} ${cn}` : `${n} ${id}`)
  }
                                          
                       
                                                    
                                                  
  if (draft.side !== undefined) {
    out.push('备牌:')
    for (const [id, n] of countByDefId(draft.side)) {
      const cn = nameOf?.(id)
      out.push(cn ? `${n} ${id} ${cn}` : `${n} ${id}`)
    }
  }
  return out.join('\n')
}

                                                 
                                                    
const COUNT_LINE = /^(\d+)\s+(\S+)(?:\s+.*)?$/
const RUNE_LINE = /^符文\s+(\S+)\s*x(\d+)$/
                                  
const NAME_LINE = /^(?:Name|Deck|Title|名称|牌组)\s*[:：]\s*(.+)$/i
                                                             
const SECTION_LINE = /^(?:Main|Deck|Maindeck|Sideboard|Runes?|Battlefields?|Legend|Champion|Hero|主卡|主牌堆|备牌|备卡|符文|战场|传奇|英雄)\s*[:：]\s*$/i

   
          
                                                
                                                   
                                                    
                                                             
                             
   
export function decodeDeck(text: string, opts?: DecodeOptions): DecodeResult {
  const errors: DecodeError[] = []
  const side: string[] = []
                                                            
  let sawSideSection = false
  let inSideboard = false
  const mainDeck: string[] = []
  const battlefields: string[] = []
  const runeDeck: string[] = []
  let sawRuneLine = false
  let legend: string | undefined
  let hero: string | undefined
  let name: string | undefined

  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const line = raw.trim()
    if (line === '' || line.startsWith('//')) continue
    if (line.startsWith('#')) {
      if (name === undefined) name = line.slice(1).trim()
      continue
    }
                              
    const named = NAME_LINE.exec(line)
    if (named) {
      if (name === undefined) name = named[1]!.trim()
      continue
    }
                              
                                                            
    const section = SECTION_LINE.exec(line)
    if (section) {
      inSideboard = /^(?:Sideboard|备牌|备卡)/i.test(line)
      if (inSideboard) sawSideSection = true
      continue
    }
    const rune = RUNE_LINE.exec(line)
    if (rune) {
      sawRuneLine = true
      const n = Number(rune[2])
      for (let k = 0; k < n; k++) runeDeck.push(`${RUNE_PREFIX}${rune[1]}`)
      continue
    }
    const [head, ...rest] = line.split(/\s+/)
                                                         
                                            
    const value = rest[0]
                                                           
                                                         
                                          
    if (head === '传奇' || head === '英雄' || head === '战场') {
      if (value === undefined) { errors.push({ line: i + 1, text: raw, reason: `「${head}」这一行缺卡号` }); continue }
      if (head === '传奇') legend = value
      else if (head === '英雄') hero = value
      else battlefields.push(value)
      continue
    }
    const counted = COUNT_LINE.exec(line)
    if (counted) {
      const n = Number(counted[1])
      if (n <= 0) { errors.push({ line: i + 1, text: raw, reason: '张数必须是正整数' }); continue }
      const id = counted[2]!
                                                 
                                                      
                                                          
      if (inSideboard) { for (let k = 0; k < n; k++) side.push(id); continue }
                                            
      const runeId = opts?.runeIdOf?.(id)
      if (runeId !== undefined) {
        sawRuneLine = true
        for (let k = 0; k < n; k++) runeDeck.push(runeId)
        continue
      }
      const kind = opts?.kindOf?.(id)
      if (kind === 'legend') { legend = id; continue }
      if (kind === 'battlefield') { for (let k = 0; k < n; k++) battlefields.push(id); continue }
      for (let k = 0; k < n; k++) mainDeck.push(id)
      continue
    }
    errors.push({ line: i + 1, text: raw, reason: '认不得这一行(要么是「张数 卡号 [卡名]」,要么是 传奇/英雄/战场/符文 开头,或 Name:/Main: 这类段标题)' })
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    draft: {
      mainDeck,
      battlefields,
      ...(legend !== undefined ? { legend } : {}),
      ...(hero !== undefined ? { hero } : {}),
      ...(sawRuneLine ? { runeDeck } : {}),
                                              
                                                            
      ...(sawSideSection ? { side } : {}),
    },
    ...(name !== undefined ? { name } : {}),
  }
}
