                                                                   
                                        
                             
                      
  
                                            
                                                                   
                                                                           
                                                            
                                                              
                                                        
  
                                     
                                                    
                                          
                            
  
                                                  
                                                                   
                                                    
                                           
                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { destroyableEquipment } from './OGN-056'

export const OGN_179_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n每名玩家摧毁自己的一件装备。'

                               
export const OGN_179_PREFIX = 'wreck:'

   
                                         
                
   
export function wreckOrder(state: GameState): PlayerId[] {
  const ps = state.players
  const i = ps.indexOf(state.activePlayer)
  const from = i < 0 ? 0 : i
  return [...ps.slice(from), ...ps.slice(0, from)]
}

export const OGN_179_SPEC: PlaySpec = {
  defId: 'OGN-179', cardNo: 'OGN·179/298', name: '折戟再战', kind: 'spell',
  cost: { mana: 1 },
  keywords: ['迅捷'], // ★时机权限;印刷表侧另有一份登记
  target: 'none', // 谁摧毁什么由**各人自己**在结算期选
  legalTargets: (): string[] => [],
  makeNextChoice: ({ movedCardOid }) => (state, chosen) => {
    for (const p of wreckOrder(state)) {
      const key = `${OGN_179_PREFIX}${p}`
      if (chosen[key] !== undefined) continue          
      const mine = destroyableEquipment(state, p)
      if (mine.length === 0) continue                 
      return {
        itemId: `play:${movedCardOid}`,
        controller: p, // ★★由【他本人】来答,不是打出者
        key,
        prompt: '折戟再战:摧毁你自己的哪一件装备?',
        candidates: mine.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    }
    return null
  },
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const c = chosen ?? {}
    const out: GameEvent[] = []
    for (const p of wreckOrder(state)) {
      const pick = c[`${OGN_179_PREFIX}${p}`]
      if (pick === undefined) continue
                                         
      if (!destroyableEquipment(state, p).includes(pick as ObjId)) continue
      out.push({ kind: 'destroy', target: pick as ObjId, sourcePlayer: controller } as GameEvent)
    }
    return out
  },
}

export const OGN_179: Card = {
  id: 'OGN-179', cardNo: 'OGN·179/298', name: '折戟再战', category: 'spell',
  domains: ['purple'], energy: 1, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每名玩家各摧毁自己的一件装备(OGN_179_SPEC)' }],
}
