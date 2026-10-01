                                                                     
                              
                                                     
                    
  
                                                         
                                        
                                               
  
                                               
                                                                  
                                                   
                                                                                      
                                               
                                                       
  
                                                         
                                                 
                                                  
                                                                  
                                       
                                                 
                                                  
                                                        
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec, PlayCtx } from '../../src/loop/playSpec'
import { clearTurnShieldInState, turnShieldsOf } from '../../src/effects/turnShields'
import { moveObjectInState } from '../../src/state/mutations'
import { battlefieldUnits } from './diana-reactions'

export const UNL_007_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '对战场上的一名单位造成3点伤害。如果该单位在本回合内被摧毁，则改为将其放逐。'

                
export const UNL_007_DAMAGE = 3

   
                                   
                                         
  
                                                         
   
export function exileInsteadOfDestroy(state: GameState, hostOid: ObjId): GameState | null {
  if (turnShieldsOf(state, hostOid).exileOnDestroy !== true) return null
  const host = state.objects[hostOid]
  if (host === undefined) return null
                                    
  const s = clearTurnShieldInState(state, hostOid, 'exileOnDestroy')
  return moveObjectInState(s, hostOid, `exile:${host.owner}` as ZoneId)
}

export const UNL_007_SPEC: PlaySpec = {
  defId: 'UNL-007', cardNo: 'UNL-007/219', name: '惩戒', kind: 'spell',
  cost: { mana: 2, pips: [['red']] }, // cardCosts 实测:2 法力 + 1 红 pip
  keywords: ['迅捷'],
  target: 'custom',
                                                            
  legalTargets: (state: GameState): readonly string[] => battlefieldUnits(state).map((oid) => oid as string),
  makeResolve:
    ({ target, movedCardOid, controller }: PlayCtx) =>
    (state: GameState): readonly GameEvent[] => {
                                             
      if (target === undefined || !battlefieldUnits(state).map((o) => o as string).includes(target)) return []
      return [
                            
                                                   
                                                        
                                                               
                                          
                                                
                                                    
        { kind: 'markTurnShield', target: target as ObjId, mark: { exileOnDestroy: true } } ,
                                                             
        { kind: 'damage', target: target as ObjId, amount: UNL_007_DAMAGE, source: movedCardOid as ObjId, sourcePlayer: controller } as GameEvent,
      ]
    },
}

export const UNL_007: Card = {
  id: 'UNL-007', cardNo: 'UNL-007/219', name: '惩戒', category: 'spell',
  domains: ['red'], energy: 2, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[迅捷];对战场上一名单位 3 点伤害;它本回合被摧毁则改为放逐(UNL_007_SPEC)' }],
}
