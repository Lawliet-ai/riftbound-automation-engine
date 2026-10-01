                                               
  
                                         
                                                    
                                                          
                                                 
                                                        
  
                                  
                                                            
                                                        
                                               
  
                                                    
                                                             
                                                                                        
                                                                               
                                                           
                                           
                                                           
                                                  
  
                                                          
                                               

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../session/interactiveGame'
import { recomputeContinuous } from '../effects/continuousView'
import { effectiveMight } from '../state/might'
import { isUnit } from '../state/cardTypes'
import { controlMap } from '../state/battlefieldControl'

                                              
export interface BoardWeights {
  readonly score: number
  readonly might: number
  readonly hand: number
  readonly battlefield: number
     
                                               
    
                                  
                                                         
                                                        
                                                           
                                                     
                                                     
                                          
     
  readonly contact: number
}
export const DEFAULT_WEIGHTS: BoardWeights = {
  score: 10, // §469 得分直接通向胜利
  might: 1, // 场上有效战力差 —— 打赢战斗的本钱
  hand: 0.5, // 手牌是选择权
  battlefield: 2, // §190 控制战场 = 下回合据守的前提
  contact: 0, // 纯贪心不主动找架打
}

                                             
export const FUZZ_WEIGHTS: BoardWeights = { ...DEFAULT_WEIGHTS, contact: 3 }

   
                        
                                                                
   
export function boardValue(state: GameState, seat: PlayerId, w: BoardWeights = DEFAULT_WEIGHTS): number {
  const rc = recomputeContinuous(state)
  const foe = state.players.find((p) => p !== seat)
  let mine = 0
  let theirs = 0
  for (const o of Object.values(rc.objects)) {
    if (!isUnit(o) || !String(o.zone).startsWith('battlefield')) continue
    const m = effectiveMight(o).reference
    if (o.controller === seat) mine += m
    else theirs += m
  }
  const ctrl = controlMap(state)
  let bfMine = 0
  let bfTheirs = 0
  for (const holder of Object.values(ctrl)) {
    if (holder === seat) bfMine += 1
    else if (holder !== null && holder !== undefined) bfTheirs += 1
  }
                                                    
  let contact = 0
  if (w.contact !== 0) {
    const byZone = new Map<string, { mine: number; theirs: number }>()
    for (const o of Object.values(rc.objects)) {
      if (!isUnit(o) || !String(o.zone).startsWith('battlefield')) continue
      const z = String(o.zone)
      const e = byZone.get(z) ?? { mine: 0, theirs: 0 }
      if (o.controller === seat) e.mine += 1
      else e.theirs += 1
      byZone.set(z, e)
    }
    for (const e of byZone.values()) contact += Math.min(e.mine, e.theirs)
  }
  const myScore = state.scores[seat as string] ?? 0
  const foeScore = foe ? (state.scores[foe as string] ?? 0) : 0
  const myHand = state.zones[`hand:${seat}` as never]?.contents.length ?? 0
  const foeHand = foe ? (state.zones[`hand:${foe}` as never]?.contents.length ?? 0) : 0
  return (myScore - foeScore) * w.score
    + (mine - theirs) * w.might
    + (myHand - foeHand) * w.hand
    + (bfMine - bfTheirs) * w.battlefield
    + contact * w.contact
}

                                                      
export interface DryRunFault {
  readonly action: InteractiveAction
  readonly error: string
}

export interface GreedyResult {
  readonly action: InteractiveAction | null
                           
  readonly scored: readonly { readonly action: InteractiveAction; readonly value: number }[]
                                                        
  readonly faults: readonly DryRunFault[]
}

   
                                        
  
                                                        
                                                   
                                                
                                     
                                               
   
function settle(g: InteractiveGame, turnOwner: PlayerId, cap = 60): boolean {
  for (let i = 0; i < cap; i++) {
    if (g.state.activePlayer !== turnOwner) return true              
    const p = g.pending()
    if (p.mode === 'action' || p.mode === 'gameover') return true
    if (p.mode === 'choice') {
      const c = p.request.candidates[0]
      if (!c) return false
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: c.id } as InteractiveAction)
      continue
    }
    if (p.mode === 'window') {
      g.apply({ kind: 'PASS', player: (p as { player: PlayerId }).player } as InteractiveAction)
      continue
    }
    return false                       
  }
  return false
}

   
                                                        
                                                                       
   
export function greedyAction(
  g: InteractiveGame,
  seat: PlayerId,
  makeDeps: () => InteractiveDeps,
  opts: { readonly weights?: BoardWeights; readonly nodeBudget?: number } = {},
): GreedyResult {
  const p = g.pending()
  if (p.mode !== 'action' || p.player !== seat) return { action: null, scored: [], faults: [] }
  const legal = g.legalActions(seat)
  if (legal.length === 0) return { action: null, scored: [], faults: [] }

  const w = opts.weights ?? DEFAULT_WEIGHTS
  const budget = opts.nodeBudget ?? 40
  const base = g.state
  const scored: { action: InteractiveAction; value: number }[] = []
  const faults: DryRunFault[] = []

  for (const a of legal.slice(0, budget)) {
    try {
                                                                       
      const probe = new InteractiveGame(base, makeDeps())
      probe.apply(a)
      settle(probe, base.activePlayer)
      scored.push({ action: a, value: boardValue(probe.state, seat, w) })
    } catch (e) {
                                                               
      faults.push({ action: a, error: String(e).slice(0, 200) })
    }
  }
  if (scored.length === 0) return { action: legal[0] ?? null, scored: [], faults }

  let best = scored[0]!
  for (const s of scored) if (s.value > best.value) best = s
  return { action: best.action, scored, faults }
}
