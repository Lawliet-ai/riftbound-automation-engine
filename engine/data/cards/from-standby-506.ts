                                                               
                                     
                                            
                                      
                               
                                           
                           
  
                                                       
                                                  
                                                 
                                                     
                                             
                                                      
                                                       
                                                
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { GOLD_TOKEN } from './gear-triggers'               
import { makeFromStandbyTriggers } from './from-standby-triggers'
import { enemyFieldedUnitsOf } from './UNL-133'                     

                                                                          
export const SFD_121_CARD_EFFECT =
  '当你将一张牌从正面朝下的状态打出时，打出一个休眠的“金币”装备指示物。'

                                                      
export function goldForPlayer(player: PlayerId): GameEvent {
  return {
    kind: 'spawnToken', spec: GOLD_TOKEN,
    zone: `base:${player}` as ZoneId, owner: player, dormant: true,
  } 
}

export function makeBlackMarketTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return makeFromStandbyTriggers({
    defId: 'SFD-121',
    effect: (_state, _self, ctrl) => [goldForPlayer(ctrl)],
  }, selfOid, controller)
}

export const SFD_121: Card = {
  id: 'SFD-121', cardNo: 'SFD·121/221', name: '黑市掮客', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你从正面朝下打出一张牌时,打出一个休眠金币(makeBlackMarketTriggers 两条)' }],
}

                                                                          
export const UNL_023_CARD_EFFECT =
  '当你正面朝下放置一张卡牌时，让我变为活跃状态。\n' +
  '当你将一张卡牌从正面朝下的状态打出时，对一名敌方单位造成2点伤害。'

                         
export const UNL_023_DAMAGE = 2
export const UNL_023_PICK = 'katarinaHit'

                                                                 
export function makeKatarinaReadyTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-023-ready:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-023',
    event: 'standbyPlaced',
    by: 'you', // 「当**你**正面朝下放置」
                                                     
                                        
    effect: (): readonly GameEvent[] => [
                                                                      
                                                                                   
                                                        
      { kind: 'statusChange', target: selfOid, key: 'dormant', value: false } ,
    ],
  }, selfOid, controller)
}

                                                 
export function makeKatarinaHitTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return makeFromStandbyTriggers({
    defId: 'UNL-023',
    nextChoice: (state, _self, ctrl, chosen): ChoiceRequest | null => {
      if (chosen[UNL_023_PICK] !== undefined) return null            
      const cands = enemyFieldedUnitsOf(state, ctrl)
      if (cands.length === 0) return null                             
      return {
        itemId: `trig:UNL-023:${selfOid}`,
        controller: ctrl,
        key: UNL_023_PICK,
        prompt: '卡特琳娜:对一名敌方单位造成 2 点伤害',
        isTarget: true, // ★1782 对一名敌方单位造成2点伤害
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, self, ctrl, chosen): readonly GameEvent[] => {
      const pick = chosen[UNL_023_PICK]
                                       
      if (pick === undefined || !enemyFieldedUnitsOf(state, ctrl).includes(pick)) return []
      return [{
        kind: 'damage', target: pick as ObjId, amount: UNL_023_DAMAGE,
                                                             
        source: self, sourcePlayer: ctrl,
      } ]
    },
  }, selfOid, controller)
}

                              
export function makeKatarinaTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeKatarinaReadyTrigger(selfOid, controller), ...makeKatarinaHitTriggers(selfOid, controller)]
}

export const UNL_023: Card = {
  id: 'UNL-023', cardNo: 'UNL-023/219', name: '卡特琳娜 - 暗里藏刀', category: 'unit',
  domains: ['red'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你正面朝下放置时我变活跃;你从正面朝下打出时对一名敌方单位 2 点伤害(makeKatarinaTriggers 三条)' }],
}

export const FROM_STANDBY_CARDS_506: readonly Card[] = [SFD_121, UNL_023]
