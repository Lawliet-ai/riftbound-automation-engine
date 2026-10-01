                                                                        
                                                               
                                  
                                               
                                                                   
  
                                                                  
                                               
                                                                     
                                                                                              
                                                                               
  
                                           
                                                           
                                                      
                                         
                                                   
                                                                          
                             
  
                                                      
                                                           
                                                             
                                                                   
                                                                                             
                                                              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { opponentsOf } from './OGN-156'                

export const VEN_006_CARD_EFFECT =
  '在你的开始阶段开始时，如果你控制的符文数量少于任一对手，则给予我在本回合内{{S}}+2和{{游走}}。（我可以向其他战场进行移动。）'

                             
export const VEN_006_BONUS = 2
                                           
export const VEN_006_GRANT = '游走'

   
                                      
                                                  
                                  
   
export function runeCountOf(state: GameState, player: PlayerId): number {
  return Object.values(state.objects).filter((o) =>
    o.defId.startsWith('rune:')
    && o.controller === player
    && state.zones[o.zone]?.kind === 'base').length
}

   
                              
                                                  
   
export function oasisBehind(state: GameState, controller: PlayerId): boolean {
  const mine = runeCountOf(state, controller)
  return opponentsOf(state, controller).some((p) => mine < runeCountOf(state, p as PlayerId))
}

                                          
export function makeOasisRaiderTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'addMight', target: { ref: 'self' }, delta: VEN_006_BONUS,
        duration: 'thisTurn', id: `VEN-006:might:${selfOid}` },
      { op: 'grantKeyword', target: { ref: 'self' }, keyword: VEN_006_GRANT,
        duration: 'thisTurn', id: `VEN-006:kw:${selfOid}` },
    ],
  })
  return compileTrigger({
    id: `VEN-006:startPhase:${selfOid}`, rawId: true, sourceDefId: 'VEN-006',
    event: 'startPhase',
    by: 'you',
    when: [
                                                                      
      { kind: 'eventPlayerIs', side: 'you' },
                                                     
      { kind: 'custom', test: (_ev, state: GameState): boolean => oasisBehind(state, controller) },
    ],
    activeZone: ['battlefield', 'base'], // §383.2.c 我离场之后不该再响
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_006: Card = {
  id: 'VEN-006', cardNo: 'VEN·006', name: '绿洲劫掠者', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我的开始阶段若符文少于任一对手,本回合[S]+2 与临时[游走](makeOasisRaiderTrigger)' }],
}
