                                                              
                                                                 
                                                       
                              
                                                             

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { effectiveMight } from '../../src/state/might'
import { ownerHandZone } from './enter-triggers-batch'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                         

export const SFD_138_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当你打出我时，你可以选择让战场上另一名不高于3{{S}}的单位返回其所属的手牌。'

                                                            
function bounceCandidates(state: GameState, selfOid: ObjId, sameBattlefieldOnly: boolean): ObjId[] {
  const self = state.objects[selfOid]
  const out: ObjId[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield') continue         
    if (sameBattlefieldOnly && z.id !== self?.zone) continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                           
                                                                          
                                                      
      if (!o || oid === selfOid || !isUnitDefId(o.defId) || !isUnit(o)) continue
      if (effectiveMight(o).actual <= 3) out.push(oid as ObjId)
    }
  }
  return out
}

export function makeWindWingTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'moveTo',
      target: { ref: 'chosen', key: 'bounce' },
                                                        
                                                       
      zone: (ctx, moved) => ownerHandZone(ctx.state, moved, ctx.controller),
    }],
  })
  return compileTrigger({
    id: 'SFD-138-bounce',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
                                                    
                                                         
                                                             
                                                     
                                                  
                                                         
    mayChoose: true,
    nextChoice: (state, ev, chosen) => {
      if (chosen['bounce'] !== undefined) return null
      const fromStandby = ev.kind === 'playUnit' && ev.fromStandby === true
      const cands = bounceCandidates(state, selfOid, fromStandby).map((oid) => ({
        id: oid as string, label: `弹回 ${state.objects[oid]?.defId ?? oid}`,
      }))
      if (cands.length === 0) return null
      return {
        itemId: `trig:SFD-138-bounce:${selfOid}`, controller, key: 'bounce',
        prompt: '吟风翼:可让战场上另一名战力不高于 3 的单位返回其所属手牌', candidates: cands,
        isTarget: true, // ★1782 让战场上另一名不高于3的单位返回其所属的手牌
      }
    },
    effect: (state, ev, chosen) => (chosen?.['bounce']
      ? effect({ state, selfOid, controller, ev, chosen })
      : []),
  }, selfOid, controller)
}

export const SFD_138: Card = {
  id: 'SFD-138',
  cardNo: 'SFD·138/221',
  name: '吟风翼',
  category: 'unit',
  domains: ['purple'],
  energy: 2,
  power: 1,
  keywords: ['待命'],
  playModes: [{ kind: 'standard' }, { kind: 'hidden' }],
  abilities: [{ kind: 'passive', describe: '当你打出我时,可弹回战场上另一名≤3[M]单位(triggered 经 makeWindWingTrigger)' }],
}
