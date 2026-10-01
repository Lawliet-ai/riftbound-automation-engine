                                                                            
                                       
                             
                           
  
                                                       
                                          
  
                                              
                                                       
  
                                                                   
                                                       
  
                                                           
                                                             
  
                                                       
                                                             

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { CostMod } from '../../src/game/costPipeline'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { controlledRuneCount } from '../../src/game/economy'
import { empowerCount, empowerLimitOf } from '../../src/keywords/empower'

export const VEN_032_CARD_EFFECT =
  '{{强化12}}。你每控制一枚符文，此技能的费用便减少{{1}}。' +
  '（支付此费用：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{S}}+3。'

   
                                       
                                                     
                                        
   
export function perRuneEmpowerDiscount(state: GameState, player: PlayerId, source: string): readonly CostMod[] {
  const n = controlledRuneCount(state, player)
  return n > 0 ? [{ kind: 'reduce', part: 'total', mana: n, source: `${source}(符文${n}枚)` }] : []
}

                         
export function frostMotherEmpowerCostMods(state: GameState, player: PlayerId): readonly CostMod[] {
  return perRuneEmpowerDiscount(state, player, 'VEN-032 霜衣狼母')
}

export const VEN_032_EMPOWER_SPEC: ActivatedSpec = {
  key: 'VEN-032:empower',
  label: '强化12:强化我(每控制一枚符文,费用减少 1 法力)',
  cost: { mana: 12 }, // §206.1 印刷基础费:别的效果引用时读这个,减免不回写
  costMods: (state, player) => frostMotherEmpowerCostMods(state, player),
  available: (state, _controller, selfOid) => {
    const o = state.objects[selfOid as ObjId]
    return o !== undefined && empowerCount(o) < empowerLimitOf(o)                           
  },
  target: 'none', // §827.1.b.1
  makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid as ObjId }],
}

export const VEN_032: Card = {
  id: 'VEN-032',
  cardNo: 'VEN·032',
  name: '霜衣狼母',
  category: 'unit',
  domains: ['green'],
  energy: 3,
  power: 3,
  keywords: [], // 见文件头:带减费文本的强化走手写规格
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化12]每控制一枚符文减{1}(VEN_032_EMPOWER_SPEC,§827.1.c.3)' },
    { kind: 'passive', describe: '[已强化>]{S}+3(empowered-passives 的 EMPOWERED_MIGHT)' },
  ],
}
