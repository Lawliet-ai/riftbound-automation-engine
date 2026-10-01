                                                                                
                                    
                                                     
                                                     

import { freshOid, type GameState } from '../state/gameState'
import { isFieldedExceptStandby } from '../state/zones'
import { recycleObjects } from '../keywords/insight'
import { asObjId, asZoneId, type ObjId, type PlayerId, type ZoneId } from '../state/ids'
import { moveObject, type GameObject } from '../state/object'
import { solvePayment, validatePayment, type Capacity, type Cost, type PaymentPick, type PaymentPlan, type RunePool } from '../state/runePool'
import { canActivateNow } from '../loop/activationTiming'
import { isExhausted } from '../state/exhaust'
import { zoneCategory } from '../state/zones'
import { withShangeCopies } from '../effects/shange'
import type { ActivatedSpec } from '../loop/playSpec'
import type { GameEvent } from '../loop/events'

const RUNE_PREFIX = 'rune:'

function isRune(o: GameObject | undefined): boolean {
  return !!o && o.defId.startsWith(RUNE_PREFIX)
}

                                                              
export function recallRunes(state: GameState, player: PlayerId, n = 2): GameState {
  let s = state
  const baseId = asZoneId(`base:${player}`)
  for (let i = 0; i < n; i++) {
    const deck = s.zones[`runeDeck:${player}` as ZoneId]
    const base = s.zones[baseId]
    if (!deck || !base) break
    const top = deck.contents[deck.contents.length - 1]
    if (!top) break         
    const { oid: newOid, nextOid } = freshOid(s)
    const o = s.objects[top]!
                                                    
                                                                                  
                                                                          
                                                                                      
                                              
                                                                              
                                                                                          
                                      
    const moved: GameObject = moveObject(o, baseId, 'runeDeck', 'base', asObjId(newOid))
    const objects = { ...s.objects }
    delete objects[top]
    objects[newOid] = moved
    s = {
      ...s, nextOid, objects,
      zones: {
        ...s.zones,
        [deck.id]: { ...deck, contents: deck.contents.slice(0, -1) },
        [baseId]: { ...base, contents: [...base.contents, newOid] },
      },
    }
  }
  return s
}

                                                         
function runesByDomain(state: GameState, player: PlayerId): Record<string, ObjId[]> {
  const base = state.zones[`base:${player}` as ZoneId]
  const out: Record<string, ObjId[]> = {}
  if (!base) return out
  for (const oid of base.contents) {
    const o = state.objects[oid]
    if (!isRune(o) || o!.controller !== player) continue
    const domain = o!.defId.slice(RUNE_PREFIX.length)
    ;(out[domain] ??= []).push(oid as ObjId)
  }
  return out
}

   
                                         
                                         
   
export function controlledRuneCount(state: GameState, player: PlayerId): number {
  const base = state.zones[`base:${player}` as ZoneId]
  if (!base) return 0
  return base.contents.filter((oid) => { const o = state.objects[oid]; return isRune(o) && o!.controller === player }).length
}

                         
export function activeRuneCount(state: GameState, player: PlayerId): number {
  const base = state.zones[`base:${player}` as ZoneId]
  if (!base) return 0
  return base.contents.filter((oid) => { const o = state.objects[oid]; return isRune(o) && o!.controller === player && o!.status.tapped !== true }).length
}

   
                                                       
                                                 
   
export function resourceCapacity(state: GameState, player: PlayerId, purpose?: string): Capacity {
  const pool = state.runePools[player]
  const runes: Record<string, number> = {}
  for (const [d, l] of Object.entries(runesByDomain(state, player))) runes[d] = l.length
                                         
  const duel = state.spellDuelActive ? (pool?.duelMana ?? 0) : 0
                                                        
                                                 
  let rMana = 0
  const energy: Record<string, number> = { ...(pool?.runes ?? {}) }
  if (purpose !== undefined) {
    for (const g of pool?.restricted ?? []) {
      if (!g.purposes.includes(purpose)) continue
      rMana += g.mana
      for (const [d, n] of Object.entries(g.energy)) energy[d] = (energy[d] ?? 0) + n
    }
  }
  return { mana: (pool?.mana ?? 0) + duel + rMana, energy, runes, activeRunes: activeRuneCount(state, player) }
}

                                                  
export function manaAvailable(state: GameState, player: PlayerId): number {
  const pool = state.runePools[player]
  const duel = state.spellDuelActive ? (pool?.duelMana ?? 0) : 0               
  return (pool?.mana ?? 0) + duel + activeRuneCount(state, player)
}

                                             
   
                                              
                                                     
                                  
  
                                 
                                                                                           
                                                                         
                                                                                  
                                                                 
  
                                                                                 
                                                                                    
                                                                                                
  
                                                  
                                                         
                                 
                                                                      
                                                           
                                                                                                
                                                                                           
  
                                         
                                                                                                                       
                                                             
                                                                     
                                                                      
                                                                       
                                                                         
                                                                   
                                                                           
                          
   
let reactionGainProvider: ((defId: string) => readonly ActivatedSpec[]) | null = null

   
                                          
                                                                               
                                                                                               
                                                                                                   
                                      
                                                      
                                                       
                                                                                          
                                                                        
   
export function setReactionGainProvider(fn: (defId: string) => readonly ActivatedSpec[]): void {
  reactionGainProvider = fn
}

                            
export function hasReactionGainProvider(): boolean {
  return reactionGainProvider !== null
}

   
                                                      
  
                                                             
                                                                        
                                
                                
                                                                             
                                                                         
                                                               
                                             
                                                             
                                                                                      
                                                                  
                                                   
   
let grantedSpecProvider: ((key: string) => ActivatedSpec | undefined) | null = null

export function setGrantedSpecProvider(fn: (key: string) => ActivatedSpec | undefined): void {
  grantedSpecProvider = fn
}

                                  
export function hasGrantedSpecProvider(): boolean {
  return grantedSpecProvider !== null
}

export function couldPayWithReactionGains(
  state: GameState,
  player: PlayerId,
  cost: Cost,
  activatedFor?: (defId: string) => readonly ActivatedSpec[],
  purpose?: string,
                                                                   
  grantedSpecFn?: (key: string) => ActivatedSpec | undefined,
): boolean {
  if (canPayFromState(state, player, cost, purpose)) return true
  const specsOf = activatedFor ?? reactionGainProvider
  if (specsOf === null || specsOf === undefined) return false                                  
  const cap = resourceCapacity(state, player, purpose)
  let gainMana = 0
  const gainEnergy: Record<string, number> = {}
  for (const o of Object.values(state.objects)) {
    if (o.controller !== player) continue
    const z = state.zones[o.zone]
                                                               
                                                            
                                                                                                  
                                                                  
                                                          
                                                            
                                                  
                                                                             
                                                                  
                                                                
                                                          
    if (!z || !isFieldedExceptStandby(z.kind)) continue
                                                              
                                               
                                                          
                                               
                                                                
                                                       
                                                                  
                                                      
                                                               
                                               
                                         
                                             
    let selfMana = 0
    const selfEnergy: Record<string, number> = {}
    let freeMana = 0
    const freeEnergy: Record<string, number> = {}
                                               
                                                                                 
                                                                                      
                                                                
                                                                
                                                     
    const grantedOf = grantedSpecFn ?? grantedSpecProvider
    const granted: ActivatedSpec[] = []
    if (grantedOf !== null && grantedOf !== undefined) {
      for (const k of o.derived?.grantedActivated ?? []) {
        const sp = grantedOf(k)
        if (sp) granted.push(sp)
      }
    }
                                                             
                                                     
                                              
                                                               
                                                                          
                                         
                                                      
                                                                            
                                                    
                                                        
                                                        
                                    
    for (const spec of [...withShangeCopies(state, o, specsOf(o.defId)), ...granted]) {
      if (!(spec.keywords ?? []).includes('反应')) continue                          
      if (spec.fastResolve !== true) continue                                        
      if (spec.target !== undefined && spec.target !== 'none') continue       
      if (spec.extraCost || (spec.discard ?? 0) > 0 || spec.destroySelf || spec.recycleSelf || spec.unempowerSelf) continue       
      if (!canActivateNow(state, player, spec.keywords, 'action')) continue
      if (spec.available && !spec.available(state, player, o.oid)) continue
      if (spec.oncePerTurn === true && state.activatedThisTurn?.[`${o.oid}:${spec.key}`] === true) continue
      if (spec.tapSelf && isExhausted(o)) continue
      if (!canPayFromState(state, player, spec.cost, purpose)) continue       
                                                              
      let evs: readonly GameEvent[]
      try { evs = spec.makeResolve({ selfOid: String(o.oid), controller: player })(state) } catch { continue }
      let specMana = 0
      const specEnergy: Record<string, number> = {}
      for (const ev of evs) {
        if ((ev as { kind?: string }).kind !== 'gainResource') continue
        const g = ev as unknown as { player: PlayerId; mana?: number; energy?: Record<string, number>; restricted?: unknown }
        if (g.player !== player || g.restricted !== undefined) continue       
        specMana += g.mana ?? 0
        for (const [d, n] of Object.entries(g.energy ?? {})) specEnergy[d] = (specEnergy[d] ?? 0) + n
      }
      if (spec.tapSelf === true) {
        selfMana = Math.max(selfMana, specMana)
        for (const [d, n] of Object.entries(specEnergy)) selfEnergy[d] = Math.max(selfEnergy[d] ?? 0, n)
      } else {
        freeMana += specMana
        for (const [d, n] of Object.entries(specEnergy)) freeEnergy[d] = (freeEnergy[d] ?? 0) + n
      }
    }
    gainMana += selfMana + freeMana
    for (const [d, n] of Object.entries(selfEnergy)) gainEnergy[d] = (gainEnergy[d] ?? 0) + n
    for (const [d, n] of Object.entries(freeEnergy)) gainEnergy[d] = (gainEnergy[d] ?? 0) + n
  }
  if (gainMana === 0 && Object.keys(gainEnergy).length === 0) return false
  const energy: Record<string, number> = { ...cap.energy }
  for (const [d, n] of Object.entries(gainEnergy)) energy[d] = (energy[d] ?? 0) + n
  return solvePayment({ ...cap, mana: cap.mana + gainMana, energy }, cost) !== null
}

export function canPayFromState(state: GameState, player: PlayerId, cost: Cost, purpose?: string): boolean {
  return solvePayment(resourceCapacity(state, player, purpose), cost) !== null
}

   
                    
                                                                    
                                                          
                                        
                                      
  
                                                        
                                                        
                                         
   
export function payFromState(state: GameState, player: PlayerId, cost: Cost, purpose?: string, pick?: PaymentPick): { ok: boolean; state: GameState } {
  const cap = resourceCapacity(state, player, purpose)
                                                         
                                                    
                               
  let plan = pick ? validatePayment(cap, cost, pick) : solvePayment(cap, cost)
  if (!plan) return { ok: false, state }
  let s = state
  const byDomain = runesByDomain(s, player)
  const isTapped = (oid: ObjId): boolean => s.objects[oid]?.status.tapped === true

  if (pick) {
                                                           
                                                     
                                                     
                                                         
                                
                                                  
                                               
                                                    
    const pool0 = s.runePools[player]
    const rEnergy: Record<string, number> = {}
    let rMana = s.spellDuelActive ? pool0?.duelMana ?? 0 : 0
    if (purpose !== undefined) {
      for (const g of pool0?.restricted ?? []) {
        if (!g.purposes.includes(purpose)) continue
        rMana += g.mana
        for (const [d, n] of Object.entries(g.energy)) rEnergy[d] = (rEnergy[d] ?? 0) + n
      }
    }
    const up: PaymentPlan = { ...plan }
    const eu: Record<string, number> = { ...up.energyUsed }
    const rr: Record<string, number> = { ...up.runesRecycled }
    for (const [d, avail] of Object.entries(rEnergy)) {
      const spare = Math.min(avail - (eu[d] ?? 0), rr[d] ?? 0)
      if (spare > 0) { eu[d] = (eu[d] ?? 0) + spare; rr[d] = (rr[d] ?? 0) - spare }
    }
    const spareMana = Math.min(rMana - up.manaFromPool, up.runesTapped)
    plan = spareMana > 0 || Object.keys(rEnergy).length > 0
      ? { energyUsed: eu, runesRecycled: rr,
        manaFromPool: up.manaFromPool + Math.max(0, spareMana),
        runesTapped: up.runesTapped - Math.max(0, spareMana) }
      : plan
  }

                                                     
                                           
                                                
  const pickedRecycle: Record<string, ObjId[]> = {}
  if (pick?.recycleOids !== undefined) {
    const seen = new Set<string>()
    for (const raw of pick.recycleOids) {
      const oid = raw as ObjId
      if (seen.has(raw)) return { ok: false, state }            
      seen.add(raw)
      const o = s.objects[oid]
      if (!isRune(o) || o!.controller !== player || o!.owner !== player) return { ok: false, state }
      if (o!.zone !== `base:${player}`) return { ok: false, state }
      ;(pickedRecycle[o!.defId.slice(RUNE_PREFIX.length)] ??= []).push(oid)
    }
                                               
    const declared = pick.runesRecycled ?? {}
    const doms = new Set([...Object.keys(pickedRecycle), ...Object.keys(declared)])
    for (const d of doms) {
      if ((pickedRecycle[d]?.length ?? 0) !== (declared[d] ?? 0)) return { ok: false, state }
    }
  }
  let pickedTap: ObjId[] | null = null
  if (pick?.tapOids !== undefined) {
    const seen = new Set<string>()
    const out: ObjId[] = []
    for (const raw of pick.tapOids) {
      const oid = raw as ObjId
      if (seen.has(raw)) return { ok: false, state }
      seen.add(raw)
      const o = s.objects[oid]
      if (!isRune(o) || o!.controller !== player || o!.owner !== player) return { ok: false, state }
      if (o!.zone !== `base:${player}` || o!.status.tapped === true) return { ok: false, state }
      out.push(oid)
    }
    if (out.length < plan.runesTapped) return { ok: false, state }
    pickedTap = out.slice(0, plan.runesTapped)
  }

                                      
  const toRecycle: ObjId[] = []
  for (const [d, n] of Object.entries(plan.runesRecycled)) {
    const list = [...(pickedRecycle[d] ?? byDomain[d] ?? [])].sort((a, b) => Number(isTapped(b)) - Number(isTapped(a)))
    toRecycle.push(...list.slice(0, n))
  }
                                      
  const recycleSet = new Set<ObjId>(toRecycle)
  const allRunes = Object.values(byDomain).flat()
  const tapCandidates = pickedTap ?? [
    ...allRunes.filter((o) => recycleSet.has(o) && !isTapped(o)),
    ...allRunes.filter((o) => !recycleSet.has(o) && !isTapped(o)),
  ].slice(0, plan.runesTapped)
  for (const oid of tapCandidates) {
    const o = s.objects[oid]!
    s = { ...s, objects: { ...s.objects, [oid]: { ...o, status: { ...o.status, tapped: true } } } }
  }
                                  
                                                        
                                  
  s = recycleObjects(s, toRecycle)
                  
  const pool = s.runePools[player] ?? { mana: 0, runes: {} }
  const poolRunes = { ...pool.runes }
                                                             
                                                  
  let manaNeed = plan.manaFromPool
  const energyNeed: Record<string, number> = { ...plan.energyUsed }
  const keptRestricted: { mana: number; energy: Record<string, number>; purposes: readonly string[] }[] = []
  for (const g of pool.restricted ?? []) {
    if (purpose === undefined || !g.purposes.includes(purpose)) { keptRestricted.push({ mana: g.mana, energy: { ...g.energy }, purposes: g.purposes }); continue }
    const useMana = Math.min(g.mana, manaNeed)
    manaNeed -= useMana
    const gEnergy: Record<string, number> = { ...g.energy }
    for (const d of Object.keys(gEnergy)) {
      const use = Math.min(gEnergy[d] ?? 0, energyNeed[d] ?? 0)
      gEnergy[d] = (gEnergy[d] ?? 0) - use
      energyNeed[d] = (energyNeed[d] ?? 0) - use
    }
    const restMana = g.mana - useMana
    const restEnergy = Object.fromEntries(Object.entries(gEnergy).filter(([, n]) => n > 0))
    if (restMana > 0 || Object.keys(restEnergy).length > 0) keptRestricted.push({ mana: restMana, energy: restEnergy, purposes: g.purposes })
  }
  for (const [d, n] of Object.entries(energyNeed)) poolRunes[d] = (poolRunes[d] ?? 0) - n
                                          
  const duelAvail = s.spellDuelActive ? (pool.duelMana ?? 0) : 0
  const fromDuel = Math.min(duelAvail, manaNeed)
  s = { ...s, runePools: { ...s.runePools, [player]: {
    mana: pool.mana - (manaNeed - fromDuel),
    ...(pool.duelMana !== undefined ? { duelMana: pool.duelMana - fromDuel } : {}),
    runes: poolRunes,
    ...(keptRestricted.length > 0 ? { restricted: keptRestricted } : {}),
  } } }
                                                 
                                                       
  const pipsPaid = Object.values(plan.runesRecycled).reduce((a, b) => a + b, 0)
    + Object.values(plan.energyUsed).reduce((a, b) => a + b, 0)
  if (pipsPaid > 0) {
    s = { ...s, pipsPaidThisTurn: { ...s.pipsPaidThisTurn, [player as string]: (s.pipsPaidThisTurn?.[player as string] ?? 0) + pipsPaid } }
  }
  return { ok: true, state: s }
}


   
                                          
                                            
   
export function refreshRunePool(state: GameState, player: PlayerId): GameState {
                                                       
  const pending = state.pendingMainPhaseEnergy?.[player]
  const pool = { mana: 0, duelMana: 0, runes: pending ? { ...pending } : {} }                   
                                                              
                            
                                                        
                                                              
                                                              
                                                      
                                                                               
                                                                   
  const others: Record<string, RunePool> = {}
  for (const p of Object.keys(state.runePools)) {
    if (p !== (player as string)) others[p] = { mana: 0, duelMana: 0, runes: {} }
  }
  const s = { ...state, runePools: { ...state.runePools, ...others, [player]: pool } }
  if (!pending) return s
  const rest = { ...s.pendingMainPhaseEnergy }
  delete rest[player]
  return { ...s, pendingMainPhaseEnergy: rest }
}

                                   
export function seedRunes(state: GameState, player: PlayerId, color: string, n: number): GameState {
  let s = state
  const baseId = asZoneId(`base:${player}`)
  for (let i = 0; i < n; i++) {
    const { oid, nextOid } = freshOid(s)
    const rune: GameObject = { oid: asObjId(oid), defId: `${RUNE_PREFIX}${color}`, owner: player, controller: player, zone: baseId, baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {} }
    const base = s.zones[baseId]!
    s = { ...s, nextOid, objects: { ...s.objects, [oid]: rune }, zones: { ...s.zones, [baseId]: { ...base, contents: [...base.contents, oid] } } }
  }
  return s
}
