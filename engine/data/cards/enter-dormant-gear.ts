                                
  
                                                               
                                                          
                                  
                                                                 
                                       
                                                                             
  
                                   
                                                                          
                                                
                                                         
                                                               
  
                                                             
                                          
                                                  
                                                     

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isEquipment } from '../../src/state/cardTypes'
import { compileEffect } from '../../src/dsl/effectSpec'
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'
import { onField, unitsOnBattlefields } from './activated-batch2'
import { levelReached } from './level-self'
import { ENTER_DORMANT_DEFIDS } from './empower-nonresource'

                                                                 
export const OGN_017_CARD_EFFECT = '此牌以休眠状态进场。\n{{横置}}：对战场上的一名单位造成2点伤害。'

   
                                             
                                                             
                                                  
                           
                                           
                                                                
   
export const OGN_017_SPEC: ActivatedSpec = {
  key: 'OGN-017:bolt',
  label: '{{横置}}:对战场上的一名单位造成 2 点伤害',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] => unitsOnBattlefields(state),
  makeResolve: ({ selfOid, target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'damage', target: target as ObjId, amount: 2, source: selfOid as ObjId }],
}
export const OGN_017: Card = {
  id: 'OGN-017', cardNo: 'OGN·017/298', name: '钢铁弩炮', category: 'equipment',
  domains: ['red'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '休眠进场;[横置]对战场上一名单位造成2点伤害(OGN_017_SPEC)' }],
}

                                                               
export const VEN_062_CARD_EFFECT =
  '此牌以休眠状态进场。\n{{横置}}：强化另一件装备。（如果其未被强化，则变为已强化状态。）'

   
                                                      
                                               
                                           
                                                  
                                                              
   
export const VEN_062_SPEC: ActivatedSpec = {
  key: 'VEN-062:empower',
  label: '{{横置}}:强化另一件装备',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, _controller, selfOid): string[] =>
    Object.values(state.objects)
      .filter((o) => o.oid !== selfOid && isEquipment(o) && onField(state, o))
      .map((o) => o.oid as string)
      .sort(),
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'empower', target: target as ObjId }],
}
export const VEN_062: Card = {
  id: 'VEN-062', cardNo: 'VEN·062', name: '海克斯方程式', category: 'equipment',
  domains: ['blue'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '休眠进场;[横置]强化另一件装备(VEN_062_SPEC)' }],
}

                                                                 
export const UNL_049_CARD_EFFECT =
  '此牌以休眠状态进场。\n{{反应>}} {{横置}}：{{获得}}{{A}}。（获得费用资源的技能无法成为其他法术的反应目标。）\n' +
  '{{等级6>}} {{>>}}{{反应>}} {{横置}}：{{获得}} {{1}}和{{A}}。（你仅可在拥有不少于6经验时才能使用此技能。）'

   
                                                       
                                                                
                                                                     
                                                    
                                                 
  
                                                      
                                    
                                                      
                                                          
                                                             
                                                                  
                                                               
   
export const UNL_049_LEVEL = 6

export const UNL_049_SPEC: ActivatedSpec = {
  key: 'UNL-049:gain',
  label: '{{反应}} {{横置}}:获得 1 点任意符能({{等级6}} 改为获得 1 法力和 1 点任意符能)',
  keywords: ['反应'],
  cost: {},
  tapSelf: true,
  fastResolve: true,
  target: 'none',
  makeResolve: ({ controller }) => (state: GameState): readonly GameEvent[] =>
    levelReached(state, controller, UNL_049_LEVEL)
      ? [{ kind: 'gainResource', player: controller, mana: 1, energy: { '*': 1 } }]
      : [{ kind: 'gainResource', player: controller, energy: { '*': 1 } }],
}
export const UNL_049: Card = {
  id: 'UNL-049', cardNo: 'UNL-049/219', name: '蜜糖果实', category: 'equipment',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '休眠进场;[反应][横置]获得{A},等级6改为{1}和{A}(UNL_049_SPEC)' }],
}

                                                                 
export const UNL_136_CARD_EFFECT =
  '此牌以休眠状态进场。\n摧毁此牌，支付{{1}}，{{横置}}：{{洞察2}}，然后抽一张牌。获得1经验。' +
  '（执行洞察2，即查看你主牌堆顶部的两张牌。你可以将其中任意卡牌回收，并将其余的卡牌按任意顺序放回原处。）'

const UNL_136_LOOK = 2               
const UNL_136_PREFIX = 'UNL136rec'                    

   
                                                     
                                                                    
                                              
                                                          
                                                      
                                          
                                               
                                    
  
                                                                   
                                                                           
                                                               
                                                            
                                                                           
                                                      
                                             
                                                      
   
export const UNL_136_SPEC: ActivatedSpec = {
  key: 'UNL-136:insight',
  label: '摧毁此牌,支付 1 法力并{{横置}}:洞察2,然后抽一张牌。获得1经验',
  cost: { mana: 1 },
  tapSelf: true,
  destroySelf: true,
  target: 'none',
  makeResolve: ({ selfOid, controller }) => (state, chosen): readonly GameEvent[] =>
    compileEffect({
      then: [
                                                     
        { op: 'insight', count: UNL_136_LOOK, recycle: (c) => insightRecycled(c.chosen, UNL_136_PREFIX) },
        { op: 'draw', count: 1 },
        { op: 'gainExperience', amount: 1 },
      ],
    })({
      state, selfOid: selfOid as ObjId, controller,
      ev: { kind: 'startPhase', player: controller } as GameEvent, // 主动技能没有触发事件,给个惰性占位
      chosen: chosen ?? {},
    }),
                                                        
                                                        
                                                  
  makeNextChoice: ({ selfOid, controller }) => insightRecycleChoice({
    itemId: `act:${selfOid}:UNL-136`,
    controller,
    look: UNL_136_LOOK,
    prefix: UNL_136_PREFIX,
    prompt: '占卜花朵:从顶两张里选要回收的(可以一张都不选)',
    doneLabel: '够了,其余放回顶部',
  }),
}
export const UNL_136: Card = {
  id: 'UNL-136', cardNo: 'UNL-136/219', name: '占卜花朵', category: 'equipment',
  domains: ['purple'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '休眠进场;摧毁+{1}+横置:洞察2→抽1→得1经验(UNL_136_SPEC)' }],
}

                                                                    
                                
export const ENTER_DORMANT_GEAR_DEFIDS: readonly string[] = ['OGN-017', 'VEN-062', 'UNL-049', 'UNL-136']

   
                                             
                                              
                                        
                                                            
                                         
   
export const ENTER_DORMANT_PENDING: readonly string[] = []

   
                                                                 
                                                    
                                           
   
export const ENTER_DORMANT_ALL: ReadonlySet<string> =
  new Set<string>([...ENTER_DORMANT_DEFIDS, ...ENTER_DORMANT_GEAR_DEFIDS])
