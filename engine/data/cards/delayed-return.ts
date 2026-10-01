                                        
  
                                
                                                                         
                                         
                                                    
  
                          
                                                          
                                    
                                                           
                                       
  
                                             
                                                              

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { returnToOwnerHand } from './enter-triggers-batch'

                               
function stillBanished(state: GameState, card: ObjId): boolean {
  const o = state.objects[card]
  return o !== undefined && state.zones[o.zone]?.kind === 'exile'
}

   
                                           
                           
   
export function delayedReturnTriggers(state: GameState): readonly Trigger[] {
  return (state.delayedReturns ?? [])
    .filter((d) => stillBanished(state, d.card))
    .map((d) => {
      const effect = compileEffect({
                                                         
        guard: (ctx) => stillBanished(ctx.state, d.card),
        then: [{
          op: 'custom',
          emit: (ctx): readonly GameEvent[] => {
                                             
                                                                    
            return returnToOwnerHand(ctx.state, d.card)
          },
        }],
      })
      return compileTrigger({
        id: `${d.sourceDefId}:delayedReturn:${d.card}`, rawId: true, sourceDefId: d.sourceDefId,
        event: 'hold',
        by: 'any', // ⚠️ 据守的是【对手】,不是我 ⇒ 绝不能写 by:'you'(那样恒不触发)
                                         
        when: [{ kind: 'custom', test: (ev) => ev.kind === 'hold' && ev.player === d.watch }],
        effect: (st, ev, chosen) =>
          effect({ state: st, selfOid: null, controller: d.controller, ev, chosen: chosen ?? {} }),
      }, null, d.controller)                                      
    })
}

                                                               
                                                 
                                                     
  
                                                           
                                      
                             
                                       
export const UNL_169_CARD_EFFECT =
  '当你打出我时，选择一名对手。让该对手展示自己的手牌。选择一张对手以此方式展示的卡牌，将其放逐。当该对手据守一处战场时，让这张被放逐的牌返回其手牌（即使我已经不在场上）。'

export function makeAsheTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const pick = ctx.chosen['card'] as ObjId | undefined
        if (!pick) return []
        const owner = ctx.state.objects[pick]?.owner
        if (owner === undefined) return []
        return [{
          kind: 'banish',
          target: pick,
                                                                 
                                                       
          scheduleReturn: { sourceDefId: 'UNL-169', controller: ctx.controller, watch: owner },
        }]
      },
    }],
  })
  return compileTrigger({
    id: 'UNL-169:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card',
      prompt: '艾希:对手展示手牌,放逐其中一张(该对手据守时它会回去)',
      selector: { type: 'any', zone: 'hand', owner: 'opponent' }, // 非公开区 ⇒ 不标 isTarget
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_169: Card = {
  id: 'UNL-169', cardNo: 'UNL-169/219', name: '艾希', category: 'unit',
  domains: ['yellow'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时放逐对手一张手牌,该对手据守时它返回(即使我已离场)(makeAsheTrigger)' }],
}

                      
export const DELAYED_RETURN_DEFIDS: readonly string[] = ['UNL-169']
