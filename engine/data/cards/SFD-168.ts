                                                                
                                                
  
                              
                                                               
                                                                      
                                                         
                                                                      
                  
                                                     
                                                     
                                                
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId, ZoneId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { MINION } from './reprint-batch'
import { tokenDropZones } from './token-spells'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       
                                            
export const SFD_168_HASTE_KEYS: readonly string[] = [1, 2, 3].map((i) => hasteKeyOf('SFD-168:minions', i))

export const SFD_168_CARD_EFFECT = '{{横置}}：打出三名1{{S}}的“随从”。（你可以将他们打出到不同的位置。）'

                              
export const SFD_168_COUNT = 3
const SFD_168_KEY = 'SFD168drop'

                                        
export const sfd168Key = (i: number): string => `${SFD_168_KEY}${i}`

                                     
export function sfd168Answered(chosen: Readonly<Record<string, string>> | undefined): readonly string[] {
  const out: string[] = []
  for (let i = 0; i < SFD_168_COUNT; i++) {
    const v = chosen?.[sfd168Key(i)]
    if (v === undefined) break
    out.push(v)
  }
  return out
}

export const SFD_168_SPEC: ActivatedSpec = {
  key: 'SFD-168:minions',
  label: '{{横置}}:打出三名战力 1 的"随从"(可分别选落点)',
  cost: {},
  tapSelf: true,
  target: 'none',
                                                              
  makeNextChoice: ({ selfOid, controller }) => (state: GameState, chosen): ChoiceRequest | null => {
    const done = sfd168Answered(chosen).length
    if (done >= SFD_168_COUNT) {
                                                                                                    
      for (let i = 0; i < SFD_168_COUNT; i++) {
        const q = spawnTokenHasteChoice(state, controller, MINION, { itemId: `act:${selfOid}:SFD-168`, key: SFD_168_HASTE_KEYS[i]!, label: '随从' }, chosen, hastePaidSoFar(chosen, SFD_168_HASTE_KEYS.slice(0, i)))
        if (q !== null) return q
      }
      return null
    }
    const zones = tokenDropZones(state, controller)
    if (zones.length === 0) return null                               
    return {
      itemId: `act:${selfOid}:SFD-168`,
      controller,
      key: sfd168Key(done),
      prompt: `先锋军备:第 ${done + 1} 名"随从"打到哪里(共 ${SFD_168_COUNT} 名,可以打到不同位置)`,
      candidates: zones.map((z) => ({ id: z, label: z })),
    }
  },
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
                                                                           
    const pre: GameEvent[] = []
    let paid = 0
    const spawns = sfd168Answered(chosen).map((zone, i) => {
      const x = spawnTokenHasteResolve(state, controller, MINION, SFD_168_HASTE_KEYS[i]!, chosen, hasteCostTimes(paid))
      if (x.ready) paid++
      pre.push(...x.pre)
      return { kind: 'spawnToken', spec: MINION, zone: zone as ZoneId, owner: controller, ...(x.ready ? { ready: true } : {}) } as GameEvent
    })
    return [...pre, ...spawns]
  },
}

export const SFD_168: Card = {
  id: 'SFD-168', cardNo: 'SFD·168/221', name: '先锋军备', category: 'equipment',
  domains: ['yellow'], energy: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置]打出三名1[M]随从,落点各选一次(SFD_168_SPEC)' }],
}
