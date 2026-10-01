                                                                         
                                                          
                                                
                                                                  

import type { GameState, Phase } from '../state/gameState'
import type { GameObject } from '../state/object'
import { canBecomeReady } from '../keywords/cannotReady'
import { clearRunePoolAtEndStep, clearRunePoolAtMainPhaseStart, type RunePool } from '../state/runePool'

export const PHASE_ORDER: readonly Phase[] = ['awaken', 'start', 'summon', 'draw', 'main', 'ending']

                                                 
export function nextPhase(p: Phase): Phase | null {
  const i = PHASE_ORDER.indexOf(p)
  if (i < 0 || i >= PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[i + 1] ?? null
}

                                                        
export interface Checkpoint {
  readonly phase: Phase
  readonly step: string
  readonly ref: string
}

export function turnCheckpoints(): readonly Checkpoint[] {
  return [
    { phase: 'awaken', step: '唤醒', ref: '§315.1.b 回合玩家激活所控物体' },
    { phase: 'start', step: '开始步骤', ref: '§315.2.a.1 在开始阶段开始时触发' },
    { phase: 'start', step: '得分计算步骤', ref: '§315.2.b.2 回合玩家据守' },
    { phase: 'summon', step: '召出', ref: '§315.3.b 召出两张符文' },
    { phase: 'draw', step: '抽牌', ref: '§315.4.b 回合玩家抽一张牌' },
    { phase: 'main', step: '主阶段进入', ref: '§316.3 清符文池 → §316.4 主阶段开始时触发' },
    { phase: 'main', step: '主阶段自由结构', ref: '§316.5 自决行动 / §316.7 战斗 / §316.8 法术对决' },
    { phase: 'ending', step: '结束步骤', ref: '§317.1 回合结束阶段触发' },
    { phase: 'ending', step: '失效步骤', ref: '§317.2 3c移伤 / 3d本回合效果失效+眩晕解除 / 3e清符文池' },
  ]
}

function mapObjects(
  state: GameState,
  fn: (o: GameObject) => GameObject,
): Readonly<Record<string, GameObject>> {
  const next: Record<string, GameObject> = {}
  for (const [id, o] of Object.entries(state.objects)) next[id] = fn(o)
  return next
}

   
                                                   
  
                                 
                                                    
                                          
                                                               
                                                 
                                                               
                                 
   
export function runAwakenPhase(state: GameState): GameState {
  return {
    ...state,
    objects: mapObjects(state, (o) =>
                                                                          
      o.controller === state.activePlayer && canBecomeReady(o)
        ? { ...o, status: { ...o.status, ready: true, tapped: false, dormant: false } }
        : o,
    ),
  }
}

   
                                                 
                                                     
                                                                
   
export function runMainPhaseEntry(
  state: GameState,
  fireMainStartTriggers: (s: GameState) => GameState = (s) => s,
): { state: GameState; taskOrder: readonly string[] } {
  const clearedPools: Record<string, RunePool> = {}
  for (const [p, pool] of Object.entries(state.runePools)) {
    clearedPools[p] = clearRunePoolAtMainPhaseStart(pool)
  }
  const afterClear: GameState = { ...state, phase: 'main', runePools: clearedPools }
  const afterTriggers = fireMainStartTriggers(afterClear)
  return { state: afterTriggers, taskOrder: ['§316.3-清符文池', '§316.4-主阶段开始时触发'] }
}

   
                          
                                           
                                                                                     
                             
                                                          
                                  
   
export function runExpirationStep(
  state: GameState,
  expireThisTurnEffects: (s: GameState) => GameState = (s) => s,
): GameState {
                
  const afterDamage = mapObjects(state, (o) => (o.damage === 0 ? o : (({ damagedBy: _db, ...rest }) => ({ ...rest, damage: 0 }))(o)))                           
                                      
  const afterStun: Record<string, GameObject> = {}
  for (const [id, o] of Object.entries(afterDamage)) {
    afterStun[id] = o.status.stunned ? { ...o, status: { ...o.status, stunned: false } } : o
  }
  const afterExpire = expireThisTurnEffects({ ...state, objects: afterStun })
                 
  const clearedPools: Record<string, RunePool> = {}
  for (const [p, pool] of Object.entries(afterExpire.runePools)) {
    clearedPools[p] = clearRunePoolAtEndStep(pool)
  }
  return { ...afterExpire, runePools: clearedPools }
}

                                                     
export const EXPIRATION_LOOP_CAP = 100

   
                                                               
                                       
                                                                
                                                      
                                                                
   
export function runExpirationStepLoop(
  state: GameState,
  runOnce: (s: GameState) => { state: GameState; feprOccurred: boolean },
): GameState {
  let s = state
  for (let i = 0; i < EXPIRATION_LOOP_CAP; i++) {
    const { state: next, feprOccurred } = runOnce(s)
    s = next
    if (!feprOccurred) return s
  }
  throw new Error(`失效步骤循环未在 ${EXPIRATION_LOOP_CAP} 轮内终止(§317.2.f)`)
}
