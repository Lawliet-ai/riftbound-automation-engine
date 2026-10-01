                     
  
                                                  
                                                                     
                                                
                                    
                                                       
  
               
                                            
                                    
                                                          

import type { Card } from '../../src/dsl/card'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { zonesByKind } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'
import { askMoveDestination, enemyUnitsOnField, moveUnitEvents } from './enemy-move'

                                                               
                                          
                                    
                              
                                           
                                               
export const OGN_123_CARD_EFFECT = '让所有友方单位变为休眠状态，然后对所有战场上的单位各造成12点伤害。'
export const OGN_123_SPEC: PlaySpec = {
  defId: 'OGN-123', cardNo: 'OGN·123/298', name: '过载能量',
  kind: 'spell',
  cost: { mana: 7, pips: [['blue'], ['blue']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve:
    ({ controller, movedCardOid }: { controller: PlayerId; movedCardOid: string }) =>
    (state: GameState): readonly GameEvent[] => {
      const all = Object.values(state.objects)
      const fielded = (o: { zone: string }) => {
        const k = state.zones[o.zone]?.kind
        return k === 'battlefield' || k === 'base'
      }
      const sleep: GameEvent[] = all
        .filter((o) => isUnit(o) && fielded(o) && o.controller === controller)               
        .map((o) => ({ kind: 'statusChange', target: o.oid, key: 'dormant', value: true }))
      const hurt: GameEvent[] = all
        .filter((o) => isUnit(o) && state.zones[o.zone]?.kind === 'battlefield')                    
        .map((o) => ({ kind: 'damage', target: o.oid, amount: 12, sourcePlayer: controller, source: movedCardOid as ObjId }))                        
      return [...sleep, ...hurt]              
    },
}
export const OGN_123: Card = {
  id: 'OGN-123', cardNo: 'OGN·123/298', name: '过载能量', category: 'spell',
  domains: ['blue'], energy: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '所有友方单位休眠,然后所有战场上的单位各12点(OGN_123_SPEC)' }],
}

                                                               
                 
                                                     
                         
                                                       
                                                    
                                       
export const OGN_043_CARD_EFFECT = '移动一名敌方单位。'
const OGN_043_DEST = 'charmDest'
export const OGN_043_SPEC: PlaySpec = {
  defId: 'OGN-043', cardNo: 'OGN·043/298', name: '魅惑妖术',
  kind: 'spell',
  cost: { mana: 1, pips: [['green']] },
  keywords: [],
  target: 'custom',
                                                                     
                                                          
  choiceTiming: 'confirm',
                                                       
                                                      
  legalTargets: (state: GameState, controller: PlayerId): string[] => enemyUnitsOnField(state, controller),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      askMoveDestination({
        state, chosen, key: OGN_043_DEST, itemId: `play:${movedCardOid}`, controller, target,
        prompt: '魅惑妖术:把这名敌方单位移动到哪里?',
      }),
  makeResolve:
    ({ target }: { target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
      moveUnitEvents(state, target, chosen?.[OGN_043_DEST]),
}
export const OGN_043: Card = {
  id: 'OGN-043', cardNo: 'OGN·043/298', name: '魅惑妖术', category: 'spell',
  domains: ['green'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动一名敌方单位(落点结算期选)(OGN_043_SPEC)' }],
}

                     
export const LONGTAIL6_DEFIDS: readonly string[] = ['OGN-123', 'OGN-043']
