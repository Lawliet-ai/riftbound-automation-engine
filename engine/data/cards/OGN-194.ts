                                                                  
                                            
                           
                                    
                                
                                                
  
                                                      
                                                       
                                                            
                                    
                                                            
                                                                  
                                                                                                                        
                                                                        
           
                                                                  
                                                    
                                                                
                                                              
                                                   
                       
                                                                 
                                                           
                                                                                         
                                                                
                                                                     
                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { PATROL_SURCHARGE } from './UNL-163'
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const OGN_194_CARD_EFFECT =
  '{{游走}}（我可以向其他战场进行移动。）\n'
  + '你查看或展示主牌堆顶部的卡牌并看到我时，可以选择将我放逐。如选择放逐，则你可以选择支付{{A}}将我打出。'

export const OGN_194_KEYWORDS: readonly string[] = ['游走']
export const NOCTURNE_BANISH = 'nocturneBanish'
export const NOCTURNE_PLAY = 'nocturnePlay'
export const NOCTURNE_TO = 'nocturneTo'                

                                                                    
export function makeNocturneTrigger(selfOid: ObjId, controller: PlayerId, event: 'revealed' | 'viewed' = 'revealed'): Trigger {
  return compileTrigger({
    id: `OGN-194:seen:${event}:${selfOid}`, rawId: true, sourceDefId: 'OGN-194',
    event, // ★747 双收:「查看**或**展示」= revealed + viewed 两实例(㊼ 诡术妖姬 conquer/hold 姿势)
    by: 'any', // 「你」的判定在 filter(revealed.player=牌堆主人)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent): boolean => {
        const e = ev as unknown as { player?: PlayerId; cards?: readonly string[] }
        return e.player === controller && (e.cards ?? []).includes(selfOid as string)
      },
    }],
    nextChoice: (state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[NOCTURNE_BANISH] === undefined) {
        if (!state.objects[selfOid]) return null                         
        return {
          itemId: `trig:OGN-194:${selfOid}`, controller, key: NOCTURNE_BANISH,
          prompt: '魔腾:看到我了 —— 将我放逐?',
          candidates: [{ id: 'yes', label: '放逐魔腾' }, { id: 'no', label: '留在牌堆' }],
        }
      }
      if (chosen[NOCTURNE_BANISH] !== 'yes') return null
      if (chosen[NOCTURNE_PLAY] !== undefined) {
                                                                                 
        if (chosen[NOCTURNE_PLAY] !== 'yes' || chosen[NOCTURNE_TO] !== undefined) return null
        return playFromEffectChoice(state, controller, state.objects[selfOid]?.defId ?? 'OGN-194', {
          itemId: `trig:OGN-194:${selfOid}`, controller, key: NOCTURNE_TO, prompt: '魔腾:把我打出到哪里?',
        }, chosen, PATROL_SURCHARGE)                                         
      }
                                                               
                                                       
                                                                     
                                                          
                                                                                       
                                                          
                                                                      
                                                             
      if (unitDestinationResolve(state, controller, state.objects[selfOid]?.defId ?? 'OGN-194') === undefined) return null
      if (!couldPayWithReactionGains(state, controller, PATROL_SURCHARGE)) return null
      return {
        itemId: `trig:OGN-194:${selfOid}`, controller, key: NOCTURNE_PLAY,
        prompt: '魔腾:支付 1 点任意符能将我打出?(不付则留在放逐区)',
        candidates: [{ id: 'yes', label: '支付 1 点任意符能打出' }, { id: 'no', label: '不付' }],
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      if (chosen?.[NOCTURNE_BANISH] !== 'yes') return []
      const me = state.objects[selfOid]
      if (me === undefined) return []                                  
      const out: GameEvent[] = [{ kind: 'banish', target: selfOid, by: selfOid } ]
                                                                       
                                                                                 
      const x = optionalExtraResolve(state, controller, me.defId, NOCTURNE_TO, chosen, PATROL_SURCHARGE)
      const dest = unitDestinationResolve(state, controller, me.defId, chosen?.[NOCTURNE_TO], x.grant)                                       
      if (chosen?.[NOCTURNE_PLAY] === 'yes' && canPayFromState(state, controller, PATROL_SURCHARGE) && dest !== undefined) {
                                                                                             
        const banishedOid = `o${state.nextOid}` as ObjId
        out.push({ kind: 'spend', player: controller, cost: PATROL_SURCHARGE } )
        out.push(...x.pre)
        out.push({ kind: 'playFree', obj: banishedOid, player: controller, to: dest, ...x.flags } )                              
        out.push(...x.post)
      }
      return out
    },
  }, selfOid, controller)
}

export const OGN_194: Card = {
  id: 'OGN-194', cardNo: 'OGN·194/298', name: '魔腾', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [...OGN_194_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '牌堆顶被查看/展示看到我:可放逐,再可付{{A}}打出(makeNocturneTrigger;★747 起 revealed/viewed 双实例)' }],
}
