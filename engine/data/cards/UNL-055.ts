                                                                    
                                                             
                               
                           
                                          
                                                             
                              
  
                                                                    
                                                                  
                                                               
                                                                      
                                                          
                                                       
                                                                     
                                                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { makeStunEnemyTrigger } from './longtail-4'

export const UNL_055_CARD_EFFECT =
  '{{坚守}}（如果我是防守方，则{{S}}+1。）\n'
  + '{{壁垒}}（我在战斗中首先承担伤害。）\n'
  + '当你{{眩晕}}战场上的一名敌方单位时，你可以选择将我移动到该战场。'

export function makeVexTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeStunEnemyTrigger({
    id: `UNL-055:stun:${selfOid}`,
    sourceDefId: 'UNL-055',
    mayChoose: true, // ②「你可以选择」
    extraWhen: [{
      kind: 'custom',
                                        
      test: (ev: GameEvent, state): boolean => {
        const t = (ev as unknown as { target?: ObjId }).target
        const z = t === undefined ? undefined : state.objects[t]?.zone
        return z !== undefined && state.zones[z]?.kind === 'battlefield'
      },
    }],
                                               
    effect: (state, ev): readonly GameEvent[] => {
      const t = (ev as unknown as { target?: ObjId }).target
      const dest = t === undefined ? undefined : state.objects[t]?.zone
      const me = state.objects[selfOid]
      if (!me || dest === undefined) return []
      if ((me.zone as string) === (dest as string)) return []                
      return [
        { kind: 'zoneChange', obj: selfOid, to: dest as ZoneId } as GameEvent,
        { kind: 'unitMoved', unit: selfOid, player: me.controller, from: me.zone, to: dest as ZoneId } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const UNL_055: Card = {
  id: 'UNL-055', cardNo: 'UNL-055/219', name: '薇古丝', category: 'unit',
  domains: ['green'], energy: 5, power: 5, keywords: ['坚守', '壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '坚守+壁垒;你眩晕战场上的敌方单位时可选择把我移过去(makeVexTrigger)' }],
}
