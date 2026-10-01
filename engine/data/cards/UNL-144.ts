                                                                     
                                         
              
                                                      
  
                                  
                                                         
                                                                            
                                                                                     
                                                               
  
                   
                                                                       
                                                                    
                                                                            
                                                            
                                                                           
                                        
                                                         
                                               
                                                      
                                                              
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { unitsAtBattlefield } from './battlefields-extra'
import { referencedMight, totalReferencedMight } from './might-common'
import { enemyControlledBattlefields } from '../../src/state/battlefieldControl'

export const UNL_144_CARD_EFFECT =
  '我无法变为活跃状态。\n'
  + '支付{{紫色}}：如果我的战力大于一处敌方控制的战场上所有敌方单位的战力总和，则将我移动到该处。'

                            
export const UNL_144_PICK = 'maduriZone'

   
                                                 
                                               
   
export function maduriEnemyMight(state: GameState, controller: PlayerId, zoneId: string): number {
  const foes = unitsAtBattlefield(state, zoneId)
    .filter((oid) => state.objects[oid]?.controller !== controller)
    .map((oid) => oid as string)
  return totalReferencedMight(state, foes)
}

   
                                           
                                           
   
export function maduriDestinations(state: GameState, controller: PlayerId, selfOid: string): readonly string[] {
  const mine = referencedMight(state, selfOid)
  const here = state.objects[selfOid as ObjId]?.zone as string | undefined
  return enemyControlledBattlefields(state, controller)
    .filter((z) => z !== here)                      
    .filter((z) => mine > maduriEnemyMight(state, controller, z))
    .sort()
}

export const UNL_144_MOVE_SPEC: ActivatedSpec = {
  key: 'UNL-144:move',
  label: '支付 1 点混沌符能:移动到一处我战力压得住的敌方战场',
  cost: { mana: 0, pips: [['purple']] }, // 纯 pip、没有法力数(㊶)
  target: 'none',
                                                      
                                                                        
                                                          
                                                                      
  choiceTiming: 'confirm',
  makeNextChoice:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (chosen[UNL_144_PICK] !== undefined) return null
      const zones = maduriDestinations(state, controller, selfOid)
      if (zones.length === 0) return null                         
      return {
        itemId: `act:${selfOid}:UNL-144`,
        controller,
        key: UNL_144_PICK,
        prompt: '守门者马杜里:移动到哪一处(我的战力要大于该处敌方单位的战力总和)',
        candidates: zones.map((z) => ({ id: z, label: `${z}(敌方总战力 ${maduriEnemyMight(state, controller, z)})` })),
      }
    },
  makeResolve:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const to = chosen?.[UNL_144_PICK]
                                 
      if (to === undefined || !maduriDestinations(state, controller, selfOid).includes(to)) return []
                                                           
                                                                                     
                                                                          
      const me = state.objects[selfOid as ObjId]
      if (me === undefined) return []                                                              
      return [
        { kind: 'zoneChange', obj: selfOid as ObjId, to: to as never } ,
        { kind: 'unitMoved', unit: selfOid as ObjId, player: controller, from: me.zone, to: to as ZoneId } ,
      ]
    },
}

export const UNL_144: Card = {
  id: 'UNL-144', cardNo: 'UNL-144/219', name: '守门者马杜里', category: 'unit',
  domains: ['purple'], energy: 7, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '我无法变为活跃状态(GROUP_PASSIVES 的 NO_READY)' },
    { kind: 'passive', describe: '付[紫]:战力大于某处敌方总和则移动过去(UNL_144_MOVE_SPEC)' },
  ],
}
