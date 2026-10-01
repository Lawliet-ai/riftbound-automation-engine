                                                                   
                                         
                           
                                       
  
                                              
                                                                    
                                                         
  
                                         
                                          
                                                                  
                                                 
                                                   
                                                                           
                                                              
                                        
                                                       
                                          
                                                                        
                                                                         
                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { fieldedUnits } from './activated-batch'
import { makeBanishReplayTrigger, OWNER_BASE } from './banish-replay'

export const OGN_102_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '放逐一名友方单位，然后让其拥有者将它打出到其所属的基地，无视费用。'

                                
export const OGN_102_KEYWORDS: readonly string[] = ['迅捷']
                            
export const OGN_102_TARGET = 'portalTarget'

   
                                               
                                               
   
export function portalTargets(state: GameState, controller: PlayerId): readonly ObjId[] {
  return fieldedUnits(state, { of: controller, friendly: true })
}

export const OGN_102_SPEC: PlaySpec = {
  defId: 'OGN-102', cardNo: 'OGN·102/298', name: '传送门大营救', kind: 'spell',
  cost: { mana: 3, pips: [['blue']] }, // 卡面 3 法力 + 一枚蓝 pip(㊶)
  keywords: [...OGN_102_KEYWORDS],
                                                                     
                                                                
  choiceTiming: 'confirm',
  target: 'none', // 唯一的选择走问链(`PlayTargetKind` 没有"友方单位"这一档)
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[OGN_102_TARGET] !== undefined) return null
      const cands = portalTargets(state, controller)
      if (cands.length === 0) return null                           
      return {
        itemId: `spell:${movedCardOid}:OGN-102`,
        controller,
        key: OGN_102_TARGET,
        prompt: '传送门大营救:放逐哪一名友方单位(其拥有者随后无视费用把它打回自己的基地)',
        isTarget: true, // ★1781 §355.7:「放逐一名友方单位」
        candidates: cands.map((oid) => ({
          id: oid as string,
          label: `${state.objects[oid]?.defId ?? oid}@${state.objects[oid]?.zone ?? '?'}`,
        })),
      }
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[OGN_102_TARGET]
                                 
      if (pick === undefined || !portalTargets(state, controller).includes(pick as ObjId)) return []
                                                                
      return [{ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent]
    },
}

   
                                                  
                                                                          
   
export function makePortalReplayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishReplayTrigger('OGN-102', selfOid, controller, OWNER_BASE)
}

export const OGN_102: Card = {
  id: 'OGN-102', cardNo: 'OGN·102/298', name: '传送门大营救', category: 'spell',
  domains: ['blue'], energy: 3, keywords: [...OGN_102_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '放逐一名友方单位,其拥有者无视费用把它打回所属基地(OGN_102_SPEC)' }],
}
