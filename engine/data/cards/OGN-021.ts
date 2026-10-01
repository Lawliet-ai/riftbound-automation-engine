                                                                   
                                           
                                     
  
                                                                        
                                                                
                                                                    
                                                  
                                                                       
  
                                                    
                                                               
                                  
                                                                                
                                                      
                                
                                      
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { isRallyActive } from '../../src/keywords/rally'

export const OGN_021_CARD_EFFECT =
  '{{横置}}：{{鼓舞}}—你在本回合内打出的下一名单位以活跃状态进场。（如果你在本回合内已打出过其他卡牌，则发动此效果。）'

export const OGN_021_SPEC: ActivatedSpec = {
  key: 'OGN-021:sunDisc',
  label: '{{横置}}:{{鼓舞}}—你本回合打出的下一名单位以活跃状态进场',
  cost: {}, // 冒号前只有 [横置]
  tapSelf: true,
  target: 'none',
                                             
  available: (state, _c, selfOid) => isRallyActive(state, state.objects[selfOid as ObjId]),
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'markNextUnitReady', player: controller }],
}

export const OGN_021: Card = {
  id: 'OGN-021', cardNo: 'OGN·021/298', name: '太阳圆盘', category: 'equipment',
  domains: ['red'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置]鼓舞—本回合打出的下一名单位活跃进场(OGN_021_SPEC)' }],
}
