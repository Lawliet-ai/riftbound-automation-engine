                                                               
                                                            
                                                                                                                    
                                                                       

import { createInitialState, freshOid, type GameState } from '../state/gameState'
import { asObjId, asZoneId, type PlayerId, type ZoneId } from '../state/ids'
import { moveObject, type GameObject } from '../state/object'
import type { CardType } from '../state/cardTypes'
import { shuffle, type Rng } from '../util/rng'
import { recallRunes, refreshRunePool } from './economy'
import { variantSiblings } from '../../data/variantAlias'

                                                        
export interface CardSpec {
  readonly defId: string
  readonly baseMight: number
  readonly baseKeywords?: readonly string[]
                                                          
  readonly baseTypes?: readonly CardType[]
                                    
  readonly baseTags?: readonly string[]
                                                    
  readonly basePowerBonus?: number
                                               
  readonly baseGrants?: readonly string[]
     
                                    
                                                        
                                                     
                                                                         
                                                         
     
  readonly name?: string
}

                                      
export interface Deck {
  readonly name: string
  readonly mainDeck: readonly string[]                   
  readonly runeDeck: readonly string[]               
  readonly battlefields: readonly string[]                      
  readonly legend?: string
  readonly hero?: string                
}

                                                        
export type SpecLookup = (defId: string) => CardSpec

export const OPENING_HAND = 4             

export interface SetupResult {
  readonly state: GameState
                                    
  readonly chosenBattlefields: Readonly<Record<string, string>>
}

   
                                                  
                                                         
   
   
                                                
                                                 
                                                   
                                                 
   
export interface SetupOptions {
                                                
  readonly winTargetBonus?: (bfDefId: string) => number
}

   
                                                                          
                                  
                                                  
   
export function battlefieldCountFor(playerCount: number): number {
  return playerCount === 2 ? 2 : 3
}

   
                                                                    
                                                                             
  
                                                                                           
                                                                      
                                                     
                                                             
                                                        
                                   
   
export function setupGameMulti(decks: readonly Deck[], look: SpecLookup, rng: Rng, startingPlayer?: PlayerId, opts?: SetupOptions): SetupResult {
  const names = decks.map((_, i) => `P${i + 1}` as PlayerId)
  let s = createInitialState(names, battlefieldCountFor(decks.length))
  const [P1, P2] = s.players as [PlayerId, PlayerId]
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  let nextOid = s.nextOid
  const chosenBattlefields: Record<string, string> = {}

  const put = (defId: string, owner: PlayerId, zoneId: ZoneId): void => {
    const spec = look(defId)
    const oid = asObjId(`o${nextOid++}`)
    objects[oid] = {
      oid, defId, owner, controller: owner, zone: zoneId,
      baseMight: spec.baseMight, baseKeywords: spec.baseKeywords ?? [], damage: 0, counters: {}, status: {},
      ...(spec.baseTypes ? { baseTypes: spec.baseTypes } : {}),
      ...(spec.baseTags ? { baseTags: spec.baseTags } : {}),
      ...(spec.basePowerBonus !== undefined ? { basePowerBonus: spec.basePowerBonus } : {}),
      ...(spec.baseGrants ? { baseGrants: spec.baseGrants } : {}),
    }
    const z = zones[zoneId]!
    zones[zoneId] = { ...z, contents: [...z.contents, oid] }
  }

  const setupPlayer = (p: PlayerId, deck: Deck): void => {
    if (deck.legend) put(deck.legend, p, asZoneId(`legend:${p}`))                
                                                     
                                                 
                                              
    const main = [...deck.mainDeck]
    if (deck.hero) {
      put(deck.hero, p, asZoneId(`heroZone:${p}`))                  
      const i = main.indexOf(deck.hero)
      if (i >= 0) main.splice(i, 1)
      else {
                                                                        
                                                                    
                                                                
                                                  
                                                                   
                                               
                                                    
                                                              
        const heroName = look(deck.hero).name
        const j = heroName === undefined ? -1 : main.findIndex((id) => look(id).name === heroName)
        if (j >= 0) main.splice(j, 1)
      }
    }
    for (const defId of shuffle(main, rng)) put(defId, p, asZoneId(`mainDeck:${p}`))              
    for (const rune of shuffle(deck.runeDeck, rng)) put(rune, p, asZoneId(`runeDeck:${p}`))                            
                                 
    chosenBattlefields[p] = deck.battlefields.length > 0 ? deck.battlefields[rng.int(deck.battlefields.length)]! : ''
  }

  names.forEach((p, i) => setupPlayer(p, decks[i]!))                            
  s = { ...s, objects, zones, nextOid }

                         
  const start = startingPlayer ?? P1
                                                                 
                                                 
                                                                           
  const startIdx = Math.max(0, names.indexOf(start))
  const order = names.map((_, k) => names[(startIdx + k) % names.length]!)                
  const second = order[1] ?? start
  for (const p of order) s = drawN(s, p, OPENING_HAND)

                                                                         
                                           
  const bfCards: Record<string, { defId: string; owner: PlayerId }> = {}
                                                     
  const bfZoneIds = Array.from({ length: battlefieldCountFor(names.length) }, (_, i) => `battlefield:shared:${i}`)
  ;order.forEach((p, i) => {
    const defId = chosenBattlefields[p]
    const zid = bfZoneIds[i]!
    if (!defId || !s.zones[zid]) return
    bfCards[zid] = { defId, owner: p }
                                              
                                                 
                                                  
    if (variantSiblings('OGN-278').includes(defId)) {
      const sbId = `standby:shared:${i}` as ZoneId
      const sb = s.zones[sbId]
      if (sb) s = { ...s, zones: { ...s.zones, [sbId]: { ...sb, capacity: 2 } } }
    }
  })
  s = { ...s, battlefieldCards: bfCards }
                                                           
                                                                         
                                                 
  s = { ...s, battlefieldControl: Object.fromEntries(Object.keys(bfCards).map((z) => [z, null])) }
                                                 
                                                 
  const winBonus = Object.values(bfCards).reduce((n, b) => n + (opts?.winTargetBonus?.(b.defId) ?? 0), 0)
  if (winBonus !== 0) s = { ...s, winTarget: s.winTarget + winBonus }

                                                           
                                                            
                                                   
  s = recallRunes({ ...s, activePlayer: start, priority: null, phase: 'summon' }, start, 2)
  s = refreshRunePool({ ...s, phase: 'main' }, start)
                                    
                                                                                          
                                                           
                                                             
                                        
                                                           
                                                            
                                                                    
  const last = order[order.length - 1] ?? second
  s = { ...s,
    turnsTaken: Object.fromEntries(order.map((p, i) => [p, i === 0 ? 1 : 0])),
    extraRunesFirstSummon: { [last]: 1 }, mulliganQueue: order }
  return { state: s, chosenBattlefields }
}

   
                                                             
                                              
   
export function setupGame(deckA: Deck, deckB: Deck, look: SpecLookup, rng: Rng, startingPlayer?: PlayerId, opts?: SetupOptions): SetupResult {
  return setupGameMulti([deckA, deckB], look, rng, startingPlayer, opts)
}

   
                                                 
                                                             
                                                                   
                                                           
                                                                          
                                                     
                                             
   
export function drawN(state: GameState, p: PlayerId, n: number): GameState {
  let s = state
  for (let i = 0; i < n; i++) {
    const deck = s.zones[`mainDeck:${p}` as ZoneId]!
    const top = deck.contents[deck.contents.length - 1]
    if (!top) break       
    const { oid: newOid, nextOid } = freshOid(s)
    const o = s.objects[top]!
                                                                                   
                                                                      
                                                                         
                                                                          
                                                           
                                                                                
                                                              
                                                                                     
                                                                                       
                            
                                                                                 
                                                                                
                                                                       
                                                           
                                                               
    const moved: GameObject = moveObject(o, asZoneId(`hand:${p}`), 'mainDeck', 'hand', newOid)
    const newObjects = { ...s.objects }
    delete newObjects[top]
    newObjects[newOid] = moved
    const hand = s.zones[`hand:${p}` as ZoneId]!
    s = {
      ...s, nextOid, objects: newObjects,
      zones: {
        ...s.zones,
        [deck.id]: { ...deck, contents: deck.contents.slice(0, -1) },
        [hand.id]: { ...hand, contents: [...hand.contents, newOid] },
      },
    }
  }
  return s
}
