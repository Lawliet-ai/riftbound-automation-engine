                                                               
                                              
                                                         
                                         
                                                               
                                                    
                            
  
                                                                 
                                                      
                                                   
                                                 
                                              
                                                   
                                                            
                                                      
                           
                                                                       
                                                               
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'                                              
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { GOLD_TOKEN } from './gear-triggers'

export const UNL_018_CARD_EFFECT =
  '当我征服一处战场时，如果你给敌方单位分配了不低于{{3}}点的过量伤害，则打出两个休眠的"金币"装备指示物。'
export const SFD_120_CARD_EFFECT =
  '{{法盾2}}（对手必须支付{{A}}{{A}}才能将我选作法术或技能的目标。）\n'
  + '当我通过进攻征服一处战场时，如果你给敌方单位造成了不低于{{5}}点的过量伤害，则你可以选择对一名敌方单位造成等同于该过量伤害的伤害。'

                       
export const YETI_EXCESS_MIN = 3
export const SIVIR_EXCESS_MIN = 5
                               
export const YETI_GOLD_COUNT = 2

                                                         
export const excessOf = (state: GameState, player: PlayerId): number =>
  state.maxExcessDamageThisTurn?.[player as string] ?? 0

                                
export function makeYetiBruiserTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-018:conquer:${selfOid}`, rawId: true, sourceDefId: 'UNL-018',
    event: 'conquer', by: 'you',
    when: [
      { kind: 'selfAtEventBattlefield' }, // 「当【我】征服一处战场时」= 我在那处(单位版;hostAt 是武装专用 ★691 现场量)
      { kind: 'custom', test: (_ev, state): boolean => excessOf(state as GameState, controller) >= YETI_EXCESS_MIN },
    ],
    activeZone: ['battlefield'],
    effect: (): readonly GameEvent[] =>
      Array.from({ length: YETI_GOLD_COUNT }, () =>
        ({ kind: 'spawnToken', spec: GOLD_TOKEN as never, zone: `base:${controller}` as never, owner: controller, dormant: true } as GameEvent)),
  }, selfOid, controller)
}

   
                                                             
                                             
  
                                                                
                                                         
                                                   
                                                             
  
                                                                
                                                           
                                                 
                                                                
                                                                 
                                            
   
export const UNL_188_EXCESS_MIN = 3
export const UNL_188_CARD_EFFECT_BOX2 =
  '当我征服一处战场时，如果你给敌方单位分配了不低于{{3}}点的过量伤害，则抽一张牌。'
export function makeHextechGauntletConquerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-188:conquer:${selfOid}`, rawId: true, sourceDefId: 'UNL-188',
    event: 'conquer', by: 'you',
    activeZone: ['battlefield'], // 已贴附的武装位置随宿主(§434.4),宿主在战场它就在战场
    when: [
      { kind: 'hostAtEventBattlefield' }, // 「我」=穿戴者:未贴附不触发 + 宿主须在被征服那处
      { kind: 'custom', test: (_ev, state): boolean => excessOf(state as GameState, controller) >= UNL_188_EXCESS_MIN },
    ],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
  }, selfOid, controller)
}

                                               
export function makeSivirAmbitionTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-120:conquer:${selfOid}`, rawId: true, sourceDefId: 'SFD-120',
    event: 'conquer', by: 'you', // conquer 只从 attemptConquer 发 ⇒ 天然「通过进攻」(语义锚见文件头)
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'selfAtEventBattlefield' },
      { kind: 'custom', test: (_ev, state): boolean => excessOf(state as GameState, controller) >= SIVIR_EXCESS_MIN },
    ],
    activeZone: ['battlefield'],
                                                     
    nextChoice: (state, _ev, chosen) => {
      if (chosen['victim'] !== undefined) return null
      const cands = Object.values(state.objects)
        .filter((o) => o.controller !== controller
          && isUnit(o)                                                                                                      
          && ((k) => k === 'battlefield' || k === 'base')(state.zones[o.zone]?.kind))
        .map((o) => o.oid as string).sort()
      if (cands.length === 0) return null               
      return {
        itemId: `trig:SFD-120:${selfOid}`, controller, key: 'victim', isTarget: true,
        prompt: '远大野心:选一名敌方单位(受到等同于该过量伤害的伤害)',
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
                                                   
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const v = chosen?.['victim']
      if (v === undefined || state.objects[v as ObjId] === undefined) return []
      const amount = excessOf(state, controller)
      if (amount <= 0) return []
      return [{ kind: 'damage', target: v as ObjId, amount, source: selfOid, sourcePlayer: controller } as GameEvent]
    },
  }, selfOid, controller)
}

export const UNL_018: Card = {
  id: 'UNL-018', cardNo: 'UNL-018/219', name: '雪人斗士', category: 'unit',
  domains: ['red'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我征服+本回合单次过量≥3 ⇒ 打出两个休眠金币(makeYetiBruiserTrigger)' }],
}

export const SFD_120: Card = {
  id: 'SFD-120', cardNo: 'SFD·120/221', name: '希维尔', category: 'unit',
  domains: ['orange'], energy: 6, power: 7, keywords: ['法盾2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我进攻征服+单次过量≥5 ⇒ 可选对一名敌方单位造成等额伤害(makeSivirAmbitionTrigger)' }],
}
