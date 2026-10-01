                          
  
                                               
                               
                                               
                                                          
                                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { effectiveMight } from '../../src/state/might'
import type { GameEvent } from '../../src/loop/events'
import { burnOne } from './once-per-turn'               
import { pumpEvent } from './activated-batch'             

                                                              
                                          
                                                 
                                                   
                                       
export const OGN_059_CARD_EFFECT = '每当你眩晕一名敌方单位时，让我变为活跃状态，且本回合{{S}}+1。'
export function makeEclipseVanguardTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'setStatus', target: { ref: 'self' }, key: 'dormant', value: false },
      { op: 'addMight', target: { ref: 'self' }, delta: 1, duration: 'thisTurn', id: `OGN-059:${selfOid}` },
    ],
  })
                                                              
                                                        
  return makeStunEnemyTrigger({
    id: `OGN-059:stun:${selfOid}`, // ★第156轮的字面量,一个字都不能改
    sourceDefId: 'OGN-059',
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_059: Card = {
  id: 'OGN-059', cardNo: 'OGN·059/298', name: '星蚀先锋', category: 'unit',
  domains: ['green'], energy: 7, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你眩晕敌方单位时我变活跃且本回合+1(makeEclipseVanguardTrigger)' }],
}

                                                              
                             
                                                     
                                  
                                                           
export const OGN_185_CARD_EFFECT = '每当我移动时，弃置一张手牌，然后抽一张牌。'
export function makeTravelingMerchantTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'moveTo', target: { ref: 'chosen', key: 'card' }, zone: (ctx) => `discard:${ctx.controller}` },
      { op: 'draw', count: 1 },
    ],
  })
  return compileTrigger({
    id: `OGN-185:moved:${selfOid}`, rawId: true, sourceDefId: 'OGN-185',
    event: 'unitMoved', by: 'any',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card', prompt: '旅行商人:弃置一张手牌',
      selector: { type: 'any', zone: 'hand', owner: 'you' }, // 手牌是非公开区 ⇒ 不标 isTarget
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_185: Card = {
  id: 'OGN-185', cardNo: 'OGN·185/298', name: '旅行商人', category: 'unit',
  domains: ['purple'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每当我移动时弃一张抽一张(makeTravelingMerchantTrigger)' }],
}

                                                           
                                          
                                               
                                             
                                      
export const VEN_080_CARD_EFFECT = '当我征服一处战场时，你可以选择摧毁一件法力费用不高于我的战力的装备。'

                                                      
export function makeNoxianDemolitionistTrigger(
  selfOid: ObjId,
  controller: PlayerId,
  manaCostOf: (defId: string) => number,
): Trigger {
  const effect = compileEffect({
    then: [{ op: 'destroy', target: { ref: 'chosen', key: 'gear' } }],
  })
  return compileTrigger({
    id: `VEN-080:conquer:${selfOid}`, rawId: true, sourceDefId: 'VEN-080',
    event: 'conquer', by: 'you',
    mayChoose: true, // 「你可以选择」
    when: [{ kind: 'selfAtEventBattlefield' }],
    choose: {
      key: 'gear', prompt: '诺克萨斯爆破手:摧毁一件法力费用不高于我战力的装备',
      selector: {
        type: 'equipment', fielded: true, isTarget: true,
                               
                                                                           
        filter: (o, state) => {
          const me = state.objects[selfOid]
          return me !== undefined && manaCostOf(o.defId) <= effectiveMight(me).reference
        },
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const VEN_080: Card = {
  id: 'VEN-080', cardNo: 'VEN·080', name: '诺克萨斯爆破手', category: 'unit',
  domains: ['orange'], energy: 2, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '征服时可摧毁一件法力费≤我战力的装备(makeNoxianDemolitionistTrigger)' }],
}


                                                                
  
                                                    
                                 
                                                                
                                                                   
                                                                 
                                                             
                                                 
                                                                        
export interface StunEnemyCfg {
                                                              
  readonly id: string
  readonly sourceDefId: string
                                         
  readonly nthType?: boolean
  readonly effect: Trigger['effect']
  readonly choose?: Parameters<typeof compileTrigger>[0]['choose']
                                                            
  readonly mayChoose?: boolean
     
                                                        
                                    
     
  readonly extraWhen?: Parameters<typeof compileTrigger>[0]['when']
}

                                                      
export function makeStunEnemyTrigger(cfg: StunEnemyCfg, selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: cfg.id, rawId: true, sourceDefId: cfg.sourceDefId,
    event: 'stun', by: 'you', // 「【你】眩晕」
                                                                   
    when: [{ kind: 'eventTargetIs', portrait: { types: ['unit'], side: 'enemy' } }, ...(cfg.extraWhen ?? [])],
    ...(cfg.mayChoose === true ? { mayChoose: true } : {}), // ★651「你可以选择」档
    ...(cfg.nthType === true ? { nthType: true } : {}),
    ...(cfg.choose !== undefined ? { choose: cfg.choose } : {}),
    effect: cfg.effect,
  }, selfOid, controller)
}

                                                                       
                                       
                                 
                               
                                                              
                                                            
export const OGN_261_CARD_EFFECT = '每当你眩晕任意数量的敌方单位时，给予一名友方单位增益。'
export const OGN_261_PICK = 'dawnBuff'

export function makeDawnGoddessStunTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeStunEnemyTrigger({
    id: `OGN-261:stun:${selfOid}`,
    sourceDefId: 'OGN-261',
    nthType: true, // 「**任意数量**」⇒ 同一批只算一次
    choose: {
      key: OGN_261_PICK,
      prompt: '曙光女神:给予一名友方单位增益',
      selector: { type: 'unit', fielded: true, controller: 'you', isTarget: true },
    },
    effect: (_state, _ev, chosen) => {
      const oid = (chosen ?? {})[OGN_261_PICK]
      return oid === undefined ? [] : [{ kind: 'grantBuff', target: oid as ObjId }]
    },
  }, selfOid, controller)
}

export const OGN_261: Card = {
  id: 'OGN-261', cardNo: 'OGN·261/298', name: '曙光女神', category: 'legend',
                                              
  domains: ['green', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你眩晕任意数量敌方单位时给予一名友方单位增益(makeDawnGoddessStunTrigger)' }],
}

                                                                       
                                         
                                
                                                                   
                                                             
                                               
                             
                                                 
export const VEN_095_CARD_EFFECT = '当我移动时，你可以选择{{燃烧1}}，以此给予我在本回合内{{S}}+1。'
export const VEN_095_PUMP = 1

export function makeShadowDiscipleTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-095:moved:${selfOid}`, rawId: true, sourceDefId: 'VEN-095',
    event: 'unitMoved', by: 'any', // 卡文没写「你」——谁让我动的都算
    when: [{ kind: 'subjectIsSelf' }], // 「当**我**移动时」
    mayChoose: true, // §383.3.a
    effect: (state): readonly GameEvent[] => {
      const burn = burnOne(state, controller as string)
                                             
                                                                       
                                                            
                                                     
                                                             
                                                                
                                                                  
      return [...burn, pumpEvent(`VEN-095:pump:${selfOid}`, selfOid as string, VEN_095_PUMP)]
    },
  }, selfOid, controller)
}

export const VEN_095: Card = {
  id: 'VEN-095', cardNo: 'VEN·095', name: '影流弟子', category: 'unit',
  domains: ['purple'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动时可燃烧1换本回合+1(makeShadowDiscipleTrigger)' }],
}

                              
export const LONGTAIL4_DEFIDS: readonly string[] = ['OGN-059', 'OGN-185', 'VEN-080', 'OGN-261', 'VEN-095']
