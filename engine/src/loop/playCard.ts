                                                        
                                                                            
                                                         
                                                    
                                                          

import { freshOid, type GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import { moveObjectInState } from '../state/mutations'
import type { Cost, PaymentPick } from '../state/runePool'
import { payFromState } from '../game/economy'
import { applyEvents, type ReduceDeps } from './reduce'
import type { GameEvent } from './events'
import type { ChainItem, ChainItemKind, ChoiceRequest } from './chain'
import { canPlayInTiming } from './timing'
import { decodeTargetOids } from './chainTargets'                     

const CHAIN_ZONE = 'chain:shared' as ZoneId

export interface PlayCardReq {
                                                               
  readonly purpose?: string
  readonly cardOid: ObjId
  readonly controller: PlayerId
  readonly cost: Cost
                                          
     
                                                                           
                                                                                    
                                                                    
                                                                                        
     
  readonly paidMana?: number
  readonly payWith?: PaymentPick
                                             
  readonly keywords: readonly string[]
  readonly kind: ChainItemKind                  
                                       
  readonly chosenTarget?: string
                                                               
  readonly makeResolve: (movedCardOid: ObjId) => (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => readonly GameEvent[]
                                    
  readonly makeNextChoice?: (movedCardOid: ObjId) => (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
     
                                                                     
                                                        
                                                                               
                                                                
                                                  
                                          
                                                                
     
  readonly choiceTiming?: 'confirm'
                                                         
  readonly makeConfirmChoice?: (movedCardOid: ObjId) => (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
                                               
  readonly makeConfirmSignals?: (movedCardOid: ObjId) => (state: GameState, chosen: Readonly<Record<string, string>>) => readonly GameEvent[]
  readonly mayChoose?: boolean
                                              
  readonly exileOnLeave?: boolean
                                                           
  readonly limitedAction?: boolean
                                            
  readonly recycleOnLeave?: boolean
                                             
  readonly isChainStarter?: boolean
                                                  
  readonly echoTimes?: number
                                                  
  readonly echoTargets?: readonly string[]
     
                                                               
                                                  
                                              
                                                       
                
     
  readonly deps?: ReduceDeps
                                                                                                                             
  readonly makeResolveFor?: (movedCardOid: ObjId, target: string | undefined, copy?: number) => (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => readonly GameEvent[]
}

export type PlayCardResult =
  | { readonly ok: true; readonly state: GameState; readonly item: ChainItem }
  | { readonly ok: false; readonly reason: string }

   
                                                            
                                                              
   
export function playCard(state: GameState, req: PlayCardReq): PlayCardResult {
                                    
                                                    
  if (req.limitedAction !== true && !canPlayInTiming(state, req.keywords, req.isChainStarter ?? false)) {
    return { ok: false, reason: '不符合当前打出时机(§309.1.a 闭环仅[反应])' }
  }
                                                                    
  const pay = payFromState(state, req.controller, req.cost, req.purpose, req.payWith)                              
  if (!pay.ok) return { ok: false, reason: '费用不足(§357)' }

                                         
  const { oid: movedOid } = freshOid(pay.state)
  const s = moveObjectInState(pay.state, req.cardOid, CHAIN_ZONE)

                                         
                                                                                       
                                                                   
                                                                
  const makeNextFn = req.makeNextChoice ? req.makeNextChoice(movedOid) : undefined
  const nextChoiceFn = req.choiceTiming === 'confirm' ? undefined : makeNextFn
  const confirmChoiceFn = req.makeConfirmChoice
    ? req.makeConfirmChoice(movedOid)
    : (req.choiceTiming === 'confirm' && makeNextFn !== undefined ? makeNextFn : undefined)

  const item: ChainItem = {
    id: `play:${movedOid}`,
    controller: req.controller,
    kind: req.kind,
    ...(req.exileOnLeave === true ? { exileOnLeave: true } : {}),
    ...(req.recycleOnLeave === true ? { recycleOnLeave: true } : {}),
    cardOid: movedOid,
    ...(req.paidMana !== undefined ? { paidMana: req.paidMana } : {}), // ★1735 带着实付法力走到结算
    status: 'pending',
    ...(req.chosenTarget !== undefined
      ? { chosenTarget: req.chosenTarget, targets: decodeTargetOids(req.chosenTarget) }                      
      : {}),
    resolve: (() => {
      const base = req.makeResolve(movedOid)
      const extra = req.echoTimes ?? 0
      if (extra <= 0) return base
                                                           
                                                               
                                   
                                                              
                                                                   
                                                             
                                                               
                                                  
      const simDeps = ((): ReduceDeps | undefined => {
        const d = req.deps
        if (d === undefined) return undefined
        const { onEvent: _oe, onWouldAskBurnoutOpponent: _ob, cleanupHooks, ...rest } = d
        if (cleanupHooks === undefined) return rest
        const { onWouldAsk: _oa, ...hooks } = cleanupHooks
        return { ...rest, cleanupHooks: hooks }
      })()
      return (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => {
        const out: GameEvent[] = []
        let sim = state
        for (let i = 0; i <= extra; i++) {
                                                   
          const t = i === 0 ? undefined : req.echoTargets?.[i - 1]
                                                                                            
                                                                           
                                                                             
          const fn = i > 0 && req.makeResolveFor ? req.makeResolveFor(movedOid, t, i) : base
          const batch = fn(sim, chosen, self)
          out.push(...batch)
                                                            
                                                  
          if (i < extra) sim = applyEvents(sim, batch, simDeps).state                                      
        }
        return out
      }
    })(),
    ...(req.makeResolveFor ? { retarget: (t: string | undefined) => req.makeResolveFor!(movedOid, t) } : {}), // ★1066 缺陷 52:夺控重选目标时重建结算
    ...(nextChoiceFn !== undefined ? { nextChoice: nextChoiceFn } : {}),
    ...(confirmChoiceFn !== undefined ? { confirmChoice: confirmChoiceFn } : {}), // ★1762 §355.14.b;★1800 choiceTiming='confirm' 接这个口
    ...(req.makeConfirmSignals ? { confirmSignals: req.makeConfirmSignals(movedOid) } : {}), // ★1764 §355.14.d
    ...(req.mayChoose ? { mayChoose: true } : {}),
  }
  return { ok: true, state: s, item }
}
