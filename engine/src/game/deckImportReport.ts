                                              
  
                             
                                                  
                                                
                                          
  
                                                                  
                                                                  
                                                                   
                                                                    
                                                          
                                            
                                                
                                                                                         
  
                                                                    
                                                                            
                                                           
                                                           

import { importForeignDeck, type ForeignEntry } from './deckImport'
import { decodeDeck } from './deckCode'
import { checkDeckLegality, type CardFacts, type DeckViolation, MIN_MAIN_DECK, RUNE_DECK_SIZE, BATTLEFIELDS_1V1, MAX_SIDE_DECK } from './deckLegality'
import type { DeckDraft } from './deckDraft'

                                                         
export interface QuotaLine {
  readonly key: 'main' | 'rune' | 'battlefield' | 'side'
  readonly label: string
  readonly have: number
  readonly need: number
  readonly ok: boolean
     
                            
                                                                
                                                               
                                                          
                                          
     
  readonly registered: boolean
                           
  readonly rule: string
}

                                                            
export interface ImportIssue {
  readonly kind:
    | 'parse'                         
    | 'unknown-card'               
    | 'section-conflict'                  
    | 'legality'                                    
    | 'empty'                                   
  readonly message: string
                              
  readonly line?: number
                          
  readonly text?: string
  readonly defId?: string
                                                
  readonly rule?: string
}

export interface ImportReport {
                                                  
  readonly ok: boolean
                                                       
  readonly draft: DeckDraft | null
  readonly name?: string
  readonly quota: readonly QuotaLine[]
  readonly blocking: readonly ImportIssue[]
  readonly warnings: readonly ImportIssue[]
                                        
  readonly violations: readonly DeckViolation[]
}

export interface ReportDeps {
                                                            
  readonly known: (defId: string) => boolean
                                      
  readonly kindOf: (defId: string) => string | undefined
                                                      
  readonly runeIdOf: (defId: string) => string | undefined
  readonly facts: (defId: string) => CardFacts | undefined
                            
  readonly battlefieldCount?: number
}

                                        
const QUOTA_RULES: ReadonlySet<string> = new Set(['§103.2', '§103.3.a', '§485.4.a', '§601.1.c'])      

   
                                   
  
                                                
                                                             
                                                              
                                                  
                      
   
function toDraft(entries: readonly ForeignEntry[], deps: ReportDeps): DeckDraft {
  const mainDeck: string[] = []
  const battlefields: string[] = []
  const runeDeck: string[] = []
  const side: string[] = []
  let legend: string | undefined
  let hero: string | undefined

  for (const e of entries) {
    const kind = deps.kindOf(e.defId)
    const push = (arr: string[], v: string): void => { for (let i = 0; i < e.count; i++) arr.push(v) }
    if (e.section === 'side') { push(side, e.defId); continue }
    if (kind === 'rune') {
      const rid = deps.runeIdOf(e.defId)
      push(runeDeck, rid ?? e.defId)                               
      continue
    }
    if (kind === 'battlefield') { push(battlefields, e.defId); continue }
    if (kind === 'legend') { legend = e.defId; continue }                            
    if (e.section === 'champion' && hero === undefined) { hero = e.defId }
    push(mainDeck, e.defId)
  }
                                                    
                                                        
                                            
                                                                 
                                           
                                                              
  const hasSideSection = entries.some((e) => e.section === 'side')
  const draft: DeckDraft = {
    mainDeck, battlefields,
    ...(legend !== undefined ? { legend } : {}),
    ...(hero !== undefined ? { hero } : {}),
    runeDeck,
    ...(hasSideSection ? { side } : {}),
  }
  return draft
}



   
                     
  
                                                               
                                                
                                    
                                 
                                               
                                               
                                               
   
function isEmptyDraft(d: DeckDraft): boolean {
  return d.mainDeck.length === 0 && d.battlefields.length === 0
    && (d.runeDeck?.length ?? 0) === 0 && (d.side?.length ?? 0) === 0
    && d.legend === undefined && d.hero === undefined
}

const EMPTY_ISSUE: ImportIssue = {
  kind: 'empty',
  message: '这段文本里一张牌都没有 —— 导入会把当前牌组清空,已拦下',
}

                             
function quotaOf(draft: DeckDraft, bfNeed: number): QuotaLine[] {
  const runeN = draft.runeDeck?.length ?? 0
  const sideN = draft.side?.length ?? 0
  return [
    { key: 'main', label: '主牌堆', have: draft.mainDeck.length, need: MIN_MAIN_DECK, ok: draft.mainDeck.length >= MIN_MAIN_DECK, registered: true, rule: '§103.2' },
    { key: 'rune', label: '符文', have: runeN, need: RUNE_DECK_SIZE, ok: runeN === RUNE_DECK_SIZE, registered: draft.runeDeck !== undefined, rule: '§103.3.a' },
    { key: 'battlefield', label: '战场', have: draft.battlefields.length, need: bfNeed, ok: draft.battlefields.length === bfNeed, registered: true, rule: '§485.4.a' },
                                                   
    { key: 'side', label: '备牌', have: sideN, need: MAX_SIDE_DECK, ok: sideN <= MAX_SIDE_DECK, registered: draft.side !== undefined, rule: '§601.1.c' }, // 赛规
  ]
}

                                          
function violationWarnings(violations: readonly DeckViolation[]): ImportIssue[] {
  const out: ImportIssue[] = []
  for (const v of violations) {
    if (QUOTA_RULES.has(v.rule)) continue
    out.push({
      kind: 'legality', rule: v.rule, message: `${v.rule} ${v.detail}`,
      ...(v.subject !== undefined ? { defId: v.subject } : {}),
    })
  }
  return out
}

const legalityOf = (draft: DeckDraft, deps: ReportDeps, bfNeed: number): readonly DeckViolation[] =>
  checkDeckLegality(
    {
      mainDeck: draft.mainDeck, battlefields: draft.battlefields,
      ...(draft.legend !== undefined ? { legend: draft.legend } : {}),
      ...(draft.hero !== undefined ? { hero: draft.hero } : {}),
      ...(draft.runeDeck !== undefined ? { runeDeck: draft.runeDeck } : {}),
      ...(draft.side !== undefined ? { side: draft.side } : {}),
    },
    deps.facts, { battlefieldCount: bfNeed },
  )

   
                                          
                                                 
                                                  
   
function nativeReport(text: string, deps: ReportDeps, bfNeed: number, lineText: (n: number) => string): ImportReport {
  const r = decodeDeck(text, { runeIdOf: deps.runeIdOf, kindOf: (id) => (deps.known(id) ? deps.kindOf(id) : undefined) })
  if (!r.ok) {
    return {
      ok: false, draft: null, quota: [], violations: [], warnings: [],
      blocking: r.errors.map((e) => ({ kind: 'parse' as const, message: e.reason, line: e.line, text: e.text })),
    }
  }
  const draft = r.draft
                                                        
  const suspects = [...new Set([...draft.mainDeck, ...draft.battlefields, ...(draft.side ?? []), ...(draft.legend !== undefined ? [draft.legend] : [])])]
  const blocking: ImportIssue[] = suspects.filter((id) => !deps.known(id)).map((id) => ({
    kind: 'unknown-card' as const, message: `卡表里没有这张卡:${id}`, defId: id,
  }))
  if (blocking.length > 0) {
    return { ok: false, draft: null, quota: [], violations: [], blocking, warnings: [], ...(r.name !== undefined ? { name: r.name } : {}) }
  }
  if (isEmptyDraft(draft)) {
    return { ok: false, draft: null, quota: [], violations: [], blocking: [EMPTY_ISSUE], warnings: [], ...(r.name !== undefined ? { name: r.name } : {}) }
  }
  const violations = legalityOf(draft, deps, bfNeed)
  return {
    ok: true, draft, quota: quotaOf(draft, bfNeed), blocking: [],
    warnings: violationWarnings(violations), violations,
    ...(r.name !== undefined ? { name: r.name } : {}),
  }
}

   
                       
  
                                                        
                                                
                                                     
                                                    
  
                    
                                                         
                                                                
                                             
                                              
                      
                                                   
                                                                       
                                                      
   
const NATIVE_HEAD = /^(传奇|英雄|战场|符文)\s+\S/
const TRAILING_BRACKET_CODE = /\[[A-Za-z]{3}-[A-Za-z0-9]+\]$/

export function detectDeckFormat(text: string): 'native' | 'foreign' {
  let sawThreePart = false
  for (const raw of text.split('\n')) {
    const l = raw.trim()
    if (l === '') continue
                                      
    if (l.startsWith('#') || NATIVE_HEAD.test(l)) return 'native'
                           
    if (TRAILING_BRACKET_CODE.test(l)) return 'foreign'
                                            
                                               
    const m = /^(\d+)\s+(\S+)\s+(\S.*)$/.exec(l)
    if (m) sawThreePart = true
  }
  return sawThreePart ? 'foreign' : 'native'
}

export function buildImportReport(text: string, deps: ReportDeps): ImportReport {
  const lines = text.split('\n')
  const lineText = (n: number): string => lines[n - 1]?.trim() ?? ''
  const bfNeed = deps.battlefieldCount ?? BATTLEFIELDS_1V1

  if (detectDeckFormat(text) === 'native') return nativeReport(text, deps, bfNeed, lineText)

             
                                                             
                          
  const strictKindOf = (id: string): string | undefined => (deps.known(id) ? deps.kindOf(id) : undefined)
  const parsed = importForeignDeck(text, { kindOf: strictKindOf })

  if (!parsed.ok) {
    return {
      ok: false, draft: null, quota: [], violations: [],
      blocking: parsed.errors.map((e) => ({
        kind: 'parse' as const, message: e.reason, line: e.line, text: e.text,
      })),
      warnings: [],
    }
  }

  const entries = parsed.deck.entries

                        
                                                  
  const blocking: ImportIssue[] = entries
    .filter((e) => !deps.known(e.defId))
    .map((e) => ({
      kind: 'unknown-card' as const,
      message: `卡表里没有这张卡:${e.defId}${e.name ? `(${e.name})` : ''}`,
      line: e.line, text: lineText(e.line), defId: e.defId,
    }))

                         
  const warnings: ImportIssue[] = []
  for (const e of entries) {
    if (e.resolvedKind === undefined) continue
    warnings.push({
      kind: 'section-conflict',
      message: `第 ${e.line} 行写在「${e.section}」段里,但按卡号查它是「${e.resolvedKind}」—— 已按卡号归位`,
      line: e.line, text: lineText(e.line), defId: e.defId,
    })
  }
  for (const w of parsed.deck.warnings) warnings.push({ kind: 'section-conflict', message: w })

  if (blocking.length > 0) {
    return { ok: false, draft: null, quota: [], violations: [], blocking, warnings, ...(parsed.deck.name !== undefined ? { name: parsed.deck.name } : {}) }
  }

                   
  const draft = toDraft(entries, deps)
  if (isEmptyDraft(draft)) {
    return { ok: false, draft: null, quota: [], violations: [], blocking: [EMPTY_ISSUE], warnings, ...(parsed.deck.name !== undefined ? { name: parsed.deck.name } : {}) }
  }
  const violations = legalityOf(draft, deps, bfNeed)

  warnings.push(...violationWarnings(violations))

  return {
    ok: true, draft, quota: quotaOf(draft, bfNeed), blocking: [], warnings, violations,
    ...(parsed.deck.name !== undefined ? { name: parsed.deck.name } : {}),
  }
}
