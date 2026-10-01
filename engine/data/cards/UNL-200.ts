                                                                   
                                                                
                                                    
                                               
                                                       
                                                               
                                                              
                                                           
                                           
  
                                                                          
                                                                         
                                                 
                                                                     
                                                             
                                                   
                                                     
                                  
                                                                          
                                                                  
                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import { isFieldedExceptStandby } from '../../src/state/zones'
import type { ChainItem } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { StaticEffect } from '../../src/effects/continuousView'
import { MIRROR_TOKEN } from './UNL-081'
import { fieldedUnits } from './activated-batch'

export const UNL_200_CARD_EFFECT =
  '选择一名单位。将一名活跃状态的“映像”打出到你的基地。然后进行一次：该“映像”变为'
  + '所选单位的复制体。让其获得{{瞬息}}。（在其控制者的开始阶段开始时，结算得分之前将其摧毁。）'

                                                                
const mirageTag = (selfOid: ObjId): string => `mirror-of:${selfOid}`

                                     
const isFielded = (state: GameState, o: { zone: ZoneId }): boolean =>
  isFieldedExceptStandby(state.zones[o.zone]?.kind)

                                                                    
const copyEffect = (targetOid: ObjId, sourceOid: ObjId): Omit<StaticEffect, 'timestamp'> => ({
  id: `UNL-200-copy:${targetOid}<-${sourceOid}`,
  duration: 'permanent', fromPassive: true,
  predicate: (o) => o.oid === targetOid,
  modification: { kind: 'copyOf', sourceOid },
})

                                                                       
const fleetingEffect = (targetOid: ObjId): Omit<StaticEffect, 'timestamp'> => ({
  id: `UNL-200-fleeting:${targetOid}`,
  duration: 'permanent', fromPassive: true,
  predicate: (o) => o.oid === targetOid,
  modification: { kind: 'grantKeyword', keyword: '瞬息' },
})

   
                                                             
                                                 
                                                    
                                 
   
export function makeMirageCopyItem(selfOid: ObjId, controller: PlayerId, sourceOid: ObjId): ChainItem {
  const tag = mirageTag(selfOid)
  return {
    id: `UNL-200-embed-copy:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    resolve: (state): readonly GameEvent[] => {
      const src = state.objects[sourceOid]
      const srcAlive = src !== undefined && isFielded(state, src)
      return Object.values(state.objects)
        .filter((o) => o.counters[tag] === 1 && isFielded(state, o))
        .flatMap((o): GameEvent[] => [
          ...(srcAlive ? [{ kind: 'addEffect', effect: copyEffect(o.oid, sourceOid) } as GameEvent] : []),
          { kind: 'addEffect', effect: fleetingEffect(o.oid) } as GameEvent,
        ])
    },
  }
}

export const UNL_200_SPEC: PlaySpec = {
  defId: 'UNL-200', cardNo: 'UNL-200/219', name: '镜花水月', kind: 'spell',
  cost: { mana: 3, pips: [['blue'], ['yellow']] }, // ㊶ cardCosts 实测 3 法力 2pip 双色 ⇒ 一蓝一黄
  keywords: [],
  target: 'custom',
                                                                 
  legalTargets: (state: GameState): string[] => fieldedUnits(state).map((o) => o as string),
  makeResolve:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
    if (target === undefined) return []                                  
    const tag = mirageTag(movedCardOid as ObjId)
    return [
                                         
      { kind: 'spawnToken', spec: MIRROR_TOKEN, zone: `base:${controller}` as ZoneId, owner: controller, tag, ready: true } as GameEvent,
                                                                                                         
                                                                                   
                                     
      { kind: 'enqueueItem', item: makeMirageCopyItem(movedCardOid as ObjId, controller, target as ObjId) } as GameEvent,
    ]
  },
}

export const UNL_200: Card = {
  id: 'UNL-200', cardNo: 'UNL-200/219', name: '镜花水月', category: 'spell',
  domains: ['blue', 'yellow'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名单位;打1活跃映像到你基地;内嵌:该映像变所选单位复制体+获瞬息(makeMirageCopyItem)' }],
}
