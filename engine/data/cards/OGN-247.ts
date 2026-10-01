                                                                     
                                                             
                                                               
                                          
                                 
  
                                                                          
                                                                       
                                                        
                                                              
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'

export const OGN_247_CARD_EFFECT =
  '{{横置}}：{{反应}}—{{获得}}{{A}}，但仅可用于打出法术。'
  + '（获得费用资源的技能无法成为其他法术的反应目标。）'

                                                           
export const OGN_247_GRANT = { mana: 0, energy: { '*': 1 }, purposes: ['playSpell'] } as const

export const OGN_247_SPEC: ActivatedSpec = {
  key: 'OGN-247:gain',
  label: '{{横置}}{{反应}}:获得 1 点任意符能,仅可用于打出法术',
  cost: {}, // 冒号前只有 {横置}
  tapSelf: true,
  keywords: ['反应'], // §813 权限轴(㊼ sigils)
  fastResolve: true, // §429.2 获得资源确认即结算,不入链、不可被反应(括号提醒文)
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller }: { controller: PlayerId }) => (_state: GameState): readonly GameEvent[] =>
    [{ kind: 'gainResource', player: controller, restricted: OGN_247_GRANT } as GameEvent],
}

export const OGN_247: Card = {
  id: 'OGN-247', cardNo: 'OGN·247/298', name: '虚空之女', category: 'legend',
  domains: ['red', 'blue'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '[横置][反应]获得{A}仅可用于打出法术(OGN_247_SPEC×restricted ★724)' },
  ],
}
