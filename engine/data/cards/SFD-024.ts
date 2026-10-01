                                                                          
                                                            
                                                           
                                                                      
                                                                
                                                              
                                                         
                                                 
                
                                                           
                                      
                                                       
  
                                                                              
                                                     
  
                                            
                                                                               
                                                                           
                                                             
  
                                                     
                                                 
                                                                  
  
                                                  
                                                                            
                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChainItem } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isArmament } from '../../src/keywords/equip'                      
import { playedBy } from '../../src/loop/events'                        
import { CARD_COSTS } from '../cardCosts'
import { playBannedFor } from './longtail-12'                                     

export const SFD_024_CARD_EFFECT =
  '{{壁垒}}（我在战斗中首先承担伤害。）\n'
  + '当我进攻时，你可以选择打出一件法力费用不高于{{2}}的武装，无视其费用。若如此做，则进行一次：将其贴附到我身上。'

                                             
export const SFD_024_UPSTREAM_STALE_EFFECT =
  '{{壁垒}}（我在战斗中首先承担伤害。）\n'
  + '当我进攻时，你可以选择打出一件法力费用不高于{{2}}的武装，无视其费用，然后将其贴附到我身上。'

                                                        
export const SFD_024_KEYWORDS: readonly string[] = ['壁垒']

                                  
export const SFD_024_MAX_MANA = 2

                          
export const SFD_024_ASK = 'gear'

   
                                        
                                                         
                                                                    
                                                 
   
export function rellGearCandidates(state: GameState, controller: PlayerId): string[] {
  const hand = state.zones[`hand:${controller}` as ZoneId]?.contents ?? []
  return hand
    .filter((oid) => {
      const o = state.objects[oid]
      if (!isArmament(o)) return false
      const mana = CARD_COSTS[o!.defId]?.mana
      return mana !== undefined && mana <= SFD_024_MAX_MANA
    })
    .map((oid) => oid as string)
    .sort()
}

   
                                                       
                                                                    
  
                                                    
                                                         
                                                 
                                                              
                                                                 
                 
                                           
                                                     
                                                                 
                                                         
                                                         
                                                               
   
export function makeRellForgeItem(selfOid: ObjId, controller: PlayerId): ChainItem {
  return {
    id: `SFD-024:forge:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    sourceDefId: 'SFD-024',
    resolve: (state: GameState): readonly GameEvent[] => {
      const fresh = playedBy(state, selfOid).filter((oid) => {
        const o = state.objects[oid]
        return o !== undefined && o.status.attachedTo === undefined
      })
      const gear = fresh[fresh.length - 1]           
      if (gear === undefined) return []                                
                                                             
      return [{ kind: 'attach', obj: gear, to: selfOid, player: controller } as GameEvent]
    },
  }
}

                                                      
export function makeRellAttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-024:attack:${selfOid}`, rawId: true, sourceDefId: 'SFD-024',
    event: 'attack',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」——只写 by:'you' 队友进攻也会响(★112)
    mayChoose: true, // 「**你可以选择**」(§383.3.a)
    nextChoice: (state, _ev, chosen) => {
      if (chosen[SFD_024_ASK] !== undefined) return null        
                                                                             
                                                                               
                                                    
      const cands = rellGearCandidates(state, controller)
        .filter((oid) => !playBannedFor(state, controller, state.objects[oid as ObjId]?.defId ?? '', `base:${controller}`, oid))
      if (cands.length === 0) return null                          
      return {
        itemId: `trig:SFD-024:attack:${selfOid}`, controller, key: SFD_024_ASK,
        prompt: '芮尔:打出手牌里一件法力费用不高于2的武装(无视其费用),然后把它贴到我身上',
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[SFD_024_ASK]
                                                               
      if (pick === undefined || state.objects[pick as ObjId] === undefined) return []
                                                                                   
      if (playBannedFor(state, controller, state.objects[pick as ObjId]?.defId ?? '', `base:${controller}`, pick)) return []
      return [
        {
          kind: 'playUnit', unit: pick as ObjId, player: controller,
          play: {
            card: pick as ObjId,
                                             
            to: `base:${controller}` as ZoneId,
            cost: {}, // ★★★「无视其**费用**」——整笔全免(杰斯那张才是"只免法力")
            readyOnEntry: true,
            by: selfOid, // §419.3 记账,下一条项目靠 `playedBy` 认人
          },
        } ,
                                                    
        { kind: 'enqueueItem', item: makeRellForgeItem(selfOid, controller) } ,
      ]
    },
  }, selfOid, controller)
}

export const SFD_024: Card = {
  id: 'SFD-024', cardNo: 'SFD·024/221', name: '芮尔', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [...SFD_024_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[壁垒];进攻时可从手牌免费打出一件≤2费武装,再进行一次贴到我身上(makeRellAttackTrigger)' }],
}
