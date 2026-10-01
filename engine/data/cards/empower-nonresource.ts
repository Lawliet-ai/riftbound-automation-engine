                                                   
                                                  
  
                         
                                                                         
                                                                                   
                                                                             
                                                                         
                                                                           
                                                                             
  
                                                         
                                                 
                                            
  
                                              
                                    
                                                         
                                                      
                                                          
                                          
                                                                       

import type { Card, Domain } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import type { Cost } from '../../src/state/runePool'
import { empowerCount, empowerLimitOf } from '../../src/keywords/empower'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       
import { ROBOT_TOKEN } from './token-spells'                                      
                                          
export const HEX_DISC_HASTE_KEY = hasteKeyOf('VEN-087:robot')

   
                                                
                                             
   
const NOT_AT_EMPOWER_LIMIT = (state: GameState, _c: PlayerId, selfOid: string): boolean => {
  const o = state.objects[selfOid as ObjId]
  return o !== undefined && empowerCount(o) < empowerLimitOf(o)
}

   
                           
                                                                 
   
export function makeEmpowerSelfSpec(opts: {
  readonly key: string
  readonly label: string
  readonly cost?: Cost
  readonly tapSelf?: boolean
  readonly discard?: number
     
                                                     
                                                         
                                                                  
                                       
     
  readonly extraCost?: ActivatedSpec['extraCost']
}): ActivatedSpec {
  return {
    key: opts.key,
    label: opts.label,
    cost: opts.cost ?? {},
    ...(opts.tapSelf ? { tapSelf: true } : {}),
    ...(opts.discard ? { discard: opts.discard } : {}),
    ...(opts.extraCost ? { extraCost: opts.extraCost } : {}),
    available: NOT_AT_EMPOWER_LIMIT,
    target: 'none' as const,
    makeResolve: ({ selfOid }: { selfOid: string; controller: PlayerId }) =>
      (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid as ObjId }],
  }
}

                                                                           
export const PORO_EMPOWER_SPEC = makeEmpowerSelfSpec({
  key: 'VEN-007:empower', label: '强化—弃置一张手牌:强化我', discard: 1,
})

                                                  
export const TAP_EMPOWER_SPEC = makeEmpowerSelfSpec({
  key: 'empower:tap', label: '强化—{{横置}}:强化此牌', tapSelf: true,
})

                                         
export const EGG_EMPOWER_SPEC = makeEmpowerSelfSpec({
  key: 'VEN-075:empower', label: '强化—支付 1 法力并{{横置}}:强化此牌', cost: { mana: 1 }, tapSelf: true,
})

   
                                       
                                   
                                       
  
                                  
                                                        
                                                        
                                    
                                                
   
export const SUSPICIOUS_TOME_DRAW_SPEC: ActivatedSpec = {
  key: 'VEN-054:draw',
  label: '解除此牌的强化,支付 1 法力并{{横置}}:抽一张牌',
  cost: { mana: 1 },
  tapSelf: true,
  unempowerSelf: true,
  target: 'none',
  makeResolve: ({ controller }) => (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 }],
}

   
                                        
                                                    
                                       
  
                                         
                                                
                                                      
                                               
                                                                     
                                                                 
   
                                                                                                    
                                                                                                                 
                                                                                            

export const HEX_DISC_ROBOT_SPEC: ActivatedSpec = {
  key: 'VEN-087:robot',
  label: '解除此牌的强化,支付 1 法力并{{横置}}:打出一名战力 3 的"机器人"到你的基地',
  cost: { mana: 1 },
  tapSelf: true,
  unempowerSelf: true,
  target: 'none',
                                                           
  makeNextChoice: ({ selfOid, controller }) => (state, chosen) =>
    spawnTokenHasteChoice(state, controller, ROBOT_TOKEN, { itemId: `act:${selfOid}:VEN-087:robot`, key: HEX_DISC_HASTE_KEY, label: '机器人' }, chosen),
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const x = spawnTokenHasteResolve(state, controller, ROBOT_TOKEN, HEX_DISC_HASTE_KEY, chosen)                                       
    return [...x.pre, { kind: 'spawnToken', spec: ROBOT_TOKEN as never, zone: `base:${controller}` as never, owner: controller, ...(x.ready ? { ready: true } : {}) }]
  },
}

   
                                     
                 
                                                             
                                          
  
                                          
                                              
                                           
                                                      
                              
                                                     
                                              
   
export const EGG_REACTION_SPEC: ActivatedSpec = {
  key: 'VEN-075:gain',
  label: '{{反应}} {{横置}}:获得 1 法力(此牌已强化则改为 2 法力)',
  keywords: ['反应'],
  cost: {},
  tapSelf: true,
                                            
                                                                 
                                                     
                                                                
  fastResolve: true,
  target: 'none',
  makeResolve: ({ selfOid, controller }) => (state): readonly GameEvent[] => [
    { kind: 'gainResource', player: controller, mana: isEmpoweredNow(state, selfOid) ? 2 : 1 },
  ],
}

                                   
function isEmpoweredNow(state: GameState, selfOid: string): boolean {
  const o = state.objects[selfOid as ObjId]
  return o !== undefined && empowerCount(o) > 0
}

                                                    
export const ENTER_DORMANT_DEFIDS: ReadonlySet<string> = new Set(['VEN-075'])


                                                              
                                                                    
                                                         
                                                        
                                            
                                                      
                                                   
                                                                   
const empowerGearCard = (
  id: string, cardNo: string, name: string, domain: Domain, energy: number, describe: string,
): Card => ({
  id, cardNo, name, category: 'equipment',
  domains: [domain], energy, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe }],
})
                                  
export const VEN_054: Card = empowerGearCard(
  'VEN-054', 'VEN·054', '可疑之书', 'blue', 3, '强化—横置 / 解除强化+{1}+横置:抽一张牌',
)
                                                                   
export const VEN_075: Card = empowerGearCard(
  'VEN-075', 'VEN·075', '剑头蛟的卵', 'orange', 3, '休眠进场;强化—付{1}+横置 / [反应]横置:获得{1},已强化改{2}',
)
                                  
export const VEN_087: Card = empowerGearCard(
  'VEN-087', 'VEN·087', '海克斯圆盘', 'orange', 4, '强化—横置 / 解除强化+{1}+横置:打出一名3[S]机器人到基地',
)
