                                                                     
                                              
                                         
                                      
  
                                                        
                                                                  
                                                                   
                                                                
                                               
                
                          
                                                       
                                                   
                                                               
                                
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { GOLD_TOKEN } from './gear-triggers'

export const SFD_081_CARD_EFFECT =
  '当你打出我时，你和每名对手都可以选择打出一个休眠的“金币”装备指示物。'
  + '每有一名对手选择打出，你便再打出一个休眠的“金币”装备指示物。'

                                           
const pickKeyOf = (p: string): string => `gold:${p}`

                                                  
const goldFor = (p: string): GameEvent => ({
  kind: 'spawnToken', spec: GOLD_TOKEN,
  zone: asZoneId(`base:${p}`), owner: p as PlayerId, dormant: true,
} as GameEvent)

export function makeConArtistTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-081:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-081',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
                                                             
      for (const p of state.players) {
        const key = pickKeyOf(p as string)
        if (chosen[key] !== undefined) continue            
        return {
          itemId: `trig:SFD-081:${selfOid}`,
          controller: p,
          key,
          prompt: p === controller
            ? '大老千:你可以选择打出一个休眠的金币装备指示物'
            : '大老千:你可以选择打出一个休眠的金币(每有一名对手选择打出,其控制者再拿一个)',
          candidates: [
            { id: 'take', label: '打出一个休眠的金币' },
            { id: 'skip', label: '不打出(可选)' },
          ],
        }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const out: GameEvent[] = []
      let foeTakes = 0
      for (const p of state.players) {
        if (chosen?.[pickKeyOf(p as string)] !== 'take') continue
        out.push(goldFor(p as string))                          
        if (p !== controller) foeTakes += 1                          
      }
                                    
      for (let i = 0; i < foeTakes; i++) out.push(goldFor(controller as string))
      return out
    },
  }, selfOid, controller)
}

export const SFD_081: Card = {
  id: 'SFD-081', cardNo: 'SFD·081/221', name: '大老千', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时人人可选打出休眠金币;每有一名对手选打出我再拿一个(makeConArtistTrigger)' }],
}
