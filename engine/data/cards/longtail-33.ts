                       
  
                         
                                       
                                           
                                     
                                              
  
                                                                              
                                                          
                                       
                                                    
                   
  
                                                         
                                                          
                                                         
                                                   
                       
                                              
                                                           
                                      

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { controlledRuneCount } from '../../src/game/economy'
import { isUnit } from '../../src/state/cardTypes'
import { moveUnitEvents } from './enemy-move'
import { damageOwner, isSpellOrAbilityDamage } from './damage-boost'

                                                                
export const OGN_177_CARD_EFFECT = '每当有友方单位从我的位置向别处移动时，我可以选择跟随它一起移动。'

   
                                                        
                                                                
                                                      
                                                            
                                                                          
                                                   
                                                    
                                            
   
export function makeOgn177FollowTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'OGN-177-follow',
    event: 'unitMoved',
    by: 'any',
    mayChoose: true, // §383.3.a「我可以选择」——整条技能可选(不是某一问可以不选)
    when: [
      { kind: 'eventPlayerIs', side: 'you' },   // 「友方单位」
      { kind: 'subjectIsNotSelf' },              // 我自己走不算
      { kind: 'custom', test: (ev, state): boolean => {
        const me = state.objects[selfOid]
        const e = ev as { from?: string; to?: string }
        return me !== undefined && e.from === (me.zone as string) && e.to !== undefined
      } },
    ],
    effect: (state, ev): readonly GameEvent[] => {
      const to = (ev as { to?: string }).to
      return moveUnitEvents(state, selfOid as string, to)            
    },
  }, selfOid, controller)
}

export const OGN_177: Card = {
  id: 'OGN-177', cardNo: 'OGN·177/298', name: '隐秘追踪者', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '友方单位从我的位置移走时我可选择跟随(makeOgn177FollowTrigger)' }],
}

                                                                  
export const VEN_025_CARD_EFFECT = '如果你控制的符文不少于七枚，则抵挡所有敌方法术和技能将对我造成的伤害。'

                                 
export const VEN_025_RUNES = 7

export function makeVen025Shield(selfOid: string, controller: string): ReplacementShield {
  return {
    id: `VEN-025:${selfOid}`,
    source: selfOid as ObjId,
    controller: controller as never,
    intercepts: 'damage',
    predicate: (ev: GameEvent, state: GameState): boolean => {
      if (!isSpellOrAbilityDamage(ev)) return false                                         
      if ((ev as { target?: string }).target !== selfOid) return false                    
      if (damageOwner(ev, state) === controller) return false                                 
      return controlledRuneCount(state, controller as PlayerId) >= VEN_025_RUNES        
    },
    rewrite: () => null, // §443 替换为「无」:这次伤害不发生
  }
}

export const VEN_025: Card = {
  id: 'VEN-025', cardNo: 'VEN·025', name: '圣职尊者', category: 'unit',
  domains: ['green'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '符文≥7 时抵挡敌方法术/技能对我的伤害(makeVen025Shield)' }],
}

                                                    
export function clericShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const o of Object.values(state.objects)) {
    if (o.defId !== 'VEN-025' || !isUnit(o)) continue
    const k = state.zones[o.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') continue                    
    out.push(makeVen025Shield(o.oid as string, o.controller as string))
  }
  return out
}

             
export const LONGTAIL33_DEFIDS: readonly string[] = ['OGN-177', 'VEN-025']
