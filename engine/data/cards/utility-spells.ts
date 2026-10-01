                                                                  
                                                               
                                                      
                                           
                            
                                                               
                                      
                                    
                                                          
  
                                        
                                                          
                                     
                                                        
                                                             
  
                                
                                               
                                         
                                                                        
                                 
                                                           
                       
                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec, PlayCtx } from '../../src/loop/playSpec'
import type { PlayerId, ZoneId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { ROBOT_TOKEN } from './token-spells'
import { GOLD_TOKEN } from './gear-triggers'                            
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                                         
import { hasteKeyOf } from './haste-key'                                                       
import type { GameState } from '../../src/state/gameState'
import type { Selector } from '../../src/dsl/selector'
import { resolveSelector } from '../../src/dsl/selector'
                                                
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'

export interface UtilitySpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
                                                                            
  readonly keywords: readonly string[]
     
                                                   
                                                              
                                  
                                                                    
     
  readonly echo?: Cost
     
                     
                                                       
                                           
                                          
     
  readonly effects: (controller: PlayerId, state?: GameState, chosen?: Readonly<Record<string, string>>) => readonly GameEvent[]                                                        
     
                                                   
                                                                              
                                                                     
                                         
                                                                
                                                
     
  readonly insight?: number
     
                                                                                      
                                                           
                                                                                             
     
  readonly makeNextChoice?: NonNullable<PlaySpec['makeNextChoice']>
  readonly cardEffect: string
}

                                        
export const SFD_076_HASTE_KEY = hasteKeyOf('SFD-076:robot')

export const UTILITY_SPELLS: readonly UtilitySpellRow[] = [
                                                                        
                                                                      
    
                                                        
                                                      
                                                          
                                                 
                                                    
                                            
  {
    defId: 'VEN-056', cardNo: 'VEN·056', name: '千里眼', domain: 'blue',
    cost: { mana: 7 }, energy: 7, // 上游 pips=0 ⇒ 一枚都不写(㊶)
    keywords: ['反应'],
    insight: 5,
    effects: (p) => [{ kind: 'draw', player: p, count: 2 } as GameEvent],
    cardEffect:
      '反应（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '洞察5。（查看你主牌堆顶部的五张牌。你可以将其中任意卡牌回收，'
      + '并将其余的卡牌按任意顺序放回原处。）\n'
      + '抽两张牌。',
  },
  {
    defId: 'OGN-047', cardNo: 'OGN·047/298', name: '御衡守念', domain: 'green',
    cost: { mana: 3 }, energy: 3, keywords: ['迅捷'],
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n如果对手得分距离胜利得分不超过3分，则此法术的费用减少{{2}}。\n抽一张牌，然后召出一枚休眠的符文。',
                                             
    effects: (p) => [
      { kind: 'draw', player: p, count: 1 } as GameEvent,
      { kind: 'summonRune', player: p, count: 1, dormant: true } as GameEvent,
    ],
  },
  {
    defId: 'SFD-076', cardNo: 'SFD·076/221', name: '产量激增', domain: 'blue',
    cost: { mana: 4, pips: [['blue']] }, energy: 4, keywords: [],
    cardEffect:
      '如果你控制着“机械”属性单位，则此牌的费用减少{{2}}。\n打出一名3{{S}}的“机器人”到你的基地。\n抽一张牌。',
                                                  
                                                
                                                                                                      
    makeNextChoice: ({ movedCardOid, controller }) => (state, chosen) =>
      spawnTokenHasteChoice(state, controller, ROBOT_TOKEN, { itemId: `play:${movedCardOid}`, key: SFD_076_HASTE_KEY, label: '机器人' }, chosen),
    effects: (p, state, chosen) => {
      const x = state === undefined ? { ready: false, pre: [] as readonly GameEvent[] } : spawnTokenHasteResolve(state, p, ROBOT_TOKEN, SFD_076_HASTE_KEY, chosen)                        
      return [
        ...x.pre,
        { kind: 'spawnToken', spec: ROBOT_TOKEN, zone: `base:${p}` as ZoneId, owner: p, ...(x.ready ? { ready: true } : {}) } as GameEvent,
        { kind: 'draw', player: p, count: 1 } as GameEvent,
      ]
    },
  },
  {
    defId: 'UNL-091', cardNo: 'UNL-091/219', name: '聚心凝神', domain: 'orange',
    cost: { mana: 5 }, energy: 5, keywords: [],
    cardEffect:
      '抽两张牌。\n{{等级6>}} 此牌的费用减少{{2}}。（如果你拥有不少于6经验，则获得该效果。）\n{{等级11>}} 改为此牌的费用减少{{4}}。',
                                                                      
                                                            
    effects: (p) => [{ kind: 'draw', player: p, count: 2 } as GameEvent],
  },
                                      
  {
    defId: 'UNL-061', cardNo: 'UNL-061/219', name: '台前作秀', domain: 'blue',
    cost: { mana: 2 }, energy: 2, keywords: ['反应'], echo: { mana: 2 }, // §820 [回响2]
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '{{回响}}{{2}}（你可以选择支付此额外费用，以重复此法术效果。）\n抽一张牌。',
    effects: (p) => [{ kind: 'draw', player: p, count: 1 } as GameEvent],
  },
                                
  {
    defId: 'SFD-106', cardNo: 'SFD·106/221', name: '实力至上', domain: 'orange',
    cost: { mana: 2, pips: [['orange']] }, energy: 2, keywords: ['反应'],
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '你每控制一名{{强力}}单位，就抽一张牌。（战力达到5或以上时，即为强力单位。）',
                             
                                                                         
                                               
                                                                             
                                                            
    effects: (p, state) => {
      const n = state === undefined ? 0 : mightyUnitsOf(state, p).length
      return n > 0 ? [{ kind: 'draw', player: p, count: n } as GameEvent] : []
    },
  },
                                      
  {
    defId: 'VEN-049', cardNo: 'VEN·049', name: '深水打捞', domain: 'blue',
                                                                   
                                                                       
                                                                        
    cost: { mana: 2 }, energy: 2, keywords: ['流转2'],
    cardEffect:
      '抽一张牌。\n{{流转2}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）',
                                                  
    effects: (p) => [{ kind: 'draw', player: p, count: 1 } as GameEvent],
  },
                                                                  
                                                      
                      
                                                                                
                                                    
                                                 
                                                                  
                                                            
                                                              
                                                               
                                     
  {
    defId: 'SFD-004', cardNo: 'SFD·004/221', name: '丛林伏击', domain: 'red',
    cost: { mana: 2, pips: [['red']] }, energy: 2, keywords: ['待命'], // cardCosts 实测:2 法力 **1 红pip**
    cardEffect:
      '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
      + '在本回合内，友方单位以活跃状态进场。打出一个休眠的“金币”装备指示物。',
    effects: (p) => [
      { kind: 'markAllUnitsEnterReady', player: p } as GameEvent,
      { kind: 'spawnToken', spec: GOLD_TOKEN, zone: `base:${p}` as ZoneId, owner: p, dormant: true } ,
    ],
  },
                                           
  {
    defId: 'OGN-129', cardNo: 'OGN·129/298', name: '迎敌号令', domain: 'orange',
    cost: { mana: 2 }, energy: 2, keywords: ['迅捷'], // 上游 pips=0 ⇒ 一枚都不写
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
      + '在本回合内，你打出的所有单位以活跃状态进场。抽一张牌。',
                                                                      
                                                      
                                                                       
                        
    effects: (p) => [
      { kind: 'markAllUnitsEnterReady', player: p } as GameEvent,
      { kind: 'draw', player: p, count: 1 } as GameEvent,
    ],
  },
                                  
  {
    defId: 'OGN-144', cardNo: 'OGN·144/298', name: '以战养战', domain: 'orange',
                                                                                           
    cost: { mana: 4, pips: [['orange']] }, energy: 4, keywords: ['反应'],
    cardEffect:
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '如果本回合内有一名敌方单位被摧毁，则此牌的费用减少{{2}}。\n抽两张牌。',
                                                                                          
                                                                        
    effects: (p) => [{ kind: 'draw', player: p, count: 2 } as GameEvent],
  },
]

   
                                                             
                                                    
   
export function mightyUnitsOf(state: GameState, controller: PlayerId): readonly string[] {
  return resolveSelector(state, MIGHTY_UNITS_MINE, controller) as unknown as readonly string[]
}

                                                       
export const MIGHTY_THRESHOLD = 5
const MIGHTY_UNITS_MINE: Selector = {
  type: 'unit', fielded: true, controller: 'you', minMight: MIGHTY_THRESHOLD,
}

                                        
export function makeUtilitySpellSpec(row: UtilitySpellRow): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    ...(row.echo !== undefined ? { echo: row.echo } : {}), // §820 印了[回响N]才给(第343轮)
    keywords: row.keywords, // ★时机权限走这里(§806 迅捷 / §813 反应)
    target: 'none',
    legalTargets: (): string[] => [], // 无目标(㊳ `PlaySpec` 要求必填,与 OGN-122/SFD-200 同款)
                                                   
                                                   
                                                         
                                           
    makeResolve: ({ controller }) => (
      state, chosen?: Readonly<Record<string, string>>,
    ): readonly GameEvent[] => {
      const out: GameEvent[] = []
      if (row.insight !== undefined) {
        const recycle = insightRecycled(chosen, `${row.defId}:ins`)
        out.push({
          kind: 'insight', player: controller, count: row.insight,
          ...(recycle.length > 0 ? { recycle } : {}),
        } as GameEvent)
      }
      out.push(...row.effects(controller, state, chosen))                     
      return out
    },
                                               
                                                      
                                                                                                        
    ...(row.insight !== undefined || row.makeNextChoice !== undefined ? {
      makeNextChoice: (ctx: PlayCtx) => {
        const ins = row.insight === undefined ? undefined : insightRecycleChoice({
          itemId: `play:${ctx.movedCardOid}`, controller: ctx.controller, look: row.insight,
          prefix: `${row.defId}:ins`,
          prompt: `${row.name}·洞察${row.insight}:选要回收的(可以一张都不选)`,
        })
        const own = row.makeNextChoice?.(ctx)
        return (state: GameState, chosen: Readonly<Record<string, string>>) => ins?.(state, chosen) ?? own?.(state, chosen) ?? null
      },
    } : {}),
  }
}

export const UTILITY_SPELL_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(UTILITY_SPELLS.map((r) => [r.defId, makeUtilitySpellSpec(r)]))

export const UTILITY_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(UTILITY_SPELLS.filter((r) => r.keywords.length > 0).map((r) => [r.defId, r.keywords]))

export const UTILITY_SPELL_CARDS: readonly Card[] = UTILITY_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `无目标纯收益法术(UTILITY_SPELL_SPECS)` }],
}) as Card)
