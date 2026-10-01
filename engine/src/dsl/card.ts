                                         
                                                                                                                  
                                                 
                                                            

import type { StaticEffect } from '../effects/continuousView'
import type { ReplacementShield } from '../effects/replacementRegistry'
import type { Trigger } from './trigger'
import type { Selector } from './selector'
import type { PlayerId } from '../state/ids'
import type { GameState } from '../state/gameState'
import type { GameEvent } from '../loop/events'

export type Category = 'unit' | 'spell' | 'equipment' | 'battlefield' | 'legend' | 'rune' | 'token'
                                                                                                                            
export type Domain = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'yellow' | 'colorless'

                                                
export interface PlayMode {
  readonly kind: 'standard' | 'hidden' | 'ambush' | 'flow'
  readonly costOverride?: number
}

export interface PassiveAbility {
  readonly kind: 'passive'
  readonly describe: string
}
export interface StaticAbility {
  readonly kind: 'static'
                                               
  readonly effect: Omit<StaticEffect, 'timestamp'>
}
export interface ReplacementAbility {
  readonly kind: 'replacement'
  readonly shield: ReplacementShield              
}
export interface TriggeredAbility {
  readonly kind: 'triggered'
  readonly trigger: Trigger                 
}
export interface ActivatedAbility {
  readonly kind: 'activated'
  readonly cost: { readonly energy?: number; readonly tap?: boolean }
  readonly targets?: readonly Selector[]
  readonly effect: (state: GameState, controller: PlayerId) => readonly GameEvent[]
}

export type Ability =
  | PassiveAbility
  | StaticAbility
  | ReplacementAbility
  | TriggeredAbility
  | ActivatedAbility

export interface Card {
  readonly id: string
  readonly cardNo: string
  readonly name: string
  readonly category: Category
  readonly domains: readonly Domain[]
  readonly energy?: number
  readonly power?: number
  readonly keywords: readonly string[]
  readonly playModes: readonly PlayMode[]
  readonly abilities: readonly Ability[]
}

                                                    
export interface CompiledCard {
  readonly staticEffects: readonly Omit<StaticEffect, 'timestamp'>[]
  readonly shields: readonly ReplacementShield[]
  readonly triggers: readonly Trigger[]
  readonly activated: readonly ActivatedAbility[]
  readonly passives: readonly PassiveAbility[]
}

export function compileCard(card: Card): CompiledCard {
  const staticEffects: Omit<StaticEffect, 'timestamp'>[] = []
  const shields: ReplacementShield[] = []
  const triggers: Trigger[] = []
  const activated: ActivatedAbility[] = []
  const passives: PassiveAbility[] = []
  for (const a of card.abilities) {
    switch (a.kind) {
      case 'static':
        staticEffects.push(a.effect)
        break
      case 'replacement':
        shields.push(a.shield)
        break
      case 'triggered':
        triggers.push(a.trigger)
        break
      case 'activated':
        activated.push(a)
        break
      case 'passive':
        passives.push(a)
        break
    }
  }
  return { staticEffects, shields, triggers, activated, passives }
}
