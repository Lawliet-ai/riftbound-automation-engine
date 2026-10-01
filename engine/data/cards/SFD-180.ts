                                                                         
                                                                  
                                                     
                                                                    
                                                  
                           
  
                                                      
                                  
                                                                 
                                                              
                                                                   
                                
                                                               
                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { canPayFromState, couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import { POWERFUL_MIN_MIGHT } from './conditional-self-passives'

export const SFD_180_CARD_EFFECT =
  '当你控制的一名单位变为{{强力}}时，你可以选择支付{{黄色}}，以此让其变为活跃状态。'
  + '（战力达到5或以上时，即为强力单位。）'

                                           
export const SFD_180_COST: Cost = { mana: 0, pips: [['yellow']] }

                                         
export function makeFioraDuelTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                                         
                                                           
                                                                   
                                                      
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
                                                
        const unit = (ctx.ev as { readonly unit?: ObjId }).unit
        if (unit === undefined || !ctx.state.objects[unit]) return []
        return [{ kind: 'statusChange', target: unit, key: 'dormant', value: false } as GameEvent]
      },
    }],
  })
  return compileTrigger({
    id: `SFD-180-duel:${selfOid}`, rawId: true, sourceDefId: 'SFD-180',
    event: 'mightCrossed',
    when: [{
      kind: 'custom',
                                                        
      test: (ev, _state, _self, ctrl): boolean => {
        const e = ev as { readonly controller?: PlayerId; readonly from?: number; readonly to?: number }
        return e.controller === ctrl && e.from !== undefined && e.to !== undefined
          && e.from < POWERFUL_MIN_MIGHT && e.to >= POWERFUL_MIN_MIGHT
      },
    }, {
                                                               
                                                                
                                                                    
                                                                                   
                                                      
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean =>
        couldPayWithReactionGains(state, controller, SFD_180_COST),
    }],
    mayChoose: true, // ★1446【缺陷 194】§383.3.a:卡文开头就是「你可以选择」⇒ 这一问在【确认阶段】
                                                               
                                                                         
                                                                   
                                                                 
                                                  
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, SFD_180_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state: GameState, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_180: Card = {
  id: 'SFD-180', cardNo: 'SFD·180/221', name: '菲奥娜', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '你控制的单位变为强力时可付{黄色}让其变活跃(makeFioraDuelTrigger×mightCrossed)' },
  ],
}
