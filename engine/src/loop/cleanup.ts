                                                                                        
                                                                           
                                                                               
                                                          

import type { GameState, ReplacementSignal } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import { effectiveMight } from '../state/might'
import { destroyToOwnerDiscard } from '../state/mutations'
import type { GameObject } from '../state/object'
import { checkAltVictory } from '../scoring/altVictory'
import { recomputeContinuous } from '../effects/continuousView'
import { collectLastRites, fillPostDeathOids, snapshotOnDeath, type DeathSnapshot } from '../keywords/lastRites'
import { isUnit, isToken } from '../state/cardTypes'
import { zoneCategory } from '../state/zones'
import { turnOrderRank } from '../dsl/trigger'                               

   
                                             
                                              
                                 
   
let lastDeathSnapshots: readonly DeathSnapshot[] = []

   
                                               
                                              
                                                     
   
export function pushDeathSnapshots(snaps: readonly DeathSnapshot[]): void {
  if (snaps.length > 0) lastDeathSnapshots = [...lastDeathSnapshots, ...snaps]
}

                                            
export function takeDeathSnapshots(): readonly DeathSnapshot[] {
  const out = lastDeathSnapshots
  lastDeathSnapshots = []
  return out
}

   
                                                 
  
                                       
                                                                
                                     
                                               
  
                                                        
                                                  
                        
  
                                
                                                   
                                                   
   
let lastDestroyed: readonly DestroyedRecord[] = []

   
                                             
                                          
                                             
   
export interface DestroyedRecord {
  readonly victim: DeathSnapshot
  readonly responsible: readonly PlayerId[]
     
                                         
                                                     
                              
     
  readonly byCards?: readonly string[]
}

export function pushDestroyed(recs: readonly DestroyedRecord[]): void {
  if (recs.length > 0) lastDestroyed = [...lastDestroyed, ...recs]
}

   
                                   
                                               
                                                        
                              
   
let damageBlame: Record<string, readonly PlayerId[]> = {}

   
                                               
                            
                                                           
                                   
                                                              
                           
                                            
   
let damageBlameCards: Record<string, readonly string[]> = {}

                                                           
export function noteDamageBlame(oid: ObjId, player: PlayerId, sourceDefId?: string): void {
  const cur = damageBlame[oid] ?? []
  if (!cur.includes(player)) damageBlame[oid] = [...cur, player]
                                                           
  if (sourceDefId !== undefined) {
    const cards = damageBlameCards[oid] ?? []
    if (!cards.includes(sourceDefId)) damageBlameCards[oid] = [...cards, sourceDefId]
  }
}

                                                                        
                                                                              
                                        
                                              
                                          

                                                  
export function blameFor(oid: ObjId): readonly PlayerId[] {
  return damageBlame[oid] ?? []
}

                                          
export function blameCardsFor(oid: ObjId): readonly string[] {
  return damageBlameCards[oid] ?? []
}

                                                              
export function clearDamageBlame(): void {
  damageBlame = {}
  damageBlameCards = {}                                    
}

   
                                              
                                             
   
export function takeDestroyed(): readonly DestroyedRecord[] {
  const out = lastDestroyed
  lastDestroyed = []
  return out
}

                                         
export const CLEANUP_ITERATION_CAP = 100

   
                                           
                                                                       
                                                            
                                                                
                                                           
   
export interface DestroyReplacement {
                                                               
  readonly id: string
                                     
  readonly sourceDefId: string
  readonly apply: (state: GameState, oid: ObjId) => GameState | null
     
                                                    
                                           
                       
                                                         
                                             
                                                    
                                               
                                                     
                                          
                                            
                                       
     
  readonly optional?: boolean
}

export interface CleanupHooks {
     
                                  
                                                     
                                                                   
                                                     
                                                      
     
  referenceMight?: (state: GameState, obj: GameObject) => number
     
                                                     
                                                      
                                    
     
  extraLethal?: (state: GameState, obj: GameObject) => boolean
                                              
  assignBattleRoles?: (state: GameState) => GameState
                                                   
  fireDeathTriggers?: (state: GameState, dyingOids: readonly ObjId[]) => GameState
                                                   
  loseUncontrolledBattlefields?: (state: GameState) => GameState
                                                 
  recallAndRemoveMisplaced?: (state: GameState) => GameState
     
                                               
                                                           
                                                   
     
  replaceDestroy?: (state: GameState, oid: ObjId) => GameState | null
     
                                                   
                                    
                                              
    
                                              
                    
                                            
                                                                 
                                             
                                                  
                                                           
                        
     
  replaceDestroyCandidates?: (state: GameState, oid: ObjId) => readonly DestroyReplacement[]
     
                                          
    
                                                
                                                  
                                                   
                                                  
                                                  
                                                                        
                                                      
                                                            
                                                          
     
  onWouldAsk?: (ask: DestroyAsk) => void
     
                                                
                                                        
                                                  
                                                  
     
  onWouldAskEventOrder?: (ask: ReplaceEventAsk) => void
}

   
                                           
                                                           
                                                              
   
   
                              
                                                           
   
export const DECLINE_REPLACEMENT = '§371.2:decline'

export function destroyOrderKey(oid: ObjId): string {
  return `§372:destroyOrder:${String(oid)}`
}

   
                                                 
                                                     
                                                  
   
export function replaceEventOrderKey(candidateId: string): string {
  return `§373:replaceEventOrder:${candidateId}`
}

                                                
export interface ReplaceEventAsk {
  readonly kind: 'replaceEvent'
  readonly key: string
  readonly controller: PlayerId
                                                  
  readonly candidateId: string
  readonly sourceDefId: string
                                
  readonly oids: readonly ObjId[]
}

   
                                                        
  
                                                
                                         
                                               
  
                                                     
                       
                                                                 
                                              
                                                            
                                                    
                                                                   
   
export function pendingReplaceEventAsk(state: GameState, hooks: CleanupHooks = {}): ReplaceEventAsk | null {
  const s = recomputeContinuous(state)
  const lethal = lethalOids(s, hooks)
  if (lethal.length < 2) return null
                                   
  const byCand = new Map<string, { readonly sourceDefId: string; readonly oids: ObjId[] }>()
  for (const oid of lethal) {
    for (const c of hooks.replaceDestroyCandidates?.(s, oid) ?? []) {
      const cur = byCand.get(c.id)
      if (cur) cur.oids.push(oid)
      else byCand.set(c.id, { sourceDefId: c.sourceDefId, oids: [oid] })
    }
  }
  for (const [id, { sourceDefId, oids }] of byCand) {
    if (oids.length < 2) continue
    if (s.ruleChoices[replaceEventOrderKey(id)] !== undefined) continue       
    const ctrls = new Set(oids.map((o) => s.objects[o]?.controller))
    if (ctrls.size !== 1) continue                              
    const controller = [...ctrls][0]
    if (controller === undefined) continue
    const first = oids[0]!
    const cand = (hooks.replaceDestroyCandidates?.(s, first) ?? []).find((c) => c.id === id)
    const after = cand?.apply(s, first)
    if (!after) continue
                                             
    const starved = oids.slice(1).some((o) => !(hooks.replaceDestroyCandidates?.(after, o) ?? []).some((c) => c.id === id))
    if (starved) return { kind: 'replaceEvent', key: replaceEventOrderKey(id), controller, candidateId: id, sourceDefId, oids }
  }
  return null
}

   
                           
                                          
                                                         
                                              
                                                   
   
export type DestroyChoice =
                                                     
  | { readonly kind: 'none' }
  /**
   * ★1027 §371.2.b **玩家明确选了"不生效"** ⇒ 照常摧毁,而且**不许回落老钩子**。
   * ⚠️ 与 `none` 分开是必须的:我第一版让拒绝也返回 `none`,而 `applyDestroyReplacement`
   *   对 `none` 的处理是「回落到老路径 `replaceDestroy`」—— 那条七连 `??` 串会**照样把替换应用上**,
   *   玩家的拒绝当场失效。测试逮住了(选了不用,人却没死)。
   */
  | { readonly kind: 'declined' }
  | { readonly kind: 'apply'; readonly chosen: DestroyReplacement }
  | { readonly kind: 'ask'; readonly key: string; readonly controller: PlayerId; readonly candidates: readonly { readonly id: string; readonly sourceDefId?: string }[] }

export function chooseDestroyReplacement(
  state: GameState,
  oid: ObjId,
  hooks: CleanupHooks,
  opts: { readonly canAsk?: boolean } = {},
): DestroyChoice {
  const list = hooks.replaceDestroyCandidates?.(state, oid)
  if (!list || list.length === 0) return { kind: 'none' }
                                                      
                                           
                                           
  const hasOptional = list.some((c) => c.optional === true)
  if (list.length === 1 && !hasOptional) return { kind: 'apply', chosen: list[0]! }                    
  const key = destroyOrderKey(oid)
  const answered = state.ruleChoices[key]
  if (answered === DECLINE_REPLACEMENT) return { kind: 'declined' }                           
  if (answered !== undefined) {
    const hit = list.find((c) => c.id === answered)
                                                        
    if (hit) return { kind: 'apply', chosen: hit }
  }
  const controller = state.objects[oid]?.controller
  if (opts.canAsk === true && controller !== undefined) {
    return {
      kind: 'ask', key, controller,
      candidates: [
        ...list.map((c) => ({ id: c.id, sourceDefId: c.sourceDefId })),
                                             
                                  
        ...(hasOptional ? [{ id: DECLINE_REPLACEMENT }] : []),
      ],
    }
  }
                                  
  return { kind: 'apply', chosen: list[0]! }
}

function refMight(state: GameState, obj: GameObject, hooks: CleanupHooks): number {
  if (hooks.referenceMight) return Math.max(0, hooks.referenceMight(state, obj))
  return effectiveMight(obj).reference                                      
}

                                                      
export function hasLethalDamage(damage: number, referenceMight: number): boolean {
  return damage > 0 && damage >= referenceMight
}

function lethalOids(state: GameState, hooks: CleanupHooks): ObjId[] {
  return Object.values(state.objects)
    // ★★ 只有【单位】会因致命伤害被摧毁(第240轮补):§142.4「伤害反映的是**单位**接近被摧毁的
    //   程度」、§142.4.b 的致命伤害定义通篇讲的也是单位。原先这里扫的是**全部物件**,
    //   于是 0 战力的装备/符文只要沾上 1 点伤害就会在清理时被摧毁(战力 0 + 伤害 1 = 致命)。
    //   ⚠️ 这是第240轮做帝国谕令时**顺手 probe 出来的**:样例装备挨一刀就没了,
    //   一开始还以为是谕令砍的,压根不是(铁律87 样例不纯)。
    // ★792【区域闸】只有【在场】的单位才会被致命伤害摧毁。
    //   §323.5 逐字:「所有被标记了致命伤害的单位视为被摧毁,并将**置于其所属者的废牌堆**」——
    //   已经躺在废牌堆里的牌无从「置于废牌堆」;§142.4 伤害衡量的是单位「接近被摧毁的程度」,
    //   只在场上才有意义。`isUnit`(cardTypes.ts:26)是**纯类型判据、与区域无关**,单靠它兜不住。
    //   ⚠️ 这不是理论洁癖,是【总闸修复的阻断器】:今天之所以不炸,纯粹是因为
    //   「摧毁→送废牌堆」那一步走了 discard→discard 的同区移动、顺手把伤害清成 0
    //   ——**一个 bug 在抵消另一个 bug**。第792轮实测:给 object.ts 打上「同区不换 oid」
    //   的补丁后,废牌堆里那个带伤单位会被反复判致命 ⇒ 清理不动点永不收敛 ⇒
    //   `runCleanupToFixpoint` 硬抛「未在 100 轮内收敛(§322 疑似死循环)」。
    //   所以这道闸必须**先于** §124 同区总闸落地。
    //   ㊟ `hooks.extraLethal`(UNL-118 巨龙那条)汇进的是同一条 filter ⇒ 一并被这道闸盖住,
    //     别再去 UNL-118 里单写一遍。
    .filter((o) => zoneCategory(state.zones[o.zone]?.kind ?? 'discard') === 'fielded')
    .filter((o) => isUnit(o) && (hasLethalDamage(o.damage, refMight(state, o, hooks)) || hooks.extraLethal?.(state, o) === true))              
    .map((o) => o.oid)
}

                                              
function judgeVictory(state: GameState): GameState {
  if (state.winner) return state
  for (const p of state.players) {
    const score = state.scores[p] ?? 0
    if (score < state.winTarget) continue
    const beatsAll = state.players.every((q) => q === p || (state.scores[q] ?? 0) < score)
    if (beatsAll) return { ...state, winner: p }
  }
  return state
}

   
                                                                 
                                                                     
   
export function runCleanupOnce(state: GameState, hooks: CleanupHooks = {}): GameState {
  let s = state
                                                              
                                                             
  s = judgeVictory(s)
  s = checkAltVictory(s)
                      
  if (hooks.assignBattleRoles) s = hooks.assignBattleRoles(s)
                          
                                                       
                                                        
                                                           
                                                
  const dying = lethalOids(s, hooks)
  if (dying.length > 0) {
                                                                
                                                      
                                                               
                                                
    lastDeathSnapshots = [...lastDeathSnapshots, ...collectLastRites(s, dying)]
    if (hooks.fireDeathTriggers) s = hooks.fireDeathTriggers(s, dying)
  }
                                                     
                                                    
                                          
  const postDeath: Record<string, ObjId> = {}
  const tokenGone = new Set<string>()                     
  const destroyedHere: DeathSnapshot[] = []
                                                    
                                                 
                                                     
                                            
                                                         
                                                                       
                                                    
                                   
                                                               
                                                   
                                         
                                                              
                           
                                                     
                                   
                                                 
                                                     
                                                                 
                                                                 
  const batch = lethalOids(s, hooks)
  const unreplaced: ObjId[] = []
                                                        
                                                           
                                                   
                                                     
                                                                           
                                                        
                                                                              
                                                      
                                                                                  
                                              
                                                               
                                                  
                                                         
                                                       
                                      
                                   
                                                 
                                                    
                                              
                                                      
                                                     
                                                     
                       
                                                  
                                                                
                                                               
                                                     
                                 
  const byTurnOrder = [...batch].sort((a, b) => {
    const ra = turnOrderRank(s, s.objects[a]?.controller ?? s.activePlayer)
    const rb = turnOrderRank(s, s.objects[b]?.controller ?? s.activePlayer)
    return ra - rb
  })
                                                          
  if (hooks.onWouldAskEventOrder !== undefined && batch.length >= 2) {
    const ask = pendingReplaceEventAsk(s, hooks)
    if (ask) hooks.onWouldAskEventOrder(ask)
  }
                                                          
                                             
                                                                   
  const answeredFirst = new Set<string>()
  for (const [k, v] of Object.entries(s.ruleChoices)) {
    if (k.startsWith('§373:replaceEventOrder:') && typeof v === 'string') answeredFirst.add(v)
  }
                                                       
                                                             
                                                      
                                                     
  const ordered = ((): readonly ObjId[] => {
    if (answeredFirst.size === 0) return byTurnOrder
    const groups: { readonly ctrl: PlayerId | undefined; readonly oids: ObjId[] }[] = []
    for (const oid of byTurnOrder) {
      const c = s.objects[oid]?.controller
      const last = groups[groups.length - 1]
      if (last && last.ctrl === c) last.oids.push(oid)
      else groups.push({ ctrl: c, oids: [oid] })
    }
    return groups.flatMap((g) => [
      ...g.oids.filter((o) => answeredFirst.has(String(o))),
      ...g.oids.filter((o) => !answeredFirst.has(String(o))),
    ])
  })()
  for (const oid of ordered) {
    if (!s.objects[oid]) continue
                                                          
                                                                    
                                                 
    const replaced = applyDestroyReplacement(s, oid, hooks)
    if (replaced) { s = noteReplacementSignals(s, replaced, oid); continue }
    unreplaced.push(oid)
  }
                       
  for (const oid of unreplaced) {
    const dyingObj = s.objects[oid]
    if (!dyingObj) continue
    const discardId = `discard:${dyingObj.owner}`
    const before = s.zones[discardId]?.contents ?? []
                                                  
                                                      
    destroyedHere.push(snapshotOnDeath(dyingObj, s))
    s = destroyToOwnerDiscard(s, oid)
    const landed = (s.zones[discardId]?.contents ?? []).filter((id) => !before.includes(id))
    if (landed[0]) postDeath[oid] = landed[0]
    // ★1219【缺陷 147】指示物在废牌堆里**留不下新 oid**(§186.1「移动到新区域后立即消失」,
    //   `state/mutations.ts` 那条 token 分支直接 delete)⇒ 记一笔「它确实被送进去了」,
    //   否则 §808.1.d.1 的存续校验会把它的绝念误判成作废。
    //   ⚠️ 这里在 `applyDestroyReplacement` **之后** —— 被替换成召回/放逐的在第一趟就 continue 了,
    //     走不到这一行 ⇒ 这个标记不会误放行它们。
    else if (isToken(dyingObj)) tokenGone.add(String(oid))
  }
  if (Object.keys(postDeath).length > 0 || tokenGone.size > 0) {
    lastDeathSnapshots = fillPostDeathOids(lastDeathSnapshots, postDeath, tokenGone)
  }
  if (destroyedHere.length > 0) {
                                                       
    pushDestroyed(fillPostDeathOids(destroyedHere, postDeath, tokenGone)
      // ★第521轮:两层归因一起带上(`byCards` 供「被**此法术**摧毁」那类后效回指具体卡)
      .map((victim) => ({ victim, responsible: blameFor(victim.oid), byCards: blameCardsFor(victim.oid) })))
  }
                              
  if (hooks.loseUncontrolledBattlefields) s = hooks.loseUncontrolledBattlefields(s)
                                      
  if (hooks.recallAndRemoveMisplaced) s = hooks.recallAndRemoveMisplaced(s)
  return s
}

   
                                                          
                                   
   
   
                                                           
  
                                                
                                                               
                                          
                                                                  
                                                     
                                              
   
   
                                                                                     
                                                           
                                                  
                                                                   
                                              
   
function noteReplacementSignals(before: GameState, after: GameState, victim: ObjId): GameState {
  const sigs: ReplacementSignal[] = []
  const gone = Object.keys(before.objects).filter((id) => after.objects[id] === undefined)
  for (const [zid, z] of Object.entries(after.zones)) {
    const bz = new Set<string>((before.zones[zid as keyof typeof before.zones]?.contents ?? []) as readonly string[])
    const added = (z.contents as readonly string[]).filter((id) => !bz.has(id))
    if (added.length === 0) continue
    if (zid.startsWith('exile:')) {
      for (const id of added) { const o = after.objects[id]; if (!o) continue; const from = before.objects[victim]?.zone; sigs.push({ kind: 'banished', card: o.oid, player: o.owner, defId: o.defId, ...(from === undefined ? {} : { from }) }) }
    } else if (zid.startsWith('discard:')) {
      for (const id of added) {
        const o = after.objects[id]; if (!o) continue
        const oldId = gone.find((g) => before.objects[g]?.defId === o.defId)
        const old = oldId === undefined ? undefined : before.objects[oldId]
        if (old) sigs.push({ kind: 'destroyed', card: o.oid, player: o.owner, defId: o.defId, victim: snapshotOnDeath(old, before) })
      }
    }
  }
  if (sigs.length === 0) return after
  return { ...after, pendingReplacementSignals: [...(after.pendingReplacementSignals ?? []), ...sigs] }
}

export function applyDestroyReplacement(
  state: GameState,
  oid: ObjId,
  hooks: CleanupHooks | undefined,
): GameState | null {
  if (hooks === undefined) return null
                                                
  const pick = chooseDestroyReplacement(state, oid, hooks, { canAsk: hooks.onWouldAsk !== undefined })
  if (pick.kind === 'apply') return pick.chosen.apply(state, oid)
                                               
  if (pick.kind === 'declined') return null
  if (pick.kind === 'none') return hooks.replaceDestroy?.(state, oid) ?? null
                                                   
                                     
  hooks.onWouldAsk?.(pick)
  const fallback = chooseDestroyReplacement(state, oid, hooks)
  return fallback.kind === 'apply' ? fallback.chosen.apply(state, oid) : null
}

                                                                             
export type DestroyAsk = Extract<DestroyChoice, { kind: 'ask' }>

   
                                                    
  
                                                     
                                                 
                                            
                                                         
                                                            
                                               
                                
                               
   
export function pendingDestroyAsk(state: GameState, hooks: CleanupHooks = {}): DestroyAsk | null {
                                                           
  const s = recomputeContinuous(state)
  for (const oid of lethalOids(s, hooks)) {
    const pick = chooseDestroyReplacement(s, oid, hooks, { canAsk: true })
    if (pick.kind === 'ask') return pick
  }
  return null
}

export function runCleanupToFixpoint(state: GameState, hooks: CleanupHooks = {}): GameState {
                                               
                                                    
  let s = recomputeContinuous(state)
  for (let i = 0; i < CLEANUP_ITERATION_CAP; i++) {
    const afterCleanup = runCleanupOnce(s, hooks)
    if (afterCleanup === s) return s                      
    s = recomputeContinuous(afterCleanup)                          
  }
  throw new Error(`清理不动点未在 ${CLEANUP_ITERATION_CAP} 轮内收敛(§322 疑似死循环)`)
}

   
                                                     
                                        
                                           
   
export function shouldDeferCleanup(isResolvingChainItem: boolean): boolean {
  return isResolvingChainItem
}
