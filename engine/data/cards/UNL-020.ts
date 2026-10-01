                                                                       
                                                              
             
                                            
                                         
  
                                                 
                                                     
                                                       
                                                             
                                                   
                                                    
                                    
                   
                                                       
                               
                                               
                                     
import type { Card } from '../../src/dsl/card'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { PATROL_SURCHARGE } from './UNL-163'                                  

export const UNL_020_CARD_EFFECT =
  '对一名单位造成2点伤害。其控制者可以选择支付{{A}}，以此再次打出此法术。'
  + '若如此做，则此法术在本回合内每造成过一次伤害，便额外造成1点伤害。'

export const UNL_020_BASE_DAMAGE = 2
                
export const UNL_020_PAY = 'grenadePay'
export const UNL_020_TARGET = 'grenadeTarget'

                                
function allUnits(state: GameState): string[] {
  return Object.values(state.objects)
    .filter((o) => isUnit(o))                                                            
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return k === 'battlefield' || k === 'base'
    })
    .map((o) => o.oid as string)
    .sort()
}

                                                  
function grenadeShot(state: GameState, cardOid: ObjId, target: string, timesDealt: number, shooter: PlayerId): GameEvent[] {
  const victim = state.objects[target as ObjId]
  if (victim === undefined) return []                                        
  return [
                                                                 
                                                           
                                                                       
    { kind: 'damage', target: target as ObjId, amount: UNL_020_BASE_DAMAGE + timesDealt, source: cardOid, sourcePlayer: shooter } ,
    { kind: 'enqueueItem', item: makeGrenadeReplayItem(cardOid, victim.controller, timesDealt + 1) } ,
  ]
}

   
                                              
                                                  
   
export function makeGrenadeReplayItem(cardOid: ObjId, controller: PlayerId, timesDealt: number): ChainItem {
  return {
    id: `UNL-020-replay:${cardOid}:${timesDealt}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    nextChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[UNL_020_PAY] === undefined) {
                             
                                                                 
                                                         
                                                                       
                                                            
                                                                                         
                                                            
        if (!couldPayWithReactionGains(state, controller, PATROL_SURCHARGE)) return null
        return {
          itemId: `UNL-020-replay:${cardOid}:${timesDealt}`, controller, key: UNL_020_PAY,
          prompt: `曼舞手雷:支付{{A}}再次打出此法术?(这一发 ${UNL_020_BASE_DAMAGE + timesDealt} 点)`,
          candidates: [{ id: 'yes', label: '支付{{A}}再打' }, { id: 'no', label: '不付(乒乓结束)' }],
        }
      }
      if (chosen[UNL_020_PAY] !== 'yes' || chosen[UNL_020_TARGET] !== undefined) return null
      const cands = allUnits(state)
      if (cands.length === 0) return null
      return {
        itemId: `UNL-020-replay:${cardOid}:${timesDealt}`, controller, key: UNL_020_TARGET,
        prompt: '曼舞手雷:对哪名单位造成伤害?',
        isTarget: true, // ★1782 对一名单位造成2点伤害
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    resolve: (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      if (chosen?.[UNL_020_PAY] !== 'yes') return []
      if (!canPayFromState(state, controller, PATROL_SURCHARGE)) return []                       
      const target = chosen?.[UNL_020_TARGET]
      if (target === undefined || !allUnits(state).includes(target)) {
                                                  
        return []
      }
      return [
        { kind: 'spend', player: controller, cost: PATROL_SURCHARGE } ,
        ...grenadeShot(state, cardOid, target, timesDealt, controller),
      ]
    },
  }
}

export const UNL_020_SPEC: PlaySpec = {
  defId: 'UNL-020', cardNo: 'UNL-020/219', name: '曼舞手雷', kind: 'spell',
  cost: { mana: 2, pips: [['red']] }, // ㊶ cardCosts 实测 2 法力 1pip 红
  keywords: [],
  target: 'custom', // ★1323 去掉 `as unknown as` 之后 tsc 才看得见这处(旧值 `'unit'` 不在 PlayTargetKind 四档里;范围由下面的 legalTargets 自己算 = custom 的语义)
  legalTargets: (state: GameState): string[] => allUnits(state),
  makeResolve:
    ({ movedCardOid, controller, target }: { movedCardOid: ObjId; controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined) return []
                                                   
      return grenadeShot(state, movedCardOid, target, 0, controller)
    },
}

export const UNL_020: Card = {
  id: 'UNL-020', cardNo: 'UNL-020/219', name: '曼舞手雷', category: 'spell',
  domains: ['red'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '2伤;被打者控制者可付{{A}}回敬且每炸一次+1(乒乓链项 UNL_020_SPEC)' }],
}
