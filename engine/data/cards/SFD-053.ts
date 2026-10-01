                                                               
                                                               
                                             
                           
                                                    
  
                                                                    
                                                  
                          
                                             
                                             
                                                                    
                                      
                             
                                                      
                                                                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { hereZoneOf } from './enter-triggers-batch'

                                                                                                                                                                  
export const SFD_053_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算，并能打出到你控制的战场。）\n' +
  '当你打出我时，为此处你的所有单位移除伤害，然后将最多一名敌方单位从此处移动到其所属的基地。'

export function makeJannaTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
                                                    
      { op: 'custom', emit: (ctx): readonly GameEvent[] => {
        const here = hereZoneOf(ctx.state, ctx.selfOid as ObjId, ctx.controller)
        return Object.values(ctx.state.objects)
          .filter((o) => (o.zone as string) === here && o.controller === ctx.controller && isUnit(o) && o.damage > 0)
          .map((o) => ({ kind: 'removeDamage', target: o.oid } as GameEvent))
      } },
                                                                     
      { op: 'moveToOwnBase', target: { ref: 'chosen', key: 'foe' } },
    ],
  })
  return compileTrigger({
    id: `SFD-053:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-053',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'foe', prompt: '迦娜:将最多一名敌方单位从此处移回其所属的基地(可以不选)',
                                                     
                                                                   
                                                                       
      selector: { type: 'unit', controller: 'opponent', atSelfZone: true, isTarget: true },
      optional: true, // errata「最多一名」⇒ 可以一个都不移(408 的档)
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_053: Card = {
  id: 'SFD-053', cardNo: 'SFD·053/221', name: '迦娜', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时为此处我的所有单位移除伤害,并可将最多一名此处敌方单位移回其所属基地(makeJannaTrigger);[反应]走§813通道' }],
}
