                                                                    
                                             
                                        
                                                          
                                     
  
                          
                                                                                
                                                 
                                                                                     
                                       
                                                                
                                                
                                                            
                                            
  
                                                           
                                                                         
                                                       
                                                  
                                                                    
                                                       
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { fieldedUnits } from './activated-batch'

export const VEN_133_CARD_EFFECT =
  '{{强化AA}}（支付{{A}}{{A}}：强化我。仅在未强化时可用。）\n' +
  '解除此牌的强化，{{横置}}：选择一名玩家。该玩家获得此牌的控制权，并将其召回。（将其送到该玩家的基地。）\n' +
  '在你回合结束时，摧毁此牌，并对你控制的所有单位各造成5点伤害。'

                                            
export const VEN_133_KEYWORDS: readonly string[] = ['强化AA']
                      
export const VEN_133_PICK = 'glowStonePlayer'
                                   
export const VEN_133_BLAST = 5

                                             
export const VEN_133_SPEC: ActivatedSpec = {
  key: 'VEN-133:handover',
  label: '解除强化并{{横置}}:选择一名玩家,该玩家获得此牌的控制权并将其召回',
  cost: {}, // 冒号前只有两笔**非资源**费用
  tapSelf: true,        // 「{横置}」
  unempowerSelf: true,  // 「解除此牌的强化」(§442;未强化时这条费用付不出 ⇒ 技能列不出来)
  target: 'none',
                                                                
                                                               
                                
  choiceTiming: 'confirm',
  makeNextChoice:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[VEN_133_PICK] !== undefined) return null
      return {
        itemId: `act:${selfOid}:VEN-133`, controller, key: VEN_133_PICK,
        prompt: '发光石:选择一名玩家(他获得此牌的控制权,此牌被召回到他的基地)',
        isTarget: true, // ★1782 选择一名玩家
                                                                     
        candidates: state.players.map((p) => ({ id: p as string, label: p as string })),
      }
    },
  makeResolve:
    ({ selfOid }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[VEN_133_PICK]
                                
      if (pick === undefined || !state.players.includes(pick as PlayerId)) return []
                                                          
      return [
        { kind: 'changeController', target: selfOid as ObjId, player: pick as PlayerId } as GameEvent,
        { kind: 'recall', target: selfOid as ObjId } as GameEvent,
      ]
    },
}

                                           
export function makeGlowStoneEndTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-133:end:${selfOid}`, rawId: true, sourceDefId: 'VEN-133',
                                                   
                                                                                          
                                                                
                                                                                             
                                                          
                           
    event: 'endOfTurn', by: 'you',
    effect: (state: GameState): readonly GameEvent[] => [
                                            
      { kind: 'destroy', target: selfOid, sourcePlayer: controller } as GameEvent,
      ...fieldedUnits(state, { of: controller, friendly: true }).map((oid) => ({
        kind: 'damage', target: oid, amount: VEN_133_BLAST, source: selfOid,
      } as GameEvent)),
    ],
  }, selfOid, controller)
}

export const VEN_133: Card = {
  id: 'VEN-133', cardNo: 'VEN·133', name: '发光石', category: 'equipment',
  domains: ['yellow'], energy: 2, keywords: [...VEN_133_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[强化AA];解除强化+[横置]把控制权交给一名玩家并召回;我方回合结束时自毁并对我方全体5伤' }],
}
