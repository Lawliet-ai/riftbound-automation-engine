                                                                   
                                             
                                                
                              
  
                                          
                                                                                
                                                       
                                         
                                                     
                                     
                                                         
                                                   
                                                         
                                                            
                                                          
                                                                       
                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'

export const SFD_078_CARD_EFFECT =
  '支付{{A}}，{{横置}}：让你本回合打出的下一个法术获得等同于其费用的{{回响}}。' +
  '（你可以选择支付此额外费用，以重复此法术效果。）'

                                    
export const SFD_078_ABILITY_COST = { pips: [[]] as readonly (readonly string[])[] }

export const SFD_078_SPEC: ActivatedSpec = {
  key: 'SFD-078:echo',
  label: '支付 1 点任意符能并{{横置}}:让你本回合打出的下一个法术获得等同于其费用的{{回响}}',
  cost: SFD_078_ABILITY_COST,
  tapSelf: true, // 冒号前的 {横置}
  target: 'none',
  makeResolve:
    ({ controller }: { selfOid: string; controller: PlayerId }) =>
    (): readonly GameEvent[] =>
                                                
      [{ kind: 'grantNextSpellEcho', player: controller } as GameEvent],
}

export const SFD_078: Card = {
  id: 'SFD-078', cardNo: 'SFD·078/221', name: '预时之门', category: 'equipment',
  domains: ['blue'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[A]+[横置]:本回合下一个法术获得等同于其费用的[回响]' }],
}
