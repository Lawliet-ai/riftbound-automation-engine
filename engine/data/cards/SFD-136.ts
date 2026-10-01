                                                                   
                                        
                                      
                                      
                                        
  
                                                
                                                                                
                                          
                                                           
                                                
                                                    
                                               
  
                                                     
                                                    
                                                             
                                         
                                              
  
                                                               
                                                           
                                                        
                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'

export const SFD_136_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
  + '{{回响2}}（你可以选择支付此额外费用，以重复此法术效果。）\n'
  + '选择一个法术，除非其控制者选择支付{{2}}，否则无效化该法术。'

                       
export const SFD_136_PAY_KEY = 'ransomPay'

   
                                                                   
                                                                              
   
const echoCopyKey = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)
                                 
export const SFD_136_PAY_YES = 'pay'
export const SFD_136_PAY_NO = 'refuse'
                    
export const SFD_136_RANSOM: Cost = { mana: 2 }

                                                  
export function chainItemController(state: GameState, itemId: string): PlayerId | undefined {
  return state.chain.find((i) => i.id === itemId)?.controller
}

   
                  
                                                                 
   
export function makeSFD136Spec(chainItems: (state: GameState) => string[]): PlaySpec {
  return {
    defId: 'SFD-136', cardNo: 'SFD·136/221', name: '强买强卖', kind: 'spell',
    cost: { mana: 2 },
    echo: { mana: 2 }, // §820 [回响2]
    keywords: ['反应'], // ★时机权限;印刷表侧另有一份登记
    target: 'chainSpell',
    legalTargets: (state) => chainItems(state),
    makeNextChoice: ({ movedCardOid, target, echoTimes }) => (state, chosen) => {
      if (target === undefined) return null
      const victim = chainItemController(state, target)
      if (victim === undefined) return null                     
      const candidates = [
                                            
                                                                   
                                                          
                                                             
                                          
                                                       
                                                                   
                                                                       
                                                   
        ...(couldPayWithReactionGains(state, victim, SFD_136_RANSOM)
          ? [{ id: SFD_136_PAY_YES, label: '支付 2 法力,保住这个法术' }]
          : []),
        { id: SFD_136_PAY_NO, label: '不支付(法术被无效化)' },
      ]
                                                            
      for (let c = 0; c <= (echoTimes ?? 0); c++) {
        const key = echoCopyKey(SFD_136_PAY_KEY, c)
        if (chosen[key] !== undefined) continue                
        return {
          itemId: `play:${movedCardOid}`,
          controller: victim, // ★★★由【他本人】决定,不是打出者
          key,
          prompt: '强买强卖:支付 2 法力保住你的法术,还是让它被无效化?',
          candidates,
        }
      }
      return null
    },
    makeResolve: ({ target, echoIndex }) => (state, chosen): readonly GameEvent[] => {
      if (target === undefined) return []
      const victim = chainItemController(state, target)
      if (victim === undefined) return []                  
                                                                     
      const wantsPay = (chosen ?? {})[echoCopyKey(SFD_136_PAY_KEY, echoIndex ?? 0)] === SFD_136_PAY_YES
                                           
                                                     
      if (wantsPay && canPayFromState(state, victim, SFD_136_RANSOM)) {
        return [{ kind: 'spend', player: victim, cost: SFD_136_RANSOM } as GameEvent]
      }
                                                    
      return [{ kind: 'negate', target } as GameEvent]
    },
  }
}

export const SFD_136: Card = {
  id: 'SFD-136', cardNo: 'SFD·136/221', name: '强买强卖', category: 'spell',
  domains: ['purple'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一个法术,其控制者不付{2}就被无效化(SFD_136_SPEC)' }],
}
