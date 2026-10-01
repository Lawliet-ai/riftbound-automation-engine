                                                                      
                                                          

import { createInitialState, zonesByKind, type GameState } from '../state/gameState'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId, type ZoneId } from '../state/ids'
import type { GameObject } from '../state/object'
import { moveObjectInState } from '../state/mutations'
import { project, type ClientView } from '../net/project'
import { runCombatAndScore } from '../scoring/holdConquer'
import { attemptHold, resetTurnLedgers } from '../scoring/score'
import { advanceTurnQueue } from '../state/turnQueue'
import { runAwakenPhase, runExpirationStep } from '../loop/turnStructure'
import { expireThisTurnEffects } from '../effects/continuousView'
import { promptFor } from '../loop/prompt'
import { drawCard } from '../goldfish/singleSeat'
import { controlledBattlefields } from '../state/battlefieldControl'

export type SessionAction =
  | { readonly kind: 'PLAY_UNIT'; readonly player: PlayerId; readonly oid: string; readonly to: string }
  | { readonly kind: 'MOVE_UNIT'; readonly player: PlayerId; readonly oid: string; readonly to: string }
  | { readonly kind: 'ATTACK'; readonly player: PlayerId; readonly battlefield: string }
  | { readonly kind: 'END_TURN'; readonly player: PlayerId }

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function mkUnit(oid: string, owner: PlayerId, zone: ZoneId, might: number, keywords: string[]): GameObject {
  return { oid: asObjId(oid), defId: `BLK`, owner, controller: owner, zone, baseMight: might, baseKeywords: keywords, damage: 0, counters: {}, status: {} }
}

                                                                
export function blankMirrorGame(): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  const add = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const KW = ['据守', '迅捷', '壁垒', '后排', '']
  let n = 0
  for (const p of [P1, P2]) {
                        
    add(mkUnit(`u${n++}`, p, asZoneId('battlefield:shared:0'), 3, [KW[n % 5]!].filter(Boolean)))
               
    for (let i = 0; i < 3; i++) add(mkUnit(`u${n++}`, p, asZoneId(`hand:${p}`), 1 + (i % 3), [KW[(n + i) % 5]!].filter(Boolean)))
              
    for (let i = 0; i < 3; i++) add(mkUnit(`u${n++}`, p, asZoneId(`mainDeck:${p}`), 2, []))
  }
  return { ...s, objects, zones, priority: P1 }
}

export class GameSession {
  state: GameState
  constructor(initial?: GameState) {
    this.state = initial ?? blankMirrorGame()
  }

                                         
  view(viewer: PlayerId = this.state.activePlayer): ClientView {
    return project(this.state, viewer)
  }

  prompt(player: PlayerId): 'PROMPT' | 'WAITING' {
    return promptFor(this.state, player)
  }

                                              
  legalActions(player: PlayerId): SessionAction[] {
    if (this.state.winner) return []
    if (player !== this.state.activePlayer) return []                      
    const acts: SessionAction[] = []
    const bfs = zonesByKind(this.state, 'battlefield').map((b) => b.id)
                  
    const hand = this.state.zones[`hand:${player}` as ZoneId]?.contents ?? []
    for (const oid of hand) for (const bf of bfs) acts.push({ kind: 'PLAY_UNIT', player, oid, to: bf })
                       
    for (const bf of bfs) {
      const z = this.state.zones[bf as ZoneId]!
      for (const oid of z.contents) {
        const o = this.state.objects[oid]
        if (o && o.controller === player) for (const to of bfs) if (to !== bf) acts.push({ kind: 'MOVE_UNIT', player, oid, to })
      }
    }
                          
    for (const bf of bfs) {
      const z = this.state.zones[bf as ZoneId]!
      const units = z.contents.map((o) => this.state.objects[o]).filter(Boolean) as GameObject[]
      if (units.some((u) => u.controller === player) && units.some((u) => u.controller !== player)) {
        acts.push({ kind: 'ATTACK', player, battlefield: bf })
      }
    }
    acts.push({ kind: 'END_TURN', player })
    return acts
  }

  apply(action: SessionAction): void {
    if (this.state.winner) return
    switch (action.kind) {
      case 'PLAY_UNIT':
      case 'MOVE_UNIT':
                                                                  
                                                              
                                           
                                                                
                                                                       
                                                                                     
                                                                  
                                                          
                                                                                         
                                                               
                                                                                               
                                                                             
                                                                           
                                                                   
        this.state = moveObjectInState(this.state, action.oid as ObjId, action.to as ZoneId)
        break
      case 'ATTACK': {
        this.state = runCombatAndScore(this.state, action.battlefield, action.player).state
        break
      }
      case 'END_TURN':
        this.endTurn(action.player)
        break
    }
  }

                                             
  private endTurn(player: PlayerId): void {
    let s = this.state
                                                     
    for (const bf of controlledBattlefields(s, player)) s = attemptHold(s, player, bf).state
    s = drawCard(s, player)            
    s = { ...s, phase: 'ending' }
    s = runExpirationStep(s, expireThisTurnEffects)
                
                                                           
    const handed = advanceTurnQueue(s, player)
    const next = handed.next
    s = resetTurnLedgers({ ...handed.state, activePlayer: next, priority: next, phase: 'awaken', turn: s.turn + 1 })
    s = { ...runAwakenPhase(s), phase: 'main' }                
    this.state = s
  }
}
