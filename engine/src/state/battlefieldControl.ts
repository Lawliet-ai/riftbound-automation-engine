                    
  
                                      
                                            
                                      
                                                      
                            
                                                  
                              
                                            
                                                
                                
  
                                                    
                                          
                                                               
                                                       
                                                                          
                                                                      
                                                          
                                                      
                                                                                 
                                                                   
                                               
                                                      
                                                        
                                                           
  
                                                 

import { zonesByKind, type GameState } from './gameState'
import type { PlayerId, ZoneId } from './ids'
import { isUnit } from './cardTypes'

   
                                                 
                                  
                                                              
                                                               
                                                
                                  
                                                   
   
export function controlMap(state: GameState): Record<string, PlayerId | null> {
  const tracked = state.battlefieldControl
  const out: Record<string, PlayerId | null> = {}
  for (const bf of zonesByKind(state, 'battlefield')) {
    const id = bf.id as string
    out[id] = tracked !== undefined && id in tracked ? (tracked[id] ?? null) : derivedControllerOf(state, bf.id as string)
  }
  return out
}

   
                                   
                                                 
   
function derivedControllerOf(state: GameState, battlefieldId: string): PlayerId | null {
  const bf = zonesByKind(state, 'battlefield').find((z) => (z.id as string) === battlefieldId)
  if (!bf) return null
                                                 
  const units = bf.contents.map((oid) => state.objects[oid]).filter((o) => !!o && isUnit(o))
  if (units.length === 0) return null
  const first = units[0]!.controller
  return units.every((u) => u!.controller === first) ? first : null
}

   
                                                        
                                                          
                                                      
   
export function writeControl(state: GameState, battlefieldId: string, controller: PlayerId | null): GameState {
  const cur = state.battlefieldControl
  if (cur !== undefined && battlefieldId in cur && cur[battlefieldId] === controller) return state              
  return { ...state, battlefieldControl: { ...(cur ?? {}), [battlefieldId]: controller } }
}

   
                                                             
                                                       
                                         
   
export function soleUnitControllerAt(state: GameState, battlefieldId: string): PlayerId | null {
  const zone = state.zones[battlefieldId as ZoneId]
  const units = (zone?.contents ?? []).map((oid) => state.objects[oid]).filter((o) => !!o && isUnit(o))
  if (units.length === 0) return null
  const first = units[0]!.controller
  return units.every((u) => u!.controller === first) ? first : null
}

   
                                                         
                                              
                                                                     
                                              
                                                                    
   
export function loseUncontrolledBattlefields(
  state: GameState, inCombatBattlefield?: string,
): GameState {
  const tracked = state.battlefieldControl
  if (tracked === undefined) return state                 
  if (state.chain.length > 0) return state                      
  let next: Record<string, PlayerId | null> | null = null
  for (const [bf, controller] of Object.entries(tracked)) {
    if (controller === null) continue
    if (bf === inCombatBattlefield) continue                  
    if (state.spellDuelActive && state.duelBattlefield === bf) continue           
    const zone = state.zones[bf as ZoneId]
    const held = (zone?.contents ?? []).some((oid) => {
      const o = state.objects[oid]
      return isUnit(o) && o!.controller === controller
    })
    if (held) continue
    next = { ...(next ?? tracked), [bf]: null }
  }
  return next === null ? state : { ...state, battlefieldControl: next }
}

                                      
export function controlledBattlefields(state: GameState, player: PlayerId): string[] {
  const map = controlMap(state)
  return Object.keys(map).filter((bf) => map[bf] === player)
}

                                       
export function controlsBattlefield(state: GameState, player: PlayerId, battlefieldId: string): boolean {
  return controlMap(state)[battlefieldId] === player
}

   
                                                    
                                              
                                          
   
export function openBattlefields(state: GameState): string[] {
  const control = controlMap(state)
  return zonesByKind(state, 'battlefield')
    // ①未被占领(§170.11.a:场上没有任何单位)
    .filter((bf) => !bf.contents.some((oid) => isUnit(state.objects[oid])))
    // ②★第476轮补齐:未受控制(§170.11.b)—— 控制权正式化后,「有控制者但单位已全灭、
    //   §323.6 清理还没跑」那一拍会同时满足"无单位",此前只查①会把它误判成开放。
    //   ⚠️ 派生轨(合成场景)下无单位必然派生出 null ⇒ 这一条恒真、行为与从前一字不差。
    .filter((bf) => control[bf.id as string] == null)
    .map((bf) => bf.id)
}

                                                
export function enemyControlledBattlefields(state: GameState, player: PlayerId): string[] {
  const map = controlMap(state)
  return Object.keys(map).filter((bf) => {
    const c = map[bf]
    return c !== null && c !== undefined && c !== player
  })
}
