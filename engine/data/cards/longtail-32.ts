                                                      
  
                                                       
                                             
                                   
                                               
                                                            
  
                                    
                                                 
                                                                   
                                       
                                                             
  
                                                                               
                                    
                                                                  
                                                      
                                                              
                                                                 
                                                          
                                     
                                                                     
                                          
                                                                      
                                                                       

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export interface AttackStunRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                                
  readonly energy: number
  readonly power: number
  readonly keywords: readonly string[]
                                                          
  readonly triggerId: string
                         
  readonly pickKey: string
  readonly cardEffect: string
}

export const VEN_184_CARD_EFFECT = '{{坚守}}\n当我进攻时，眩晕此处的一名敌方单位。'
export const UNL_176_CARD_EFFECT = '{{伏击}}\n当我进攻时，{{眩晕}}此处的一名敌方单位。'

export const ATTACK_STUN_ROWS: readonly AttackStunRow[] = [
  {
    defId: 'VEN-184', cardNo: 'VEN·184', name: '蕾欧娜', domain: 'yellow',
    cost: { mana: 4, pips: [['yellow']] }, energy: 4, power: 4, keywords: ['坚守'],
    triggerId: 'VEN-184-stun', pickKey: 'leonaStun', // ★第191轮的字面量,一个字都不能改
    cardEffect: VEN_184_CARD_EFFECT,
  },
  {
    defId: 'UNL-176', cardNo: 'UNL-176/219', name: '蔚', domain: 'yellow',
    cost: { mana: 5, pips: [['yellow']] }, energy: 5, power: 5, keywords: ['伏击'],
    triggerId: 'UNL-176-stun', pickKey: 'viStun',
    cardEffect: UNL_176_CARD_EFFECT,
  },
]

   
                                           
                                                                            
                                             
   
export function makeAttackStunTrigger(row: AttackStunRow, selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'stun', target: { ref: 'chosen', key: row.pickKey } }],
  })
  return compileTrigger({
    id: row.triggerId,
    event: 'attack',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当**我**进攻时」——别人进攻不算
    choose: {
      key: row.pickKey,
      prompt: `${row.name}:眩晕此处的一名敌方单位`,
                                            
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, controller: 'opponent', isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                          
export function makeVen184AttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeAttackStunTrigger(ATTACK_STUN_ROWS[0]!, selfOid, controller)
}

export const ATTACK_STUN_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(ATTACK_STUN_ROWS.map((r) => [r.defId, (oid: ObjId, ctrl: PlayerId) => [makeAttackStunTrigger(r, oid, ctrl)]]))

export const ATTACK_STUN_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(ATTACK_STUN_ROWS.map((r) => [r.defId, r.keywords]))

export const ATTACK_STUN_UNIT_COST: Readonly<Record<string, Cost>> =
  Object.fromEntries(ATTACK_STUN_ROWS.map((r) => [r.defId, r.cost]))

export const ATTACK_STUN_CARDS: readonly Card[] = ATTACK_STUN_ROWS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'unit', // 英雄单位 → unit
  domains: [r.domain], energy: r.energy, power: r.power, keywords: r.keywords,
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `进攻时眩晕此处的一名敌方单位(ATTACK_STUN_FACTORIES)` }],
}) as Card)

                                                
export const VEN_184: Card = ATTACK_STUN_CARDS[0]!

                              
export const LONGTAIL32_DEFIDS: readonly string[] = ATTACK_STUN_ROWS.map((r) => r.defId)
