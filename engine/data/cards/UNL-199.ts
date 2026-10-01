                                                                           
                                                          
                                                       
                                               
                                               
                   
  
                                                        
                                                                   
                                                                
                                                               
                                                               
                                               
                                                       
                                                                    
                                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChainItem } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { MIRROR_TOKEN } from './UNL-081'

export const UNL_199_CARD_EFFECT =
  '当你征服或据守一处战场时，你可以选择弃置一张手牌并让我变为休眠状态，以此在该处打出'
  + '一名处于活跃状态的“映像”。然后进行一次：该“映像”变为该处另一名单位的复制体。'
  + '让其获得{{瞬息}}。'

   
                                               
                                                            
   
function canPayDeceiverCost(state: GameState, selfOid: ObjId, controller: PlayerId): boolean {
  const self = state.objects[selfOid]
  if (!self || self.status.tapped === true) return false
  return (state.zones[`hand:${controller}` as ZoneId]?.contents ?? []).length > 0
}

const PICK_DISCARD = 'deceiverDiscard'
const PICK_VICTIM = 'deceiverVictim'
const deceiverTag = (selfOid: ObjId): string => `deceiver-mirror-of:${selfOid}`

                                                  
function unitsAt(state: GameState, bf: string): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => (o.zone as string) === bf && isUnit(o))
    .map((o) => o.oid)
    .sort()
}

   
                                                                 
                                       
   
export function makeDeceiverCopyItem(selfOid: ObjId, controller: PlayerId, victimOid: ObjId | undefined): ChainItem {
  const tag = deceiverTag(selfOid)
  return {
    id: `UNL-199-embed-copy:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    resolve: (state): readonly GameEvent[] => {
      const src = victimOid === undefined ? undefined : state.objects[victimOid]
      const k = src === undefined ? undefined : state.zones[src.zone]?.kind
      const srcAlive = src !== undefined && (k === 'battlefield' || k === 'base')
      return Object.values(state.objects)
        .filter((o) => o.counters[tag] === 1)
        .flatMap((o): GameEvent[] => [
          ...(srcAlive ? [{
            kind: 'addEffect',
            effect: {
              id: `UNL-199:copy:${o.oid}`, duration: 'permanent', fromPassive: true,
              predicate: (x: { oid: ObjId }) => x.oid === o.oid,
              modification: { kind: 'copyOf', sourceOid: victimOid },
            },
          } as GameEvent] : []),
          { kind: 'addEffect', effect: {
            id: `UNL-199:fleeting:${o.oid}`, duration: 'permanent', fromPassive: true,
            predicate: (x: { oid: ObjId }) => x.oid === o.oid,
            modification: { kind: 'grantKeyword', keyword: '瞬息' },
          } } as GameEvent,
        ])
    },
  }
}

                                                                     
export function makeDeceiverTrigger(selfOid: ObjId, controller: PlayerId, event: 'conquer' | 'hold'): Trigger {
  return compileTrigger({
    id: `UNL-199-${event}:${selfOid}`, rawId: true, sourceDefId: 'UNL-199',
    event,
    by: 'you',
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「当【你】征服或据守」(㊼ ★712 双保险)
                                                         
                                                               
                                                               
                                                                   
                                                 
      { kind: 'custom', test: (_ev, state): boolean => canPayDeceiverCost(state, selfOid, controller) },
    ],
                                                                 
                                                                  
                                                                    
                                                                                      
                                                                     
                                                        
    mayChoose: true,
    nextChoice: (state: GameState, ev, chosen) => {
                                             
                                                                            
                                                               
                        
      if (chosen[PICK_DISCARD] === undefined) {
        const hand = state.zones[`hand:${controller}` as ZoneId]?.contents ?? []
        if (hand.length === 0) return null
        return {
          itemId: `trig:UNL-199-${event}:${selfOid}`, controller, key: PICK_DISCARD,
          prompt: '诡术妖姬:选择弃置哪张手牌(费用)',
          candidates: hand.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
                                                         
      if (chosen[PICK_VICTIM] !== undefined) return null
      const bf = (ev as { readonly battlefield?: string }).battlefield
      if (bf === undefined) return null
      const cands = unitsAt(state, bf)
      if (cands.length === 0) return null
      return {
        itemId: `trig:UNL-199-${event}:${selfOid}`, controller, key: PICK_VICTIM,
        prompt: '诡术妖姬:选该处一名单位(映像将变为其复制体)',
        isTarget: true, // ★1782 该"映像"变为该处另一名单位的复制体
        candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    },
    effect: (state: GameState, ev, chosen): readonly GameEvent[] => {
      const self = state.objects[selfOid]
      if (!self || self.status.tapped === true) return []                     
      const discardPick = chosen?.[PICK_DISCARD]
      const hand = state.zones[`hand:${controller}` as ZoneId]?.contents ?? []
      if (discardPick === undefined || !hand.includes(discardPick as ObjId)) return []               
      const bf = (ev as { readonly battlefield?: string }).battlefield
      if (bf === undefined) return []
      const tag = deceiverTag(selfOid)
                                                                      
                                                                                  
                                                                                
                                                                                    
                                                      
      const victim = chosen?.[PICK_VICTIM] as ObjId | undefined
      return [
                                                                 
        { kind: 'zoneChange', obj: discardPick as ObjId, to: `discard:${controller}` as ZoneId } as GameEvent,
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
                                                                    
        { kind: 'spawnToken', spec: MIRROR_TOKEN, zone: bf as ZoneId, owner: controller, tag, ready: true } as GameEvent,
                                                                                                         
                                                                                   
                                                                
        { kind: 'enqueueItem', item: makeDeceiverCopyItem(selfOid, controller, victim) } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const UNL_199: Card = {
  id: 'UNL-199', cardNo: 'UNL-199/219', name: '诡术妖姬', category: 'legend',
  domains: ['blue', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '征服/据守⇒可选弃牌+休眠在该处打出活跃映像;内嵌:变该处另一名单位复制体+瞬息(makeDeceiverTrigger×2)' },
  ],
}
