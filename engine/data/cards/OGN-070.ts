                                                                      
                                                               
                               
                                           
  
                               
                                                      
                                              
                                                                 
                                                 
                                                         
                                                    
                                                      
  
                         
                                                         
                                                      
                                                          
                                                                  
                                        
                                                                
                                                                  
                                                                     
                                                                 
                                                    
                                                                 
                                                                      
                                                                        
                                                           
                                                                           
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import type { GameState } from '../../src/state/gameState'
import { isEquipment, isUnit } from '../../src/state/cardTypes'                                                  
import type { PlayerId } from '../../src/state/ids'
import { CARD_CATEGORIES } from '../cardCategories'

export const OGN_070_CARD_EFFECT =
  '如果我位于战场上，则对手只能把单位打到自己的基地。\n'
  + '如果我位于战场上，则禁止敌方单位和装备通过法术或技能效果变为活跃状态。'

                                                  
function enemyWardensOnBattlefield(state: GameState, viewer: PlayerId) {
  return Object.values(state.objects).filter((o) =>
    o.defId === 'OGN-070'
    && state.zones[o.zone]?.kind === 'battlefield'                         
    && o.controller !== viewer)                       
}

   
                                                         
                                        
                                      
   
export function warden070BansUnitPlay(state: GameState, player: PlayerId, defId: string, to: string): boolean {
  if (CARD_CATEGORIES[defId] !== 'unit') return false
  if (to === `base:${player}`) return false                       
  return enemyWardensOnBattlefield(state, player).length > 0
}

                                                                 
function isBecomeReady(ev: GameEvent): boolean {
  if (ev.kind !== 'statusChange') return false
  const e = ev as unknown as { key: string; value: boolean }
  return (e.key === 'dormant' && e.value === false)
    || (e.key === 'tapped' && e.value === false)
    || (e.key === 'ready' && e.value === true)
}

   
                                 
                                                         
                                               
                                                          
   
export function wardenReadyShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const w of Object.values(state.objects)) {
    if (w.defId !== 'OGN-070') continue
    if (state.zones[w.zone]?.kind !== 'battlefield') continue              
    out.push({
      id: `OGN-070:noReady:${w.oid}`,
      source: w.oid,
      controller: w.controller,
      intercepts: 'statusChange',
      predicate: (ev: GameEvent, s: GameState) => {
        if (!isBecomeReady(ev)) return false
        const t = s.objects[(ev as unknown as { target: string }).target as never]
        if (t === undefined) return false
        if (t.controller === w.controller) return false                   
                                                                   
                                                                                       
                                                                                       
                                                                         
                                                            
                                                                          
        return isUnit(t) || isEquipment(t)           
      },
      rewrite: () => null, // 「禁止」= §443 替换为"无"
    })
  }
  return out
}

export const OGN_070: Card = {
  id: 'OGN-070', cardNo: 'OGN·070/298', name: '搜魔人典狱长', category: 'unit',
  domains: ['green'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '我在战场上时对手只能把单位打到自己基地(playBannedFor 第六档)' },
    { kind: 'passive', describe: '我在战场上时禁止敌方单位/装备经效果变活跃(wardenReadyShields)' },
  ],
}
