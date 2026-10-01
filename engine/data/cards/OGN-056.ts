                                                                       
                                    
                                  
  
                     
                                                                   
                                                                     
                                                                
  
                                         
                                             
                                                      
                                                      
                                             
                   

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import { scoredHere } from './scored-here'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { isEquipment } from '../../src/state/cardTypes'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                                            
export const OGN_056_CARD_EFFECT =
  '当我征服一处战场时，你可以选择摧毁一件装备。若如此做，则给予我增益。' +
  '（如果我未拥有增益，则获得一个{{S}}+1 增益。）'

   
                             
                                               
                                          
                                      
   
export function destroyableEquipment(state: GameState, of?: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      if (k !== 'base' && k !== 'battlefield') return false
      if (!isEquipment(o)) return false
      return of === undefined || o.controller === of                       
    })
    .map((o) => o.oid)
    .sort()
}

   
                                   
                                                               
   
const conqueredHere = (state: GameState, selfOid: ObjId, ev: GameEvent): boolean =>
  scoredHere(state, selfOid, ev, ['conquer'])

export function makeAdaptiveBotTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                        
                                            
                                                                     
                                                             
                                     
  const effect = compileEffect({
                                    
    guard: (ctx) => {
      const gear = ctx.chosen['gear'] as ObjId | undefined
      return !!gear && !!ctx.state.objects[gear]
    },
    then: [
      { op: 'custom', emit: (ctx): readonly GameEvent[] => [{ kind: 'destroy', target: ctx.chosen['gear'] as ObjId }] },
      { op: 'grantBuff', target: { ref: 'self' } },
    ],
  })
  return compileTrigger({
    id: 'OGN-056-buff',
    event: 'conquer',
    by: 'you',
                                                           
                                                                
                                                                  
    when: [{ kind: 'custom', test: (ev, state) => conqueredHere(state, selfOid, ev) }],
    mayChoose: true, // §383.3.a 卡文以"你可以选择"开头
    nextChoice: (state, _ev, chosen) => {
      if (chosen['gear'] !== undefined) return null
      const cands = destroyableEquipment(state).map((oid) => ({
        id: oid as string,
        label: `摧毁 ${state.objects[oid]?.defId ?? oid}`,
      }))
      if (cands.length === 0) return null                           
      return {
        itemId: `trig:OGN-056-buff:${selfOid}`,
        controller,
        key: 'gear',
        prompt: '自适应机器人:摧毁一件装备。若如此做,则给予我增益', // ★896 勘误现行措辞
        candidates: cands,
      }
    },
                                            
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_056: Card = {
  id: 'OGN-056',
  cardNo: 'OGN·056/298',
  name: '自适应机器人',
  category: 'unit',
                                                                             
  domains: ['green'],
  energy: 4,
  power: 3,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '征服此处时可摧毁一件装备换一个增益(makeAdaptiveBotTrigger)' },
  ],
}
