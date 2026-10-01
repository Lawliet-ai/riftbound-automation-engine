                                                                              
                                            
                                          
                                              
  
                               
                                                         
                                                             
  
                                              
                                                       
                                                  
                                                      
                                                      
                       
                                              

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { empowerCount, empowerLimitOf } from '../../src/keywords/empower'
import { isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'

export const VEN_110_CARD_EFFECT =
  '{{强化}} — 弃置一张法术牌（支付此费用：强化我。仅在未强化时可用。）\n' +
  '当我变为{{已强化}}时，放逐战场上一名不高于3{{S}}的敌方单位。'

                               
export function melBanishCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  const out: ObjId[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield') continue                 
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (!o || !isUnit(o) || o.controller === controller) continue        
      if (effectiveMight(o).reference <= 3) out.push(oid as ObjId)                      
    }
  }
  return out
}

   
                    
                                                           
   
export function makeMelEmpowerSpec(isSpell: (defId: string) => boolean): ActivatedSpec {
  return {
    key: 'VEN-110:empower',
    label: '强化—弃置一张法术牌:强化我',
    cost: {}, // §827.1.c.2 纯非资源费用
    discard: 1,
    discardFilter: isSpell, // ★这张卡等的就是这个
    available: (state, _c, selfOid) => {
      const o = state.objects[selfOid as ObjId]
      return o !== undefined && empowerCount(o) < empowerLimitOf(o)                         
    },
    target: 'none', // §827.1.b.1 源物件不是目标
    makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid as ObjId }],
  }
}

                                                  
export function makeMelEmpoweredTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'banish', target: { ref: 'chosen', key: 'target' }, by: { ref: 'self' } }],
  })
  return compileTrigger({
    id: 'VEN-110-banish',
    event: 'empower',
    by: 'any', // 被【外部效果】强化也算"变为已强化"
    when: [{ kind: 'subjectIsSelf' }], // 强化的对象必须是我
    nextChoice: (state, _ev, chosen) => {
      if (chosen['target'] !== undefined) return null
      const cands = melBanishCandidates(state, controller).map((oid) => ({
        id: oid,
        label: `${state.objects[oid]?.defId ?? oid}(战力 ${effectiveMight(state.objects[oid]!).reference})`,
      }))
      if (cands.length === 0) return null                 
      return {
        itemId: `trig:VEN-110-banish:${selfOid}`, controller, key: 'target',
        prompt: '梅尔:放逐战场上一名战力不高于 3 的敌方单位', candidates: cands,
        isTarget: true, // ★1782 放逐战场上一名不高于3的敌方单位
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_110: Card = {
  id: 'VEN-110',
  cardNo: 'VEN·110',
  name: '梅尔',
  category: 'unit',
  domains: ['purple'],
  energy: 5,
  power: 4,
  keywords: [], // 强化是非资源费用变体,走手写规格(通用工厂生成不了)
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化—弃置一张法术牌](makeMelEmpowerSpec,§827.1.c.2)' },
    { kind: 'passive', describe: '变为已强化时放逐一名≤3[S]敌方单位(makeMelEmpoweredTrigger,§441.2.a)' },
  ],
}
