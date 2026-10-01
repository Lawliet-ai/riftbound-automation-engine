                                                                    
                                                             
                                                
                           
                                                                
                                                                        
                                                                   
  
                                        
                                                                                    
                                 
                                                  
                                                             
                                                               
  
                                    
                                                  
                                                                  
                                                     
                                                                     
                                                        
                                                                           
                                                             
                                                                           
                                                                                            
                                         
                                                                       
                                                                  
                                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { effectiveMight } from '../../src/state/might'
import { canDormantSelf } from './dormant-self-cost'
import { POWERFUL_MIN_MIGHT } from './conditional-self-passives'                 
import { isUnit } from '../../src/state/cardTypes'

export const OGN_249_CARD_EFFECT =
  '当你打出一名{{强力}}单位时，你可以选择让我变为休眠状态，以此召出一枚休眠的符文。（战力达到5或以上时，即为强力单位。）'

                                 
export const OGN_249_RUNE_COUNT = 1

   
                        
                                                  
   
export function playedPowerfulUnit(state: GameState, ev: GameEvent): boolean {
  if (ev.kind !== 'playUnit') return false
  const o = state.objects[(ev as { unit: ObjId }).unit]
  if (o === undefined) return false
                                                                 
                                                           
  if (!isUnit(o)) return false                                             
  return effectiveMight(o).reference >= POWERFUL_MIN_MIGHT
}

                                                 
export function makeThunderLegendTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: {
      nonResource: { dormantSelf: true }, // §383.3.b「以此」前面那句是**费用**
      canPayNonResource: (state, self) => canDormantSelf(state, self),
    },
    then: [{
      op: 'custom',
      emit: (): readonly GameEvent[] => [{
        kind: 'summonRune', player: controller, count: OGN_249_RUNE_COUNT,
        dormant: true, // §430.2「**休眠的**符文」——漏了就成活跃符文,白送一点资源
      } as GameEvent],
    }],
  })
  return compileTrigger({
    id: `OGN-249:playUnit:${selfOid}`, rawId: true, sourceDefId: 'OGN-249',
    event: 'playUnit',
    by: 'you', // 「**你**打出」
    mayChoose: true, // §383.3.a「你可以选择」
                                                        
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => playedPowerfulUnit(state, ev) }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

const thunder = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '不灭狂雷', category: 'legend',
  domains: ['red', 'orange'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你打出强力单位时可休眠我以召出一枚休眠符文(makeThunderLegendTrigger)' }],
})
                                                                      
export const OGN_249: Card = thunder('OGN-249', 'OGN·249/298')
