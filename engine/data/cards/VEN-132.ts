                                                                  
                                             
                  
                              
  
                                                                  
                                                                      
                                                       
                                                              
                                     
  
                                                                
                                                                
  
                                          
                                                                   
                                                                  
                                                                   
                                                                           
                                            
                                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { CARD_NAMES } from '../cardNames'
import { CARD_CATEGORIES } from '../cardCategories'

export const VEN_132_CARD_EFFECT =
  '当你打出我时，宣告一个法术。\n' +
  '如果我位于战场上，则对手无法打出与其同名的法术。'

   
                                                  
                                                                    
                                                             
   
export const VEN_132_DECLARE_KEY = 'ven132SpellName'
                
export const VEN_132_ASK = 'fallenKittyDeclare'

   
                            
                                                 
                                                                    
   
export function declarableSpellNames(): readonly string[] {
  const all = new Set<string>()
  for (const [defId, cat] of Object.entries(CARD_CATEGORIES)) {
    if (cat !== 'spell') continue
    const n = CARD_NAMES[defId]
    if (n !== undefined && n !== '') all.add(n)
  }
  return [...all].sort()
}

                                         
export function declaredSpellOf(state: GameState, selfOid: ObjId): string | undefined {
  return state.objects[selfOid]?.declared?.[VEN_132_DECLARE_KEY]
}

                          
export function makeFallenKittyTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `VEN-132:declare:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'VEN-132',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【我】时」
    nextChoice: (_state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[VEN_132_ASK] !== undefined) return null
      const names = declarableSpellNames()
      if (names.length === 0) return null
      return {
        itemId: `trig:${id}`, controller, key: VEN_132_ASK,
        prompt: '坠落猫咪:宣告一个法术(我在战场上时,对手无法打出同名法术)',
        candidates: names.map((n) => ({ id: n, label: n })),
      }
    },
    effect: (_state: GameState, _ev, chosen): readonly GameEvent[] => {
      const name = chosen?.[VEN_132_ASK]
                                
      if (name === undefined || !declarableSpellNames().includes(name)) return []
      return [{ kind: 'declare', target: selfOid, key: VEN_132_DECLARE_KEY, value: name } as GameEvent]
    },
  }, selfOid, controller)
}

   
                                                         
                                                                  
                                                               
   
export function ven132BansSpell(state: GameState, player: PlayerId, defId: string): boolean {
  if (CARD_CATEGORIES[defId] !== 'spell') return false        
  const name = CARD_NAMES[defId]
  if (name === undefined) return false
  return Object.values(state.objects).some((o) => {
    if (o.defId !== 'VEN-132') return false
    if (state.zones[o.zone]?.kind !== 'battlefield') return false              
    if (o.controller === player) return false                       
    return o.declared?.[VEN_132_DECLARE_KEY] === name
  })
}

export const VEN_132: Card = {
  id: 'VEN-132', cardNo: 'VEN·132', name: '坠落猫咪', category: 'unit',
  domains: ['yellow'], energy: 2, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时宣告一个法术;我在战场上时对手无法打出同名法术' }],
}
