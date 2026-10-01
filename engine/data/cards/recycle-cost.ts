                     
  
                                            
                                                    
                                                           
                                  
                                                
  
                                        
                                                   
                                                              
                                                   
                                                                 
                           
                                            
                                               
                                                                 
                                                                                
                                                                          
                                                               
                                                        
  
                                                             
                                                      
                                                                   
                                             
                                                   
                                                                    
                                                                                     
                                                                     
                                                                                                                 
                                            

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { recycleObjects, ownDiscard } from '../../src/keywords/insight'
import { boundedPickOptions, decodePick } from './multi-pick'
import { pumpEvent } from './activated-batch'

                                              
function makeViActivated(defId: string): ActivatedSpec {
  return {
    key: `${defId}:recyclePump`,
    label: '从废牌堆回收一张卡牌:让我本回合内战力+1',
    cost: {}, // 「可重复执行」⇒ 没有资源费、也不横置自己
    extraCost: {
      label: '从你的废牌堆回收一张卡牌',
                                        
      options: (state: GameState, controller: PlayerId) =>
        ownDiscard(state, controller).map((o) => ({ id: o as string, label: state.objects[o]?.defId ?? (o as string) })),
                                                         
      pay: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): GameState | null => {
        if (choice === undefined) return null
        if (!ownDiscard(state, controller).includes(choice as ObjId)) return null
        return recycleObjects(state, [choice as ObjId])
      },
                                                     
      payEvents: (_s: GameState, controller: PlayerId): readonly GameEvent[] =>
        [{ kind: 'recycled', player: controller, count: 1 } as GameEvent],
    },
    makeResolve: ({ selfOid }: { selfOid: string; controller: PlayerId }) => (): readonly GameEvent[] =>
      [pumpEvent(defId, selfOid, 1)],
  }
}

export const VEN_167_CARD_EFFECT = '从废牌堆回收一张卡牌：让我在本回合内{{S}}+1（可重复执行）。'
                                                                                                 
export const ARC_001_CARD_EFFECT = '{{游走}} （我可以向其他战场进行移动。）\n从废牌堆回收一张卡牌，给予我本回合内{{S}}+1。'

export const VEN_167_ACTIVATED = makeViActivated('VEN-167')
export const ARC_001_ACTIVATED = makeViActivated('ARC-001')

export const VEN_167: Card = {
  id: 'VEN-167', cardNo: 'VEN·167', name: '蔚', category: 'unit',
  domains: ['red'], energy: 2, power: 3, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '回收一张废牌:我本回合+1(VEN_167_ACTIVATED)' }],
}
export const ARC_001: Card = {
  id: 'ARC-001', cardNo: 'ARC-001/006', name: '蔚', category: 'unit',
  domains: ['red'], energy: 2, power: 3, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '回收一张废牌:我本回合+1(ARC_001_ACTIVATED)' }],
}

             
export const RECYCLE_COST_DEFIDS: readonly string[] = ['VEN-167', 'ARC-001', 'OGN-099']

                                         
                                      
                                                           
                                                          
                                                           
                                                               

export const OGN_099_RECYCLE_COUNT = 3

export const OGN_099_ACTIVATED: ActivatedSpec = {
  key: 'OGN-099:scavenge',
  label: '从废牌堆回收三张牌,支付 1 法力并{{横置}}:抽一张牌',
  cost: { mana: 1 },
  tapSelf: true,
  extraCost: {
    label: '从你的废牌堆回收三张牌',
    options: (state: GameState, controller: PlayerId) =>
      boundedPickOptions(
        ownDiscard(state, controller).map(String),
        OGN_099_RECYCLE_COUNT,
        (ids) => ids.map((o) => state.objects[o as ObjId]?.defId ?? o).join('、'),
      ),
    pay: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): GameState | null => {
      const picks = decodePick(choice, OGN_099_RECYCLE_COUNT)
      if (picks === null) return null
      const mine = ownDiscard(state, controller).map(String)
      if (!picks.every((p) => mine.includes(p))) return null                     
      return recycleObjects(state, picks as ObjId[])
    },
                                                        
    payEvents: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): readonly GameEvent[] => {
      const picks = decodePick(choice, OGN_099_RECYCLE_COUNT)
      if (picks === null) return []
      const mine = ownDiscard(state, controller).map(String)
      if (!picks.every((p) => mine.includes(p))) return []
      return [{ kind: 'recycled', player: controller, count: picks.length } as GameEvent]
    },
  },
  makeResolve: ({ controller }: { selfOid: string; controller: PlayerId }) => (): readonly GameEvent[] =>
    [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
}

export const OGN_099: Card = {
  id: 'OGN-099', cardNo: 'OGN·099/298', name: '拾荒小能手', category: 'equipment',
  domains: ['blue'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '回收三张废牌+{1}+横置:抽一张(OGN_099_ACTIVATED)' }],
}
