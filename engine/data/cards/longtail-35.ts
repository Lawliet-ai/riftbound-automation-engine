                                                          
  
                                                                       
                                                                               
                                                                        
                                                                           
  
                                                 
                                                       
                                                            
                                                      
                                                                        
                                                                           
                                                            
                                                
                                                                  
  
                                                               
                                                          
                                                                            
                                         
                                                   
                                         
                                                                 
                                                              

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import type { CostMod } from '../../src/game/costPipeline'
import { CARD_NAMES } from '../cardNames'
import { confirmedCountThisTurn } from '../../src/keywords/rally'
import { isEquipment, isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'
import { onField } from './activated-batch2'
import { sameNameCountInDiscard } from './same-name'

const nameOf = (defId: string): string => CARD_NAMES[defId] ?? defId

                                                
function perCountMana(n: number, step: number, source: string, floor?: number): readonly CostMod[] {
  if (n <= 0) return []
  return [{ kind: 'reduce', part: 'mana', mana: n * step, ...(floor === undefined ? {} : { floor }), source }]
}

                                                             
export const VEN_096_CARD_EFFECT = '你的废牌堆中每有一张和我同名的卡牌，我的费用便减少{{2}}。'
                                 
export const VEN_096_STEP = 2

export function shadowbladeCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'VEN-096') return []
  const n = sameNameCountInDiscard(state, player, 'VEN-096', nameOf)
  return perCountMana(n, VEN_096_STEP, 'VEN-096 影刃潜伏者')               
}

export const VEN_096: Card = {
  id: 'VEN-096', cardNo: 'VEN·096', name: '影刃潜伏者', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '废牌堆每有一张同名牌费用减2(shadowbladeCostMods)' }],
}

                                                             
export const SFD_012_CARD_EFFECT = '你在本回合内每打出过一张牌，我的费用便减少{{1}}，不得低于{{1}}。'
export const SFD_012_STEP = 1
                                           
export const SFD_012_FLOOR = 1

   
                                                                         
                                                           
                                                          
                                                  
                                             
                                                        
   
export function batteringRamCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'SFD-012') return []
  return perCountMana(confirmedCountThisTurn(state, player), SFD_012_STEP, 'SFD-012 攻城锤', SFD_012_FLOOR)
}

export const SFD_012: Card = {
  id: 'SFD-012', cardNo: 'SFD·012/221', name: '攻城锤', category: 'unit',
  domains: ['red'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合每打出过一张牌费用减1、下限1(batteringRamCostMods)' }],
}

                                                               
export const VEN_064_CARD_EFFECT = '你每控制一件装备，我的费用便减少{{1}}。'
export const VEN_064_STEP = 1

                                                     
export function controlledEquipmentCount(state: GameState, player: PlayerId): number {
  return Object.values(state.objects)
    .filter((o) => o.controller === player && isEquipment(o) && onField(state, o)).length
}

export function plazaGuardCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'VEN-064') return []
  return perCountMana(controlledEquipmentCount(state, player), VEN_064_STEP, 'VEN-064 广场守卫')
}

export const VEN_064: Card = {
  id: 'VEN-064', cardNo: 'VEN·064', name: '广场守卫', category: 'unit',
  domains: ['blue'], energy: 10, power: 8, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每控制一件装备费用减1(plazaGuardCostMods)' }],
}

                                                               
export const SFD_103_CARD_EFFECT = '你每控制一名强力单位，我的费用便减少{{2}}。'
export const SFD_103_STEP = 2
                                             
export const MIGHTY_THRESHOLD = 5

                                                
export function controlledMightyCount(state: GameState, player: PlayerId): number {
  return Object.values(state.objects).filter((o) =>
    o.controller === player && isUnit(o) && onField(state, o)
    && effectiveMight(o).reference >= MIGHTY_THRESHOLD).length
}

export function tellstonesCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'SFD-103') return []
  return perCountMana(controlledMightyCount(state, player), SFD_103_STEP, 'SFD-103 琢珥鱼')
}

export const SFD_103: Card = {
  id: 'SFD-103', cardNo: 'SFD·103/221', name: '琢珥鱼', category: 'unit',
  domains: ['orange'], energy: 7, power: 6, keywords: ['急速'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每控制一名强力单位费用减2(tellstonesCostMods)' }],
}

                                                                
export function longtail35CostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  return [
    ...shadowbladeCostMods(state, player, defId),
    ...batteringRamCostMods(state, player, defId),
    ...plazaGuardCostMods(state, player, defId),
    ...tellstonesCostMods(state, player, defId),
  ]
}

             
export const LONGTAIL35_DEFIDS: readonly string[] = ['VEN-096', 'SFD-012', 'VEN-064', 'SFD-103']
