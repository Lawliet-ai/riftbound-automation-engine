                                                             
                                                            
                                                        
                                   
                                                
                                       
                                             
                                     
  
                                            
                                                                          
                           
                                                 
                                                      
                                                   
  
                                       
                                                               
                                                                                          
                                                            
                                                                                
                                                                           
                                                                     
                                                                              
                                                                             
                                                                                      
                                                                                 
                                                                            
                                                      
  
               
                                                                    
                                                                        
                                                           
                                                                                             
                                                                                                      
                                                                                              
                                                                                      
                                                                                          
                                                                      
  
                                                                     
                                                                         
                                                                
                                                         
                                                             
                                                                 
                                                                  
                                                   
                                                                         
                                                                              
                                                                                             
                                                           
                                                                
                                                      
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { spellNeedsTarget, type PlaySpec } from '../../src/loop/playSpec'                                                                       
import { CARD_CATEGORIES } from '../cardCategories'                                           
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { payFromState } from '../../src/game/economy'
import { selfLocation } from '../../src/state/selfHere'                                                                     
import { playBannedFor } from './longtail-12'                                     
import { unitDestinations, playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                           
import { spellLegalTargets } from '../../src/loop/playSpec'

export const OGN_107_CARD_EFFECT =
  '当我进攻时，你可以选择支付{{蓝色}}，以此从你的手牌中正面朝上打出一张带有{{待命}}技能的卡牌，无视费用。'
  + '如果其为单位，则将其打出到此处。'

                                                  
export const OGN_107_UPSTREAM_STALE_EFFECT =
  '当我进攻时，你可以选择支付{{蓝色}}，以此从你的手牌中正面朝上打出一张带有{{待命}}技能的卡牌，无视费用。'

                                                     
export const OGN_107_PAY: Cost = { pips: [['blue']] }
                          
export const OGN_107_PICK_KEY = 'avaStandbyPick'
                                     
export const OGN_107_TO = 'avaStandbyTo'
                                                                  
export const OGN_107_SPELL_TARGET = 'avaSpellTarget'
                        
export const STANDBY_KEYWORD = '待命'

                                                
export interface Ava107Deps {
                                    
  readonly hasStandby: (defId: string) => boolean
                                                     
  readonly isUnitCard: (defId: string) => boolean
     
                                                                                 
                                                                      
                                                                                       
                                              
     
  readonly specFor?: (defId: string) => PlaySpec | undefined
}

   
                                                
                                                              
                                         
                                                                            
                                                                 
                                                                   
                                                                          
                                                           
   
export function standbyInHand(state: GameState, controller: PlayerId, deps: Ava107Deps): string[] {
  return (state.zones[`hand:${controller}` as ZoneId]?.contents ?? [])
    .filter((oid) => deps.hasStandby(state.objects[oid]?.defId ?? ''))
    .map((oid) => oid as string)
}


   
                                                                                                 
                                                             
   
export function standbySpellPlayable(state: GameState, controller: PlayerId, defId: string, oid: string, deps: Ava107Deps): boolean {
  const spec = deps.specFor?.(defId)
  if (spec === undefined || spec.kind !== 'spell') return false
  if (playBannedFor(state, controller, defId, `base:${controller}`, oid)) return false
  return !spellNeedsTarget(spec) || spellLegalTargets(spec, state, controller).length > 0
}

export function makeAva107Trigger(selfOid: ObjId, controller: PlayerId, deps: Ava107Deps): Trigger {
  const id = `OGN-107:attack:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'OGN-107',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」
    mayChoose: true, // §383.3.a 卡文以「你可以选择」开头
                                                              
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, OGN_107_PAY)
      return paid.ok ? paid.state : null
    },
    nextChoice: (state, _ev, chosen) => {
      const hereNow = selfLocation(state, selfOid)
      if (chosen[OGN_107_PICK_KEY] !== undefined) {
        const pick = chosen[OGN_107_PICK_KEY]
        const d = state.objects[pick as ObjId]?.defId ?? ''
        if (!standbyInHand(state, controller, deps).includes(pick)) return null
                                                                                         
        if (CARD_CATEGORIES[d] === 'spell') {
          if (chosen[OGN_107_SPELL_TARGET] !== undefined) return null
          const spec = deps.specFor?.(d)
          if (spec === undefined || !spellNeedsTarget(spec)) return null
          const targets = spellLegalTargets(spec, state, controller)
          if (targets.length === 0) return null
          return {
            itemId: `trig:${id}`, controller, key: OGN_107_SPELL_TARGET,
            prompt: `斥候标兵 艾娃:为该法术(${d})选择目标`,
            candidates: targets.map((t) => ({ id: t, label: t })),
          }
        }
                                                                                 
                                                                            
        if (chosen[OGN_107_TO] !== undefined) return null
        if (!deps.isUnitCard(d)) return null
                                                                                   
                                                                             
                                                                                   
        return playFromEffectChoice(state, controller, d, {
          itemId: `trig:${id}`, controller, key: OGN_107_TO, prompt: '斥候标兵 艾娃:「此处」已不在,把它打出到哪里?',
        }, hereNow === undefined ? chosen : { ...chosen, [OGN_107_TO]: hereNow as string })
      }
                                                                        
                                                                    
                                                 
                                                             
      const cands = standbyInHand(state, controller, deps).filter((oid) => {
        const d = state.objects[oid as ObjId]?.defId ?? ''
        if (CARD_CATEGORIES[d] === 'spell') return standbySpellPlayable(state, controller, d, oid, deps)                
        if (!deps.isUnitCard(d)) return !playBannedFor(state, controller, d, `base:${controller}`, oid)
        return hereNow !== undefined ? !playBannedFor(state, controller, d, hereNow, oid) : unitDestinations(state, controller, undefined, d).length > 0
      })
      if (cands.length === 0) return null                            
      return {
        itemId: `trig:${id}`, controller,
        key: OGN_107_PICK_KEY,
        prompt: '斥候标兵 艾娃:从手牌正面朝上打出一张带{{待命}}的卡牌,无视费用',
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[OGN_107_PICK_KEY]
                                       
      if (pick === undefined || !standbyInHand(state, controller, deps).includes(pick)) return []
      const defId = state.objects[pick as ObjId]?.defId ?? ''
                                                                                           
                                                                                                   
                                                                              
                                                                
      if (CARD_CATEGORIES[defId] === 'spell') {
        const spec = deps.specFor?.(defId)
        if (spec === undefined || spec.kind !== 'spell') return []                              
        if (playBannedFor(state, controller, defId, `base:${controller}`, pick)) return []                     
        const target = chosen?.[OGN_107_SPELL_TARGET]
                                                                                 
        if (spellNeedsTarget(spec) && (target === undefined || !spellLegalTargets(spec, state, controller).includes(target))) return []
        return [{ kind: 'playSpellFromZone', player: controller, card: pick as ObjId, freeAll: true,
          ...(spellNeedsTarget(spec) && target !== undefined ? { target } : {}) } ]
      }
                                                                         
      const isUnit = deps.isUnitCard(defId)
      const here = isUnit ? selfLocation(state, selfOid) : undefined
                                                                            
                                                                               
                                                    
      const x = optionalExtraResolve(state, controller, defId, OGN_107_TO, chosen)
      let to: ZoneId | undefined
      if (isUnit && here === undefined) {
                                                                                                        
        to = unitDestinationResolve(state, controller, defId, chosen?.[OGN_107_TO], x.grant)
        if (to === undefined) return []
      } else {
        if (playBannedFor(state, controller, defId, (here ?? `base:${controller}`) as string, pick)) return []                              
        to = here as ZoneId | undefined
      }
      return [...x.pre, {
        kind: 'playFree', obj: pick as ObjId, player: controller,
                                                                   
                                                                                             
        ...(to !== undefined ? { to } : {}),
        ...x.flags,
      }, ...x.post ]
    },
  }, selfOid, controller)
}

export const OGN_107: Card = {
  id: 'OGN-107', cardNo: 'OGN·107/298', name: '斥候标兵 艾娃', category: 'unit',
  domains: ['blue'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时可付{蓝色}从手牌无视费用打出一张[待命]牌;单位钉到此处(makeAva107Trigger)' }],
}
