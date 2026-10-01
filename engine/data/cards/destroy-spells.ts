                                                                     
                                                 
                                                      
                                                 
  
                                       
                                                                    
                                                       
                                                          
                                                        
  
                   
                                                                    
                                                                  
                                                                          
                                                   
                                                                  
                           
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { battlefieldUnits } from './diana-reactions'
import { destroyableEquipment } from './OGN-056'
import { takenReal } from './batch-play-triggers'
import { effectiveMight } from '../../src/state/might'                   
import { GOLD_TOKEN } from './gear-triggers'                            
import type { ChoiceRequest } from '../../src/loop/chain'

                          
export type DestroyScope =
                                            
  | 'oneUnitOnBattlefield'
  /** 「摧毁**所有装备**」——不选目标,群体,含基地、不分敌我 */
  | 'allEquipment'
  /**
   * ★第366轮:「你可以选择摧毁**最多一件**装备」——**可选**的单个装备。
   * ⚠️ 与上面两档都不同:`oneUnitOnBattlefield` 走 `target:'custom'` 是**必选**的
   *   (没有合法目标就打不出),而「**最多**一件」得能**不选** ⇒ 只能走 `makeNextChoice` 加 skip 档。
   * ⚠️ 候选与 `allEquipment` **同一个口**(`destroyableEquipment`,含基地+战场、不分敌我),
   *   差别只在"全都炸"还是"最多挑一个"⇒ 配了收口自证。
   */
  | 'atMostOneEquipment'
  /**
   * ★第514轮:「摧毁战场上一名**不高于 N{S}** 的单位」(血钱 SFD-162 / 狩魂 UNL-159)。
   * 与 `oneUnitOnBattlefield` 差的只有**战力上限**那一条 ⇒ 上限值由 `maxMight` 那一格带,
   *   本档自己不写死数字(血钱是 2、狩魂是 3)。
   * ⚠️ §710 按**当前**战力(`effectiveMight(o).reference`),不是印刷战力 ——
   *   被增益顶上去的单位就砍不动了,这是真差别,配了刀。
   * ⚠️「战场上」照旧不含基地;没写敌我 ⇒ **双方都能选**(血钱的两支后效正是靠这个分叉)。
   */
  | 'oneUnitOnBattlefieldUpTo'
  /**
   * ★第515轮:「摧毁**一件装备**」(印爆术 SFD-005)——**必选一件**,没写敌我、没写位置。
   * ⚠️ 与 `atMostOneEquipment` 的分野只在**能不能不选**:那档走问链 + 「不选」那一格,
   *   这档走 `target: 'custom'`(§355.7 单个目标的选取,场上一件装备都没有就打不出)。
   * ⚠️ 候选与另外两个装备档**同一个口**(`destroyableEquipment`:含基地、不分敌我)——
   *   515 收口前印爆术在 longtail-8 自己写了一遍(`onField` + `baseTypes.includes('equipment')`),
   *   现场逐条对过两者**同解**(区 kind 都是 base|battlefield;`isEquipment` 就是 baseTypes 含 equipment),
   *   ⇒ 按 ㊼ 并成一份,配了收口自证。
   */
  | 'oneEquipment'

export interface DestroySpellRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                           
  readonly energy: number
  readonly keywords: readonly string[]
  readonly scope: DestroyScope
     
                                               
                                     
                                                     
     
  readonly draw?: number
     
                                                             
                              
     
  readonly maxMight?: number
     
                                                        
                    
                                                     
                                    
                                                     
                                                           
     
  readonly goldByAllegiance?: { readonly enemy: number; readonly ally: number }
     
                                                          
                                       
                                                            
                                                   
                                        
                                                 
                                                         
                                                        
                                                      
     
  readonly drawByTargetController?: number
  readonly cardEffect: string
}

export const DESTROY_SPELLS: readonly DestroySpellRow[] = [
                                                                   
                                             
                                                            
                                                              
                                           
                                                    
  {
    defId: 'UNL-159', cardNo: 'UNL-159/219', name: '狩魂', domain: 'yellow',
    cost: { mana: 2, pips: [['yellow']] }, energy: 2, keywords: [],
    scope: 'oneUnitOnBattlefieldUpTo', maxMight: 3,
    cardEffect: '摧毁战场上一名不高于3{{S}}的单位。',
  },
                                                                 
                                                       
                                
                                                             
                               
  {
    defId: 'OGN-213', cardNo: 'OGN·213/298', name: '暗刃', domain: 'yellow',
    cost: { mana: 2, pips: [['yellow']] }, energy: 2, keywords: ['待命', '迅捷'],
    scope: 'oneUnitOnBattlefield', drawByTargetController: 2,
    cardEffect:
      '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '摧毁战场中的一名单位，然后让其控制者抽两张牌。',
  },
                                                           
                                                            
                                                            
                                                              
  {
    defId: 'SFD-005', cardNo: 'SFD·005/221', name: '印爆术', domain: 'red',
    cost: { mana: 1, pips: [['red']] }, energy: 1, keywords: [],
    scope: 'oneEquipment', drawByTargetController: 2,
    cardEffect: '摧毁一件装备，让其控制者抽两张牌。',
  },
                                                                   
                                                     
                                       
                      
                                                      
                                                               
                                              
  {
    defId: 'SFD-162', cardNo: 'SFD·162/221', name: '血钱', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, keywords: ['迅捷'], // cardCosts 实测:2 法力 **0 pip**
    scope: 'oneUnitOnBattlefieldUpTo', maxMight: 2,
    goldByAllegiance: { enemy: 1, ally: 2 },
    cardEffect:
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
      '摧毁战场上一名不高于2{{S}}的单位。如果是敌方单位，则打出一个休眠的“金币”装备指示物。' +
      '如果是友方单位，则打出两个休眠的“金币”装备指示物。',
  },
  {
    defId: 'OGS-012', cardNo: 'OGS·012/024', name: '爆能术', domain: 'yellow',
    cost: { mana: 6, pips: [['yellow']] }, energy: 6, keywords: ['迅捷'],
    scope: 'oneUnitOnBattlefield',
    cardEffect: '摧毁战场上的一名单位。',
  },
  {
    defId: 'OGN-022', cardNo: 'OGN·022/298', name: '热电光束', domain: 'red',
    cost: { mana: 5, pips: [['red'], ['red']] }, energy: 5, keywords: ['迅捷'],
    scope: 'allEquipment',
    cardEffect: '摧毁所有装备。',
  },
                           
                                              
                                                  
                                              
                                                       
  {
    defId: 'OGN-224', cardNo: 'OGN·224/298', name: '废物利用', domain: 'yellow',
    cost: { mana: 2, pips: [['yellow']] }, energy: 2, keywords: ['迅捷'],
    scope: 'atMostOneEquipment', draw: 1,
    cardEffect: '你可以选择摧毁最多一件装备。抽一张牌。',
  },
                                                                   
                                                    
                               
                                        
                                                   
                                                                    
                              
                                                
                                                                                         
                                                 
                                               
                                                            
  {
    defId: 'VEN-003', cardNo: 'VEN·003', name: '极寒脆化', domain: 'red',
    cost: { mana: 2, pips: [['red']] }, energy: 2, keywords: ['流转4红色'],
    scope: 'oneEquipment',
    cardEffect:
      '摧毁一件装备。\n'
      + '{{流转4红色}}（你可以选择支付此牌的流转费用，将其从你的废牌堆中打出。然后将其放逐。）',
  },
]

   
                                 
                                                                
   
export function destroyVictims(scope: DestroyScope, state: GameState, maxMight?: number): string[] {
  switch (scope) {
    case 'oneUnitOnBattlefieldUpTo':
                                                     
                                                        
                                                 
                                                                            
                                                                      
                                                         
                                                
      if (maxMight === undefined) return []
      return (battlefieldUnits(state) as unknown as string[])
        .filter((oid) => {
          const o = state.objects[oid as ObjId]
          return o !== undefined && effectiveMight(o).reference <= maxMight
        })
        .sort()
    case 'oneUnitOnBattlefield':
                                           
      return (battlefieldUnits(state) as unknown as string[]).slice().sort()
    case 'allEquipment':
    case 'atMostOneEquipment':
    case 'oneEquipment':
                                                 
                                                          
      return (destroyableEquipment(state) as unknown as string[]).slice().sort()
  }
}

                                           
export function destroyPickKey(defId: string): string {
  return `${defId}:destroyPick`
}
                                                                           
export const DESTROY_SKIP = 'skip'

                                        
export function makeDestroySpellSpec(row: DestroySpellRow): PlaySpec {
  const single = row.scope === 'oneUnitOnBattlefield' || row.scope === 'oneUnitOnBattlefieldUpTo'
    || row.scope === 'oneEquipment'                                                          
  const optional = row.scope === 'atMostOneEquipment'
  const key = destroyPickKey(row.defId)
  return {
    defId: row.defId, cardNo: row.cardNo, name: row.name, kind: 'spell',
    cost: row.cost,
    keywords: row.keywords,
                                                     
    target: single ? 'custom' : 'none',
    legalTargets: (state) => (single ? destroyVictims(row.scope, state, row.maxMight) : []),
                                           
    ...(optional
      ? {
                                                                    
                                      
          choiceTiming: 'confirm' as const,
          firstAskOptional: true as const, // ★1802c §355.13:卡文「**最多**一件装备」+「**你可以选择**」⇒ 含 0
          makeNextChoice:
            ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
            (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
              if (chosen[key] !== undefined) return null
              const cands = destroyVictims(row.scope, state, row.maxMight)
              if (cands.length === 0) return null                          
              return {
                itemId: `spell:${movedCardOid}:${row.defId}`,
                controller,
                key,
                prompt: `${row.name}:摧毁哪一件装备?(可以不选)`,
                isTarget: true, // ★1782 你可以选择摧毁一件装备,然后抽一张牌
                candidates: [
                  ...cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
                  { id: DESTROY_SKIP, label: '不摧毁' }, // 「**最多**一件」
                ],
              }
            },
        }
      : {}),
    makeResolve:
      ({ target, movedCardOid, controller }) =>
      (state, chosen): readonly GameEvent[] => {
                                                 
                                                  
                                                                                 
                                                        
                                                         
                                                     
        const pick = optional ? chosen?.[key] : undefined
        const victims = single
          ? (target !== undefined && destroyVictims(row.scope, state, row.maxMight).includes(target) ? [target] : [])
          : optional
            ? (takenReal(pick) && destroyVictims(row.scope, state, row.maxMight).includes(pick as string) ? [pick as string] : [])
            : destroyVictims(row.scope, state, row.maxMight)
        const out: GameEvent[] = victims.map((oid): GameEvent => ({
          kind: 'destroy',
          target: oid as ObjId,
                                                                     
          source: movedCardOid as ObjId,
          sourcePlayer: controller as PlayerId,
        } as GameEvent))
                                                                
                                                   
                                                        
          
                                                 
                                                                                       
                                                     
                                                          
                                              
                                             
                                             
                                                           
                                                   
                                    
                                                                     
                                                                    
                                                      
                                                                           
                                                             
                                                           
        if (row.drawByTargetController !== undefined) {
          for (const oid of victims) {
            const v = state.objects[oid as ObjId]
            if (v === undefined) continue
            out.push({
              kind: 'drawForDestroyVictim',
              victim: oid as ObjId,
              player: v.controller,
              count: row.drawByTargetController,
              victimOwner: v.owner,
              victimDefId: v.defId,
            } )
          }
        }
                                                        
                                                               
                                                      
        if (row.goldByAllegiance !== undefined) {
          for (const oid of victims) {
            const owner = state.objects[oid as ObjId]?.controller
            if (owner === undefined) continue
            const n = owner === controller ? row.goldByAllegiance.ally : row.goldByAllegiance.enemy
            for (let i = 0; i < n; i++) {
              out.push({ kind: 'spawnToken', spec: GOLD_TOKEN, zone: `base:${controller}` as ZoneId, owner: controller, dormant: true } )
            }
          }
        }
                                               
        if (row.draw !== undefined) out.push({ kind: 'draw', player: controller, count: row.draw } as GameEvent)
        return out
      },
  }
}

export const DESTROY_SPELL_SPECS: Readonly<Record<string, PlaySpec>> =
  Object.fromEntries(DESTROY_SPELLS.map((r) => [r.defId, makeDestroySpellSpec(r)]))

export const DESTROY_SPELL_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(DESTROY_SPELLS.map((r) => [r.defId, r.keywords]))

export const DESTROY_SPELL_CARDS: readonly Card[] = DESTROY_SPELLS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'spell',
  domains: [r.domain], energy: r.energy, keywords: r.keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `摧毁:${r.scope}(DESTROY_SPELL_SPECS)` }],
}) as Card)

                                                                                                      
                                                                                                                 
                                                                                      
export const OGN_224_CARD_EFFECT = '{{迅捷}}（可在你的回合或法术对决中打出。）\n你可以选择摧毁最多一件装备。抽一张牌。'
