                                                     
                                                               
                                            
                                            
                                            
                                               
  
                                 
                                                                          
                                                         
                                                   
  
                                                         
                                                            
                                                                            
                               
                                                        
                                                                          
                                                           
                                                             
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { variantSiblings } from '../variantAlias'

export const OGN_205_CARD_EFFECT = '{{游走}}\n当我在一个回合内进行了第三次移动，你获得1分。'
export const OGN_189_CARD_EFFECT = '{{游走}}\n在本回合内，如果我移动了两次，则我免疫伤害。'

                                                
export const OGN_205_NTH_MOVE = 3
export const OGN_189_MOVES_NEEDED = 2

   
                                          
                                             
   
export function movesOf(state: GameState, oid: ObjId | string): number {
  return state.movesThisTurn?.[oid as string] ?? 0
}

                               
export function makeYasuoThirdMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'OGN-205-third-move',
    event: 'unitMoved',
    by: 'any', // 卡文没写「你」——谁让我动的都算(效果驱动的移动同样补发 unitMoved)
    when: [
      { kind: 'subjectIsSelf' }, // 「当**我**…移动」——别人动不算
                                               
      { kind: 'custom', test: (_ev, state): boolean => movesOf(state, selfOid) === OGN_205_NTH_MOVE },
    ],
    effect: (): readonly GameEvent[] => [{ kind: 'gainPoint', player: controller, amount: 1 }],
  }, selfOid, controller)
}

                                   
export const OGN_189_DEFIDS: readonly string[] = variantSiblings('OGN-189')

                       
export function isKayn(defId: string): boolean {
  return OGN_189_DEFIDS.includes(defId)
}

                                      
export function kaynImmune(state: GameState, oid: ObjId): boolean {
  return movesOf(state, oid) >= OGN_189_MOVES_NEEDED
}

   
                                                                           
                                               
                                                 
                                                     
   
export function combatImmuneAt(state: GameState, oid: ObjId): boolean {
  const o = state.objects[oid]
  return !!o && isKayn(o.defId) && kaynImmune(state, oid)
}

   
                                               
                                                                   
                                                
   
export function moveImmunityShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const o of Object.values(state.objects)) {
    if (!isKayn(o.defId) || !kaynImmune(state, o.oid)) continue
    out.push({
      id: `OGN-189:immune:${o.oid}`,
      source: o.oid,
      controller: o.controller,
      intercepts: 'damage',
      predicate: (ev: GameEvent) => ev.kind === 'damage' && (ev.target as string) === (o.oid as string),
      rewrite: (ev: GameEvent) => (ev.kind === 'damage' ? { ...ev, amount: 0 } : ev),
    })
  }
  return out
}

export const OGN_205: Card = {
  id: 'OGN-205', cardNo: 'OGN·205/298', name: '亚索', category: 'unit', // 英雄单位 → unit
  domains: ['purple'], energy: 5, power: 4, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合第三次移动时你获得1分(makeYasuoThirdMoveTrigger)' }],
}
export const OGN_189: Card = {
  id: 'OGN-189', cardNo: 'OGN·189/298', name: '凯隐', category: 'unit', // 英雄单位 → unit
  domains: ['purple'], energy: 6, power: 6, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合移动两次后免疫伤害(moveImmunityShields)' }],
}
