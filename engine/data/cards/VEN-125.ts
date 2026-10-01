                                                                         
                                                                    
                                        
                                       
  
                                        
                                                 
                                                                     
                                                    
                                                         
                                                                 
                                                              
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { pumpEvent } from './activated-batch'

export const VEN_125_CARD_EFFECT =
  '支付{{黄色}}：让我变为活跃状态，给予我在本回合内{{S}}+1。'
  + '仅可在你本回合内已选择过敌方单位后使用，且每回合仅限使用一次。'

const VEN_125_PUMP = 1             

export const VEN_125_SPEC: ActivatedSpec = {
  key: 'VEN-125:rally',
  label: '支付 1 点序理符能:让我变为活跃并本回合战力+1(需本回合已选过敌方单位;每回合一次)',
  cost: { mana: 0, pips: [['yellow']] }, // 「支付{{黄色}}」(㊼ SFD-180 ★715)
  oncePerTurn: true, // 「每回合仅限使用一次」
  target: 'none',
  legalTargets: (): string[] => [],
                                                 
  available: (state: GameState, controller: PlayerId, _selfOid: string): boolean =>
    state.chosenEnemyUnitThisTurn?.[controller as string] === true,
  makeResolve:
    ({ selfOid }: { selfOid: string }) =>                                          
    (state: GameState): readonly GameEvent[] => {
      if (!state.objects[selfOid]) return []
      return [
        { kind: 'statusChange', target: selfOid, key: 'dormant', value: false } as GameEvent,
        pumpEvent('VEN-125:rally', selfOid as string, VEN_125_PUMP),
      ]
    },
}

export const VEN_125: Card = {
  id: 'VEN-125', cardNo: 'VEN·125', name: '冰原饿狼', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '付{黄色}变活跃+本回合+1;需本回合已选过敌方单位;每回合一次(VEN_125_SPEC)' },
  ],
}
