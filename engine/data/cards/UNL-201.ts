                                                                        
                                                                      
                      
                                 
                                             
  
                    
                                                                      
                                                                 
                                                            
                                                                          
                                                              
                                               
                                                           
                                                                   
                                                              
                                                                                      
                                                     
                                                                            
                                                                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { playerWonBattle } from './won-battle-triggers'
import { spendExperienceCost } from './spend-xp-buff-self'
import { fieldedUnits } from './activated-batch'
import { isUnit } from '../../src/state/cardTypes'                                                  

export const UNL_201_CARD_EFFECT =
  '当你赢得一场战斗时，获得1经验。\n'
  + '消耗1经验，{{横置}}：给予一名单位{{增益}}。\n'
  + '消耗2经验，{{横置}}：将战场上一名处于休眠状态的友方单位移动到其基地。'

                                                                 
export function makeVoidPlundererTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'UNL-201:wonBattle', rawId: true, sourceDefId: 'UNL-201',
    event: 'battleEnd',
    by: 'any', // 谁发起的战斗都算(㊼ won-battle 族同款)
    when: [{ kind: 'custom', test: (ev): boolean => playerWonBattle(ev, controller) }],
    effect: (): readonly GameEvent[] => [
      { kind: 'gainResource', player: controller, experience: 1 } as GameEvent,
    ],
  }, selfOid, controller)
}

export const UNL_201_SPECS: readonly ActivatedSpec[] = [
  {
    key: 'UNL-201:buff',
    label: '消耗1经验并{{横置}}:给予一名单位增益',
    cost: {}, // 冒号前无资源费;整条费用 = 消耗1经验 + 横置(§204.1.b)
    tapSelf: true,
    extraCost: spendExperienceCost(1),
    target: 'custom',
                                                   
    legalTargets: (state: GameState): string[] => (fieldedUnits(state) as string[]).sort(),
    makeResolve: ({ target }: { target?: string }) => (): readonly GameEvent[] =>
      target === undefined ? [] : [{ kind: 'grantBuff', target: target as ObjId } as GameEvent],
  },
  {
    key: 'UNL-201:recall',
    label: '消耗2经验并{{横置}}:将战场上一名休眠的友方单位移回其基地',
    cost: {},
    tapSelf: true,
    extraCost: spendExperienceCost(2),
    target: 'custom',
    legalTargets: (state: GameState, controller: PlayerId): string[] =>
      Object.values(state.objects)
        .filter((o) => state.zones[o.zone]?.kind === 'battlefield'               
          && isUnit(o)                                                                                
          && o.controller === controller                                       
          && o.status.dormant === true)                                         
        .map((o) => o.oid as string)
        .sort(),
                                                           
    makeResolve: ({ target }: { target?: string }) => (state: GameState): readonly GameEvent[] => {
      if (target === undefined) return []
      const o = state.objects[target as ObjId]
      if (!o) return []
      const to = `base:${o.controller}` as ZoneId
      if ((o.zone as string) === (to as string)) return []
      return [
        { kind: 'zoneChange', obj: o.oid, to } as GameEvent,
        { kind: 'unitMoved', unit: o.oid, player: o.controller, from: o.zone, to } as GameEvent,
      ]
    },
  },
]

                                                                    
export const UNL_201: Card = {
  id: 'UNL-201', cardNo: 'UNL-201/219', name: '虚空掠夺者', category: 'legend',
  domains: ['orange', 'purple'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '你赢得战斗⇒获1经验(makeVoidPlundererTrigger);耗1经验横置给增益/耗2经验横置移休眠友方回其基地(UNL_201_SPECS)' },
  ],
}
