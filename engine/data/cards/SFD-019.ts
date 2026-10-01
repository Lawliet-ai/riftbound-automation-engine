                                                              
                                                                  
  
                                   
                                                           
                                                            
                        
                                                                               
                                                      
                                                 
                                                           
                                                                   
                                                             
                                                    
                                               
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { ownDiscard, recycleObjects } from '../../src/keywords/insight'
import { isUnit } from '../../src/state/cardTypes'
import { ROBOT_TOKEN } from './token-spells'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       
                                
export const SFD_019_HASTE_KEY = hasteKeyOf('SFD-019:robot')

export const SFD_019_CARD_EFFECT =
  '支付{{1}}和{{红色}}，从你的废牌堆中回收一名单位，{{横置}}：打出一名3{{S}}的“机器人”到你的基地。'

                                              
export function ownDiscardUnits(state: GameState, controller: PlayerId): readonly ObjId[] {
  return ownDiscard(state, controller).filter((o) => isUnit(state.objects[o]))
}

export const SFD_019_SPEC: ActivatedSpec = {
  key: 'SFD-019:robot',
  label: '支付 1 法力和 1 点炽烈符能,从你的废牌堆回收一名单位,{{横置}}:打出一名战力 3 的"机器人"到你的基地',
  cost: { mana: 1, pips: [['red']] },
  tapSelf: true,
  target: 'none',
  extraCost: {
    label: '从你的废牌堆中回收一名单位',
    options: (state: GameState, controller: PlayerId) =>
      ownDiscardUnits(state, controller).map((o) => ({ id: o as string, label: state.objects[o]?.defId ?? (o as string) })),
                                                           
    pay: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): GameState | null => {
      if (choice === undefined) return null
      if (!ownDiscardUnits(state, controller).includes(choice as ObjId)) return null
      return recycleObjects(state, [choice as ObjId])
    },
                                                 
    payEvents: (_s: GameState, controller: PlayerId): readonly GameEvent[] =>
      [{ kind: 'recycled', player: controller, count: 1 } as GameEvent],
  },
                                                                                         
  makeNextChoice: ({ selfOid, controller }) => (state, chosen) =>
    spawnTokenHasteChoice(state, controller, ROBOT_TOKEN, { itemId: `act:${selfOid}:SFD-019:robot`, key: SFD_019_HASTE_KEY, label: '机器人' }, chosen),
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const x = spawnTokenHasteResolve(state, controller, ROBOT_TOKEN, SFD_019_HASTE_KEY, chosen)                                                      
    return [...x.pre, { kind: 'spawnToken', spec: ROBOT_TOKEN, zone: `base:${controller}`, owner: controller, ...(x.ready ? { ready: true } : {}) } as GameEvent]
  },
}

export const SFD_019: Card = {
  id: 'SFD-019', cardNo: 'SFD·019/221', name: '装配架', category: 'equipment',
  domains: ['red'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '付{1}{红}+回收自己废牌堆一名单位+横置:基地出3[M]机器人(SFD_019_SPEC)' }],
}
