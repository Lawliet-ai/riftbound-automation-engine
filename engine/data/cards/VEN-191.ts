                                                                
                                                                             
                        
                                           
  
                                                 
                                                  
                                  
                                                               
                                                       
  
                                                  
                                                     
                                                                       
                                    
  
                       
                                                                      
                                                        
                                                    
                                                          
                                 
                                                           
                                                   
  
                                            
                                                  
                                                                              
                                 
                                                                  
                                                    
                                                   
                                                            
                                                     
                                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const VEN_191_CARD_EFFECT =
  '当你放逐一张属于你的卡牌时，强化我。\n{{迅捷>}}解除我的强化，{{横置}}：弃置一张手牌，然后抽一张牌。'

                                                   
export const VEN_143_CARD_EFFECT =
  '当你放逐一张属于你的卡牌时，强化我。（如果我未被强化，则变为已强化状态。）\n'
  + '{{迅捷>}}解除我的强化，{{横置}}：弃置一张手牌，然后抽一张牌。'

                     
export const VEN_191_DISCARD_KEY = 'zedDiscard'

   
                                            
                                                              
   
export function banishedCardIsMine(ev: GameEvent, controller: PlayerId): boolean {
  return (ev as unknown as { player?: PlayerId }).player === controller
}

export function makeZed191Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-191:banished:${selfOid}`, rawId: true,
    sourceDefId: 'VEN-191',
    event: 'banished',
    by: 'you', // 「当**你**放逐…」
    when: [{ kind: 'custom', test: (ev) => banishedCardIsMine(ev, controller) }], // 「**属于你的**卡牌」
                                                                 
    effect: (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid } as GameEvent],
  }, selfOid, controller)
}

   
                              
  
                                               
                                                               
                                                       
                                             
                                                                                       
   
export function handOf191(state: GameState, controller: PlayerId): string[] {
  return (state.zones[`hand:${controller}` as ZoneId]?.contents ?? []).map((oid) => oid as string)
}

export const VEN_191_SPEC: ActivatedSpec = {
  key: 'VEN-191:cycle',
  label: '{{迅捷}} 解除我的强化并{{横置}}:弃置一张手牌,然后抽一张牌', // ★899 label 带上时机标(权限本就注册在 keywords,只是文案漏了)
  keywords: ['迅捷'], // §806 权限关键词:决定什么时机可激活(与 spec 的结算轴是两回事)
  cost: {}, // §204.1.b 冒号前**只有非资源费用**(解除强化 + 横置),别想当然补法力
  tapSelf: true,
  unempowerSelf: true, // §442;⚠️ 它同时是可用性闸 —— 未强化时这条技能连列都不列
  makeNextChoice: ({ selfOid, controller }) => (state, chosen): ChoiceRequest | null => {
    if (chosen[VEN_191_DISCARD_KEY] !== undefined) return null
    const hand = handOf191(state, controller)
    if (hand.length === 0) return null                             
    return {
      itemId: `act:${selfOid}:VEN-191`,
      controller,
      key: VEN_191_DISCARD_KEY,
      prompt: '影流之主:弃置哪一张手牌?(然后抽一张牌)',
      candidates: hand.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
    }
  },
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const out: GameEvent[] = []
    const pick = (chosen ?? {})[VEN_191_DISCARD_KEY]
                                    
    if (pick !== undefined && handOf191(state, controller).includes(pick)) {
                                                                     
      out.push({ kind: 'zoneChange', obj: pick as ObjId, to: `discard:${controller}` as ZoneId } )
    }
                                              
                                                           
    out.push({ kind: 'draw', player: controller, count: 1 } as GameEvent)
    return out
  },
}

export const VEN_191: Card = {
                                               
  id: 'VEN-191', cardNo: 'VEN·191', name: '影流之主', category: 'legend',
  domains: ['red', 'purple'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '你放逐属于你的牌时强化我(makeZed191Trigger)' },
    { kind: 'passive', describe: '[迅捷][解除强化+横置] 弃一张手牌然后抽一张(VEN_191_SPEC)' },
  ],
}
