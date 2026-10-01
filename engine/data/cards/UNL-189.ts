                                                                  
                                       
                                                     
                                          
  
       
                                                                      
                                          
                                                            
                                                          
                               
                                                                
                                                          
                                                          
                                                      
                                                                           
                                                                
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { CostMod } from '../../src/game/costPipeline'
import { SPRITE_TOKEN } from './batch-play-triggers'
import { onField } from './activated-batch2'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { currentKeywords } from '../../src/state/object'

export const UNL_189_CARD_EFFECT =
  '支付{{4}}，{{横置}}：打出一名处于活跃状态的3{{S}}“精灵”，它拥有{{瞬息}}。' +
  '场上每存在一名拥有{{瞬息}}的友方单位，此技能费用减少{{1}}。'

                          
export const UNL_189_BASE_MANA = 4
export const UNL_189_PER_EPHEMERAL = 1
                                                     
                                                  
                                                                    
                                                                           
                                                  
                                                                       
export const UNL_189_EPHEMERAL = '瞬息'

                                          
export function ephemeralFriendlyCount(state: GameState, player: PlayerId): number {
  return Object.values(state.objects).filter((o) => {
    if (o.controller !== player) return false
    if (!isUnit(o)) return false                                                                             
    if (!onField(state, o)) return false
    const kws = currentKeywords(o)
    return kws.includes(UNL_189_EPHEMERAL)
  }).length
}

                                                             
export function bashfulBloomCostMods(state: GameState, player: PlayerId): readonly CostMod[] {
  const n = ephemeralFriendlyCount(state, player)
  return n > 0
    ? [{ kind: 'reduce', part: 'mana', mana: n * UNL_189_PER_EPHEMERAL, source: 'UNL-189 含羞蓓蕾(每名瞬息友方单位)' }]
    : []
}

export const UNL_189_SPEC: ActivatedSpec = {
  key: 'UNL-189:sprite',
  label: '支付 4 法力并{{横置}}:打出一名活跃的战力 3 精灵(每名{{瞬息}}友方单位减 1 法力)',
  cost: { mana: UNL_189_BASE_MANA }, // §206.1 印刷基础费,减费不回写
  costMods: (state: GameState, player: PlayerId) => bashfulBloomCostMods(state, player),
  tapSelf: true,
  target: 'custom', // 落点(基地 / 我控制着的战场)
  legalTargets: (state: GameState, player: PlayerId): string[] =>                                          
    [`base:${player}`, ...controlledBattlefields(state, player)],
  makeResolve: ({ controller, target }: { controller: PlayerId; target?: string }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{
      kind: 'spawnToken', spec: SPRITE_TOKEN, zone: target as never, owner: controller,
      ready: true, // 卡文「处于活跃状态的」⇒ 豁免 §359.2.c 的默认休眠
    }],
}

export const UNL_189: Card = {
  id: 'UNL-189', cardNo: 'UNL-189/219', name: '含羞蓓蕾', category: 'legend',
  domains: ['green', 'blue'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'activated', describe: '付4横置打出活跃的3[M]瞬息精灵,每名瞬息友方单位减{1}(UNL_189_SPEC)' } as never],
}
