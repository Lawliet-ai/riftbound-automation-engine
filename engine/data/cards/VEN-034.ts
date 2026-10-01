                                                                        
                                                                    
                                                  
                              
                                                
                         
  
           
                                         
                                                                      
                                                      
                                        
                                                                     
                                                        
                                                         
                                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { isUnit } from '../../src/state/cardTypes'
import { moveUnitEvents } from './enemy-move'
import { pumpEvent } from './activated-batch'

export const VEN_034_PICK = 'echoUnit'
export const VEN_034_PUMP = 2

export const VEN_034_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '{{反应}}（可在你的回合或法术对决中打出。）\n'
  + '选择一处受你控制的战场，和一名位于其他位置且受你控制的单位。将该单位移动到该战场，并给予其在本回合内{{S}}+2。'

                                                  
export function echoMovables(state: GameState, controller: PlayerId, destZone: string): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return (k === 'battlefield' || k === 'base') && isUnit(o)
        && o.controller === controller && (o.zone as string) !== destZone
    })
    .map((o) => o.oid as string)
    .sort()
}

export const VEN_034_SPEC: PlaySpec = {
  defId: 'VEN-034', cardNo: 'VEN·034', name: '回音击', kind: 'spell',
  cost: { mana: 2, pips: [['green']] }, // ㊶ cardCosts 实测 2 法力 1 绿 pip
  keywords: ['待命', '反应'],
                                                                   
                                                                     
  choiceTiming: 'confirm',
  target: 'custom',
                                                   
  legalTargets: (state: GameState, controller: PlayerId): readonly string[] =>
    controlledBattlefields(state, controller),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (target === undefined || chosen[VEN_034_PICK] !== undefined) return null
      const cands = echoMovables(state, controller, target)
      if (cands.length === 0) return null                          
      return {
        itemId: `spell:${movedCardOid}:VEN-034`, controller, key: VEN_034_PICK,
        prompt: '回音击:移动哪名单位到该战场?(本回合战力+2)',
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        isTarget: true, // §355.6 「选择…和**一名单位**」第二个也是目标
      }
    },
  makeResolve:
    ({ controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const unit = chosen?.[VEN_034_PICK]
      if (target === undefined || unit === undefined) return []             
                                   
      if (!controlledBattlefields(state, controller).includes(target)) return []
      const o = state.objects[unit as ObjId]
      if (!o || !isUnit(o) || o.controller !== controller) return []
                                                            
      if (!echoMovables(state, controller, target).includes(unit)) return []
      return [
                                                                                     
        ...moveUnitEvents(state, unit, target),
        pumpEvent('VEN-034:pump', unit, VEN_034_PUMP), // 「并给予其在本回合内 +2」
      ]
    },
}

export const VEN_034: Card = {
  id: 'VEN-034', cardNo: 'VEN·034', name: '回音击', category: 'spell',
  domains: ['green'], energy: 2, keywords: ['待命', '反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选我控战场+其他位置我控单位:移过去并本回合+2(VEN_034_SPEC)' }],
}
