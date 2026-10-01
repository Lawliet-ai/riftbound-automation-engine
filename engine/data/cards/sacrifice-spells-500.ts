                                                     
                                    
                                                         
                         
                                     
                                
                                                  
                            
  
            
                                                     
                                                       
                                                    
                                                         
                                                                                 
                                                                       
                                                      
                                                   
                                                       
  
                                                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec, PlayCtx } from '../../src/loop/playSpec'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import { isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'
import { CARD_COSTS } from '../cardCosts'
import { onField } from './activated-batch2'
import { unitDestinations, playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

                                                                       
export const MIGHTY_THRESHOLD = 5

   
                                                       
  
                                                                           
                                                     
                                                                     
                                         
                                             
                                                                         
   
export function sacrificeUnitCandidates(
  state: GameState, controller: PlayerId, opts: { readonly mighty: boolean },
): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) =>
      o.controller === controller && isUnit(o) && onField(state, o) &&
      (!opts.mighty || effectiveMight(o).reference >= MIGHTY_THRESHOLD))
    .map((o) => o.oid)
    .sort()
}

                                              
function makeSacrificeCost(label: string, mighty: boolean): PlayExtraCost {
  return {
    label,
    required: true, // ★「你**必须**…」⇒ 付不出就整张打不出(§204),也不给「不付」那一支
    available: (state, player) => sacrificeUnitCandidates(state, player, { mighty }).length > 0,
    options: (state, player) => sacrificeUnitCandidates(state, player, { mighty })
      .map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
                                               
    payEvents: (_state, player, choice): readonly GameEvent[] =>
      choice === undefined ? [] : [{ kind: 'destroy', target: choice as ObjId, sourcePlayer: player } ],
  }
}

                                                                            
export const UNL_173_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '你必须摧毁一名友方{{强力}}单位，作为打出此牌的额外费用。（战力达到5或以上时，即为强力单位。）\n' +
  '抽两张牌并召出一枚休眠的符文。'

export const UNL_173_DRAW = 2
export const UNL_173_EXTRA_COST: PlayExtraCost =
  makeSacrificeCost('摧毁一名友方[强力]单位(战力≥5)', true)

export const UNL_173_SPEC: PlaySpec = {
  defId: 'UNL-173', cardNo: 'UNL-173/219', name: '牺牲', kind: 'spell',
  cost: { mana: 1 }, // cardCosts 实测:1 法力 0 pip(黄)
  keywords: ['反应'],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller }: PlayCtx) => (): readonly GameEvent[] => [
    { kind: 'draw', player: controller, count: UNL_173_DRAW } as GameEvent,
                                    
    { kind: 'summonRune', player: controller, count: 1, dormant: true } ,
  ],
}

export const UNL_173: Card = {
  id: 'UNL-173', cardNo: 'UNL-173/219', name: '牺牲', category: 'spell',
  domains: ['yellow'], energy: 1, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应];必须摧毁一名友方强力单位;抽两张+召一枚休眠符文' }],
}

                                                                          
                                                                            
                                                                 
export const UNL_142_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '你必须摧毁一名友方单位，作为打出此牌的额外费用。\n' +
  '从你的废牌堆中打出一名法力和符能费用不高于被摧毁单位的单位，无视其费用。'

export const UNL_142_EXTRA_COST: PlayExtraCost = makeSacrificeCost('摧毁一名友方单位', false)

   
                                                                  
                                         
   
export function withinCost(candidateDefId: string, deadDefId: string): boolean {
  const a = CARD_COSTS[candidateDefId]
  const b = CARD_COSTS[deadDefId]
  if (a === undefined || b === undefined) return false
  return a.mana <= b.mana && a.pips <= b.pips
}

                                                              
export function revivalCandidates(
  state: GameState, controller: PlayerId, deadDefId: string | undefined,
): readonly ObjId[] {
  if (deadDefId === undefined) return []
  return (state.zones[`discard:${controller}` as ZoneId]?.contents ?? [])
    .filter((oid) => {
      const o = state.objects[oid]
                                                                         
      return o !== undefined && isUnit(o) && withinCost(o.defId, deadDefId)
        && unitDestinations(state, controller, undefined, o.defId).length > 0                                                     
    })
    .slice()
    .sort() as readonly ObjId[]
}

export const UNL_142_PICK = 'revivalPick'
export const UNL_142_TO = 'revivalTo'                

export const UNL_142_SPEC: PlaySpec = {
  defId: 'UNL-142', cardNo: 'UNL-142/219', name: '残酷复活', kind: 'spell',
  cost: { mana: 2, pips: [['purple']] }, // cardCosts 实测:2 法力 + 1 紫 pip
  keywords: ['反应'],
  target: 'none',
  legalTargets: (): string[] => [],
                                                                                                           
                              
                                                                   
                                                                         
                                                                        
                               
                                                                                       
                                                                
  makeConfirmChoice:
    ({ movedCardOid, controller, bonusChoice, bonusChoiceDefId }: PlayCtx) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (chosen[UNL_142_PICK] !== undefined) return null
                                                        
                                                                           
                                                                  
                                                    
      const deadDefId = bonusChoiceDefId ?? (bonusChoice === undefined ? undefined : state.objects[bonusChoice as ObjId]?.defId)
      const cands = revivalCandidates(state, controller, deadDefId)
      if (cands.length === 0) return null                             
      return {
        itemId: `spell:${movedCardOid}:UNL-142`,
        controller,
        key: UNL_142_PICK,
        prompt: '残酷复活:从废牌堆打出一名费用不高于被摧毁单位的单位(无视费用)',
        isTarget: true, // ★1782 从你的废牌堆中打出一名…单位
        candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    },
  makeNextChoice:
    ({ movedCardOid, controller }: PlayCtx) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                
      if (chosen[UNL_142_PICK] === undefined) return null
                                                                              
      const o = state.objects[chosen[UNL_142_PICK] as ObjId]
      if (!o) return null
      return playFromEffectChoice(state, controller, o.defId, {
        itemId: `spell:${movedCardOid}:UNL-142`, controller, key: UNL_142_TO, prompt: '残酷复活:把它打出到哪里?',
      }, chosen)
    },
  makeResolve:
    ({ controller, bonusChoice, bonusChoiceDefId }: PlayCtx) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = (chosen ?? {})[UNL_142_PICK]
      if (pick === undefined) return []
                                 
      const deadDefId = bonusChoiceDefId ?? (bonusChoice === undefined ? undefined : state.objects[bonusChoice as ObjId]?.defId)
      if (!(revivalCandidates(state, controller, deadDefId) as readonly string[]).includes(pick)) return []
                                                                        
                                                                      
                                                                                                    
      const x = optionalExtraResolve(state, controller, state.objects[pick as ObjId]?.defId ?? '', UNL_142_TO, chosen)
      const dest = unitDestinationResolve(state, controller, state.objects[pick as ObjId]?.defId ?? '', (chosen ?? {})[UNL_142_TO], x.grant)
      if (dest === undefined) return []
      return [...x.pre, { kind: 'playFree', obj: pick as ObjId, player: controller, to: dest, ...x.flags }, ...x.post ]
    },
}

export const UNL_142: Card = {
  id: 'UNL-142', cardNo: 'UNL-142/219', name: '残酷复活', category: 'spell',
  domains: ['purple'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应];必须摧毁一名友方单位;从废牌堆无视费用打出一名费用不高于它的单位' }],
}

export const SACRIFICE_CARDS_500: readonly Card[] = [UNL_173, UNL_142]
export const SACRIFICE_COSTS_500: Readonly<Record<string, PlayExtraCost>> = {
  'UNL-173': UNL_173_EXTRA_COST,
  'UNL-142': UNL_142_EXTRA_COST,
}
