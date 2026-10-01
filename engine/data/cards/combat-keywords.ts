                                        
                                                                   
                                                                           
                                                                            
                                                                    
                                                                
                                                                    
                                                                                                                    
                                            
                                                                           
                                                           
                                                     
                                     
                                                 
                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import { ANY_DOMAIN } from '../../src/state/runePool'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                                   
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { grantKeywordEvent } from './activated-batch'
import { eventBattlefield, selfBattlefield } from '../../src/state/selfHere'                         
import { unitsAtBattlefield } from './battlefields-extra'                   
import { returnToOwnerHand } from './enter-triggers-batch'                   
import { scoredHere } from './scored-here'                      
import { SUBJECT_IS_UNIT } from './notTokenGuard1154'

export const UNL_071_CARD_EFFECT =
  '{{伏击}}（你可以选择将我作为{{反应}}牌，打出到有己方单位的战场。）\n' +
  '当你打出我时，让你此处的其他单位本回合内获得{{坚守}}。（如果他们是防守方，则{{S}}+1。）'
export const OGN_087_CARD_EFFECT = '{{壁垒}}（我在战斗中首先承担伤害。）\n当你打出我时，抽一张牌。'
export const UNL_149_CARD_EFFECT =
  '{{伏击}}（你可以选择将我作为{{反应}}牌，打出到有己方单位的战场。）\n' +
  '每当你打出一个法术时，让我本回合内{{S}}+2。'
                                                                                                                                                 
export const UNL_087_CARD_EFFECT =
  '{{坚守2}}（如果我是防守方，则{{S}}+2。）\n你据守此处时的据守效果额外触发一次。\n' +
  '当我据守一处战场时，在你的下一个主阶段开始时{{获得}}{{A}}。（获得费用资源的技能无法成为其他法术的反应目标。）'

                                    
export function makeBladeDancerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                
                                                                       
                                                
                                                            
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: ({ state }): readonly GameEvent[] => {
                                                                             
                                                                                  
                                                                
                                                                      
                                                             
                                                            
                                    
        const hereId = selfBattlefield(state, selfOid)
        const here = hereId === undefined ? undefined : state.zones[hereId as ZoneId]
        if (!here) return []                   
        const others = here.contents.filter((oid) => {
          const o = state.objects[oid]
                                                                 
                                                               
                                                               
                                                                  
          return !!o && oid !== selfOid && o.controller === controller
            && isUnitDefId(o.defId) && isUnit(o)
        })
                                                             
        return others.map((oid) => grantKeywordEvent(`UNL-071-steadfast:${selfOid}`, oid, '坚守'))
      },
    }],
  })
  return compileTrigger({
    id: 'UNL-071-steadfast',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                    
   
                               
                                                        
  
                                                                
                                                   
                                                        
   
export function makeDrawOnPlaySelfTrigger(
  id: string,
  selfOid: ObjId,
  controller: PlayerId,
                        
  gate?: (state: GameState) => boolean,
): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 1 }] })
  return compileTrigger({
    id,
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」
    ...(gate ? { additionalCondition: gate } : {}),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export function makeInstructorTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeDrawOnPlaySelfTrigger('OGN-087-draw', selfOid, controller)
}

   
                                               
                                                     
                               
  
                                                          
                   
                                                
                                                       
                                                             
                                                       
                                                       
                                  
                                                      
                                                                         
   
export type SelfOnPlayReward =
                                                            
  | { readonly reward?: 'pump'; readonly delta: number }
  /** 第354轮新档:「给予我**增益**」⇒ §增益是**一个物件上的标记**,不是加战力,走 `grantBuff`。 */
  | { readonly reward: 'buff' }

export function makeSelfPumpOnPlayTrigger(
  cfg: {
                                                         
    readonly id: string
                                                                   
                                                                      
                                                                                       
                                                                        
    readonly event: 'playUnit' | 'spellResolved'
                                   
    readonly excludeSelf?: boolean
  } & SelfOnPlayReward,
  selfOid: ObjId,
  controller: PlayerId,
): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (): readonly GameEvent[] => {
                                                          
                                                         
        if (cfg.reward === 'buff') return [{ kind: 'grantBuff', target: selfOid }]
        return [{
          kind: 'addEffect',
          effect: {
            id: `${cfg.id}:${selfOid}`,
            duration: 'thisTurn',
            fromPassive: false,
            predicate: (o) => o.oid === selfOid,
            modification: { kind: 'addMight', delta: cfg.delta },
          },
        }]
      },
    }],
  })
  return compileTrigger({
    id: cfg.id,
    event: cfg.event,
    by: 'you',
                                                   
                                                                                    
    when: cfg.event !== 'playUnit'
                                                                   
      ? [{ kind: 'eventPlayerIs', side: 'you' }]
                                                        
                                                                   
                                                                   
      : (cfg.excludeSelf === true ? [{ kind: 'subjectIsNotSelf' }, SUBJECT_IS_UNIT] : [SUBJECT_IS_UNIT]),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                               
export function makeDianaSpellTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeSelfPumpOnPlayTrigger({ id: 'UNL-149-buff', event: 'spellResolved', delta: 2 }, selfOid, controller)                
}

                                         
   
                                                     
                                                             
                                                                  
                               
                                                             
                                                       
                                       
                                                    
   
export type HoldReward =
  | { readonly reward?: 'energyNextMain' }
  | { readonly reward: 'buffUnitsHere' }
  | { readonly reward: 'draw' }                                         
  // ★第393轮 布里茨 OGN-067:「当我据守一处战场时,把我送回所属的手牌。」
  // ⚠️ 「**所属的**」= owner 不是 controller ⇒ 走 `returnToOwnerHand`(§124 夺来的回原主)
  | { readonly reward: 'returnSelfToOwnerHand' }

export function makeHoldTrigger(
  cfg: { readonly id: string } & HoldReward, selfOid: ObjId, controller: PlayerId,
): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
                                                         
                                                            
        if (cfg.reward === 'draw') return [{ kind: 'draw', player: controller, count: 1 }]
                                               
        if (cfg.reward === 'returnSelfToOwnerHand') return returnToOwnerHand(ctx.state, selfOid as string)
        if (cfg.reward === 'buffUnitsHere') {
                                                 
                                                                    
          const bf = eventBattlefield(ctx.ev as { battlefield?: unknown } | undefined)                
          if (bf === undefined) return []
          return unitsAtBattlefield(ctx.state, bf).map((oid): GameEvent => ({ kind: 'grantBuff', target: oid }))
        }
        return [{ kind: 'grantEnergyNextMain', player: controller, energy: { [ANY_DOMAIN]: 1 } }]
      },
    }],
  })
  return compileTrigger({
    id: cfg.id,
    event: 'hold',
    by: 'you',
                                                                        
                                                                      
                                                           
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => scoredHere(state, selfOid, ev, ['hold']) }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                  
export function makeGolemHoldTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeHoldTrigger({ id: 'UNL-087-grant' }, selfOid, controller)
}

                                                                
                        
                                                        
  
                                                           
                                                
                                                          
                                                           
export const UNL_043_CARD_EFFECT = '{{后排}}\n当我据守一处战场时，给予此处的所有单位{{增益}}。'

                                         
export function makeAnnouncerHoldTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeHoldTrigger({ id: 'UNL-043-buff', reward: 'buffUnitsHere' }, selfOid, controller)
}

export const UNL_043: Card = {
  id: 'UNL-043', cardNo: 'UNL-043/219', name: '热情的播报员', category: 'unit',
  domains: ['green'], energy: 3, power: 2, keywords: ['后排'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '据守此处时给予此处所有单位增益(makeAnnouncerHoldTrigger)' }],
}

export const UNL_071: Card = {
  id: 'UNL-071', cardNo: 'UNL-071/219', name: '环刃舞者', category: 'unit', domains: ['blue'],
  energy: 3, power: 3, keywords: ['伏击'], playModes: [{ kind: 'standard' }, { kind: 'ambush' }],
  abilities: [{ kind: 'passive', describe: '打出时此处其他己方单位本回合获坚守(makeBladeDancerTrigger)' }],
}
export const OGN_087: Card = {
  id: 'OGN-087', cardNo: 'OGN·087/298', name: '约德尔教官', category: 'unit', domains: ['blue'],
  energy: 3, power: 2, keywords: ['壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '壁垒(damageAssign)+打出时抽1(makeInstructorTrigger)' }],
}
export const UNL_149: Card = {
  id: 'UNL-149', cardNo: 'UNL-149/219', name: '黛安娜·超脱凡界', category: 'unit', domains: ['purple'],
  energy: 4, power: 3, keywords: ['伏击'], playModes: [{ kind: 'standard' }, { kind: 'ambush' }],
  abilities: [{ kind: 'passive', describe: '每打出一个法术本回合+2(makeDianaSpellTrigger)' }],
}
export const UNL_087: Card = {
  id: 'UNL-087', cardNo: 'UNL-087/219', name: '苍蓝雕纹魔像', category: 'unit', domains: ['blue'],
  energy: 4, power: 4, keywords: ['坚守2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '坚守2(隐含效果层)+据守我时下个主阶段获[A](makeGolemHoldTrigger);★据守效果额外触发一次=registry.holdRepeats' }],
}
