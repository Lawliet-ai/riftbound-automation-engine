                                                                 
                                                  
                            
                                        
  
                                     
                                                  
                                                                
                             
                                                      
                                                 
                                                                     
                                                      
                                                 
                                            
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'

export const UNL_118_CARD_EFFECT =
  '你造成的任意数量伤害，都足以将敌方单位摧毁。\n'
  + '当你打出我时，在每个位置选择最多一名敌方单位。对其造成1点伤害。'

                                              
const DRAGON_IDS = new Set(['UNL-118', 'UNL-118a'])

   
                                                               
                                                        
                                         
   
export function dragonLethal(state: GameState, o: GameObject): boolean {
  if (o.damage <= 0) return false
  const by = o.damagedBy ?? []
  if (by.length === 0) return false
  for (const g of Object.values(state.objects)) {
    if (!DRAGON_IDS.has(g.defId)) continue
    const k = state.zones[g.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') continue         
    if (g.controller === o.controller) continue                   
    if (by.includes(g.controller as string)) return true                   
  }
  return false
}

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { zonesByKind } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'

const DRAGON_PICK = 'dragonAt:'                           

                                          
function allPositions(state: GameState): readonly string[] {
  return [...zonesByKind(state, 'battlefield'), ...zonesByKind(state, 'base')].map((z) => z.id as string).sort()
}

                               
function foesAt(state: GameState, zoneId: string, controller: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => (o.zone as string) === zoneId && isUnit(o) && o.controller !== controller)
    .map((o) => o.oid).sort()
}

                                           
export function makeDragonBreathTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-118-breath:${selfOid}`, rawId: true, sourceDefId: 'UNL-118',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】被打出时」(㊼ ★710 纳什)
    nextChoice: (state: GameState, _ev, chosen) => {
                                                  
      for (const zid of allPositions(state)) {
        if (chosen[DRAGON_PICK + zid] !== undefined) continue
        const cands = foesAt(state, zid, controller)
        if (cands.length === 0) continue                     
        return {
          itemId: `trig:UNL-118-breath:${selfOid}`, controller, key: DRAGON_PICK + zid, isTarget: true,
          prompt: `远古巨龙:在 ${zid} 选择最多一名敌方单位(受 1 点伤害)`,
          candidates: [
            ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
            { id: 'skip', label: '此位置不选(「最多一名」)' },
          ],
        }
      }
      return null
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const out: GameEvent[] = []
      for (const zid of allPositions(state)) {
        const pick = chosen?.[DRAGON_PICK + zid]
        if (pick === undefined || pick === 'skip') continue
                                                     
        const o = state.objects[pick as ObjId]
        if (!o || (o.zone as string) !== zid || o.controller === controller) continue
                                                    
        out.push({ kind: 'damage', target: pick as ObjId, amount: 1, source: selfOid, sourcePlayer: controller } as GameEvent)
      }
      return out
    },
  }, selfOid, controller)
}

export const UNL_118: Card = {
  id: 'UNL-118', cardNo: 'UNL-118/219', name: '远古巨龙', category: 'unit',
  domains: ['orange'], energy: 12, power: 10, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '你造成的任意伤害足以摧毁敌方单位(dragonLethal×extraLethal ★728);打出时每位置选最多一名敌方各1点(makeDragonBreathTrigger)' },
  ],
}

                                                    
export const UNL_118A: Card = { ...UNL_118, id: 'UNL-118a', cardNo: 'UNL-118a/219' }
