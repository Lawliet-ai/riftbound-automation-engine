                                                                      
                                             
                             
                                  
  
                                                       
                                            
  
                                                                   
                                                
                                
                                                    
                                                                  
  
                                                     
                                                    
  
                           

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { CostMod } from '../../src/game/costPipeline'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { controlledRuneCount } from '../../src/game/economy'
import { empowerCount, empowerLimitOf } from '../../src/keywords/empower'

export const VEN_001_CARD_EFFECT =
  '{{强化5}}。如果你控制的符文数量不超过四枚，则此技能的费用减少{{3}}。' +
  '（支付此费用：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{法盾}}和{{强攻2}}。（对手必须支付{{A}}才能将我选作法术或技能的目标。' +
  '如果我是进攻方，则{{S}}+2。）'

                                                  
export function baccaiEmpowerCostMods(state: GameState, player: PlayerId): readonly CostMod[] {
  return controlledRuneCount(state, player) <= 4
    ? [{ kind: 'reduce', part: 'total', mana: 3, source: 'VEN-001 巴凯旋沙者(符文≤4)' }]
    : []
}

export const VEN_001_EMPOWER_SPEC: ActivatedSpec = {
  key: 'VEN-001:empower',
  label: '强化5 强化我(符文不超过四枚时费用减少 3 法力)',
  cost: { mana: 5 }, // §206.1 印刷基础费:别的效果引用时读这个,减费不回写
  costMods: (state, player) => baccaiEmpowerCostMods(state, player),
                                                              
  available: (state, _controller, selfOid) => {
    const o = state.objects[selfOid as ObjId]
    return o !== undefined && empowerCount(o) < empowerLimitOf(o)
  },
  target: 'none', // §827.1.b.1 源物件不是目标
  makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid as ObjId }],
}

export const VEN_001: Card = {
  id: 'VEN-001',
  cardNo: 'VEN·001',
  name: '巴凯旋沙者',
  category: 'unit',
  domains: ['red'],
  energy: 6,
  power: 6,
  keywords: [], // 见文件头:强化5 走手写规格,不入 CARD_KEYWORDS
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化5]带条件减费(VEN_001_EMPOWER_SPEC,§827.1.c.3)' },
    { kind: 'passive', describe: '[已强化>]获得[法盾]与[强攻2](empowered-passives 的 EMPOWERED_KEYWORDS)' },
  ],
}
