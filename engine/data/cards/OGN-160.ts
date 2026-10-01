                                                                  
                                                              
                                                 
                                                
  
                                   
                                                                      
                                                         
                          
                                                                                       
                                                               
                                                                           
                                                           
                                                  
  
                                                                             
                                                                  
                                                  
                                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { topOfDeck } from '../../src/keywords/insight'
import { banishedBy } from '../../src/actions/banish'
import { voidSproutChoice, voidSproutRecycleEvents } from './SFD-018'        
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const OGN_160_CARD_EFFECT =
  '在你的回合结束时，从主牌堆顶部开始逐一展示卡牌，直到翻出一名单位为止，将其放逐，然后将其打出，无视费用，并回收其余的卡牌。'

   
                             
                                                                 
                                                 
   
export function revealUntilUnit(
  state: GameState,
  player: PlayerId,
  skip?: ObjId, // ★749 虚空兽苗回收的顶一张:翻找时跳过(=回收去底后从新顶继续翻)
): { readonly unit?: ObjId; readonly rest: readonly ObjId[] } {
  const deckSize = state.zones[`mainDeck:${player}` as never]?.contents.length ?? 0
  const rest: ObjId[] = []
  for (const oid of topOfDeck(state, player, deckSize)) { // 顶→下
    if (oid === skip) continue
    const o = state.objects[oid]
    if (o && isUnit(o)) return { unit: oid, rest }
    rest.push(oid)
  }
  return { rest }
}

                                   
export function makeAuroraBanishTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-160:banish:${selfOid}`, rawId: true, sourceDefId: 'OGN-160',
    event: 'endOfTurn', by: 'you',
                                                                                 
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
    postChoice: (state, chosen) => voidSproutChoice(state, controller, chosen), // ★749 兽苗前置
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
                                                    
      const rec = voidSproutRecycleEvents(state, controller, chosen)
      const skip = rec.length > 0 ? (rec[0] as unknown as { objs: readonly ObjId[] }).objs[0] : undefined
      const { unit, rest } = revealUntilUnit(state, controller, skip)
      const out: GameEvent[] = [...rec]
                                                          
                                                         
      const shown = [...rest, ...(unit !== undefined ? [unit] : [])]
      if (shown.length > 0) out.push({ kind: 'revealed', player: controller, cards: shown } as GameEvent)
                                                            
      if (unit !== undefined) out.push({ kind: 'banish', target: unit, by: selfOid } as GameEvent)
      if (rest.length > 0) out.push({ kind: 'recycle', player: controller, objs: rest } as GameEvent)
      return out
    },
  }, selfOid, controller)
}

export const AURORA_TO = 'auroraTo'               

                                
export function makeAuroraPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-160:play:${selfOid}`, rawId: true, sourceDefId: 'OGN-160',
    event: 'banished', by: 'any', // ⚠️ 认的是"我放逐的",不是"我引发的这批事件"(铁律153)
    when: [{
      kind: 'custom',
                                                                               
                                             
      test: (ev: GameEvent, state: GameState) => {
        const card = (ev as unknown as { card?: ObjId }).card
        return card !== undefined && banishedBy(state, selfOid).includes(card)
      },
    }],
                                                                                  
    nextChoice: (state: GameState, ev: GameEvent, chosen) => {
      if (chosen[AURORA_TO] !== undefined) return null
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o || !banishedBy(state, selfOid).includes(card as ObjId)) return null                                             
      return playFromEffectChoice(state, controller, o.defId, {
        itemId: `trig:OGN-160:play:${selfOid}`, controller, key: AURORA_TO, prompt: '闪耀极光:把它打出到哪里?',
      }, chosen)
    },
    effect: (state: GameState, ev: GameEvent, chosen): readonly GameEvent[] => {
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o) return []
                                                                                    
      const x = optionalExtraResolve(state, controller, o.defId, AURORA_TO, chosen)                                                        
      const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[AURORA_TO], x.grant)                        
      if (dest === undefined) return []
      return [...x.pre, { kind: 'playFree', obj: card, player: controller, to: dest, ...x.flags } as GameEvent, ...x.post]
    },
  }, selfOid, controller)
}

export function makeAuroraTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeAuroraBanishTrigger(selfOid, controller), makeAuroraPlayTrigger(selfOid, controller)]
}

export const OGN_160: Card = {
  id: 'OGN-160', cardNo: 'OGN·160/298', name: '闪耀极光', category: 'equipment',
  domains: ['orange'], energy: 9, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我的回合结束:展示到单位为止,放逐它并无视费用打出,其余回收' }],
}
