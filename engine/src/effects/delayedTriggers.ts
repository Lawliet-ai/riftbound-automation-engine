                                       
  
                            
                                                              
                                              
                                     
                                                                    
                                                                     
                                                
                                                          
  
                                  
                                                                         
                                                       
                                   
  
                                             
                                                   
                                            
                                                          
import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'

                   
interface DelayedTriggerBase {
                                                   
  readonly id: string
                          
  readonly controller: PlayerId
                                   
  readonly sourceDefId: string
}

   
                                            
                                                     
                                                 
                                    
   
export type DelayedTrigger =
                                                              
  | (DelayedTriggerBase & { readonly kind: 'destroyOnNextDamage'; readonly target: ObjId })
  /** 帝国谕令 OGN-221:「在本回合内,**每当任意单位**承受伤害时,直接将它摧毁」(**整回合**,不盯谁)。 */
  | (DelayedTriggerBase & { readonly kind: 'destroyAnyDamaged' })
  /** 致命华彩 UNL-073:「当**该单位**在本回合被摧毁时,打出一个休眠的『金币』」(**一次性**,盯一个)。 */
  | (DelayedTriggerBase & { readonly kind: 'goldOnDestroy'; readonly target: ObjId })
  /** 集结部队 SFD-166:「在本回合内,**每当一名友方单位被打出时**,给予其增益」(**整回合**,不盯谁)。 */
  | (DelayedTriggerBase & { readonly kind: 'buffFriendlyPlayed' })
  /** 汲魂痛击 VEN-146:「当**该单位**在本回合内被摧毁时,召出一枚休眠的符文」(**一次性**,盯一个)。 */
  | (DelayedTriggerBase & { readonly kind: 'runeOnDestroy'; readonly target: ObjId })
  /**
   * ★第521轮 · 碎裂之火 OGN-005:「如果该单位**被此法术**摧毁,则进行一次:抽一张牌。」
   * ★★ 与上面那两档(`goldOnDestroy`/`runeOnDestroy`)差**一道归因门**,这是本档存在的全部理由:
   *   那两张的卡文是「当该单位**在本回合被摧毁时**」——**不问是谁弄死的**;
   *   这张写的是「被**此法术**摧毁」⇒ 还要问**是不是这张卡打死的**。
   * ⚠️ 判据读 `DestroyedEvent.byCards`(第521轮为这条债开的那格:这一批里哪几张卡打过死者)。
   *   **不能拿"本回合死了"顶替** —— 我打完 3 点没打死、对手随后自己拆掉它,那不算「被此法术摧毁」。
   * ⚠️ **一次性**:响完发 `clear` 摘掉(与那两档同款纪律)。
   */
  | (DelayedTriggerBase & {
    readonly kind: 'drawIfDestroyedByCard'
    readonly target: ObjId
                                                     
    readonly byCard: string
    readonly count: number
  })
  /**
   * ★第522轮 · 阿尔法突袭 UNL-192:「每有一名单位**因此**被摧毁,则进行一次:获得1经验。」
   * ★★ 与上面那档(`drawIfDestroyedByCard`,521 开的)是**同一条归因轴、只是奖励不同** ——
   *   ⇒ 按 ㊼「第二张同类卡就该抽表」,两档**共用同一个工厂**(`makeRiderIfDestroyedByCard`),
   *     判据(盯谁 + byCards 含它)只写一份,砍它两张卡一起红。
   * ⚠️⚠️ **`byCard` 记的不是这张法术** —— 卡文是「**该单位**对…造成伤害」,
   *   §428.5 的伤害来源是**那名友方单位**,所以归因门要认**它的 defId**,不是 UNL-192。
   *   (521 那张写的是「被**此法术**摧毁」,来源就是法术自己 —— 这是两张卡的真分野。)
   * ⚠️ 「**每有一名**…则进行一次」⇒ 每个挨过打的目标**各挂一条**,死几个给几点。
   */
  | (DelayedTriggerBase & {
    readonly kind: 'expIfDestroyedByCard'
    readonly target: ObjId
    readonly byCard: string
    readonly count: number
  })
  /** 视死如归 UNL-095:「当**该单位**在本回合赢得**一场**战斗时,获得2经验」(**一次性**,盯一个)。 */
  | (DelayedTriggerBase & { readonly kind: 'expOnBattleWin'; readonly target: ObjId })
  /**
   * 巨神峰之巅 OGN-289:「在本回合结束时,让**它们**变为活跃状态」(★第289轮加,盯**一组**符文)。
   * ⚠️ 是 `targets` **复数** —— 卡文选的是「最多两枚符文」;写成单数就得挂两条,
   *   而卡文说的是**同一条**延迟技能(§389 一条待办)。
   * ⚠️ 不带 `target` 字段 ⇒ `addDelayedTriggerInState` 那道"目标已不在就无操作"的闸**不适用**:
   *   两枚里死一枚不该整条作废,活着的那枚照样要醒(剪枝改在效果侧逐个跳过)。
   */
  | (DelayedTriggerBase & { readonly kind: 'readyRunesAtTurnEnd'; readonly targets: readonly ObjId[] })
  /**
   * 念化盈虚 VEN-035 ★第449轮:「回合结束时,解除其强化 / 强化该单位」(**一次性**,盯一个)。
   * `toEmpower`:true=回合结束时强化它(模式B 的反转);false=解除强化(模式A 的反转)。
   */
  | (DelayedTriggerBase & { readonly kind: 'empowerFlipAtTurnEnd'; readonly target: ObjId; readonly toEmpower: boolean })
  /** 娅希拉 UNL-050:「当我据守一处战场时,在你的下一个主阶段开始时,你可以选择将一名敌方单位
   *  移动到此战场」(★第457轮;**一次性**,不盯谁 —— 敌方候选在触发时现算)。 */
  | (DelayedTriggerBase & { readonly kind: 'moveEnemyAtNextMain'; readonly battlefield: string })
  /** 恶意收购 SFD-202:「回合结束时,失去该单位的控制权,然后将它召回」(★第459轮;**一次性**,
   *  盯一个;`returnTo` = 夺控前的原控制者,结算时采集穿进来 ㉗)。 */
  | (DelayedTriggerBase & { readonly kind: 'loseControlAtTurnEnd'; readonly target: ObjId; readonly returnTo: PlayerId })
  /** 阿克尚 SFD-109:「你控制这件装备,直到【我】离场为止」(★第460轮;**一次性**,盯 watch 的
   *  三条离场路;`returnTo` = 夺装备前的原控制者 ㉗)。 */
  | (DelayedTriggerBase & { readonly kind: 'returnGearOnLeave'; readonly watch: ObjId; readonly gear: ObjId; readonly returnTo: PlayerId })

                                                
export function delayedTriggerId(
  kind: DelayedTrigger['kind'], sourceDefId: string, target?: ObjId, extra?: string,
): string {
                                                       
                                                      
  const base = `${kind}:${sourceDefId}:${(target as string | undefined) ?? '*'}`
  return extra === undefined ? base : `${base}:${extra}`
}

export function delayedTriggersOf(state: GameState): readonly DelayedTrigger[] {
  return state.delayedTriggers ?? []
}

                                                                      
export function addDelayedTriggerInState(state: GameState, rec: DelayedTrigger): GameState {
                                                   
  if ('target' in rec && state.objects[rec.target] === undefined) return state
  const rest = delayedTriggersOf(state).filter((d) => d.id !== rec.id)
  return { ...state, delayedTriggers: [...rest, rec] }
}

                                   
export function clearDelayedTriggerInState(state: GameState, id: string): GameState {
  const cur = delayedTriggersOf(state)
  if (!cur.some((d) => d.id === id)) return state
  const rest = cur.filter((d) => d.id !== id)
  return rest.length === 0 && state.delayedTriggers === undefined
    ? state
    : { ...state, delayedTriggers: rest }
}
