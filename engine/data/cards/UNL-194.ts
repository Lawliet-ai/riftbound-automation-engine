                                                                      
                                             
                           
                                                     
  
                                                                       
                                                  
                                                         
                                     
                                                         
                                        
                           
  
                           
                                                                             
                                                                             
                                      
                                                         
                                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { isUnit } from '../../src/state/cardTypes'

export const UNL_194_CARD_EFFECT =
  '如果你将我打出至一处战场，则我以活跃状态进场。\n'
  + '{{迅捷>}} 支付{{1}}和{{A}}，{{横置}}：{{眩晕}}一名进攻此处的敌方单位。'

   
                           
                                            
                                       
   
export function playedToBattlefield(state: GameState, _player: PlayerId, to?: string): boolean {
  return to !== undefined && state.zones[to as never]?.kind === 'battlefield'
}

   
                         
                                                  
   
export function attackersHere(state: GameState, controller: PlayerId, selfOid: ObjId): string[] {
  const me = state.objects[selfOid]
  if (!me || state.zones[me.zone]?.kind !== 'battlefield') return []
  return Object.values(state.objects)
    .filter((o) => o.zone === me.zone && isUnit(o)
      && o.controller !== controller       
      && o.status.attacking === true)        
    .map((o) => o.oid as string)
    .sort()
}

export const UNL_194_SPEC: ActivatedSpec = {
  key: 'UNL-194:stun',
  label: '{{迅捷}} 支付 1 法力和 1 点任意符能并{{横置}}:眩晕一名进攻此处的敌方单位',
  cost: { mana: 1, pips: [[]] }, // 「{1} 和 {A}」——一点法力 + 一枚**任意颜色**符能(㊶ SFD-078 同款)
  keywords: ['迅捷'], // {迅捷>} = §806 时机权限轴
  tapSelf: true, // 「{横置}」那一截
  target: 'custom',
  legalTargets: (state, controller, selfOid) => attackersHere(state, controller, selfOid as ObjId),
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'stun', target: target as ObjId }],
}

export const UNL_194: Card = {
  id: 'UNL-194', cardNo: 'UNL-194/219', name: '黑影', category: 'unit',
  domains: ['green', 'purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打到战场则活跃进场(ENTER_READY 表);[迅捷]{1}{A}+横置:眩晕进攻此处的敌方单位(UNL_194_SPEC)' }],
}
