                                                                        
                                                                             
                                                                              
                                                                          

import type { GameState } from '../state/gameState'
import { resetRallyForNewTurn } from '../keywords/rally'
import type { PlayerId } from '../state/ids'
import { zonesByKind } from '../state/gameState'
import { applyEvents, type ReduceDeps } from '../loop/reduce'

export type ScoreKind = 'conquer' | 'hold'
export type ScoreResult = 'scored' | 'blocked' | 'drawInstead' | 'alreadyScored'

export interface ScoringHooks {
                                                                   
  fireScoringAbilities?: (state: GameState, player: PlayerId, battlefield: string, kind: ScoreKind) => GameState
                              
  drawCard?: (state: GameState, player: PlayerId) => GameState
     
                                               
                                                    
                                        
     
  bonusPoints?: (state: GameState, player: PlayerId, battlefield: string, kind: ScoreKind) => number
     
                                                         
                                                    
                                                               
                                                    
     
  pointsBlockedAt?: (state: GameState, player: PlayerId, battlefield: string) => boolean
     
                                                               
                                                   
    
                                             
                                                                      
                                                       
                                                                   
                                         
                                                         
                                                              
                                                           
     
  drawInsteadAt?: (state: GameState, player: PlayerId, battlefield: string) => boolean
}

function battlefieldIds(state: GameState): string[] {
  return zonesByKind(state, 'battlefield').map((z) => z.id)
}

export function hasScoredThisTurn(state: GameState, player: PlayerId, battlefield: string): boolean {
  return (state.scoredBattlefieldsThisTurn[player] ?? []).includes(battlefield)
}

function markScored(state: GameState, player: PlayerId, battlefield: string): GameState {
  const cur = state.scoredBattlefieldsThisTurn[player] ?? []
  if (cur.includes(battlefield)) return state
  return {
    ...state,
    scoredBattlefieldsThisTurn: { ...state.scoredBattlefieldsThisTurn, [player]: [...cur, battlefield] },
  }
}

   
                                                          
                                                          
   
function wouldCompleteEveryBattlefield(state: GameState, player: PlayerId, target: string): boolean {
  const scored = new Set(state.scoredBattlefieldsThisTurn[player] ?? [])
  const bfs = battlefieldIds(state)
  return bfs.length > 0 && bfs.every((bf) => bf === target || scored.has(bf))
}

   
                     
                                                     
                                                                     
                                      
                   
   
                                       
const PERSISTENT_DELAYED_KINDS: ReadonlySet<string> = new Set(['returnGearOnLeave'])

export function resetTurnLedgers(state: GameState): GameState {
                                                     
                                     
                                                    
  const who = state.activePlayer as string
  return resetRallyForNewTurn({
    ...state,
    turnsTaken: { ...state.turnsTaken, [who]: (state.turnsTaken[who] ?? 0) + 1 },
    scoredBattlefieldsThisTurn: {},
    scoringTriggeredThisTurn: {},
    unitsConqueredThisTurn: [],
    abilityFiredThisTurn: {}, // §383.1「每回合首次」额度按回合刷新
    enemyTargetedThisTurn: {}, // §355.6 本回合「把敌方选为目标」的计数,同样按回合刷新
    drawnThisTurn: {}, // §418 本回合抽牌数,同样按回合刷新
    damagedThisTurn: {}, // 本回合受过伤害的物件,同样按回合刷新
    turnShields: {}, // §367 本回合挂在物件上的替换效果标记,同样按回合刷新
                                                                     
                                                              
                                           
    delayedTriggers: (state.delayedTriggers ?? []).filter((d) => PERSISTENT_DELAYED_KINDS.has(d.kind)), // §389 本回合的延迟触发待办按回合刷新;跨回合的留下
    nextUnitReady: {}, // §805.6 本回合「下一名单位活跃进场」的授予,同样按回合刷新
    unitsEnterReadyThisTurn: {}, // OGN-129 本回合「你打出的所有单位活跃进场」(第十五本),同样按回合刷新
    unitPlayCostUpThisTurn: {}, // UNL-219 本回合「单位打出费 +N」,同样按回合刷新
    spellDamageNegatedThisTurn: undefined, // OGN-145 本回合「法术/技能伤害全部无效化」(第十一本,★全局布尔)
    allyDiedInStartPhaseThisTurn: {}, // UNL-037 本回合「我的开始阶段死过友方单位」,同样按回合刷新
    gainedExperienceThisTurn: {}, // UNL-108 本回合「你获得过经验值」(第七本),同样按回合刷新
    discardedThisTurn: {}, // OGN-019 本回合「你弃置过手牌」(第八本),同样按回合刷新
    playedArmamentThisTurn: {}, // SFD-197 本回合「你打出过武装」(第九本),同样按回合刷新
    playedEquipmentThisTurn: {}, // SFD-213 本回合「你打出过非指示物装备」(第十本),同样按回合刷新
    firstEquipPlayedThisTurn: {}, // ★584 VEN-161 本回合「首件装备是哪一个」,同样按回合刷新
    attachedThisTurn: {}, // ★862 SFD-042 本回合「哪几件武装是这回合贴上去的」(键=武装 oid),同样按回合刷新
    maxExcessDamageThisTurn: {}, // ★587 OGN-034 本回合「单次最大过量伤害」,同样按回合刷新
                                                      
    playedUnitThisTurn: {}, // VEN-065 本回合「你打出过非指示物单位」(第十六本,第395轮),同样按回合刷新
    playedSpellThisTurn: {}, // VEN-065 本回合「你打出过法术」(第十七本,第395轮),同样按回合刷新
    playedSpellCountThisTurn: {}, // ★581 VEN-039 本回合「确认过几个法术」(第十九本·计数),同样按回合刷新
    movesThisTurn: {}, // OGN-205/OGN-189 本回合「每名单位移动了几次」(第十二本,★键是物件 oid),同样按回合刷新
    conqueredBattlefieldsThisTurn: {}, // SFD-015 本回合「你征服过哪几处战场」(第十三本),同样按回合刷新
    holdsThisTurn: {}, // ★680 SFD-055 本回合「据守动作发生次数」(第二十一本),同样按回合刷新
    pipsPaidThisTurn: {}, // ★681 SFD-143 本回合「支付过的符能枚数」(第二十二本),同样按回合刷新
    activatedThisTurn: {}, // ★682 SFD-050 本回合「每回合一次技能已用」(第二十三本),同样按回合刷新
    buffBonusThisTurn: {}, // ★692 OGN-053 本回合「增益额外加成」(第二十四本),同样按回合刷新
    unitDestroyedThisTurn: {}, // OGN-144 本回合「谁的单位被摧毁过」(第十四本,★键是死者的控制者),同样按回合刷新
    visionThisTurn: {}, // UNL-053 本回合「谁能额外看见什么」(第十八本,第410轮),同样按回合刷新
  })
}

                                                     
export function playerTurnIndex(state: GameState, p: PlayerId): number {
  return state.turnsTaken[p as string] ?? 0
}

   
                                    
                                                          
                                       
   
export function noteScoringTrigger(
  state: GameState,
  player: PlayerId,
  battlefield: string,
): { state: GameState; fire: boolean } {
  const cur = state.scoringTriggeredThisTurn[player] ?? []
  if (cur.includes(battlefield)) return { state, fire: false }
  return {
    state: { ...state, scoringTriggeredThisTurn: { ...state.scoringTriggeredThisTurn, [player]: [...cur, battlefield] } },
    fire: true,
  }
}

function gainPointThroughPipeline(
  state: GameState,
  player: PlayerId,
  battlefield: string,
  deps: ReduceDeps,
  amount = 1,
): { state: GameState; gained: boolean } {
  const { state: after, events } = applyEvents(state, [{ kind: 'gainPoint', player, amount }], deps)
  const gained = events.some((e) => e.kind === 'gainPoint')                         
                                                            
                                                       
                                                                      
  const withSignals = gained
    ? { ...after, pendingScoreSignals: [...(after.pendingScoreSignals ?? []), ...events.filter((e) => e.kind === 'gainPoint').map((e) => ({ player: (e as { player: PlayerId }).player, amount: (e as { amount?: number }).amount ?? 1 }))] }
    : after
  return { state: gained ? markScored(withSignals, player, battlefield) : withSignals, gained }
}

                                                             
function scoreAmount(state: GameState, player: PlayerId, battlefield: string, kind: ScoreKind, hooks: ScoringHooks): number {
  const bonus = hooks.bonusPoints?.(state, player, battlefield, kind) ?? 0
  return 1 + Math.max(0, bonus)
}

                                           
export function attemptConquer(
  state: GameState,
  player: PlayerId,
  battlefield: string,
  deps: ReduceDeps = {},
  hooks: ScoringHooks = {},
): { state: GameState; result: ScoreResult; signal: boolean } {
  if (hasScoredThisTurn(state, player, battlefield)) return { state, result: 'alreadyScored', signal: false }                  
                                            
  const withAbilities = hooks.fireScoringAbilities
    ? hooks.fireScoringAbilities(state, player, battlefield, 'conquer')
    : state
                                                                  
                                                     
  if (hooks.pointsBlockedAt?.(withAbilities, player, battlefield) === true) {
    const marked = markScored(withAbilities, player, battlefield)           
    const g = noteScoringTrigger(marked, player, battlefield)                          
    return { state: g.state, result: 'blocked', signal: g.fire }
  }
                                                                
  if (
    (withAbilities.scores[player] ?? 0) >= withAbilities.winTarget - 1 &&
    !wouldCompleteEveryBattlefield(withAbilities, player, battlefield)
  ) {
    const drawn = hooks.drawCard ? hooks.drawCard(withAbilities, player) : withAbilities
                                                          
    const marked = markScored(drawn, player, battlefield)
                                                               
    const g = noteScoringTrigger(marked, player, battlefield)
    return { state: g.state, result: 'drawInstead', signal: g.fire }
  }
                                          
                                                             
                                                   
                                                          
                                                                  
                                                         
                                                       
                                                            
                                                              
  if (hooks.drawInsteadAt?.(withAbilities, player, battlefield) === true) {
    const drawn = hooks.drawCard ? hooks.drawCard(withAbilities, player) : withAbilities
    const marked = markScored(drawn, player, battlefield)                         
    const g = noteScoringTrigger(marked, player, battlefield)                        
    return { state: g.state, result: 'drawInstead', signal: g.fire }
  }
  const { state: s, gained } = gainPointThroughPipeline(withAbilities, player, battlefield, deps, scoreAmount(withAbilities, player, battlefield, 'conquer', hooks))
                                                   
                                          
                                                
  const marked = gained ? s : markScored(s, player, battlefield)
  const g = noteScoringTrigger(marked, player, battlefield)                                            
  return { state: g.state, result: gained ? 'scored' : 'blocked', signal: g.fire }
}

                                               
export function attemptHold(
  state: GameState,
  player: PlayerId,
  battlefield: string,
  deps: ReduceDeps = {},
  hooks: ScoringHooks = {},
): { state: GameState; result: ScoreResult; signal: boolean } {
  if (hasScoredThisTurn(state, player, battlefield)) return { state, result: 'alreadyScored', signal: false }        
                                                                            
  const counted: GameState = { ...state, holdsThisTurn: { ...state.holdsThisTurn, [player as string]: (state.holdsThisTurn?.[player as string] ?? 0) + 1 } }
  const withAbilities = hooks.fireScoringAbilities
    ? hooks.fireScoringAbilities(counted, player, battlefield, 'hold')
    : counted
                                                   
                                                                  
                                            
                                                   
                                                              
  if (hooks.pointsBlockedAt?.(withAbilities, player, battlefield) === true) {
    const marked = markScored(withAbilities, player, battlefield)
    const g = noteScoringTrigger(marked, player, battlefield)
    return { state: g.state, result: 'blocked', signal: g.fire }
  }
  if (hooks.drawInsteadAt?.(withAbilities, player, battlefield) === true) {
    const drawn = hooks.drawCard ? hooks.drawCard(withAbilities, player) : withAbilities
    const marked = markScored(drawn, player, battlefield)
    const g = noteScoringTrigger(marked, player, battlefield)
    return { state: g.state, result: 'drawInstead', signal: g.fire }
  }
  const { state: s, gained } = gainPointThroughPipeline(withAbilities, player, battlefield, deps, scoreAmount(withAbilities, player, battlefield, 'hold', hooks))
  const marked = gained ? s : markScored(s, player, battlefield)                           
  const g = noteScoringTrigger(marked, player, battlefield)                                    
  return { state: g.state, result: gained ? 'scored' : 'blocked', signal: g.fire }
}
