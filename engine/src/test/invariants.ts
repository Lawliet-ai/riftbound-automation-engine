                        
  
                                                              
                                        
                                                                           
                                                                 
                                                      
                                                                 

import type { GameState } from '../state/gameState'
import { checkPriorityFocusInvariants } from '../loop/priorityFocus'

   
                                                        
  
                                                         
                                                                
                                                            
                                                    
                                                
  
                                              
                                         
   
export function assertStructuralInvariants(state: GameState): void {
  const seen = new Map<string, string>()
  for (const [zid, z] of Object.entries(state.zones)) {
    for (const oid of z.contents) {
      const prev = seen.get(oid as string)
      if (prev !== undefined) throw new Error(`不变量违反:oid ${oid} 同时挂在 ${prev} 与 ${zid}`)
      seen.set(oid as string, zid)
      const o = state.objects[oid as string]
      if (!o) throw new Error(`不变量违反:区 ${zid} 列了不存在的 oid ${oid}`)
      if ((o.zone as string) !== zid) {
        throw new Error(`不变量违反:oid ${oid} 的 zone 字段=${o.zone},却被 ${zid} 收着`)
      }
    }
  }
                                                              
                                                 
                                                                       
                                                 
                                                                
                                               
  if (state.battlefieldControl !== undefined) {
    const bfIds = new Set(
      Object.values(state.zones).filter((z) => z.kind === 'battlefield').map((z) => z.id as string),
    )
    for (const key of Object.keys(state.battlefieldControl)) {
      if (!bfIds.has(key)) throw new Error(`不变量违反:battlefieldControl 有非战场键 ${key}`)
    }
  }
  for (const [oid, o] of Object.entries(state.objects)) {
    const z = state.zones[o.zone as string]
    if (!z) throw new Error(`不变量违反:oid ${oid} 的 zone ${o.zone} 不存在`)
    if (!z.contents.includes(o.oid)) {
      throw new Error(`不变量违反:oid ${oid} 声称在 ${o.zone},但该区 contents 里没有它`)
    }
    const m = o.derived?.might
    if (m !== undefined && !Number.isFinite(m)) {
      throw new Error(`不变量违反:oid ${oid} 的派生战力非有限数(${m})`)
    }
  }
}

export function assertInvariants(state: GameState): void {
  assertStructuralInvariants(state)                                  
         
  for (const p of state.players) {
    if ((state.scores[p] ?? 0) < 0) throw new Error(`不变量违反:分数为负 (${p})`)
  }
                           
  for (const p of state.players) {
    const scored = state.scoredBattlefieldsThisTurn[p] ?? []
    if (new Set(scored).size !== scored.length) throw new Error(`不变量违反:同战场本回合重复得分 (${p})`)
  }
         
  if (state.winner !== null && !state.players.includes(state.winner)) {
    throw new Error('不变量违反:胜者非合法玩家')
  }
                                                         
                                                      
  const bfIds950 = new Set(
    Object.values(state.zones).filter((z) => z.kind === 'battlefield').map((z) => z.id as string),
  )
                                                       
                                                           
                                   
  for (const p of state.players) {
    for (const bf of state.scoredBattlefieldsThisTurn[p] ?? []) {
      if (!bfIds950.has(bf as string)) throw new Error(`不变量违反:得分记录含非战场 ${String(bf)} (${p})`)
    }
  }
                                                          
                         
                                                             
                                                          
                                                          
                                                            
                                                  
                                                         
                                            
                                                                  
                                                                       
                                                                
                                                     
                                                          
                                                    
                                                                
                                                         
                                
                                                  
                                                    
                                                                                   
                                                                                        
                                                                          
                                                                     
                                                         
                                            
                                                     
                                                        
                                                        
                                                                           
                                                   
                                                               
                                                
                                            
                                                            
  if (state.duelBattlefield !== undefined && !bfIds950.has(state.duelBattlefield as string)) {
    throw new Error(`不变量违反:duelBattlefield 非战场 ${String(state.duelBattlefield)}`)
  }
                                                                      
                                                      
  if (state.spellDuelActive === true && state.duelBattlefield === undefined) {
    throw new Error('不变量违反:对决进行中却没有 duelBattlefield')
  }
  if (state.spellDuelActive !== true && state.duelBattlefield !== undefined) {
    throw new Error(`不变量违反:没在对决却留着 duelBattlefield ${String(state.duelBattlefield)}`)
  }
                  
  for (const item of state.chain) {
    if (item.status !== 'pending' && item.status !== 'confirmed') {
      throw new Error('不变量违反:结算链项目状态非法')
    }
  }
                                                    
                                                        
                                                             
                                                        
                                                     
  if (state.chain.length === 0) {
    const residue = Object.keys(state.resolveChoices ?? {})
    if (residue.length > 0) throw new Error(`不变量违反:链空但 resolveChoices 非空(${residue.join(',')})`)
  }
                                         
                     
  checkPriorityFocusInvariants(state)
                       
  if (state.priority !== null && !state.players.includes(state.priority)) {
    throw new Error('不变量违反:优先权持有者非合法玩家')
  }
  if (state.focus !== null && !state.players.includes(state.focus)) {
    throw new Error('不变量违反:焦点持有者非合法玩家')
  }
}
