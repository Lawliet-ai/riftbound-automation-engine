                                                                
                
                                     
                
                                   
                                 
  
                             
                                                               
                                                   
                                                               
                                                                 
                                                                 
                                 
  
                              
                                                         
                                                
                             
  
                                                         
                                                          
                                                         
                                                                
                                                            

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { effectiveMight } from '../../src/state/might'

export const SFD_082_CARD_EFFECT =
  '当我进攻或防守时，对此处的一名敌方单位造成等同于我战力的伤害。\n'
  + '我无法造成战斗伤害。\n'
  + '支付{{蓝色}}：{{迅捷}} — 将我移动到你的基地。'

   
                                               
  
                                                                 
               
                                           
                                                   
                             
   
export function makeEzreal082Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return (['attack', 'defend'] as const).map((event) => compileTrigger({
    id: `SFD-082:${event}:${selfOid}`, rawId: true, sourceDefId: 'SFD-082',
    abilityKey: `SFD-082:bolt:${selfOid}`, // ⑧ 一卡多时机共用一个 abilityKey
    event, by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻或防守时」
    choose: {
      key: 'foe', prompt: '伊泽瑞尔:对此处的一名敌方单位造成等同于我战力的伤害',
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent', isTarget: true },
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['foe']
      if (t === undefined || !state.objects[t as ObjId]) return []
      const me = state.objects[selfOid]
      if (!me) return []                                 
                                                                  
                                                          
                                                         
        return [{ kind: 'damage', target: t as ObjId, amount: effectiveMight(me).actual, source: selfOid, sourcePlayer: controller } as GameEvent]
    },
  }, selfOid, controller))
}

   
                                    
  
                                                                       
                                                      
                                                                           
                                             
                                         
   
export const SFD_082_SPEC: ActivatedSpec = {
  key: 'SFD-082:blink',
  label: '{{迅捷}} 支付 1 点灵光符能:将我移动到你的基地',
  cost: { pips: [['blue']] },
  keywords: ['迅捷'], // §806.1.c.2 时机权限轴 —— **不是**印刷关键词
  makeResolve: ({ selfOid, controller }) => (state: GameState): readonly GameEvent[] => {
    const me = state.objects[selfOid as ObjId]
    if (!me) return []
    const to = `base:${controller}`
    if ((me.zone as string) === to) return []                  
    return [
      { kind: 'zoneChange', obj: me.oid, to: to as ZoneId },
      { kind: 'unitMoved', unit: me.oid, player: me.controller, from: me.zone, to: to as ZoneId }, // §446.1
    ] as readonly GameEvent[]
  },
}

                                                        
const ezreal = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '伊泽瑞尔', category: 'unit',
  domains: ['blue'], energy: 4, power: 3,
  keywords: [], // ⚠️ 印刷关键词【为空】——[迅捷] 是句③那条技能的时机权限,不是卡面关键词
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻/防守时对此处一名敌方单位打等同我战力的伤害;无法造成战斗伤害;付蓝移回基地(SFD_082_SPEC)' }],
})
export const SFD_082: Card = ezreal('SFD-082', 'SFD·082/221')
export const SFD_082A: Card = ezreal('SFD-082a', 'SFD·082a/221')
export const SFD_082B: Card = ezreal('SFD-082b', 'SFD·082b/221·P')

                                            
export const SFD_082_DEFIDS: readonly string[] = ['SFD-082', 'SFD-082a', 'SFD-082b']
