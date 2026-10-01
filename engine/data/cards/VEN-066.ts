                                                                     
                                         
                                                
                                    
  
                                                   
                                                  
                                              
                                                  
                                                          
                                                       
                                                                         
  
                                                                
                                                                      
                            
                                          
                                                            
                                                            
                                                                                
                                                                     
                                                              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { fieldedUnits } from './activated-batch'
import { makeBanishReplayTrigger, SAME_PLACE } from './banish-replay'

export const VEN_066_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '放逐一名单位，然后让其拥有者将其打出到同一位置，无视其费用。'

                            
export const VEN_066_TARGET = 'riftTarget'

   
                                                   
                                                 
   
export function riftTargets(state: GameState): readonly ObjId[] {
  return fieldedUnits(state)
}

export const VEN_066_SPEC: PlaySpec = {
  defId: 'VEN-066', cardNo: 'VEN·066', name: '时空裂隙',
  kind: 'spell',
  cost: { mana: 2, pips: [['blue']] }, // 卡面 2 法力 + 一枚蓝 pip(㊶)
  keywords: ['待命'], // §811 正面朝下布置,之后可当反应牌打出
                                                                   
                                                                               
  choiceTiming: 'confirm',
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[VEN_066_TARGET] !== undefined) return null
      const cands = riftTargets(state)
      if (cands.length === 0) return null                           
      return {
        itemId: `spell:${movedCardOid}:VEN-066`,
        controller,
        key: VEN_066_TARGET,
        prompt: '时空裂隙:放逐哪一名单位(其拥有者随后把它无视费用打回【原位】)',
        isTarget: true, // ★1782 放逐一名单位
        candidates: cands.map((oid) => ({
          id: oid as string,
          label: `${state.objects[oid]?.defId ?? oid}@${state.objects[oid]?.zone ?? '?'}`,
        })),
      }
    },
  makeResolve:
    ({ movedCardOid }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[VEN_066_TARGET]
      if (pick === undefined || !riftTargets(state).includes(pick as ObjId)) return []
                                                                
      return [{ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent]
    },
}

   
                                           
                                                     
                                       
                                                        
                                                         
                                                              
                                                               
                                         
   
export function makeRiftPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                             
                                                                     
  return makeBanishReplayTrigger('VEN-066', selfOid, controller, SAME_PLACE)
}

export const VEN_066: Card = {
  id: 'VEN-066', cardNo: 'VEN·066', name: '时空裂隙', category: 'spell',
  domains: ['blue'], energy: 2, keywords: ['待命'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '放逐一名单位,其拥有者无视费用把它打回同一位置' }],
}
