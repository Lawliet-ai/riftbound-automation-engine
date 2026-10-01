                          
  
                                            
                 
  
                                         
                                                   
                                                   
                                               
                                             
                                                                              
                                                                                                     
                                                                  
                                                                                                
                                                                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { CostMod } from '../../src/game/costPipeline'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
                                                              
                                                         
import { fieldedUnits } from './activated-batch'


                                                                   
               
                                       
                                         
                                      
export const OGN_229_CARD_EFFECT = '摧毁一名单位。'
export const OGN_229_SPEC: PlaySpec = {
  defId: 'OGN-229', cardNo: 'OGN·229/298', name: '复仇',
  kind: 'spell',
  cost: { mana: 4, pips: [['yellow'], ['yellow']] }, // 卡面核:4法力+2黄pip
  keywords: [],
  target: 'custom',
  legalTargets: (state: GameState): string[] => fieldedUnits(state) as string[],
  makeResolve: ({ target }: { target?: string }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'destroy', target: target as ObjId }],
}
export const OGN_229: Card = {
  id: 'OGN-229', cardNo: 'OGN·229/298', name: '复仇', category: 'spell',
  domains: ['yellow'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '摧毁一名单位(OGN_229_SPEC)' }],
}

                                                             
                                
                                                              
                                    
                                                
export const OGN_148_CARD_EFFECT = '当我进攻时，对此处的所有敌方单位各造成3点伤害。'
export function makeAniviaTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'forEach',
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent' },
      then: [{ op: 'damage', target: { ref: 'each' }, amount: 3 }],
    }],
  })
  return compileTrigger({
    id: `OGN-148:attack:${selfOid}`, rawId: true, sourceDefId: 'OGN-148',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_148: Card = {
  id: 'OGN-148', cardNo: 'OGN·148/298', name: '艾尼维亚', category: 'unit',
  domains: ['orange'], energy: 7, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时对此处所有敌方单位各3点伤害(makeAniviaTrigger)' }],
}

                                                               
                                  
                                                                              
                                                         
                                                        
                                      
export const VEN_071_CARD_EFFECT = '当我变为活跃状态时，给予我在本回合内{{S}}+2。'

   
                                                       
  
                                                                           
                                                         
                                                                                 
                                                          
                           
   
export function becameActive(ev: GameEvent): boolean { // ★677 导出:VEN-088 杰斯同判据复用(铁律80)
  return ev.kind === 'statusChange' && ev.key === 'dormant' && ev.value === false
}

export function makeRestlessCatTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 2, duration: 'thisTurn', id: `VEN-071:${selfOid}` }],
  })
  return compileTrigger({
    id: `VEN-071:active:${selfOid}`, rawId: true, sourceDefId: 'VEN-071',
    event: 'statusChange',
    by: 'any', // 谁让我活跃的都算(卡文没写"你")
    when: [{ kind: 'subjectIsSelf' }, { kind: 'custom', test: becameActive }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const VEN_071: Card = {
  id: 'VEN-071', cardNo: 'VEN·071', name: '焦躁的猫咪', category: 'unit',
  domains: ['orange'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我变为活跃时给我本回合+2(makeRestlessCatTrigger)' }],
}

                                                               
                                        
                                           
                                           
                                                  
export const OGN_143_CARD_EFFECT = '每当你让一名友方单位变为活跃状态时，让其本回合内{{S}}+1。'
export function makePirateHavenTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'eventSubject' }, delta: 1, duration: 'thisTurn', id: `OGN-143:${selfOid}` }],
  })
  return compileTrigger({
    id: `OGN-143:active:${selfOid}`, rawId: true, sourceDefId: 'OGN-143',
    event: 'statusChange', by: 'you',
    when: [
      { kind: 'custom', test: becameActive },
                                           
      {
        kind: 'custom',
        test: (ev, state) => {
          if (ev.kind !== 'statusChange') return false
          const o = state.objects[ev.target]
          return o !== undefined && isUnit(o) && o.controller === controller
        },
      },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_143: Card = {
  id: 'OGN-143', cardNo: 'OGN·143/298', name: '海盗避风港', category: 'equipment',
  domains: ['orange'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你让友方单位变活跃时那个单位本回合+1(makePirateHavenTrigger)' }],
}

                                                             
                                 
                                                                
                                                         
                                                                   
                                                             
                                                    
                                                
export const OGN_195_CARD_EFFECT = '你的废牌堆中每有一张牌，我的费用便减少{{1}}。'
export function lissandraCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'OGN-195') return []
  const n = state.zones[`discard:${player}`]?.contents.length ?? 0
  return n > 0 ? [{ kind: 'reduce', part: 'mana', mana: n, source: 'OGN-195 裂魂者喇煞' }] : []
}
export const OGN_195: Card = {
  id: 'OGN-195', cardNo: 'OGN·195/298', name: '裂魂者喇煞', category: 'unit',
  domains: ['purple'], energy: 10, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '废牌堆每有一张牌费用减1(lissandraCostMods)' }],
}

                                                                 
                                     
                                                  
                                             
                                                       
                                                                      
export const OGN_285_CARD_EFFECT = '当你防守此处时，你可以选择将此处的一名友方单位移动到基地。'
                                                                   
                             

                     
export const LONGTAIL2_DEFIDS: readonly string[] =
  ['OGN-229', 'OGN-148', 'VEN-071', 'OGN-143', 'OGN-195', 'OGN-285']
