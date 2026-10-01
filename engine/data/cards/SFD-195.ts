                                                                        
                                                             
                                           
                    
                                          
                                                 
                                                                          
  
                                                                           
                                                              
                                                                   
                                                           
                                                                          
                                                                             
                                         
                                                               
                                                      
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { targetedOwnUnit } from './targeted-own-unit'                    
import { canDormantSelf } from './dormant-self-cost'

export const SFD_195_CARD_EFFECT =
  '当你将一名友方单位选为目标时，你可以选择让我变为休眠状态并支付{{A}}，以此让该单位变为活跃状态。\n'
  + '当你征服一处战场时，你可以选择支付{{1}}，以此让我变为活跃状态。'

                                                  
                                         

                                    
export function makeBladeDancerTargetTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: {
      resource: { pips: [[]] }, // 「支付{A}」= 一枚任意域符能(§135.2.e.5,㊼ VEN-142)
      nonResource: { dormantSelf: true }, // 「让我变为休眠状态」——传奇同装备走 tapped
      canPayNonResource: (state, self) => canDormantSelf(state, self),
    },
    then: [{
                                                             
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const t = (ctx.ev as unknown as { target?: ObjId }).target
        return t !== undefined && ctx.state.objects[t] !== undefined
          ? [{ kind: 'statusChange', target: t, key: 'dormant', value: false } as GameEvent]
          : []
      },
    }],
  })
  return compileTrigger({
    id: `SFD-195:targeted:${selfOid}`, rawId: true, sourceDefId: 'SFD-195',
    event: 'targeted',
    by: 'any', // 谁"发起"不作数,看 ev.chooser(铁律153)
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'custom', test: (ev: GameEvent, state: GameState) => targetedOwnUnit(ev, state, controller) },
      { kind: 'custom', test: (_ev: GameEvent, state: GameState) => canDormantSelf(state, selfOid) }, // 入链门槛
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                         
export function makeBladeDancerConquerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: { resource: { mana: 1 } }, // 「支付{1}」
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        ctx.state.objects[selfOid] !== undefined
          ? [{ kind: 'statusChange', target: selfOid, key: 'tapped', value: false } as GameEvent]
          : [],
    }],
  })
  return compileTrigger({
    id: `SFD-195:conquer:${selfOid}`, rawId: true, sourceDefId: 'SFD-195',
    event: 'conquer', by: 'you',
    mayChoose: true, // 「你可以选择」
                                                                    
                                                                    
                              
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 「当【你】征服…」(㊼ OGS-023)
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                            
export const SFD_195: Card = {
  id: 'SFD-195', cardNo: 'SFD·195/221', name: '刀锋舞者', category: 'legend',
  domains: ['green', 'purple'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '你选友方单位为目标时可休眠我+付A让其变活跃;你征服时可付1让我变活跃(makeBladeDancer*Trigger)' },
  ],
}
