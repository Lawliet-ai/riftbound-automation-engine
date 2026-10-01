                                                                   
                   
                                     
                                     
  
                                                         
                                                   
                                                
                                                                              
                                             
  
       
                                                               
                                                                  
                                                                          
                                                
                                                 
                                                     
                                                           
                                                                   
                                                                           
                                                     
                                
                                                     
                                                                     
                                                     
                                                                       
                                        
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { allDiscards } from '../../src/keywords/insight'                      
import type { Trigger } from '../../src/dsl/trigger'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasteChoice, type EffectSpec } from '../../src/dsl/effectSpec'                 
import { MINION } from './reprint-batch'
import { hasteKeyOf } from './haste-key'                             
import { multiSelectChoice, multiSelectPickedLegal } from '../../src/loop/multiSelect'

export const OGN_212_CARD_EFFECT =
  '当你打出此牌时，打出一名1{{S}}的“随从”到你的基地。\n' +
  '你可以选择摧毁此装备，以此从任意废牌堆中回收最多四张卡牌。'

                                   
export const OGN_212_MAX_RECYCLE = 4
const OGN_212_PREFIX = 'OGN212rec'

   
                                         
  
                                                                                 
                                                                           
                                                                  
                                                       
   
export function anyDiscardCards(state: GameState): readonly ObjId[] {
  return allDiscards(state)
}

                                     
                                       
export const OGN_212_HASTE_KEY = hasteKeyOf('OGN-212:minion')
export function makeFutureForgePlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                   
  const effSpec: EffectSpec = {
    then: [{ op: 'spawnToken', spec: MINION, zone: (ctx) => `base:${ctx.controller}`, haste: { key: OGN_212_HASTE_KEY, label: '随从' } }],
  }
  const effect = compileEffect(effSpec)
  return compileTrigger({
    id: 'OGN-212:play',
    event: 'playUnit', // 装备也走 PLAY_UNIT 通道打出(§149.2)
    by: 'any',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    postChoice: (state, chosen) => effectHasteChoice(effSpec, state, controller, chosen), // ★1398 落点写死基地不问 ⇒ 只问急速
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                       
export const OGN_212_SPEC: ActivatedSpec = {
  key: 'OGN-212:recycle',
  label: '摧毁此装备:从任意废牌堆中回收最多四张卡牌',
  cost: {}, // 费用只有「摧毁此装备」这一截,没有资源费
  destroySelf: true,
  target: 'none',
                                                
                                                                                
                                                                        
                                                                         
                                                       
                                                                       
                                                                         
                                                                                  
                             
  choiceTiming: 'confirm',
                                                                     
                                                                      
                                                     
  firstAskOptional: true,
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => [{
    kind: 'recycle',
    player: controller,
    objs: multiSelectPickedLegal(chosen, OGN_212_PREFIX, state, (st) => anyDiscardCards(st))
      .map((oid) => oid as ObjId),
  }],
  makeNextChoice: ({ selfOid, controller }) => multiSelectChoice({
    itemId: `act:${selfOid}:OGN-212`,
    controller,
    prefix: OGN_212_PREFIX,
    prompt: '未来熔炉:从任意废牌堆中挑要回收的牌(最多四张,可以一张都不挑)',
    isTarget: true, // ★1781 §355.7:「摧毁此装备,以此从任意废牌堆中回收最多四张卡牌」
    doneLabel: '够了,不再回收',
    max: OGN_212_MAX_RECYCLE,
    candidates: (state) => anyDiscardCards(state)
      .map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
  }),
}

export const OGN_212: Card = {
  id: 'OGN-212', cardNo: 'OGN·212/298', name: '未来熔炉', category: 'equipment',
  domains: ['yellow'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时在基地打出1[M]随从;摧毁自身:从任意废牌堆回收最多四张(OGN_212_SPEC)' }],
}
