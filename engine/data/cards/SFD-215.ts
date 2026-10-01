                                                               
  
                                                 
                                                              
                                                     
                                                   
                                                  
                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId, ZoneId } from '../../src/state/ids'
import { topOfDeck } from '../../src/keywords/insight'
import { voidSproutChoice, voidSproutRecycleEvents, voidSproutFilter } from './SFD-018'        
import { hereTrigger } from './battlefields-extra'

                                                             
                                       
                                                              
  
                       
                                                       
                                                 
                                                              
                                                      
                                  
                                                             
                                                        
  
                                                                              
                                                   
                                                  
                                       
                                                          
export const SFD_215_CARD_EFFECT =
  '当你防守此处时，展示你主牌堆顶部的一张牌。如果是一张法术牌，则将其放入你的手牌，否则将其回收。'

                                                                                
export type IsSpellFn = (defId: string) => boolean

   
                                                                            
                                                          
                                                                        
   
let isSpellProvider: IsSpellFn = () => false
export function setIsSpellProvider(f: IsSpellFn): void { isSpellProvider = f }

export function makeRavenbloomAcademyTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-215', 'defend', bfZoneId, controller, {
    postChoice: (state, chosen) => voidSproutChoice(state, controller, chosen), // ★749 兽苗前置
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
                                                               
        const rec = voidSproutRecycleEvents(ctx.state, controller, ctx.chosen)
        const shown = voidSproutFilter(ctx.chosen, ctx.state, controller, topOfDeck(ctx.state, controller, 1))
        const top = shown[0]
        if (top === undefined) return [...rec]                   
        const o = ctx.state.objects[top]
        const evs: GameEvent[] = [
          ...rec, // ★749 兽苗回收在展示前
                                                                    
          { kind: 'revealed', player: controller, cards: [top] } as GameEvent,
        ]
        if (o !== undefined && isSpellProvider(o.defId)) {
          evs.push({ kind: 'zoneChange', obj: top, to: `hand:${controller}` as ZoneId } as GameEvent)
        } else {
                                   
          evs.push({ kind: 'recycle', player: controller, objs: [top] } as GameEvent)
        }
        return evs
      },
    }],
  })
}

export const SFD_215: Card = {
  id: 'SFD-215', cardNo: 'SFD·215/221', name: '拉文布鲁姆学院', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '防守此处→展示牌堆顶一张:法术入手、否则回收(makeRavenbloomAcademyTrigger)' }],
}

