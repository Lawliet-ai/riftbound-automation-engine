                                                                  
                                                           
                             
                                                    
                                                                   
  
                                               
                                                                                   
                                                                 
                                                                
                                                                         
                                                                             
  
                                                              
                                                           
                                                                                 
  
                           
                                                                                       
                                                                       
                                         
  
                                      
                                                            
                                                       
                                 
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { zonesByKind } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'
import { enemyUnitsAt } from './damage-split'                     

export const OGN_260_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n让一名友方单位变为活跃状态，并对任意战场上的一名敌方单位造成等同于该友方单位战力的伤害。'

                           
export const OGN_260_FOE_KEY = 'gustFoe'

   
                   
                                                    
                                            
   
export function gustAllies(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => isUnit(o) && o.controller === controller
      && ((k) => k === 'battlefield' || k === 'base')(state.zones[o.zone]?.kind))
    .map((o) => o.oid as string)
    .sort()
}

   
                         
                                                          
   
export function gustFoes(state: GameState, controller: PlayerId): string[] {
  return zonesByKind(state, 'battlefield')
    .flatMap((z) => enemyUnitsAt(state, z.id as string, controller))
    .sort()
}

                                                  
export function gustAllyLive(state: GameState, controller: PlayerId, target: string | undefined): boolean {
  return target !== undefined && gustAllies(state, controller).includes(target)
}

export const OGN_260_SPEC: PlaySpec = {
  defId: 'OGN-260', cardNo: 'OGN·260/298', name: '狂风绝息斩', kind: 'spell',
                                                                                   
  cost: { mana: 3, pips: [['green'], ['purple']] },
  keywords: ['迅捷'], // §806 权限关键词:§308.1.a 法术对决也能打(时机门读的就是这一份)
                                                                         
                                                            
  choiceTiming: 'confirm',
                                                                   
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => gustAllies(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) => (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
    if (chosen[OGN_260_FOE_KEY] !== undefined) return null            
                                                  
    if (!gustAllyLive(state, controller, target)) return null
    const foes = gustFoes(state, controller)
    if (foes.length === 0) return null                          
    return {
      itemId: `play:${movedCardOid}`,
      controller,
      key: OGN_260_FOE_KEY,
      prompt: '狂风绝息斩:对任意战场上的哪一名敌方单位造成伤害?',
      isTarget: true, // ★1781 §355.7:「对任意战场上的一名敌方单位造成…伤害」
      candidates: foes.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
    }
  },
  makeResolve: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) => (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                      
    if (!gustAllyLive(state, controller, target)) return []
    const out: GameEvent[] = []
                                               
                                                  
    out.push({ kind: 'statusChange', target: target as ObjId, key: 'dormant', value: false } )
                                           
    const foe = (chosen ?? {})[OGN_260_FOE_KEY]
    if (foe === undefined || !gustFoes(state, controller).includes(foe)) return out                      
    const amount = effectiveMight(state.objects[target as ObjId]!).reference                    
    out.push({
      kind: 'damage', target: foe as ObjId, amount,
      source: movedCardOid as ObjId, sourcePlayer: controller,
    } )
    return out
  },
}

export const OGN_260: Card = {
  id: 'OGN-260', cardNo: 'OGN·260/298', name: '狂风绝息斩', category: 'spell',
  domains: ['green', 'purple'], energy: 3, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '让一名友方活跃,并用它的战力打任意战场上一名敌方(OGN_260_SPEC)' }],
}
