                                                                     
                                                 
                                                  
                                                
                      
                                                 
  
                                    
                                                                     
                                                                          
                                                                     
                                                    
                                                                        
                                                                     
                                                    
                                         
                                                
                                                         
                                                                   
                                                                                  
                                                                 
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { seizeTargets } from './OGN-203'
import { spellTargetStillLegal } from './targetStillLegal'

export const SFD_202_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '获得战场上一名敌方单位的控制权。让其变为活跃状态。（如果该战场上存在其他敌方单位，则开始战斗。否则征服此战场。）\n'
  + '回合结束时，失去该单位的控制权，然后将它召回。（把它送回基地，此行动不算作移动。）'

                                
export const SFD_202_KEYWORDS: readonly string[] = ['待命']

export const SFD_202_SPEC: PlaySpec = {
  defId: 'SFD-202', cardNo: 'SFD·202/221', name: '恶意收购', kind: 'spell',
  cost: { mana: 5, pips: [['blue', 'yellow'], ['blue', 'yellow']] }, // 上游 pips=2 双色 ⇒ 两枚各可蓝/黄
  keywords: [...SFD_202_KEYWORDS],
  target: 'custom',
                                                       
  legalTargets: (state: GameState, controller: PlayerId): string[] => seizeTargets(state, controller),
  makeResolve:
    ({ target, controller, movedCardOid }) =>
    (state: GameState): readonly GameEvent[] => {
                                                                
                                                     
      if (!spellTargetStillLegal(SFD_202_SPEC, state, controller, target)) return []
      const o = state.objects[target as ObjId]
      if (o === undefined) return []
      return [
                                                     
        { kind: 'changeController', target: o.oid, player: controller } as GameEvent,
                                            
        { kind: 'statusChange', target: o.oid, key: 'dormant', value: false } as GameEvent,
                                                         
        { kind: 'delayedTrigger', add: {
          kind: 'loseControlAtTurnEnd',
          id: `SFD-202:${movedCardOid}:${o.oid}`,
          controller, sourceDefId: 'SFD-202',
          target: o.oid, returnTo: o.controller,
        } } as GameEvent,
      ]
    },
}

export const SFD_202: Card = {
  id: 'SFD-202', cardNo: 'SFD·202/221', name: '恶意收购', category: 'spell',
  domains: ['blue', 'yellow'], energy: 5, keywords: [...SFD_202_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '夺取战场上一名敌方单位控制权+变活跃;回合结束还控并召回(SFD_202_SPEC+loseControlAtTurnEnd)' }],
}
