                                 
  
                                      
                                                  
                                  
                                                  
                                                 
                                 
                                                 
                                         
                                                
                                             
                                                    
                                                        
                                           
  
                                                     
                                                         
                                                   
  
                                                  
                                                
                         

import type { ObjId, PlayerId } from '../state/ids'

export type BattleRole = 'attacking' | 'defending'

                                 
export interface RoleSignal {
  readonly oid: ObjId
  readonly role: BattleRole
}

   
                                         
                             
   
export interface SignalLedger {
  readonly units: ReadonlySet<string>
  readonly players: ReadonlySet<string>
}

export function emptyLedger(): SignalLedger {
  return { units: new Set(), players: new Set() }
}

   
                                  
                                      
   
export function noteRoleGains(
  ledger: SignalLedger,
  gains: readonly RoleSignal[],
): { signals: readonly RoleSignal[]; ledger: SignalLedger } {
  const out: RoleSignal[] = []
  const units = new Set(ledger.units)
  for (const g of gains) {
    if (units.has(g.oid)) continue                       
    units.add(g.oid)
    out.push(g)
  }
  return { signals: out, ledger: { units, players: ledger.players } }
}

   
                                            
                                             
   
export function notePlayerRole(
  ledger: SignalLedger,
  player: PlayerId,
): { fired: boolean; ledger: SignalLedger } {
  if (ledger.players.has(player)) return { fired: false, ledger }
  const players = new Set(ledger.players)
  players.add(player)
  return { fired: true, ledger: { units: ledger.units, players } }
}

   
                              
                             
                                          
   
export function orderForChain(signals: readonly RoleSignal[]): readonly RoleSignal[] {
  return [...signals].sort((a, b) => rank(a.role) - rank(b.role))
}
function rank(r: BattleRole): number {
  return r === 'attacking' ? 0 : 1                         
}
