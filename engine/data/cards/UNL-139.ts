                                                                    
                                                            
                                                  
                                       
                                                  
                          
  
                                                 
                                                                
                                                                                 
                                    
                                                      
                                                     
                                       
                                                                 
                                                        
                                                        
                                                               
                                         
                                                             
                                             
import type { Card } from '../../src/dsl/card'
import type { ChainItem } from '../../src/loop/chain'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { opponentsOf } from './OGN-156'
import { unitsInHand } from './SFD-111'                                

export const UNL_139_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '选择一处战场。让一名对手展示自己的手牌。你可以从中选择一名单位。'
  + '该对手将该单位打出到该战场，无视一切费用。若其如此做，则进行一次：{{眩晕}}该单位。'
  + '（使其在本回合内无法造成战斗伤害。）'

export const UNL_139_BF_KEY = 'spikeBf'
export const UNL_139_PICK_KEY = 'spikePick'
export const UNL_139_SKIP = '__skip__'

                                                         
export const spikeTag = (movedCardOid: string): string => `spike-of:${movedCardOid}`

   
                                                         
                                                    
                                                                    
                       
                                                     
                                             
                                                             
                                                      
                                                                                 
                                                                           
                                   
   
export function foeHandUnits(state: GameState, foe: string): string[] {
  return unitsInHand(state, foe as PlayerId)
}

   
                                                               
                                                                  
                       
   
export function makeSpikeStunItem(movedCardOid: string, controller: PlayerId): ChainItem {
  const tag = spikeTag(movedCardOid)
  return {
    id: `UNL-139-embed-stun:${movedCardOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    resolve: (state): readonly GameEvent[] =>
      Object.values(state.objects)
        .filter((o) => o.counters[tag] === 1
          && ((k) => k === 'battlefield' || k === 'base')(state.zones[o.zone]?.kind))
        .map((o) => ({ kind: 'stun', target: o.oid } as GameEvent)),
  }
}

export const UNL_139_SPEC: PlaySpec = {
  defId: 'UNL-139', cardNo: 'UNL-139/219', name: '透骨尖钉', kind: 'spell',
  cost: { mana: 2, pips: [['purple']] }, // ㊶ cardCosts 实测 2 法力 1 紫 pip
  keywords: ['待命'],
  target: 'none', // 战场走问链;从对手手牌挑牌不是目标选取(§355.10.a)
  legalTargets: (): string[] => [],
                                                                        
                                                              
                                                                             
                              
                                                                           
                                                                  
                                                       
                                                                           
  makeConfirmChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                        
    if (chosen[UNL_139_BF_KEY] !== undefined) return null
    const bfs = zonesByKind(state, 'battlefield').map((z) => z.id as string)
    if (bfs.length === 0) return null
    return {
      itemId: `spell:${movedCardOid}:UNL-139`, controller, key: UNL_139_BF_KEY,
      prompt: '透骨尖钉:选择一处战场',
      candidates: bfs.map((z) => ({ id: z, label: z })),
    }
  },
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                          
                                                            
    if (chosen[UNL_139_PICK_KEY] !== undefined) return null
                                                         
    if (chosen[UNL_139_BF_KEY] === undefined) return null
    const foe = opponentsOf(state, controller)[0]
    if (foe === undefined) return null
    const units = foeHandUnits(state, foe)
    if (units.length === 0) return null                      
    return {
      itemId: `spell:${movedCardOid}:UNL-139`, controller, key: UNL_139_PICK_KEY,
      prompt: '透骨尖钉:对手展示手牌——可从中选一名单位(他将免费打出到所选战场并被眩晕)',
      candidates: [
        ...units.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        { id: UNL_139_SKIP, label: '不选(「可以」)' },
      ],
    }
  },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    const bf = chosen?.[UNL_139_BF_KEY]
    const pick = chosen?.[UNL_139_PICK_KEY]
    if (bf === undefined || pick === undefined || pick === UNL_139_SKIP) return []
    if (state.zones[bf as ZoneId]?.kind !== 'battlefield') return []              
    const foe = opponentsOf(state, controller)[0]
    if (foe === undefined || !foeHandUnits(state, foe).includes(pick)) return []                    
    return [
                                              
                               
      { kind: 'playFree', obj: pick as ObjId, player: foe as PlayerId, to: bf as ZoneId, tag: spikeTag(movedCardOid) } as GameEvent,
                                              
      { kind: 'enqueueItem', item: makeSpikeStunItem(movedCardOid, controller) } as GameEvent,
    ]
  },
}

export const UNL_139: Card = {
  id: 'UNL-139', cardNo: 'UNL-139/219', name: '透骨尖钉', category: 'spell',
  domains: ['purple'], energy: 2, keywords: ['待命'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选战场;可从对手手牌挑一单位,他免费打出到该处;内嵌:眩晕它(UNL_139_SPEC)' }],
}
