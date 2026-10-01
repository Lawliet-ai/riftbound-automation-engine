                                                                      
        
                                                  
                                      
                    
  
                                                 
                                                       
                                                          
                                                                
                                                                        
                                                     
  
                                                    
                                                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'

export const UNL_003_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当你将我打出到一处战场时，对此处的一名敌方单位造成2点伤害。'

                
export const UNL_003_DAMAGE = 2
export const UNL_003_PICK = 'marauderHit'

                                     
export function landedBattlefield(state: GameState, ev: GameEvent): string | undefined {
  const at = (ev as { at?: string }).at
  if (at === undefined) return undefined
  const z = state.zones[at as never] as { kind: string } | undefined
  return z !== undefined && z.kind === 'battlefield' ? at : undefined
}

                           
export function marauderTargets(state: GameState, controller: PlayerId, here: string | undefined): readonly string[] {
  if (here === undefined) return []
  return Object.values(state.objects)
    .filter((o) => o.controller !== controller && isUnit(o) && (o.zone as string) === here)
    .map((o) => o.oid as string)
    .sort()
}

                                                    
export function makeMarauder003Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-003:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-003',
    event: 'playUnit',
    by: 'you', // 「当**你**将我打出」
    when: [
      { kind: 'subjectIsSelf' }, // 「将**我**打出」
                                          
      { kind: 'custom', test: (ev, state) => landedBattlefield(state, ev) !== undefined },
    ],
    nextChoice: (state, ev, chosen): ChoiceRequest | null => {
      if (chosen[UNL_003_PICK] !== undefined) return null            
      const cands = marauderTargets(state, controller, landedBattlefield(state, ev))
      if (cands.length === 0) return null                               
      return {
        itemId: `trig:UNL-003:${selfOid}`,
        controller,
        key: UNL_003_PICK,
        prompt: '鲛人滋事者:对此处的哪名敌方单位造成 2 点伤害?',
        isTarget: true, // ★1782 对此处的一名敌方单位造成2点伤害
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, ev, chosen): readonly GameEvent[] => {
      const pick = (chosen ?? {})[UNL_003_PICK]
                                      
      if (pick === undefined || !marauderTargets(state, controller, landedBattlefield(state, ev)).includes(pick)) return []
      return [{
        kind: 'damage', target: pick as ObjId, amount: UNL_003_DAMAGE,
                          
        source: selfOid, sourcePlayer: controller,
      } ]
    },
  }, selfOid, controller)
}

export const UNL_003: Card = {
  id: 'UNL-003', cardNo: 'UNL-003/219', name: '鲛人滋事者', category: 'unit',
  domains: ['red'], energy: 2, power: 2, keywords: ['待命'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[待命];打出【到战场】时对此处一名敌方单位 2 点伤害(makeMarauder003Trigger)' }],
}
