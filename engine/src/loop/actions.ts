                                                   
                                                                
                                      

import type { PlayerId, ObjId } from '../state/ids'
import type { GameState } from '../state/gameState'
import type { GameEvent } from './events'

export interface PassAction {
  readonly kind: 'PASS'
  readonly player: PlayerId
}
                                     
export interface DevDealDamageAction {
  readonly kind: 'DEV_DEAL_DAMAGE'
  readonly player: PlayerId
  readonly target: ObjId
  readonly amount: number
}
                                       
export interface DevGainPointAction {
  readonly kind: 'DEV_GAIN_POINT'
  readonly player: PlayerId
  readonly amount: number
}

export type Action = PassAction | DevDealDamageAction | DevGainPointAction

                                        
export function actionToEvents(_state: GameState, action: Action): readonly GameEvent[] {
  switch (action.kind) {
    case 'PASS':
      return []
    case 'DEV_DEAL_DAMAGE':
      return [{ kind: 'damage', target: action.target, amount: action.amount }]
    case 'DEV_GAIN_POINT':
      return [{ kind: 'gainPoint', player: action.player, amount: action.amount }]
  }
}
