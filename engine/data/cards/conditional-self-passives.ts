                                                           
                                                                
                                                           
                                                             
                                
  
                                                   
                                                         
                                                           
                                                                  
                                     
  
                                                                 
                                                                             
  
                     
                                           
                                                                              
                                         
                                                        
import { passiveDefId } from '../passiveIdentity'                                      
import type { Card } from '../../src/dsl/card'
import type { GameObject } from '../../src/state/object'
import { isUnit } from '../../src/state/cardTypes'                                              
import type { StaticEffect } from '../../src/effects/continuousView'
import type { Cost } from '../../src/state/runePool'
import { hasBuff } from '../../src/keywords/buff'
import { effectiveMight } from '../../src/state/might'
import { JHIN_THRESHOLD } from './UNL-089'                             
import type { GameState } from '../../src/state/gameState'
import { resolveImplDefId } from '../variantAlias'

                                                
export const POWERFUL_MIN_MIGHT = 5

                                              
export const SIVIR_PIPS_MIN = 2

                        
export type SelfCondition =
                            
  | 'hasBuff'
  /** 「如果我变为**强力**单位」(§708 战力≥5) */
  | 'isPowerful'
  /** 「如果**你已在本回合内获得了经验值**」(§730;第七本回合账) */
  | 'gainedExpThisTurn'
  /** 「如果**你本回合内已经弃置过手牌**」(第八本回合账) */
  | 'discardedThisTurn'
  /** 「如果**此处**有一名**被眩晕的敌方单位**」(§423;★第420轮·凯南)——要 state 找同位置的物件 */
  | 'stunnedEnemyHere'
  /**
   * 「如果我所在的战场上受你控制的**其他**单位**有且仅有一个**」(★第511轮·慎的弟子 VEN-117)。
   * ⚠️⚠️ 这一档是**恰好等于 1**,不是"至少一个" —— 0 个不成立、2 个也不成立。
   *   ⑩① 破坏刀要配【恰好等于】的样本(0/1/2 三格都断),`>= 1` 那种写法只有 0 那格能抓出来。
   * ⚠️「**其他**」= 排除我自己(510 小蜘蛛同款限定词);「你」= 同一控制者;
   *   「我**所在的战场**」⇒ 同 zone(我若在基地,基地里的也按同 zone 算 —— 卡文写的是"战场",
   *   但这张牌只能落在战场或基地,落基地时它本来也不参与战斗、[坚守] 无意义,不额外判)。
   */
  | 'exactlyOneOtherAllyHere'
  /**
   * ★★★★★★第582轮:「如果**你在本回合消耗了不低于{4}的费用来打出一个法术**」
   * (晋升信徒 UNL·004)。
   *
   * ★★★【零新件:判据与账本都是烬 UNL·089 那轮(第462轮)建好的】
   *   这两张的**条件那半卡文逐字相同** —— 差别只在「则」之后:
   *     · 烬:「则你可以选择支付{蓝色}来**将我打出**」(替代打出费,CostMod 的 replace 档);
   *     · 这张:「则**我获得{S}+4**」(常驻自身被动,走本族的 `mightDelta`)。
   *   ⇒ 账本沿用**第二十三本** `maxSpellManaThisTurn`(单笔最大法术**实付法力**;
   *     写账点在 `interactiveGame` 的 PLAY_CARD 付费段),阈值常量沿用 `JHIN_THRESHOLD`。
   *   ㊼ 「不低于{4}」这个判据只有一处定义 —— **别在这里再写一个 4**。
   * ⚠️【是「单笔」不是「累计」】卡文写的是「消耗…来打出**一个**法术」⇒ 账记的是单笔最大值,
   *   两次各付 2 **不算数**。这正是那本账取 max 而不是求和的原因。
   * ⚠️【只算法力,不含符能】写账点记的是 `due.mana` —— 现成口径,两张卡必须共用同一本。
   */
  | 'spentBigOnSpellThisTurn'
  /**
   * ★★★★★★第681轮:「在本回合内,如果你**至少支付了{A}{A}**」(希维尔 SFD·143)。
   * 读**第二十二本**回合账 `pipsPaidThisTurn`(写账点在 `payFromState`——全引擎唯一支付
   * 执行口,打出/技能/急速费/别的卡的支付统统入账;卡文没写「为我支付」⇒ 全算)。
   * ⚠️【计符能不计法力】{A} 是符能记号:回收符文+符能池扣减算,横置产法力不算。
   * ⚠️【累计不是单笔】与 `spentBigOnSpellThisTurn`(单笔 max)不同:这句没有「一个/一笔」
   *   限定 ⇒ 账取累加,两次各付 1 枚也凑数。
   */
  | 'paidTwoPipsThisTurn'

export interface CondSelfPassiveRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                                
  readonly energy: number
  readonly power: number
  readonly category: 'unit' | 'hero_unit'
  readonly condition: SelfCondition
                                
  readonly grants: readonly string[]
                                                  
  readonly mightDelta?: number
                                                       
  readonly keywords?: readonly string[]
  readonly cardEffect: string
}

export const COND_SELF_PASSIVES: readonly CondSelfPassiveRow[] = [
  {
    defId: 'OGN-125', cardNo: 'OGN·125/298', name: '比尔吉沃特恶霸', domain: 'orange',
    cost: { mana: 6 }, energy: 6, power: 6, category: 'unit',
    condition: 'hasBuff', grants: ['游走'],
    cardEffect: '如果我拥有增益，则我获得{{游走}}。',
  },
  {
    defId: 'OGN-232', cardNo: 'OGN·232/298', name: '菲奥娜', domain: 'yellow',
    cost: { mana: 4 }, energy: 4, power: 4, category: 'hero_unit',
    condition: 'isPowerful', grants: ['法盾', '游走', '坚守'],
    cardEffect: '如果我变为{{强力}}单位，则我获得{{法盾}}、{{游走}}和{{坚守}}。',
  },
                                 
                                          
                                                      
                                                      
                                                             
                                                                             
                                                         
  {
    defId: 'VEN-117', cardNo: 'VEN·117', name: '慎的弟子', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, power: 1, category: 'unit',
    condition: 'exactlyOneOtherAllyHere', grants: ['坚守3'],
    keywords: ['待命'],
    cardEffect:
      '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
      '如果我所在的战场上受你控制的其他单位有且仅有一个，则我获得{{坚守3}}。（如果我是防守方，则{{S}}+3。）',
  },
                              
  {
    defId: 'UNL-108', cardNo: 'UNL-108/219', name: '狡猾的蝾螈', domain: 'orange',
    cost: { mana: 4 }, energy: 4, power: 4, category: 'unit',
    condition: 'gainedExpThisTurn', grants: ['游走'], mightDelta: 1,
    cardEffect: '如果你已在本回合内获得了经验值，则我获得{{S}}+1和{{游走}}。',
  },
  {
    defId: 'OGN-019', cardNo: 'OGN·019/298', name: '肆虐狂魂', domain: 'red',
    cost: { mana: 4 }, energy: 4, power: 4, category: 'unit',
    condition: 'discardedThisTurn', grants: ['强攻', '游走'],
    cardEffect: '如果你本回合内已经弃置过手牌，则我获得{{强攻}}和{{游走}}。',
  },
                                                                     
                                                      
                                                  
  {
    defId: 'VEN-135', cardNo: 'VEN·135', name: '凯南', domain: 'yellow',
    cost: { mana: 3 }, energy: 3, power: 2, category: 'hero_unit',
    condition: 'stunnedEnemyHere', grants: [], mightDelta: 2, keywords: ['待命'],
    cardEffect: '{{待命}}\n当你打出我时，或当我进攻时，你可以选择支付{{2}}，以此{{眩晕}}一名单位。\n'
      + '如果此处有一名被眩晕的敌方单位，则我获得{{S}}+2。',
  },
                                           
                                                  
                                                    
                                     
                                                               
                                                                   
  {
    defId: 'UNL-004', cardNo: 'UNL-004/219', name: '晋升信徒', domain: 'red',
    cost: { mana: 3 }, energy: 3, power: 1, category: 'unit',
    condition: 'spentBigOnSpellThisTurn', grants: [], mightDelta: 4,
    cardEffect: '如果你在本回合消耗了不低于{{4}}的费用来打出一个法术，则我获得{{S}}+4。',
  },
                                                                
                                                                 
                                                                  
                                                          
  {
    defId: 'SFD-143', cardNo: 'SFD·143/221', name: '希维尔', domain: 'purple',
    cost: { mana: 4, pips: [['purple']] }, energy: 4, power: 4, category: 'hero_unit',
    condition: 'paidTwoPipsThisTurn', grants: ['游走'], mightDelta: 2, keywords: ['急速'],
    cardEffect: '{{急速}}（你可以选择额外支付{{1}}和{{紫色}}，让我以活跃状态进场。）\n'
      + '在本回合内，如果你至少支付了{{A}}{{A}}，则我获得{{S}}+2和{{游走}}。（我可以向其他战场进行移动。）',
  },
]

   
                             
                                                      
                                            
                                              
   
export function conditionHolds(cond: SelfCondition, o: GameObject, state?: GameState): boolean {
  switch (cond) {
    case 'hasBuff':
      return hasBuff(o)
    case 'isPowerful':
                                              
      return effectiveMight(o).reference >= POWERFUL_MIN_MIGHT
    case 'gainedExpThisTurn':
      return state?.gainedExperienceThisTurn?.[o.controller as string] === true
    case 'discardedThisTurn':
      return state?.discardedThisTurn?.[o.controller as string] === true
    case 'stunnedEnemyHere':
                                               
                                                                     
      if (!state) return false
      return Object.values(state.objects).some((x) =>
        x.zone === o.zone && x.controller !== o.controller
                                                                                                     
                                                                                               
                                                                                                     
        && x.status.stunned === true && isUnit(x))
    case 'spentBigOnSpellThisTurn':
                                                           
      return (state?.maxSpellManaThisTurn?.[o.controller as string] ?? 0) >= JHIN_THRESHOLD
    case 'paidTwoPipsThisTurn':
                                                                   
      return (state?.pipsPaidThisTurn?.[o.controller as string] ?? 0) >= SIVIR_PIPS_MIN
    case 'exactlyOneOtherAllyHere': {
                                                        
                                          
      if (!state) return false
      const others = Object.values(state.objects).filter((x) =>
        x.oid !== o.oid
        && x.zone === o.zone
        && x.controller === o.controller
                                                                                                     
                                                                           
                                                                                  
        && isUnit(x)).length
      return others === 1
    }
  }
}

const BY_DEF: Readonly<Record<string, CondSelfPassiveRow>> =
  Object.fromEntries(COND_SELF_PASSIVES.map((r) => [r.defId, r]))

   
                                     
                                                          
                                               
   
export function conditionalSelfPassives(obj: GameObject, state?: GameState): readonly StaticEffect[] {
  const row = BY_DEF[resolveImplDefId(passiveDefId(obj), (x) => x in BY_DEF)]                                           
  if (row === undefined) return []
  const selfOid = obj.oid
                             
                                                       
                                                                     
                                                            
                                                  
                                                       
  const mine = (x: GameObject): boolean => x.oid === selfOid && conditionHolds(row.condition, x, state)
  const out: StaticEffect[] = row.grants.map((kw): StaticEffect => ({
    id: `${row.defId}:cond:${kw}:${selfOid}`,
    duration: 'permanent',
    fromPassive: true,
    timestamp: 0,
    predicate: mine,
    modification: { kind: 'grantKeyword', keyword: kw },
  }))
                                                    
  if (row.mightDelta !== undefined) {
    out.push({
      id: `${row.defId}:cond:might:${selfOid}`,
      duration: 'permanent',
      fromPassive: true,
      timestamp: 0,
      predicate: mine,
      modification: { kind: 'addMight', delta: row.mightDelta },
    })
  }
  return out
}

export const COND_SELF_UNIT_COST: Readonly<Record<string, Cost>> =
  Object.fromEntries(COND_SELF_PASSIVES.map((r) => [r.defId, r.cost]))

export const COND_SELF_CARDS: readonly Card[] = COND_SELF_PASSIVES.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'unit',
  domains: [r.domain], energy: r.energy, power: r.power, keywords: r.keywords ?? [],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `${r.condition} 成立时我获得 ${r.grants.join('、')}(conditionalSelfPassives)` }],
}) as Card)
