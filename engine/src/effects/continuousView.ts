                                                                 
                                                      
                                                              
                                                                  
                                                               

import type { GameState } from '../state/gameState'
import { cardPassiveEffects } from './cardPassives'
import { valuedKeywordTotal } from './valuedKeyword'
import { resolveCopyBase } from './copyChain'                     
import { buffMightEffects } from '../keywords/buff'
import { attachmentMightEffects } from './attachmentMight'
import { attachmentGrantEffects } from './attachmentGrants'
import type { ObjId, PlayerId } from '../state/ids'
import type { DerivedState, GameObject } from '../state/object'
import { safePredicate } from './safePredicate'

export type EffectLayer = 'characteristic' | 'ability' | 'calc'
export type Duration = 'thisTurn' | 'permanent' | 'thisCombat'                                

export type Modification =
  | { readonly kind: 'setMight'; readonly value: number }                  
  | { readonly kind: 'setController'; readonly player: PlayerId }                  
  | { readonly kind: 'copyOf'; readonly sourceOid: ObjId }                                         
  | { readonly kind: 'grantKeyword'; readonly keyword: string; readonly ifAbsent?: true }              
  // ⭐★1663→★1666【缺陷 214】`ifAbsent`:卡文「如未拥有X,则额外获得X」。对**相加型**关键词(§809.2 法盾值一并相加)
  //   授予不是幂等的 ⇒ 必须等其他来源都算完,同家族(X / X2 / X3…)一份都没有才授。
  | { readonly kind: 'removeKeyword'; readonly keyword: string }
  | { readonly kind: 'addRestriction'; readonly restriction: string }                                          
  | { readonly kind: 'addMight'; readonly delta: number; readonly floor?: number; readonly cap?: number }                                            
  | { readonly kind: 'raiseTo'; readonly value: number }                             
  | { readonly kind: 'doubleMight' }                                
  // §477.2 技能层:给【该物件】提高"可持有几层已强化/几枚增益"的上限权限。
  // ⚠️ §441.1.c.1/§426.1.b.2 的主语都是【游戏物体】⇒ 权限必须落在物件的派生态上,
  //    不能由发起强化/增益的那个效果携带(外部来源打到它身上也得按它的上限算)。
  | { readonly kind: 'setLimit'; readonly limit: 'empower' | 'buff'; readonly value: number }
  /**
   * ★★★★★★【第576轮】§477.2 技能层:**授予一条主动技能**(不是关键词)。
   * 卡池首例:蜕变花园 UNL·213「此处的单位获得"{横置}:获得1经验。"」。
   *
   * ⚠️【为什么存 key 而不是把 spec 本身塞进来】`DerivedState` 是 `recomputeContinuous`
   *   每次重算的**纯数据**产物,里头塞函数(ActivatedSpec 带 makeResolve/available 等闭包)
   *   会让派生态不可比较、不可序列化。⇒ 这里只放一个**字符串 key**,
   *   真 spec 由 data 层的 `GRANTED_SPECS` 表按 key 查回来(engine 不认识任何具体卡)。
   * ⚠️ 与 `grantKeyword` 的分野(⑦ 哪半该共用):
   *   关键词走 `keywords` 集合、由印刷关键词的通用工厂生成技能;
   *   这一档是**卡自己写死的一条 spec**,没有对应关键词 ⇒ 两条路不能合并。
   */
  | { readonly kind: 'grantActivated'; readonly specKey: string }
  /**
   * ★865 §477.1 特质层:**授予一个属性标签**(海克斯注力刚壁 SFD-073「我拥有『机械』属性」)。
   * · 依据:§477.1.a 特质清单**逐字含「标签」**;§477.1.c 的判例就是「视为约德尔人」(标签)。
   * · ⚠️ 与 `grantKeyword` 的分野(不许合并):那条是 §477.2 **技能层**进 `derived.keywords`;
   *   这条是 §477.1 **特质层**进 `derived.tags` —— 两套消费侧完全不同(标签走 objectCardTags,
   *   关键词走关键词工厂),混了会让「机械」出现在关键词栏。
   * · ⚠️ §477.2.c 的两跳关系:贴附卡的效果文本先在**②层**并入宿主规则文本(那是文本归属),
   *   文本里这条「我拥有标签」再作为 §477.1 效果在**①层**落地 —— 引擎把两跳压成
   *   「provider 直接对宿主产 grantTag」,由 §476 不动点收敛到同一结果。
   */
  | { readonly kind: 'grantTag'; readonly tag: string }

export interface StaticEffect {
  readonly id: string
  readonly duration: Duration
                                        
  readonly fromPassive: boolean
                          
  readonly predicate: (obj: GameObject, state: GameState) => boolean
  readonly modification: Modification
                                 
  readonly timestamp: number
}

export function layerOf(m: Modification): EffectLayer {
  switch (m.kind) {
    case 'setMight':
    case 'setController':
    case 'copyOf':
    case 'grantTag': // ★865 §477.1.a 标签在特质清单里
      return 'characteristic'                                       
    case 'grantKeyword':
    case 'removeKeyword':
    case 'addRestriction':
    case 'setLimit':                                                  
    case 'grantActivated': // ★576 授予一条主动技能——与授予关键词同层(§477.2)
      return 'ability'          
    case 'addMight':
    case 'raiseTo':
    case 'doubleMight':
      return 'calc'          
  }
}

                                                                               
function isIncrease(m: Modification): boolean {
  if (m.kind === 'doubleMight' || m.kind === 'raiseTo') return true
  if (m.kind === 'addMight') return m.delta >= 0
  return false
}

   
                                                   
                                                                 
   
export function computeSnapshotDelta(currentMight: number, delta: number, floor: number): number {
  const clamped = Math.max(floor, currentMight + delta)
  return clamped - currentMight
}

                               
export const CONTINUOUS_CAP = 100

function baseDerived(obj: GameObject): DerivedState {
  return {
    might: obj.baseMight,
    keywords: [...(obj.baseKeywords ?? [])],
    restrictions: [],
    controller: obj.controller,
  }
}

                                                                   
   
                                                    
                                                     
                                              
                                                       
                                                          
                                    
                                                                     
   

function applyLayersOnce(
  obj: GameObject,
  state: GameState,
  applicable: readonly StaticEffect[],
  allEffects: readonly StaticEffect[],
): DerivedState {
  let might = obj.baseMight
  const keywords = new Set<string>(obj.baseKeywords ?? [])
  const tags = new Set<string>()                                            
  const restrictions = new Set<string>()
  const grantedActivated = new Set<string>()                            
  let controller = obj.controller
  let copiedDefId: string | undefined
  let empowerLimit: number | undefined
  let buffLimit: number | undefined

                                                                            
                                                                        
                                                                       
  for (const e of applicable) {
    if (layerOf(e.modification) !== 'characteristic') continue
    const m = e.modification
    if (m.kind === 'copyOf') {
                                                              
                                                              
      const finalSrc = resolveCopyBase(state, allEffects, m.sourceOid, safePredicate)
      if (finalSrc) {
        might = finalSrc.baseMight                 
        keywords.clear()                                    
        for (const kw of finalSrc.baseKeywords ?? []) keywords.add(kw)
        copiedDefId = finalSrc.defId                         
                                                             
                                             
                                                   
                                                                                      
                                                                 
                                                                                 
                                                                         
                                                            
                                                     
                                                                                
        tags.clear()
      }
    } else if (m.kind === 'setMight') might = m.value
    else if (m.kind === 'setController') controller = m.player
    else if (m.kind === 'grantTag') tags.add(m.tag)                         
  }

                                                       
  for (const e of applicable) {
    if (layerOf(e.modification) !== 'ability') continue
    const m = e.modification
    if (m.kind === 'grantKeyword' && m.ifAbsent !== true) keywords.add(m.keyword)
    else if (m.kind === 'removeKeyword') keywords.delete(m.keyword)
    else if (m.kind === 'addRestriction') restrictions.add(m.restriction)
    // ★576 授予的主动技能:用 Set 收 ⇒ 同一条被两个来源授予两次也只算一条
    //   (§721 一条技能就是一条,不因来源数翻倍;与 keywords 的处理同构)。
    else if (m.kind === 'grantActivated') grantedActivated.add(m.specKey)
  }
                                                              
  for (const e of applicable) {
    const m = e.modification
    if (m.kind !== 'grantKeyword' || m.ifAbsent !== true) continue
    const family = m.keyword.replace(/\d+$/, '')
    if (![...keywords].some((k) => k.replace(/\d+$/, '') === family)) keywords.add(m.keyword)
  }

                                                                         
  const calc = applicable.filter((e) => layerOf(e.modification) === 'calc')
  might = orderAndApplyCalc(might, calc)

                                                     
                                                        
  for (const e of applicable) {
    const mod = e.modification
    if (mod.kind !== 'setLimit') continue
    if (mod.limit === 'empower') empowerLimit = Math.max(empowerLimit ?? 1, mod.value)
    else buffLimit = Math.max(buffLimit ?? 1, mod.value)
  }
  return {
    might, keywords: [...keywords], restrictions: [...restrictions], controller,
    ...(copiedDefId ? { copiedDefId } : {}),
    ...(empowerLimit !== undefined ? { empowerLimit } : {}),
    ...(buffLimit !== undefined ? { buffLimit } : {}),
                                                    
                                                                              
    ...(grantedActivated.size > 0 ? { grantedActivated: [...grantedActivated] } : {}),
                                                       
    ...(tags.size > 0 ? { tags: [...tags] } : {}),
  }
}

                                                                                     
function calcApply(e: StaticEffect): (m: number) => number {
  const mod = e.modification
  if (mod.kind === 'doubleMight') return (m) => m + (m < 0 ? 0 : m)                    
  if (mod.kind === 'raiseTo') return (m) => (m < mod.value ? mod.value : m)         
  if (mod.kind === 'addMight') {
    const { delta, floor, cap } = mod
    if (cap !== undefined) return (m) => Math.min(cap, m + delta)             
    if (floor !== undefined) return (m) => Math.max(floor, m + delta)                        
    return (m) => m + delta
  }
  return (m) => m
}

                                             
function resultChanges(
  base: number,
  applyX: (m: number) => number,
  applyY: (m: number) => number,
): boolean {
  const contribXAlone = applyX(base) - base
  const afterY = applyY(base)
  const contribXAfterY = applyX(afterY) - afterY
  return contribXAlone !== contribXAfterY
}

   
                                
                                                                      
                                                         
                                                           
   
function orderAndApplyCalc(baseM: number, calc: readonly StaticEffect[]): number {
  if (calc.length === 0) return baseM
  const applyOf = new Map<StaticEffect, (m: number) => number>()
  for (const e of calc) applyOf.set(e, calcApply(e))

                  
  const dependsOn = new Map<StaticEffect, Set<StaticEffect>>()
  for (const e of calc) dependsOn.set(e, new Set())
  for (let i = 0; i < calc.length; i++) {
    for (let j = i + 1; j < calc.length; j++) {
      const X = calc[i]!
      const Y = calc[j]!
      const xDep = resultChanges(baseM, applyOf.get(X)!, applyOf.get(Y)!)
      const yDep = resultChanges(baseM, applyOf.get(Y)!, applyOf.get(X)!)
      if (xDep && !yDep) dependsOn.get(X)!.add(Y)          
      else if (yDep && !xDep) dependsOn.get(Y)!.add(X)          
      // 双向(§479.1)或互不影响 → 无依赖边,交给时间戳/子层
    }
  }

                                                
  const done = new Set<StaticEffect>()
  const order: StaticEffect[] = []
  while (order.length < calc.length) {
    const ready = calc.filter((e) => !done.has(e) && [...dependsOn.get(e)!].every((d) => done.has(d)))
    if (ready.length === 0) break                  
    ready.sort((a, b) => {
      const ai = isIncrease(a.modification)
      const bi = isIncrease(b.modification)
      if (ai !== bi) return ai ? -1 : 1                
      return a.timestamp - b.timestamp             
    })
    const pick = ready[0]!
    order.push(pick)
    done.add(pick)
  }

  let m = baseM
  for (const e of order) m = applyOf.get(e)!(m)
  return m
}

function derivedEq(a: DerivedState, b: DerivedState): boolean {
  return (
    a.might === b.might &&
    a.controller === b.controller &&
    a.keywords.length === b.keywords.length &&
    a.keywords.every((k, i) => k === b.keywords[i]) &&
    a.restrictions.length === b.restrictions.length &&
    a.restrictions.every((r, i) => r === b.restrictions[i]) &&
                                                  
                                           
    a.empowerLimit === b.empowerLimit &&
    a.buffLimit === b.buffLimit &&
                                                  
                                                          
    (a.tags?.length ?? 0) === (b.tags?.length ?? 0) &&
    (a.tags ?? []).every((t, i) => t === b.tags?.[i]) &&
                                                                 
                                     
    a.copiedDefId === b.copiedDefId &&
    (a.grantedActivated?.length ?? 0) === (b.grantedActivated?.length ?? 0) &&
    (a.grantedActivated ?? []).every((g, i) => g === b.grantedActivated?.[i])
  )
}

   
                          
  
                                                                   
                                                         
                                                             
                                                 
                           
                                                                             
                                               
                                                   
                                                     
                                                         
  
                                                             
                                                           
                                                              
                                             
                  
   
export function computeDerived(
  obj: GameObject,
  state: GameState,
  effects: readonly StaticEffect[],
): DerivedState {
                                                      
                                              
                                                                
                                                                       
  const applicable = effects.filter((e) => safePredicate(e, obj, state))
  return applyLayersOnce(obj, state, applicable, effects)
}

   
                                                  
                                       
   
export function recomputeContinuous(state: GameState): GameState {
                                       
                                                    
                                       
  const grants = attachmentGrantEffects(state)
                                                 
                                                       
  const passives = cardPassiveEffects(state)
  const computed = grants.length + passives.length > 0 ? [...grants, ...passives] : []
  const explicit = computed.length > 0 ? [...state.continuousEffects, ...computed] : state.continuousEffects
  const pass1: Record<string, GameObject> = {}
  for (const [id, o] of Object.entries(state.objects)) {
    pass1[id] = { ...o, derived: computeDerived(o, state, explicit) }
  }
                                                                 
                                         
                                                                    
                              
                                                           
                                                                                
                                                                        
                                                               
                                                                    
                                                               
                                                          
                                                    
  const stateForImplied = {
    ...state,
    objects: pass1,
    continuousEffects: passives.length > 0 ? [...state.continuousEffects, ...passives] : state.continuousEffects,
  }
  const implied = [
    ...impliedKeywordEffects(stateForImplied),
    ...impliedBuffEffects(stateForImplied),
                                                            
    ...attachmentMightEffects(stateForImplied),
  ]
                                                                                        
                                                               
                                                                   
                                                                     
                                                                       
                                                      
                                                       
                                                      
                                                    
                                                               
  const all = [...explicit, ...implied]
  const objects: Record<string, GameObject> = {}
                                                          
                                                                 
                                            
                                                      
                                                           
                                                                                
                                 
                                                                     
                                                                
                                                                                 
                                                               
                                                       
                                                       
                                                                      
                                                                           
                                          
                                                                 
                                                 
                                                        
                                                                    
                                                                                        
                                                   
                                                            
                                            
                                                    
                                                                                         
                                                                              
                                                 
                                                             
                                                              
                                             
  let cur = pass1
  let curImplied = implied
  for (let iter = 0; iter < CONTINUOUS_CAP; iter++) {
    const stateThisRound = { ...stateForImplied, objects: cur }
    const allThisRound = [...explicit, ...curImplied]
    const next: Record<string, GameObject> = {}
    let converged = true
    for (const [id, o] of Object.entries(state.objects)) {
      next[id] = { ...o, derived: computeDerived(cur[id] ?? o, stateThisRound, allThisRound) }
      if (converged && !derivedEq(next[id]!.derived!, cur[id]?.derived ?? baseDerived(o))) converged = false
    }
    if (converged) return { ...state, objects: next }
    cur = next
    curImplied = [
      ...impliedKeywordEffects({ ...stateForImplied, objects: cur }),
      ...impliedBuffEffects({ ...stateForImplied, objects: cur }),
      ...attachmentMightEffects({ ...stateForImplied, objects: cur }),
    ]
  }
  throw new Error(`recompute 未在 ${CONTINUOUS_CAP} 轮内收敛(§476.2 疑似循环)`)
}

   
                                             
                                                                  
                                                                  
                                                           
                                             
  
                                                  
                                      
                                  
   
const ROLE_KEYWORDS = [
  { role: 'defending', name: '坚守' },
  { role: 'attacking', name: '强攻' },
] as const

function impliedKeywordEffects(state: GameState): StaticEffect[] {
  const out: StaticEffect[] = []
  for (const o of Object.values(state.objects)) {
    for (const { role, name } of ROLE_KEYWORDS) {
      if (o.status[role] !== true) continue
                                                                   
      const total = valuedKeywordTotal(state, o, name, safePredicate)
      if (total === 0) continue
      out.push({
        id: `kw:${name}:${o.oid}`,
        duration: 'permanent',
        fromPassive: true, // §477.3.b 被动技能来源不快照
        predicate: (x) => x.oid === o.oid,
        modification: { kind: 'addMight', delta: total },
        timestamp: 0, // 关键词隐含效果最早应用(先于显式效果)
      })
    }
  }
  return out
}

   
                                    
                                                  
                                       
   
function impliedBuffEffects(state: GameState): StaticEffect[] {
  return buffMightEffects(state).map((b) => ({
    id: `buff:${b.oid}`,
    duration: 'permanent' as const,
    fromPassive: true,
    predicate: (x: GameObject) => x.oid === b.oid,
    modification: { kind: 'addMight' as const, delta: b.delta },
    timestamp: 0,
  }))
}

                                                                     
export function expireThisTurnEffects(state: GameState): GameState {
  const kept = state.continuousEffects.filter((e) => e.duration !== 'thisTurn')
  if (kept.length === state.continuousEffects.length) return state
  return recomputeContinuous({ ...state, continuousEffects: kept })
}
