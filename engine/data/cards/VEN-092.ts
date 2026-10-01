                                                                           
                                                               
                                     
                              
                                            
                                                        
  
                                                           
                                                      
                                                                        
                                                           
                                                                      
                                                                  
                                   
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { pumpEvent } from './activated-batch'

export const VEN_092_CARD_EFFECT =
  '支付{{1}}：给予我在本回合内{{S}}+1。\n'
  + '当我的战力变为10或以上时，强化我。（如果我未被强化，则变为已强化状态。）\n'
  + '{{已强化>}} 我获得{{法盾}}和{{游走}}。'

                                                          
export const RENEKTON_BRUTE_MIN = 10
const VEN_092_PUMP = 1             

                                                     
export const VEN_092_SPEC: ActivatedSpec = {
  key: 'VEN-092:pump',
  label: '支付 1 法力,给予我在本回合内战力+1',
  cost: { mana: 1 },
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve:
    ({ selfOid }: { selfOid: string }) =>                                          
    (state: GameState): readonly GameEvent[] => {
      if (!state.objects[selfOid]) return []                 
      return [pumpEvent('VEN-092:pump', selfOid as string, VEN_092_PUMP)]
    },
}

                                                   
export function makeRenektonBruteTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-092-brute:${selfOid}`, rawId: true, sourceDefId: 'VEN-092',
    event: 'mightCrossed',
    when: [
      { kind: 'subjectIsSelf' }, // 「**我的**战力」(subjectOf 认 ev.unit ★713)
      {
        kind: 'custom',
                                                          
        test: (ev): boolean => {
          const e = ev as { readonly from?: number; readonly to?: number }
          return e.from !== undefined && e.to !== undefined
            && e.from < RENEKTON_BRUTE_MIN && e.to >= RENEKTON_BRUTE_MIN
        },
      },
    ],
    effect: (state: GameState): readonly GameEvent[] => {
      if (!state.objects[selfOid]) return []          
                                                     
      return [{ kind: 'empower', target: selfOid } as GameEvent]
    },
  }, selfOid, controller)
}

export const VEN_092: Card = {
  id: 'VEN-092', cardNo: 'VEN·092', name: '雷克顿', category: 'unit',
  domains: ['orange'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '付{1}本回合+1(VEN_092_SPEC);战力变为10+时强化我(makeRenektonBruteTrigger×mightCrossed);已强化>法盾+游走(EMPOWERED_KEYWORDS)' },
  ],
}
