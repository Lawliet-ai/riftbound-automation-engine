                                                                        
                                                            
                                                          
                                                                    

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                                   
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const OGN_097_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当你打出我时，让一名单位本回合内{{S}}-2，不得低于1{{S}}。'

                                                              
function candidateUnits(state: GameState, selfOid: ObjId, sameBattlefieldOnly: boolean): ObjId[] {
  const self = state.objects[selfOid]
  const out: ObjId[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield' && z.kind !== 'base') continue
    if (sameBattlefieldOnly && z.id !== self?.zone) continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                            
                                                          
      if (o && isUnitDefId(o.defId) && isUnit(o)) out.push(oid as ObjId)
    }
  }
  return out
}

export function makePineconeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                      
                                                                
                                                                        
                                                    
  const effect = compileEffect({
    then: [{
      op: 'addMight',
      target: { ref: 'chosen', key: 'target' },
      delta: -2,
      floor: 1, // "不得低于1[M]"(§477.3.b)
      duration: 'thisTurn',
      id: 'OGN-097-debuff',
    }],
  })
  return compileTrigger({
    id: 'OGN-097-debuff',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」
    nextChoice: (state, ev, chosen) => {
      if (chosen['target'] !== undefined) return null
      const fromStandby = ev.kind === 'playUnit' && ev.fromStandby === true
      const cands = candidateUnits(state, selfOid, fromStandby).map((oid) => ({
        id: oid, label: `${state.objects[oid]?.defId ?? oid} 本回合战力-2`,
      }))
      if (cands.length === 0) return null               
      return { itemId: `trig:OGN-097-debuff:${selfOid}`, controller, key: 'target', prompt: '爆裂球果仙灵:选择一名单位,本回合战力-2(不低于 1)', candidates: cands,
        isTarget: true, // ★1782 让一名单位本回合内-2
        }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_097: Card = {
  id: 'OGN-097',
  cardNo: 'OGN·097/298',
  name: '爆裂球果仙灵',
  category: 'unit',
  domains: ['blue'],
  energy: 2,
  power: 2,
  keywords: ['待命'],
  playModes: [{ kind: 'standard' }, { kind: 'hidden' }],
  abilities: [{ kind: 'passive', describe: '当你打出我时,一名单位本回合[M]-2 不低于1(triggered 经 makePineconeTrigger)' }],
}
