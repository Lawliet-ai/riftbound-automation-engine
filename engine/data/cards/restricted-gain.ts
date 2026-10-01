                                                                             
                                                   
                                           
                                                          
                     
                              
                                                         
                              
                                                                     
  
                                                                  
                                                     
                                                                 
                    
                                                                     
                                                         
                            
                                               
                                          
                                                             
                                                           
                                
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'

export const OGS_014_CARD_EFFECT =
  '{{横置}}：{{反应}}-{{获得}}{{2}}，但仅可用于打出法术。（获得费用资源的技能无法成为其他法术的反应目标。）'
export const SFD_189_CARD_EFFECT =
  '{{横置}}：{{反应}}—{{获得}}{{A}}，仅可用于打出装备或使用装备技能。（获得费用资源的技能无法成为其他法术的反应目标。）'
export const VEN_141_CARD_EFFECT =
  '{{反应}}> 支付{{A}}{{A}}，{{横置}}：{{获得}}{{2}}。此法力仅能用于打出单位或单位的主动技能。'

                      
export const OGS_014_GRANT = { mana: 2, energy: {}, purposes: ['playSpell'] } as const
export const SFD_189_GRANT = { mana: 0, energy: { '*': 1 }, purposes: ['playGear', 'gearAbility'] } as const
export const VEN_141_GRANT = { mana: 2, energy: {}, purposes: ['playUnit', 'unitAbility'] } as const

function makeRestrictedGainSpec(key: string, label: string, cost: ActivatedSpec['cost'], grant: unknown): ActivatedSpec {
  return {
    key, label, cost,
    tapSelf: true,     // 「{{横置}}」三张都有(荒漠屠夫在冒号前费用段)
    keywords: ['反应'], // §813 权限轴(「{{反应}}—/-/>」三种排版同落)
    fastResolve: true, // §429.2 获得资源确认即结算(规则级,不看有没有括号提醒)
    target: 'none',
    legalTargets: (): string[] => [],
    makeResolve: ({ controller }: { controller: PlayerId }) => (_state: GameState): readonly GameEvent[] =>
      [{ kind: 'gainResource', player: controller, restricted: grant } as GameEvent],
  }
}

export const OGS_014_SPEC = makeRestrictedGainSpec(
  'OGS-014:gain', '[横置][反应] 获得{2},仅可用于打出法术', {}, OGS_014_GRANT)
export const SFD_189_SPEC = makeRestrictedGainSpec(
  'SFD-189:gain', '[横置][反应] 获得{A},仅可用于打出装备或使用装备技能', {}, SFD_189_GRANT)
export const VEN_141_SPEC = makeRestrictedGainSpec(
  'VEN-141:gain', '[反应,支付{A}{A},横置] 获得{2},仅可用于打出单位或单位主动技能',
  { pips: [[], []] }, VEN_141_GRANT)                                 

export const OGS_014: Card = {
  id: 'OGS-014', cardNo: 'OGS·014/024', name: '拉克丝', category: 'unit',
  domains: ['yellow'], energy: 4, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置][反应]获得{2}仅可打法术(OGS_014_SPEC×restricted)' }],
}
export const SFD_189: Card = {
  id: 'SFD-189', cardNo: 'SFD·189/221', name: '山隐之焰', category: 'legend',
  domains: ['green', 'blue'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '[横置][反应]获得{A}仅可打装备/装备技能(SFD_189_SPEC×restricted)' }],
}
export const VEN_141: Card = {
  id: 'VEN-141', cardNo: 'VEN·141', name: '荒漠屠夫', category: 'legend',
  domains: ['red', 'orange'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '[反应]付{A}{A}横置获得{2}仅可打单位/单位技能(VEN_141_SPEC×restricted)' }],
}
