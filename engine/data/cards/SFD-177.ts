                                                                    
                                     
                                              
                                       
                                               
  
                       
                                                          
                                                 
                                            
                                                                         
                                                           
                                                         
                                                  
                                                              
                                       
                                                        
                                                              
                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { isToken, isUnit } from '../../src/state/cardTypes'                                                            
import { moveUnitEvents } from './enemy-move'

export const SFD_177_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{黄色}}，让我以活跃状态进场。）\n'
  + '当我进攻时，你可以选择将自己任意数量的指示物单位移动到此战场。'

const EMPEROR_PREFIX = 'azirTok'

                                                           
export function emperorTokenCandidates(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      if (o.controller !== controller || !isToken(o)) return false
                                                                                                           
                                                                               
                                                                                        
                                                                                                   
      if (!isUnit(o)) return false                                                
      const k = state.zones[o.zone]?.kind
      if (k !== 'battlefield' && k !== 'base') return false
      return o.derived?.copiedDefId === undefined                      
    })
    .map((o) => o.oid as string)
    .sort()
}

export function makeAzirEmperorTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const ask = multiSelectChoice({
    itemId: `trig:SFD-177:${selfOid}`, controller, prefix: EMPEROR_PREFIX,
    prompt: '帝君:选任意数量自己的指示物单位移动到此战场(可一个不选)',
    isTarget: true, // ★1782 将自己任意数量的指示物单位移动到此战场
    doneLabel: '够了,不再选',
    candidates: (state: GameState) => emperorTokenCandidates(state, controller)
      .map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
  })
  return compileTrigger({
    id: `SFD-177:attack:${selfOid}`, rawId: true, sourceDefId: 'SFD-177',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」
    mayChoose: true, // §383.3.a「你可以选择」
    activeZone: ['battlefield'], // §383.2.c 进攻触发只在场上有意义
    nextChoice: (state, _ev, chosen) => ask(state, chosen),
                                               
                                                    
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const me = state.objects[selfOid]
      if (!me) return []
      const myZone = me.zone as string
      if (state.zones[me.zone]?.kind !== 'battlefield') return []                 
      const picked = multiSelectPicked(chosen ?? {}, EMPEROR_PREFIX)
      return picked.flatMap((tok) => [...moveUnitEvents(state, tok as string, myZone)])
    },
  }, selfOid, controller)
}

export const SFD_177: Card = {
  id: 'SFD-177', cardNo: 'SFD·177/221', name: '阿兹尔', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: ['急速'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时可将任意数量自己的指示物单位(未改名 L395)移动到结算时我所在战场(makeAzirEmperorTrigger)' }],
}
