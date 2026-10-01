                                                                 
  
                                                        
                                                
                                                  
                                            
                                           
  
                                 
                                             
                                                                                 
                                
                                            
  
                                          
                                                                
                                      
                                                                        
                                                    
                                                   
  
                                                        
                                                  
                                                                  
                                              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'

export const SFD_139_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当你将此牌从正面朝下的状态打出时，将其贴附到你（在此处）控制的一名单位上。\n' +
  '{{装配紫色}}（支付{{紫色}}：将此牌贴附到你控制的一名单位上。）'

export const SFD_139_PICK = 'nightbladeHost'

   
                          
                                                     
                                          
   
export function nightbladeHosts(state: GameState, controller: PlayerId, here: string | undefined): readonly string[] {
  if (here === undefined) return []
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && (o.zone as string) === here)
    .map((o) => o.oid as string)
    .sort()
}

                                                     
export function makeNightblade139Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                       
                                                         
  const hereOf = (state: GameState, ev: GameEvent): string | undefined => {
    const at = (ev as { at?: string }).at
    if (at === undefined) return undefined
    const z = state.zones[at as never] as { kind: string } | undefined
    return z !== undefined && z.kind === 'battlefield' ? at : undefined
  }
  return compileTrigger({
    id: `SFD-139:${selfOid}`, rawId: true,
    sourceDefId: 'SFD-139',
    event: 'playUnit', // ⚠️ 装备从待命打出走的也是这条信号(实测:`playStandbyAction` 没有装备分支)
    by: 'you',
    when: [
      { kind: 'subjectIsSelf' }, // 「将**此牌**…打出」
      { kind: 'custom', test: (ev) => (ev as { fromStandby?: boolean }).fromStandby === true },
    ],
    nextChoice: (state, ev, chosen): ChoiceRequest | null => {
      if (chosen[SFD_139_PICK] !== undefined) return null            
      const cands = nightbladeHosts(state, controller, hereOf(state, ev))
      if (cands.length === 0) return null                                       
      return {
        itemId: `trig:SFD-139:${selfOid}`,
        controller,
        key: SFD_139_PICK,
        prompt: '夜之锋刃:贴附到此处你控制的哪名单位?',
        isTarget: true, // ★1782 将此牌贴附到此处你控制的一名单位上
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, ev, chosen): readonly GameEvent[] => {
      const pick = (chosen ?? {})[SFD_139_PICK]
                                      
      if (pick === undefined || !nightbladeHosts(state, controller, hereOf(state, ev)).includes(pick)) return []
                                                                      
      return [{ kind: 'attach', obj: selfOid, to: pick as ObjId, player: controller } ]
    },
  }, selfOid, controller)
}

export const SFD_139: Card = {
  id: 'SFD-139', cardNo: 'SFD·139/221', name: '夜之锋刃', category: 'equipment',
  domains: ['purple'], energy: 3, keywords: ['待命', '装配紫色'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[待命]+{装配紫色};从正面朝下打出我时贴附到此处我控制的一名单位(makeNightblade139Trigger)' }],
}
