                                                                   
                                        
                                   
                                   
                                                                     
  
                                      
                                           
                                                               
                                                
                                                                    
                                                       
                         
                                                                              
                                                                           
                                                           
                                            
                                      
  
                                        
                                                 
                                             
                                                
                                        
                                           
                                              
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ObjId } from '../../src/state/ids'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import { moveUnitEvents } from './enemy-move'
import { isUnit } from '../../src/state/cardTypes'

export const OGN_270_CARD_EFFECT =
  '给予你基地中的一名友方单位增益， 然后将其移动到一处战场。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）'

                          
export const OGN_270_DEST_KEY = 'dest'

   
                                      
                                                       
   
export function baseAlliesOf(state: GameState, controller: string): string[] {
  const baseId = `base:${controller}`
  return Object.values(state.objects)
    .filter((o) => (o.zone as string) === baseId && isUnit(o) && (o.controller as string) === controller)
    .map((o) => o.oid as string)
    .sort()
}

   
                                                    
                                                        
                                              
   
export function ogN270BattlefieldDests(state: GameState, unitOid: string): string[] {
  const o = state.objects[unitOid as ObjId]
  return zonesByKind(state, 'battlefield')
    .map((z) => z.id as string)
    .filter((z) => o === undefined || z !== (o.zone as string))
}

export const OGN_270_SPEC: PlaySpec = {
  defId: 'OGN-270', cardNo: 'OGN·270/298', name: '叹为观止', kind: 'spell',
  cost: { mana: 1, pips: [['orange', 'yellow']] }, // 1费 + 1枚(橙或黄可付)
  keywords: [],
  target: 'custom', // §355 打出时锁定"给谁增益"
                                                                      
                                                                      
  choiceTiming: 'confirm',
  legalTargets: (state, controller): string[] => baseAlliesOf(state, controller as string),
                                         
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen) => {
    if (target === undefined || chosen[OGN_270_DEST_KEY] !== undefined) return null
    if (state.objects[target as ObjId] === undefined) return null
    const bfs = ogN270BattlefieldDests(state, target)
    if (bfs.length === 0) return null                       
    return {
      itemId: `play:${movedCardOid}`,
      controller,
      key: OGN_270_DEST_KEY,
      prompt: '叹为观止:把这名单位移动到哪一处战场?',
      candidates: bfs.map((z) => ({ id: z, label: z })),
    }
  },
  makeResolve: ({ target }) => (state, chosen): readonly GameEvent[] => {
    if (target === undefined) return []
    const o = state.objects[target as ObjId]
    if (o === undefined) return []
    const dest = (chosen ?? {})[OGN_270_DEST_KEY]
                                                              
                                
    const moveOk = dest !== undefined && ogN270BattlefieldDests(state, target).includes(dest)
    return [
                                 
      { kind: 'grantBuff', target: o.oid } as GameEvent,
                                                             
      ...(moveOk ? moveUnitEvents(state, target, dest) : []),
    ]
  },
}

export const OGN_270: Card = {
  id: 'OGN-270', cardNo: 'OGN·270/298', name: '叹为观止', category: 'spell',
                                                                              
  domains: ['orange', 'yellow'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '给基地里一名友方单位增益,然后移到一处战场(OGN_270_SPEC)' }],
}
