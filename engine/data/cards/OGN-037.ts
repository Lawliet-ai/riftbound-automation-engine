                                                                  
                                                      
                                
                                                      
  
                   
                                                              
                                                      
                                                         
                                                              
                                                     
                                                                                     
                                                            
                                                      
                            
  
                                               
                                                    
                                            
                                                                  
                                                          
                                       
                                                                 
  
                                                   
                                                       
                                                                   
                                 
                                                              
                                                                                    
                                                                           
                                                                        
                                                         
                                                                      
                                                               
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { CARD_CATEGORIES } from '../cardCategories'
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const OGN_037_CARD_EFFECT =
  '{{强攻2}}（如果我是进攻方，则{{S}}+2。）\n'
  + '当你使用法术摧毁一名单位时，你可以选择支付{{1}}和{{红色}}，以此从废牌堆中将我打出。'

                                                              
export const OGN_037_COST: Cost = { mana: 1, pips: [['red']] }
export const OGN_037_TO = 'phoenixTo'               

                                                                 
export function anySpellIn(byCards: readonly string[] | undefined): boolean {
  return (byCards ?? []).some((defId) => CARD_CATEGORIES[defId] === 'spell')
}

export function makePhoenixTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'OGN-037:rebirth',
    event: 'destroyed',
    by: 'any', // 判据自己看 responsible/byCards,不看批次 actor
    mayChoose: true, // §383.3.a「你可以选择」在效果开头 ⇒ 整条可选
    when: [{
      kind: 'custom',
      test: (ev: GameEvent) => {
        if (ev.kind !== 'destroyed') return false
        const e = ev as unknown as {
          victim: { types?: readonly string[] }
          responsible?: readonly PlayerId[]
          byCards?: readonly string[]
        }
        if (e.victim.types?.includes('unit') !== true) return false                        
        if ((e.responsible ?? []).includes(controller) !== true) return false              
        return anySpellIn(e.byCards)                                          
      },
    }],
                                                                                   
    nextChoice: (state: GameState, _ev, chosen) => {
      if (chosen[OGN_037_TO] !== undefined) return null
      const me = state.objects[selfOid]
      if (me === undefined) return null
                                                                                                
      if (!couldPayWithReactionGains(state, controller, OGN_037_COST)) return null
      return playFromEffectChoice(state, controller, me.defId, {
        itemId: `trig:OGN-037:${selfOid}`, controller, key: OGN_037_TO, prompt: '不朽凤凰:把我打出到哪里?',
      }, chosen, OGN_037_COST)                                       
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
                                                                     
                                                           
                                                                                    
                                                                           
                                                                     
                                                        
      const x = optionalExtraResolve(state, controller, state.objects[selfOid]?.defId ?? 'OGN-037', OGN_037_TO, chosen, OGN_037_COST)
      const dest = unitDestinationResolve(state, controller, state.objects[selfOid]?.defId ?? 'OGN-037', chosen?.[OGN_037_TO], x.grant)
      if (dest === undefined) return []
                                                          
      if (!canPayFromState(state, controller, OGN_037_COST)) return []
      return [
        { kind: 'spend', player: controller, cost: OGN_037_COST } as GameEvent,
        ...x.pre,
                                                                    
        { kind: 'playFree', obj: selfOid, player: controller, to: dest, ...x.flags } as GameEvent, // ★1251 落点显式带 to;★1364 flags
        ...x.post,
      ]
    },
  }, selfOid, controller)
}

export const OGN_037: Card = {
  id: 'OGN-037', cardNo: 'OGN·037/298', name: '不朽凤凰', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: ['强攻2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我在废牌堆时,你的法术摧毁单位 ⇒ 可付{1}{红}把我打出(makePhoenixTrigger);[强攻2]走通用' }],
}
