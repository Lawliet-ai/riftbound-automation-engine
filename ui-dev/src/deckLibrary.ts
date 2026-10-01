                                                   
  
                                                    
                                                     
                                   
                                                                                      
  
                                                               
                                                      
                                                         
                                                         
                                              
  
                                            

import { decodeDeck } from '../../engine/src/game/deckCode'
import { runeIdOf, kindOf } from '../../engine/data/registry'

                                           
const DECODE_OPTS = { runeIdOf, kindOf }

export interface DeckRow {
  readonly id: string
  readonly name: string
                                           
  readonly updatedAt: number
                                     
  readonly text: string
}

export const DECK_LIB_KEY = 'riftbound.decks.v2'

   
                                
                                 
                                                     
   
const LEGACY_KEYS: readonly (readonly [string, string])[] = [
  ['riftbound.deck.v1', '旧牌组'],
  ['riftbound.deck.v1.A', 'A 组'],
  ['riftbound.deck.v1.B', 'B 组'],
]

                                                                             
export function nameOfText(text: string, fallback: string): string {
  const r = decodeDeck(text, DECODE_OPTS)
  return r.ok && r.name ? r.name : fallback
}

   
          
                                          
                                 
   
export function loadDeckLib(): Record<string, DeckRow> {
  try {
    const raw = localStorage.getItem(DECK_LIB_KEY)
    if (raw === null) return {}
    const obj = JSON.parse(raw) as unknown
    if (typeof obj !== 'object' || obj === null) return {}
    const out: Record<string, DeckRow> = {}
    for (const [id, v] of Object.entries(obj as Record<string, unknown>)) {
      const r = v as Partial<DeckRow>
      if (typeof r.text !== 'string') continue               
      out[id] = {
        id, text: r.text,
        name: typeof r.name === 'string' && r.name !== '' ? r.name : '未命名牌组',
        updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
      }
    }
    return out
  } catch { return {} }
}

function writeDeckLib(lib: Record<string, DeckRow>): void {
  try { localStorage.setItem(DECK_LIB_KEY, JSON.stringify(lib)) } catch { /* 隐私模式/配额满:存不下就算了,别让界面崩 */ }
}

                                    
export function deckRows(): readonly DeckRow[] {
  return Object.values(loadDeckLib()).sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name, 'zh'))
}

export function getDeck(id: string): DeckRow | undefined {
  return loadDeckLib()[id]
}

                                                  
export function newDeckId(): string {
  const lib = loadDeckLib()
  let t = Date.now()
  while (lib[`d${t}`]) t++
  return `d${t}`
}

                                                    
export function putDeck(id: string, text: string, fallbackName: string): DeckRow {
  const lib = loadDeckLib()
  const row: DeckRow = { id, text, name: nameOfText(text, fallbackName), updatedAt: Date.now() }
  lib[id] = row
  writeDeckLib(lib)
  return row
}

export function deleteDeck(id: string): void {
  const lib = loadDeckLib()
  if (!(id in lib)) return
  delete lib[id]
  writeDeckLib(lib)
}

   
                            
                                                   
                                   
   
export function migrateLegacyDecks(): void {
  if (localStorage.getItem(DECK_LIB_KEY) !== null) return
  const lib: Record<string, DeckRow> = {}
  let t = Date.now()
  for (const [key, fallback] of LEGACY_KEYS) {
    const text = localStorage.getItem(key)
    if (text === null || text.trim() === '') continue
    const id = `d${t++}`                          
    lib[id] = { id, text, name: nameOfText(text, fallback), updatedAt: t }
  }
  writeDeckLib(lib)
}
