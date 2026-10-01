                                             
                                                 
                                              
                         
                                                           
           
                                              
                                                                   
                                                                     
                                                                        
                                                                 
                                                              
import type { Card } from '../../src/dsl/card'
import { scoredHere } from './scored-here'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'

export const UNL_029_CARD_EFFECT = '{{急速}}（你可以选择额外支付{{1}}和{{红色}}，让我以活跃状态进场。）\n你征服此处时的征服效果额外触发一次。\n当我征服一处战场时，给予一名友方单位{{增益}}。（如果其未拥有增益，则获得一个{{S}}+1增益。）'

                                    
function myUnitsOnField029(state: GameState, controller: PlayerId): readonly string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const zk = state.zones[o.zone]?.kind
      return isUnit(o) && o.controller === controller && (zk === 'base' || zk === 'battlefield')
    })
    .map((o) => o.oid as string)
}

export function makeTreant029Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-029:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-029',
    event: 'conquer', by: 'you',
    when: [{ kind: 'custom', test: (ev, state) => scoredHere(state, selfOid, ev, ['conquer']) }],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['buffee'] !== undefined) return null
      const cands = myUnitsOnField029(state, controller)
      if (cands.length === 0) return null                              
      return { itemId: `trig:UNL-029:${selfOid}`, controller, key: 'buffee',
        prompt: '绯红印记树怪:给予哪名友方单位增益?',
        isTarget: true, // ★1782 给予一名友方单位增益
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 得增益` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['buffee']
      if (t === undefined || !state.objects[t as ObjId]) return []            
      return [{ kind: 'grantBuff', target: t as ObjId } as GameEvent]
    },
  }, selfOid, controller)
}

export const UNL_029: Card = {
  id: 'UNL-029', cardNo: 'UNL-029/219', name: '绯红印记树怪', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: ['急速'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[急速];征服此处的征服效果额外触发一次(registry.conquerRepeats);我征服时给一名友方单位增益(makeTreant029Trigger)' }],
}
export const UNL_029A: Card = { ...UNL_029, id: 'UNL-029a', cardNo: 'UNL-029a/219' }
