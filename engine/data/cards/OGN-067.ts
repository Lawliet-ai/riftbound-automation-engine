                                                                    
                                             
                        
                                      
                          
  
                
                                                   
                                                                                              
                                                                                      
  
                                             
                                                     
                                                  
                                                   
                                                                                
                                     
                                                      
                                                            
                                                        
                                                       
                                                                        
                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { enemyUnitsOnField, moveUnitEvents } from './enemy-move'
import { makeHoldTrigger } from './combat-keywords'

export const OGN_067_CARD_EFFECT =
  '{{壁垒}}（我在战斗中首先承担伤害。）\n'
  + '每当你将我打出到一处战场时，你可以选择移动任意一名敌方单位到此处。\n'
  + '当我据守一处战场时，把我送回所属的手牌。'

                                                        
export const OGN_067_KEYWORDS: readonly string[] = ['壁垒']

                             
export const OGN_067_ASK = 'blitz067Foe'

   
                                                            
                                              
   
export function blitzHere(state: GameState, selfOid: ObjId): string | undefined {
  const me = state.objects[selfOid]
  if (!me) return undefined
  return state.zones[me.zone]?.kind === 'battlefield' ? (me.zone as string) : undefined
}

   
                 
                                                    
   
export function blitzPullTargets(state: GameState, selfOid: ObjId, controller: PlayerId): readonly string[] {
  const here = blitzHere(state, selfOid)
  if (here === undefined) return []
  return enemyUnitsOnField(state, controller)
    .filter((oid) => (state.objects[oid as ObjId]?.zone as string) !== here)
}

                                             
export function makeBlitzPullTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-067:pull:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'OGN-067',
    event: 'playUnit',
    by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」在效果开头 ⇒ 确认阶段决定
    when: [
      { kind: 'subjectIsSelf' }, // 「你将【我】打出」
                                                    
      { kind: 'custom', test: (_ev: GameEvent, state: GameState) => blitzHere(state, selfOid) !== undefined },
    ],
    nextChoice: (state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[OGN_067_ASK] !== undefined) return null
      const cands = blitzPullTargets(state, selfOid, controller)
      if (cands.length === 0) return null             
      return {
        itemId: `trig:${id}`, controller, key: OGN_067_ASK,
        prompt: '布里茨:把哪名敌方单位拉到我这处战场?',
        isTarget: true, // ★1781 §355.7:「移动任意一名敌方单位到此处」
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[OGN_067_ASK]
                                     
      if (pick === undefined || !blitzPullTargets(state, selfOid, controller).includes(pick)) return []
      return moveUnitEvents(state, pick, blitzHere(state, selfOid))
    },
  }, selfOid, controller)
}

   
                            
                                                                                      
   
export function makeBlitzHoldTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeHoldTrigger({ id: `OGN-067:hold:${selfOid}`, reward: 'returnSelfToOwnerHand' }, selfOid, controller)
}

export const makeBlitzTriggers = (selfOid: ObjId, controller: PlayerId): readonly Trigger[] =>
  [makeBlitzPullTrigger(selfOid, controller), makeBlitzHoldTrigger(selfOid, controller)]

export const OGN_067: Card = {
  id: 'OGN-067', cardNo: 'OGN·067/298', name: '布里茨', category: 'unit', // 英雄单位 → unit
  domains: ['green'], energy: 5, power: 5, keywords: [...OGN_067_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[壁垒] §465(战斗中首先承担伤害;引擎统一管)' },
    { kind: 'passive', describe: '打出到战场时可把一名敌方单位拉到此处(见同名工厂)' },
    { kind: 'passive', describe: '据守时把我送回所属的手牌(makeHoldTrigger 第四档)' },
  ],
}
