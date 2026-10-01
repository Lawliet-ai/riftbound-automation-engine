                                                                        
                                                                                               
                                                 
                                                                                   
                                                                                 
                                                                             
                                                                                           
                                                
                                                                
                                           
  
        
                                  
                                                      
                                                               
                                                                        
                                           
                                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { effectiveMight } from '../../src/state/might'

export const SFD_116_CARD_EFFECT =
  '{{百炼}}（当你打出我时，你可以选择为我{{装配}}你的一件武装，其装配费用减少{{A}}。可选择已贴附的武装。）\n' +
  '当我征服一处未受控制的战场时，对基地中的一名敌方单位造成等同于我战力的伤害。'
                                                                                                                          

export function makeYoneTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-116:conquer:${selfOid}`, rawId: true, sourceDefId: 'SFD-116',
    event: 'conquer', by: 'you',
    when: [
      { kind: 'selfAtEventBattlefield' }, // 「当【我】征服」= 我在被征服的那处
                                                          
                                                                                                           
      { kind: 'custom', test: (ev) => (ev as { wasUncontrolled?: boolean }).wasUncontrolled === true },
    ],
    choose: {
      key: 'foe', prompt: '永恩:对基地中的一名敌方单位造成等同于我战力的伤害',
      selector: { type: 'unit', controller: 'opponent', zone: 'base', isTarget: true },
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['foe']
      if (t === undefined || !state.objects[t as ObjId]) return []
      const me = state.objects[selfOid]
      if (!me) return []                                      
                                                                          
                        
                                                                             
                           
                                                                                
                       
                                                                                   
                                                                        
      return [{ kind: 'damage', target: t as ObjId, amount: effectiveMight(me).actual,
        source: selfOid, sourcePlayer: controller } as GameEvent]
    },
  }, selfOid, controller)
}

export const SFD_116: Card = {
  id: 'SFD-116', cardNo: 'SFD·116/221', name: '永恩', category: 'unit',
  domains: ['orange'], energy: 5, power: 5, keywords: ['百炼'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[百炼]§821 打出时可装配武装(通用工厂)' },
    { kind: 'passive', describe: '征服未受控制战场时对基地一名敌方单位造成我战力伤害(makeYoneTrigger;★1589 errata,wasUncontrolled 通道)' },
  ],
}
export const SFD_233: Card = { ...SFD_116, id: 'SFD-233', cardNo: 'SFD·233/221' }
