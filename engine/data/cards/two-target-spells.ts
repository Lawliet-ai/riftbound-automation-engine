                                                                 
                                                               
                                                         
                               
                                                             
  
                                                      
                                                            
                                     
                                                     
                                             
  
                                                               
                                                       
                   
                                                       
                                                                   
                                                           
                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import type { Cost } from '../../src/state/runePool'
import { groupSubsetChoice, groupSubsetApplied, controllerAtResolve, type GroupTargetSpec } from '../../src/loop/groupTargets'                                     
import { isUnit } from '../../src/state/cardTypes'
import { isArmament } from '../../src/keywords/equip'                           
import { spellLegalTargets } from '../../src/loop/playSpec'                                                
import { fieldedUnits, pumpEvent } from './activated-batch'
import { referencedMight } from './might-common'
import { returnToOwnerHand } from './enter-triggers-batch'
import { hasEphemeral } from '../../src/keywords/ephemeral'                   
import { moveUnitEvents } from './enemy-move'                          

                              
export type SecondPick =
                                         
  | 'enemyAtSamePlace'
  /** 「(和)一名**敌方**单位」——场上任意敌方单位(含基地) */
  | 'anyEnemy'
  /**
   * 「让**两名**友方单位…」——第二个也是友方,但**不能是第一个**(第313轮加的档)。
   * ⚠️ 与 `enemyAtSamePlace` 一样**依赖第一个目标**,但依赖的方式不同:
   *   那档是"同一个位置",这档是"**排掉它本人**"。
   */
  | 'anotherFriendly'
  /**
   * ★第695轮:「另一名**与之位置不同的**受你控制的单位」(镜中幻影 UNL-083)。
   * = `anotherFriendly` 再多一道 **zone≠第一个目标的 zone** 的筛(「位置不同」㊶ 逐字);
   * 第一个目标没选/已离场 ⇒ 谈不上「与之」⇒ 空。
   */
  | 'anotherFriendlyElsewhere'
  /**
   * ★第350轮:「…**另一名**单位…」——**不分敌我**、只排掉第一个(距破之舞 SFD-196)。
   * ⚠️ 与 `anotherFriendly` 差**一个"友方"**:那档按 §740.1.a 筛控制者,这档一个限定词都没有。
   */
  | 'anotherAny'
  /**
   * ★第368轮:「摧毁一名**战力低于该单位的**敌方单位」(公开处刑 VEN-154)。
   * ⚠️⚠️ 这是**头一档"候选受第一个目标数值约束"的** —— 前四档要么不看第一个、
   *   要么只看它的**位置**(`enemyAtSamePlace`)或**身份**(排掉它本人),都不比数值。
   * ⚠️ 「战力」取 §143.2.b 的**引用值** `referencedMight`(下钳 0;`duelDamage` 用的也是它)⇒ 配了收口自证。
   * ⚠️ 「低于」是**严格小于**(等于不算);卡文没有位置词 ⇒ 与 `anyEnemy` 同款,**含基地**。
   */
  | 'weakerEnemy'
  /**
   * ★第619轮:「(选择一名单位和)**其控制者的**一件武装」(取放自如 SFD-011)。
   * ⚠️⚠️ 这是本族**第一档"第二个目标不是单位"的** —— 前五档全是单位,这档是 §150.1 [武装]
   *   (`isArmament` 读 `baseTags`,㊼ 唯一定义在 `src/keywords/equip.ts`;不是"装备"泛指)。
   * ⚠️「**其控制者的**」= 按**第一个目标的控制者**筛,**不是打出者的**(㊶ 逐字读那个定语)——
   *   选敌方单位时,能选的就是**敌方**的武装。
   * ⚠️ 卡文**没有位置词** ⇒ 与 `anyEnemy` 同款**含基地**(散在基地里没贴人的武装也能选)。
   * ⚠️⚠️ **不排除"已经贴在第一个目标身上"的那件** —— 简中QA裁定汇编 L279 逐字:
   *   「【取放自如】选同一单位及其**已贴附**武装:**可以**(Q1)」。那种情形结算时走**卸除**分支。
   */
  | 'armamentOfSameController'

export interface TwoTargetRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
                 
  readonly second: SecondPick
     
                               
                                              
                                                          
                                  
     
  readonly first?: 'friendlyUnit' | 'anyUnit' | 'friendlyPairedOnBattlefield'
     
                                                   
                                                                    
     
  readonly echo?: Cost
  readonly secondPrompt: string
                                       
  readonly onFirst?: (target: string, state: GameState, ctx: TwoTargetCtx) => readonly GameEvent[]
                   
  readonly onSecond?: (target: string, state: GameState, ctx: TwoTargetCtx) => readonly GameEvent[]
     
                                         
                                             
                              
                                                         
                              
                                  
     
  readonly onBoth?: (first: string, second: string, state: GameState, ctx: TwoTargetCtx) => readonly GameEvent[]
     
                                            
                                                              
                                                              
                                         
     
  readonly draw?: number
  readonly cardEffect: string
}

   
                                
                                                                   
                                     
                                                         
   
export interface TwoTargetCtx {
  readonly movedCardOid: string
  readonly controller: PlayerId
     
                                                        
                                                  
                                                 
     
  readonly firstTarget?: string
}

                          
export const TWO_TARGET_KEY = 'second'

   
                                                                 
                                                              
                                                                  
   
const echoCopyKey = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)

   
                                                            
                                                                 
                                           
   
function duelDamage(from: string, to: string, state: GameState, bonus = 0): GameEvent {
  return {
    kind: 'damage',
    target: to as ObjId,
                                                                  
                                                             
                                                              
                                            
    amount: referencedMight(state, from) + bonus,
    source: from as ObjId,
    sourcePlayer: state.objects[from as ObjId]?.controller as PlayerId,
  } as GameEvent
}

                                                    
function bounceToOwnerHand(oid: string, state: GameState): readonly GameEvent[] {
  const o = state.objects[oid as ObjId]
  return returnToOwnerHand(state, oid)                              
}

export const UNL_155_DELTA = 1
export const OGN_206_DELTA = 2
export const SFD_151_DELTA = 1
                                         
export const OGS_008_DELTA = 3
                                    
export const SFD_196_UP = 2
export const SFD_196_DOWN = -2

   
                                                        
  
                                                  
                                             
                                                          
                                         
                                                        
                                                     
                    
                                                                   
                                                  
                                                       
                                                       
                                                  
                                                           
   
export function attachOrDetach(
  unitOid: string, gearOid: string, state: GameState, controller: PlayerId,
): readonly GameEvent[] {
  const gear = state.objects[gearOid as ObjId]
  if (gear === undefined) return []
  return (gear.status.attachedTo as string | undefined) === unitOid
    ? [{ kind: 'detach', obj: gearOid as ObjId } as GameEvent]
    : [{ kind: 'attach', obj: gearOid as ObjId, to: unitOid as ObjId, player: controller } as GameEvent]
}

export const TWO_TARGET_SPELLS: readonly TwoTargetRow[] = [
                                                                                      
                                                 
                                                         
                                           
  {
    defId: 'UNL-155', cardNo: 'UNL-155/219', name: '英勇冲锋', domain: 'yellow',
    cost: { mana: 3 }, energy: 3, keywords: ['迅捷'],
    second: 'enemyAtSamePlace', secondPrompt: '英勇冲锋:眩晕【其所在位置】的一名敌方单位',
    cardEffect: '让一名友方单位本回合内{{S}}+1，并{{眩晕}}其所在位置的一名敌方单位。',
    onFirst: (t) => [pumpEvent('UNL-155:pump', t, UNL_155_DELTA)],
    onSecond: (t) => [{ kind: 'stun', target: t as ObjId } as GameEvent],
  },
  {
    defId: 'UNL-128', cardNo: 'UNL-128/219', name: '造化弄人', domain: 'purple',
    cost: { mana: 3, pips: [['purple']] }, energy: 3, keywords: ['反应'],
    second: 'anyEnemy', secondPrompt: '造化弄人:让一名敌方单位返回其所属的手牌',
    cardEffect: '让一名友方单位和一名敌方单位返回其所属的手牌。',
                                                         
    onFirst: (t, s) => bounceToOwnerHand(t, s),
    onSecond: (t, s) => bounceToOwnerHand(t, s),
  },
                                      
  {
    defId: 'OGN-206', cardNo: 'OGN·206/298', name: '背靠背', domain: 'yellow',
    cost: { mana: 3 }, energy: 3, keywords: ['反应'],
    second: 'anotherFriendly', secondPrompt: '背靠背:让【第二名】友方单位本回合内{{S}}+2',
    cardEffect: '让两名友方单位本回合内{{S}}+2。',
                                                       
                                                         
                                                                      
                                                                                    
                                             
                                                                 
    onFirst: (t) => [pumpEvent('OGN-206:pump1', t, OGN_206_DELTA)],
    onSecond: (t) => [pumpEvent('OGN-206:pump2', t, OGN_206_DELTA)],
  },
                                  
  {
    defId: 'OGN-128', cardNo: 'OGN·128/298', name: '决斗', domain: 'orange',
    cost: { mana: 2, pips: [['orange']] }, energy: 2, keywords: ['迅捷'],
    second: 'anyEnemy', secondPrompt: '决斗:和哪一名敌方单位对砍?',
    cardEffect: '选择任意一名友方和一名敌方单位，让这两名单位相互以自身战力给对方造成伤害。',
                                      
                                                                   
                                                 
                                                                    
    onBoth: (a, b, state) => [
      duelDamage(a, b, state), // A 以 A 的战力打 B
      duelDamage(b, a, state), // B 以 B 的战力打 A
    ],
  },
                                   
  {
    defId: 'VEN-154', cardNo: 'VEN·154', name: '公开处刑', domain: 'orange',
                                               
    cost: { mana: 2, pips: [['orange', 'yellow']] }, energy: 2,
                                                                       
                                                                                       
    keywords: ['流转5AA'],
    second: 'weakerEnemy', secondPrompt: '公开处刑:摧毁哪一名【战力更低】的敌方单位?',
    cardEffect: '选择一名友方单位。摧毁一名战力低于该单位的敌方单位。\n{{流转5AA}}。',
                                                      
                                       
                                                           
                                                         
    onSecond: (t, _state, ctx) => [{
      kind: 'destroy',
      target: t as ObjId,
      source: ctx.movedCardOid as ObjId,
      sourcePlayer: ctx.controller,
    } as GameEvent],
  },
                                                 
  {
    defId: 'OGS-008', cardNo: 'OGS·008/024', name: '绅士决斗', domain: 'orange',
    cost: { mana: 6, pips: [['orange']] }, energy: 6, keywords: ['迅捷'],
    second: 'anyEnemy', secondPrompt: '绅士决斗:和哪一名敌方单位对砍?',
    cardEffect: '让一名友方单位本回合内{{S}}+3。随后，选择一名敌方单位，让这两名单位互相以自身战力给对方造成伤害。',
                                                                         
                              
                                             
                                                 
                                            
    onBoth: (a, b, state) => [
      pumpEvent('OGS-008:pump', a, OGS_008_DELTA),
      duelDamage(a, b, state, OGS_008_DELTA), // A 以【加成后】的战力打 B
      duelDamage(b, a, state), // B 以自身战力打 A(不受那 +3 影响)
    ],
  },
                                            
  {
    defId: 'SFD-151', cardNo: 'SFD·151/221', name: '力量之缚', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], echo: { mana: 2 }, // §820 [回响2]
    second: 'anotherFriendly', secondPrompt: '力量之缚:让【第二名】友方单位本回合内{{S}}+1',
    cardEffect: '让两名友方单位在本回合内{{S}}+1。',
                                                                  
    onFirst: (t) => [pumpEvent('SFD-151:pump1', t, SFD_151_DELTA)],
    onSecond: (t) => [pumpEvent('SFD-151:pump2', t, SFD_151_DELTA)],
  },
  {
    defId: 'SFD-196', cardNo: 'SFD·196/221', name: '距破之舞', domain: 'green',
                                               
    cost: { mana: 1, pips: [['green', 'purple']] }, energy: 1, keywords: ['反应'],
    first: 'anyUnit', // ★卡文只写「一名单位」——**不分敌我**
    second: 'anotherAny', secondPrompt: '距破之舞:让【另一名】单位本回合内{{S}}-2',
    cardEffect: '本回合内，让一名单位{{S}}+2，另一名单位{{S}}-2。',
                                            
    onFirst: (t) => [pumpEvent('SFD-196:up', t, SFD_196_UP)],
    onSecond: (t) => [pumpEvent('SFD-196:down', t, SFD_196_DOWN)],
  },
                                                                 
                                                            
                                                                          
                                                              
                                                            
                                                            
    
                                                                       
                                                             
                                                    
                                                                  
                                                                
                                                                         
    
                                                                     
                                                                                
  {
    defId: 'OGN-108', cardNo: 'OGN·108/298', name: '聚合变异', domain: 'blue',
    cost: { mana: 2, pips: [['blue']] }, energy: 2, keywords: ['反应'],
                                                                      
    second: 'anotherFriendly',
    secondPrompt: '聚合变异:选【另一名】友方单位,把第一名的战力提升到与它相同',
    onBoth: (first, second, state) => {
                                                                   
                                                                                     
                                                                
                                                                    
      if (state.objects[second as ObjId] === undefined) return []
                                                                          
      const target = referencedMight(state, second)
      return [{
        kind: 'addEffect',
        effect: {
          id: `OGN-108:raise:${first}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { oid: ObjId }) => x.oid === (first as ObjId),
                                                                   
          modification: { kind: 'raiseTo', value: target },
        },
      } ]
    },
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '选择一名友方单位。本回合内，将其战力提升至与另一名友方单位战力相同。',
  },
                                                                   
                                           
                                       
                                                                            
                         
                                                       
                                           
                                                                 
                                                        
  {
    defId: 'SFD-011', cardNo: 'SFD·011/221', name: '取放自如', domain: 'red',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], // cardCosts 实测:2 法力 **0 pip**
    first: 'anyUnit', // ★卡文只写「一名单位」——**不分敌我**、含基地
    second: 'armamentOfSameController',
    secondPrompt: '取放自如:选【该单位控制者的】一件武装(已贴在它身上的就是卸除)',
    draw: 1, // 「抽一张牌」——独立一句
    onBoth: (unit, gear, state, ctx) => attachOrDetach(unit, gear, state, ctx.controller),
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '选择一名单位和其控制者的一件武装。为该单位贴附或卸除该武装。抽一张牌。',
  },
                                                                       
                                                                     
                                                      
                                               
                                                              
                                                     
                                                          
                                                 
                                                         
                                  
                                                       
                                                                
                                                             
                                                     
                                                                      
                                                 
  {
    defId: 'SFD-163', cardNo: 'SFD·163/221', name: '断魂一扼', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], // cardCosts 实测:2 法力 **0 pip**
    second: 'anotherFriendly',
    secondPrompt: '断魂一扼:让哪一名【另外的】友方单位获得等同于前者战力的+S?',
    draw: 1, // 「抽一张牌」独立成行(QA:未摧毁也抽)
    onFirst: (t, _state, ctx) => [{
      kind: 'destroy', target: t as ObjId,
                                                                       
      source: ctx.movedCardOid as ObjId, sourcePlayer: ctx.controller,
    } as GameEvent],
    onSecond: (t, state, ctx) => {
      if (ctx.firstTarget === undefined) return []
      const victim = state.objects[ctx.firstTarget as ObjId]
      if (!victim) return []
                                                          
      return [{
        kind: 'pumpIfDestroyed', victim: victim.oid, victimOwner: victim.owner, victimDefId: victim.defId,
        beneficiary: t as ObjId, effectId: 'SFD-163:pump', delta: referencedMight(state, ctx.firstTarget),
      } ]
    },
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '摧毁一名友方单位。若如此做，则让另一名友方单位在本回合内获得等同于前者战力的+{{S}}加成。\n抽一张牌。',
  },
                                                         
                                                                 
                                                              
                                                             
                                                            
                                       
  {
    defId: 'UNL-083', cardNo: 'UNL-083/219', name: '镜中幻影', domain: 'blue',
    cost: { mana: 2 }, energy: 2, keywords: ['待命', '迅捷'], // cardCosts 实测 2 法力 **0 pip**
    second: 'anotherFriendlyElsewhere',
    secondPrompt: '镜中幻影:选另一名【位置不同的】友方单位(两者互换位置)',
    draw: 1, // 「抽一张牌」独立成行(条件不满足也抽)
    onBoth: (a, b, state) => {
      const oa = state.objects[a as ObjId]
      const ob = state.objects[b as ObjId]
      if (!oa || !ob) return []
      if (!hasEphemeral(oa) && !hasEphemeral(ob)) return []                       
      return [
        ...moveUnitEvents(state, a, ob.zone as string),
        ...moveUnitEvents(state, b, oa.zone as string),
      ]
    },
    cardEffect:
      '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
      + '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
      + '选择一名受你控制的单位和另一名与之位置不同的受你控制的单位。如果其中至少一个拥有{{瞬息}}，则将两名单位分别移动到对方的位置。抽一张牌。',
  },
]

   
                                                      
                                                                     
                            
   
export function firstCandidates(
  state: GameState, controller: PlayerId,
  pick: 'friendlyUnit' | 'anyUnit' | 'friendlyPairedOnBattlefield' | 'friendlyOnBattlefield' = 'friendlyUnit',
): string[] {
  if (pick === 'friendlyOnBattlefield') {
                                                            
                                       
                                                                      
                                                               
                                                     
                                                      
                                                                
    return (fieldedUnits(state, { of: controller, friendly: true }) as string[])
      .filter((oid) => {
        const o = state.objects[oid as ObjId]
        return o !== undefined && state.zones[o.zone]?.kind === 'battlefield'
      })
      .sort()
  }
  if (pick === 'friendlyPairedOnBattlefield') {
                                                               
                                                  
                                                             
                                                             
                                                                       
                                                                     
                             
                                                                
                                                           
                                                      
                                         
    const enemyPlaces = new Set(
      Object.values(state.objects)
        .filter((o) => isUnit(o) && o.controller !== controller
          && state.zones[o.zone]?.kind === 'battlefield')
        .map((o) => o.zone as string),
    )
    return (fieldedUnits(state, { of: controller, friendly: true }) as string[])
      .filter((oid) => {
        const o = state.objects[oid as ObjId]
        return o !== undefined
          && state.zones[o.zone]?.kind === 'battlefield'            
          && enemyPlaces.has(o.zone as string)                        
      })
      .sort()
  }
  return (pick === 'anyUnit'
    ? fieldedUnits(state)
    : fieldedUnits(state, { of: controller, friendly: true })) as string[]
}

   
                                
                                                               
   
export function secondCandidates(
  second: SecondPick, state: GameState, controller: PlayerId, first: string | undefined,
): string[] {
  if (second === 'armamentOfSameController') {
                                                        
    const host = first === undefined ? undefined : state.objects[first as ObjId]
    if (host === undefined) return []
    return Object.values(state.objects)
      .filter((o) => isArmament(o)                          
        && o.controller === host.controller                                 
                                             
        && (() => { const k = state.zones[o.zone]?.kind; return k === 'battlefield' || k === 'base' })())
      .map((o) => o.oid as string).sort()
  }
  if (second === 'anotherAny') {
                                                     
    return (fieldedUnits(state) as string[]).filter((oid) => oid !== first).sort()
  }
  if (second === 'anotherFriendly') {
                                                          
                                                
    return firstCandidates(state, controller).filter((oid) => oid !== first).sort()
  }
  if (second === 'anotherFriendlyElsewhere') {
                                                                     
    const fstObj = first === undefined ? undefined : state.objects[first as ObjId]
    if (fstObj === undefined) return []
    return firstCandidates(state, controller)
      .filter((oid) => oid !== first && state.objects[oid as ObjId]?.zone !== fstObj.zone)
      .sort()
  }
  const enemies = Object.values(state.objects)
    .filter((o) => isUnit(o) && o.controller !== controller)            
  if (second === 'weakerEnemy') {
                                                
    if (first === undefined || state.objects[first as ObjId] === undefined) return []
    const threshold = referencedMight(state, first)
    return enemies
      // ⚠️ 没有位置词 ⇒ 与 `anyEnemy` 同款,**含基地**(照抄它那道过滤,别自作主张收窄)
      .filter((o) => { const k = state.zones[o.zone]?.kind; return k === 'battlefield' || k === 'base' })
      // ⚠️ 「**低于**」是严格小于 —— 等于的那个不该进候选(配了边界断言)
      .filter((o) => referencedMight(state, o.oid as string) < threshold)
      .map((o) => o.oid as string).sort()
  }
  if (second === 'anyEnemy') {
    return enemies
      .filter((o) => { const k = state.zones[o.zone]?.kind; return k === 'battlefield' || k === 'base' })
      .map((o) => o.oid as string).sort()
  }
                                             
  const fst = first === undefined ? undefined : state.objects[first as ObjId]
  if (fst === undefined || state.zones[fst.zone]?.kind !== 'battlefield') return []
  return enemies.filter((o) => o.zone === fst.zone).map((o) => o.oid as string).sort()
}

                                                                                  
                                                                
  
                                                
                                                        
                                                             
                                                               
  
                                               
                                                       
                                                            
                                                          
                                                        
                                                         
  
                                                                         
                                                                                  
                                                            
                                                                        
  
                      
                                                                 
                                                                      
                                                            
                                                                            
                                              
  
                                                                                  
                                                                                  
export const OGN_220_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '眩晕位于同一个战场上的一名友方单位和一名敌方单位。（使其在本回合内无法造成战斗伤害。）'
export const OGN_220_SECOND_PROMPT = '强手裂颅:同一处战场上的哪名敌方单位也一起眩晕?'
export const OGN_220_GROUP_KEY = 'smash'

   
                                                       
                                                          
                                                
                                               
                                               
   
export function smashGroupOk(state: GameState, group: readonly string[]): boolean {
  const places = group
    .map((o) => state.objects[o as ObjId])
    .filter((o) => o !== undefined && state.zones[o.zone]?.kind === 'battlefield')
    .map((o) => String(o!.zone))
  return new Set(places).size <= 1
}

                                                               
function smashSpec(
  movedCardOid: string, controller: PlayerId, target: string | undefined,
  source: Readonly<Record<string, string>>,
): GroupTargetSpec {
  const initial = [target, source[TWO_TARGET_KEY]]
    .filter((v): v is string => v !== undefined)
  return {
    itemId: `play:${movedCardOid}`,
    controller,
    groupKey: OGN_220_GROUP_KEY,
    initial,
                                                      
    memberLegal: (st, o) => {
      const obj = st.objects[o as ObjId]
      return obj !== undefined && isUnit(obj) && st.zones[obj.zone]?.kind === 'battlefield'
    },
    groupOk: smashGroupOk,
                                        
    minPicks: 1,
    prompt: '强手裂颅:这两个目标已不再整体满足限制(不在同一处战场)——从最初选定的目标里挑一个合法子集',
    label: (st, o) => st.objects[o as ObjId]?.defId ?? o,
  }
}

export const OGN_220_SPEC: PlaySpec = {
  defId: 'OGN-220', cardNo: 'OGN·220/298', name: '强手裂颅', kind: 'spell',
  cost: { mana: 2 }, // cardCosts 实测:2 法力 **0 pip**
  keywords: ['待命', '迅捷'],
  target: 'custom', // 第一目标走打出时锁定那条路(§355)
  legalTargets: (state, controller, selfOid) => {
                                                           
    if (selfOid !== '') return firstCandidates(state, controller, 'friendlyOnBattlefield')
                                                       
    return firstCandidates(state, controller, 'friendlyPairedOnBattlefield').filter((f) =>
      spellLegalTargets(
        { legalTargets: (st, ctrl) => secondCandidates('enemyAtSamePlace', st, ctrl, f) },
        state, controller).length > 0)
  },
                                                  
  makeConfirmChoice:
    ({ movedCardOid, target, controller }) =>
    (state, chosen): ChoiceRequest | null => {
      if (chosen[TWO_TARGET_KEY] !== undefined) return null        
      const cands = secondCandidates('enemyAtSamePlace', state, controller, target)
      if (cands.length === 0) return null                             
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: TWO_TARGET_KEY,
        prompt: OGN_220_SECOND_PROMPT,
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        isTarget: true, // ★561 §355.6:第二个目标也是目标(吃「其选作目标的那名单位」那族)
      }
    },
                                                        
  makeNextChoice:
    ({ movedCardOid, target, controller }) =>
    (state, chosen): ChoiceRequest | null => {
                                                                     
      const cur = controllerAtResolve(state, movedCardOid, controller)
      return groupSubsetChoice(smashSpec(movedCardOid, cur, target, chosen))(state, chosen)
    },
  makeResolve:
    ({ movedCardOid, target, controller }) =>
    (state, chosen, self): readonly GameEvent[] => {
                                                                              
                                                                                 
      const source: Readonly<Record<string, string>> = { ...(chosen ?? {}), ...(self?.frozenChoices ?? {}) }
                                                                 
      const cur = (self?.controller ?? controller) as PlayerId
      const spec = smashSpec(movedCardOid, cur, target, source)
                                                                 
      const out: GameEvent[] = []
      for (const oid of groupSubsetApplied(state, chosen, spec)) {
        out.push({ kind: 'stun', target: oid as ObjId })
      }
      return out
    },
}

                                        
export function makeTwoTargetSpec(row: TwoTargetRow): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
    ...(row.echo !== undefined ? { echo: row.echo } : {}), // §820 印了[回响N]才给(第350轮)
    target: 'custom', // 第一个目标走打出时锁定那条路(§355)
                                                                 
                                                            
                                                         
                                                                           
                                                                      
                                                                                                    
                                                              
                                                                             
                                                                  
                                                             
                                                     
                                                                
                                                                
                                                             
                                                                      
                                                                           
    legalTargets: (state, controller, selfOid) => {
      const firsts = firstCandidates(state, controller, row.first)
      if (selfOid !== '') return firsts                                
      return firsts.filter((f) => spellLegalTargets(
        { legalTargets: (st, ctrl) => secondCandidates(row.second, st, ctrl, f) },
        state, controller).length > 0)
    },
                                                                
                                                                   
    choiceTiming: 'confirm',
    makeNextChoice:
      ({ movedCardOid, target, controller, echoTimes }) =>
      (state, chosen): ChoiceRequest | null => {
                                                                      
        for (let c = 0; c <= (echoTimes ?? 0); c++) {
          const key = echoCopyKey(TWO_TARGET_KEY, c)
          if (chosen[key] !== undefined) continue                
          const cands = secondCandidates(row.second, state, controller, target)
          if (cands.length === 0) continue                       
          return {
            itemId: `play:${movedCardOid}`,
            controller,
            key,
            prompt: row.secondPrompt,
            candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
                                                 
                                                            
                                                                 
                                                                 
                                                                               
                                                                      
            isTarget: true,
          }
        }
        return null
      },
    makeResolve:
      ({ target, movedCardOid, controller, echoIndex }) =>
      (state, chosen): readonly GameEvent[] => {
                                                                       
        const snd = (chosen ?? {})[echoCopyKey(TWO_TARGET_KEY, echoIndex ?? 0)]
        const fstOk = target !== undefined && state.objects[target as ObjId] !== undefined
                                                  
                                                            
        const ctx: TwoTargetCtx = { movedCardOid: movedCardOid as string, controller: controller as PlayerId,
          ...(fstOk ? { firstTarget: target as string } : {}) }
                                                             
                                                                         
                                                                                   
                                                                                       
                                                                       
                                                                       
        const sndOk = snd !== undefined && state.objects[snd as ObjId] !== undefined
          && secondCandidates(row.second, state, controller,
            fstOk ? (target as string) : undefined).includes(snd)
        const out: GameEvent[] = []
                                                               
        if (row.onBoth !== undefined) {
          if (fstOk && sndOk) out.push(...row.onBoth(target!, snd!, state, ctx))
        } else {
                                                            
          if (fstOk && row.onFirst !== undefined) out.push(...row.onFirst(target!, state, ctx))
          if (sndOk && row.onSecond !== undefined) out.push(...row.onSecond(snd!, state, ctx))
        }
                                                   
        if (row.draw !== undefined) {
          out.push({ kind: 'draw', player: controller, count: row.draw } as GameEvent)
        }
        return out
      },
  }
}

export const TWO_TARGET_SPECS: Readonly<Record<string, PlaySpec>> = {
  ...Object.fromEntries(TWO_TARGET_SPELLS.map((r) => [r.defId, makeTwoTargetSpec(r)])),
  'OGN-220': OGN_220_SPEC, // ★1808c:bespoke(搬出批量表;见 `OGN_220_SPEC`)
}

export const TWO_TARGET_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(TWO_TARGET_SPELLS.map((r) => [r.defId, r.keywords])),
  'OGN-220': ['待命', '迅捷'], // ★1808c:与 `OGN_220_SPEC.keywords` 同源(bespoke 行不在表里)
}

export const TWO_TARGET_CARDS: readonly Card[] = [
  ...TWO_TARGET_SPELLS.map((r) => ({
    id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
    domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
    abilities: [{ kind: 'passive', describe: `选两个目标(第二问:${r.second})(TWO_TARGET_SPECS)` }],
  }) as Card),
                                                                          
  {
    id: 'OGN-220', cardNo: 'OGN·220/298', name: '强手裂颅', category: 'spell',
    domains: ['yellow'], energy: 2, keywords: ['待命', '迅捷'], playModes: [{ kind: 'standard' }],
    abilities: [{ kind: 'passive', describe: '同处战场的友方+敌方各眩晕(OGN_220_SPEC;§355.11.b 子集重选)' }],
  } as Card,
]

                                                                                                      
                                                                                                
                                                                                                                    
export const OGN_108_CARD_EFFECT = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n选择一名友方单位。本回合内，将其战力提升至与另一名友方单位战力相同。'

                                                                                                      
                                                                                                                
                                                                                                                             
export const SFD_163_CARD_EFFECT = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n摧毁一名友方单位。若如此做，则让另一名友方单位在本回合内获得等同于前者战力的+{{S}}加成。\n抽一张牌。'
