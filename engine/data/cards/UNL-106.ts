                                                                       
                                                                   
                                                                
                                      
                                                 
                
                                       
                            
                                                   
                                              
  
                                                             
                                                   
                                               
                                     
                                                                            
                                                   
                                                                        
                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChainItem } from '../../src/loop/chain'
import { isUnit } from '../../src/state/cardTypes'

export const UNL_106_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
  + '选择战场上的一名友方单位。无效化一个以该单位为目标且不以其他友方单位为目标的敌方法术或技能。'

                                          
export const UNL_106_ITEM_KEY = 'repelItem'

   
                                                
                                                     
                                            
   
export function repelNegatable(
  state: GameState, me: PlayerId, unit: string,
  targetsOf: (i: ChainItem) => readonly string[],
): string[] {
  return state.chain
    .filter((i) => {
      if (i.controller === me) return false                
      if (i.kind !== 'spell' && i.kind !== 'ability' && i.kind !== 'triggered') return false           
      const oids = targetsOf(i)
      if (!oids.includes(unit)) return false             
                                                             
      return !oids.some((oid) => {
        if (oid === unit) return false
        const o = state.objects[oid as ObjId]
        return o !== undefined && o.controller === me && isUnit(o)
      })
    })
    .map((i) => i.id)
}

                                         
export function repelUnits(state: GameState, me: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      if (!isUnit(o)) return false                                                                                       
      if (o.controller !== me) return false
      return state.zones[o.zone]?.kind === 'battlefield'
    })
    .map((o) => o.oid as string)
    .sort()
}

                                                                            
export function makeUNL106Spec(targetsOf: (i: ChainItem) => readonly string[]): PlaySpec {
  return {
    defId: 'UNL-106', cardNo: 'UNL-106/219', name: '击退', kind: 'spell',
    cost: { mana: 1, pips: [['orange']] }, // ㊶ cardCosts 实测 1费 1橙pip
    keywords: ['反应'], // ★时机权限;印刷表侧另有一份登记
                                                                     
                                                                            
    choiceTiming: 'confirm',
    target: 'custom',
                                                     
    legalTargets: (state, controller) =>
      repelUnits(state, controller).filter((u) => repelNegatable(state, controller, u, targetsOf).length > 0),
    makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen) => {
      if (target === undefined || chosen[UNL_106_ITEM_KEY] !== undefined) return null
      const items = repelNegatable(state, controller, target, targetsOf)
      if (items.length === 0) return null                              
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: UNL_106_ITEM_KEY,
        prompt: '击退:无效化哪一个以该单位为目标的敌方法术或技能?',
        isTarget: true, // ★1782 无效化一个…敌方法术或技能
        candidates: items.map((id) => ({
          id, label: state.chain.find((i) => i.id === id)?.sourceDefId ?? id,
        })),
      }
    },
    makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
      if (target === undefined) return []
      const pick = (chosen ?? {})[UNL_106_ITEM_KEY]
      if (pick === undefined) return []
                                                           
                                  
      if (!repelNegatable(state, controller, target, targetsOf).includes(pick)) return []
                                                        
      return [{ kind: 'negate', target: pick } as GameEvent]
    },
  }
}

export const UNL_106: Card = {
  id: 'UNL-106', cardNo: 'UNL-106/219', name: '击退', category: 'spell',
  domains: ['orange'], energy: 1, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选战场友方单位,无效化以它为目标且不以其他友方单位为目标的敌方法术/技能(makeUNL106Spec)' }],
}
