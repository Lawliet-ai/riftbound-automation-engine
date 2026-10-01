                                                                 
                         
                                
                                   
  
                                                      
                                                                     
                                               
                                                
                                                                
                                            
                                                              
                                                                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent, RevealedEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { pumpEvent } from './activated-batch'

export const SFD_175_CARD_EFFECT =
  '当你打出我时，让你的其他单位本回合内{{S}}+2。\n如果我从你的主牌堆中被展示，则你{{获得}}{{2}}。'

export function makeGigalithTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'custom', emit: (ctx): readonly GameEvent[] =>
        Object.values(ctx.state.objects)
          .filter((o) => o.controller === ctx.controller && isUnit(o) && o.oid !== ctx.selfOid
            && ctx.state.zones[o.zone]?.kind !== undefined
            && ['base', 'battlefield'].includes(ctx.state.zones[o.zone]!.kind as string))
          .map((o) => pumpEvent('SFD-175:pump', o.oid as string, 2)) },
    ],
  })
  return compileTrigger({
    id: `SFD-175:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-175',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

   
                                                 
                                         
                                                          
   
export function gigalithRevealedHook(state: GameState, ev: RevealedEvent): GameState {
  let bonus = 0
  for (const oid of ev.cards) {
    const o = state.objects[oid]
    if (o && o.defId === 'SFD-175' && o.owner === ev.player) bonus += 2
  }
  if (bonus === 0) return state
  const pool = state.runePools[ev.player]
  if (!pool) return state
  return { ...state, runePools: { ...state.runePools, [ev.player]: { ...pool, mana: pool.mana + bonus } } }
}

export const SFD_175: Card = {
  id: 'SFD-175', cardNo: 'SFD·175/221', name: '垓兽', category: 'unit',
  domains: ['yellow'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时其他友方单位本回合+2S(makeGigalithTrigger);从主牌堆被展示则获得2法力(gigalithRevealedHook,替换效果)' }],
}
