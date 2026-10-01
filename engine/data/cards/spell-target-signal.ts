                                                
  
                                 
                                    
                                           
                           
  
                     
                                                         
                                             
                                               
                                                                 
                                             
                                                                            
                                           

import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'

const spellTargetOf = (ev: GameEvent): string | undefined =>
  ev.kind === 'playSpell' ? (ev as { target?: string }).target : undefined

                                                   
                                                  
                                                  
                                                             
export const OGN_292_CARD_EFFECT = '每回合首次，当玩家将此处的一名友方单位选为法术目标时，该玩家抽一张牌。'
export const SFD_142_CARD_EFFECT = '每当你将我选为法术目标时，抽一张牌。'

                                                
export function makeOgn292Trigger(bfZoneId: ZoneId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-292:${bfZoneId}:${controller}`, rawId: true, sourceDefId: 'OGN-292',
                                                                   
                                                                   
    abilityKey: `OGN-292:${bfZoneId}`,
    event: 'playSpell', by: 'any',
    oncePerTurn: true, // §383.1「每回合首次」
    nthType: true,     // §383.1.b 同一批多满足只算一次
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「**你**对…使用法术」
      { kind: 'custom', test: (ev, state): boolean => {
        const t = spellTargetOf(ev)
        if (t === undefined) return false                      
        const o = state.objects[t as ObjId]
                                      
        return o !== undefined && isUnit(o) && o.controller === controller && o.zone === bfZoneId
      } },
    ],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 }],
  }, null, controller)
}

                                  
export function makeSfd142Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'SFD-142-targeted',
    event: 'playSpell', by: 'any',
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「**你**将我选为…」——对手选我不算
      { kind: 'custom', test: (ev): boolean => spellTargetOf(ev) === (selfOid as string) },
    ],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 }],
  }, selfOid, controller)
}

export const OGN_292: Card = {
  id: 'OGN-292', cardNo: 'OGN·292/298', name: '幻梦之树', category: 'battlefield',
  domains: [], energy: 0, power: 0, keywords: [], playModes: [], abilities: [],
}
export const SFD_142: Card = {
  id: 'SFD-142', cardNo: 'SFD·142/221', name: '贾尔·米达尔达', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }], abilities: [],
}
export const SPELL_TARGET_DEFIDS: readonly string[] = ['OGN-292', 'SFD-142']
