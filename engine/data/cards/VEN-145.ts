                                                                        
                                                             
                                                  
                                                   
                        
  
                                                           
                                               
                                                
                                                              
                         
                                                    
                                                                   
                                                        
                                         
                                                                  
                                                               
                                   
                                                            
              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { canDormantSelf } from './dormant-self-cost'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { CARD_COSTS } from '../cardCosts'
import { peakRuneCandidates } from './battlefields-extra'

export const VEN_145_CARD_EFFECT =
  '当你打出一个法力费用不低于{{7}}的单位、装备或主动技能时，你可以选择让我变为休眠状态，'
  + '以此让最多两枚符文变为活跃状态。'

                                 
export const REAPER_COST_MIN = 7
                 
export const REAPER_MAX_RUNES = 2
const RUNE_PREFIX = 'reaperRune'

                                                                         
function printedManaOf(state: GameState, oid: ObjId | undefined): number | undefined {
  if (oid === undefined) return undefined
  const defId = state.objects[oid]?.defId
  if (defId === undefined) return undefined
  return CARD_COSTS[defId]?.mana
}

                                                                         
export function makeDesertReaperTrigger(selfOid: ObjId, controller: PlayerId, event: 'playUnit' | 'activateAbility'): Trigger {
  const itemId = `trig:VEN-145-runes:${selfOid}:${event}`
  const askRunes = multiSelectChoice({
    itemId, controller, prefix: RUNE_PREFIX,
    prompt: '沙漠死神:选最多两枚符文,让它们变为活跃状态',
    doneLabel: '够了,不再选',
    max: REAPER_MAX_RUNES,
    candidates: (state: GameState) => peakRuneCandidates(state)
      .map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}@${state.objects[oid]?.zone ?? '?'}` })),
                                                                          
                                                              
                                                             
                                                                             
                                                          
    isTarget: true,
  })
  return compileTrigger({
    id: `VEN-145-runes:${selfOid}:${event}`, rawId: true, sourceDefId: 'VEN-145',
    event,
    by: 'you', // 「当【你】打出」
    when: [{
      kind: 'custom',
                                           
      test: (ev, state): boolean => {
        if (event === 'playUnit') {
          const printed = printedManaOf(state as GameState, (ev as { readonly unit?: ObjId }).unit)
          return printed !== undefined && printed >= REAPER_COST_MIN
        }
        const base = (ev as { readonly baseCostMana?: number }).baseCostMana
        return base !== undefined && base >= REAPER_COST_MIN
      },
    }, {
                                                              
                                                                  
                                                                     
                                                                        
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean => canDormantSelf(state, selfOid),
    }],
                                                       
                                                        
    mayChoose: true,
                                                          
                                                                       
                                                                   
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
    nextChoice: (state: GameState, _ev, chosen) => {
                                                            
                                                        
                                                    
                                                 
      return askRunes(state, chosen)
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
                                                          
                             
                                   
      const alive = peakRuneCandidates(state)
      const picked = (multiSelectPicked(chosen ?? {}, RUNE_PREFIX) as readonly ObjId[])
        .filter((oid) => alive.includes(oid))
                                                              
      return [
                                                         
        ...picked.map((oid) => ({ kind: 'statusChange', target: oid, key: 'tapped', value: false } as GameEvent)),
      ]
    },
  }, selfOid, controller)
}

export const VEN_145: Card = {
  id: 'VEN-145', cardNo: 'VEN·145', name: '沙漠死神', category: 'legend',
  domains: ['green', 'blue'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '你打出印刷费≥7单位/装备/基础费≥7主动技能⇒可选休眠让最多两枚符文活跃(makeDesertReaperTrigger×2)' },
  ],
}
