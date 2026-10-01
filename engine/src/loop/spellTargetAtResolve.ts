                                                                        
  
                                                                      
                                                                  
                                                                   
                                             
  
                                                     
                                                    
                                                         
                                                  
  
                                                                    
                                                                               
  
                                                                
                                                         
                                                            
                                                         
                                                                          
                                                                                
                                                               
  
                                                  
                                                                          
                                                                
                                                       
                                        
                                                                                   
                                                                     
                                                                                     
                                                                            
                                                                     
                                                        
                                                                         
                                                                    
                                                              
                                                                                   
  
                                                       
                                                                           
                                                     
                                                                
                           
                                                            
  
                                                                
                                                                            
                                                                  
  
                                                                   
                                                                      
                                             
import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { ChainItem, ChoiceRequest } from './chain'
import type { GameEvent } from './events'
import { spellLegalTargets } from './playSpec'
import { decodeTargetOids } from './chainTargets'
import { filterTargetable } from '../keywords/untargetable'                                                      

   
                          
                                                            
                                                                             
   
export const ILLEGAL_TARGET = '__illegalTarget__'

                                                         
export interface TargetLegalitySpec {
  legalTargets?(state: GameState, controller: PlayerId, selfOid: string, bonus: boolean): readonly string[]
}

                                                                
export interface GateCtx {
  readonly controller: PlayerId
  readonly target?: string
  readonly bonus?: boolean
}

   
                                                         
                                                               
                                             
   
export type SelfOidOf<C> = (ctx: C) => string

type ResolveFn = (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => readonly GameEvent[]
type NextChoiceFn = (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null

   
                                         
                                                          
   
function maskOidInTarget(target: string, oid: string): string {
  if (target === oid) return ILLEGAL_TARGET
  const tier = target.indexOf(':::')                        
  if (tier > 0 && target.slice(0, tier) === oid) return ILLEGAL_TARGET + target.slice(tier)
  const ci = target.indexOf(':')                                      
  if (ci > 0 && target.slice(ci + 1) === oid) return target.slice(0, ci + 1) + ILLEGAL_TARGET
  return target                       
}

   
                                                                               
                                                                                    
                                                              
   
function maskMemberAt(target: string, index: number): string {
  const parts = target.split(':')
  const at = index + 1                                
  if (at < 1 || at >= parts.length) return target
  parts[at] = ILLEGAL_TARGET
  return parts.join(':')
}

   
                                      
                                                       
                                                       
                                                              
   
export function resolveTargetAtThisExecution(
  spec: TargetLegalitySpec,
  state: GameState,
  controller: PlayerId,
  selfOid: string,
  bonus: boolean,
  target: string | undefined,
): string | undefined {
  if (target === undefined) return undefined
  const oids = decodeTargetOids(target)
  if (oids.length === 0) {
                                                                         
                                                                  
                                                                 
                               
    if (!state.chain.some((it) => it.id === target)) return target
                                                                  
                                                                               
                                           
    const selfChainId = state.chain.find((it) =>
      (it.cardOid !== undefined && String(it.cardOid) === selfOid) || String(it.sourceOid) === selfOid)?.id ?? selfOid
    const legal = spellLegalTargets(spec, state, controller, selfChainId, bonus)
    return legal.includes(target) ? target : ILLEGAL_TARGET
  }
  const live = oids.map((oid) => state.objects[oid as ObjId] !== undefined)
  if (!live.some(Boolean)) return target                          
  const legal = spellLegalTargets(spec, state, controller, selfOid, bonus)
  if (legal.includes(target)) return target
  if (oids.length === 1) return maskOidInTarget(target, oids[0]!)                            
                                                         
                                                     
                                               
                                                              
                                                              
                                                        
                                                                      
  const stillLegal = (oid: string, i: number): boolean =>
    legal.some((s) => {
      const d = decodeTargetOids(s)
      return d[i] === oid || (d.length === 1 && d[0] === oid)
    })
  const individually = oids.map((oid, i) => stillLegal(oid, i))
  if (individually.every(Boolean)) {
                                                     
    let all = target
    for (let i = 0; i < oids.length; i++) all = maskMemberAt(all, i)
    return all
  }
                                             
  let partial = target
  for (let i = 0; i < oids.length; i++) {
    if (live[i] && !individually[i]) partial = maskMemberAt(partial, i)
  }
  return partial
}

   
                                
                                                        
   
export function referencesIllegalTarget(value: unknown): boolean {
  if (typeof value === 'string') return value.includes(ILLEGAL_TARGET)
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(referencesIllegalTarget)
  const rec = value as Record<string, unknown>
  for (const k of Object.keys(rec)) if (referencesIllegalTarget(rec[k])) return true
  return false
}

                                                                   
function maskChoice(self: ChainItem | undefined, masked: string): ChainItem | undefined {
  if (self === undefined || self.rechoice === undefined) return self
  return { ...self, rechoice: { ...self.rechoice, target: masked as ObjId } }
}

   
                                                                           
                           
  
                                                    
                                        
                                                         
                                                                      
                                                                     
                                    
  
                                                                      
                                                       
                                                           
                          
                                                                           
                                                                               
                                                      
                                                    
                                                      
                                                                          
                                                                
                                                               
                                                                            
                                           
                                                                               
                                                  
                                         
                                                                
                                                                                         
  
                                                     
                                    
   
function maskChosenAtResolve(
  state: GameState,
  controller: PlayerId,
  chosen: Readonly<Record<string, string>> | undefined,
  self: ChainItem | undefined,
): Readonly<Record<string, string>> | undefined {
  if (chosen === undefined) return undefined
                                                                   
  const targets = self?.targets
  if (targets === undefined || targets.length === 0) return chosen
  const targetSet = new Set(targets)
  let changed = false
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(chosen)) {
    const oids = decodeTargetOids(v)
                                                                  
    const isProjectTarget = oids.some((oid) => targetSet.has(oid))
    const live = oids.some((oid) => state.objects[oid as ObjId] !== undefined)
    if (isProjectTarget && live && filterTargetable(state.objects, controller as string, [v]).length === 0) {
      out[k] = ILLEGAL_TARGET
      changed = true
    } else {
      out[k] = v
    }
  }
  return changed ? out : chosen
}

   
                                                   
                                         
                                                                    
   
export function spellResolveGated<C extends GateCtx>(
  spec: TargetLegalitySpec & { makeResolve: (ctx: C) => ResolveFn },
  baseCtx: C,
  selfOidOf: SelfOidOf<C>,
): ResolveFn {
  return (state, chosen, self) => {
    const controller = (self?.controller ?? baseCtx.controller) as PlayerId
    const effective = (self?.rechoice?.target ?? baseCtx.target) as string | undefined
    const masked = resolveTargetAtThisExecution(
      spec, state, controller, selfOidOf(baseCtx), baseCtx.bonus === true, effective,
    )
                                                                       
                                                                    
    const gatedChosen = maskChosenAtResolve(state, controller, chosen, self)
                                                                   
                                                                                            
    const events = masked === effective
      ? spec.makeResolve(baseCtx)(state, gatedChosen, self)
      : spec.makeResolve({ ...baseCtx, target: masked } as C)(
        state, gatedChosen, masked === undefined ? self : maskChoice(self, masked),
      )
                                                
    return events.filter((ev) => !referencesIllegalTarget(ev))
  }
}

   
                                                          
                                                                         
  
                                                                         
                                                     
                                                                    
                                                         
                                                                       
                                                                       
                                   
                                                                       
   
export function spellNextChoiceGated<C extends GateCtx>(
  spec: TargetLegalitySpec & { makeNextChoice?: (ctx: C) => NextChoiceFn },
  baseCtx: C,
  selfOidOf: SelfOidOf<C>,
): NextChoiceFn {
  const make = spec.makeNextChoice!
  return (state, chosen) => {
    const masked = resolveTargetAtThisExecution(
      spec, state, baseCtx.controller, selfOidOf(baseCtx), baseCtx.bonus === true, baseCtx.target,
    )
    const req = masked === baseCtx.target
      ? make(baseCtx)(state, chosen)
      : make({ ...baseCtx, target: masked } as C)(state, chosen)
                                                                          
    return req !== null && referencesIllegalTarget(req) ? { ...req, maskedOut: true } : req
  }
}
