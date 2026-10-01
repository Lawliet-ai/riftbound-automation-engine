                                                        
                                                                     
                                                           
                                              
                                                               
                                             

import type { GameState } from '../state/gameState'
import type { PlayerId, ZoneId } from '../state/ids'
import { recycleObjects } from '../keywords/insight'
import { applyEvents, type ReduceDeps } from '../loop/reduce'

                           
export const BURNOUT_CAP = 1000

function firstOpponent(state: GameState, player: PlayerId): PlayerId | null {
  return state.players.find((p) => p !== player) ?? null
}

   
                                                       
                                                      
                                                     
                                        
                                                           
   
export const BURNOUT_OPPONENT_KEY = '§431.2.c:burnoutOpponent'

                                                             
export interface BurnoutOpponentAsk {
  readonly key: string
                                  
  readonly player: PlayerId
                                        
  readonly candidates: readonly PlayerId[]
}

                                                    
export function parseBurnoutOpponents(raw: string | undefined): readonly string[] {
  return raw === undefined || raw === '' ? [] : raw.split(',').filter((x) => x !== '')
}

   
                                                               
                                                      
                                                                   
   
function pickBurnoutOpponent(state: GameState, player: PlayerId, deps: ReduceDeps): { readonly opp: PlayerId | null; readonly state: GameState } {
  const opponents = state.players.filter((p) => p !== player)
  if (opponents.length < 2) return { opp: firstOpponent(state, player), state }
  const queue = parseBurnoutOpponents(state.ruleChoices[BURNOUT_OPPONENT_KEY])
  const head = queue[0]
  const hit = head === undefined ? undefined : opponents.find((p) => String(p) === head)
  if (hit !== undefined) {
                                     
    const rest = queue.slice(1)
    const ruleChoices = { ...state.ruleChoices }
    if (rest.length === 0) delete ruleChoices[BURNOUT_OPPONENT_KEY]
    else ruleChoices[BURNOUT_OPPONENT_KEY] = rest.join(',')
    return { opp: hit, state: { ...state, ruleChoices } }
  }
  deps.onWouldAskBurnoutOpponent?.({ key: BURNOUT_OPPONENT_KEY, player, candidates: opponents })
  return { opp: firstOpponent(state, player), state }                             
}

function mainEmpty(state: GameState, player: PlayerId): boolean {
  return (state.zones[`mainDeck:${player}`]?.contents ?? []).length === 0
}

   
                                                          
                                               
                                         
                                       
                                                                                         
                                                             
                                                      
                                            
                                                          
                                                        
                                                     
                                                                     
                                                            
                                                                    
                                                           
                                                                        
   
function recycleDiscardToMain(state: GameState, player: PlayerId): GameState {
  const disc = state.zones[`discard:${player}` as ZoneId]
  if (!disc || disc.contents.length === 0) return state
                                                 
                                                           
  return recycleObjects(state, disc.contents)
}

function isHighest(state: GameState, player: PlayerId): boolean {
  const score = state.scores[player] ?? 0
  return state.players.every((p) => p === player || (state.scores[p] ?? 0) < score)
}

   
                                                   
                                                                 
   
export function burnOut(state: GameState, burningPlayer: PlayerId, deps: ReduceDeps = {}): GameState {
  let s = state
  let first = true
  for (let i = 0; i < BURNOUT_CAP; i++) {
    s = recycleDiscardToMain(s, burningPlayer)            
                                                                        
    const picked = pickBurnoutOpponent(s, burningPlayer, deps)
    s = picked.state
    const opp = picked.opp
    if (!opp) break
                                                    
                                                                 
                                                                    
                                                                   
                                                                   
                                                                                  
    const { state: after, events: landedScore } = applyEvents(s, [{ kind: 'gainPoint', player: opp, amount: 1, exempt: !first }], deps)
    s = after
    for (const e of landedScore) {
      if (e.kind !== 'gainPoint') continue
      s = { ...s, pendingScoreSignals: [...(s.pendingScoreSignals ?? []), { player: e.player, amount: e.amount ?? 1 }] }
    }
    if (!first && (s.scores[opp] ?? 0) >= s.winTarget && isHighest(s, opp)) {
      return { ...s, winner: opp }                         
    }
    first = false
    if (!mainEmpty(s, burningPlayer)) break                        
  }
  return s
}
