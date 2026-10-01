                                                                    
                                                            
                                                         
                                             
                                                    
  
                                                   
                                                  
                                                
  
                                                                          
                                                                   
                                                              
                                                                          
                                                       
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { banishedBy } from '../../src/actions/banish'

export const UNL_181_CARD_EFFECT =
  '当你打出一个法术时，如果消耗了不低于{{4}}法力，则你可以选择将该法术放逐。'
  + '如果以此方法放逐了四张法术牌，则将这些法术牌放入各自的废牌堆，召出四枚符文，并抽一张牌。'

export const UNL_181_MANA_FLOOR = 4
                                                         
                                                      

                                                  
export function makeJhinExileTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-181-exile:${selfOid}`, rawId: true, sourceDefId: 'UNL-181',
    event: 'playSpell',
    by: 'you', // 「当【你】打出」
    when: [{
      kind: 'custom',
                                                                
      test: (ev): boolean => ((ev as { readonly manaPaid?: number }).manaPaid ?? -1) >= UNL_181_MANA_FLOOR,
    }],
                                                              
                                                             
                                                             
                                                     
                                                        
                                                               
                                                      
                                                                
                                                       
                                                                              
                                                              
                                                              
                                             
    mayChoose: true, // ★1501【§383.3.a】那一问搬到**确认阶段**(依据见上:§383.2.a.1)
    effect: (state: GameState, ev): readonly GameEvent[] => {
      const cardOid = (ev as { readonly chainCardOid?: ObjId; readonly cardOid?: ObjId }).chainCardOid
        ?? (ev as { readonly cardOid?: ObjId }).cardOid
      if (cardOid === undefined) return []
      if (!state.chain.some((it) => it.kind === 'spell' && it.cardOid === cardOid)) return []
                                                                
      return [{ kind: 'markExileOnLeave', cardOid, by: selfOid } as GameEvent]
    },
  }, selfOid, controller)
}

export const UNL_181_COLLECT = 4

   
                                              
                                                                    
                                                                      
                                                          
   
export function makeJhinCollectTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-181-collect:${selfOid}`, rawId: true, sourceDefId: 'UNL-181',
    event: 'exiledOnLeave',
    by: 'any', // 判据全在 custom(by 字段是链项控制者,不是「谁的账」)
    when: [{
      kind: 'custom',
      test: (ev, state): boolean =>
        (ev as { readonly by?: ObjId }).by === selfOid
        && (state.banishLedger[selfOid as string] ?? []).length >= UNL_181_COLLECT,
    }],
    effect: (state: GameState): readonly GameEvent[] => {
      const collected = (state.banishLedger[selfOid as string] ?? []).slice(0, UNL_181_COLLECT)
      if (collected.length < UNL_181_COLLECT) return []                            
      const out: GameEvent[] = []
      const stillExiled = new Set(banishedBy(state, selfOid).map(String))                    
      for (const oid of collected) {
        const o = state.objects[oid]
        if (!o) continue                        
                                                               
                                                               
                                                                         
                                             
                                                                            
                                                       
                                                 
                                                                        
                                                     
        if (!stillExiled.has(String(oid))) continue
        out.push({ kind: 'zoneChange', obj: oid, to: `discard:${o.owner}` } as GameEvent)                 
      }
      out.push({ kind: 'summonRune', player: controller, count: 4 } as GameEvent)            
      out.push({ kind: 'draw', player: controller, count: 1 } as GameEvent)           
      out.push({ kind: 'clearBanishLedger', by: selfOid } as GameEvent)                  
      return out
    },
  }, selfOid, controller)
}

export const UNL_181: Card = {
  id: 'UNL-181', cardNo: 'UNL-181/219', name: '戏命师', category: 'legend',
  domains: ['red', 'blue'], energy: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出≥4法力法术时可选将其放逐(离链收尾);满四收集=第二段待接(makeJhinExileTrigger)' }],
}
