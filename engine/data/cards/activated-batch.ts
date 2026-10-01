                     
  
                                    
                                            
                                                     
                                                         
                                                               
  
                               
                                                                     
                                               
                                              
                                                             
  
                                                                   
                                                   

import { MINION } from './reprint-batch'
import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { resolveSelector } from '../../src/dsl/selector'                          
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       
                                        
export const OGN_265_HASTE_KEY = hasteKeyOf('OGN-265:minion')

   
                                                                 
                                                         
                                                                                    
                                                               
                                                                       
                                            
                                          
                                                                  
                                                      
                                                                             
                                                                   
                                                   
                                                                       
   
export function fieldedUnits(state: GameState, side?: { readonly of: PlayerId; readonly friendly: boolean }): ObjId[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      if (k !== 'battlefield' && k !== 'base') return false
      if (!isUnit(o)) return false
      if (side) return side.friendly ? o.controller === side.of : o.controller !== side.of
      return true
    })
    .map((o) => o.oid)
    .sort()
}

   
                                             
                                                                           
                                                              
   
export function fieldedUnitCandidates(state: GameState, controller: PlayerId): string[] {
  return resolveSelector(state, { type: 'unit', fielded: true }, controller).map((oid) => oid as string)
}

   
                                                      
                                                                 
                                                   
                                             
                                                         
   
export function grantKeywordEvent(
  id: string, target: string, keyword: string,
     
                                                      
                                                            
                                                     
                            
     
     
                                                                                
                                                 
                                               
                                          
     
  duration: 'thisTurn' | 'permanent' | 'thisCombat' = 'thisTurn',
): GameEvent {
  return {
    kind: 'addEffect',
    effect: {
      id: `${id}:${target}`, duration, fromPassive: false,
      predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
      modification: { kind: 'grantKeyword', keyword },
    },
  } as GameEvent
}

                                               
export function pumpEvent(id: string, target: string, delta: number, floor?: number): GameEvent {
  return {
    kind: 'addEffect',
    effect: {
      id: `${id}:${target}`, duration: 'thisTurn', fromPassive: false,
      predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
      modification: { kind: 'addMight', delta, ...(floor !== undefined ? { floor } : {}) },
    },
  } as GameEvent
}

                                                                
                                            
                                                       
                                       
                                         
export const OGN_090_CARD_EFFECT = '{{横置}}：让一名单位在本回合内{{S}}-1，不得低于1{{S}}。'
export const OGN_090_SPEC: ActivatedSpec = {
  key: 'OGN-090:weaken',
  label: '{{横置}}:让一名单位本回合战力-1(不得低于 1)',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] => fieldedUnits(state) as string[],
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [pumpEvent('OGN-090:weaken', target, -1, 1)],
}
export const OGN_090: Card = {
  id: 'OGN-090', cardNo: 'OGN·090/298', name: '懊悔法球', category: 'equipment',
  domains: ['blue'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置]让一名单位本回合-1(不低于1)(OGN_090_SPEC)' }],
}

                                                                
                                 
                                          
export const SFD_052_CARD_EFFECT = '{{横置}}：让一名单位在本回合内{{S}}+3。'
export const SFD_052_SPEC: ActivatedSpec = {
  key: 'SFD-052:pump',
  label: '{{横置}}:让一名单位本回合战力+3',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] => fieldedUnits(state) as string[],
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [pumpEvent('SFD-052:pump', target, 3)],
}
export const SFD_052: Card = {
  id: 'SFD-052', cardNo: 'SFD·052/221', name: '玄冰之心', category: 'equipment',
  domains: ['green'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置]让一名单位本回合+3(SFD_052_SPEC)' }],
}

                                                                 
                                            
                                           
                                             
                                          
                                                            
export const OGN_184_CARD_EFFECT = '支付{{1}}，{{横置}}：将战场上的一名友方单位移动到其所属的基地。'
export const OGN_184_SPEC: ActivatedSpec = {
  key: 'OGN-184:recall',
  label: '支付 1 法力并{{横置}}:将战场上的一名友方单位移回其基地',
  cost: { mana: 1 },
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, controller): string[] =>
    Object.values(state.objects)
      .filter((o) => state.zones[o.zone]?.kind === 'battlefield'                 
        && isUnit(o)                                                            
        && o.controller === controller)                                 
      .map((o) => o.oid as string)
      .sort(),
  makeResolve: ({ target }) => (state): readonly GameEvent[] => {
    if (target === undefined) return []
    const o = state.objects[target as ObjId]
    if (!o) return []
    const to = `base:${o.controller}` as ZoneId
    if ((o.zone as string) === (to as string)) return []
    return [
      { kind: 'zoneChange', obj: o.oid, to },
      { kind: 'unitMoved', unit: o.oid, player: o.controller, from: o.zone, to }, // §446.1
    ]
  },
}
export const OGN_184: Card = {
  id: 'OGN-184', cardNo: 'OGN·184/298', name: '塞壬号', category: 'equipment',
  domains: ['purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '付1横置:把战场上一名友方单位移回其基地(OGN_184_SPEC)' }],
}

                                                                   
                                           
  
                                           
                              
                                 
                                                
                                                 
                                     
                         
export const OGN_259_CARD_EFFECT = '支付{{2}}，{{横置}}：在战场和其所属基地之间移动一名友方单位。'

const YASUO_DEST_KEY = 'yasuoDest'
   
                                                 
                                       
   
export function yasuoDestinations(state: GameState, target: string | undefined): string[] {
  if (target === undefined) return []
  const o = state.objects[target as ObjId]
  if (!o || state.zones[o.zone]?.kind !== 'base') return []
  return zonesByKind(state, 'battlefield').map((z) => z.id).filter((z) => z !== (o.zone as string))
}
                                                                 
function yasuoDestRequest(selfOid: string, controller: PlayerId, state: GameState, target: string | undefined): ChoiceRequest | null {
  const bfs = yasuoDestinations(state, target)
  if (bfs.length === 0) return null
  return {
    itemId: `act:${selfOid}:OGN-259`,
    controller,
    key: YASUO_DEST_KEY,
    prompt: '疾风剑豪:把这名单位移动到哪一处战场?',
    candidates: bfs.map((z) => ({ id: z, label: z })),
  }
}
export const OGN_259_SPEC: ActivatedSpec = {
  key: 'OGN-259:shuttle',
  label: '支付 2 法力并{{横置}}:在战场与其所属基地之间移动一名友方单位',
  cost: { mana: 2 },
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, controller): string[] =>
    fieldedUnits(state, { of: controller, friendly: true }) as string[],
                                                                                    
                                                                
                        
                                                                            
                                                        
                                                            
                                                                            
                                                               
                                                         
                                                                
                                                
                                                                              
                                                                            
  choiceTiming: 'confirm',
                                                                             
                                                                        
                                                                       
  firstAskOptional: true,
  makeNextChoice: ({ selfOid, controller, target }) => (state, chosen) =>
    chosen[YASUO_DEST_KEY] !== undefined ? null : yasuoDestRequest(selfOid, controller, state, target),
  makeResolve: ({ target }) => (state, chosen): readonly GameEvent[] => {
    if (target === undefined) return []
    const o = state.objects[target as ObjId]
    if (!o) return []
                                                 
    const frozen = chosen?.[YASUO_DEST_KEY]
    const to = (frozen !== undefined ? frozen : `base:${o.controller}`) as ZoneId | undefined
    if (to === undefined || !state.zones[to]) return []              
    if ((o.zone as string) === (to as string)) return []                      
                                                                          
    if (frozen !== undefined && !yasuoDestinations(state, target).includes(to)) return []
    return [
      { kind: 'zoneChange', obj: o.oid, to },
      { kind: 'unitMoved', unit: o.oid, player: o.controller, from: o.zone, to }, // §446.1
    ]
  },
}
const yasuo = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '疾风剑豪', category: 'legend',
  domains: ['green', 'purple'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '付2横置:友方单位在战场与其基地之间往返(OGN_259_SPEC)' }],
})
export const OGN_259: Card = yasuo('OGN-259', 'OGN·259/298')

                                                                   
                                       
  
                                                   
                                           
                                                           
                                              
export const OGN_265_CARD_EFFECT = '支付{{1}}，{{横置}}：打出一名1{{S}}的“随从”。'

                                                 
function playableZonesFor(state: GameState, controller: PlayerId): string[] {
  const bfs = zonesByKind(state, 'battlefield')
    .filter((z) => z.contents.some((oid) => {
      const u = state.objects[oid]
      return !!u && u.controller === controller && !u.defId.startsWith('rune:')
    }))
    .map((z) => z.id)
  return [`base:${controller}`, ...bfs]
}

export const OGN_265_SPEC: ActivatedSpec = {
  key: 'OGN-265:minion',
  label: '支付 1 法力并{{横置}}:打出一名战力 1 的"随从"',
  cost: { mana: 1 },
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, controller): string[] => playableZonesFor(state, controller), // 目标=落点
                                                                        
  makeNextChoice: ({ selfOid, controller }) => (state, chosen) =>
    spawnTokenHasteChoice(state, controller, MINION, { itemId: `act:${selfOid}:OGN-265:minion`, key: OGN_265_HASTE_KEY, label: '随从' }, chosen),
  makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
    if (target === undefined) return []
    const x = spawnTokenHasteResolve(state, controller, MINION, OGN_265_HASTE_KEY, chosen)                                       
    return [...x.pre, {
      kind: 'spawnToken',
      spec: MINION, // ㊼ 第314轮收口
      zone: target as ZoneId,
      owner: controller,
      ...(x.ready ? { ready: true } : {}),
    } as GameEvent]
  },
}
const arcane = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '奥术先驱', category: 'legend',
  domains: ['blue', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '付1横置:打出一名1[M]随从(OGN_265_SPEC)' }],
})
export const OGN_265: Card = arcane('OGN-265', 'OGN·265/298')

                                                  
export const ACTIVATED_BATCH_DEFIDS: readonly string[] = [
  'OGN-090', 'SFD-052', 'OGN-184',
  'OGN-259', 'OGN-305', 'FND-259',
  'OGN-265', 'OGN-308', 'FND-265',
]
