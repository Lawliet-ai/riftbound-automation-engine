                                                               
                                                                 
                                                          
                                 
                                                             
                          
                                                                    
                                                        
                                                                                         
                                                           
                                                                         
                                                          
                                                    
                                                
                                                                
                                                             
  
                                                                    
                                     
                                                             
                                                         
  
                 
                                                   
                                                                                      
                                                
                                                                     
                                        
                                                                 
                                       
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { TokenSpec } from '../../src/state/mutations'
import type { Cost } from '../../src/state/runePool'
import { tokenDropZones } from './token-spells'
import { lockUnitDropToStandby } from '../../src/keywords/standby'                           
import { MINION } from './reprint-batch'
                                                    
import { TENTACLE_TOKEN } from './illaoi'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                                                                      
import { hasteKeyOf } from './haste-key'                                                       

                                                                                 
                                                                                                             
                                                                                                
                                                                                      
import { SPRITE_TOKEN } from './batch-play-triggers'

export interface TokenBatchRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
                 
  readonly token: TokenSpec
                         
  readonly count: number
                                                   
  readonly ready?: boolean
  readonly cardEffect: string
}

                                      
export const dropKey = (i: number): string => `drop:${i}`
                                       
export const tokenBatchHasteKey = (defId: string, i: number): string => hasteKeyOf(`${defId}:tokens`, i)

export const TOKEN_BATCH_SPELLS: readonly TokenBatchRow[] = [
  {
    defId: 'OGS-015', cardNo: 'OGS·015/024', name: '共同献身', domain: 'yellow',
    cost: { mana: 6 }, energy: 6, keywords: ['迅捷'], // ⚠️ 0 pip ⇒ 只写 mana
    token: MINION as TokenSpec, count: 4, // ⚠️ **没写**「活跃」⇒ 不传 ready(默认休眠)
    cardEffect: '打出四名1{{S}}的“随从”。',
  },
  {
    defId: 'UNL-069', cardNo: 'UNL-069/219', name: '精灵迸发', domain: 'blue',
    cost: { mana: 5 }, energy: 5, keywords: [], // ⚠️ 上游卡文**没有**关键词横幅
    token: SPRITE_TOKEN, count: 2, ready: true, // ★卡文写了「处于活跃状态的」
    cardEffect: '打出两名处于活跃状态的3{{S}}“精灵”，它们拥有{{瞬息}}。',
  },
                                                               
                                                                          
                                                                
                                                              
                                               
  {
    defId: 'VEN-100', cardNo: 'VEN·100', name: '深渊之触', domain: 'purple',
    cost: { mana: 3 }, energy: 3, keywords: ['流转3'], // ⚠️ 0 pip ⇒ 只写 mana
    token: TENTACLE_TOKEN as TokenSpec, count: 2, // ⚠️ **没写**「活跃」⇒ 不传 ready(§359.2.c)
    cardEffect: '打出两名具有“比尔吉沃特”属性的1{{S}}“触手”。\n'
      + '{{流转3}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）',
  },
                                                          
                                                        
                                                               
  {
    defId: 'OGN-094', cardNo: 'OGN·094/298', name: '精灵召唤', domain: 'blue',
    cost: { mana: 3 }, energy: 3, keywords: ['待命', '迅捷'], // ㊶ cardCosts 实测 3 法力 0 pip
    token: SPRITE_TOKEN, count: 1, ready: true, // ★卡文写了「处于活跃状态的」(§359.2.c)
    cardEffect: '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
      + '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
      + '打出一个处于活跃状态的3{{S}}“精灵”，它拥有{{瞬息}}。（在其控制者的下个回合开始阶段，结算得分之前将其摧毁。）',
  },
]

                                        
export function makeTokenBatchSpec(row: TokenBatchRow): PlaySpec {
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
                                                      
    target: 'none',
    legalTargets: (): string[] => [],
    makeNextChoice: ({ movedCardOid, controller, standbyBattlefield }) => (state, chosen) => {
      const zones = lockUnitDropToStandby(tokenDropZones(state, controller), standbyBattlefield)                           
      if (zones.length === 0) return null                       
      for (let i = 1; i <= row.count; i += 1) {
        const key = dropKey(i)
        if (chosen[key] !== undefined) continue          
        return {
          itemId: `play:${movedCardOid}`,
          controller, // 全程由打出者自己选
          key,
          prompt: `${row.name}:第 ${i} 名打到哪儿?`,
          candidates: zones.map((z) => ({ id: z, label: z })),
        }
      }
                                                                     
                                                                                                     
      for (let i = 1; i <= row.count; i += 1) {
        const keys = Array.from({ length: i - 1 }, (_, j) => tokenBatchHasteKey(row.defId, j + 1))
        const q = spawnTokenHasteChoice(state, controller, row.token, {
          itemId: `play:${movedCardOid}`, key: tokenBatchHasteKey(row.defId, i), label: `${row.name} 第 ${i} 名`,
          ...(row.ready === true ? { ready: true as const } : {}),
        }, chosen, hastePaidSoFar(chosen, keys))
        if (q !== null) return q
      }
      return null
    },
    makeResolve: ({ controller, standbyBattlefield }) => (state, chosen): readonly GameEvent[] => {
      const c = chosen ?? {}
                                                        
      const zones = lockUnitDropToStandby(tokenDropZones(state, controller), standbyBattlefield)                      
      const out: GameEvent[] = []
      const pre: GameEvent[] = []                                                              
      let paid = 0
      for (let i = 1; i <= row.count; i += 1) {
        const z = c[dropKey(i)]
        if (z === undefined || !zones.includes(z)) continue
                                                                                   
        const x = row.ready === true ? { ready: false, pre: [] as readonly GameEvent[] } : spawnTokenHasteResolve(state, controller, row.token, tokenBatchHasteKey(row.defId, i), c, hasteCostTimes(paid))
        if (x.ready) paid += 1
        pre.push(...x.pre)
        out.push({
          kind: 'spawnToken',
          spec: row.token,
          zone: z as ZoneId,
          owner: controller as PlayerId,
                                                                
          ...(row.ready === true || x.ready ? { ready: true } : {}),
        } as GameEvent)
      }
      return [...pre, ...out]
    },
  }
}

export const TOKEN_BATCH_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(TOKEN_BATCH_SPELLS.map((r) => [r.defId, makeTokenBatchSpec(r)]))

export const TOKEN_BATCH_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(TOKEN_BATCH_SPELLS.filter((r) => r.keywords.length > 0).map((r) => [r.defId, r.keywords]))

export const TOKEN_BATCH_CARDS: readonly Card[] = TOKEN_BATCH_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `打出 ${r.count} 名 ${r.token.defId}(TOKEN_BATCH_SPECS)` }],
}) as Card)
