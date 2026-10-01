                                                                   
                                                            
                                           
                             
                                         
                              
  
                                    
                                                   
                                                      
                                                         
  
                                                          
                                                      
                                                        
                                                          
                                                   
                                                    
                                               
                                                           
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import { zonesByKind } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { fieldedUnits, pumpEvent } from './activated-batch'
import { moveUnitEvents } from './enemy-move'

export const UNL_198_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '选择一处你拥有单位的战场。你可以选择将最多一名敌方单位移动至该战场，然后让该处的敌方单位本回合内{{S}}-2。'

                                        
export const UNL_198_MOVE_KEY = 'moonfallMove'
export const UNL_198_SKIP = 'skip'
export const UNL_198_DELTA = -2

                                               
export function moonfallBattlefields(state: GameState, controller: PlayerId): string[] {
  return zonesByKind(state, 'battlefield')
    .map((z) => z.id as string)
    .filter((zid) => Object.values(state.objects).some((o) =>
      o.zone === zid && o.controller === controller && isUnit(o)))                                                                      
    .sort()
}

                     
function enemiesAt(state: GameState, controller: PlayerId, zid: string): string[] {
  return Object.values(state.objects)
    .filter((o) => o.zone === zid && o.controller !== controller && isUnit(o))                                                                     
    .map((o) => o.oid as string)
    .sort()
}

export const UNL_198_SPEC: PlaySpec = {
  defId: 'UNL-198', cardNo: 'UNL-198/219', name: '月之降临', kind: 'spell',
                                                       
  cost: { mana: 3, pips: [['blue', 'purple']] },
  keywords: ['迅捷'],
                                                                    
                                                                             
                                                            
  choiceTiming: 'confirm',
  firstAskOptional: true, // ★1802c §355.13:第一问是「将**最多一名**敌方单位移动至该战场」⇒ 含 0
  target: 'custom', // 「选择一处你拥有单位的战场」(FAQ:单位那问才是"选作目标",但战场走 target 通道)
  legalTargets: (state: GameState, controller: PlayerId) => moonfallBattlefields(state, controller),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (target === undefined || chosen[UNL_198_MOVE_KEY] !== undefined) return null
                                                       
      const cands = fieldedUnits(state, { of: controller, friendly: false }) as string[]
      if (cands.length === 0) return null                      
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: UNL_198_MOVE_KEY,
        prompt: '月之降临:将哪名敌方单位移动至该战场?(「最多一名」可不移)',
        isTarget: true, // ★1782 将最多一名敌方单位移动至该战场
        candidates: [
          ...cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
          { id: UNL_198_SKIP, label: '不移动' },
        ],
      }
    },
  makeResolve:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      void movedCardOid
      if (target === undefined) return []
                                                           
      if (!moonfallBattlefields(state, controller).includes(target)) return []
      const pick = (chosen ?? {})[UNL_198_MOVE_KEY]
      const mover = pick !== undefined && pick !== UNL_198_SKIP
        && (fieldedUnits(state, { of: controller, friendly: false }) as string[]).includes(pick)
        ? pick : undefined
      const out: GameEvent[] = []
                                                          
      if (mover !== undefined) out.push(...moveUnitEvents(state, mover, target))
                                                              
                                                                  
      const victims = new Set(enemiesAt(state, controller, target))
      if (mover !== undefined) victims.add(mover)
      for (const who of [...victims].sort()) {
        out.push(pumpEvent(`UNL-198:pump`, who, UNL_198_DELTA))
      }
      return out
    },
}

export const UNL_198: Card = {
  id: 'UNL-198', cardNo: 'UNL-198/219', name: '月之降临', category: 'spell',
  domains: ['blue', 'purple'], energy: 3, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选你有单位的战场,可移最多一名敌方过去,该处敌方本回合 S-2(UNL_198_SPEC)' }],
}
