   
                                                                                      
                                                                                                 
  
                                                                    
                                                                                
                                                                                                       
  
                     
                                                                                                                           
                                                                                                                               
                                                                                                               
                                                                                   
                                                                   
                                                                                    
                                                                   
                                                                     
                                            
                                                                                                     
                                                      
                                                                                 
   
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import { addCosts, type Cost } from '../../src/state/runePool'                           
import type { TokenSpec } from '../../src/state/mutations'
import type { TypeSource } from '../../src/state/cardTypes'
import { hasteExtraCost } from '../../src/keywords/haste'
import { canPayOptionalTotal, OPTIONAL_EXTRA_PAY, OPTIONAL_EXTRA_SKIP } from './play-from-deck'

                                                         
export type SpawnTokenHasteProvider = (state: GameState, player: PlayerId, defId: string, fromZone: string | undefined, spec: TypeSource) => boolean
let hasteProvider: SpawnTokenHasteProvider | null = null
                                                                                                
export function setSpawnTokenHasteProvider(p: SpawnTokenHasteProvider | null): void {
  hasteProvider = p
}

                                                                                              
export function tokenHasteCost(): Cost {
  return hasteExtraCost(undefined)
}

                                                                                                                         
                                                                                                                    

                                                                          
export function hasteCostTimes(n: number): Cost | undefined {
  let total: Cost | undefined
  for (let i = 0; i < n; i++) total = total === undefined ? tokenHasteCost() : addCosts(total, tokenHasteCost())
  return total
}

                                                                                            
export function hastePaidSoFar(chosen: Readonly<Record<string, string>> | undefined, keys: readonly string[]): Cost | undefined {
  let total: Cost | undefined
  for (const k of keys) if (chosen?.[k] === OPTIONAL_EXTRA_PAY) total = total === undefined ? tokenHasteCost() : addCosts(total, tokenHasteCost())
  return total
}

export interface SpawnTokenHasteBase {
  readonly itemId: string
  readonly key: string
                                                       
  readonly ready?: true
                                                                            
  readonly label?: string
}

   
                                                        
                                                                                            
                          
   
export function spawnTokenHasteChoice(
  state: GameState, owner: PlayerId, spec: TokenSpec, base: SpawnTokenHasteBase,
  chosen?: Readonly<Record<string, string>>,
  alsoDue?: Cost, // 同一条结算里已答付的前几枚 / 调用方自带费(★1363 合计验)
): ChoiceRequest | null {
  if (base.ready === true) return null                   
  if (hasteProvider === null) return null               
  if (chosen?.[base.key] !== undefined) return null         
  if (!hasteProvider(state, owner, spec.defId, 'effect', spec)) return null                                           
  if (!canPayOptionalTotal(state, owner, [alsoDue, tokenHasteCost()])) return null                             
  return {
    itemId: base.itemId, controller: owner, key: base.key,
    prompt: `${base.label ?? '指示物'}:是否支付[急速]费用(§805.1.a [1]+[A],让它以活跃状态进场)?(雷克塞:从手牌以外位置被打出的友方单位获得[急速])`, // ⚠️★1224 不变量:别在这里拿 `token:` 前缀做字符串手术(裸写法全仓只许 isTokenDefId 一处),显示名由调用方传 label
    candidates: [{ id: OPTIONAL_EXTRA_PAY, label: '支付' }, { id: OPTIONAL_EXTRA_SKIP, label: '不支付' }],
  }
}

export interface SpawnTokenHasteOutcome {
                                           
  readonly ready: boolean
                                                                          
  readonly pre: readonly GameEvent[]
}
const NONE: SpawnTokenHasteOutcome = { ready: false, pre: [] }

   
                                                                                                
                                                                                                                                          
   
export function spawnTokenHasteResolve(
  state: GameState, owner: PlayerId, spec: TokenSpec, key: string,
  chosen: Readonly<Record<string, string>> | undefined,
  alsoDue?: Cost,
): SpawnTokenHasteOutcome {
  void spec                                                  
  if (hasteProvider === null) return NONE            
  if (chosen?.[key] !== OPTIONAL_EXTRA_PAY) return NONE               
  const cost = tokenHasteCost()
  if (!canPayOptionalTotal(state, owner, [alsoDue, cost])) return NONE                               
  return { ready: true, pre: [{ kind: 'spend', player: owner, cost } as GameEvent] }
}
