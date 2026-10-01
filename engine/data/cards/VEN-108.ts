                                                               
                                                    
                                                    
                                         
  
                                                                      
                                                         
                                              
                                            
  
                         
                                                                       
                                                                                 
                                                                       
                                           
                                               
                                              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { resolveSelector } from '../../src/dsl/selector'
import { isUnit } from '../../src/state/cardTypes'
import { topOfDeck } from '../../src/keywords/insight'
import { burnOne } from './once-per-turn'
import { pumpEvent } from './activated-batch'

export const VEN_108_CARD_EFFECT =
  '当你打出此牌时，或在你的开始阶段开始时，{{燃烧1}}。当你以此方式燃烧一张单位牌时，进行一次:' +
  '给予一名友方单位在本回合内等同于被燃烧卡牌战力的+{{S}}加成。（将你主牌堆顶部的一张牌放入你的废牌堆，即为燃烧1。）'

                                                                         
const VEN_108_SELECTOR = { type: 'unit' as const, fielded: true, controller: 'you' as const, isTarget: true }

   
                                         
                                 
                                                             
   
export function burnedUnitMight(state: GameState, controller: PlayerId): number | null {
  const [top] = topOfDeck(state, controller, 1)
  if (top === undefined) return null             
  const o = state.objects[top as ObjId]
  if (!o || !isUnit(o)) return null           
  return o.baseMight
}
                                                            
                                                                                
                                                
                                         
                            
                                                
                                                                  

const VEN_108_PICK = 'relicAlly'

export function makeLostRelicTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
     
                                                
                                                       
                                                 
     
  const run: Trigger['effect'] = (state, _ev, chosen) => {
    const might = burnedUnitMight(state, controller)
    const ally = chosen?.[VEN_108_PICK]
    const burn = burnOne(state, controller as unknown as string)
    if (might === null || might === 0 || ally === undefined) return burn
                                                                          
                                                             
    if (!resolveSelector(state, VEN_108_SELECTOR, controller).includes(ally as ObjId)) return burn
    return [...burn, pumpEvent('VEN-108:might', ally, might)]
  }
  const abilityKey = `VEN-108:burn:${selfOid}`
  const choose = {
    key: VEN_108_PICK,
    prompt: '遗落圣物:给予一名友方单位等同于被燃烧单位战力的加成',
                                                          
    when: (state: GameState) => burnedUnitMight(state, controller) !== null,
    selector: VEN_108_SELECTOR,
  }
  return [
    compileTrigger({
      id: `${abilityKey}:play`, rawId: true, sourceDefId: 'VEN-108', abilityKey,
      event: 'playUnit', by: 'you',
      when: [{ kind: 'subjectIsSelf' }], // ★装备打出也走 playUnit(铁律207);判"是不是我"
      choose,
      effect: run,
    }, selfOid, controller),
    compileTrigger({
      id: `${abilityKey}:start`, rawId: true, sourceDefId: 'VEN-108', abilityKey,
      event: 'startPhase', by: 'you',
                                                                 
      when: [{ kind: 'eventPlayerIs', side: 'you' }],
      activeZone: ['battlefield', 'base'], // §383.2.c 我离场之后不该再烧
      choose,
      effect: run,
    }, selfOid, controller),
  ]
}

export const VEN_108: Card = {
  id: 'VEN-108', cardNo: 'VEN·108', name: '遗落圣物', category: 'equipment',
  domains: ['purple'], energy: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时/我的开始阶段:燃烧1;烧到单位牌则给一名友方单位等同其战力的加成' }],
}
