                                                             
                                
                                      
  
                        
                                                             
                                                    
                                                                 
                                                         
                                                                              
                                                          
                                                               
  
                                   
                                                    
                                                        
                                                    
                                  
                                         
                                                    
                                        
                                                    
                                           
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { payFromState } from '../../src/game/economy'
import { unitDestinations } from './play-from-deck'

                                                     
export const OGN_006_PAY: Cost = { pips: [['red']] }
export const OGN_006_CARD_EFFECT = '当你弃置我时，你可以选择支付{{红色}}，改为将我打出到场上。'

   
                                         
                                                     
                                                           
                                                                  
                                                   
                                          
   
export function discardedSelf006(ev: GameEvent, state: GameState, selfOid: ObjId): boolean {
  const e = ev as { from?: ZoneId; to?: ZoneId; defId?: string }
  if (e.defId !== 'OGN-006') return false
  if (state.zones[e.from as ZoneId]?.kind !== 'hand') return false
  const dest = state.zones[e.to as ZoneId]
  if (dest?.kind !== 'discard') return false
  const landed = (ev as { landedOid?: string }).landedOid                                        
  if (landed !== undefined) return landed === (selfOid as string)
  return dest.contents[dest.contents.length - 1] === selfOid
}

export function makeGrenade006Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-006:${selfOid}`
  return compileTrigger({
    id, rawId: true,
    sourceDefId: 'OGN-006',
    event: 'zoneChange',
    by: 'any', // ⚠️「当【你】弃置我时」那道归属判据由下面的 filter 兜(弃的是我这张牌本身)
    when: [{ kind: 'custom', test: (ev, state) => discardedSelf006(ev, state, selfOid) }],
    mayChoose: true, // §383.3.a 卡文以「你可以选择」开头
                                                              
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, OGN_006_PAY)
      return paid.ok ? paid.state : null
    },
                                              
    nextChoice: (state, _ev, chosen) => {
      if (chosen['to'] !== undefined) return null
      const dests = unitDestinations(state, controller, undefined, state.objects[selfOid]?.defId)               
      if (dests.length === 0) return null                 
      if (dests.length <= 1) return null                 
      return {
        itemId: `trig:${id}`, controller,
        key: 'to', prompt: '嚼火者手雷:把我打出到哪里?',
        candidates: dests.map((z) => ({ id: z as string, label: z as string })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
                                                
      const me = state.objects[selfOid]
      if (!me || state.zones[me.zone]?.kind !== 'discard') return []
      const dests = unitDestinations(state, controller, undefined, me?.defId)               
      if (dests.length === 0) return []                                       
      const to = chosen?.['to']
      const dest = to !== undefined && dests.includes(to as ZoneId) ? (to as ZoneId) : dests[0]!                         
      return [{
        kind: 'playUnit',
        unit: selfOid, // 会被 §419.3 分支重写成落地后的新 oid
        player: controller,
                                                           
        play: { card: selfOid, to: dest, cost: {} },
      } as GameEvent]
    },
  }, selfOid, controller)
}

export const OGN_006: Card = {
  id: 'OGN-006', cardNo: 'OGN·006/298', name: '嚼火者手雷', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '被弃置时可付{红色}改为把我打出到场上(makeGrenade006Trigger)' }],
}
