                             
  
                            
                                     
                             
                                                
                                                
                                                         
                                                   
                                             
  
                                     
                                      
                                     
                            
                                                              
  
                                                                         
                                                  
  
                 
                                                                
                                                                                  
                                                  
                                                                               
                                                                             

import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { selfBattlefield } from '../../src/state/selfHere'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { Card } from '../../src/dsl/card'
import { spellNeedsTarget, type PlaySpec, type ActivatedSpec } from '../../src/loop/playSpec'                               
import type { ChoiceRequest } from '../../src/loop/chain'
import { addCosts, type Cost } from '../../src/state/runePool'                                                  
import type { PlayExtraCost } from '../../src/session/interactiveGame'                                      
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { topOfDeck, ownDiscard, recycleObjects } from '../../src/keywords/insight'
import { boundedPickOptions, decodePick } from './multi-pick'                        
import { voidSproutChoice, voidSproutRecycleEvents, voidSproutFilter, VOID_SPROUT_KEY } from './SFD-018'        
import { canPayFromState } from '../../src/game/economy'
import { controlsBattlefield } from '../../src/state/battlefieldControl'
import { banishedBy } from '../../src/actions/banish'
import { playedBy } from '../../src/loop/events'
import { canDormantSelf } from './dormant-self-cost'
import { applyEvents } from '../../src/loop/reduce'                                                    
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { equipDefaultTargets } from '../../src/keywords/equip'
import { effectiveMight } from '../../src/state/might'
import { fieldedUnits } from './activated-batch'
import { empowerCount, empowerLimitOf } from '../../src/keywords/empower'
import { CARD_COSTS } from '../cardCosts'
import { CARD_CATEGORIES } from '../cardCategories'
import { CARD_NAMES } from '../cardNames'                                 
import { playBannedFor } from './longtail-12'                                                     
import { extraPlayZonesFor } from './longtail-19'                                                                                      
import { spellLegalTargets } from '../../src/loop/playSpec'

                                                                                 
let specProvider: ((defId: string) => PlaySpec | undefined) | null = null
                                               
export function setPlayFromDeckSpecProvider(p: (defId: string) => PlaySpec | undefined): void {
  specProvider = p
}

                                                                             
                                                                            
                                                                           
   
                                                   
                                                                                            
                                                                       
                                                                                                                     
                                                                                   
                                                                                 
                                                           
   
export interface OptionalExtraInfo {
  readonly hasteCost?: Cost
                                                                                                            
  readonly bonus?: PlayExtraCost
}
let optionalExtraProvider: ((defId: string) => OptionalExtraInfo | undefined) | null = null
                                                  
                                                                                                                 
export function setOptionalExtraProvider(p: (defId: string) => OptionalExtraInfo | undefined): void {
  optionalExtraProvider = p
}
   
                                                        
                                                                                                       
                                                              
                                                                                 
                                                                        
   
export function canPayOptionalTotal(state: GameState, player: PlayerId, parts: readonly (Cost | undefined)[]): boolean { // ★1390 export:spawn-token-haste 收口点共用同一把尺子,别抄第二份
                                                                                  
                                                                  
                                                                
                                                                          
                                             
  let total: Cost = {}
  for (const c of parts) if (c !== undefined) total = addCosts(total, c)
  return canPayFromState(state, player, total)
}
                                                               
export const OPTIONAL_EXTRA_SUFFIX = ':extra'
export const optionalExtraKeyOf = (baseKey: string): string => `${baseKey}${OPTIONAL_EXTRA_SUFFIX}`
                                                
export const OPTIONAL_EXTRA_PAY = 'pay'
export const OPTIONAL_EXTRA_SKIP = 'skip'
                                                                               
export const OPTIONAL_BONUS_SUFFIX = ':bonus'
export const optionalBonusKeyOf = (baseKey: string): string => `${baseKey}${OPTIONAL_BONUS_SUFFIX}`
                                                                           
export const OPTIONAL_BONUS_PICK_SUFFIX = ':bonusPick'
export const optionalBonusPickKeyOf = (baseKey: string): string => `${baseKey}${OPTIONAL_BONUS_PICK_SUFFIX}`
                                                                                     
const SELF_SENTINEL = '$optionalExtra:self$'
   
                                                                                      
                                                                                                
                                                               
                                                                                        
                                                                                                            
                                                                                                        
                                                                                            
                                                                                                       
                                                                    
                                                                                                                        
                                                                                                                                    
   
export interface BonusUnderFreePlay {
  readonly cost?: Cost
  readonly pay: readonly GameEvent[]
  readonly post: readonly GameEvent[]
                                                                         
  readonly pick?: readonly { readonly id: string; readonly label: string }[]
                                                                                                 
                                                                                                            
  readonly grant?: readonly string[]
}
   
                                                                           
                                                                       
                                                                            
                                                                                                   
                                                              
   
export function bonusUnderFreePlay(state: GameState, player: PlayerId, spec: PlayExtraCost, choice?: string): BonusUnderFreePlay | undefined {
  if (spec.required === true) return undefined                             
  if (spec.discount !== undefined) return undefined                   
  if (spec.available !== undefined && !spec.available(state, player)) return undefined                                                
  const cands = spec.options?.(state, player)                            
  if (cands !== undefined && cands.length === 0) return undefined                    
  if (cands !== undefined && choice !== undefined && !cands.some((c) => c.id === choice)) return undefined                   
  const probe = cands === undefined ? undefined : (choice ?? cands[0]!.id)
  const postProbe = spec.events?.(player, SELF_SENTINEL, probe) ?? []
  const base = spec.cost !== undefined ? { cost: spec.cost } : {}
  if (cands !== undefined && choice === undefined) return { ...base, pay: [], post: [], pick: cands }                   
                                                                                          
                                                                      
  const grant = spec.destinations === undefined ? undefined : spec.destinations(state, player, choice)
  const post = cands === undefined ? postProbe : (spec.events?.(player, SELF_SENTINEL, choice) ?? [])
  const pay = spec.payEvents?.(state, player, choice) ?? []
  return { ...base, pay, post, ...(grant !== undefined ? { grant } : {}) }
}

                                                             
export function printedCost(defId: string): { mana: number; pips?: readonly (readonly string[])[] } {
  const row = CARD_COSTS[defId]
  if (!row) return { mana: 0 }
  return row.pips > 0
    ? { mana: row.mana, pips: Array.from({ length: row.pips }, () => [...row.colors]) }
    : { mana: row.mana }
}

   
                      
                                            
                                        
   
function isPermanentCard(defId: string): boolean {
  const cat = CARD_CATEGORIES[defId]
  return cat === 'unit' || cat === 'equipment'
}

   
                                                                  
                                                                           
                                                             
                                                           
                             
   
export function unitDestinations(
  state: GameState, player: PlayerId,
                                                                                   
                                                                                           
  grantBattlefield?: string | readonly string[],
                                                                 
                                                             
                                                                      
                                                                       
  defId?: string,
): readonly ZoneId[] {
  const out: ZoneId[] = [`base:${player}` as ZoneId]
  for (const z of zonesByKind(state, 'battlefield')) {
    if (controlsBattlefield(state, player, z.id as string)) out.push(z.id as ZoneId)
  }
  const grants = grantBattlefield === undefined ? [] : typeof grantBattlefield === 'string' ? [grantBattlefield] : grantBattlefield
  for (const g of grants) if (g !== '' && !out.includes(g as ZoneId)) out.push(g as ZoneId)
  if (defId === undefined) return out                                
                                                                              
                                                                                          
                                                                                               
                                                                         
                                                                                                 
  for (const z of extraPlayZonesFor(state, player, defId)) if (!out.includes(z as ZoneId)) out.push(z as ZoneId)
  return out.filter((z) => !playBannedFor(state, player, defId, z as string))
}

   
                                                                            
                                                                                                                            
                                                                                 
   
export function mergeGrants(a?: string | readonly string[], b?: readonly string[]): readonly string[] | undefined {
  const out: string[] = []
  for (const g of a === undefined ? [] : typeof a === 'string' ? [a] : a) if (g !== '' && !out.includes(g)) out.push(g)
  for (const g of b === undefined ? [] : b) if (g !== '' && !out.includes(g)) out.push(g)
  return out.length === 0 ? undefined : out
}

   
                                                                        
                                                                                          
                                                                                   
                                                                        
                                                                     
                                                                         
                                                                                        
                                                                                                     
                                                                        
                                                                                              
                                                                          
   
export function unitDestinationChoice(
  state: GameState, player: PlayerId, defId: string,
  base: { readonly itemId: string; readonly controller: PlayerId; readonly key: string; readonly prompt: string },
  grant?: readonly string[], // ★1367 付了可选额外费用才多出来的那几格(龙栖峰);收口点从 `bonusUnderFreePlay(...).grant` 取,别处别传
): ChoiceRequest | null {
  const dests = unitDestinations(state, player, grant, defId)
  if (dests.length <= 1) return null
  return { ...base, candidates: dests.map((z) => ({ id: z as string, label: z as string })) }
}

   
                                                       
  
                                                     
                                            
                                                            
                                                        
                                                               
                                                                                
                
  
                                                               
                                                                  
                                                          
                                                
                                                   
                                          
  
                                                    
                                      
                                                                             
                                                                  
                                                                      
                                                         
                                                        
                                                              
                                                                        
                                                  
  
                                                              
   
export function playFromEffectChoice(
  state: GameState, player: PlayerId, defId: string,
  base: { readonly itemId: string; readonly controller: PlayerId; readonly key: string; readonly prompt: string },
  chosen?: Readonly<Record<string, string>>,
  alsoDue?: Cost, // ★1363 调用方同一条结算里自己还要付的那笔(不朽凤凰 / 魔腾);问的尺子 = 付的尺子,两侧都按合计验
  granted?: string | readonly string[], // ★1374 调用方自己授权的落点(雷克塞「此处」);与龙栖峰 grant 取并集(mergeGrants),结算侧 optionalExtraResolve 同参
): ChoiceRequest | null {
                                            
                                               
                                                      
                                                                                      
                                                   
                                                
                                                                   
                                                            
                                                               
                                                      
                                                          
  if (unitDestinations(state, player, granted, defId).length === 0) return null
  const extraKey = optionalExtraKeyOf(base.key)
  const info = optionalExtraProvider?.(defId)
  let grant: readonly string[] | undefined = mergeGrants(granted)                                              
  if (info !== undefined) {
    const name = CARD_NAMES[defId] ?? defId
    const answers = [{ id: OPTIONAL_EXTRA_PAY, label: '支付' }, { id: OPTIONAL_EXTRA_SKIP, label: '不支付' }]
                                                                                   
                                                                  
    if (chosen?.[extraKey] === undefined && info.hasteCost !== undefined && canPayOptionalTotal(state, player, [alsoDue, info.hasteCost])) {
      return {
        itemId: base.itemId, controller: base.controller, key: extraKey,
        prompt: `${name}:是否支付[急速]费用(§805.1.a [1]+[C],以活跃状态进场)?(§355.1.a;此处打出无视其基础费用,但可选额外费用仍可支付 —— §356.1.b.3)`,
        candidates: answers,
      }
    }
                                                                                
                                                                
    const bonusKey = optionalBonusKeyOf(base.key)
    const pickKey = optionalBonusPickKeyOf(base.key)
    const spec = info.bonus
    const bonus = spec === undefined ? undefined : bonusUnderFreePlay(state, player, spec, chosen?.[pickKey])
                                                                                                  
                                                           
    const grantOnly = bonus !== undefined && bonus.grant !== undefined && bonus.pay.length === 0 && bonus.post.length === 0 && bonus.pick === undefined
    if (spec !== undefined && bonus !== undefined && !(grantOnly && chosen?.[base.key] !== undefined)) {
      const hastePaid = chosen?.[extraKey] === OPTIONAL_EXTRA_PAY ? info.hasteCost : undefined
      const affordable = canPayOptionalTotal(state, player, [alsoDue, hastePaid, bonus.cost])
      if (chosen?.[bonusKey] === undefined && affordable) {
        return {
          itemId: base.itemId, controller: base.controller, key: bonusKey,
          prompt: `${name}:是否支付可选额外费用「${spec.label}」?(§355.1.a / §356.2.b;此处打出无视其基础费用,但可选额外费用仍可支付 —— §356.1.b.3)`,
          candidates: answers,
        }
      }
                                                                                           
      if (chosen?.[bonusKey] === OPTIONAL_EXTRA_PAY && bonus.pick !== undefined && affordable) {
        return {
          itemId: base.itemId, controller: base.controller, key: pickKey,
          prompt: `${name}:「${spec.label}」—— 选哪一个?`,
          candidates: bonus.pick,
        }
      }
                                                                               
                                                                                            
      if (chosen?.[bonusKey] === OPTIONAL_EXTRA_PAY && bonus.pick === undefined && affordable && bonus.grant !== undefined) grant = mergeGrants(granted, bonus.grant)
    }
  }
                                           
                                                                       
                                                                          
                                                          
  if (chosen?.[base.key] !== undefined) return null
  return unitDestinationChoice(state, player, defId, base, grant)
}

   
                                                                                          
                                                                                                         
                                                                                                            
                                                                     
                                                                                            
   
export interface OptionalExtraOutcome {
  readonly ready: boolean
  readonly bonus: boolean
  readonly pre: readonly GameEvent[]
                                                                                                                              
  readonly preRest: readonly GameEvent[]
                                                                                                                        
                                                                                      
  readonly extraCost?: Cost
  readonly post: readonly GameEvent[]
  readonly flags: { readonly ready?: true; readonly bonus?: true; readonly bonusChoice?: string }
                                                    
                                                                                                                                           
  readonly grant?: readonly string[]
}
   
                                                                      
                                                                                                       
                                                                                               
                                                                                   
                                                                                 
                                              
                                                                      
                                                                     
                                                                
                                                                                                        
                                                                                                    
                                                                             
   
export function optionalExtraResolve(
  state: GameState, player: PlayerId, defId: string, baseKey: string,
  chosen: Readonly<Record<string, string>> | undefined,
  alsoDue?: Cost, // ★1363 调用方同一条结算里自己还要付的那笔(见 canPayOptionalTotal);没有就别传
  granted?: string | readonly string[], // ★1374 调用方自己授权的落点(雷克塞「此处」);交出的 `grant` = 它 ∪ 龙栖峰 grant(与问侧同一份)
): OptionalExtraOutcome {
  const own = mergeGrants(granted)
  const none: OptionalExtraOutcome = { ready: false, bonus: false, pre: [], preRest: [], post: [], flags: {}, ...(own !== undefined ? { grant: own } : {}) }
  const info = optionalExtraProvider?.(defId)
  if (info === undefined) return none               
                                          
  const hasteOk = chosen?.[optionalExtraKeyOf(baseKey)] === OPTIONAL_EXTRA_PAY && info.hasteCost !== undefined
    && canPayOptionalTotal(state, player, [alsoDue, info.hasteCost])
                                                                                
                                                  
  const bonus = chosen?.[optionalBonusKeyOf(baseKey)] === OPTIONAL_EXTRA_PAY && info.bonus !== undefined
    ? bonusUnderFreePlay(state, player, info.bonus, chosen?.[optionalBonusPickKeyOf(baseKey)]) : undefined
                                               
  const bonusOk = bonus !== undefined && bonus.pick === undefined && canPayOptionalTotal(state, player, [alsoDue, hasteOk ? info.hasteCost : undefined, bonus.cost])
  if (!hasteOk && !bonusOk) return none
  const pre: GameEvent[] = []
  const preRest: GameEvent[] = []                                                                  
  let extraCost: Cost | undefined
  if (hasteOk) { pre.push({ kind: 'spend', player, cost: info.hasteCost! }); extraCost = info.hasteCost! }
  let post: readonly GameEvent[] = []
  if (bonusOk) {
    if (bonus!.cost !== undefined) {
      pre.push({ kind: 'spend', player, cost: bonus!.cost })
      extraCost = extraCost !== undefined ? addCosts(extraCost, bonus!.cost) : bonus!.cost
    }
    pre.push(...bonus!.pay); preRest.push(...bonus!.pay)                                 
                                                                                                        
                                                         
    const mark = bonus!.post.filter((e) => e.kind === 'markNextUnitReady')
    pre.push(...mark); preRest.push(...mark)
    post = bonus!.post.filter((e) => e.kind !== 'markNextUnitReady')
  }
                                                                                      
  const pickAnswer = chosen?.[optionalBonusPickKeyOf(baseKey)]
  const flags = {
    ...(hasteOk ? { ready: true as const } : {}),
    ...(bonusOk ? { bonus: true as const } : {}),
    ...(bonusOk && pickAnswer !== undefined ? { bonusChoice: pickAnswer } : {}),
  }
  const grant = mergeGrants(granted, bonusOk ? bonus!.grant : undefined)
  return { ready: hasteOk, bonus: bonusOk, pre, preRest, post, flags,
    ...(grant !== undefined ? { grant } : {}),
    ...(extraCost !== undefined ? { extraCost } : {}) }
}

   
                                                                                                     
                                                                                                                                                                       
                                                                                                                   
                                                                                                               
                                                                                                   
                                                                                             
   
export function playUnitExtras(x: OptionalExtraOutcome): { readonly readyOnEntry?: true; readonly bonus?: true; readonly bonusChoice?: string; readonly extraCost?: Cost } {
  const { ready, ...bonusFlags } = x.flags
  return { ...(ready === true ? { readyOnEntry: true as const } : {}), ...bonusFlags, ...(x.extraCost !== undefined ? { extraCost: x.extraCost } : {}) }
}

                                                                                              
                                                                                                          
                                                                 
export function unitDestinationResolve(state: GameState, player: PlayerId, defId: string, answer?: string, grant?: readonly string[]): ZoneId | undefined {
  const dests = unitDestinations(state, player, grant, defId)
  if (dests.length === 0) return undefined
  return answer !== undefined && dests.includes(answer as ZoneId) ? (answer as ZoneId) : dests[0]
}

                                                                
                                                                   
                                                               
             
                                                       
                                          
                                                     
                         
                                                                 
  
                                                                     
                                                                              
                                                                      
                                                      
                                                   
                                                                     
                                       
                                                                  
                                                                               
                                                                                
                                                               
  
                                                            
                                                                
                                                                      
                                      
  
                                                
                                                       
                                      
                                         
                                                          
export const SFD_170_CARD_EFFECT =
  '当我进攻时，你可以选择展示你主牌堆顶部的两张牌。你可以选择放逐其中一张，然后将其打出。如果打出的卡牌为单位，则可以选择将其打出到此处。回收其余的卡牌。'

const REKSAI_LOOK = 2

                        
function attackedBattlefield(ev: GameEvent): string | undefined {
  return ev.kind === 'attack' ? ev.battlefield : undefined
}

                                                                         
                                     
                                                        

                                                                   

                                                               
  
                                                                  
                                                      
                 
                                                                                 
                            
                                                            
                                                                
  
                                                                
                                                                          
                                                      
                                             

                          
export interface BanishPlayShape {
                                 
  readonly defId: string
                                                        
  readonly reduceMana: number
                                                                         
  readonly accepts: 'unit' | 'permanent'
     
                                                                  
                                                            
     
  readonly acceptsSpells?: boolean
                                                
  readonly hereFromSelf?: boolean
     
                                                                
                                                                     
                                                
                                                    
                                                                 
     
  readonly freeAll?: boolean
     
                                                              
                                                                       
                                                           
                                                              
                                                              
     
  readonly freeMana?: boolean
     
                                                          
                                               
                                           
                                  
     
  readonly playerIsOwner?: boolean
}

                                                
export function banishPlayCost(defId: string, reduceMana: number): { mana: number; pips?: readonly (readonly string[])[] } {
  const printed = printedCost(defId)
  const mana = Math.max(0, printed.mana - reduceMana)
  return printed.pips === undefined ? { mana } : { mana, pips: printed.pips }
}

   
                                        
                                                
                                                                    
                             
                                                                
                                                                         
                                                  
   
export function freeManaCost(defId: string): { mana: number; pips?: readonly (readonly string[])[] } {
  const printed = printedCost(defId)
  return printed.pips === undefined ? { mana: 0 } : { mana: 0, pips: printed.pips }
}

                                         
export function banishPlayable(state: GameState, controller: PlayerId, defId: string, shape: BanishPlayShape): boolean {
                                                     
                                                              
                                                     
  const isSpell = CARD_CATEGORIES[defId] === 'spell'
  const okKind = isSpell
    ? shape.acceptsSpells === true
    : shape.accepts === 'unit'
      ? CARD_CATEGORIES[defId] === 'unit'
      : isPermanentCard(defId)         
  if (!okKind) return false
  if (shape.freeAll === true) return true                          
                                                           
  if (shape.freeMana === true) return canPayFromState(state, controller, freeManaCost(defId))
  return canPayFromState(state, controller, banishPlayCost(defId, shape.reduceMana))
}

   
                                                                      
                                                                         
                                                 
   
export function makeBanishPlayRelay(shape: BanishPlayShape, selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `${shape.defId}:relay:${selfOid}`
  const here = (state: GameState): string | undefined =>
    shape.hereFromSelf === true ? selfBattlefield(state, selfOid) : undefined
                                                                                              
  const relayDue = (defId: string): Cost =>
    shape.freeAll === true ? { mana: 0 } : shape.freeMana === true ? freeManaCost(defId) : banishPlayCost(defId, shape.reduceMana)
  return compileTrigger({
    id, rawId: true, sourceDefId: shape.defId,
    event: 'banished', by: 'any', // 认的是"我放逐的",不是"我引发的这批"(铁律153)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        const card = (ev as unknown as { card?: ObjId }).card
        return card !== undefined && banishedBy(state, selfOid).includes(card)
      },
    }],
    nextChoice: (state, ev, chosen) => {
      const card = (ev as unknown as { card?: ObjId }).card
      const defId = card === undefined ? undefined : state.objects[card]?.defId
      if (defId === undefined) return null
                                                             
                                                        
      const actor = shape.playerIsOwner === true
        ? (card !== undefined ? state.objects[card]?.owner ?? controller : controller)
        : controller
      if (CARD_CATEGORIES[defId] === 'spell') {
        if (shape.acceptsSpells !== true) return null
        if (chosen['spellTarget'] !== undefined) return null
        if (!banishPlayable(state, actor, defId, shape)) return null
        const spec = specProvider?.(defId)
                                                                                        
                                                                                       
        if (!spec || !spellNeedsTarget(spec)) return null           
        const targets = spellLegalTargets(spec, state, actor)
        if (targets.length === 0) return null                        
        return {
          itemId: `trig:${id}`, controller: actor, key: 'spellTarget',
          prompt: `${shape.defId}:为该法术选择目标`,
                                                                                                                                                                        
          candidates: targets.map((t) => ({ id: t, label: t })),
        }
      }
                                        
      if (CARD_CATEGORIES[defId] !== 'unit') return null
      if (!banishPlayable(state, actor, defId, shape)) return null
                                                                                                    
                                                                                        
                                                                               
                                                          
      return playFromEffectChoice(state, actor, defId, { itemId: `trig:${id}`, controller: actor, key: 'to', prompt: `${shape.defId}:把它打出到哪里?` },
        chosen, relayDue(defId), here(state))
    },
    effect: (state, ev, chosen): readonly GameEvent[] => {
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o) return []
                                          
                                                    
      const actor = shape.playerIsOwner === true ? o.owner : controller
      if (!banishPlayable(state, actor, o.defId, shape)) return []
                                                                         
                                                                              
      if (CARD_CATEGORIES[o.defId] === 'spell') {
        const spec = specProvider?.(o.defId)
                                                                                            
                                                                               
        if (spec === undefined) return []
                                                                              
                                                       
        const target = chosen?.['spellTarget']
        if (spellNeedsTarget(spec) && (target === undefined || !spellLegalTargets(spec, state, actor).includes(target))) return []
        return [{ kind: 'playSpellFromZone', player: actor, card: card as ObjId,
          ...(shape.freeAll === true ? { freeAll: true } : {}), // ★642「无视费用」全免档
          ...(shape.freeMana === true ? { freeMana: true } : {}), // ★646 半免档(mana 0/pip 原样)
          ...(spellNeedsTarget(spec) && target !== undefined ? { target } : {}) } as GameEvent]
      }
      const isEquip = CARD_CATEGORIES[o.defId] === 'equipment'
      const dests = unitDestinations(state, actor, here(state), o.defId)               
      if (dests.length === 0) return []                                             
                                                                                                 
                                                                      
                                                                                                 
                                                                         
      const cost = relayDue(o.defId)
      const x = optionalExtraResolve(state, actor, o.defId, 'to', chosen, cost, here(state))
                                                                                   
      const to = isEquip ? (`base:${actor}` as ZoneId) : unitDestinationResolve(state, actor, o.defId, chosen?.['to'], x.grant)
      if (to === undefined) return []
                                                                                                                       
                                                         
      if (shape.freeAll === true) {
        return [...x.pre, { kind: 'playFree', obj: card as ObjId, player: actor, to, ...x.flags, ...(isEquip ? { ready: true } : {}) } as GameEvent, ...x.post]
      }
      return [...x.preRest, {
        kind: 'playUnit',
        unit: card as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: actor,
        play: {
          card: card as ObjId, to,
                                                                                  
          cost,
                                                       
                                                                         
          by: selfOid,
          ...playUnitExtras(x),
          ...(isEquip ? { readyOnEntry: true } : {}),
        },
      } as GameEvent, ...x.post]
    },
  }, selfOid, controller)
}

                                                          
export const SFD_170_SHAPE: BanishPlayShape = {
  defId: 'SFD-170', reduceMana: 0, accepts: 'permanent', hereFromSelf: true, acceptsSpells: true,
}

                                     
export function makeRekSaiTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                              
                                                      
                                                     
                                                  
  const effect = compileEffect({
    then: [
      {
                                                              
                                                               
        op: 'custom',
        emit: (ctx): readonly GameEvent[] => {
                                                        
          const rec = voidSproutRecycleEvents(ctx.state, ctx.controller, ctx.chosen)
          const shown = voidSproutFilter(ctx.chosen, ctx.state, ctx.controller, topOfDeck(ctx.state, ctx.controller, REKSAI_LOOK))
          return shown.length > 0 ? [...rec, { kind: 'revealed', player: ctx.controller, cards: shown } as GameEvent] : [...rec]
        },
      },
      {
                                                     
                                                              
        op: 'custom',
        emit: (ctx): readonly GameEvent[] => {
          const pick = ctx.chosen['play']
          if (!pick || pick === 'skip') return []
          if (!ctx.state.objects[pick as ObjId]) return []
          return [{ kind: 'banish', target: pick as ObjId, by: selfOid } as GameEvent]
        },
      },
      {
                                                 
                                                            
        op: 'insight',
        count: (ctx) => {
                                           
          const basis = ctx.chosen[VOID_SPROUT_KEY] === 'recycle' ? REKSAI_LOOK - 1 : REKSAI_LOOK
          const pick = ctx.chosen['play']
          return pick && pick !== 'skip' ? basis - 1 : basis
        },
        recycleAll: true,
      },
    ],
  })

  const id = `SFD-170:play:${selfOid}`
  const ask: Trigger['nextChoice'] = (state, _ev, chosen) => {
    const base = { itemId: `trig:${id}`, controller }
                                                         
                                                               
                                                        
                                                      
                                                          
                                            
    const vq = voidSproutChoice(state, controller, chosen)
    if (vq) return { ...vq, itemId: base.itemId }
                         
                                                           
                                              
    if (chosen['play'] === undefined) {
      const cands = voidSproutFilter(chosen, state, controller, topOfDeck(state, controller, REKSAI_LOOK))                  
      if (cands.length === 0) return null
      return {
        ...base, key: 'play', prompt: '雷克塞:放逐其中一张并将其打出?',
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: 'skip', label: '不放逐' },
        ],
      }
    }
                                                        
    return null
  }

  return compileTrigger({
    id, rawId: true, sourceDefId: 'SFD-170',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」
                                                      
                                                    
                                                              
                                                            
                                             
                                                                 
                                                
    mayChoose: true,
    nextChoice: ask,
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                                 
export function makeRekSaiPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(SFD_170_SHAPE, selfOid, controller)
}

export const SFD_170: Card = {
  id: 'SFD-170', cardNo: 'SFD·170/221', name: '雷克塞', category: 'unit',
  domains: ['yellow'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时可展示顶2张、放逐其中一张并打出(单位可打到此处),其余回收(两条触发接力)' }],
}

                                                                         
                                                                   
                                                   
  
                                            
                                                                     
                                                               
                                                                    
                                                    
                                                       
                                                                         
                     
                                                      
export const OGN_196_CARD_EFFECT =
  '当你打出我时，你可以选择从你的废牌堆中打出一名单位，无视其法力费用（仍需支付所有符能费用）。'

   
                                                                
                                                                        
                                                                    
                                                     
                                                   
   
export function soulEaterCost(defId: string): { mana: number; pips?: readonly (readonly string[])[] } {
  return freeManaCost(defId)
}

   
                                  
                                      
                                                                  
                                                      
                                      
   
export function discardPlayCandidates(
  state: GameState, controller: PlayerId,
  costOf: (defId: string) => { mana: number; pips?: readonly (readonly string[])[] },
  accepts?: (defId: string) => boolean,
  from: 'discard' | 'hand' = 'discard',
): readonly ObjId[] {
                                                    
                                                          
                                                    
  const zone = state.zones[`${from}:${controller}` as ZoneId]
  return (zone?.contents ?? []).filter((oid) => {
    const defId = state.objects[oid]?.defId
    if (defId === undefined || CARD_CATEGORIES[defId] !== 'unit') return false
                                                          
                                              
                                                                
                                                          
    if (accepts !== undefined && !accepts(defId)) return false
    return canPayFromState(state, controller, costOf(defId))                              
  })
}

   
                
                                                 
                                                 
   
export function soulEaterCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
                                                                
  return discardPlayCandidates(state, controller, soulEaterCost)
}

   
                                                                
                                                                   
                                         
   
export function handPlayCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return discardPlayCandidates(state, controller, soulEaterCost, undefined, 'hand')
}

                                                     
export function makeSoulEaterTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-196:play:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'OGN-196',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【我】时」
                                                                     
                                                         
                                                                
                                                
                                            
                                                                     
    mayChoose: true,
    nextChoice: (state, _ev, chosen) => {
      const base = { itemId: `trig:${id}`, controller }
                        
      if (chosen['pick'] === undefined) {
        const cands = soulEaterCandidates(state, controller)
          .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                                     
        if (cands.length === 0) return null                              
        return {
          ...base, key: 'pick', prompt: '咂魂者:从你的废牌堆中打出一名单位?(无视法力费用,符能照付)',
          isTarget: true, // ★1771 §355.10:废牌堆是**公开区域**(§355.10.a.1)⇒ 从中选定具体一张是目标选取(§355.9.a 举例同源)
          candidates: [
            ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          ],
        }
      }
                                                                                                              
                                                                              
                                                                            
      const pick = chosen['pick']
      if (pick === undefined) return null                       
      const pickDefId = state.objects[pick as ObjId]?.defId ?? ''
      return playFromEffectChoice(state, controller, pickDefId, { ...base, key: 'to', prompt: '咂魂者:把它打出到哪里?' }, chosen, soulEaterCost(pickDefId))
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.['pick']
      if (pick === undefined) return []            
      const o = state.objects[pick as ObjId]
                                            
      if (!o || !soulEaterCandidates(state, controller).includes(pick as ObjId)) return []
                                                                                           
                                                                                           
      const cost = soulEaterCost(o.defId)
      const x = optionalExtraResolve(state, controller, o.defId, 'to', chosen, cost)
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.['to'], x.grant)
      if (dest === undefined) return []
      return [...x.preRest, {
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
        play: { card: pick as ObjId, to: dest, cost, ...playUnitExtras(x) },
      } as GameEvent, ...x.post]
    },
  }, selfOid, controller)
}

                                                                    
                                         
                                                            
  
                                                       
                                                          
                                                   
                                                       
                              
                                                            
                                                     
                                                                
                                                                 
                                                            
                                                          

                                                     
export const OGN_226_MAX_MANA = 3
export const OGN_226_MAX_PIPS = 1

                                             
export const ghostMotherCost = (): { mana: number } => ({ mana: 0 })

                                                  
export function ghostMotherAffordable(defId: string): boolean {
  const printed = printedCost(defId)
  return printed.mana <= OGN_226_MAX_MANA && (printed.pips?.length ?? 0) <= OGN_226_MAX_PIPS
}

                                                    
export function ghostMotherCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return discardPlayCandidates(state, controller, ghostMotherCost, ghostMotherAffordable)
}

export const OGN_226_CARD_EFFECT =
  '当你打出我时，你可以选择从你的废牌堆中打出一名费用不高于{{3}}且不高于{{A}}的单位，无需支付打出费用。'

                                                     
export function makeGhostMotherTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-226:play:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'OGN-226',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【我】时」
                                                                     
                                                         
                                                                
                                                
                                            
                                                                     
    mayChoose: true,
    nextChoice: (state, _ev, chosen) => {
      const base = { itemId: `trig:${id}`, controller }
                                     
      if (chosen['pick'] === undefined) {
        const cands = ghostMotherCandidates(state, controller)
          .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                                     
        if (cands.length === 0) return null                              
        return {
          ...base, key: 'pick', prompt: '幽灵主母:从废牌堆免费打出一名单位?(费用不高于3且符能不超过1)',
          isTarget: true, // ★1771 §355.10:废牌堆是**公开区域**(§355.10.a.1)⇒ 从中选定具体一张是目标选取(§355.9.a 举例同源)
          candidates: [
            ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          ],
        }
      }
                                                                                                           
                                                                                                               
      const pick = chosen['pick']
      if (pick === undefined) return null                       
      const pickDefId = state.objects[pick as ObjId]?.defId ?? ''
      return playFromEffectChoice(state, controller, pickDefId, { ...base, key: 'to', prompt: '幽灵主母:把它打出到哪里?' }, chosen, ghostMotherCost())
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.['pick']
      if (pick === undefined) return []            
      const o = state.objects[pick as ObjId]
                                            
      if (!o || !ghostMotherCandidates(state, controller).includes(pick as ObjId)) return []
                                                                                                       
      const cost = ghostMotherCost()
      const x = optionalExtraResolve(state, controller, o.defId, 'to', chosen, cost)
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.['to'], x.grant)
      if (dest === undefined) return []
      return [...x.preRest, {
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
        play: { card: pick as ObjId, to: dest, cost, ...playUnitExtras(x) },
      } as GameEvent, ...x.post]
    },
  }, selfOid, controller)
}

export const OGN_226: Card = {
  id: 'OGN-226', cardNo: 'OGN·226/298', name: '幽灵主母', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当你打出我时,可从废牌堆免费打出一名费用≤3且符能≤1的单位' }],
}

export const OGN_196: Card = {
  id: 'OGN-196', cardNo: 'OGN·196/298', name: '咂魂者', category: 'unit',
  domains: ['purple'], energy: 8, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当你打出我时,可从废牌堆打出一名单位,无视其法力费用(符能照付)' }],
}

                                                                       
                                         
                                                          
  
                                               
                                                 
                                                                               
                                                                 
                                                  
                                                       
                                                            
                                            
                                              
export const OGN_062_CARD_EFFECT =
  '查看你主牌堆顶部的五张牌。你可以选择从中放逐一名单位，然后将其打出，其费用减少{{5}}。回收其余的卡牌。'

                     
export const OGN_062_LOOK = 5
                         
export const OGN_062_REDUCE = 5
                
export const OGN_062_PICK = 'reinforcePick'
                
export const OGN_062_SKIP = 'skip'

                                              
export const OGN_062_SHAPE: BanishPlayShape = {
  defId: 'OGN-062', reduceMana: OGN_062_REDUCE, accepts: 'unit',
}

   
                 
                                                     
                                                   
   
export function reinforceCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return topOfDeck(state, controller, OGN_062_LOOK).filter((oid) => {
    const defId = state.objects[oid]?.defId
    return defId !== undefined && CARD_CATEGORIES[defId] === 'unit'
  })
}

export const OGN_062_SPEC: PlaySpec = {
  defId: 'OGN-062', cardNo: 'OGN·062/298', name: '增援',
  kind: 'spell',
  cost: { mana: 5 }, // 卡面 5 法力 0 pip(㊶ 与 CARD_COSTS 对得上,用例里有断言)
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[OGN_062_PICK] !== undefined) return null
      const cands = reinforceCandidates(state, controller)
      if (cands.length === 0) return null                          
      return {
        itemId: `spell:${movedCardOid}:OGN-062`,
        controller,
        key: OGN_062_PICK,
        prompt: `增援:放逐顶五张里的哪名单位并打出(费用减少 ${OGN_062_REDUCE} 点法力)`,
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: OGN_062_SKIP, label: '不放逐' },
        ],
      }
      // ⚠️ 落点【不在这里问】—— 那张牌此刻还没被放逐,新 oid 还不存在。交给句②(铁律240)。
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[OGN_062_PICK]
      const took = pick !== undefined && pick !== OGN_062_SKIP
        && reinforceCandidates(state, controller).includes(pick as ObjId)
      const out: GameEvent[] = []
                                                          
      if (took) out.push({ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent)
                                                 
                                                        
      out.push({
        kind: 'insight', player: controller,
        count: took ? OGN_062_LOOK - 1 : OGN_062_LOOK, recycleAll: true,
      } as GameEvent)
      return out
    },
}

                                         
export function makeReinforcePlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(OGN_062_SHAPE, selfOid, controller)
}

export const OGN_062: Card = {
  id: 'OGN-062', cardNo: 'OGN·062/298', name: '增援', category: 'spell',
  domains: ['green'], energy: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '看顶五张,可放逐其中一名单位并打出(费用减5法力),其余回收' }],
}

                                                                     
                                                             
                                                            
                                                         
                                                        
  
                                                            
                                                               
                                                 
                                                   
                                       
                                                            
                                      
                                                        
export const SFD_188_CARD_EFFECT =
  '展示你主牌堆顶部的两张牌。你可以选择放逐其中一张，然后将其打出，其费用减少{{2}}。抽取其中未被放逐的卡牌。'

                      
export const SFD_188_LOOK = 2
                         
export const SFD_188_REDUCE = 2
                
export const SFD_188_PICK = 'voidRushPick'
                
export const SFD_188_SKIP = 'skip'

                                                   
export const SFD_188_SHAPE: BanishPlayShape = {
  defId: 'SFD-188', reduceMana: SFD_188_REDUCE, accepts: 'permanent',
}

   
                            
                                                               
   
export function voidRushCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return topOfDeck(state, controller, SFD_188_LOOK)
}

export const SFD_188_SPEC: PlaySpec = {
  defId: 'SFD-188', cardNo: 'SFD·188/221', name: '虚空猛冲',
  kind: 'spell',
                                                                 
  cost: { mana: 2, pips: [['red', 'yellow']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[SFD_188_PICK] !== undefined) return null
      const cands = voidRushCandidates(state, controller)
      if (cands.length === 0) return null              
      return {
        itemId: `spell:${movedCardOid}:SFD-188`,
        controller,
        key: SFD_188_PICK,
        prompt: `虚空猛冲:放逐展示出来的哪一张并打出(费用减少 ${SFD_188_REDUCE} 点法力)`,
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: SFD_188_SKIP, label: '不放逐' },
        ],
      }
      // ⚠️ 落点【不在这里问】—— 那张牌此刻还没被放逐,新 oid 还不存在。交给句②(铁律240)。
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const shown = voidRushCandidates(state, controller)
      const pick = chosen?.[SFD_188_PICK]
      const took = pick !== undefined && pick !== SFD_188_SKIP && shown.includes(pick as ObjId)
      const out: GameEvent[] = []
                                                          
      if (took) out.push({ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent)
                                               
                                          
                                                              
      const drawCount = shown.length - (took ? 1 : 0)
      if (drawCount > 0) out.push({ kind: 'draw', player: controller, count: drawCount } as GameEvent)
      return out
    },
}

                                            
export function makeVoidRushPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(SFD_188_SHAPE, selfOid, controller)
}

export const SFD_188: Card = {
  id: 'SFD-188', cardNo: 'SFD·188/221', name: '虚空猛冲', category: 'spell',
  domains: ['red', 'yellow'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '展示顶两张,可放逐其中一张并打出(费用减2法力),未被放逐的抽走' }],
}

                                                                        
                                         
                                       
  
                                              
                                                                     
                                                                             
                                                                      
                                                      
                                                
                                                               
                                                                   
                                                                 
                                                                            
                                                                 
export const OGN_198_CARD_EFFECT =
  '从你的废牌堆中打出一名单位，无视其法力费用（仍需支付所有符能费用）。'

               
export const OGN_198_PICK = 'soulNightPick'
              
export const OGN_198_TO = 'soulNightTo'

export const OGN_198_SPEC: PlaySpec = {
  defId: 'OGN-198', cardNo: 'OGN·198/298', name: '蚀魂夜',
  kind: 'spell',
                                                
  cost: { mana: 6, pips: [['purple'], ['purple']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
                                                                                                           
                                               
                                                                     
                                                                                 
                                                                        
                                      
  makeConfirmChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                         
      if (chosen[OGN_198_PICK] !== undefined) return null
      const cands = soulEaterCandidates(state, controller)
        .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                                     
                                   
      if (cands.length === 0) return null
      return {
        itemId: `spell:${movedCardOid}:OGN-198`, controller, key: OGN_198_PICK,
        prompt: '蚀魂夜:从你的废牌堆中打出哪一名单位(无视法力费用,符能照付)',
        isTarget: true, // ★1771 §355.10:废牌堆是**公开区域**(§355.10.a.1)⇒ 从中选定具体一张是目标选取(§355.9.a 举例同源)
        candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    },
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                                
      if (chosen[OGN_198_PICK] === undefined) return null
                                                                                                  
                                                                                  
      const pickDefId = state.objects[chosen[OGN_198_PICK] as ObjId]?.defId ?? ''
      return playFromEffectChoice(state, controller, pickDefId, { itemId: `spell:${movedCardOid}:OGN-198`, controller, key: OGN_198_TO, prompt: '蚀魂夜:把它打出到哪里?' }, chosen, soulEaterCost(pickDefId))
    },
  makeResolve:
    (_ctx: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const controller = _ctx.controller
      const pick = chosen?.[OGN_198_PICK]
      if (pick === undefined) return []
      const o = state.objects[pick as ObjId]
                                            
      if (!o || !soulEaterCandidates(state, controller).includes(pick as ObjId)) return []
                                                                                                     
      const cost = soulEaterCost(o.defId)
      const x = optionalExtraResolve(state, controller, o.defId, OGN_198_TO, chosen, cost)
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[OGN_198_TO], x.grant)
      if (dest === undefined) return []
      return [...x.preRest, {
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
        play: { card: pick as ObjId, to: dest, cost, ...playUnitExtras(x) },
      } as GameEvent, ...x.post]
    },
}

export const OGN_198: Card = {
  id: 'OGN-198', cardNo: 'OGN·198/298', name: '蚀魂夜', category: 'spell',
  domains: ['purple'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '从废牌堆打出一名单位,无视其法力费用(符能照付)' }],
}

                                                                      
                                         
                                                   
                                                  
  
                                                               
                                                  
                                   
                                                                      
                                                                          
                                                                                     
                                                  
                                                              
                                                       
export const VEN_089_CARD_EFFECT =
  '查看你主牌堆顶部的五张牌。你可以选择从中放逐一个单位或装备，将其法力费用减少{{5}}后打出。回收其余的卡牌。然后你可以选择进行一次：强化该牌。（如果其未被强化，则变为已强化状态。）'

              
export const VEN_089_LOOK = 5
                            
export const VEN_089_REDUCE = 5
                
export const VEN_089_PICK = 'houndPick'
                
export const VEN_089_SKIP = 'skip'
                     
export const VEN_089_EMPOWER = 'houndEmpower'
                  
export const VEN_089_YES = 'yes'
                   
export const VEN_089_NO = 'no'

                                                   
export const VEN_089_SHAPE: BanishPlayShape = {
  defId: 'VEN-089', reduceMana: VEN_089_REDUCE, accepts: 'permanent',
}

   
                          
                                                                 
                                    
   
export function houndCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return topOfDeck(state, controller, VEN_089_LOOK).filter((oid) => {
    const defId = state.objects[oid]?.defId
    return defId !== undefined && isPermanentCard(defId)
  })
}

export const VEN_089_SPEC: PlaySpec = {
  defId: 'VEN-089', cardNo: 'VEN·089', name: '狂野钩爪',
  kind: 'spell',
  cost: { mana: 7, pips: [['orange']] }, // 卡面 7 法力 + 一枚橙 pip(㊶)
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[VEN_089_PICK] !== undefined) return null
      const cands = houndCandidates(state, controller)
      if (cands.length === 0) return null                        
      return {
        itemId: `spell:${movedCardOid}:VEN-089`,
        controller,
        key: VEN_089_PICK,
        prompt: `狂野钩爪:放逐顶五张里的哪个单位或装备并打出(法力费用减少 ${VEN_089_REDUCE})`,
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: VEN_089_SKIP, label: '不放逐' },
        ],
      }
      // ⚠️ 落点与"要不要强化"都【不在这里问】—— 那张牌此刻还没被放逐/还没落地,新 oid 都还不存在。
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[VEN_089_PICK]
      const took = pick !== undefined && pick !== VEN_089_SKIP
        && houndCandidates(state, controller).includes(pick as ObjId)
      const out: GameEvent[] = []
                                                       
      if (took) out.push({ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent)
                                
      out.push({
        kind: 'insight', player: controller,
        count: took ? VEN_089_LOOK - 1 : VEN_089_LOOK, recycleAll: true,
      } as GameEvent)
      return out
    },
}

   
                     
                                                              
   
export function makeHoundPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(VEN_089_SHAPE, selfOid, controller)
}

   
                             
                                                             
                              
                                                                         
   
export function makeHoundEmpowerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `VEN-089:empower:${selfOid}`
                              
  const mine = (state: GameState, ev: GameEvent): ObjId | undefined => {
    const unit = (ev as unknown as { unit?: ObjId }).unit
    if (unit === undefined) return undefined
    return playedBy(state, selfOid).includes(unit) ? unit : undefined
  }
  return compileTrigger({
    id, rawId: true, sourceDefId: 'VEN-089',
    event: 'playUnit', by: 'any', // 认的是"我打出的",不是"我引发的这批"(铁律153)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => mine(state, ev) !== undefined,
    }],
    nextChoice: (state, ev, chosen) => {
      if (chosen[VEN_089_EMPOWER] !== undefined) return null
      const t = mine(state, ev)
      if (t === undefined) return null
                                             
      if (empowerCount(state.objects[t]) >= empowerLimitOf(state.objects[t])) return null
      return {
        itemId: `trig:${id}`, controller, key: VEN_089_EMPOWER,
        prompt: `狂野钩爪:强化刚打出的那张(${state.objects[t]?.defId ?? t})?`,
        candidates: [{ id: VEN_089_YES, label: '强化' }, { id: VEN_089_NO, label: '不强化' }],
      }
    },
    effect: (state, ev, chosen): readonly GameEvent[] => {
      if (chosen?.[VEN_089_EMPOWER] !== VEN_089_YES) return []                         
      const t = mine(state, ev)
      return t === undefined ? [] : [{ kind: 'empower', target: t } as GameEvent]
    },
  }, selfOid, controller)
}

export const VEN_089: Card = {
  id: 'VEN-089', cardNo: 'VEN·089', name: '狂野钩爪', category: 'spell',
  domains: ['orange'], energy: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '看顶五张,可放逐其中一个单位或装备并打出(减5法力),其余回收,然后可强化该牌' }],
}

                                                                    
                                                                               
                                           
                                     
                                                     
  
                                                                   
                                                          
                                                           
                                                                                    
                                                        
                                                           
                                                                                       
                                                                            
                                                                             
                                                                                 
                                                                         
                                                
export const SFD_243_CARD_EFFECT =
  '当你征服一处战场时，你可以选择让我变为休眠状态，以此展示你主牌堆顶部的两张牌。你可以选择放逐其中一张，然后将其打出。回收其余的卡牌。'

               
export const SFD_243_LOOK = 2
                
export const SFD_243_PICK = 'burrowerPick'
                
export const SFD_243_SKIP = 'skip'

                                               
export const SFD_243_SHAPE: BanishPlayShape = {
  defId: 'SFD-243', reduceMana: 0, accepts: 'permanent',
}

   
                                                    
   
export function burrowerCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return topOfDeck(state, controller, SFD_243_LOOK)
}

                                          
export function makeBurrowerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                                  
  const effect = compileEffect({
    then: [
      {
                                                        
                                                        
                                                    
                                                            
                                                     
                                                  
                                                               
                                                            
                                                            
                                                
        op: 'custom',
        emit: (ctx): readonly GameEvent[] => {
                                                 
          const rec = voidSproutRecycleEvents(ctx.state, ctx.controller, ctx.chosen)
                                                           
          const shown = voidSproutFilter(ctx.chosen, ctx.state, ctx.controller,
            topOfDeck(ctx.state, ctx.controller, SFD_243_LOOK))
          return shown.length > 0
            ? [...rec, { kind: 'revealed', player: ctx.controller, cards: shown } as GameEvent]
            : [...rec]
        },
      },
      {
                                                    
        op: 'custom',
        emit: (ctx): readonly GameEvent[] => {
          const pick = ctx.chosen[SFD_243_PICK]
          if (!pick || pick === SFD_243_SKIP) return []
          if (!ctx.state.objects[pick as ObjId]) return []
          return [{ kind: 'banish', target: pick as ObjId, by: selfOid } as GameEvent]
        },
      },
      {
                                      
        op: 'insight',
        count: (ctx) => {
          const pick = ctx.chosen[SFD_243_PICK]
          return pick && pick !== SFD_243_SKIP ? SFD_243_LOOK - 1 : SFD_243_LOOK
        },
        recycleAll: true,
      },
    ],
  })

  const id = `SFD-243:burrow:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'SFD-243',
    event: 'conquer', by: 'you', // 「当【你】征服一处战场时」
    mayChoose: true, // §383.3.a「你可以选择」
                                         
    when: [{ kind: 'custom', test: (_ev, state: GameState) => canDormantSelf(state, selfOid) }],
                                                                                             
                                                             
                                                                                                 
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
    nextChoice: (state, _ev, chosen) => {
                                                     
                                 
      const vq = voidSproutChoice(state, controller, chosen)
      if (vq) return { ...vq, itemId: `trig:${id}` }
      if (chosen[SFD_243_PICK] !== undefined) return null
                                             
      const cands = voidSproutFilter(chosen, state, controller, burrowerCandidates(state, controller))
      if (cands.length === 0) return null              
      return {
        itemId: `trig:${id}`, controller, key: SFD_243_PICK,
        prompt: '虚空遁地兽:放逐展示出来的哪一张并打出?',
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: SFD_243_SKIP, label: '不放逐' },
        ],
      }
      // ⚠️ 落点【不在这里问】—— 那张牌此刻还没被放逐,新 oid 还不存在。交给句②(铁律240)。
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                      
export function makeBurrowerPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(SFD_243_SHAPE, selfOid, controller)
}

export const SFD_243: Card = {
  id: 'SFD-243', cardNo: 'SFD·243/221', name: '虚空遁地兽', category: 'legend',
  domains: ['red', 'yellow'], keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '征服时可让我休眠,以此展示顶两张、放逐一张并打出,其余回收' }],
}

                                                                    
                                             
                         
                                      
  
                                                        
                                                                     
                                                                       
                                                 
                                  
                                                            
                                                         
                                                  
                                                   
                                                                 
export const UNL_148_CARD_EFFECT =
  '当你打出此牌时，放逐你废牌堆中的所有单位。\n{{横置}}：打出一名以此方式放逐的单位。（必须支付卡牌费用。）'

                 
export const UNL_148_PICK = 'sarcophagusPick'
                
export const UNL_148_TO = 'sarcophagusTo'

   
                             
                                      
   
export function sarcophagusVictims(state: GameState, controller: PlayerId): readonly ObjId[] {
  const zone = state.zones[`discard:${controller}` as ZoneId]
  return (zone?.contents ?? []).filter((oid) => {
    const defId = state.objects[oid]?.defId
    return defId !== undefined && CARD_CATEGORIES[defId] === 'unit'
  })
}

   
                                    
                                                       
                             
   
export function sarcophagusCandidates(
  state: GameState, controller: PlayerId, selfOid: ObjId,
): readonly ObjId[] {
  return banishedBy(state, selfOid).filter((oid) => {
    const defId = state.objects[oid]?.defId
    if (defId === undefined || CARD_CATEGORIES[defId] !== 'unit') return false
    return canPayFromState(state, controller, printedCost(defId))                     
  })
}

                                                             
export function makeSarcophagusTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-148:entry:${selfOid}`, rawId: true, sourceDefId: 'UNL-148',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    effect: (state): readonly GameEvent[] =>
                                               
      sarcophagusVictims(state, controller)
        .map((oid) => ({ kind: 'banish', target: oid, by: selfOid } as GameEvent)),
  }, selfOid, controller)
}

                                          
export const UNL_148_SPEC: ActivatedSpec = {
  key: 'UNL-148:sarcophagus',
  label: '{{横置}}:打出一名以此方式放逐的单位(必须支付卡牌费用)',
  cost: {}, // 冒号前只有 [横置],没有资源费
  tapSelf: true,
  target: 'none',
                                            
  available: (state, controller, selfOid) =>
    sarcophagusCandidates(state, controller, selfOid as ObjId).length > 0,
                                                                                                    
                                                                                 
                                                   
                                                                           
  makeConfirmChoice:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                         
      if (chosen[UNL_148_PICK] !== undefined) return null
      const cands = sarcophagusCandidates(state, controller, selfOid as ObjId)
        .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                                     
      if (cands.length === 0) return null
      return {
        itemId: `act:${selfOid}:UNL-148`, controller, key: UNL_148_PICK,
        prompt: '受诅咒的石棺:打出哪一名被它放逐的单位(照卡面费用付)',
        candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    },
  makeNextChoice:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                                                                                              
                                                                                     
                                             
      if (chosen[UNL_148_PICK] === undefined) return null
      const pickDefId = state.objects[chosen[UNL_148_PICK] as ObjId]?.defId ?? ''
      return playFromEffectChoice(state, controller, pickDefId, { itemId: `act:${selfOid}:UNL-148`, controller, key: UNL_148_TO, prompt: '受诅咒的石棺:把它打出到哪里?' }, chosen, printedCost(pickDefId))
    },
  makeResolve:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[UNL_148_PICK]
      if (pick === undefined) return []
      const o = state.objects[pick as ObjId]
                               
      if (!o || !sarcophagusCandidates(state, controller, selfOid as ObjId).includes(pick as ObjId)) return []
                                                                                                                   
                                                                    
      const cost = printedCost(o.defId)
      const x = optionalExtraResolve(state, controller, o.defId, UNL_148_TO, chosen, cost)
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[UNL_148_TO], x.grant)
      if (dest === undefined) return []
      return [...x.preRest, {
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
        play: { card: pick as ObjId, to: dest, cost, by: selfOid as ObjId, ...playUnitExtras(x) },
      } as GameEvent, ...x.post]
    },
}

export const UNL_148: Card = {
  id: 'UNL-148', cardNo: 'UNL-148/219', name: '受诅咒的石棺', category: 'equipment',
  domains: ['purple'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时放逐废牌堆所有单位;[横置]打出一名以此方式放逐的单位(照卡面费用付)' }],
}

                                                                    
                                                                           
                                                                    
                                                         
                                                
  
                                             
                                                             
                                                                                  
                                                                              
                                                                                 
                                                               
                                                       
                                                    
export const SFD_150_CARD_EFFECT =
  '[装配] — 支付{{紫色}}，从你的废牌堆回收两张卡牌。（支付此费用：将此牌贴附到你控制的一名单位上。）\n' +
  '当我征服或据守一处战场时，你可以选择从你的废牌堆中打出一名单位。（仍需支付其费用。）'

                    
const SFD_150_PURPLE_PIP = { mana: 0, pips: [['purple']] } as const
                         
export const SFD_150_RECYCLE = 2
                 
export const SFD_150_PICK = 'lastRitesPick'
                
export const SFD_150_TO = 'lastRitesTo'
                        
export const SFD_150_SKIP = 'skip'

   
                                 
                                                    
   
export function lastRitesCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return discardPlayCandidates(state, controller, printedCost)
}

   
                                                    
                                                             
                                                       
   
export const SFD_150_EQUIP_SPEC: ActivatedSpec = {
  key: 'equip:lastRites',
                                            
                                                              
                                                        
                        
  label: `{{装配}} — 支付 1 点混沌符能,从你的废牌堆回收 ${SFD_150_RECYCLE} 张卡牌:贴附到你控制的一名单位`,
  cost: SFD_150_PURPLE_PIP,
  target: 'custom',
  extraCost: {
    label: `从你的废牌堆回收 ${SFD_150_RECYCLE} 张卡牌`,
                                                                                    
                                                                              
                                                      
                                                            
                                                            
                                                           
                                                                
                                                                             
                                               
                                                 
                                                             
                                                               
                                                                
                                                                       
                                      
    options: (state: GameState, controller: PlayerId) =>
      boundedPickOptions(ownDiscard(state, controller) as unknown as string[], SFD_150_RECYCLE,
        (ids) => ids.map((o) => state.objects[o as ObjId]?.defId ?? o).join(' + ')),
    pay: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): GameState | null => {
      const picks = decodePick(choice, SFD_150_RECYCLE)
      if (!picks) return null
      const pool = ownDiscard(state, controller) as unknown as string[]
      if (!picks.every((x) => pool.includes(x))) return null               
      return recycleObjects(state, picks as unknown as ObjId[])
    },
                                                   
    payEvents: (_state: GameState, controller: PlayerId): readonly GameEvent[] =>
      [{ kind: 'recycled', player: controller, count: SFD_150_RECYCLE } as GameEvent],
                                                                                           
    asEvents: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): readonly GameEvent[] | null => {
      const picks = decodePick(choice, SFD_150_RECYCLE)
      if (!picks) return null
      const pool = ownDiscard(state, controller) as unknown as string[]
      if (!picks.every((x) => pool.includes(x))) return null
      return [
        { kind: 'recycle', player: controller, objs: picks as unknown as ObjId[] } as GameEvent,
        { kind: 'recycled', player: controller, count: SFD_150_RECYCLE } as GameEvent,
      ]
    },
  },
  legalTargets: (state: GameState, controller: PlayerId, selfOid: string) =>
    [...equipDefaultTargets(state, controller, selfOid as ObjId)],
  makeResolve: ({ selfOid, controller, target }: { selfOid: string; controller: PlayerId; target?: string }) =>
    (): readonly GameEvent[] =>
      target === undefined ? [] : [{ kind: 'attach', obj: selfOid as ObjId, to: target as ObjId, player: controller } as GameEvent],
}

   
                                                  
                                                    
   
function makeLastRitesTriggerFor(
  event: 'conquer' | 'hold', selfOid: ObjId, controller: PlayerId,
): Trigger {
  const id = `SFD-150:${event}:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'SFD-150',
    event, by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」
                                                           
                                                          
                                            
                                                                  
                                                        
                                                              
                                             
                                              
                                                            
                                                                    
                                                               
                                                    
                                                                 
                                  
    activeZone: ['battlefield'], // 已贴附的武装位置随宿主(§434.4),宿主在战场它就在战场
    when: [
      { kind: 'hostAtEventBattlefield' }, // ★823 「我」=穿戴者:未贴附不触发 + 宿主须在那处
                                        
      { kind: 'custom', test: (_ev, state: GameState) => lastRitesCandidates(state, controller).length > 0 },
    ],
    nextChoice: (state, _ev, chosen) => {
      const base = { itemId: `trig:${id}`, controller }
      if (chosen[SFD_150_PICK] === undefined) {
        const cands = lastRitesCandidates(state, controller)
          .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                                     
        if (cands.length === 0) return null
        return {
          ...base, key: SFD_150_PICK, prompt: '临终仪式:从你的废牌堆中打出哪一名单位(仍需支付其费用)',
          isTarget: true, // ★1771 §355.10:废牌堆是**公开区域**(§355.10.a.1)⇒ 从中选定具体一张是目标选取(§355.9.a 举例同源)
          candidates: [
            ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
            { id: SFD_150_SKIP, label: '不打出' },
          ],
        }
      }
                                                                                      
      const pick = chosen[SFD_150_PICK]
      if (pick === undefined || pick === SFD_150_SKIP) return null
      const pickDefId = state.objects[pick as ObjId]?.defId ?? ''
      return playFromEffectChoice(state, controller, pickDefId, { ...base, key: SFD_150_TO, prompt: '临终仪式:把它打出到哪里?' }, chosen, printedCost(pickDefId))
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[SFD_150_PICK]
      if (pick === undefined || pick === SFD_150_SKIP) return []
      const o = state.objects[pick as ObjId]
                               
      if (!o || !lastRitesCandidates(state, controller).includes(pick as ObjId)) return []
                                                                                                                
      const cost = printedCost(o.defId)
      const x = optionalExtraResolve(state, controller, o.defId, SFD_150_TO, chosen, cost)
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[SFD_150_TO], x.grant)
      if (dest === undefined) return []
      return [...x.preRest, {
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
        play: { card: pick as ObjId, to: dest, cost, by: selfOid, ...playUnitExtras(x) },
      } as GameEvent, ...x.post]
    },
  }, selfOid, controller)
}

                              
export function makeLastRitesTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [
    makeLastRitesTriggerFor('conquer', selfOid, controller),
    makeLastRitesTriggerFor('hold', selfOid, controller),
  ]
}

export const SFD_150: Card = {
  id: 'SFD-150', cardNo: 'SFD·150/221', name: '临终仪式', category: 'equipment',
  domains: ['purple'], energy: 3, keywords: ['装配'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[装配]付{紫}+回收两张贴附;征服或据守时可从废牌堆打出一名单位(照卡面费用付)' }],
}

                                                                       
                                                                           
                                          
                                                    
                         
  
                                                                           
                                                       
                                       
                                   
                                                                               
                                                                         
                                                                            
                                                                      
                                                                              
                                                              
                            
                                                                                   
                                                       
export const SFD_026_CARD_EFFECT =
  '你的“机械”属性单位获得{{强攻}}。（如果它是进攻方，则{{S}}+1。）\n' +
  '当我征服一处战场时，你可以选择回收另一名友方单位，以此从你的废牌堆中打出一名“机械”属性单位，将其所需法力费用减去被回收单位的战力。'

                   
export const SFD_026_SACRIFICE = 'rumbleSacrifice'
                   
export const SFD_026_PICK = 'rumblePick'
                
export const SFD_026_TO = 'rumbleTo'
                       
export const SFD_026_SKIP = 'skip'

   
                                                                    
                                                              
                                                                    
   
export function rumbleCostOf(reduce: number): (defId: string) => { mana: number; pips?: readonly (readonly string[])[] } {
  return (defId: string) => banishPlayCost(defId, reduce)
}

   
                         
                                                                
   
export function rumbleSacrifices(state: GameState, controller: PlayerId, selfOid: ObjId): readonly ObjId[] {
  return fieldedUnits(state, { of: controller, friendly: true }).filter((oid) => oid !== selfOid)
}

   
                                            
                                                                            
                                                                                 
   
export function rumbleCandidates(
  state: GameState, controller: PlayerId, reduce: number,
  hasTag: (defId: string, tag: string) => boolean,
): readonly ObjId[] {
  return discardPlayCandidates(state, controller, rumbleCostOf(reduce))
    .filter((oid) => {
      const defId = state.objects[oid]?.defId
      return defId !== undefined && hasTag(defId, '机械')
    })
}

                                                  
export function makeRumble026Trigger(
  selfOid: ObjId, controller: PlayerId,
  hasTag: (defId: string, tag: string) => boolean,
): Trigger {
  const id = `SFD-026:conquer:${selfOid}`
                                      
  const reduceOf = (state: GameState, chosen: Readonly<Record<string, string>>): number => {
    const sac = chosen[SFD_026_SACRIFICE]
    if (sac === undefined || sac === SFD_026_SKIP) return 0
    const o = state.objects[sac as ObjId]
                                           
                                                                      
                                                                        
                                                  
    return o === undefined ? 0 : effectiveMight(o).reference
  }
  return compileTrigger({
    id, rawId: true, sourceDefId: 'SFD-026',
    event: 'conquer', by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」
                                     
    when: [{ kind: 'custom', test: (_ev, state: GameState) => rumbleSacrifices(state, controller, selfOid).length > 0 }],
    nextChoice: (state, _ev, chosen) => {
      const base = { itemId: `trig:${id}`, controller }
                                   
      if (chosen[SFD_026_SACRIFICE] === undefined) {
        const cands = rumbleSacrifices(state, controller, selfOid)
        if (cands.length === 0) return null
        return {
          ...base, key: SFD_026_SACRIFICE,
          prompt: '兰博:回收哪一名友方单位(打出的机械单位将减去它的战力)',
          candidates: [
            ...cands.map((oid) => ({
              id: oid as string,
              label: `${state.objects[oid]?.defId ?? oid}(战力 ${effectiveMight(state.objects[oid]!).reference})`,
            })),
            { id: SFD_026_SKIP, label: '不回收' },
          ],
        }
      }
      if (chosen[SFD_026_SACRIFICE] === SFD_026_SKIP) return null
                                                      
      if (chosen[SFD_026_PICK] === undefined) {
        const cands = rumbleCandidates(state, controller, reduceOf(state, chosen), hasTag)
          .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                                     
        if (cands.length === 0) return null                                         
        return {
          ...base, key: SFD_026_PICK,
          prompt: `兰博:从你的废牌堆中打出哪一名"机械"属性单位(法力费用减 ${reduceOf(state, chosen)})`,
          candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
                            
      if (chosen[SFD_026_TO] === undefined) {
        const dests = unitDestinations(state, controller, undefined, state.objects[chosen[SFD_026_PICK] as ObjId]?.defId)               
        if (dests.length === 0) return null                                  
        if (dests.length <= 1) return null
        return {
          ...base, key: SFD_026_TO, prompt: '兰博:把它打出到哪里?',
          candidates: dests.map((z) => ({ id: z as string, label: z as string })),
        }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const sac = chosen?.[SFD_026_SACRIFICE]
      if (sac === undefined || sac === SFD_026_SKIP) return []                      
      if (!rumbleSacrifices(state, controller, selfOid).includes(sac as ObjId)) return []
      const reduce = reduceOf(state, chosen ?? {})
      const out: GameEvent[] = [
                                                                    
        { kind: 'recycle', player: controller, objs: [sac as ObjId] } as GameEvent,
      ]
      const pick = chosen?.[SFD_026_PICK]
      if (pick === undefined) return out
      const o = state.objects[pick as ObjId]
                                               
      if (!o || !rumbleCandidates(state, controller, reduce, hasTag).includes(pick as ObjId)) return out
      const to = chosen?.[SFD_026_TO]
      const dests = unitDestinations(state, controller, undefined, o.defId)               
      if (dests.length === 0) return out                                             
      const dest = to !== undefined && dests.includes(to as ZoneId) ? (to as ZoneId) : dests[0]!                                                       
      out.push({
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
        play: { card: pick as ObjId, to: dest, cost: rumbleCostOf(reduce)(o.defId), by: selfOid },
      } as GameEvent)
      return out
    },
  }, selfOid, controller)
}

export const SFD_026: Card = {
  id: 'SFD-026', cardNo: 'SFD·026/221', name: '兰博', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的机械单位获得强攻(GROUP_PASSIVES);征服时可回收另一友方单位,从废牌堆打出一名机械单位并减去其战力' }],
}
