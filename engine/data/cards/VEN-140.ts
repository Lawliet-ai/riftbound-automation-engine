                                                               
                                                               
                            
                                    
                                                      
  
                                                      
                                                                                   
                                                                    
                                               
                                                                                      
                                                            
                             
                                                                
                                                                                     
                                                                  
                                                             
                                                         
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { fieldedUnits } from './activated-batch'
import { askMoveDestination, moveUnitEvents } from './enemy-move'

export const VEN_140_CARD_EFFECT =
  '对战场上最多一名敌方单位造成2点伤害，然后移动一名友方单位。\n'
  + '{{流转3A}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

                           
export const VEN_140_HIT_KEY = 'falconHit'
export const VEN_140_MOVE_KEY = 'falconMove'
export const VEN_140_DEST_KEY = 'falconDest'
                                                    
export const VEN_140_SKIP = 'skip'
export const VEN_140_DAMAGE = 2

                                                             
export function falconVictims(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      if (!isUnit(o)) return false                                                                
      if (o.controller === controller) return false
      return state.zones[o.zone]?.kind === 'battlefield'
    })
    .map((o) => o.oid as string)
    .sort()
}

export const VEN_140_SPEC: PlaySpec = {
  defId: 'VEN-140', cardNo: 'VEN·140', name: '我流奥义！隼舞', kind: 'spell',
                                                                        
  cost: { mana: 1, pips: [['red', 'green']] },
  keywords: ['流转3A'],
  target: 'none', // 「最多一名」必须能不选 ⇒ 伤害目标走问链 skip 档(destroy 族同判)
  legalTargets: (): string[] => [],
                                                                            
                                                           
                                              
                                                                                 
  choiceTiming: 'confirm',
                                                                     
                                                                        
                                                         
                                                        
                                                           
  makeNextChoice: ({ movedCardOid, controller }) => (state, chosen) => {
                                                        
    if (chosen[VEN_140_HIT_KEY] === undefined) {
      const vs = falconVictims(state, controller)
      if (vs.length > 0) {
        return {
          itemId: `play:${movedCardOid}`,
          controller,
          key: VEN_140_HIT_KEY,
          prompt: `隼舞:对战场上哪名敌方单位造成${VEN_140_DAMAGE}点伤害?(可不选)`,
          isTarget: true, // ★1782 对战场上最多一名敌方单位造成2点伤害
          candidates: [
            ...vs.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
            { id: VEN_140_SKIP, label: '不造成伤害(「最多一名」)' },
          ],
        }
      }
    }
                                                     
                                                                                   
                                                            
    if (chosen[VEN_140_MOVE_KEY] === undefined) {
      const mine = fieldedUnits(state, { of: controller, friendly: true }) as string[]
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: VEN_140_MOVE_KEY,
        prompt: '隼舞:移动哪名友方单位?',
        isTarget: true, // ★1782 移动一名友方单位
        candidates: mine.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
      }
    }
                                                                 
    return askMoveDestination({
      state, chosen, key: VEN_140_DEST_KEY, itemId: `play:${movedCardOid}`, controller,
      target: chosen[VEN_140_MOVE_KEY],
      prompt: '隼舞:把这名友方单位移动到哪里?',
      mandatory: true,
    })
  },
  makeResolve: ({ movedCardOid, controller }) => (state, chosen): readonly GameEvent[] => {
    const c = chosen ?? {}
    const out: GameEvent[] = []
                                                
                                                                       
                                                             
    const hit = c[VEN_140_HIT_KEY]
    if (hit !== undefined && hit !== VEN_140_SKIP && falconVictims(state, controller).includes(hit)) {
      out.push({
        kind: 'damage', target: hit as ObjId, amount: VEN_140_DAMAGE,
        source: movedCardOid as ObjId, sourcePlayer: controller,
      } as GameEvent)
    }
                                           
                                               
    const mover = c[VEN_140_MOVE_KEY]
    if (mover !== undefined && (fieldedUnits(state, { of: controller, friendly: true }) as string[]).includes(mover)) {
      out.push(...moveUnitEvents(state, mover, c[VEN_140_DEST_KEY]))
    }
    return out
  },
}

export const VEN_140: Card = {
  id: 'VEN-140', cardNo: 'VEN·140', name: '我流奥义！隼舞', category: 'spell',
  domains: ['red', 'green'], energy: 1, keywords: ['流转3A'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '最多一名战场敌方单位吃2点,然后移动一名友方单位(VEN_140_SPEC);[流转3A]走§829' }],
}
