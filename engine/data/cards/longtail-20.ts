                                  
  
                                                                 
                                                                         
  
                                                     
                                                  
                                      
                                                               
                                                                
                                                  
                                               
                                                     
                                                                      
                                              
                                         
                                                                        
                                         
                                                          

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { makeSelfPumpOnPlayTrigger } from './combat-keywords'

export const VEN_121_CARD_EFFECT = '当你打出另一名单位时，给予我在本回合内{{S}}+2。'
export const VEN_183_CARD_EFFECT = '{{伏击}}\n当你打出一个法术时，给予我在本回合内{{S}}+2。'

                                      
export function makeCaptainPumpTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeSelfPumpOnPlayTrigger(
    { id: 'VEN-121-buff', event: 'playUnit', delta: 2, excludeSelf: true },
    selfOid, controller,
  )
}

                                                    
export function makeDianaVenSpellTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeSelfPumpOnPlayTrigger({ id: 'VEN-183-buff', event: 'spellResolved', delta: 2 }, selfOid, controller)                
}

                                                                  
                                                         
  
                                                      
                                                           
                                                                     
                                              
                                                          
                           
export const OGN_139_CARD_EFFECT = '每当你打出另一名单位时，给予我增益。'

                                        
export function makeCloudDrakePlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeSelfPumpOnPlayTrigger(
    { id: 'OGN-139-buff', event: 'playUnit', excludeSelf: true, reward: 'buff' },
    selfOid, controller,
  )
}

export const OGN_139: Card = {
  id: 'OGN-139', cardNo: 'OGN·139/298', name: '云丛的希思莉亚', category: 'unit',
  domains: ['orange'], energy: 2, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出另一名单位时给予我增益(makeCloudDrakePlayTrigger)' }],
}

export const VEN_121: Card = {
  id: 'VEN-121', cardNo: 'VEN·121', name: '草包队长', category: 'unit',
  domains: ['yellow'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出另一名单位时我本回合+2(makeCaptainPumpTrigger)' }],
}
export const VEN_183: Card = {
  id: 'VEN-183', cardNo: 'VEN·183', name: '黛安娜', category: 'unit', // 英雄单位 → unit
  domains: ['purple'], energy: 4, power: 3, keywords: ['伏击'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出法术时我本回合+2(makeDianaVenSpellTrigger)' }],
}

             
export const LONGTAIL20_DEFIDS: readonly string[] = ['VEN-121', 'VEN-183', 'OGN-139']
