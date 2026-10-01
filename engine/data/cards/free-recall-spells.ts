                                                       
  
                                                                     
                        
                                         
                                           
  
                                                             
                                                          
                                                                               
                                                
                                                              
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { ownFieldedUnits } from './OGN-023'

const CARD_EFFECT_TAIL =
  '选择一名友方单位。本回合内，在该单位下次被摧毁时，改为移除其所受伤害、将其变为休眠状态、并将其召回。' +
  '（把该单位送回基地，此行动不算作移动。）'
const REACTION_NOTE = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）'

export const UNL_175_CARD_EFFECT = `${REACTION_NOTE}\n${CARD_EFFECT_TAIL}`
export const OGS_020_CARD_EFFECT = `${REACTION_NOTE}\n${CARD_EFFECT_TAIL}`

                                          
function makeFreeRecallResolve(
  { target, controller }: { target?: string; controller: PlayerId },
) {
  return (state: GameState): readonly GameEvent[] => {
    if (target === undefined || state.objects[target as ObjId] === undefined) return []           
    return [{
      kind: 'markTurnShield',
      target: target as ObjId,
      mark: { recallOnNextDestroy: { payer: controller, free: true } },
    }]
  }
}

const legalTargets = (state: GameState, controller: PlayerId): string[] => ownFieldedUnits(state, controller)

export const UNL_175_SPEC: PlaySpec = {
  defId: 'UNL-175', cardNo: 'UNL-175/219', name: '战术撤退',
  kind: 'spell', cost: { mana: 2 }, keywords: ['反应'],
  target: 'custom', legalTargets, makeResolve: makeFreeRecallResolve,
}

export const OGS_020_SPEC: PlaySpec = {
  defId: 'OGS-020', cardNo: 'OGS·020/024', name: '高原血统',
  kind: 'spell', cost: { mana: 4 }, keywords: ['反应'],
  target: 'custom', legalTargets, makeResolve: makeFreeRecallResolve,
}

export const UNL_175: Card = {
  id: 'UNL-175', cardNo: 'UNL-175/219', name: '战术撤退', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选友方单位:本回合它下次被摧毁改为清伤+休眠+召回(UNL_175_SPEC)' }],
}

export const OGS_020: Card = {
  id: 'OGS-020', cardNo: 'OGS·020/024', name: '高原血统', category: 'spell',
  domains: ['green', 'orange'], energy: 4, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选友方单位:本回合它下次被摧毁改为清伤+休眠+召回(OGS_020_SPEC)' }],
}

                                 
export const FREE_RECALL_DEFIDS: readonly string[] = ['UNL-175', 'OGS-020']
