                                          
  
                                             
                                                 
                                                
                         
                                                
                                              
                                                
                                            
                                           
  
        
                                               
                                        
                                                
                      

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameEvent, EventKind } from '../loop/events'
import type { ReduceDeps } from '../loop/reduce'
import type { ZoneKind } from '../state/zones'
import type { ChoiceRequest } from '../loop/chain'                     
import type { Trigger } from './trigger'
import { isUnit, isEquipment, type CardType } from '../state/cardTypes'
import { isStunned } from '../keywords/stun'
import { attachedTo } from '../state/attach'
import { resolveSelector, type Selector } from './selector'
import { eventBattlefield } from '../state/selfHere'                    

   
            
                                                           
                                                                
                           
                                                                           
                                                 
   
export type SelfOid = ObjId | null

                                           
export type Side = 'friendly' | 'enemy'

                                   
export interface Portrait {
                       
  readonly types?: readonly CardType[]
                               
  readonly side?: Side
                            
  readonly stunned?: boolean
}

   
                       
                           
   
export type Condition =
     
                                
                                                  
                              
     
  | { readonly kind: 'subjectIsSelf' }
  /**
   * 「当【我】据守/征服一处战场时」——我必须就在事件说的那处战场,**且得分者是我此刻的控制者**。
   * ⚠️ 防的是:据守/征服事件只带 {player, battlefield},不带是谁据守的。
   *    第111轮实锤:我在别处战场时,你在这处据守,我照样触发。
   * ★第394轮修:得分者那一半原先比的是**建触发时钉死的 controller**,夺控后与 §471.2.a 分家;
   *   现在比 `me.controller`(我此刻的控制者),与 `hostAtEventBattlefield` 同一口径。
   *   ⇒ 与 data 层的共用件 `scoredHere` **行为等价**(对照闸在 `test/dsl/scoredHereParity.test.ts`)。
   */
  | { readonly kind: 'selfAtEventBattlefield' }
  /** 「当一名(被眩晕的)(敌方)单位被摧毁时」——查 destroyed 事件的死前快照(㊺)。 */
  | { readonly kind: 'victimIs'; readonly portrait: Portrait }
  /** 「当你给予一名友方单位增益时」——查事件 target 的画像。 */
  | { readonly kind: 'eventTargetIs'; readonly portrait: Portrait }
  /**
   * 武装专用:「当【我】进攻/移动时」里的「我」= **穿戴者(宿主)**,不是武装自己。
   * §150.2 效果文本属于武装,但**未贴附时没有"我"** ⇒ 未贴附一律不触发。
   * ⚠️ 与 `subjectIsSelf` 是两块,别混:武装自己从不进攻/移动,套 `subjectIsSelf` 会恒假。
   */
  | { readonly kind: 'subjectIsHost' }
  /**
   * 武装专用:「当我据守/征服一处战场时」——判的是**宿主**在不在那处、且得分者=**宿主的**控制者。
   * ⚠️ 不能用 `selfAtEventBattlefield` 顶替:那块比的是武装自己的 zone 和触发的 controller,
   *    而武装被夺控 / 换宿主后,两者与宿主会分家。
   */
  | { readonly kind: 'hostAtEventBattlefield' }
  /**
   * 「此处」——事件发生在指定的那处战场。
   * ⚠️ **战场卡专用**:战场卡不是场上物件(§170)、没有 oid,它自己【就是】那处场地,
   *    所以判据是「事件说的战场 === 这张战场卡的 zone」,不能用 selfAtEventBattlefield
   *    (那块比的是"我这个物件的 zone",战场卡没有"我这个物件")。
   */
  | { readonly kind: 'eventAtBattlefield'; readonly zone: string }
  /**
   * 事件**自己带的** `player` 字段与我的关系。
   * ⚠️ **与 `by` 不是一回事**:`by` 比的是这一批事件的 **actor**(谁在行动),
   *    这块比的是**事件自身记录的 player**。据守/征服/打出法术这些事件都自带 player,
   *    两者在多数情况下一致,但不等价——需要哪个就写哪个,别互相顶替。
   */
  | { readonly kind: 'eventPlayerIs'; readonly side: 'you' | 'opponent' }
  /** 「强化【其他物体】时」——事件主角不是我(与 subjectIsSelf 相反)。 */
  /**
   * 「当我【移动到一处战场】时」——判的是这次移动的**落点是不是战场**。
   * ⚠️ 与 `eventAtBattlefield` 不同:那个比的是"事件发生在【指定的那一处】",
   *    这里是"落点属于战场这一【类】区域"(哪一处都算)。
   * ⚠️ 单独用不够,还要配 `subjectIsSelf` —— 否则别人移动到战场我也会响。
   * ⚠️ §446.1 战场↔战场之间的移动也算移动,落点仍是战场 ⇒ 照样触发,这是对的。
   * ⚠️ 判据走 zones 的 kind 一处(㊼),别在这里按 zone id 前缀猜。
   */
  | { readonly kind: 'movedToBattlefield' }
  | { readonly kind: 'subjectIsNotSelf' }
  /** 「当你在【对手的】回合内…」——判据是当前回合玩家不是我,不是"在反应窗口里"。 */
  | { readonly kind: 'onOpponentTurn' }
  /** 自定义判据:实在装不进积木的,老实写函数(比装成假积木好)。 */
  | { readonly kind: 'custom'; readonly test: (ev: GameEvent, state: GameState, selfOid: SelfOid, controller: PlayerId) => boolean }

                                                 
export interface ChooseSpec {
  readonly key: string
  readonly prompt: string
  readonly selector: Selector
                                                          
  readonly optional?: boolean
     
                        
                                         
                         
                                     
     
  readonly when?: (state: GameState, chosen: Readonly<Record<string, string>>) => boolean
     
                             
                                       
     
  readonly excludeChosen?: readonly string[]
}

export interface TriggerSpec {
     
                                                          
                                                           
                                     
     
  readonly id: string
                                 
  readonly rawId?: boolean
                                        
  readonly sourceDefId?: string
  readonly event: EventKind
  readonly by?: 'you' | 'opponent' | 'any'
  readonly activeZone?: readonly ZoneKind[]
                               
  readonly mayChoose?: boolean
     
                                                   
                                                           
                                                         
                                                           
                                                   
     
  readonly basePerform?: (state: GameState, ev: GameEvent, deps?: ReduceDeps) => GameState | null
     
                                               
                                                                  
     
  readonly oncePerTurn?: boolean
                                            
  readonly nthType?: boolean
  readonly when?: readonly Condition[]
  readonly abilityKey?: string
     
                                                     
                                                           
     
  readonly additionalCondition?: (state: GameState) => boolean
                                                          
  readonly nextChoice?: Trigger['nextChoice']
     
                                                   
                                                        
                                                   
                                                       
     
  readonly choose?: ChooseSpec
     
                                      
    
                                                                        
                                               
    
                      
                
                                                  
                                               
                                 
                                                  
                           
                                                        
                             
     
  readonly chooses?: readonly ChooseSpec[]
     
                                                 
                                                        
                                                                    
     
  readonly postChoice?: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
     
        
    
                                                         
                                    
    
                                                
                                                            
                                            
    
                                         
                                                                       
                                                                      
     
  readonly effect: Trigger['effect']
}

                                                                   
function typesMatch(types: readonly CardType[] | undefined, has: readonly CardType[]): boolean {
  if (!types || types.length === 0) return true
  return types.some((t) => has.includes(t))
}
function sideMatch(side: Side | undefined, owner: PlayerId, controller: PlayerId): boolean {
  if (!side) return true                   
  return side === 'friendly' ? owner === controller : owner !== controller
}

                                               
function victimMatches(ev: GameEvent, p: Portrait, controller: PlayerId): boolean {
  if (ev.kind !== 'destroyed') return false
  const v = ev.victim
  if (!typesMatch(p.types, v.types)) return false
  if (!sideMatch(p.side, v.controller, controller)) return false
  if (p.stunned !== undefined && isStunned(v) !== p.stunned) return false                     
  return true
}

                                              
function objectMatches(state: GameState, oid: ObjId | undefined, p: Portrait, controller: PlayerId): boolean {
  if (!oid) return false
  const o = state.objects[oid]
  if (!o) return false
  const types: CardType[] = []
  if (isUnit(o)) types.push('unit')
  if (isEquipment(o)) types.push('equipment')
  if (!typesMatch(p.types, types)) return false
  if (!sideMatch(p.side, o.controller, controller)) return false
  if (p.stunned !== undefined && isStunned(o) !== p.stunned) return false
  return true
}

   
                                     
                                                           
                                                       
                                
   
function subjectOf(ev: GameEvent): ObjId | undefined {
  switch (ev.kind) {
    case 'attack': return ev.unit
    case 'defend': return ev.unit                                                        
    case 'playUnit': return ev.unit
    case 'unitMoved': return ev.unit
    case 'zoneChange': return ev.obj
    case 'empower': return ev.target
    case 'mightCrossed': return ev.unit                          
    case 'grantBuff': return ev.target
    case 'statusChange': return ev.target
    case 'damage': return ev.target
    case 'destroy': return ev.target
                                     
                                                            
    case 'stun': return ev.target
    default: return undefined
  }
}
   
                                                       
                                                                            
                                                                 
   
function battlefieldOf(ev: GameEvent): string | undefined {
  return eventBattlefield(ev as { battlefield?: unknown })
}

   
                                                           
                                                           
   
function hostOf(state: GameState, selfOid: SelfOid): ObjId | undefined {
  if (selfOid === null) return undefined
  return attachedTo(state.objects[selfOid])
}

function holds(
  c: Condition, ev: GameEvent, state: GameState, selfOid: SelfOid, controller: PlayerId,
): boolean {
  switch (c.kind) {
    case 'subjectIsSelf':
      return selfOid !== null && subjectOf(ev) === selfOid
    case 'selfAtEventBattlefield': {
      if (selfOid === null) return false                          
      const bf = battlefieldOf(ev)
      const me = state.objects[selfOid]
                                               
                                                                   
                                                              
                                                                           
                                                     
                                                                     
                                       
      const actor = (ev as { player?: PlayerId }).player
      return !!bf && !!me && me.zone === bf && (actor === undefined || actor === me.controller)
    }
    case 'victimIs':
      return victimMatches(ev, c.portrait, controller)
    case 'eventTargetIs':
      return objectMatches(state, subjectOf(ev), c.portrait, controller)
    case 'subjectIsHost': {
      const host = hostOf(state, selfOid)
      return host !== undefined && subjectOf(ev) === host
    }
    case 'hostAtEventBattlefield': {
      const host = hostOf(state, selfOid)
      const h = host ? state.objects[host] : undefined
      const bf = battlefieldOf(ev)
      const actor = (ev as { player?: PlayerId }).player
      return !!h && !!bf && h.zone === bf && (actor === undefined || h.controller === actor)
    }
    case 'eventAtBattlefield':
      return battlefieldOf(ev) === c.zone
    case 'eventPlayerIs': {
      const p = (ev as { player?: PlayerId }).player
      if (p === undefined) return false                                     
      return c.side === 'you' ? p === controller : p !== controller
    }
    case 'movedToBattlefield': {
      if (ev.kind !== 'unitMoved') return false
      return state.zones[ev.to]?.kind === 'battlefield'
    }
    case 'subjectIsNotSelf':
      return selfOid !== null && subjectOf(ev) !== undefined && subjectOf(ev) !== selfOid
    case 'onOpponentTurn':
      return state.activePlayer !== controller
    case 'custom':
      return c.test(ev, state, selfOid, controller)
  }
}

   
                                
  
                                            
                                      
                                   
  
                                                    
                                            
                                                         
                                          
                                              
                                                        
  
                                                               
                               
   
export function compileTrigger(spec: TriggerSpec, selfOid: SelfOid, controller: PlayerId): Trigger {
                                                
  const questions: readonly ChooseSpec[] = spec.chooses ?? (spec.choose ? [spec.choose] : [])
  const conds = spec.when ?? []
  const ok = (ev: GameEvent, state: GameState): boolean =>
    conds.every((c) => holds(c, ev, state, selfOid, controller))
  return {
    id: spec.rawId ? spec.id : `${spec.id}:${selfOid}`,
    sourceOid: selfOid,
    ...(spec.sourceDefId ? { sourceDefId: spec.sourceDefId } : {}),
    controller,
    event: spec.event,
    ...(spec.by ? { by: spec.by } : {}),
    ...(spec.activeZone ? { activeZone: spec.activeZone } : {}),
    ...(spec.mayChoose ? { mayChoose: true } : {}),
    ...(spec.basePerform ? { basePerform: spec.basePerform } : {}), // §383.3.b 确认阶段付
    ...(spec.oncePerTurn ? { oncePerTurn: true } : {}), // §383.1 每回合首次
    ...(spec.nthType ? { nthType: true } : {}),          // §383.1.b 批内多满足选一
    ...(spec.abilityKey ? { abilityKey: spec.abilityKey } : {}),
    ...(spec.additionalCondition ? { additionalCondition: spec.additionalCondition } : {}),
    ...(spec.nextChoice
      ? { nextChoice: spec.nextChoice }
      : questions.length > 0 || spec.postChoice
        ? {
            nextChoice: (state: GameState, ev: GameEvent, chosen: Readonly<Record<string, string>>) => {
              for (const c of questions) {
                if (chosen[c.key] !== undefined) continue              
                if (c.when && !c.when(state, chosen)) continue                
                const excluded = new Set((c.excludeChosen ?? []).map((k) => chosen[k]).filter((v) => v !== undefined))
                const cands = resolveSelector(state, c.selector, controller, { ev, selfOid })
                  .filter((oid) => !excluded.has(oid as string))
                  .map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) }))
                if (cands.length === 0) continue                               
                return {
                  itemId: `trig:${spec.id}:${selfOid ?? 'none'}`,
                  controller,
                  key: c.key,
                  prompt: c.prompt,
                  candidates: c.optional ? [...cands, { id: 'skip', label: '不选(可选)' }] : cands,
                                                                  
                                                                       
                                                            
                                                                   
                  ...(c.selector.isTarget ? { isTarget: true } : {}),
                }
              }
              return spec.postChoice?.(state, chosen) ?? null                        
            },
          }
        : {}),
    filter: ok,
    effect: spec.effect, // 不包复验层:见上面 §383.2.a.1 那段
  }
}
