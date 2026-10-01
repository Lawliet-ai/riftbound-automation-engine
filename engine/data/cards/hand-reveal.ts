                              
                                                                      
                                                              
                                                                 
                                                          
                                        
  
                         
  
                            
                                            
                                 
                                        
                                                       
                                        
                                                 
                                                                
                                                  
  
                                                    
                                                                           
                                                           
                                               
  
                                                         
                                                       
                                         

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                                                              
                                          
                                                        
                                               
                                        
export const OGN_192_CARD_EFFECT = '当你打出我时，让一名对手展示手牌，然后从中选择一张，让对手将其弃置。'
export function makeMindReaverTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'moveTo',
      target: { ref: 'chosen', key: 'card' },
                            
      zone: (ctx, moved) => `discard:${ctx.state.objects[moved]?.owner ?? ctx.controller}`,
    }],
  })
  return compileTrigger({
    id: 'OGN-192:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card',
      prompt: '辟心玄龙:对手展示手牌,从中挑一张让他弃掉',
                                                          
      selector: { type: 'any', zone: 'hand', owner: 'opponent' },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_192: Card = {
  id: 'OGN-192', cardNo: 'OGN·192/298', name: '辟心玄龙', category: 'unit',
  domains: ['purple'], energy: 7, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时对手展示手牌,我挑一张让他弃掉(makeMindReaverTrigger)' }],
}

                                                               
                               
                               
                                             
                                          
                                                    
                                   
                                  
                                                           
export const UNL_121_CARD_EFFECT = '当你打出我时，选择一名玩家，让其弃置一张手牌。'
export function makeCharmingSpiritTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'moveTo',
      target: { ref: 'chosen', key: 'card' },
      zone: (ctx, moved) => `discard:${ctx.state.objects[moved]?.owner ?? ctx.controller}`,
    }],
  })
  return compileTrigger({
    id: 'UNL-121:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    nextChoice: (state, _ev, chosen) => {
      const itemId = `trig:UNL-121:play:${selfOid}`
                                   
      if (chosen['who'] === undefined) {
        return {
          itemId, controller, key: 'who',
          prompt: '魅惑之灵:选择一名玩家,让其弃置一张手牌',
          candidates: state.players.map((p) => ({ id: p as string, label: p as string })),
        }
      }
                                  
      if (chosen['card'] === undefined) {
        const who = chosen['who'] as PlayerId
        const hand = state.zones[`hand:${who}` as ZoneId]?.contents ?? []
        if (hand.length === 0) return null                            
        return {
          itemId,
          controller: who, // ★这里就是"对手作答"的全部实现:填谁就问谁
          key: 'card',
          prompt: '魅惑之灵:弃置你的一张手牌',
          candidates: hand.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
      return null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_121: Card = {
  id: 'UNL-121', cardNo: 'UNL-121/219', name: '魅惑之灵', category: 'unit',
  domains: ['purple'], energy: 3, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时选一名玩家,由【他自己】弃一张手牌(makeCharmingSpiritTrigger)' }],
}

                      
export const HAND_REVEAL_DEFIDS: readonly string[] = ['OGN-192', 'UNL-121', 'UNL-135']

                                                             
                                           
                                             
  
                                         
                                         
                                                             
                                          
  
                                                     
                                                           
                                    
  
                                           
                                         
                                  
export const UNL_135_CARD_EFFECT =
  '当你打出我时，选择一名对手。让对手展示自己的手牌。你可以选择支付2经验，从其手牌中选择一张卡牌。若如此做，则让该对手弃置该卡牌，并抽一张牌。'
export function makeThoroughInvestigatorTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: { nonResource: { experience: 2 } }, // ㊹ 「支付2经验」是费用
                                                               
                                                       
    guard: (ctx) => {
      const picked = ctx.chosen['card']
      return picked !== undefined && picked !== 'skip'
    },
    then: [
      { op: 'moveTo', target: { ref: 'chosen', key: 'card' },
        zone: (ctx, moved) => `discard:${ctx.state.objects[moved]?.owner ?? ctx.controller}` },
      { op: 'draw', count: 1 }, // 抽的是【我】
    ],
  })
  return compileTrigger({
    id: 'UNL-135:play', event: 'playUnit', by: 'you',
                                            
                                                 
                                               
                                              
                                                            
                                                       
                                                     
                                         
                                                                    
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card',
      prompt: '缜密的调查员:支付2经验,从对手手牌里挑一张让他弃掉',
      selector: { type: 'any', zone: 'hand', owner: 'opponent' }, // 手牌是非公开区 ⇒ 不标 isTarget
      optional: true, // §383.3.a.3 结算阶段决定(不是 §383.3.a 的确认阶段)
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_135: Card = {
  id: 'UNL-135', cardNo: 'UNL-135/219', name: '缜密的调查员', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可付2经验,挑对手一张手牌弃掉并抽1(makeThoroughInvestigatorTrigger)' }],
}
