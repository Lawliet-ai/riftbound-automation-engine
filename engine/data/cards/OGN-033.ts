                                                                   
                                                                        
                                      
                                             
  
                                                         
                                                        
                                                     
                                                                
                                                              
                                                                        
                                        
  
                                                                
                                                  
                                                               
                                                              
                                                     
                                       
                                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'

export const OGN_033_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
  + '选择一名敌方单位。除非其控制者选择让你抽两张牌，否则对该单位造成6点伤害。'

                           
export const OGN_033_KEY = 'extortPay'
                                                 
export const OGN_033_YES = 'letDraw'
export const OGN_033_NO = 'refuse'
                       
export const OGN_033_DRAW = 2
export const OGN_033_DAMAGE = 6

                                                      
export function extortTargets(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: false }).map((o) => o as string).sort()
}

export const OGN_033_SPEC: PlaySpec = {
  defId: 'OGN-033', cardNo: 'OGN·033/298', name: '巧取豪夺', kind: 'spell',
  cost: { mana: 2, pips: [['red']] }, // ㊶ 上游 `cardCosts` 实测 pips:1 colors:['red']
  keywords: ['反应'], // ★时机权限;印刷表侧另有一份登记
  target: 'custom',
  legalTargets: (state, controller) => extortTargets(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen) => {
    if (target === undefined || chosen[OGN_033_KEY] !== undefined) return null
                                           
    if (!extortTargets(state, controller).includes(target)) return null
    const victim = state.objects[target as ObjId]?.controller
    if (victim === undefined) return null
    return {
      itemId: `play:${movedCardOid}`,
      controller: victim, // ★★★由【目标单位的控制者】决定,不是打出者
      key: OGN_033_KEY,
      prompt: `巧取豪夺:让对方抽${OGN_033_DRAW}张牌保住这名单位,还是让它承受${OGN_033_DAMAGE}点伤害?`,
      candidates: [
                                                               
        { id: OGN_033_YES, label: `让对方抽${OGN_033_DRAW}张牌(保住单位)` },
        { id: OGN_033_NO, label: `拒绝(此单位承受${OGN_033_DAMAGE}点伤害)` },
      ],
    }
  },
  makeResolve: ({ movedCardOid, controller, target }) => (state, chosen): readonly GameEvent[] => {
    if (target === undefined) return []
                                                  
    if (!extortTargets(state, controller).includes(target)) return []
    if ((chosen ?? {})[OGN_033_KEY] === OGN_033_YES) {
                                                 
      return [{ kind: 'draw', player: controller, count: OGN_033_DRAW } as GameEvent]
    }
                                                               
    return [{
      kind: 'damage', target: target as ObjId, amount: OGN_033_DAMAGE,
      source: movedCardOid as ObjId, sourcePlayer: controller,
    } as GameEvent]
  },
}

export const OGN_033: Card = {
  id: 'OGN-033', cardNo: 'OGN·033/298', name: '巧取豪夺', category: 'spell',
  domains: ['red'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名敌方单位,其控制者不让我抽两张就对它造成6点伤害(OGN_033_SPEC)' }],
}
