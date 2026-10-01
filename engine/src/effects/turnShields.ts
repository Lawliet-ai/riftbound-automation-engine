                                     
  
                                                                          
                                                                 
                                                                      
                                                        
                                         
                                                         
  
                                                           
                                         
                                                              
                                                                     
import type { GameState } from '../state/gameState'
import type { GameEvent } from '../loop/events'
import type { ObjId, PlayerId } from '../state/ids'
import type { ReplacementShield } from './replacementRegistry'

   
                      
                                                         
                                   
   
export interface TurnShieldMarks {
                                                         
  readonly doubleDamage?: true
     
                                                  
                                              
                                                 
     
  readonly absorb?: number
     
                                                  
                                                                          
                                                                 
                                                                             
                                                    
                                                             
     
  readonly voidNextDamage?: true
     
                                                              
                                 
                                                                          
                                                                                       
                                                       
     
     
                                                       
                                                                               
                                                          
                                             
                                              
     
  readonly exileOnDestroy?: true
  readonly recallOnNextDestroy?: {
    readonly payer: PlayerId
                                                          
    readonly free?: true
  }
}

                            
export function turnShieldsOf(state: GameState, oid: ObjId): TurnShieldMarks {
  return state.turnShields?.[oid as string] ?? {}
}

                                                            
export function markTurnShieldInState(state: GameState, oid: ObjId, mark: TurnShieldMarks): GameState {
  if (state.objects[oid] === undefined) return state                               
  const prev = state.turnShields?.[oid as string] ?? {}
  const merged: TurnShieldMarks = { ...prev, ...mark }
                                                          
                                                     
  if (mark.absorb !== undefined && prev.absorb !== undefined) {
    ;(merged as { absorb?: number }).absorb = prev.absorb + mark.absorb
  }
  return { ...state, turnShields: { ...state.turnShields, [oid as string]: merged } }
}

   
                                          
                                                        
                                               
   
export function consumeAbsorbInState(state: GameState, oid: ObjId, used: number): GameState {
  const prev = state.turnShields?.[oid as string]
  if (prev?.absorb === undefined || used <= 0) return state
  const rest: TurnShieldMarks = { ...prev }
  const left = prev.absorb - used
  if (left > 0) (rest as { absorb?: number }).absorb = left
  else delete (rest as { absorb?: number }).absorb
  const next = { ...state.turnShields }
  if (Object.keys(rest).length === 0) delete next[oid as string]
  else next[oid as string] = rest
  return { ...state, turnShields: next }
}

   
                                                    
                                                            
   
export function clearTurnShieldInState(state: GameState, oid: ObjId, key: keyof TurnShieldMarks): GameState {
  const prev = state.turnShields?.[oid as string]
  if (prev === undefined || prev[key] === undefined) return state
  const rest: TurnShieldMarks = { ...prev }
  delete (rest as Record<string, unknown>)[key]
  const next = { ...state.turnShields }
  if (Object.keys(rest).length === 0) delete next[oid as string]
  else next[oid as string] = rest
  return { ...state, turnShields: next }
}

   
                                                                  
                                                                 
                                     
   
export function turnShieldEffects(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const [oid, marks] of Object.entries(state.turnShields ?? {})) {
    const o = state.objects[oid as ObjId]
    if (!o) continue                          
    if (marks.doubleDamage) {
      out.push({
        id: `turnShield:double:${oid}`,
        source: null, // 效果来自已结算完的法术,源可能早不在了 ⇒ 规则性来源
        controller: null,
        intercepts: 'damage',
        predicate: (ev: GameEvent) => ev.kind === 'damage' && (ev.target as string) === oid && ev.amount > 0,
        rewrite: (ev: GameEvent) => (ev.kind === 'damage' ? { ...ev, amount: ev.amount * 2 } : ev),
      })
    }
    const pool = marks.absorb ?? 0
    if (pool > 0) {
                                                            
                                                      
                              
                                                                
                                                               
                                                         
                                                             
                    
                                                                           
                                                                        
                                                                              
                                               
      const live = (st: GameState): number => st.turnShields?.[oid]?.absorb ?? 0
      out.push({
        id: `turnShield:absorb:${oid}`,
        source: null,
        controller: null,
        intercepts: 'damage',
                                                             
                                                
        predicate: (ev: GameEvent, st: GameState) =>
          ev.kind === 'damage' && (ev.target as string) === oid && ev.amount > 0 && live(st) > 0,
                                               
                                                          
                                                         
                                                            
        rewrite: (ev: GameEvent, st: GameState) => {
          if (ev.kind !== 'damage') return ev
          const left = Math.max(0, ev.amount - live(st))                          
          return left === 0 ? null : { ...ev, amount: left }
        },
                                                   
                                                               
        onApplied: (st: GameState, ev: GameEvent) =>
          ev.kind === 'damage' ? consumeAbsorbInState(st, oid as ObjId, Math.min(live(st), ev.amount)) : st,
      })
    }
    if (marks.voidNextDamage) {
      out.push({
        id: `turnShield:voidNext:${oid}`,
        source: null, // 同上:效果来自已结算完的法术,规则性来源
        controller: null,
        intercepts: 'damage',
                                                                 
                                                                         
                                                                
                                                         
                                                
                                                       
                                      
                                                         
                                                        
        predicate: (ev: GameEvent, st: GameState) =>
          ev.kind === 'damage' && (ev.target as string) === oid && ev.amount > 0
          && st.turnShields?.[oid]?.voidNextDamage === true,
                                                 
        rewrite: () => null,
                                              
        onApplied: (st: GameState) => clearTurnShieldInState(st, oid as ObjId, 'voidNextDamage'),
      })
    }
  }
  return out
}
