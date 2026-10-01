                                                                     
                                                         
                                    
                                        
  
                                                                
                    
                                                               
                                                              
                                                            
                                                                           
                                    
                                                                       
                                                            
                                                                 
                                                                       
                            
                                                                              
                                          
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { zonesByKind } from '../../src/state/gameState'
import { banishedBy } from '../../src/actions/banish'
import { fieldedUnits } from './activated-batch'
import { playBannedFor } from './longtail-12'                           

export const UNL_184_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '放逐一名友方单位，然后让其拥有者将其打出到任意一处战场，无视其费用。'

                                   
export const UNL_184_ALLY = 'huntAlly'
export const UNL_184_DEST = 'huntDest'

                                                                 
export function huntAllies(state: GameState, controller: PlayerId): readonly ObjId[] {
  return fieldedUnits(state, { of: controller, friendly: true })
}

   
                                                
                                                          
   
export function huntDestinations(state: GameState): readonly ZoneId[] {
  return zonesByKind(state, 'battlefield').map((z) => z.id)
}

export const UNL_184_SPEC: PlaySpec = {
  defId: 'UNL-184', cardNo: 'UNL-184/219', name: '狩猎律动',
  kind: 'spell',
                                                         
  cost: { mana: 2, pips: [['red', 'orange']] },
  keywords: ['反应'], // §813/§309.1.a 闭环反应窗口也能打
                                                                 
                                                       
                                                                  
  choiceTiming: 'confirm',
  target: 'none',
  legalTargets: (): string[] => [],
                               
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[UNL_184_ALLY] === undefined) {
        const cands = huntAllies(state, controller)
                                                    
        if (cands.length === 0) return null
        return {
          itemId: `spell:${movedCardOid}:UNL-184`,
          controller,
          key: UNL_184_ALLY,
          prompt: '狩猎律动:放逐哪名友方单位(其拥有者随后把它打到一处战场)',
          isTarget: true, // ★1782 放逐一名友方单位
          candidates: cands.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
        }
      }
                                                               
                                                                    
                                                              
                                               
      return null
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const ally = chosen?.[UNL_184_ALLY]
      if (ally === undefined || !huntAllies(state, controller).includes(ally as ObjId)) return []
                                                                
      return [{ kind: 'banish', target: ally as ObjId, by: movedCardOid as ObjId } as GameEvent]
    },
}

   
                                              
                                                          
                                      
                                                                          
   
export function makeHuntPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-184:play:${selfOid}`, rawId: true, sourceDefId: 'UNL-184',
    event: 'banished', by: 'any', // 认的是"我放逐的",不是"我引发的这批"(铁律153)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        const card = (ev as unknown as { card?: ObjId }).card
        return card !== undefined && banishedBy(state, selfOid).includes(card)
      },
    }],
    nextChoice: (state: GameState, ev, chosen) => {
      if (chosen[UNL_184_DEST] !== undefined) return null
                                                            
                                                  
                                                                                
                                                                            
                                                     
                                                                                   
      const card = (ev as unknown as { card?: ObjId }).card
      const unit = card === undefined ? undefined : state.objects[card]
      const zones = huntDestinations(state).filter((z) =>
        unit === undefined || !playBannedFor(state, unit.owner, unit.defId, z as string))
      if (zones.length === 0) return null                          
      return {
        itemId: `trig:UNL-184:play:${selfOid}`,
                                                                                         
                                                                             
                                                  
        controller: unit?.owner ?? controller,
        key: UNL_184_DEST,
        prompt: '狩猎律动:把它打到哪一处战场(任意一处都行)',
        candidates: zones.map((z) => ({ id: z as string, label: z as string })),
      }
    },
    effect: (state: GameState, ev: GameEvent, chosen): readonly GameEvent[] => {
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o) return []
      const dest = chosen?.[UNL_184_DEST]
                                                    
      const ok = dest !== undefined && huntDestinations(state).includes(dest as ZoneId)
        && !playBannedFor(state, o.owner, o.defId, dest as string)                 
                                                             
                                                                        
                                                             
                                                                 
                                               
      if (!ok) return []
                                         
      return [{ kind: 'playFree', obj: card as ObjId, player: o.owner, to: dest as ZoneId } as GameEvent]
    },
  }, selfOid, controller)
}

export const UNL_184: Card = {
  id: 'UNL-184', cardNo: 'UNL-184/219', name: '狩猎律动', category: 'spell',
  domains: ['red', 'orange'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '放逐一名友方单位,其拥有者无视费用把它打到任意一处战场' }],
}
