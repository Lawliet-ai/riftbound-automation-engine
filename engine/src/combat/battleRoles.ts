                                     
  
                                      
                                                
                                           
                                   
                                         
                                               
                                                    
                             
  
                                                             
                                                     
                                                     
                                                            
                                            
                                     
  
                                                  
                                   

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import type { GameObject } from '../state/object'
import type { BattleRole, RoleSignal } from './roleSignals'
import { isUnit } from '../state/cardTypes'                                         

                                       
export interface BattleContext {
  readonly battlefield: ZoneId
  readonly attacker: PlayerId
}

                                                                  
                                                           
                                                     
                                                       
                                                                            
                                                             
                                                                   
                                                        
                           
                                                         
                                                   

                                      
function roleFor(o: GameObject, ctx: BattleContext): 'attacking' | 'defending' {
  return o.controller === ctx.attacker ? 'attacking' : 'defending'
}

   
                                                                 
                                                     
   
export function assignBattleRoles(state: GameState, ctx: BattleContext | null): GameState {
  return assignBattleRolesWithSignals(state, ctx).state
}

   
                                               
                                          
                                                  
                                         
                                                        
   
export function assignBattleRolesWithSignals(
  state: GameState,
  ctx: BattleContext | null,
): { state: GameState; gains: readonly RoleSignal[] } {
  const gains: RoleSignal[] = []
  let objects: Record<string, GameObject> | null = null
  const put = (oid: ObjId, o: GameObject): void => {
    objects ??= { ...state.objects }
    objects[oid] = o
  }

  for (const o of Object.values(state.objects)) {
    if (!isUnit(o)) continue
    const onBattleField = ctx !== null && o.zone === ctx.battlefield
    const hasRole = battleRoleOf(o) !== null                            

    if (!onBattleField) {
                                        
      if (hasRole) {
        const status = { ...o.status }
        delete status.attacking
        delete status.defending
        put(o.oid, { ...o, status })
      }
      continue
    }

                                                     
    const want = roleFor(o, ctx)
    const other = want === 'attacking' ? 'defending' : 'attacking'
    if (o.status[want] === true && o.status[other] !== true) continue       
    const hadWanted = o.status[want] === true
    const status = { ...o.status, [want]: true }
    delete status[other]
    put(o.oid, { ...o, status })
    if (!hadWanted) gains.push({ oid: o.oid, role: want })             
  }

  return { state: objects === null ? state : { ...state, objects }, gains }
}

   
                                                                
                                           
                                                  
   
                                                                      
                                                    
export function battleRoleOf(o: { readonly status: GameObject['status'] }): BattleRole | null {
  if (o.status.attacking === true) return 'attacking'
  if (o.status.defending === true) return 'defending'
  return null
}

   
                                         
                                         
                                
   
   
                                                   
  
                                                       
                                                                               
                                                                                    
                                                          
                                                                                              
                                                
                                                                      
                                                                                                 
   
export function inBattle(o: { readonly status: GameObject['status'] }): boolean {
  return battleRoleOf(o) !== null
}

export function sameRoleCombatants(state: GameState, self: GameObject): readonly GameObject[] {
  const role = battleRoleOf(self)
  if (role === null) return []
  return Object.values(state.objects).filter(
    (o) => (o.zone as string) === (self.zone as string) && battleRoleOf(o) === role,
  )
}

   
                                   
                                              
   
export function opposingRoleCombatants(state: GameState, self: GameObject): readonly GameObject[] {
  const role = battleRoleOf(self)
  if (role === null) return []
  const other: BattleRole = role === 'attacking' ? 'defending' : 'attacking'
  return Object.values(state.objects).filter(
    (o) => (o.zone as string) === (self.zone as string) && battleRoleOf(o) === other,
  )
}

   
                                
                                                     
   
export const NO_COMBAT_DAMAGE = 'combatDamage'
export function canDealCombatDamage(o: GameObject): boolean {
  return !(o.derived?.restrictions ?? []).includes(NO_COMBAT_DAMAGE)
}
