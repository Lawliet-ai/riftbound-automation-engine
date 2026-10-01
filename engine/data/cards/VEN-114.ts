                                                                         
                                                                  
                                                   
                                                
                                  
                               
  
                                                
                                                                      
                                                            
                                                           
                                                                 
                                                 
                                                            
                      
                                                                
                                                     
                                                               
                                                    
                                              
import type { Card } from '../../src/dsl/card'
import type { ChainItem } from '../../src/loop/chain'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { opponentsOf } from './OGN-156'
import { unitDestinations, playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const VEN_114_CARD_EFFECT =
  '{{强化6紫色紫色}}（支付{{6}}和{{紫色}}{{紫色}}：强化我。仅在未强化时可用。）\n'
  + '当我变为{{已强化}}时，选择一名对手。该玩家{{燃烧3}}。然后你可以选择进行一次：'
  + '从其废牌堆中选择一名单位，并当作自己的牌打出，无视其费用。'
  + '（将其主牌堆顶部的三张牌放入废牌堆，即为燃烧3。）'

export const VEN_114_BURN = 3
export const VEN_114_KEYWORDS: readonly string[] = ['强化6紫色紫色']
const VEN_114_PICK = 'karloxPick'
export const VEN_114_TO = 'karloxTo'                
export const VEN_114_SKIP = 'skip'

                                                       
export function karloxCandidates(state: GameState, foe: string): readonly ObjId[] {
  return (state.zones[`discard:${foe}` as ZoneId]?.contents ?? [])
    .filter((oid) => isUnit(state.objects[oid]))
}

   
                                             
                                                  
                                                              
   
export function makeKarloxPlunderItem(selfOid: ObjId, controller: PlayerId, foe: PlayerId): ChainItem {
  return {
    id: `VEN-114-embed-plunder:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    nextChoice: (state, chosen) => {
      if (chosen[VEN_114_PICK] !== undefined) {
                                                                                
        const picked = chosen[VEN_114_PICK]
        if (picked === VEN_114_SKIP || chosen[VEN_114_TO] !== undefined) return null
        const o = state.objects[picked as ObjId]
        if (!o) return null
        return playFromEffectChoice(state, controller, o.defId, {
          itemId: `trig:VEN-114-embed-plunder:${selfOid}`, controller, key: VEN_114_TO, prompt: '卡洛克斯:把它打出到哪里?',
        }, chosen)
      }
                                                                  
                                                                                          
                                              
      const cands = karloxCandidates(state, foe as string)
        .filter((oid) => unitDestinations(state, controller, undefined, state.objects[oid]?.defId ?? '').length > 0)
      if (cands.length === 0) return null                        
      return {
        itemId: `trig:VEN-114-embed-plunder:${selfOid}`,
        controller,
        key: VEN_114_PICK,
        prompt: '卡洛克斯:可从该对手废牌堆选一名单位,当作自己的牌免费打出(可以不选)',
        isTarget: true, // ★1782 从其废牌堆中选择一名单位
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
          { id: VEN_114_SKIP, label: '不选' }, // §383.3.a「你可以选择」
        ],
      }
    },
    resolve: (state, chosen): readonly GameEvent[] => {
      const picked = (chosen as Readonly<Record<string, string>> | undefined)?.[VEN_114_PICK]
      if (picked === undefined) return []
      if (!karloxCandidates(state, foe as string).includes(picked as ObjId)) return []
                                                              
                                                     
                                                                                    
                                                                                                   
      const x = optionalExtraResolve(state, controller, state.objects[picked as ObjId]?.defId ?? '', VEN_114_TO,
        chosen as Readonly<Record<string, string>> | undefined)
      const dest = unitDestinationResolve(state, controller, state.objects[picked as ObjId]?.defId ?? '',
        (chosen as Readonly<Record<string, string>> | undefined)?.[VEN_114_TO], x.grant)
      if (dest === undefined) return []
      return [...x.pre, { kind: 'playFree', obj: picked as ObjId, player: controller, to: dest, ...x.flags } as GameEvent, ...x.post]
    },
  }
}

                                                                                      
export function makeKarloxEmpoweredTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-114-plunder:${selfOid}`, rawId: true, sourceDefId: 'VEN-114',
    event: 'empower',
    by: 'any', // §441.2.a 被【外部效果】强化也算"变为已强化"
    when: [{ kind: 'subjectIsSelf' }], // 强化的对象必须是我
    effect: (state: GameState): readonly GameEvent[] => {
                                                         
      const foe = opponentsOf(state, controller)[0]
      if (foe === undefined) return []
      return [
        { kind: 'burn', player: foe as PlayerId, count: VEN_114_BURN } as GameEvent, // 「该玩家{{燃烧3}}」
                                               
        { kind: 'enqueueItem', item: makeKarloxPlunderItem(selfOid, controller, foe as PlayerId) } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const VEN_114: Card = {
  id: 'VEN-114', cardNo: 'VEN·114', name: '卡洛克斯', category: 'unit',
  domains: ['purple'], energy: 6, power: 5, keywords: [...VEN_114_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[付{6}{紫}{紫}]强化我;变为已强化时对手燃烧3,然后可从其废牌堆免费打出一名单位当自己的(makeKarloxEmpoweredTrigger)' }],
}
