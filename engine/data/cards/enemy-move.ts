                              
  
                                                           
                                           
                                             
  
                                              
                               
                                             
                                                      
                                                 
                                 

import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import type { Card } from '../../src/dsl/card'
import type { PlaySpec } from '../../src/loop/playSpec'
import { zonesByKind } from '../../src/state/gameState'
import { moveRestricted } from '../../src/state/moveRestriction'
import { isUnit } from '../../src/state/cardTypes'
import { levelReached } from './level-self'
import { effectiveMight } from '../../src/state/might'                   
import { isAlone } from '../../src/keywords/alone'                                                                 

                                        
export function enemyUnitsOnField(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return (k === 'battlefield' || k === 'base') && isUnit(o) && o.controller !== controller
    })
    .map((o) => o.oid as string)
    .sort()
}

   
                                                   
                            
                                     
                                                               
                                                 
                                                         
                                                         
                                                  
                                               
                                                                 
                                     
   
export function unitsUpToMightOnField(
  state: GameState, maxMight: number | undefined,
): string[] {
  if (maxMight === undefined) return []
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return (k === 'battlefield' || k === 'base') && isUnit(o)
        && effectiveMight(o).reference <= maxMight
    })
    .map((o) => o.oid as string)
    .sort()
}

   
                                                      
                                                       
                                                 
                                                 
                                                           
                                                  
   
export function moveDestinations(state: GameState, unitOid: string): string[] {
  const o = state.objects[unitOid as ObjId]
  if (!o) return []
  return [`base:${o.controller}`, ...zonesByKind(state, 'battlefield').map((z) => z.id as string)]
    .filter((z) => z !== (o.zone as string))
}

   
                                   
  
                                                               
                                                                                               
                                                               
                                                                
                                                                      
                                                                
                                                 
   
export function askMoveDestination(args: {
  readonly state: GameState
  readonly chosen: Readonly<Record<string, string>>
  readonly key: string
  readonly itemId: string
  readonly controller: PlayerId
  readonly target: string | undefined
  readonly prompt: string
  readonly mandatory?: boolean
}): ChoiceRequest | null {
  const { state, chosen, key, itemId, controller, target, prompt, mandatory } = args
  if (target === undefined || chosen[key] !== undefined) return null
  const dests = moveDestinations(state, target)
  if (dests.length === 0) {
    if (mandatory === true) return { itemId, controller, key, prompt, candidates: [] }
    return null
  }
  return { itemId, controller, key, prompt, candidates: dests.map((z) => ({ id: z, label: z })) }
}

   
                                                           
                                                            
                                                                                   
                                            
                                                    
                                                                              
                                                              
                                                                              
                                                                    
                                       
                                                                        
                                                      
                                                             
                         
   
export function moveUnitEvents(
  state: GameState,
  target: string | undefined,
  to: string | undefined,
): readonly GameEvent[] {
  if (target === undefined || to === undefined) return []
  const o = state.objects[target as ObjId]
  if (!o || !state.zones[to as ZoneId] || (o.zone as string) === to) return []
  if (moveRestricted(state, o, to)) return []                          
  if (!moveDestinations(state, target).includes(to)) return []                              
  return [
    { kind: 'zoneChange', obj: o.oid, to: to as ZoneId },
    { kind: 'unitMoved', unit: o.oid, player: o.controller, from: o.zone, to: to as ZoneId }, // §446.1
  ]
}

                                                                 
                                          
                                               
  
                                                  
                                              
                                         
                                     
                                                                       
                                          
                                              
                     

                                  
export const UNL_038_LEVEL = 6
const UNL_038_DEST = 'dragonDest'
const UNL_038_STUN = 'dragonStun'

export const UNL_038_CARD_EFFECT =
  '移动一名敌方单位。\n{{等级6>}} {{眩晕}}一名敌方单位。' +
  '（如果你拥有不少于6经验，则获得该效果。被眩晕的单位在本回合内无法造成战斗伤害。）'

export const UNL_038_SPEC: PlaySpec = {
  defId: 'UNL-038', cardNo: 'UNL-038/219', name: '升龙踢',
  kind: 'spell',
  cost: { mana: 2, pips: [['green']] },
  keywords: [],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => enemyUnitsOnField(state, controller),
                                                                     
                                                            
                                                               
                                                                                
  choiceTiming: 'confirm',
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                                 
      const dest = askMoveDestination({
        state, chosen, key: UNL_038_DEST, itemId: `play:${movedCardOid}`, controller, target,
        prompt: '升龙踢:把这名敌方单位移动到哪里?',
      })
      if (dest) return dest
                                     
      if (!levelReached(state, controller, UNL_038_LEVEL) || chosen[UNL_038_STUN] !== undefined) return null
                                                           
      const foes = enemyUnitsOnField(state, controller)
      if (foes.length === 0) return null
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: UNL_038_STUN,
        prompt: '升龙踢({{等级6}}):眩晕哪一名敌方单位?',
        candidates: foes.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
                                                                    
        isTarget: true,
      }
    },
  makeResolve:
    ({ target, controller }: { target?: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const out: GameEvent[] = [...moveUnitEvents(state, target, chosen?.[UNL_038_DEST])]
                                 
      const stun = chosen?.[UNL_038_STUN]
                                                                                   
                                                                           
                                                    
      if (stun !== undefined && enemyUnitsOnField(state, controller).includes(stun)) out.push({ kind: 'stun', target: stun as ObjId })
      return out
    },
}

export const UNL_038: Card = {
  id: 'UNL-038', cardNo: 'UNL-038/219', name: '升龙踢', category: 'spell',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动一名敌方单位;等级6 额外眩晕一名敌方单位(UNL_038_SPEC)' }],
}

                                                                    
                           
                       
                                                       
  
                    
                                                                   
                                                                
                                                                    
                                                   
                                                           
export const VEN_105_MAX_MIGHT = 3
                     
export const VEN_105_KEYWORDS: readonly string[] = ['流转4紫色']
const VEN_105_DEST = 'shadowStepDest'

export const VEN_105_CARD_EFFECT =
  '移动一名不高于3{{S}}的单位。\n'
  + '{{流转4紫色}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

export const VEN_105_SPEC: PlaySpec = {
  defId: 'VEN-105', cardNo: 'VEN·105', name: '奥义！幽步',
  kind: 'spell',
  cost: { mana: 2, pips: [['purple']] },
  keywords: [...VEN_105_KEYWORDS],
  target: 'custom',
                                                                        
                                                          
  choiceTiming: 'confirm',
  legalTargets: (state: GameState): string[] => unitsUpToMightOnField(state, VEN_105_MAX_MIGHT),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null =>
      askMoveDestination({
        state, chosen, key: VEN_105_DEST, itemId: `play:${movedCardOid}`, controller, target,
        prompt: '奥义!幽步:把这名单位移动到哪里?',
      }),
  makeResolve:
    ({ target }: { target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
      moveUnitEvents(state, target, chosen?.[VEN_105_DEST]),
}

export const VEN_105: Card = {
  id: 'VEN-105', cardNo: 'VEN·105', name: '奥义！幽步', category: 'spell',
  domains: ['purple'], energy: 2, keywords: [...VEN_105_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动一名不高于3战力的单位(VEN_105_SPEC)' }],
}


                                                                     
                                                            
                                         
  
                     
                                                         
                                                              
                                                 
                                                  
                                                
                                                                         
                                                    
                                   
  
                                                    
                                                  
                               
const UNL_124_DEST_NOTE = '其基地 = 被移动单位【控制者】的基地'

                                       
export function enemyUnitsOnBattlefields(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => state.zones[o.zone]?.kind === 'battlefield'
      && isUnit(o) && o.controller !== controller)
    .map((o) => o.oid as string)
    .sort()
}

                                                               
function afterMove(state: GameState, target: string, to: string): GameState {
  const o = state.objects[target as ObjId]
  if (!o) return state
  return { ...state, objects: { ...state.objects, [target]: { ...o, zone: to as ZoneId } } }
}

export const UNL_124_CARD_EFFECT =
  '将一名敌方单位从战场移动到其基地。然后，如果该战场上有落单的敌方单位，则抽一张牌。'

export const UNL_124_SPEC: PlaySpec = {
  defId: 'UNL-124', cardNo: 'UNL-124/219', name: '隔绝',
  kind: 'spell',
  cost: { mana: 2 }, // 上游 pips=0 ⇒ 一枚都不写(㊶)
  keywords: [],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] =>
    enemyUnitsOnBattlefields(state, controller),
  makeResolve:
    ({ controller, target }: { controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      const o = target === undefined ? undefined : state.objects[target as ObjId]
      if (!o) return []
      const from = o.zone as string
                                                       
      const to = `base:${o.controller as string}`
      const moved = moveUnitEvents(state, target, to)
      if (moved.length === 0) return []
                                                 
      const after = afterMove(state, o.oid as string, to)
      const lonely = Object.values(after.objects).some((x) =>
        (x.zone as string) === from
        && isUnit(x)
        && x.controller !== controller
        && isAlone(after, x))
      return lonely
        ? [...moved, { kind: 'draw', player: controller, count: 1 } as GameEvent]
        : moved
    },
}

export const UNL_124: Card = {
  id: 'UNL-124', cardNo: 'UNL-124/219', name: '隔绝', category: 'spell',
  domains: ['purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `把一名敌方单位从战场赶回${UNL_124_DEST_NOTE};那儿若剩落单敌方则抽1(UNL_124_SPEC)` }],
}

                                                                  
                                                               
                                                                    
                                                      
                                                         
                                  
  
                                      
                                                              
                                                                        
                                                                  
                                                           
  
                                            
                                                         
                                           
                                           
                                                                             
                                                                 
                                                               
                                                          
                                                         
                          
                                                           
                                                           
                                                                          
                                                             
                                                     
                                   
                                            
                                                
                                                                      
export const OGN_258_CARD_EFFECT =
  '移动一名敌方单位。然后进行一次：在该单位终点位置处选择另一名敌方单位。让这两名单位相互以自身战力给对方造成伤害。'
const OGN_258_DEST = 'dragonTailDest'
const OGN_258_FOE2 = 'dragonTailFoe2'

   
                                              
                                                               
                                             
                                        
                                                        
   
export function dragonTailFoesAt(
  state: GameState, dest: string | undefined, moved: string | undefined, controller: PlayerId,
): string[] {
  if (dest === undefined || moved === undefined) return []
  return Object.values(state.objects)
    .filter((o) => (o.zone as string) === dest && isUnit(o) && o.controller !== controller
      && (o.oid as string) !== moved)             
    .map((o) => o.oid as string)
    .sort()
}

   
                                                   
                                                
                                                                                         
                                                                      
                                   
   
export function makeDragonTailItem(cardOid: string, moved: string, controller: PlayerId): ChainItem {
  const id = `OGN-258-tail:${cardOid}`
                                               
  const hereOf = (state: GameState): string | undefined =>
    state.objects[moved as ObjId]?.zone as string | undefined
  return {
    id, controller, kind: 'triggered', status: 'pending', sourceDefId: 'OGN-258',
    nextChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[OGN_258_FOE2] !== undefined) return null        
      const foes = dragonTailFoesAt(state, hereOf(state), moved, controller)
      if (foes.length === 0) return null                                   
      return {
        itemId: id, controller, key: OGN_258_FOE2,
        prompt: '猛龙摆尾:在终点位置选另一名敌方单位(两者互殴)',
        candidates: foes.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
                                                                        
        isTarget: true,
      }
    },
    resolve: (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const foe2 = chosen?.[OGN_258_FOE2]
      if (foe2 === undefined) return []
                                              
      const a = state.objects[moved as ObjId]
      const b = state.objects[foe2 as ObjId]
      if (!a || !b) return []
                                                     
      return [
                                                                          
                                               
                                                                           
                                                                                    
                                                         
        { kind: 'damage', target: foe2 as ObjId, amount: effectiveMight(a).reference,
          source: moved as ObjId, sourcePlayer: a.controller } ,
        { kind: 'damage', target: moved as ObjId, amount: effectiveMight(b).reference,
          source: foe2 as ObjId, sourcePlayer: b.controller } ,
      ]
    },
  }
}

export const OGN_258_SPEC: PlaySpec = {
  defId: 'OGN-258', cardNo: 'OGN·258/298', name: '猛龙摆尾',
  kind: 'spell',
                                                                   
                                                                      
                                                                  
  cost: { mana: 4, pips: [['green', 'orange']] },
  keywords: [],
  target: 'custom',
                                                                     
                                                 
                                                                           
                                      
  choiceTiming: 'confirm',
  legalTargets: (state: GameState, controller: PlayerId): string[] => enemyUnitsOnField(state, controller),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                           
      const dest = askMoveDestination({
        state, chosen, key: OGN_258_DEST, itemId: `play:${movedCardOid}`, controller, target,
        prompt: '猛龙摆尾:把这名敌方单位移动到哪里?',
      })
                                                       
                                             
      return dest
    },
  makeResolve:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const out: GameEvent[] = [...moveUnitEvents(state, target, chosen?.[OGN_258_DEST])]
                                                     
                                                                           
                                                                  
                                                              
                                                            
                                                      
                                                                 
                                                               
      const targetLive = target !== undefined && state.objects[target as ObjId] !== undefined
      if (targetLive) {
        out.push({ kind: 'enqueueItem', item: makeDragonTailItem(movedCardOid, target, controller) } )
      }
      return out
    },
}

export const OGN_258: Card = {
  id: 'OGN-258', cardNo: 'OGN·258/298', name: '猛龙摆尾', category: 'spell',
  domains: ['green', 'orange'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动一名敌方单位,再让它与终点处另一名敌方单位互殴(OGN_258_SPEC)' }],
}

                                                                      
                                                                    
                                         
                             
                                                       
  
                                                      
                                                                   
                                                      
                                                
                                                       
                                                                     
                                                                
export const VEN_148_DEST = 'shadowBindDest'
export const VEN_148_PUMP = 1
export const VEN_148_EXACT = 2

export const VEN_148_CARD_EFFECT =
  '将一名敌方单位移动到一处你有单位的战场。如果你在该处有且仅有两名单位，则这两名单位在本回合内各获得{{S}}+1。\n'
  + '{{流转5AA}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

                                       
export function myUnitsAt(state: GameState, controller: PlayerId, zone: string): string[] {
  return (state.zones[zone as ZoneId]?.contents ?? [])
    .map((oid) => state.objects[oid])
    .filter((o) => o !== undefined && isUnit(o) && o.controller === controller)
    .map((o) => o!.oid as string)
}

                                                 
export function shadowBindDests(state: GameState, controller: PlayerId, unitOid: string): string[] {
  const o = state.objects[unitOid as ObjId]
  if (!o) return []
  return zonesByKind(state, 'battlefield')
    .map((z) => z.id as string)
    .filter((z) => z !== (o.zone as string))
    .filter((z) => myUnitsAt(state, controller, z).length > 0)
    .filter((z) => !moveRestricted(state, o, z))
}

export const VEN_148_SPEC: PlaySpec = {
  defId: 'VEN-148', cardNo: 'VEN·148', name: '奥义！影缚', kind: 'spell',
  cost: { mana: 2, pips: [['green', 'yellow']] }, // ㊶ cardCosts 实测 2 法力 1pip 双色 ⇒ 一枚双色
  keywords: ['流转5AA'],
  target: 'custom',
                                                                     
                                                               
  choiceTiming: 'confirm',
  legalTargets: (state: GameState, controller: PlayerId): string[] => enemyUnitsOnField(state, controller),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (target === undefined || chosen[VEN_148_DEST] !== undefined) return null
      const dests = shadowBindDests(state, controller, target)
      if (dests.length === 0) return null                                
      return {
        itemId: `play:${movedCardOid}`, controller, key: VEN_148_DEST,
        prompt: '奥义!影缚:把这名敌方单位移动到哪处你有单位的战场?',
        candidates: dests.map((z) => ({ id: z, label: z })),
      }
    },
  makeResolve:
    ({ controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const dest = chosen?.[VEN_148_DEST]
      if (target === undefined || dest === undefined) return []
                                                                       
                                                           
      const out: GameEvent[] = shadowBindDests(state, controller, target).includes(dest)
        ? [...moveUnitEvents(state, target, dest)]
        : []
                                                        
      const mine = myUnitsAt(state, controller, dest)
      if (mine.length === VEN_148_EXACT) {
        for (const oid of mine) {
          out.push({
            kind: 'addEffect',
            effect: {
              id: `VEN-148:pump:${oid}`, duration: 'thisTurn', fromPassive: false,
              predicate: (x: { oid: ObjId }) => x.oid === (oid as ObjId),
              modification: { kind: 'addMight', delta: VEN_148_PUMP },
            },
          } )
        }
      }
      return out
    },
}

export const VEN_148: Card = {
  id: 'VEN-148', cardNo: 'VEN·148', name: '奥义！影缚', category: 'spell',
  domains: ['green', 'yellow'], energy: 2, keywords: ['流转5AA'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移一名敌方单位到我有单位的战场;该处我恰两名 ⇒ 各+1至回合末(VEN_148_SPEC)' }],
}

export const ENEMY_MOVE_DEFIDS: readonly string[] = ['UNL-038', 'UNL-124', 'VEN-105', 'OGN-258', 'VEN-148']                 
