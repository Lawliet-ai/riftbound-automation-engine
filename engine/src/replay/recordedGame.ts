                                             
  
                                      
                                                        
                                                
                                                        
                                        
                                                                  
  
                                                                         
                                                                                
                                                               
                                     
  
                                                                 
                                     

import type { GameState } from '../state/gameState'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../session/interactiveGame'

                                                            
export interface Recording {
                               
  readonly version: 1
     
                                    
                                            
                                      
     
  readonly seed: number
                                                         
  readonly initial: GameState
                                            
  readonly actions: readonly InteractiveAction[]
                                    
  readonly note?: string
     
                                               
    
                                                           
                                                       
                                                
                                                      
                                                     
     
  readonly checkpoints?: Readonly<Record<string, string>>
}

                                                         
export class ReplayMismatch extends Error {
  constructor(readonly step: number, readonly action: InteractiveAction, cause: string) {
    super(`录像第 ${step} 步(${action.kind})重放失败:${cause}`)
    this.name = 'ReplayMismatch'
  }
}

   
                                            
                                                
   
export class RecordedGame {
  private readonly g: InteractiveGame
  private readonly recorded: InteractiveAction[] = []

  private readonly marks: Record<string, string> = {}

  constructor(
    private readonly initial: GameState,
    private readonly makeDeps: () => InteractiveDeps,
    private readonly seed = 0,
                                      
    private readonly checkpointEvery = 10,
  ) {
    if (initial.chain.length !== 0) {
                                     
      throw new Error('录制的初始局面必须链空:链非空的态含闭包,无法序列化')
    }
    this.g = new InteractiveGame(initial, makeDeps())
  }

                                                                   
  get game(): InteractiveGame { return this.g }
                           
  get step(): number { return this.recorded.length }
  get actions(): readonly InteractiveAction[] { return this.recorded }

     
                                             
                                        
                                                     
                                                        
     
  apply(a: InteractiveAction): void {
    this.g.apply(a)
    this.recorded.push(a)
    if (this.recorded.length % this.checkpointEvery === 0) {
      this.marks[String(this.recorded.length)] = fingerprint(this.g)
    }
  }

                       
  toRecording(note?: string): Recording {
    return {
      version: 1,
      seed: this.seed,
      initial: this.initial,
      actions: [...this.recorded],
      ...(note !== undefined ? { note } : {}),
                              
      checkpoints: { ...this.marks, [String(this.recorded.length)]: fingerprint(this.g) },
    }
  }
}

   
                                                      
                                                
                                                      
   
export function replay(
  rec: Recording,
  makeDeps: () => InteractiveDeps,
  upTo?: number,
): InteractiveGame {
  const n = upTo === undefined ? rec.actions.length : Math.max(0, Math.min(upTo, rec.actions.length))
  const g = new InteractiveGame(rec.initial, makeDeps())
  for (let i = 0; i < n; i++) {
    const a = rec.actions[i]!
    try {
      g.apply(a)
    } catch (e) {
      throw new ReplayMismatch(i, a, e instanceof Error ? e.message : String(e))
    }
                                               
    const want = rec.checkpoints?.[String(i + 1)]
    if (want !== undefined) {
      const got = fingerprint(g)
      if (got !== want) throw new ReplayMismatch(i, a, `局面与校验点不符\n  期望 ${want.slice(0, 120)}\n  实得 ${got.slice(0, 120)}`)
    }
  }
  return g
}

   
                                  
                                                 
                                                         
   
export function fingerprint(g: InteractiveGame): string {
  const s = g.state
  const objs = Object.entries(s.objects)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, o]) => `${id}:${o.defId}@${String(o.zone)}/${o.damage}/${JSON.stringify(o.status)}`)
    .join('|')
  const p = g.pending()
                                                   
                                               
  const pend = `${p.mode}/${String((p as { player?: unknown }).player ?? '-')}`
                                                      
                                                  
                                             
  const pools = Object.keys(s.runePools).sort().map((k) => {
    const r = s.runePools[k]!
    const runes = Object.keys(r.runes).sort().map((c) => `${c}:${r.runes[c]}`).join(',')
    return `${k}=${r.mana}/${runes}`
  }).join(';')
  return `T${s.turn}|P${String(s.activePlayer)}|S${JSON.stringify(s.scores)}`
    + `|C${s.chain.length}|F${s.feprPasses}|R${String(s.priority ?? '-')}|W${pend}|M${pools}|${objs}`
}

   
                                                                       
                                              
   
function hasNonJsonValue(v: unknown, depth = 0): boolean {
  if (depth > 12) return true
  if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') return true
  if (v === null || typeof v !== 'object') return false
  if (Array.isArray(v)) return v.some((x) => hasNonJsonValue(x, depth + 1))
  if (v instanceof Map || v instanceof Set || v instanceof Date) return true
  return Object.values(v as Record<string, unknown>).some((x) => hasNonJsonValue(x, depth + 1))
}

   
                    
  
                                                                               
                                                      
                                                   
                                               
                                    
   
export function isSerializable(rec: Recording): boolean {
  try {
    if (hasNonJsonValue(rec)) return false
    return JSON.stringify(JSON.parse(JSON.stringify(rec))) === JSON.stringify(rec)
  } catch {
    return false
  }
}
