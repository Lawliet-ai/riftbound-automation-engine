                                                
                                                   
  
                                                  
                                                
                                               
                                        

import type { Card, Domain } from '../../src/dsl/card'
import { variantSiblings } from '../variantAlias'                             
import type { GameState } from '../../src/state/gameState'
import { loyaltyCostMods } from './UNL-168'
import { jhinAltCostMods } from './UNL-089'
import { unyieldingCostMods } from './UNL-025'
import { jayceGearCostMods } from './jayce-gear'
import { lissandraCostMods } from './longtail-2'
import { longtail35CostMods } from './longtail-35'
import type { PlayerId } from '../../src/state/ids'
import type { CostMod } from '../../src/game/costPipeline'
import { hasCardTag, objectHasCardTag } from '../cardTagQuery'
import { wellspringCostMods } from './UNL-186'
import { haeliaVaultCostMods } from './battlefields-extra'
import { fieldedUnits } from './activated-batch'                      
import { referencedMight } from './might-common'                      
import { animalTagKinds } from './animal-tags'
import { confirmedCountThisTurn } from '../../src/keywords/rally'
import { experienceOf } from '../../src/keywords/level'
import { levelTier, yiCostTier } from './level-self'
import { controlledBattlefields, controlsBattlefield } from '../../src/state/battlefieldControl'
import { isEmpowered } from '../../src/keywords/empower'
import { inBattle } from '../../src/combat/battleRoles'                                              
import { effectiveMight } from '../../src/state/might'
import { RECURSION } from '../../src/keywords/recursion'
import { liveTargetOids } from '../../src/loop/chainTargets'                       
import { onField } from './activated-batch2'
import type { GameObject } from '../../src/state/object'             
import { isEquipment, isUnit } from '../../src/state/cardTypes'                                                              

                                                
function controlsOnBattlefield(state: GameState, player: PlayerId, defId: string): boolean {
  return Object.values(state.objects).some(
    (o) => o.defId === defId && o.controller === player && state.zones[o.zone]?.kind === 'battlefield',
  )
}

   
                                                             
                                                     
                                                                 
   
export function yiSelfCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'UNL-059') return []
  const t = yiCostTier(state, player)
  return t
    ? [
        { kind: 'reduce', part: 'mana', mana: t.mana, source: `UNL-059 ${t.tag}` },
        { kind: 'reduce', part: 'pips', pips: t.pips, source: `UNL-059 ${t.tag}` },
      ]
    : []
}

   
                             
                                             
  
         
                                                         
                                           
                                              
                                        
                                        
   
export function apprenticeCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
): readonly CostMod[] {
  if (!isSpell(defId)) return []
  const n = Object.values(state.objects).filter(
    (o) => o.defId === 'OGN-084' && o.controller === player && state.zones[o.zone]?.kind === 'battlefield',
  ).length
                                    
  return Array.from({ length: n }, () => ({
    kind: 'reduce' as const,
    part: 'mana' as const,
    mana: 1,
    floor: 1,
    source: 'OGN-084 踊跃的学徒',
  }))
}

   
                               
                                        
                        
  
                                                 
                                                            
   
export function homeostasisCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'OGN-047') return []
  const threatened = state.players.some(
    (p) => p !== player && state.winTarget - (state.scores[p] ?? 0) <= 3,
  )
  return threatened ? [{ kind: 'reduce', part: 'total', mana: 2, source: 'OGN-047 御衡守念' }] : []
}

   
                                              
                                           
  
                                                                   
                                                    
                                                                      
                                                              
                                                              
                                              
                                                                
                                                                
                                                
   
export function warSpoilsCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'OGN-144') return []
  const led = state.unitDestroyedThisTurn ?? {}
  const enemyDied = state.players.some((p) => p !== player && led[p as string] === true)
  return enemyDied ? [{ kind: 'reduce', part: 'total', mana: 2, source: 'OGN-144 以战养战' }] : []
}

   
                                                                     
                                                 
                                                                         
                                                              
                                                              
                                                                      
                                                      
                                                               
   
export function thunderCrashCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'OGN-014') return []
  const highest = Math.max(0, ...fieldedUnits(state, { of: player, friendly: true })
    .map((oid) => referencedMight(state, oid as string)))
  return highest > 0
    ? [{ kind: 'reduce', part: 'mana', mana: highest, floor: 0, source: 'OGN-014 霹天雳地(己方最高战力)' }]
    : []
}

                                          
   
                                              
  
                                                            
                                                            
                                                   
                                                              
   
export function nextSpellDiscountMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
): readonly CostMod[] {
  if (!isSpell(defId)) return []
  const left = state.nextSpellDiscountThisTurn?.[player] ?? 0
  if (left <= 0) return []
  return [{ kind: 'reduce', part: 'mana', mana: left, floor: 0, source: 'OGN-031 狂暴龙怪' }]
}

                                          
export const VEN_044_DISCOUNT_MANA = 2
export const VEN_044_DISCOUNT_PIPS = 2

   
                                                                    
  
                                                    
                                                                    
                                               
                                                                       
                                                                  
                                 
   
export function nextCardDiscountMods(
  state: GameState,
  player: PlayerId,
): readonly CostMod[] {
  const times = state.nextCardDiscountThisTurn?.[player] ?? 0
  if (times <= 0) return []
  return [
    { kind: 'reduce', part: 'mana', mana: times * VEN_044_DISCOUNT_MANA, floor: 0, source: 'VEN-044 星界灵鹭' },
    { kind: 'reduce', part: 'pips', pips: times * VEN_044_DISCOUNT_PIPS, floor: 0, source: 'VEN-044 星界灵鹭' },
  ]
}

   
                                                                    
                                           
                            
                                             
                                                                                   
                                                      
                                                             
                                                 
                                         
                                                      
                                                            
   
export function vexBattleCostMods(
  state: GameState, player: PlayerId, defId: string, isSpell: (d: string) => boolean,
): readonly CostMod[] {
  if (!isSpell(defId)) return []
  const out: CostMod[] = []
  for (const o of Object.values(state.objects)) {
    if (o.defId !== 'SFD-146') continue
    if (!inBattle(o)) continue                                          
    if (o.controller === player) {
      out.push({ kind: 'reduce', part: 'mana', mana: 1, floor: 1, source: 'SFD-146 薇古丝(战斗中友方减)' })
      out.push({ kind: 'reduce', part: 'pips', pips: 1, source: 'SFD-146 薇古丝(战斗中友方减)' })
    } else {
      out.push({ kind: 'increase', part: 'mana', mana: 1, source: 'SFD-146 薇古丝(战斗中敌方增)' })
      out.push({ kind: 'increase', part: 'pips', pips: 1, source: 'SFD-146 薇古丝(战斗中敌方增)' })           
    }
  }
  return out
}

   
                                                            
                                             
                                                          
                                                                    
   
export function pragmaticResearcherCostMods(
  state: GameState, player: PlayerId, defId: string, isSpell: (d: string) => boolean,
): readonly CostMod[] {
  if (!isSpell(defId)) return []
  const out: CostMod[] = []
  for (const o of Object.values(state.objects)) {
    if (o.defId !== 'VEN-055' || o.controller !== player || !isEmpowered(o)) continue
    const k = state.zones[o.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') continue        
    out.push({ kind: 'reduce', part: 'mana', mana: 1, floor: 1, source: 'VEN-055 实干研究员(已强化)' })
    out.push({ kind: 'reduce', part: 'pips', pips: 1, source: 'VEN-055 实干研究员(已强化)' })
  }
  return out
}

                                             
export const SFD_055_DISCOUNT_MANA = 2
export const SFD_055_DISCOUNT_PIPS = 1

   
                                                      
                                                         
                                               
                                                        
                                                               
   
export function giantYordleCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'SFD-055') return []
  const times = state.holdsThisTurn?.[player as string] ?? 0
  if (times <= 0) return []
  return [
    { kind: 'reduce', part: 'mana', mana: times * SFD_055_DISCOUNT_MANA, floor: 0, source: 'SFD-055 超大型约德尔人' },
    { kind: 'reduce', part: 'pips', pips: times * SFD_055_DISCOUNT_PIPS, floor: 0, source: 'SFD-055 超大型约德尔人' },
  ]
}

export function allCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
  ctx?: { readonly fromZone?: string; readonly target?: string; readonly grantedRecursion?: true; readonly standbyFaceDown?: true },
  keywordsOf: (defId: string) => readonly string[] = () => [],
                                                           
  isPlainEquipment: (defId: string) => boolean = () => false,
): readonly CostMod[] {
  return [
    ...outsideHandCostMods(defId, ctx), // 第216轮:吃 §356 上下文的第一族
    ...jhinAltCostMods(state, player, defId), // ★第462轮:烬条件替代打出费(replace 档 alt)
    ...unyieldingCostMods(defId, ctx), // 第268轮:不死军团从【废牌堆】打出时加一枚【红】pip(铁律243/244)
    ...wellspringCostMods(defId, ctx), // 第285轮:涌泉之恨从【废牌堆】打出时改付{A}(归零+加一枚任意pip)
    ...haeliaVaultCostMods(state, player, defId), // 第290轮:海力亚秘库本回合单位增费
    ...stargazerCostMods(state, player, defId, isSpell, keywordsOf, ctx), // 第217轮:废牌堆里的[流转]法术减2下限1
    ...sandTombCostMods(state, player, defId, isSpell, ctx), // 第218轮:以此处友方单位为目标的法术减{A}
    ...loyaltyCostMods(state, player, defId, ctx), // ★660 忠诚不渝:所选目标带四动物标签之一则本法术减{2}
    ...irelia141CostMods(state, player, defId, isSpell, ctx), // 第219轮:以艾瑞莉娅为目标的法术减{1}或{A}
    ...ezrealSP5CostMods(state, player, defId), // ★867b 伊泽瑞尔唯一实现(三号同组;现行文本,无自排除)
    ...apprenticeCostMods(state, player, defId, isSpell),
    ...homeostasisCostMods(state, player, defId),
    ...warSpoilsCostMods(state, player, defId), // 第370轮:以战养战,本回合有敌方单位被摧毁则减{2}
    ...thunderCrashCostMods(state, player, defId), // ★633:霹天雳地,法力减己方最高战力(pip 不动)
    ...noxianRecruitCostMods(state, player, defId),
    ...dragonCallerCostMods(state, player, defId),
    ...surgeCostMods(state, player, defId),
    ...focusCostMods(state, player, defId),
    ...lawkeeperCostMods(state, player, defId),
    ...chompCostMods(state, player, defId),
    ...suppressionHelmCostMods(state, player, defId, isSpell),
    ...nextSpellDiscountMods(state, player, defId, isSpell),
    ...nextCardDiscountMods(state, player), // ★597 星界灵鹭:下一张【卡牌】(不限类别)减 {2}+{A}{A}
    ...giantYordleCostMods(state, player, defId), // ★680 超大型约德尔人:本回合每据守一次(不论得分)减 {2}+1绿pip
    ...vexBattleCostMods(state, player, defId, isSpell), // ★689 薇古丝:战斗中友方法术减/敌方法术增(各{1}+{A})
    ...pragmaticResearcherCostMods(state, player, defId, isSpell), // ★689 实干研究员:已强化则你的法术减{1}+{A}
    ...lissandraCostMods(state, player, defId), // 第151轮:裂魂者喇煞(废牌堆每张减1)
    ...yiSelfCostMods(state, player, defId), // 第183轮:易 UNL-059 三档【改为】减费
    ...longtail35CostMods(state, player, defId), // 第195轮:按计数减费四张(影刃/攻城锤/广场守卫/琢珥鱼)
    ...jujuCostMods(state, player, defId), // 第255轮:小菊!按四种动物标签的【种类数】减费
    ...forgeCostMods(state, player, defId, isPlainEquipment), // 第338轮:奥恩的锻炉,每回合第一件非指示物装备减{1}
    ...astralSurgeCostMods(state, defId, keywordsOf, ctx), // 第339轮:神秘星旋,此处对决期间[反应]卡增{A}(★1692:面朝下待命牌也算)
    ...jayceGearCostMods(state, player, defId, ctx), // ★第421轮:杰斯,本回合免一件≤{7}装备的法力费
  ]
}

export { controlsOnBattlefield }

                                                           

   
                                                      
                                                                              
                                                                 
                                                           
                                            
                                                       
   
function controlsTagged(state: GameState, player: PlayerId, tag: string): boolean {
  return Object.values(state.objects).some((o) => {
    const k = state.zones[o.zone]?.kind
                                 
    return o.controller === player && (k === 'base' || k === 'battlefield') && objectHasCardTag(o, tag)
  })
}

   
                              
                                                  
  
                                                     
                                      
                                             
   
export function noxianRecruitCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'OGN-012') return []
  return confirmedCountThisTurn(state, player) >= 1
    ? [{ kind: 'reduce', part: 'total', mana: 2, source: 'OGN-012 鼓舞' }]
    : []
}

   
                            
                                    
  
                                          
                                                
                                
   
export function dragonCallerCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (!hasCardTag(defId, '龙')) return []
  const n = Object.values(state.objects).filter((o) => {
    const k = state.zones[o.zone]?.kind
    return o.defId === 'OGN-140' && o.controller === player && (k === 'base' || k === 'battlefield')
  }).length
  return Array.from({ length: n }, () => ({
    kind: 'reduce' as const, part: 'mana' as const, mana: 2, floor: 1, source: 'OGN-140 唤龙使者',
  }))
}

   
                              
                                    
   
export function surgeCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'SFD-076') return []
  return controlsTagged(state, player, '机械')
    ? [{ kind: 'reduce', part: 'total', mana: 2, source: 'SFD-076 产量激增' }]
    : []
}

   
                          
                         
                              
  
                                       
                                          
   
export function focusCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'UNL-091') return []
                                                                   
  const tier = levelTier(state, player, [[11, { mana: 4, tag: '等级11' }], [6, { mana: 2, tag: '等级6' }]])
  return tier ? [{ kind: 'reduce', part: 'total', mana: tier.mana, source: `UNL-091 ${tier.tag}` }] : []
}

                                              

   
                               
                                             
  
                                                 
                                                    
                 
                                                     
   
export function lawkeeperCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'VEN-119') return []
  const ok = controlledBattlefields(state, player).some((bf) => {
    const z = state.zones[bf]
    if (!z) return false
    const units = z.contents.filter((oid) => {
      return isUnit(state.objects[oid])                                                                      
    })
    return units.length === 2
  })
  return ok
    ? [
        { kind: 'reduce', part: 'mana', mana: 2, source: 'VEN-119 律法守护者' },
        { kind: 'reduce', part: 'pips', pips: 1, source: 'VEN-119 律法守护者' },
      ]
    : []
}

   
                          
                                             
  
                                                  
                                               
                                               
   
export function chompCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'UNL-035') return []
  const enemyStunned = Object.values(state.objects).some(
    (o) => o.controller !== player && o.status.stunned === true,
  )
  return enemyStunned ? [{ kind: 'reduce', part: 'total', mana: 2, source: 'UNL-035 啃啃' }] : []
}

   
                         
                                 
  
                                             
                                       
                                            
                                                                                      
   
                                                                                      
                                                       
                                                                           
                                              

   
                                      
                                                                      
                                                    
                                               
                                                                   
   
export function echoDiscountFor(state: GameState, player: PlayerId): number {
  return Object.entries(state.battlefieldCards ?? {}).filter(
    ([zid, bc]) => bc.defId === 'SFD-211' && controlsBattlefield(state, player, zid),
  ).length
}

   
                              
                                               
                                                          
  
                                            
                                                                 
                                                             
                                          
                                              
                                                    
                                  
                               
                                           
   
export function suppressionHelmCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
): readonly CostMod[] {
  if (!isSpell(defId)) return []
  const helms = Object.values(state.objects).filter((o) => {
    const k = state.zones[o.zone]?.kind
    return o.defId === 'VEN-045' && o.controller !== player && (k === 'base' || k === 'battlefield')
  })
  return helms.map((h) => ({
    kind: 'increase' as const,
    part: 'total' as const,
    mana: 1,
    ...(isEmpowered(h) ? { pips: 1 } : {}), // 「改为{1}和{A}」⇒ 多一枚任意特性符能
    source: `VEN-045 抑制之盔${isEmpowered(h) ? '(已强化)' : ''}`,
  }))
}

                                                                  
                                          
                                        
                                     
                                                             
  
                                                            
                                                           
                                               
                                                               
                                             
export const OUTSIDE_HAND_DISCOUNT = 2
const OUTSIDE_HAND_DEFIDS: Readonly<Record<string, string>> = {
  'SFD-010': 'SFD-010 虚空蜢',
  'SFD-164': 'SFD-164 流沙陷坑',
}

export function outsideHandCostMods(
  defId: string, ctx?: { readonly fromZone?: string },
): readonly CostMod[] {
  const src = OUTSIDE_HAND_DEFIDS[defId]
  if (src === undefined) return []
  const from = ctx?.fromZone
  if (from === undefined || from === 'hand') return []                        
  return [{ kind: 'reduce', part: 'mana', mana: OUTSIDE_HAND_DISCOUNT, floor: 0, source: src }]
}

   
                                      
                                              
  
         
                                                  
                                       
                                                         
                                                                     
                                                
                                       
                                                        
                                                      
                                                            
                                                 
                                                
                           
  
                                        
   
export function stargazerCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
  keywordsOf: (defId: string) => readonly string[],
  ctx?: { readonly fromZone?: string; readonly grantedRecursion?: true },
): readonly CostMod[] {
  if (ctx?.fromZone !== 'discard') return []
  if (!isSpell(defId)) return []
                                                                                              
                                                                     
  if (ctx.grantedRecursion !== true && !keywordsOf(defId).some((k) => k === RECURSION || k.startsWith(RECURSION))) return []
  const n = Object.values(state.objects).filter(
    (o) => o.defId === 'VEN-098' && o.controller === player && onField(state, o),
  ).length
  return Array.from({ length: n }, () => ({
    kind: 'reduce' as const,
    part: 'mana' as const,
    mana: STARGAZER_DISCOUNT,
    floor: STARGAZER_FLOOR,
    source: 'VEN-098 观星者',
  }))
}

                             
export const STARGAZER_DISCOUNT = 2
export const STARGAZER_FLOOR = 1

   
                                
                                           
  
       
                                                 
                                            
                                                                            
                                                                
                                                           
                                                
                                           
  
                                                           
                                               
                                         
  
                                                      
                                                                                     
                                                               
                                                                                     
                                                                                
                                                   
                          
   
export function sandTombCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
  ctx?: { readonly target?: string },
): readonly CostMod[] {
  const t = ctx?.target
  if (t === undefined) return []
  if (!isSpell(defId)) return []
  const hit = liveTargetOids(state, t).some((oid) => {
    const victim = state.objects[oid as never] as { readonly zone?: string; readonly controller?: PlayerId } | undefined
    if (!victim || victim.controller !== player) return false
    const here = victim.zone
    if (here === undefined) return false
    return state.battlefieldCards?.[here]?.defId === 'VEN-164'
  })
  if (!hit) return []
  return [{ kind: 'reduce', part: 'pips', pips: SAND_TOMB_PIPS, source: 'VEN-164 沙蚀墓穴' }]
}

                                     
export const SAND_TOMB_PIPS = 1

                                  
export const ORNN_FORGE_DISCOUNT = 1

                                                                         
export const ASTRAL_SURGE_PIPS = 1

                                                       
export const VEN_160_CARD_EFFECT =
  '在此处的法术对决中，拥有{{反应}}的卡牌费用增加{{A}}才能打出。（处于待命状态的卡牌具有{{反应}}。）'

   
                                                              
  
       
                                                        
                                                                                      
                                                     
                                                
                                                                      
                                                                                            
                                   
                                                      
  
                                                                                
                                                                   
                                                                                         
                                                    
   
export function astralSurgeCostMods(
  state: GameState,
  defId: string,
  keywordsOf: (defId: string) => readonly string[],
  ctx?: { readonly standbyFaceDown?: true },
): readonly CostMod[] {
  if (!state.spellDuelActive) return []                      
  const here = state.duelBattlefield
  if (here === undefined) return []
  if (state.battlefieldCards?.[here]?.defId !== 'VEN-160') return []
                                         
  if (ctx?.standbyFaceDown !== true && !keywordsOf(defId).includes(REACTION_KEYWORD)) return []
  return [{ kind: 'increase', part: 'pips', pips: ASTRAL_SURGE_PIPS, source: 'VEN-160 神秘星旋' }]
}

                               
const REACTION_KEYWORD = '反应'

                                                                  
export const SFD_213_CARD_EFFECT =
  '如果此战场受你控制，则每回合打出的第一件友方非指示物装备的费用减少{{1}}。'

   
                                                               
                                              
                                             
  
       
                                                  
                                                                 
                                                    
                                                   
                                           
                                                                                  
                                         
                                                                   
                        
                                                       
                                                      
                                                        
   
export function forgeCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isPlainEquipment: (defId: string) => boolean,
): readonly CostMod[] {
  if (!isPlainEquipment(defId)) return []
  if (state.playedEquipmentThisTurn?.[player] === true) return []                
  return controlledBattlefields(state, player)
    .filter((bf) => state.battlefieldCards?.[bf]?.defId === 'SFD-213')
    .map(() => ({
      kind: 'reduce' as const, part: 'mana' as const,
      mana: ORNN_FORGE_DISCOUNT, floor: 0, source: 'SFD-213 奥恩的锻炉',
    }))
}

   
                                                              
                                
  
       
                                                              
                                              
                                          
                                             
                                                   
                                                           
                              
  
                                                                        
                                                               
                                                                    
                                                                                
                                                      
                          
   
export function irelia141CostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  isSpell: (defId: string) => boolean,
  ctx?: { readonly target?: string },
): readonly CostMod[] {
  const t = ctx?.target
  if (t === undefined) return []
  if (!isSpell(defId)) return []
                                                                   
                                                            
                                                              
                                                   
  const isHer = liveTargetOids(state, t).some((oid) => {
    const her = state.objects[oid as never] as { readonly defId?: string; readonly controller?: PlayerId; readonly zone?: string } | undefined
    if (!her || !variantSiblings('SFD-141').includes(her.defId ?? '')) return false
    if (her.controller !== player) return false              
    return onField(state, her as { readonly zone: string })
  })
  if (!isHer) return []
  return [{
    kind: 'reduce', part: 'mana', mana: IRELIA_141_MANA, source: 'SFD-141 艾瑞莉娅',
    alt: { kind: 'reduce', part: 'pips', pips: IRELIA_141_PIPS, source: 'SFD-141 艾瑞莉娅' },
  }]
}

                                              
export const IRELIA_141_MANA = 1
export const IRELIA_141_PIPS = 1

   
                                                         
                                   
  
                                                       
                                                  
                                                                  
                                                                   
                                                              
                      
  
                    
                                                                       
                                           
                                          
                            
                                                    
                                                             
   
export function ezrealSP5CostMods(
  state: GameState,
  player: PlayerId,
  _defId: string,
): readonly CostMod[] {
  const kin = variantSiblings('SFD-149')
  const n = Object.values(state.objects).filter(
    (o) => kin.includes(o.defId) && o.controller === player && onField(state, o),
  ).length
  return Array.from({ length: n }, () => ({
    kind: 'reduce' as const,
    part: 'extra' as const,
    mana: EZREAL_SP5_MANA,
    source: '伊泽瑞尔',
    alt: { kind: 'reduce' as const, part: 'extra' as const, pips: EZREAL_SP5_PIPS, source: '伊泽瑞尔' },
  }))
}

                                              
export const EZREAL_SP5_MANA = 1
export const EZREAL_SP5_PIPS = 1

   
                                           
                                           
  
                                                       
                                                                                 
                                                                  
   
                                                               
                                                    

   
                                
                                     
  
       
                                                         
                                                                  
                                                                      
                                       
                                                                   
                                                   
                                               
   
export function ascendantAltarAbilityMods(
  state: GameState,
  player: PlayerId,
  _defId: string,
  abilityKey: string,
  selfOid: string,
): readonly CostMod[] {
  if (!abilityKey.startsWith('empower:')) return []                
  const src = state.objects[selfOid as never] as { readonly zone?: string; readonly controller?: PlayerId } | undefined
  if (!src || src.controller !== player) return []
  const here = src.zone
  if (here === undefined) return []
  if (state.battlefieldCards?.[here]?.defId !== 'VEN-163') return []
  return [{
    kind: 'reduce', part: 'mana', mana: ALTAR_MANA, source: 'VEN-163 升格圣坛',
    alt: { kind: 'reduce', part: 'pips', pips: ALTAR_PIPS, source: 'VEN-163 升格圣坛' },
  }]
}

   
                                  
                                                        
                                                          
                                                 
   
export function jujuCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'UNL-196') return []
  const n = animalTagKinds(state, player)
  return Array.from({ length: n }, () => ({
    kind: 'reduce' as const, part: 'mana' as const, mana: 1, source: 'UNL-196 小菊!',
  }))
}

                       
export const ALTAR_MANA = 1
export const ALTAR_PIPS = 1

                                
export const FORGE_MANA = 1

   
                                            
                                                 
                                      
  
                                                           
                                                                       
                                                             
                                                               
                                                                        
                                                                     
  
                                       
                                         
                                                    
                                              
                                                               
  
                                              
                                                                    
                                             
   
export function pilticoverForgeAbilityMods(
  state: GameState,
  player: PlayerId,
  _defId: string,
  _abilityKey: string,
  selfOid: string,
): readonly CostMod[] {
                                              
  const src = state.objects[selfOid as never] as GameObject | undefined
  if (!src || !isEquipment(src)) return []
                                
  if (src.controller !== player) return []
                                               
  if (state.firstEquipPlayedThisTurn?.[player as string] !== (selfOid as string)) return []
                                                 
  const forgeHere = Object.entries(state.battlefieldCards ?? {})
    .find(([, bc]) => bc.defId === 'VEN-161')?.[0]
  if (forgeHere === undefined) return []
  if (!controlsBattlefield(state, player, forgeHere)) return []
  return [{ kind: 'reduce', part: 'mana', mana: FORGE_MANA, source: 'VEN-161 皮城锻炉' }]
}

export const VEN_161_CARD_EFFECT =
  '如果此战场受你控制，则每回合首次打出的友方装备的主动技能，该技能费用减少{{1}}。'
export const VEN_161: Card = {
  id: 'VEN-161', cardNo: 'VEN·161', name: '皮城锻炉', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '我方控制此处时,本回合首件装备的主动技能减费{1}(pilticoverForgeAbilityMods)' }],
}

                                                         
export function allAbilityCostMods(
  state: GameState,
  player: PlayerId,
  defId: string,
  abilityKey: string,
  selfOid: string,
): readonly CostMod[] {
  return [
    ...ascendantAltarAbilityMods(state, player, defId, abilityKey, selfOid), // 第221轮
    ...pilticoverForgeAbilityMods(state, player, defId, abilityKey, selfOid), // ★584 皮城锻炉
  ]
}

   
                                                 
                                   
                                           
                                          
                                              
                                                                               
                                                           
                                                       
                                                   
  
       
                                                                    
                                                                     
                                                            
                                            
                                                                         
                                                       
                                           
   
export function hextechGauntletCostMods(
  state: GameState,
  _player: PlayerId,
  abilityKey: string,
  target?: string,
): readonly CostMod[] {
  if (!abilityKey.startsWith('equip:')) return []
                                                                
                                                           
                                        
  const o = target === undefined ? undefined : state.objects[target as never]
  if (!o) return []
  const might = effectiveMight(o).reference
  return might > 0
    ? [{ kind: 'reduce', part: 'mana', mana: might, source: 'UNL-188 海克斯科技护手(所选单位战力)' }]
    : []
}

                                                                
export const EQUIP_ABILITY_COST_MODS: Readonly<Record<string,
  (state: GameState, player: PlayerId, abilityKey: string, target?: string) => readonly CostMod[]>> = {
  'UNL-188': hextechGauntletCostMods, // 第224轮
}


                                                                 
                                                      
                                                        
                                                                                
                                                        
                                                                             
                          
                                                             
                                                
                                                               
                                                 
const unitCard = (
  id: string, cardNo: string, name: string, domain: Domain, energy: number, power: number,
): Card => ({
  id, cardNo, name, category: 'unit',
  domains: [domain], energy, power, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '减费类单位(减费实现见本文件的 costMods)' }],
})
                                                     
export const OGN_012: Card = unitCard('OGN-012', 'OGN·012/298', '诺克萨斯新兵', 'red', 4, 4)
                                     
export const OGN_084: Card = unitCard('OGN-084', 'OGN·084/298', '踊跃的学徒', 'blue', 3, 3)
                                    
export const OGN_140: Card = unitCard('OGN-140', 'OGN·140/298', '唤龙使者', 'orange', 4, 3)
                                  
export const UNL_035: Card = unitCard('UNL-035', 'UNL-035/219', '啃啃', 'green', 6, 6)
                                             
export const VEN_007: Card = unitCard('VEN-007', 'VEN·007', '拳拳魄罗', 'red', 2, 2)
                                    
export const VEN_119: Card = unitCard('VEN-119', 'VEN·119', '律法守护者', 'yellow', 5, 5)

                                                            
export const SFD_146: Card = {
  id: 'SFD-146', cardNo: 'SFD·146/221', name: '薇古丝', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '战斗中:友方法术减{1}+{A}(法力不低于1)/敌方法术增{1}+{A}(vexBattleCostMods;QA L261 加费施加于总费用)' }],
}

export const VEN_055: Card = {
  id: 'VEN-055', cardNo: 'VEN·055', name: '实干研究员', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: ['强化3'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '{已强化>}你的法术减{1}+{A}(法力不低于1)(pragmaticResearcherCostMods)' }],
}
