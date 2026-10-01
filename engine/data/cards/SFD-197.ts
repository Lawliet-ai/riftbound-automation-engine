                                                               
                                        
                       
                                                               
  
                              
                                                                     
                                                                    
                                                                              
                                                
  
               
                                                 
                                                                                    
                                                              
                                                                       
                                                 
                                                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ZoneId } from '../../src/state/ids'
import { SAND_SOLDIER_TOKEN } from './token-spells'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       
                                  
export const SFD_197_HASTE_KEY = hasteKeyOf('SFD-197:sandSoldier')

export const SFD_197_CARD_EFFECT =
  '你的“黄沙士兵”获得{{百炼}}。\n支付{{1}}，{{横置}}：打出一名2{{S}}的“黄沙士兵”到你的基地。只能在你本回合打出了一件武装后使用。'

                                                     
export const SAND_SOLDIER_DEF_ID = SAND_SOLDIER_TOKEN.defId

                                           
export const SFD_197_SPEC: ActivatedSpec = {
  key: 'SFD-197:sandSoldier',
  label: '支付 1 法力并{{横置}}:在你的基地打出一名战力 2 的"黄沙士兵"',
  cost: { mana: 1 },
  tapSelf: true, // [横置] 是 §135.2.e.2 的 [E] 轴
  target: 'none',
                                                  
                                          
  available: (state, controller) => state.playedArmamentThisTurn?.[controller as string] === true,
                                                                           
  makeNextChoice: ({ selfOid, controller }) => (state, chosen) =>
    spawnTokenHasteChoice(state, controller, SAND_SOLDIER_TOKEN, { itemId: `act:${selfOid}:SFD-197:sandSoldier`, key: SFD_197_HASTE_KEY, label: '黄沙士兵' }, chosen),
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const x = spawnTokenHasteResolve(state, controller, SAND_SOLDIER_TOKEN, SFD_197_HASTE_KEY, chosen)                                       
    return [...x.pre, {
      kind: 'spawnToken',
      spec: SAND_SOLDIER_TOKEN, // ⚠️ 2[S],不是 MINION 的 1[S]
      zone: `base:${controller}` as ZoneId, // 卡文明写「到你的基地」
      owner: controller,
      ...(x.ready ? { ready: true } : {}),
    } as GameEvent]
  },
}

export const SFD_197: Card = {
  id: 'SFD-197', cardNo: 'SFD·197/221', name: '沙漠皇帝', category: 'legend',
                                                                
  domains: ['green', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你的黄沙士兵获得[百炼];付1+横置在基地打出一名2[M]黄沙士兵(SFD_197_SPEC)' }],
}
