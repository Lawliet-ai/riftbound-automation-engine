                                                                     
                                             
                                                 
                                       
  
                                            
                                                                      
                                                                          
                                           
                                            
                                                                                           
                                                                                            
                                            
                                                                               
                                 
  
                                                                                 
                                             
                                                                   
                                       
                                                                 
                                                          
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { allCardTags, objectHasCardTag } from '../cardTagQuery'
import { fieldedUnits } from './activated-batch'

export const UNL_138_CARD_EFFECT =
  '打出此牌时，宣告一种属性标签。（如：“厄运小姐”、“德玛西亚”、“魄罗”等均为属性标签。）\n' +
  '{{横置}}：让一名具有该属性标签的单位在本回合内{{S}}-2。'

                                                      
export const UNL_138_DECLARE_KEY = 'hitListTag'
                
export const UNL_138_ASK = 'hitListDeclare'
                
export const UNL_138_PICK = 'hitListVictim'
                                 
export const UNL_138_MALUS = 2

   
                              
                                                             
                                                                          
   
export function declarableTags(): readonly string[] {
                                                                           
                                                
  return allCardTags()
}

                                  
export function declaredTagOf(state: GameState, selfOid: ObjId): string | undefined {
  return state.objects[selfOid]?.declared?.[UNL_138_DECLARE_KEY]
}

   
                            
                                             
   
export function hitListVictims(state: GameState, selfOid: ObjId): readonly ObjId[] {
  const tag = declaredTagOf(state, selfOid)
  if (tag === undefined) return []
                                                       
  return fieldedUnits(state).filter((oid) => {
    const o = state.objects[oid]
    return o !== undefined && objectHasCardTag(o, tag)
  })
}

                           
export function makeHitListTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `UNL-138:declare:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'UNL-138',
    event: 'playUnit', by: 'you', // 装备也走 PLAY_UNIT 通道打出(§149.2)
    when: [{ kind: 'subjectIsSelf' }], // 「打出【此牌】时」
    nextChoice: (state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[UNL_138_ASK] !== undefined) return null
      const tags = declarableTags()
      if (tags.length === 0) return null
                                                                  
      return {
        itemId: `trig:${id}`, controller, key: UNL_138_ASK,
        prompt: '夺命名单:宣告一种属性标签',
        candidates: tags.map((t) => ({ id: t, label: t })),
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const tag = chosen?.[UNL_138_ASK]
                               
      if (tag === undefined || !declarableTags().includes(tag)) return []
      return [{ kind: 'declare', target: selfOid, key: UNL_138_DECLARE_KEY, value: tag } as GameEvent]
    },
  }, selfOid, controller)
}

                                                                
const malus = compileEffect({
  then: [{
    op: 'addMight',
    target: { ref: 'chosen', key: UNL_138_PICK },
    delta: -UNL_138_MALUS,
    duration: 'thisTurn',
    id: 'UNL-138-malus',
  }],
})

                                        
export const UNL_138_SPEC: ActivatedSpec = {
  key: 'UNL-138:hitList',
  label: `{{横置}}:让一名具有【宣告的那个属性标签】的单位本回合战力-${UNL_138_MALUS}`,
  cost: {}, // 冒号前只有 [横置]
  tapSelf: true,
  target: 'none',
                                     
  available: (state, _c, selfOid) => hitListVictims(state, selfOid as ObjId).length > 0,
                                                                    
                                                                                
                                                                    
  choiceTiming: 'confirm',
  makeNextChoice:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[UNL_138_PICK] !== undefined) return null
      const cands = hitListVictims(state, selfOid as ObjId)
      if (cands.length === 0) return null
      const tag = declaredTagOf(state, selfOid as ObjId) ?? '?'
      return {
        itemId: `act:${selfOid}:UNL-138`, controller, key: UNL_138_PICK,
        prompt: `夺命名单:让哪一名「${tag}」单位本回合战力-${UNL_138_MALUS}`,
        isTarget: true, // ★1782 让一名具有该属性标签的单位…-2
        candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    },
  makeResolve:
    ({ selfOid, controller }: { selfOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[UNL_138_PICK]
      if (pick === undefined) return []
                                           
      if (!hitListVictims(state, selfOid as ObjId).includes(pick as ObjId)) return []
                                                                    
                                                                                                      
      return malus({ state, selfOid: selfOid as ObjId, controller, ev: undefined as never, chosen: chosen ?? {} })
    },
}

export const UNL_138: Card = {
  id: 'UNL-138', cardNo: 'UNL-138/219', name: '夺命名单', category: 'equipment',
  domains: ['purple'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时宣告一种属性标签;[横置]让一名具有该标签的单位本回合[S]-2' }],
}
