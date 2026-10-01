                                                                         
                                                                      
                                              
                                                
                                   
                        
  
           
                                                     
                                                                          
                                                                       
                                                              
                                                                                  
                                                     
                                                                                        
                                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { SPRITE_TOKEN } from './batch-play-triggers'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       

export const UNL_082_KEYWORDS: readonly string[] = ['急速']

export const UNL_082_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{蓝色}}，让我以活跃状态进场。）\n'
  + '当我移动时，在我移动的起点位置打出一名3{{S}}的“精灵”，它拥有{{瞬息}}。'
  + '（在其控制者的开始阶段开始时，结算得分之前将其摧毁。）'

                               
export const UNL_082_HASTE_KEY = hasteKeyOf('UNL-082:sprite')

export function makeLilliaMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-082:moved:${selfOid}`, rawId: true, sourceDefId: 'UNL-082',
    event: 'unitMoved', by: 'any', // 谁让我动的都算(卡文没写「你」,㊼ UNL-115)
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】移动时」
                                                                                 
    nextChoice: (state, ev, chosen) => {
      const from = (ev as { from?: string }).from
      if (from === undefined || state.zones[from as ZoneId] === undefined) return null
      return spawnTokenHasteChoice(state, controller, SPRITE_TOKEN, { itemId: `trig:UNL-082:${selfOid}`, key: UNL_082_HASTE_KEY, label: '精灵' }, chosen)
    },
    effect: (state: GameState, ev, chosen): readonly GameEvent[] => {
                                                
      const from = (ev as { from?: string }).from
      if (from === undefined || state.zones[from as ZoneId] === undefined) return []           
      const x = spawnTokenHasteResolve(state, controller, SPRITE_TOKEN, UNL_082_HASTE_KEY, chosen)                                                            
      return [
        ...x.pre,
        { kind: 'spawnToken', spec: SPRITE_TOKEN, zone: from as ZoneId, owner: controller, ...(x.ready ? { ready: true } : {}) } as GameEvent,
        // ★1258【缺陷 160】这里【不再】手写补发 `playUnit` —— ★1154 起产地 `reduce.ts tokenPlaySignal` 已按 spawnToken 前后差集派生
        //   (带 `at` 落点、doubler 落两枚就派两条);卡自己再补一条就是【双发】,「当你打出一名单位时」的听众按一名单位收两次钱、给两次收益。
      ]
    },
  }, selfOid, controller)
}

export const UNL_082: Card = {
  id: 'UNL-082', cardNo: 'UNL-082/219', name: '莉莉娅', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [...UNL_082_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当我移动时在起点位置打出3[S]瞬息精灵(makeLilliaMoveTrigger)' }],
}
