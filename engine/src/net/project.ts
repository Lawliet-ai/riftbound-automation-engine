                                                                       
                                                                             
                                       
                                                              

import type { CombatSummary, GameState, Phase } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import type { Zone } from '../state/zones'
import { manaAvailable, resourceCapacity } from '../game/economy'
import { controlMap } from '../state/battlefieldControl'
import { attachedTo } from '../state/attach'
import { isUnit } from '../state/cardTypes'

                                             
export interface ProjectedObject {
  readonly hidden: boolean
  readonly zone: string
  readonly oid?: string                              
  readonly defId?: string
  readonly owner?: PlayerId
  readonly controller?: PlayerId
  readonly might?: number
  readonly damage?: number
  readonly faceDown?: boolean
                         
  readonly stunned?: boolean
                                         
  readonly dormant?: boolean
                                                            
  readonly tapped?: boolean
                                                    
  readonly standbyFresh?: boolean
                                 
  readonly keywords?: readonly string[]
                                 
  readonly restrictions?: readonly string[]
     
                                                             
                             
                                                    
                                          
     
  readonly counters?: Readonly<Record<string, number>>
     
                               
                                                 
                                             
                                     
     
  readonly attachedTo?: string
}

export interface ProjectedZone {
  readonly id: string
  readonly kind: string
  readonly owner: PlayerId | null
                                                    
  readonly contents: readonly string[]
                                                
  readonly capacity?: number
}

export interface ClientView {
  readonly viewer: PlayerId
  readonly players: readonly PlayerId[]
  readonly phase: Phase
  readonly activePlayer: PlayerId
  readonly priority: PlayerId | null
  readonly focus: PlayerId | null
     
                                                
                                                            
                                                                   
                                             
     
  readonly spellDuelActive: boolean
     
                                        
                                                                                 
                                      
     
  readonly duelBattlefield?: string
  readonly scores: Readonly<Record<string, number>>
                               
  readonly winTarget: number
                            
  readonly turn: number
                                                  
  readonly scoredThisTurn: Readonly<Record<string, readonly string[]>>
  readonly winner: PlayerId | null
                                              
  readonly concededBy?: PlayerId
  readonly zones: Readonly<Record<string, ProjectedZone>>
  readonly objects: Readonly<Record<string, ProjectedObject>>
                                                             
  readonly mana: number
                                                            
  readonly runes: Readonly<Record<string, number>>
     
                                        
                                                    
                                                              
     
  readonly pool: { readonly mana: number; readonly energy: Readonly<Record<string, number>> }
  readonly activeRunes: number
                                         
  readonly battlefieldCards?: Readonly<Record<string, string>>
                        
  readonly lastCombat?: CombatSummary
     
                                                                      
                                          
     
  readonly chain?: readonly ProjectedChainItem[]
     
                                                    
                                                             
                                                     
                                                                           
                                                              
                                                      
                                                           
     
  readonly feprPasses?: number
     
                           
                                               
     
  readonly battlefieldControl?: Readonly<Record<string, PlayerId | null>>
}

export interface ProjectedChainItem {
  readonly id: string
  readonly controller: PlayerId
  readonly kind: string
                                                           
  readonly status: 'pending' | 'confirmed'
                                  
  readonly defId?: string
  readonly cardOid?: string
  readonly target?: string
}

   
                                       
                        
                                                
                                                    
                                                 
   
export function canSeeIdentity(obj: GameObject, zone: Zone, viewer: PlayerId, revealNow?: ReadonlySet<string>): boolean {
  const revealed = obj.revealedTo?.includes(viewer) ?? false
  if (revealed) return true
                                                             
  if (revealNow?.has(obj.oid)) return true
  if (zone.kind === 'hand') return zone.owner === viewer
  if (zone.kind === 'mainDeck' || zone.kind === 'runeDeck') return false           
  if (obj.status.faceDown) return obj.controller === viewer
  return true
}

function projectObject(obj: GameObject, zone: Zone, viewer: PlayerId, revealNow?: ReadonlySet<string>): ProjectedObject {
  if (!canSeeIdentity(obj, zone, viewer, revealNow)) {
                                                                 
                                  
                                                                    
                                             
                                                          
                                                    
                                                               
                                                         
                                                            
                                  
                                   
                                                  
                                                                     
                                                                
                                                                            
                                                                    
                                                            
                                                                       
                                                          
                                                           
                                                
    const fielded = zone.kind === 'battlefield' || zone.kind === 'base' || zone.kind === 'standby'
    return {
      hidden: true, zone: zone.id,
      faceDown: obj.status.faceDown === true ? true : undefined,
      ...(fielded ? {
        oid: obj.oid,
        controller: obj.controller,
        damage: obj.damage,
        stunned: obj.status.stunned === true ? true : undefined,
        dormant: obj.status.dormant === true ? true : undefined,
        tapped: obj.status.tapped === true ? true : undefined,
        standbyFresh: obj.status.standbyFresh === true ? true : undefined,
      } : {}),
    }
  }
  return {
    hidden: false,
    zone: zone.id,
    oid: obj.oid,
    defId: obj.derived?.copiedDefId ?? obj.defId, // §477.1.b 复制体公开显示为其复制的卡(名称/身份)
    owner: obj.owner,
    controller: obj.controller,
                                                         
                                                           
                                              
                                                                    
                                                          
    ...(isUnit(obj) ? { might: obj.derived ? obj.derived.might : obj.baseMight } : {}),
    damage: obj.damage,
    faceDown: obj.status.faceDown === true ? true : undefined,
    stunned: obj.status.stunned === true ? true : undefined,
    dormant: obj.status.dormant === true ? true : undefined,
    tapped: obj.status.tapped === true ? true : undefined,
    standbyFresh: obj.status.standbyFresh === true ? true : undefined,
                                                                         
                                                                   
                                                             
                                                            
                                                                     
                                                                
                                                                               
                                                                    
                                                                                        
                                                                  
                                        
    ...(isUnit(obj) ? { keywords: obj.derived ? obj.derived.keywords : obj.baseKeywords } : {}),
    restrictions: obj.derived ? obj.derived.restrictions : undefined,
                                                  
    counters: (() => {
      const nz = Object.entries(obj.counters ?? {}).filter(([, v]) => typeof v === 'number' && v !== 0)
      return nz.length ? Object.fromEntries(nz) : undefined
    })(),
    attachedTo: attachedTo(obj), // §434 贴附关系是公开信息;客户端靠它画叠放与"此刻装配于谁"
  }
}

   
                              
                                                        
   
function battlefieldControlOf(state: GameState): Record<string, PlayerId | null> {
  return controlMap(state)
}

   
                                              
  
                 
                                    
                                                                        
                                                            
                         
   
function visionOids(state: GameState, viewer: PlayerId): ReadonlySet<string> {
  const grant = state.visionThisTurn?.[viewer as string]
  if (grant === undefined) return new Set()
  const out = new Set<string>(grant.cards)
  if (grant.faceDownOf.length > 0) {
    for (const zone of Object.values(state.zones)) {
      if (zone.kind !== 'standby') continue
      for (const oid of zone.contents) {
        const obj = state.objects[oid]
        if (obj && grant.faceDownOf.includes(obj.controller as string)) out.add(oid as string)
      }
    }
  }
  return out
}

                                                    
   
                                                                
                                                 
   
export function project(state: GameState, viewer: PlayerId, revealNow?: ReadonlySet<string>): ClientView {
  const objects: Record<string, ProjectedObject> = {}
  const zones: Record<string, ProjectedZone> = {}
                                                         
                                                     
  const seeAlso = visionOids(state, viewer)
  const reveal = seeAlso.size === 0 ? revealNow : new Set([...(revealNow ?? []), ...seeAlso])

  for (const [zid, zone] of Object.entries(state.zones)) {
    const contents: string[] = []
    for (const oid of zone.contents) {
      const obj = state.objects[oid]
      if (!obj) {
        contents.push('hidden')
        continue
      }
      const proj = projectObject(obj, zone, viewer, reveal)
      if (proj.hidden) {
                                                                   
                                                                
                                                                               
                                                  
                                                             
                                                   
        if (proj.oid !== undefined) {
          contents.push(oid)
          objects[oid] = proj
        } else {
          contents.push('hidden')               
        }
      } else {
        contents.push(oid)
        objects[oid] = proj                    
      }
    }
    zones[zid] = { id: zone.id, kind: zone.kind, owner: zone.owner, contents, ...(zone.capacity !== undefined ? { capacity: zone.capacity } : {}) }
  }

  return {
    viewer,
    players: state.players,
    phase: state.phase,
    activePlayer: state.activePlayer,
    priority: state.priority,
    focus: state.focus,
    spellDuelActive: state.spellDuelActive, // ★1006 §343.1 公开态
    ...(state.duelBattlefield ? { duelBattlefield: state.duelBattlefield as string } : {}),
    scores: state.scores,
    winTarget: state.winTarget,
    turn: state.turn,
    scoredThisTurn: state.scoredBattlefieldsThisTurn,
    winner: state.winner,
    ...(state.concededBy ? { concededBy: state.concededBy } : {}),
    zones,
    objects,
    mana: manaAvailable(state, viewer), // 池纯法力 + 活跃符文数(活求,含回合中召出的符文)
    runes: resourceCapacity(state, viewer).runes,
    pool: { mana: state.runePools[viewer]?.mana ?? 0, energy: state.runePools[viewer]?.runes ?? {} },
    activeRunes: resourceCapacity(state, viewer).activeRunes,
    ...(state.lastCombat ? { lastCombat: state.lastCombat } : {}),
    battlefieldControl: battlefieldControlOf(state),
                                                      
    ...(state.chain.length
      ? {
          chain: state.chain.map((it) => ({
            id: it.id,
            controller: it.controller,
            kind: it.kind,
            status: it.status,
            ...(it.cardOid ? { cardOid: it.cardOid, defId: state.objects[it.cardOid]?.defId } : it.sourceDefId ? { defId: it.sourceDefId } : {}),
            ...(it.chosenTarget ? { target: it.chosenTarget } : {}),
          })),
          feprPasses: state.feprPasses,
        }
      : {}),
    ...(state.battlefieldCards ? { battlefieldCards: Object.fromEntries(Object.entries(state.battlefieldCards).map(([z, b]) => [z, b.defId])) } : {}),
  }
}
