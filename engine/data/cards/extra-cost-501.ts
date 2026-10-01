                                                                    
                                                                    
                               
                                     
                                                   
                          
                            
  
                                        
                                                                                  
                                                                                   
                                                
                                                                             
                                                                     
                                                                   
                                             
                                                                
  
                                                          
                                                                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec, PlayCtx } from '../../src/loop/playSpec'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import { isUnit } from '../../src/state/cardTypes'
import { objectHasCardTag } from '../cardTagQuery'
import { onField } from './activated-batch2'

                                                                          
export const SFD_182_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '{{回响}}{{1}}{{A}}（你可以选择支付此额外费用，以重复此法术效果。）\n' +
  '你的“机械”属性单位本回合内{{S}}+1。'

export const SFD_182_TAG = '机械'
export const SFD_182_BONUS = 1

                                                              
export function machineUnits(state: GameState, controller: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && onField(state, o) &&
      objectHasCardTag(o, SFD_182_TAG))
    .map((o) => o.oid)
    .sort()
}

export const SFD_182_SPEC: PlaySpec = {
  defId: 'SFD-182', cardNo: 'SFD·182/221', name: '危险温度', kind: 'spell',
  cost: { mana: 1, pips: [['red', 'blue']] }, // cardCosts 实测:1 法力 + 1 pip(双域红蓝,§135.2.e.6.c 任一可付)
                                                                                   
  echo: { mana: 1, pips: [[]] },
  keywords: ['反应', '回响'], // ② 卡面横幅两个都印着 ⇒ 三处都登
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ movedCardOid, controller }: PlayCtx) => (state: GameState): readonly GameEvent[] =>
    machineUnits(state, controller).map((oid) => ({
      kind: 'addEffect',
      effect: {
        id: `SFD-182:${movedCardOid}:${oid}`, duration: 'thisTurn', fromPassive: false,
        predicate: (x: { oid: string }) => x.oid === (oid as string),
        modification: { kind: 'addMight', delta: SFD_182_BONUS },
      },
    })),
}

export const SFD_182: Card = {
  id: 'SFD-182', cardNo: 'SFD·182/221', name: '危险温度', category: 'spell',
  domains: ['red', 'blue'], energy: 1, keywords: ['反应', '回响'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应];回响1+[A];我方「机械」单位本回合[S]+1' }],
}

                                                                          
export const UNL_122_CARD_EFFECT =
  '如果你在本回合打出过法术，则你可以选择支付{{紫色}}，作为打出我的额外费用，以此让我以活跃状态进场。'

                                       
export function playedSpellThisTurn(state: GameState, player: PlayerId): boolean {
  return state.playedSpellThisTurn?.[player as string] === true
}

export const UNL_122_EXTRA_COST: PlayExtraCost = {
  label: '支付 1 点混沌符能(以活跃状态进场)',
                             
  cost: { pips: [['purple']] },
                                                        
  available: (state, player) => playedSpellThisTurn(state, player),
                                           
  events: (player): readonly GameEvent[] =>
    [{ kind: 'markNextUnitReady', player } ],
}

export const UNL_122: Card = {
  id: 'UNL-122', cardNo: 'UNL-122/219', name: '新月禁卫', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合打出过法术则可付{紫}以活跃状态进场(UNL_122_EXTRA_COST)' }],
}

export const EXTRA_COST_CARDS_501: readonly Card[] = [SFD_182, UNL_122]
