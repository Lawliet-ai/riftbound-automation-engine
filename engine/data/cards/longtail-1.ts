                     
  
                                  
                                               
                                                       
  
                              
                                                      
                                               
                                                                      
                                                          
  
                                                                      
                                                                 
                                         

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { effectiveMight } from '../../src/state/might'
import { isUnit } from '../../src/state/cardTypes'
import { attachmentsOf } from '../../src/state/attach'
import { hasCardTag } from '../cardTagQuery'
import { ARMAMENT_TAG } from '../../src/keywords/forge'

                                                                  
             
                                               
export const OGN_114_CARD_EFFECT = '抽四张牌。'
export const OGN_114_SPEC: PlaySpec = {
  defId: 'OGN-114', cardNo: 'OGN·114/298', name: '进化日',
  kind: 'spell',
  cost: { mana: 6, pips: [['blue']] }, // 卡面核:6法力+1蓝pip
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller }: { controller: PlayerId }) => (): readonly GameEvent[] =>
    [{ kind: 'draw', player: controller, count: 4 }],
}
export const OGN_114: Card = {
  id: 'OGN-114', cardNo: 'OGN·114/298', name: '进化日', category: 'spell',
  domains: ['blue'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '抽四张牌(OGN_114_SPEC)' }],
}

                                                              
                                    
                                           
                                                  
                                    
export const OGN_076_CARD_EFFECT = '当我进攻时，对此处的一名敌方单位造成等同于我战力的伤害。'
export function makeYasuoTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'damage',
      target: { ref: 'chosen', key: 'foe' },
      amount: (ctx) => {
        const me = ctx.selfOid ? ctx.state.objects[ctx.selfOid] : undefined
        return me ? effectiveMight(me).reference : 0
      },
    }],
  })
  return compileTrigger({
    id: `OGN-076:attack:${selfOid}`, rawId: true, sourceDefId: 'OGN-076',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'foe', prompt: '亚索:对此处的一名敌方单位造成等同于我战力的伤害',
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent', isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_076: Card = {
  id: 'OGN-076', cardNo: 'OGN·076/298', name: '亚索', category: 'unit',
  domains: ['green'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时对此处一名敌方单位造成等同于我战力的伤害(makeYasuoTrigger)' }],
}

                                                                  
                                                               
                                                         
  
                                   
                                                               
                                                                  
  
                                                                    
                                        
                                                                  
                                                           
                                                                                    
                                            
                                          
                                                      
export const VEN_041_CARD_EFFECT =
  '当我进攻时，选择此处的一名敌方单位。我身上每贴附一件武装，便对其造成2点伤害。'
                            
export const VEN_041_PER_ARMAMENT = 2

   
                                             
  
                                                                    
                                                         
                                                              
                                                 
                                                   
   
export function armamentCountOn(state: GameState, hostOid: ObjId): number {
  return attachmentsOf(state, hostOid).filter((o) => hasCardTag(o.defId, ARMAMENT_TAG)).length
}

export function makeRivenTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'damage',
      target: { ref: 'chosen', key: 'foe' },
      amount: (ctx) => armamentCountOn(ctx.state, selfOid) * VEN_041_PER_ARMAMENT,
    }],
  })
  return compileTrigger({
    id: `VEN-041:attack:${selfOid}`, rawId: true, sourceDefId: 'VEN-041',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'foe', prompt: '锐雯:选择此处的一名敌方单位,我身上每贴附一件武装便对其造成2点伤害',
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent', isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const VEN_041: Card = {
  id: 'VEN-041', cardNo: 'VEN·041', name: '锐雯', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: ['百炼'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时对此处一名敌方单位造成2×我身上武装数的伤害(makeRivenTrigger);[百炼]走§821工厂' }],
}

                                                                 
                                  
                                                             
                                   
export const OGN_103_CARD_EFFECT = '每当你打出一张法术牌时，让我本回合内{{S}}+1。'
export function makeRavenbloomTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 1, duration: 'thisTurn', id: `OGN-103:${selfOid}` }],
  })
  return compileTrigger({
    id: `OGN-103:playSpell:${selfOid}`, rawId: true, sourceDefId: 'OGN-103',
                                                        
                                                         
                                                
                                           
                                                               
                                                         
    event: 'spellResolved', by: 'you',
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_103: Card = {
  id: 'OGN-103', cardNo: 'OGN·103/298', name: '拉文布鲁姆学生', category: 'unit',
  domains: ['blue'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出法术时我本回合+1(makeRavenbloomTrigger)' }],
}

                                                                  
                                          
             
                                                                
                                                   
                                                                             
                                                                  
                                                 
                                                                                                              
export const OGN_131_CARD_EFFECT = '当我进攻时，如果此处有处于活跃状态的敌方单位，则让我在本回合内{{S}}+2。'
                                                            

                                       
function hasActiveEnemyHere(state: GameState, self: { zone: string; controller: PlayerId }): boolean {
  return Object.values(state.objects).some((o) =>
    (o.zone as string) === self.zone
    && o.controller !== self.controller
    && isUnit(o)
    && o.status.dormant !== true)                         
}

export function makeDuneDrakeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    guard: (ctx) => {
      const me = ctx.selfOid ? ctx.state.objects[ctx.selfOid] : undefined
      return me !== undefined && hasActiveEnemyHere(ctx.state, me)
    },
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 2, duration: 'thisTurn', id: `OGN-131:${selfOid}` }],
  })
  return compileTrigger({
    id: `OGN-131:attack:${selfOid}`, rawId: true, sourceDefId: 'OGN-131',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_131: Card = {
  id: 'OGN-131', cardNo: 'OGN·131/298', name: '沙丘亚龙', category: 'unit',
  domains: ['orange'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时此处有活跃敌方单位则我+2(makeDuneDrakeTrigger)' }],
}

                                                                
                           
                                                       
                                                                 
                                                    
                                             
export const OGN_091_CARD_EFFECT = '当你打出一件装备时，让我变为活跃状态。'
export function makeArenaCrewTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'setStatus', target: { ref: 'self' }, key: 'dormant', value: false }],
  })
  return compileTrigger({
    id: `OGN-091:playEquip:${selfOid}`, rawId: true, sourceDefId: 'OGN-091',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'eventTargetIs', portrait: { types: ['equipment'] } }], // 打出的那个得是装备
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_091: Card = {
  id: 'OGN-091', cardNo: 'OGN·091/298', name: '竞技场勤务小队', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出装备时我变为活跃(makeArenaCrewTrigger)' }],
}

                                                                  
                              
                                               
                                                  
                                       
                                                      
                                                        
export const OGN_065_CARD_EFFECT = '如果我拥有增益，则我额外获得{{S}}+1。'
export const OGN_065: Card = {
  id: 'OGN-065', cardNo: 'OGN·065/298', name: '睿智长者', category: 'unit',
  domains: ['green'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '有增益则额外+1(COUNTERS 里的 OGN-065)' }],
}

                     
export const LONGTAIL1_DEFIDS: readonly string[] =
  ['OGN-114', 'OGN-076', 'OGN-103', 'OGN-131', 'OGN-091', 'OGN-065']
