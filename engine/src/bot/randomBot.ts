                                                               
                                                                                

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import { asObjId } from '../state/ids'
import type { Action } from '../loop/actions'
import { legalActions } from '../loop/legalActions'

                                  
export function makeRng(seed: number): () => number {
  let x = seed >>> 0
  return () => ((x = (x * 1664525 + 1013904223) >>> 0), x / 0xffffffff)
}

                                     
export function randomAction(state: GameState, player: PlayerId, rng: () => number): Action {
  const pool: Action[] = [...legalActions(state, player)]
  const oids = Object.keys(state.objects)
  if (oids.length > 0) {
    const target = asObjId(oids[Math.floor(rng() * oids.length)]!)
    pool.push({ kind: 'DEV_DEAL_DAMAGE', player, target, amount: 1 + Math.floor(rng() * 4) })
  }
  pool.push({ kind: 'DEV_GAIN_POINT', player, amount: 1 })
  return pool[Math.floor(rng() * pool.length)]!
}
