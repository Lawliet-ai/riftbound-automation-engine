                                                                   
                             
                                                   
                             
  
                                                  
                                                                            
                                                      
  
                                        
                                                                     
                                                               
                                                             
                                                    
                                                          
  
                                                           
                                                                 
                                                                 
                                                     
                                      
                                                    
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { EffectCtx } from '../../src/dsl/effectSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { fieldedUnits } from './activated-batch'                                   
import { canDormantSelf } from './dormant-self-cost'

export const UNL_133_CARD_EFFECT =
  '当你打出此牌时，你可以选择移动一名敌方单位。\n' +
  '当你移动一名敌方单位时，你可以选择让此牌变为休眠状态，以此{{眩晕}}该敌方单位。（使其在本回合内无法造成战斗伤害。）'

   
                                   
  
                                               
                                                                                      
                                                                              
                                                    
                                                                               
                                                                         
   
export function enemyFieldedUnitsOf(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: false }).map((o) => o as string)
}

   
                                                   
                                              
   
export function moveDestinationsFor(state: GameState, unitOid: ObjId): string[] {
  const u = state.objects[unitOid]
  if (!u) return []
  const here = u.zone as string
  return Object.values(state.zones)
    .filter((z) => z.kind === 'battlefield' || (z.id as string) === `base:${u.controller}`)
    .map((z) => z.id as string)
    .filter((z) => z !== here)
    .sort()
}

                                  
export function makeGooBerryPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'moveOnField',
      target: { ref: 'chosen', key: 'foe' },
                                                               
      zone: (ctx: EffectCtx): string => ctx.chosen['dest'] ?? '',
    }],
  })
  return compileTrigger({
    id: 'UNL-133:play',
    event: 'playUnit',
    by: 'any',
    activeZone: ['base', 'battlefield'],
    mayChoose: true, // §383.3.a「你可以选择」在效果开头
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
                                                          
    nextChoice: (state, _ev, chosen) => {
      if (chosen['foe'] === undefined) {
        const cands = enemyFieldedUnitsOf(state, controller)
          .map((oid) => ({ id: oid, label: `移动 ${state.objects[oid as ObjId]?.defId ?? oid}` }))
        if (cands.length === 0) return null                       
                                                                           
                                                                          
        return { itemId: `trig:UNL-133:play:${selfOid}`, controller, key: 'foe', prompt: '喷射球果:移动一名敌方单位', candidates: cands, isTarget: true }
      }
      if (chosen['dest'] === undefined) {
        const cands = moveDestinationsFor(state, chosen['foe'] as ObjId).map((z) => ({ id: z, label: `移动到 ${z}` }))
        if (cands.length === 0) return null
                                               
                                                            
        return { itemId: `trig:UNL-133:play:${selfOid}`, controller, key: 'dest', prompt: '喷射球果:把它移动到哪个位置', candidates: cands }
      }
      return null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                   
export function makeGooBerryStunTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: {
      nonResource: { dormantSelf: true }, // 「让此牌变为休眠状态」——装备的休眠=横置
      canPayNonResource: (state, self) => canDormantSelf(state, self),
    },
                                                                        
                                                              
                                                     
                                        
                                                     
                                                       
                                                      
                                             
                                                     
    then: [{ op: 'stun', target: { ref: 'eventSubject' } }],
  })
  return compileTrigger({
    id: 'UNL-133:stun',
    event: 'unitMoved',
    by: 'you', // ★probe 实测:链结算里 actor 就是技能控制者 ⇒ 这条认得出"是我推的"
    mayChoose: true, // §383.3.a
    when: [
                                                            
      {
        kind: 'custom',
        test: (ev: GameEvent, state: GameState) => {
          if (ev.kind !== 'unitMoved') return false
          const u = state.objects[(ev as unknown as { unit: ObjId }).unit]
          return !!u && isUnit(u) && u.controller !== controller
        },
      },
      { kind: 'custom', test: (_ev, state: GameState) => canDormantSelf(state, selfOid) }, // 入链门槛
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_133: Card = {
  id: 'UNL-133', cardNo: 'UNL-133/219', name: '喷射球果', category: 'equipment',
  domains: ['purple'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可移动一名敌方单位;你移动敌方单位时可横置自己眩晕它(UNL-133)' }],
}
