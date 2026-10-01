                                                                        
                                                                    
                                                        
                                               
                                                               
  
                                   
                                                              
                                                                   
                                                                     
                                                           
                                                                             
                                                                          
                                                                 
                                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { WAR_HAWK_TOKEN } from './reprint-batch'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       

export const UNL_044_CARD_EFFECT =
  '{{反应}}\n从下列中选择一个 —\n- 无效化一个法术。\n- 打出四名1{{S}}的“战鹰”，它们拥有{{法盾}}。'
  + '（对手必须支付{{A}}才能将其选作法术或技能的目标。）'

export const UNL_044_PICK = 'whirlSpell'
export const UNL_044_HAWKS = 4
                                      
export const UNL_044_HASTE_KEYS: readonly string[] = Array.from({ length: UNL_044_HAWKS }, (_, i) => hasteKeyOf('UNL-044:hawks', i + 1))

export interface UNL044Deps {
                                                  
  readonly spellChainItems: (state: GameState) => string[]
}

                                                             
export function makeUNL044Spec(deps: UNL044Deps): PlaySpec {
  return {
    defId: 'UNL-044', cardNo: 'UNL-044/219', name: '羽毛旋风', kind: 'spell',
    cost: { mana: 4, pips: [['green'], ['green']] }, // ㊶ cardCosts 实测 4 法力 2pip 单绿 ⇒ 两枚各一绿
    keywords: ['反应'],
    target: 'none',
    legalTargets: (): string[] => [],
                                                                                 
                                                                                         
                                                                                    
                                                                        
                                                                                
                                                                          
                                                                                
                                                                     
    makeConfirmChoice:
      ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
      (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                
      if (chosen['mode'] === undefined) {
        return {
          itemId: `spell:${movedCardOid}:UNL-044`, controller, key: 'mode',
          prompt: '羽毛旋风:选择一个 — 无效化一个法术 / 打出四名战鹰(带{{法盾}})',
          candidates: [
            { id: 'negate', label: '无效化一个法术' },
            { id: 'hawks', label: '打出四名战力 1 的战鹰,它们拥有{{法盾}}' },
          ],
        }
      }
      if (chosen['mode'] !== 'negate' || chosen[UNL_044_PICK] !== undefined) return null
                                                            
                                            
                                                                            
                                           
                                                                         
                                    
      const selfItem = state.chain.find((it) => it.cardOid === movedCardOid)?.id
      const cands = deps.spellChainItems(state).filter((id) => id !== selfItem)
      if (cands.length === 0) return null                                  
      return {
        itemId: `spell:${movedCardOid}:UNL-044`, controller, key: UNL_044_PICK,
        prompt: '羽毛旋风:无效化哪一个法术?',
        candidates: cands.map((id) => ({ id, label: id })),
        isTarget: true, // §355.6 「无效化**一个法术**」是目标
      }
    },
    makeNextChoice:
      ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
      (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                                     
      if (chosen['mode'] !== 'hawks') return null
                                                                                                          
      for (let i = 0; i < UNL_044_HASTE_KEYS.length; i++) {
        const q = spawnTokenHasteChoice(state, controller, WAR_HAWK_TOKEN, { itemId: `spell:${movedCardOid}:UNL-044`, key: UNL_044_HASTE_KEYS[i]!, label: '战鹰' }, chosen, hastePaidSoFar(chosen, UNL_044_HASTE_KEYS.slice(0, i)))
        if (q !== null) return q
      }
      return null
    },
    makeResolve:
      ({ controller }: { movedCardOid: string; controller: PlayerId }) =>
      (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      if (chosen?.['mode'] === 'hawks') {
                                                        
                                                                                                
        const pre: GameEvent[] = []
        let paid = 0
        const spawns = UNL_044_HASTE_KEYS.map((key) => { // 长度 = UNL_044_HAWKS
          const x = spawnTokenHasteResolve(state, controller, WAR_HAWK_TOKEN, key, chosen, hasteCostTimes(paid))
          if (x.ready) paid++
          pre.push(...x.pre)
          return { kind: 'spawnToken', spec: WAR_HAWK_TOKEN, zone: asZoneId(`base:${controller}`), owner: controller, ...(x.ready ? { ready: true } : {}) } as GameEvent
        })
                                                                                                           
                                                                                     
        return [...pre, ...spawns]
      }
      if (chosen?.['mode'] !== 'negate') return []             
      const spellItem = chosen?.[UNL_044_PICK]
      if (spellItem === undefined) return []                   
      if (!deps.spellChainItems(state).includes(spellItem)) return []                 
      return [{ kind: 'negate', target: spellItem } as GameEvent]               
    },
  }
}

export const UNL_044: Card = {
  id: 'UNL-044', cardNo: 'UNL-044/219', name: '羽毛旋风', category: 'spell',
  domains: ['green'], energy: 4, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '二选一:无效化链上一个法术/打出四名带法盾的1[S]战鹰(makeUNL044Spec)' }],
}
