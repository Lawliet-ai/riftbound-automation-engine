                                                                 
        
                                                  
                           
                                               
                    
                    
  
                                                                    
                                                             
                                                                
                                              
  
                     
                                        
                                                             
                                                         
                                                
  
                                                                               
                                                              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { moveUnitEvents } from './enemy-move'                  

export const UNL_141_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{后排}}（我在战斗中最后承担伤害。）\n' +
  '当你在你的回合中将我从正面朝下的状态打出时，你可以选择移动任意一名位于不同位置的敌方单位到我所在的战场。'

export const UNL_141_PICK = 'evelynnPull'

   
                          
                                        
                                        
   
export function evelynnCandidates(state: GameState, selfOid: ObjId, controller: PlayerId): readonly string[] {
  const here = state.objects[selfOid]?.zone
  if (here === undefined) return []
  return Object.values(state.objects)
    .filter((o) => {
      const zk = state.zones[o.zone]?.kind
      return isUnit(o) && o.controller !== controller
        && (zk === 'battlefield' || zk === 'base')
        && (o.zone as string) !== (here as string)
    })
    .map((o) => o.oid as string)
    .sort()
}

                                                  
export function makeEvelynn141Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-141:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-141',
    event: 'playUnit',
    by: 'you', // 「当**你**…打出时」
    mayChoose: true, // 「你**可以选择**」(㊵)
    when: [
      { kind: 'subjectIsSelf' }, // ①「将**我**…打出」
      {
        kind: 'custom',
                                                      
        test: (ev, state) => (ev as { fromStandby?: boolean }).fromStandby === true
          && state.activePlayer === controller,
      },
    ],
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen[UNL_141_PICK] !== undefined) return null            
      const cands = evelynnCandidates(state, selfOid, controller)
      if (cands.length === 0) return null                          
      return {
        itemId: `trig:UNL-141:${selfOid}`,
        controller,
        key: UNL_141_PICK,
        prompt: '伊芙琳:把哪名敌方单位拉到我所在的战场?',
        isTarget: true, // ★1782 移动任意一名位于不同位置的敌方单位
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = (chosen ?? {})[UNL_141_PICK]
                                          
      if (pick === undefined || !evelynnCandidates(state, selfOid, controller).includes(pick)) return []
      const here = state.objects[selfOid]?.zone
      return moveUnitEvents(state, pick, here as string | undefined)
    },
  }, selfOid, controller)
}

export const UNL_141: Card = {
  id: 'UNL-141', cardNo: 'UNL-141/219', name: '伊芙琳 - 摄人心魄', category: 'unit',
  domains: ['purple'], energy: 2, power: 2, keywords: ['待命', '后排'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[待命]+[后排];我的回合中从正面朝下打出我时,可把一名异处敌方单位拉到我这处(makeEvelynn141Trigger)' }],
}
