                                                                  
                                                                 
                                                       
                                                        
                                                               
                                                           
                                                              
  
                                                           
                                                               
                                                                
                                           
  
                          
                                                              
                                                
                                                                         
                              
                                           
                                                             
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { battlefieldUnits } from './diana-reactions'
import { fieldedUnits } from './activated-batch'
import { controlsFaceDownStandby } from './OGN-101'                                   
import { CARD_COSTS } from '../cardCosts'                           
import { CARD_FACTS } from '../cardFacts'                      
import { GOLD_TOKEN } from './gear-triggers'                     
import { hasDomain, domainIdOf } from './card-domain'                        
import { inBattle } from '../../src/combat/battleRoles'                                         

   
                                                    
  
                                                                 
                                          
                                                                               
                                                    
                        
   
function discardableHand(state: GameState, player: PlayerId): readonly ObjId[] {
  return (state.zones[`hand:${player}` as unknown as keyof typeof state.zones] as
    { readonly contents: readonly ObjId[] } | undefined)?.contents ?? []
}

                         
export type DamageScope =
                                  
  | 'oneOnBattlefield'
  /** 「对**战斗中的所有敌方**单位各」——不选目标,群体 */
  | 'allEnemiesInCombat'
  /** 「对**所有战场上的**单位各…**不分敌我**」——不选目标,群体,不过滤 */
  | 'allOnBattlefields'
  /**
   * ★第343轮:「对**一名单位**造成 N 点伤害」——**一个位置词都没有**(终极闪光 OGS-022)。
   * ⇒ `fieldedUnits`(**含基地**),与 `oneOnBattlefield`(不含基地)是**两个口径**,别混。
   * ⚠️ 这一档是**后加的**:前五张一个都不走它,缺省行为完全不变(配了回归闸)。
   */
  | 'oneAnywhere'
  /**
   * ★第512轮:「选择一处战场,以及**该处的一名敌方单位**」(新月打击 UNL-072)。
   * ⇒ 候选 = **战场上的**(不含基地)+ **敌方的**(§477.1 按控制者)。
   * ⚠️ 与 `oneOnBattlefield` 差的就是【敌方】那一条 —— 那一档不分敌我、我自己的也能选,
   *   照抄会让这张牌能打自己人(⑳「敌方单位」= controller 不是我)。
   * ⚠️ 卡文那句「选择一处战场」不是第二个目标:选中的那名敌方单位所在的战场**就是**该处
   *   (§355 打出时锁定的是单位;战场是从它身上读出来的)⇒ 不开第二个目标位。
   */
  | 'oneEnemyOnBattlefield'
  /**
   * ★第516轮:「对一名**具有<某某>(某色)特性**的敌方单位」(暴怒箴言 VEN-015 打绿色)。
   * 在 `oneEnemyOnBattlefield` 的基础上再卡一道**域**,颜色由 `enemyDomain` 那一格带
   *   —— 箴言系列每色一张,档本身不写死颜色。
   * ⚠️ 判据走 `card-domain.ts` 的 `hasDomain`(㊼ 全仓唯一定义处;516 把散在两处的收了口)。
   * ⚠️「敌方」「战场上」两条照旧(与上一档同一个口)。
   */
  | 'oneEnemyWithDomain'

export interface DamageSpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
  readonly scope: DamageScope
                  
  readonly amount: number
                               
  readonly draw?: number
     
                                               
                                                
                                                               
     
  readonly gold?: number
     
                                                 
                                                       
                                                
                              
                                              
                                                      
                                            
     
  readonly boost?: {
    readonly amount: number
    readonly when: (state: GameState, controller: PlayerId, target?: string) => boolean
                                
    readonly note: string
  }
     
                                                            
                                                           
    
                                                    
                                               
     
  readonly amountOf?: (
    state: GameState, controller: PlayerId, target?: string,
    chosen?: Readonly<Record<string, string>>,
  ) => number
     
                                                   
                        
                                                          
                                                                               
                                                   
     
  readonly discard?: { readonly key: string; readonly prompt: string }
     
                                                     
                                                                  
                                                       
                         
                                                            
                       
                                              
                                                             
                                                     
     
  readonly splash?: { readonly amount: number }
     
                                                                         
                              
     
  readonly enemyDomain?: string
     
                                                         
                                              
                                                  
                                      
                                            
                                                                  
                                               
                                                     
     
  readonly drawIfKilled?: number
     
                                         
                                                     
                                                                              
                                         
     
  readonly unnegatable?: true
  readonly cardEffect: string
}

export const DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'OGN-009', cardNo: 'OGN·009/298', name: '海克斯射线', domain: 'red',
    cost: { mana: 1, pips: [['red']] }, energy: 1, keywords: ['迅捷'],
    scope: 'oneOnBattlefield', amount: 3,
    cardEffect: '对战场上的一名单位造成3点伤害。',
  },
  {
    defId: 'OGN-085', cardNo: 'OGN·085/298', name: '彗星坠击', domain: 'blue',
    cost: { mana: 5 }, energy: 5, keywords: ['迅捷'],
    scope: 'oneOnBattlefield', amount: 6,
    cardEffect: '对战场上的一名单位造成6点伤害。',
  },
                                                                             
                                                     
  {
    defId: 'OGN-014', cardNo: 'OGN·014/298', name: '霹天雳地', domain: 'red',
    cost: { mana: 8, pips: [['red']] }, energy: 8, keywords: ['迅捷'],
    scope: 'oneOnBattlefield', amount: 5,
    cardEffect: '将我的法力费用减去你所控制单位中的最高战力值，即为打出我所需的法力。\n'
      + '对战场上的一名单位造成5点伤害。',
  },
  {
    defId: 'OGN-024', cardNo: 'OGN·024/298', name: '虚空索敌', domain: 'red',
    cost: { mana: 3, pips: [['red']] }, energy: 3, keywords: ['迅捷'],
    scope: 'oneOnBattlefield', amount: 4, draw: 1,
    cardEffect: '对战场上的一名单位造成4点伤害，然后抽一张牌。',
  },
  {
    defId: 'OGN-127', cardNo: 'OGN·127/298', name: '加农炮幕', domain: 'orange',
    cost: { mana: 2, pips: [['orange']] }, energy: 2, keywords: ['反应'],
    scope: 'allEnemiesInCombat', amount: 2,
    cardEffect: '对战斗中的所有敌方单位各造成2点伤害。',
  },
  {
    defId: 'OGN-133', cardNo: 'OGN·133/298', name: '剑刃飓风', domain: 'orange',
    cost: { mana: 1 }, energy: 1, keywords: ['反应'],
    scope: 'allOnBattlefields', amount: 1,
    cardEffect: '对所有战场上的单位各造成1点伤害，不分敌我。',
  },
                                        
  {
    defId: 'OGS-003', cardNo: 'OGS·003/024', name: '焚烧', domain: 'red',
    cost: { mana: 2 }, energy: 2, keywords: ['迅捷'], // ⚠️ 0 pip ⇒ 只写 mana
    scope: 'oneOnBattlefield', amount: 2, // 卡文写了「对**战场上的**一名单位」⇒ 老档
    cardEffect: '对战场上的一名单位造成2点伤害。',
  },
  {
    defId: 'OGS-022', cardNo: 'OGS·022/024', name: '终极闪光', domain: 'blue',
                                                                    
    cost: { mana: 8 }, energy: 8, keywords: ['迅捷'],
    scope: 'oneAnywhere', amount: 8, // ★卡文「对**一名单位**」**没有位置词** ⇒ 新档,含基地
    cardEffect: '对一名单位造成8点伤害。',
  },
                                                                     
  {
    defId: 'OGN-252', cardNo: 'OGN·252/298', name: '超究极死神飞弹！', domain: 'red',
    cost: { mana: 4, pips: [['red', 'purple']] }, energy: 4, keywords: [], // 无印刷关键词(普通速度)
    scope: 'oneAnywhere', amount: 5, // 「对**一名单位**」无位置词 ⇒ 含基地
    cardEffect: '对一名单位造成5点伤害。\n每当你征服一处战场时，你可以选择弃置一张手牌，以此让此牌从废牌堆返回你的手牌。',
  },
]

                                                                            
                                                  
                                                                  
                                                                          
                                                                                                

   
                                
                                                            
   
export function damageVictims(
  scope: DamageScope, state: GameState, controller: PlayerId, domain?: string,
): string[] {
  const onBf = battlefieldUnits(state)
  switch (scope) {
    case 'oneOnBattlefield':
      return onBf.slice().sort()                      
    case 'allEnemiesInCombat':
      return onBf
        .filter((oid) => {
          const o = state.objects[oid as ObjId]
          return o !== undefined && o.controller !== controller && inBattle(o)
        })
        .sort()
    case 'allOnBattlefields':
      return onBf.slice().sort()                   
    case 'oneAnywhere':
                                                       
      return (fieldedUnits(state) as unknown as string[]).slice().sort()
    case 'oneEnemyOnBattlefield':
                                                  
      return onBf
        .filter((oid) => {
          const o = state.objects[oid as ObjId]
          return o !== undefined && o.controller !== controller
        })
        .sort()
    case 'oneEnemyWithDomain':
                                                             
      if (domain === undefined) return []
      return onBf
        .filter((oid) => {
          const o = state.objects[oid as ObjId]
                                                            
          return o !== undefined && o.controller !== controller && hasDomain(domainIdOf(o), domain)
        })
        .sort()
  }
}

   
                                               
                                                    
                                                         
  
                       
                                   
                                                                
                                                           
                                                                 
                                                
                                                 
   
export function splashDamageEvents(
  state: GameState, main: string | undefined, controller: PlayerId,
  source: string, amount: number,
): GameEvent[] {
  const here = main === undefined ? undefined : state.objects[main as ObjId]?.zone
  if (here === undefined) return []
  const out: GameEvent[] = []
  for (const oid of damageVictims('oneEnemyOnBattlefield', state, controller)) {
    if (oid === main) continue                  
    if (state.objects[oid as ObjId]?.zone !== here) continue                    
    out.push({
      kind: 'damage', target: oid as ObjId, amount,
      source: source as ObjId, sourcePlayer: controller,
    } as GameEvent)
  }
  return out
}

                                        
export function makeDamageSpellSpec(row: DamageSpellRow): PlaySpec {
                                                 
                                                             
  const single = row.scope === 'oneOnBattlefield' || row.scope === 'oneAnywhere'
    || row.scope === 'oneEnemyOnBattlefield'
    || row.scope === 'oneEnemyWithDomain'                             
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
                                        
    target: single ? 'custom' : 'none',
    legalTargets: (state, controller) =>
      (single ? damageVictims(row.scope, state, controller, row.enemyDomain) : []),
                                            
    ...(row.discard === undefined ? {} : {
      makeNextChoice:
        ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
        (state: GameState, chosen: Readonly<Record<string, string>>) => {
          if (chosen[row.discard!.key] !== undefined) return null
          const hand = discardableHand(state, controller)
          if (hand.length === 0) return null                             
          return {
            itemId: `spell:${movedCardOid}:${row.defId}`,
            controller,
            key: row.discard!.key,
            prompt: row.discard!.prompt,
            candidates: hand.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          }
        },
    }),
    makeResolve:
      ({ target, movedCardOid, controller }) =>
      (state, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                         
                                                    
                                   
        const victims = single
          ? (target !== undefined
            && damageVictims(row.scope, state, controller, row.enemyDomain).includes(target) ? [target] : [])
          : damageVictims(row.scope, state, controller, row.enemyDomain)
                                                           
                                                 
                                                                      
        const amount = row.amountOf !== undefined
          ? row.amountOf(state, controller, target, chosen)
          : row.boost !== undefined && row.boost.when(state, controller, target)
            ? row.boost.amount
            : row.amount
        const out: GameEvent[] = []
                                                              
                                                                          
                                            
        const discarded = row.discard === undefined ? undefined : (chosen ?? {})[row.discard.key]
        if (discarded !== undefined && discardableHand(state, controller).includes(discarded as ObjId)) {
          out.push({ kind: 'zoneChange', obj: discarded as ObjId, to: `discard:${controller}` as ZoneId } )
        }
        out.push(...victims.map((oid): GameEvent => ({
          kind: 'damage',
          target: oid as ObjId,
          amount,
                                                                   
          source: movedCardOid as ObjId,
          sourcePlayer: controller,
        } as GameEvent)))
                                                                 
                                                                      
                                                                       
        if (row.splash !== undefined) {
          out.push(...splashDamageEvents(state, victims[0], controller, movedCardOid, row.splash.amount))
        }
                                            
                                                            
                                                  
        if (row.drawIfKilled !== undefined) {
          for (const oid of victims) {
            out.push({
              kind: 'delayedTrigger',
              add: {
                id: `drawIfDestroyedByCard:${row.defId}:${oid}`,
                kind: 'drawIfDestroyedByCard',
                target: oid as ObjId,
                byCard: row.defId,
                count: row.drawIfKilled,
                controller,
                sourceDefId: row.defId,
              },
            } )
          }
        }
                               
        if (row.draw !== undefined) out.push({ kind: 'draw', player: controller, count: row.draw } as GameEvent)
                                                      
        for (let i = 0; i < (row.gold ?? 0); i++) {
          out.push({ kind: 'spawnToken', spec: GOLD_TOKEN, zone: `base:${controller}` as ZoneId, owner: controller, dormant: true } )
        }
        return out
      },
  }
}

                                                              
                                   
                                            
                                                   
                                                                     
export const BOOST_DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'SFD-017', cardNo: 'SFD·017/221', name: '雷霆突降', domain: 'red',
    cost: { mana: 3 }, energy: 3, keywords: ['待命', '迅捷'], // cardCosts 实测 3+0pip
    scope: 'oneOnBattlefield', amount: 2,
    boost: {
      amount: 4,
                                                                  
      when: (state, _c, target) => target !== undefined && state.objects[target as ObjId]?.status.attacking === true,
      note: '如果它是进攻方',
    },
    cardEffect: '对战场上的一名单位造成2点伤害。如果它是进攻方，则改为对其造成4点伤害。',
  },
  {
    defId: 'UNL-014', cardNo: 'UNL-014/219', name: '渊海狩咒', domain: 'red',
    cost: { mana: 1, pips: [['red']] }, energy: 1, keywords: ['迅捷'], // cardCosts 实测 1+1红pip
    scope: 'oneOnBattlefield', amount: 2,
    boost: {
      amount: 4,
                                                             
      when: (state, controller) => controlsFaceDownStandby(state, controller),
      note: '如果你控制着一张正面朝下的卡牌',
    },
    cardEffect: '对战场上的一名单位造成2点伤害。如果你控制着一张正面朝下的卡牌，则改为对该单位造成4点伤害。',
  },
]

   
                                       
                                                   
                                                                
                                           
   
                                                                     
                                             
                                                          
                                                         
                                                        
                                                                
                                                          
                                               
                                                                        
export const VEN_010_BASE = 2
export const VEN_010_PER_COPY = 1
export const OGN_008_KEY = 'sinfulDiscard'

                                         
export function sameNameInDiscard(state: GameState, player: PlayerId, defId: string): number {
  const myName = CARD_FACTS[defId]?.name
  if (myName === undefined) return 0
  const pile = (state.zones[`discard:${player}` as unknown as keyof typeof state.zones] as
    { readonly contents: readonly ObjId[] } | undefined)?.contents ?? []
  return pile.filter((oid) => {
    const d = state.objects[oid]?.defId
    return d !== undefined && CARD_FACTS[d]?.name === myName
  }).length
}

                                                             
export function discardedMana(state: GameState, chosen?: Readonly<Record<string, string>>): number {
  const oid = (chosen ?? {})[OGN_008_KEY]
  if (oid === undefined) return 0
  const defId = state.objects[oid as ObjId]?.defId
  return defId === undefined ? 0 : (CARD_COSTS[defId]?.mana ?? 0)
}

export const VARIABLE_DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'VEN-010', cardNo: 'VEN·010', name: '蚀骨诅咒', domain: 'red',
    cost: { mana: 2 }, energy: 2, keywords: ['迅捷'], // cardCosts 实测:2 法力 **0 pip**
    scope: 'oneOnBattlefield', amount: VEN_010_BASE,
    amountOf: (state, controller) => VEN_010_BASE + VEN_010_PER_COPY * sameNameInDiscard(state, controller, 'VEN-010'),
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '对战场上的一名单位造成2点伤害。你的废牌堆中每有一张此牌的同名卡牌，此牌便造成1点额外伤害。',
  },
  {
    defId: 'OGN-008', cardNo: 'OGN·008/298', name: '罪恶快感', domain: 'red',
    cost: { mana: 2, pips: [['red']] }, energy: 2, keywords: ['迅捷'], // cardCosts 实测:2 法力 + 1 红 pip
    scope: 'oneOnBattlefield', amount: 0, // 没弃到牌就是 0 点(手牌为空时这一半落空)
    discard: { key: OGN_008_KEY, prompt: '罪恶快感:弃置一张手牌(伤害 = 它的法力费用)' },
    amountOf: (state, _controller, _target, chosen) => discardedMana(state, chosen),
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '弃置一张手牌。对战场上的一名单位造成等同于被弃置手牌的法力费用的伤害。（无视其符能费用。）',
  },
]

                                                                    
                                                    
                                        
                                                           
export const GOLD_DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'SFD-070', cardNo: 'SFD·070/221', name: '痛苦之酬', domain: 'blue',
    cost: { mana: 3 }, energy: 3, keywords: ['待命', '迅捷'], // cardCosts 实测:3 法力 **0 pip**
    scope: 'oneOnBattlefield', amount: 3, gold: 1,
    cardEffect:
      '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '对战场上的一名单位造成3点伤害。打出一个休眠的“金币”装备指示物。',
  },
]

                                                              
                                          
                                                        
                    
                                                      
                                          
                                            
                                                           
export const SPLASH_DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'UNL-072', cardNo: 'UNL-072/219', name: '新月打击', domain: 'blue',
    cost: { mana: 3, pips: [['blue']] }, energy: 3, keywords: ['迅捷'], // cardCosts 实测:3 法力 **1 蓝pip**
    scope: 'oneEnemyOnBattlefield', amount: 4, splash: { amount: 1 },
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '选择一处战场，以及该处的一名敌方单位。对该单位造成4点伤害，并对该处的其他敌方单位各造成1点伤害。',
  },
]

                                                              
                                         
                                             
                    
                                                    
                                                 
                                                                 
                                                        
                                                     
export const DOMAIN_DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'VEN-015', cardNo: 'VEN·015', name: '暴怒箴言', domain: 'red',
    cost: { mana: 1, pips: [['red']] }, energy: 1, keywords: ['迅捷'],
    scope: 'oneEnemyWithDomain', enemyDomain: 'green', amount: 4,
    unnegatable: true,
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '此牌无法被无效化。\n' +
      '对一名具有翠意（{{绿色}}）特性的敌方单位造成4点伤害。',
  },
]

                                                           
                                          
                                    
                                            
                                                 
                                                    
                                             
                                            
export const KILL_RIDER_DAMAGE_SPELLS: readonly DamageSpellRow[] = [
  {
    defId: 'OGN-005', cardNo: 'OGN·005/298', name: '碎裂之火', domain: 'red',
    cost: { mana: 4 }, energy: 4, keywords: ['迅捷'], // cardCosts 实测:4 法力 **0 pip**
    scope: 'oneOnBattlefield', amount: 3,
    drawIfKilled: 1,
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '对战场上的一名单位造成3点伤害。如果该单位被此法术摧毁，则进行一次：抽一张牌。',
  },
]

export const ALL_DAMAGE_SPELLS: readonly DamageSpellRow[] =
  [...DAMAGE_SPELLS, ...BOOST_DAMAGE_SPELLS, ...VARIABLE_DAMAGE_SPELLS, ...GOLD_DAMAGE_SPELLS,
    ...SPLASH_DAMAGE_SPELLS, ...DOMAIN_DAMAGE_SPELLS, ...KILL_RIDER_DAMAGE_SPELLS]

                                                                   
export const UNNEGATABLE_DAMAGE_DEFIDS: readonly string[] =
  ALL_DAMAGE_SPELLS.filter((r) => r.unnegatable === true).map((r) => r.defId)

export const DAMAGE_SPELL_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(ALL_DAMAGE_SPELLS.map((r) => [r.defId, makeDamageSpellSpec(r)]))

export const DAMAGE_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(ALL_DAMAGE_SPELLS.map((r) => [r.defId, r.keywords]))

export const DAMAGE_SPELL_CARDS: readonly Card[] = ALL_DAMAGE_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `${r.scope} 各 ${r.amount} 点伤害`
    + `${r.draw !== undefined ? `,然后抽 ${r.draw} 张` : ''}(DAMAGE_SPELL_SPECS)` }],
}) as Card)

                                                            
                                            
                                                                        
                                                                          
                                                         
                                                    
                            
import { compileTrigger } from '../../src/dsl/triggerSpec'
import type { Trigger } from '../../src/dsl/trigger'

export function makeMissile252Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-252:${selfOid}`, rawId: true,
    sourceDefId: 'OGN-252',
    event: 'conquer', by: 'you',
    mayChoose: true,
    when: [
      { kind: 'eventPlayerIs', side: 'you' },
                                                      
      { kind: 'custom', test: (_ev, state) => state.zones[state.objects[selfOid]?.zone ?? ('' as never)]?.kind === 'discard' },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['discardCard'] !== undefined) return null
      const hand = state.zones[`hand:${controller}` as never]?.contents ?? []
      if (hand.length === 0) return null                  
      return { itemId: `trig:OGN-252:${selfOid}`, controller, key: 'discardCard',
        prompt: '超究极死神飞弹:弃置哪张手牌?(以此让它从废牌堆回手)',
        candidates: hand.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid} 弃置` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const card = chosen?.['discardCard']
      const self = state.objects[selfOid]
                                         
      if (card === undefined) return []
      const c = state.objects[card as ObjId]
      if (c === undefined || state.zones[c.zone]?.kind !== 'hand') return []
      if (self === undefined || state.zones[self.zone]?.kind !== 'discard') return []
      return [
        { kind: 'zoneChange', obj: c.oid, to: `discard:${controller}` } as GameEvent,
        { kind: 'zoneChange', obj: self.oid, to: `hand:${controller}` } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

                                                                                                      
                                                                                  
                                                                                                       
export const OGN_005_CARD_EFFECT = '{{迅捷}}（可在你的回合或法术对决中打出。）\n对战场上的一名单位造成 3 点伤害。如果该单位被此法术摧毁，则进行一次：抽一张牌。'
