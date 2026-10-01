                                                                        
                                                       
                                                                    
                                                                        
                                                      
                                                                                
                                                                         
                                  
                                                
  
          
                                                    
                                                                          
                                                              
                                                              
                                                                     
                                                              
                                                                         

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { experienceOf } from '../../src/keywords/level'
import { selfBattlefield } from '../../src/state/selfHere'
import { effectiveMight } from '../../src/state/might'
import { enemyUnitsAt } from './damage-split'

export const UNL_119_CARD_EFFECT =
  '{{狩猎}}（当我征服或据守一处战场时，获得1经验。）\n' +
  '当我进攻时，你可以选择消耗3经验，以此对此处的一名敌方单位造成等同于我战力的伤害。'

                                
export const UNL_119_XP = 3

   
                                             
                                                  
                                                                          
                                                                
   
export const khazixFoesAt = enemyUnitsAt

export function makeKhazixTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: { nonResource: { experience: UNL_119_XP } },
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const target = ctx.chosen['foe']
        if (target === undefined || !ctx.state.objects[target as ObjId]) return []
        const me = ctx.state.objects[selfOid]
        if (!me) return []                              
                                                                    
                                                          
                                                         
        return [{ kind: 'damage', target: target as ObjId, amount: effectiveMight(me).actual, source: selfOid, sourcePlayer: controller } as GameEvent]
      },
    }],
  })
  return compileTrigger({
    id: `UNL-119:attack:${selfOid}`, rawId: true, sourceDefId: 'UNL-119',
    event: 'attack', by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」紧跟时机从句
    when: [
      { kind: 'subjectIsSelf' }, // 「当【我】进攻时」
                                                           
      { kind: 'custom', test: (_ev, state) => experienceOf(state, controller) >= UNL_119_XP },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['foe'] !== undefined) return null
                                                                                      
      const bf = selfBattlefield(state, selfOid)
      const cands = khazixFoesAt(state, bf, controller)
      if (cands.length === 0) return null                           
      return { itemId: `UNL-119:attack:${selfOid}`, controller, key: 'foe',
        prompt: '卡兹克:对此处的一名敌方单位造成等同我战力的伤害',
        isTarget: true, // ★1782 消耗3经验,**以此**对此处的一名敌方单位造成…伤害
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 吃伤害` })) }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_119: Card = {
  id: 'UNL-119', cardNo: 'UNL-119/219', name: '卡兹克', category: 'unit',
  domains: ['orange'], energy: 5, power: 5, keywords: ['狩猎'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[狩猎]§825 征服/据守得1经验(通用求值)' },
    { kind: 'passive', describe: '进攻时可消耗3经验对此处一名敌方造成等同我战力伤害(makeKhazixTrigger)' },
  ],
}

export const UNL_119A: Card = { ...UNL_119, id: 'UNL-119a', cardNo: 'UNL-119a/219' }
                                                           
export const VEN_180: Card = { ...UNL_119, id: 'VEN-180', cardNo: 'VEN·180' }
