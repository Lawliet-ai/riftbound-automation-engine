                                                                    
                                                             
                          
                                                    
                          
                      
                                                              
                                                             
                                                                
                                                              
  
               
                                                                        
                                                                          
                                                                 
                                                         
                                                                   
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { selfOnBattlefield } from './backline-heroes'                             
import type { ActivatedSpec } from '../../src/loop/playSpec'

export const SFD_088_CARD_EFFECT =
  '支付{{1}}和{{蓝色}}：抽一张牌。\n'
  + '支付{{4}}和{{蓝色}}{{蓝色}}{{蓝色}}{{蓝色}}，{{横置}}：获得1分。\n'
  + '只有我位于战场时，才能使用我的技能。'

                                                    
                                                                    
                                                              
const onBattlefield = (state: GameState, _c: PlayerId, selfOid: string): boolean =>
  selfOnBattlefield(state, selfOid)

export const SFD_088_SPECS: readonly ActivatedSpec[] = [
  {
    key: 'SFD-088:draw',
    label: '支付 1 法力和 1 点灵光符能:抽一张牌',
    cost: { mana: 1, pips: [['blue']] }, // 「支付{1}和{蓝色}」——⚠️ 这条**不横置**
    target: 'none',
    available: onBattlefield,
    makeResolve: ({ controller }: { controller: PlayerId }) => (): readonly GameEvent[] =>
      [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
  },
  {
    key: 'SFD-088:score',
    label: '支付 4 法力和 4 点灵光符能并{{横置}}:获得1分',
    cost: { mana: 4, pips: [['blue'], ['blue'], ['blue'], ['blue']] }, // ㊶ 四枚蓝 pip 逐枚数
    tapSelf: true, // 「{横置}」
    target: 'none',
    available: onBattlefield,
    makeResolve: ({ controller }: { controller: PlayerId }) => (): readonly GameEvent[] =>
      [{ kind: 'gainPoint', player: controller, amount: 1 } as GameEvent], // ㊼ VEN-067 同事件(额外分)
  },
]

                                                        
export const SFD_088: Card = {
  id: 'SFD-088', cardNo: 'SFD·088/221', name: '烈娜塔·戈拉斯克', category: 'unit',
  domains: ['blue'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '付1+蓝抽1;付4+四蓝+横置得1分;只有在战场才能用技能(SFD_088_SPECS)' }],
}
