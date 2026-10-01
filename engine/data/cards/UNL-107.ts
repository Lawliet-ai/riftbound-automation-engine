                                                                         
                                         
                                                    
  
                   
                                                                                 
                                                    
                                                                 
                                                                                   
  
                    
                                           
                                              
                                                                     
                                                             
                                           
                               
                                                                   
                                                             
                                                                 
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { fieldedUnits } from './activated-batch'
import { unitsAtBattlefield } from './battlefields-extra'
import { referencedMight } from './might-common'


export const UNL_107_CARD_EFFECT =
  '选择一名友方单位和一处战场。将该战场上所有战力低于所选单位的敌方单位移动到其基地。获得1经验。'

                         
export const UNL_107_UNIT = 'standoffUnit'
export const UNL_107_ZONE = 'standoffZone'
                          
export const UNL_107_EXP = 1

                                            
export function standoffUnits(state: GameState, controller: PlayerId): readonly string[] {
  return fieldedUnits(state, { of: controller, friendly: true }) as unknown as string[]
}
                                      
export function standoffZones(state: GameState): readonly string[] {
  return zonesByKind(state, 'battlefield').map((z) => z.id as string)
}
   
                                 
                                                      
   
export function standoffVictims(
  state: GameState, controller: PlayerId, unitOid: string, zoneId: string,
): readonly string[] {
  const bar = referencedMight(state, unitOid)
  return unitsAtBattlefield(state, zoneId)
    .filter((oid) => state.objects[oid]?.controller !== controller)
    .filter((oid) => referencedMight(state, oid as string) < bar)
    .map((oid) => oid as string)
    .sort()
}

export const UNL_107_SPEC: PlaySpec = {
  defId: 'UNL-107', cardNo: 'UNL-107/219', name: '对峙', kind: 'spell',
  cost: { mana: 2 }, // 卡面 2 法力、0 pip(㊶ 一枚都不写)
  keywords: [],
  target: 'none', // 两问都走问链(`PlayTargetKind` 表达不了"单位 + 战场"这一对)
  legalTargets: (): string[] => [],
                                                                    
                                                                
                                                                             
                                                                       
  choiceTiming: 'confirm',
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      const item = `spell:${movedCardOid}:UNL-107`
      if (chosen[UNL_107_UNIT] === undefined) {
        const cands = standoffUnits(state, controller)
        if (cands.length === 0) return null                           
        return {
          itemId: item, controller, key: UNL_107_UNIT,
          prompt: '对峙:选择一名友方单位(拿它的战力当门槛)',
          isTarget: true, // ★1782 选择一名友方单位
          candidates: cands.map((oid) => ({
            id: oid,
            label: `${state.objects[oid as ObjId]?.defId ?? oid}(战力 ${referencedMight(state, oid)})`,
          })),
        }
      }
      if (chosen[UNL_107_ZONE] === undefined) {
        const zones = standoffZones(state)
        if (zones.length === 0) return null
        return {
          itemId: item, controller, key: UNL_107_ZONE,
          prompt: '对峙:选择一处战场(把那里战力更低的敌方单位赶回基地)',
          isTarget: true, // ★1782 选择…一处战场。将该战场上**所有**…敌方单位移动到其基地
          candidates: zones.map((z) => ({ id: z, label: z })),
        }
      }
      return null          
    },
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const unit = chosen?.[UNL_107_UNIT]
      const zone = chosen?.[UNL_107_ZONE]
      const out: GameEvent[] = []
                                               
      if (unit !== undefined && zone !== undefined && standoffUnits(state, controller).includes(unit)) {
        for (const oid of standoffVictims(state, controller, unit, zone)) {
          out.push({ kind: 'recall', target: oid as ObjId } as GameEvent)               
        }
      }
                                                
      out.push({ kind: 'gainResource', player: controller, experience: UNL_107_EXP } as GameEvent)
      return out
    },
}

export const UNL_107: Card = {
  id: 'UNL-107', cardNo: 'UNL-107/219', name: '对峙', category: 'spell',
  domains: ['orange'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名友方单位+一处战场:该处战力更低的敌方单位召回基地;获得1经验(UNL_107_SPEC)' }],
}
