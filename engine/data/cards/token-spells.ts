                                                             
                                                    
                                        
  
               
                                                             
                                                           
                                                                 
                                                        
                                             
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { TokenSpec } from '../../src/state/mutations'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar } from './spawn-token-haste'                                                                                        
import { hasteKeyOf } from './haste-key'                                                       

                                               
export function tokenDropZones(state: GameState, controller: PlayerId): readonly string[] {
  return [`base:${controller}`, ...controlledBattlefields(state, controller)]
}

                                       
export const SAND_SOLDIER_TOKEN: TokenSpec = { defId: 'token:黄沙士兵', baseMight: 2, baseTypes: ['unit'], baseKeywords: [], baseTags: ['恕瑞玛'] }
                     
export const ROBOT_TOKEN: TokenSpec = { defId: 'token:机器人', baseMight: 3, baseTypes: ['unit'], baseKeywords: [], baseTags: ['机械'] }

   
                                                                                                          
                                                                                                                     
                                                                                                  
   
const dropTokenHasteChoice = (spec: TokenSpec, haste: { readonly keyBase: string; readonly label: string }) =>
  ({ movedCardOid, controller, target, echoTimes }: { movedCardOid: string; controller: PlayerId; target?: string; echoTimes?: number }) =>
  (state: GameState, chosen: Readonly<Record<string, string>>) => {
    if (target === undefined) return null
    const keys: string[] = []
    for (let i = 1; i <= (echoTimes ?? 0) + 1; i++) {
      const key = hasteKeyOf(haste.keyBase, i)
      const q = spawnTokenHasteChoice(state, controller, spec, { itemId: `play:${movedCardOid}`, key, label: haste.label }, chosen, hastePaidSoFar(chosen, keys))
      if (q !== null) return q
      keys.push(key)
    }
    return null
  }
   
                                                                                                        
                                                                                                                              
                                                                                                 
                                                                                
   
const dropToken = (spec: TokenSpec, haste?: { readonly keyBase: string; readonly label: string }) =>
  ({ target, controller, echoIndex }: { controller: PlayerId; target?: string; echoIndex?: number }) =>
  (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    if (target === undefined) return []
    const x = haste === undefined ? { ready: false, pre: [] as readonly GameEvent[] } : spawnTokenHasteResolve(state, controller, spec, hasteKeyOf(haste.keyBase, (echoIndex ?? 0) + 1), chosen)                                                      
    return [...x.pre, { kind: 'spawnToken', spec, zone: target as never, owner: controller, ...(x.ready ? { ready: true } : {}) }]
  }

                                                                 
                                      
                             
                                                                  
                                   
                                                                                                
                                                                                            
export const SFD_031_CARD_EFFECT = '打出一名2{{S}}的“黄沙士兵”。'
                                                                                   
export const SFD_031_HASTE_BASE = 'SFD-031:sand'
export const sfd031HasteKey = (i: number): string => hasteKeyOf(SFD_031_HASTE_BASE, i)
const SFD_031_HASTE = { keyBase: SFD_031_HASTE_BASE, label: '黄沙士兵' } as const
export const SFD_031_SPEC: PlaySpec = {
  defId: 'SFD-031', cardNo: 'SFD·031/221', name: '点沙成兵', kind: 'spell',
  cost: { mana: 2 }, // 卡面核:2法力+0pip
  echo: { mana: 2 }, // §820 回响{2}
  keywords: [],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): readonly string[] => tokenDropZones(state, controller),
  makeNextChoice: dropTokenHasteChoice(SAND_SOLDIER_TOKEN, SFD_031_HASTE), // ★1401 缺陷 176 残余:逐份问「付不付 [1][A] 让黄沙士兵活跃进场」
  makeResolve: dropToken(SAND_SOLDIER_TOKEN, SFD_031_HASTE),
}
export const SFD_031: Card = {
  id: 'SFD-031', cardNo: 'SFD·031/221', name: '点沙成兵', category: 'spell',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '回响2;打出一名2[M]黄沙士兵(SFD_031_SPEC)' }],
}

                                                                
                                    
                                                                         
                                            
export const VEN_051_CARD_EFFECT = '打出一名3{{S}}的“机器人”。'
export const VEN_051_HASTE_KEY = hasteKeyOf('VEN-051:robot')                  
const VEN_051_HASTE = { keyBase: 'VEN-051:robot', label: '机器人' } as const                                                     
export const VEN_051_SPEC: PlaySpec = {
  defId: 'VEN-051', cardNo: 'VEN·051', name: '迭代式设计', kind: 'spell',
  cost: { mana: 4 }, // 卡面核:4法力+0pip
  keywords: ['流转2蓝色'],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): readonly string[] => tokenDropZones(state, controller),
  makeNextChoice: dropTokenHasteChoice(ROBOT_TOKEN, VEN_051_HASTE), // ★1393 缺陷 176 B4:雷克塞在基地 ⇒ 问「付不付 [1][A] 让机器人活跃进场」
  makeResolve: dropToken(ROBOT_TOKEN, VEN_051_HASTE),
}
export const VEN_051: Card = {
  id: 'VEN-051', cardNo: 'VEN·051', name: '迭代式设计', category: 'spell',
  domains: ['blue'], energy: 4, keywords: ['流转2蓝色'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出一名3[M]机器人;流转2蓝色(VEN_051_SPEC)' }],
}
