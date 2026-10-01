                                     
  
                                      
                                           
                                     
                                    
                                        
                                    
                                           
                                                      
                                                            
                                                 
                                             
                                      
  
                                            
                                               
                             
  
                                                      
                                               
  
                                                
                                             
                                                               

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import { isUnit } from '../state/cardTypes'
import { isFieldedExceptStandby, zoneCategory } from '../state/zones'
import type { ObjId } from '../state/ids'
import type { Trigger } from '../dsl/trigger'
                                                                       
import { passiveDefId } from '../../data/passiveIdentity'
import type { GameEvent } from '../loop/events'

export const NIMBLE = '灵便'
export const REACTION = '反应'

                                             
export function hasNimble(keywords: readonly string[] | undefined): boolean {
  return (keywords ?? []).includes(NIMBLE)
}

   
                                     
                                
                                                
                      
   
export function withImpliedKeywords(keywords: readonly string[] | undefined): readonly string[] {
  const ks = keywords ?? []
  if (!hasNimble(ks) || ks.includes(REACTION)) return ks
  return [...ks, REACTION]
}

   
                             
                                                                                        
                                                                            
                                                                                
   
function fielded(state: GameState, o: GameObject): boolean {
  const kind = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(kind)
}

   
                                      
                                               
                                               
   
export function nimbleAttachTargets(state: GameState, controller: PlayerId): readonly GameObject[] {
  return Object.values(state.objects).filter(
    (o) => o.controller === controller && isUnit(o) && fielded(state, o),
  )
}

   
                                               
                                  
   
export function nimbleTriggerCount(keywords: readonly string[] | undefined): 0 | 1 {
  return hasNimble(keywords) ? 1 : 0
}

   
                                              
                            
  
                                       
                                    
                                     
                                        
                                    
                                                           
   
export function makeNimbleTriggers(
  state: GameState,
                                                     
  sourcesOf: (o: GameObject) => readonly string[],
): Trigger[] {
  const out: Trigger[] = []
  for (const o of Object.values(state.objects)) {
    if (nimbleTriggerCount(sourcesOf(o)) === 0 && o.status.nimbleOnPlay !== true) continue                                               
    const selfOid = o.oid
    const controller = o.controller
    out.push({
      id: `nimble:${selfOid}`,
      sourceOid: selfOid,
      sourceDefId: passiveDefId(o),
      controller,
      event: 'playUnit', // 装备也走 PLAY_UNIT 通道进场,信号同为 playUnit
      filter: (ev) => ev.kind === 'playUnit' && ev.unit === selfOid,
      nextChoice: (st, _ev, chosen) => {
        if (chosen['nimble'] !== undefined) return null
        const cands = nimbleAttachTargets(st, controller).map((u) => ({
          id: u.oid as string,
          label: `贴附到 ${u.defId}`,
        }))
        if (cands.length === 0) return null               
        return {
          itemId: `trig:nimble:${selfOid}`,
          controller,
          key: 'nimble',
          prompt: '[灵便]:将此牌贴附于你控制的一名单位',
          candidates: cands, // ⚠️ 卡文没写"可以",没有"不贴"这个选项
        }
      },
      effect: (st, _ev, chosen): readonly GameEvent[] => {
        const pick = chosen?.['nimble']
        if (!pick) return []
                                                     
        if (!nimbleAttachTargets(st, controller).some((u) => (u.oid as string) === pick)) return []
        return [{ kind: 'attach', obj: selfOid, to: pick as ObjId, player: controller }]
      },
    })
  }
  return out
}
