                                                                           
                                              
                                          
                             
                           
  
            
                                                  
                                                                            
                                        
                                                                 
  
                       
                                                         
                                             
                                            
                                               
                                   
                                               
                                                     
                                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { isEmpowered } from '../../src/keywords/empower'
import { isUnit } from '../../src/state/cardTypes'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const VEN_021_CARD_EFFECT =
  '{{强化2红色}}（支付{{2}}和{{红色}}：强化我。仅在未强化时可用。）\n' +
  '当我移动时，你可以选择对我移动起点或终点的战场上的一名单位造成1点伤害。' +
  '如果我{{已强化}}，则改为造成2点伤害。\n' +
  '{{已强化>}} 我获得{{S}}+1。'

   
                             
                                                            
                           
   
export function akaliDamageCandidates(
  state: GameState,
  from: ZoneId,
  to: ZoneId,
): readonly ObjId[] {
  const out: ObjId[] = []
  for (const zid of new Set<string>([from, to])) {
    const z = state.zones[zid as ZoneId]
    if (!z || z.kind !== 'battlefield') continue
    for (const oid of z.contents) {
      if (isUnit(state.objects[oid])) out.push(oid as ObjId)
    }
  }
  return out
}

                                        
export function akaliDamageAmount(state: GameState, selfOid: ObjId): number {
  return isEmpowered(state.objects[selfOid]) ? 2 : 1
}

export function makeAkaliMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                          
                                          
                                                           
                                                       
                            
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const target = ctx.chosen['target']
        if (!target || ctx.selfOid === null) return []                        
                                                                                       
                                                        
        const ev = ctx.ev
        if (ev.kind !== 'unitMoved' || !akaliDamageCandidates(ctx.state, ev.from, ev.to).includes(target as ObjId)) return []
                                                
        return [{ kind: 'damage', target: target as ObjId, amount: akaliDamageAmount(ctx.state, ctx.selfOid), source: ctx.selfOid }]
      },
    }],
  })
  return compileTrigger({
    id: `VEN-021-move-damage:${selfOid}`,
    rawId: true, // id 已自带 selfOid
    event: 'unitMoved',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】移动时」:unitMoved 的 unit 得是我
    mayChoose: true, // §383.3.a 卡文以"你可以选择"开头
    nextChoice: (state, ev, chosen) => {
      if (chosen['target'] !== undefined) return null
      if (ev.kind !== 'unitMoved') return null
      const amount = akaliDamageAmount(state, selfOid)
      const cands = akaliDamageCandidates(state, ev.from, ev.to).map((oid) => ({
        id: oid,
        label: `${state.objects[oid]?.defId ?? oid} 受 ${amount} 点伤害`,
      }))
      if (cands.length === 0) return null                 
      return {
        itemId: `trig:VEN-021-move-damage:${selfOid}`,
        controller,
        key: 'target',
        prompt: `阿卡丽:选择一名单位,对其造成 ${amount} 点伤害`,
        isTarget: true, // ★1782 对…战场上的一名单位造成1点伤害
        candidates: cands,
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_021: Card = {
  id: 'VEN-021',
  cardNo: 'VEN·021',
  name: '阿卡丽',
  category: 'unit',
  domains: ['red'],
  energy: 3,
  power: 3,
  keywords: ['强化2红色'], // → empowerActivationSpecs 通用生成主动技能
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化2红色]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '当我移动时可对起点/终点战场的一名单位造成伤害(makeAkaliMoveTrigger)' },
    { kind: 'passive', describe: '[已强化>]{S}+1(empowered-passives)' },
  ],
}
