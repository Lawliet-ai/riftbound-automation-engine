                                                                   
                                                             
                                                   
  
                                              
                                               
                                                                         
                                                                      
                                                                        
                                                                              
  
                                      
                                                  
                                               
                                                   
                                           
                        
                                                            
                                                                
import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { selfOnBattlefield } from './backline-heroes'

                      
export const XERATH_DAMAGE = 3

export const UNL_026_CARD_EFFECT =
  '支付{{红色}}，{{横置}}：对一名单位造成3点伤害。我必须位于战场中才能使用此技能。'

export const UNL_026_SPEC: ActivatedSpec = {
  key: 'UNL-026:blast',
  label: '支付 1 点炽烈符能并{{横置}}:对一名单位造成 3 点伤害',
  cost: { pips: [['red']] }, // §204.1.b 冒号前:1 枚**红** pip(不是 1 点法力)
  tapSelf: true,
                                              
  available: (state, _c, selfOid) => selfOnBattlefield(state, selfOid),
  target: 'custom',
                                                             
  legalTargets: (state): string[] =>
    Object.values(state.objects)
      .filter((o) => isUnit(o) && (() => {
        const k = state.zones[o.zone]?.kind
        return k === 'battlefield' || k === 'base'                              
      })())
      .map((o) => o.oid as string)
      .sort(),
  makeResolve: ({ selfOid, controller, target }) => (state): readonly GameEvent[] => {
                                               
    if (target === undefined || state.objects[target as ObjId] === undefined) return []
    return [{
      kind: 'damage', target: target as ObjId, amount: XERATH_DAMAGE,
      source: selfOid as ObjId, sourcePlayer: controller,
    } ]
  },
}

export const UNL_026: Card = {
                                                                
  id: 'UNL-026', cardNo: 'UNL-026/219', name: '泽拉斯', category: 'unit',
  domains: ['red'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[付{红色}][横置] 对一名单位造成3点伤害;我须在战场上(UNL_026_SPEC)' }],
}
