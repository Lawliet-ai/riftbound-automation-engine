                                                                   
                                                                 
                                                          
                                                         
                                        
  
                                                 
                                                   
                                                        
                                                            
                                               
                                                          
                                           
                   
                                               
                                                                 
                                                                 
                                                          
                                                     
                                                 
                                         
  
                                                                 
                                                                   
                                                             
                                                                              
                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { topOfDeck } from '../../src/keywords/insight'
import { banishedBy } from '../../src/actions/banish'
import { effectiveMight } from '../../src/state/might'                         
import { onField } from './activated-batch2'
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const OGN_242_CARD_EFFECT =
  '支付{{1}}和{{黄色}}，{{横置}}：摧毁一名友方单位。查看你主牌堆顶部的五张牌。' +
  '你可以选择从中放逐一名战力比被摧毁单位最多高 1 点的单位卡牌，然后将其打出，无视费用。然后回收其余的卡牌。'

                              
export const OGN_242_LOOK = 5
export const OGN_242_OVER = 1
const OGN_242_PICK = 'hookPick'
                                                  
export const OGN_242_SKIP = 'skip'

                                                        
export function sacrificeTargets(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && onField(state, o))
    .map((o) => o.oid as string)
    .sort()
}

   
                                                   
                                              
                                                
                               
                                                               
                                                    
                                         
                                          
   
export function sacrificeMight(
  state: GameState, controller: PlayerId, target: string | undefined,
): number | null {
  if (target === undefined) return null
  const o = state.objects[target as ObjId]
  if (!o || o.controller !== controller || !isUnit(o) || !onField(state, o)) return null
  return effectiveMight(o).reference
}

   
                                          
                                                         
                                     
                                                       
   
export function hookCandidates(state: GameState, controller: PlayerId, destroyedMight: number): readonly ObjId[] {
  return topOfDeck(state, controller, OGN_242_LOOK).filter((oid) => {
    const o = state.objects[oid]
    return o !== undefined && isUnit(o) && o.baseMight <= destroyedMight + OGN_242_OVER
  })
}

export const OGN_242_SPEC: ActivatedSpec = {
  key: 'OGN-242:hook',
  label: '支付 1 法力和序理符能并{{横置}}:摧毁一名友方单位,看顶五张,放逐一名并无视费用打出',
  cost: { mana: 1, pips: [['yellow']] },
  tapSelf: true,
                                                           
                                                        
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId) => sacrificeTargets(state, controller),
                                                
  makeNextChoice: ({ selfOid, controller, target }) => (state, chosen): ChoiceRequest | null => {
    if (chosen[OGN_242_PICK] !== undefined) return null
    const might = sacrificeMight(state, controller, target)
    if (might === null) return null                                  
    const cands = hookCandidates(state, controller, might)
    if (cands.length === 0) return null                                
    return {
      itemId: `act:${selfOid}:OGN-242`,
      controller,
      key: OGN_242_PICK,
      prompt: `海兽钓钩:放逐一名战力不超过 ${might + OGN_242_OVER} 的单位牌(可以不放逐)`,
      candidates: [
        ...cands.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
        { id: OGN_242_SKIP, label: '不放逐' }, // §383.3.a「你可以选择」
      ],
    }
  },
  makeResolve: ({ selfOid, controller, target }) => (state: GameState, chosen): readonly GameEvent[] => {
    const seen = topOfDeck(state, controller, OGN_242_LOOK)
                                                      
                                                      
    const might = sacrificeMight(state, controller, target)
    const out: GameEvent[] = []
    if (might !== null) {
                                                                        
      out.push({
        kind: 'destroy', target: target as ObjId,
        source: selfOid as ObjId, sourcePlayer: controller,
      } as GameEvent)
    }
    const picked = might === null ? undefined : chosen?.[OGN_242_PICK]
                                              
                                                                                 
                                                                            
                                                                                            
                                                 
    const banishOid = picked !== undefined && might !== null && seen.includes(picked as ObjId)
      && hookCandidates(state, controller, might).includes(picked as ObjId) ? (picked as ObjId) : undefined
    const rest = seen.filter((oid) => oid !== banishOid)
                                                   
    if (banishOid !== undefined) out.push({ kind: 'banish', target: banishOid, by: selfOid as ObjId } as GameEvent)
    if (rest.length > 0) out.push({ kind: 'recycle', player: controller, objs: rest } as GameEvent)
    return out
  },
}

export const HOOK_TO = 'hookTo'               

                                                       
export function makeHookPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-242:play:${selfOid}`, rawId: true, sourceDefId: 'OGN-242',
    event: 'banished', by: 'any', // 认的是"我放逐的",不是"我引发的这批"(铁律153)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        const card = (ev as unknown as { card?: ObjId }).card
        return card !== undefined && banishedBy(state, selfOid).includes(card)
      },
    }],
                                                                                  
    nextChoice: (state: GameState, ev: GameEvent, chosen) => {
      if (chosen[HOOK_TO] !== undefined) return null
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o || !banishedBy(state, selfOid).includes(card as ObjId)) return null                                             
      return playFromEffectChoice(state, controller, o.defId, {
        itemId: `trig:OGN-242:play:${selfOid}`, controller, key: HOOK_TO, prompt: '海兽钓钩:把它打出到哪里?',
      }, chosen)
    },
    effect: (state: GameState, ev: GameEvent, chosen): readonly GameEvent[] => {
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o) return []
                                                                                  
      const x = optionalExtraResolve(state, controller, o.defId, HOOK_TO, chosen)                                                        
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[HOOK_TO], x.grant)                        
      if (dest === undefined) return []
      return [...x.pre, { kind: 'playFree', obj: card, player: controller, to: dest, ...x.flags } as GameEvent, ...x.post]
    },
  }, selfOid, controller)
}

export const OGN_242: Card = {
  id: 'OGN-242', cardNo: 'OGN·242/298', name: '海兽钓钩', category: 'equipment',
  domains: ['yellow'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '付{1}{黄}+横置+摧毁一名友方单位:看顶五张,放逐一名不超其战力+1的单位并无视费用打出' }],
}
