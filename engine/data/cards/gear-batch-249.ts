                                                             
  
                                                                               
                                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { Cost } from '../../src/state/runePool'         
import { payFromState } from '../../src/game/economy'                        
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { spendExperienceCost } from './spend-xp-buff-self'
import { fieldedUnits } from './activated-batch'
import { canDormantSelf } from './dormant-self-cost'
import { hasCardTag } from '../cardTagQuery'
import { ARMAMENT_TAG } from '../../src/keywords/forge'
import { isUnit } from '../../src/state/cardTypes'

                                                             
                                              
  
                                                          
                    
                                                    
                                                                          
                                                 
                                                                       
                                                                                
                                                                        
export const UNL_011_CARD_EFFECT =
  '当你在法术对决期间打出单位时，你可以选择让此装备变为休眠状态，以此抽一张牌。'

   
                                  
  
                                                     
                                                                       
                                              
                                                                      
                                               
   
function ownUnitPlayedInDuel(ev: GameEvent, state: GameState, controller: PlayerId): boolean {
  if (ev.kind !== 'playUnit') return false
  if ((ev as unknown as { player: PlayerId }).player !== controller) return false           
  if (state.spellDuelActive !== true) return false                  
                                                                       
  return isUnit(state.objects[(ev as unknown as { unit: ObjId }).unit])                          
}

export function makeMagicBeanTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: {
      nonResource: { dormantSelf: true }, // 「让此装备变为休眠状态」——装备的休眠=横置
      canPayNonResource: (state, self) => canDormantSelf(state, self),
    },
    then: [{ op: 'draw', count: 1 }],
  })
  return compileTrigger({
    id: 'UNL-011:draw',
    event: 'playUnit',
    by: 'any', // 谁"发起"的不作数,看 ev.player
    mayChoose: true, // §383.3.a「你可以选择」在效果开头
    when: [
      { kind: 'custom', test: (ev: GameEvent, state: GameState) => ownUnitPlayedInDuel(ev, state, controller) },
      { kind: 'custom', test: (_ev, state: GameState) => canDormantSelf(state, selfOid) }, // 入链门槛
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_011: Card = {
  id: 'UNL-011', cardNo: 'UNL-011/219', name: '魔法鲜豆', category: 'equipment',
  domains: ['red'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '法术对决期间你打出单位时可横置自己换抽一张(makeMagicBeanTrigger)' }],
}

                                                            
                                    
                                    
  
                                                    
                                                                
                                                               
                                                                     
                                                                 
                                                                   
export const UNL_109_CARD_EFFECT =
  '当你打出一名单位时，你可以选择支付{{1}}来获得1经验。\n' +
  '消耗3经验，{{横置}}：让一名单位变为活跃状态。'

export const UNL_109_XP_COST = 3

                                       
                                               
export const UNL_109_COST: Cost = { mana: 1 }
export function makeCrimsonRoseTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                            
                                                         
                                                     
                                                     
                                     
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] => [
      { kind: 'gainResource', player: ctx.controller, experience: 1 } as GameEvent,
    ] }],
  })
  return compileTrigger({
    id: 'UNL-109:xp',
    event: 'playUnit',
    by: 'any', // 看 ev.player,不看 actor(铁律153)
    mayChoose: true, // §383.3.a「你可以选择」在效果开头
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        if (ev.kind !== 'playUnit') return false
        const e = ev as unknown as { player: PlayerId; unit: ObjId }
        if (e.player !== controller) return false           
                                          
        return isUnit(state.objects[e.unit])                                                                                     
      },
    }],
                                                              
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, UNL_109_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                   
export const UNL_109_SPEC: ActivatedSpec = {
  key: 'UNL-109:ready',
  label: '消耗 3 经验并{{横置}}:让一名单位变为活跃状态',
  cost: {}, // 冒号前两截都不是资源费(§204.1.b)
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] => fieldedUnits(state) as string[],
                                                             
  extraCost: spendExperienceCost(UNL_109_XP_COST),
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'statusChange', target: target as ObjId, key: 'dormant', value: false }],
}

export const UNL_109: Card = {
  id: 'UNL-109', cardNo: 'UNL-109/219', name: '猩红玫瑰', category: 'equipment',
  domains: ['orange'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出单位时可付{1}换1经验;消耗3经验+横置让一名单位变活跃(UNL_109_SPEC)' }],
}

                                                               
                                                
  
                                            
                                                                         
                                                             
                                                   
  
                                                                 
                                                                               
  
                                                               
                          
                                                        
                                                                   
                                                          
                                                              
export const SFD_119_CARD_EFFECT = '当你为我贴附武装时，可以选择支付{{1}}，以此抽一张牌。'
                                                                    
export const SFD_119_PAY = 1

export function makeJaxTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: { resource: { mana: SFD_119_PAY } }, // 付不起 ⇒ 整条不执行
    then: [{ op: 'draw', count: 1 }],
  })
  return compileTrigger({
    id: 'SFD-119:attach',
    event: 'attach',
    by: 'any', // 判据自己看 ev.to,不看 actor(铁律153)
    mayChoose: true, // §383.3.a「可以选择」在效果开头 ⇒ 整条技能可选
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        if (ev.kind !== 'attach') return false
        const e = ev as unknown as { obj: ObjId; to: ObjId; player?: PlayerId }
        if (e.to !== selfOid) return false            
                                                       
                                                                      
        if (e.player !== undefined && e.player !== controller) return false
        const defId = state.objects[e.obj]?.defId
        return defId !== undefined && hasCardTag(defId, ARMAMENT_TAG)                
      },
    }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_119: Card = {
  id: 'SFD-119', cardNo: 'SFD·119/221', name: '贾克斯', category: 'unit',
  domains: ['orange'], energy: 4, power: 3, keywords: ['百炼'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '为我贴附武装时可付{1}抽一张(makeJaxTrigger);[百炼]走§821工厂' }],
}

                     
export const GEAR_BATCH_249_DEFIDS: readonly string[] = ['UNL-011', 'UNL-109', 'SFD-119']
