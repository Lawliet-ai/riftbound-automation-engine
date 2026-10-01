                                                   
  
                       
                                                                        
                                                                              
                                                          
                                                                                           
                                                      
  
                                                                               
                                                                               
                                                       
  
                                                               
                                                       
                                                  
                               
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { CostMod } from '../../src/game/costPipeline'
import { manaAvailable, resourceCapacity } from '../../src/game/economy'

                                                       
export function amountTargets(max: number): string[] {
  const out: string[] = []
  for (let i = 1; i <= max; i++) out.push(String(i))
  return out
}

                                                             
export function parseAmount(target?: string): number {
  const n = Number(target)
  return Number.isInteger(n) && n > 0 ? n : 0
}

                                                           
export function anyEnergyAvailable(state: GameState, player: PlayerId): number {
  const cap = resourceCapacity(state, player)
  const sum = (r: Readonly<Record<string, number>>): number => Object.values(r).reduce((a, b) => a + b, 0)
  return sum(cap.energy) + sum(cap.runes)
}

                                                                
                                              
                                    
                                                                         
export const SFD_117_CARD_EFFECT =
  '{{横置}}：{{反应}}—支付任意数量的法力来{{获得}}等量的{{A}}。（获得费用资源的技能无法成为其他法术的反应目标。）'

export const SFD_117_SPEC: ActivatedSpec = {
  key: 'SFD-117:manaToEnergy',
  label: '{{反应}} {{横置}}:支付任意数量的法力,获得等量的任意符能',
  keywords: ['反应'],
  cost: {}, // 数额全部由 costMods 按 target 加上去(印刷基础费是 0,§206.1 别的效果引用的也是这个)
  tapSelf: true,
  fastResolve: true,
  target: 'custom',
  legalTargets: (state, controller): string[] => amountTargets(manaAvailable(state, controller)),
  costMods: (_s, _c, _self, target): readonly CostMod[] => {
    const n = parseAmount(target)
    return n > 0 ? [{ kind: 'increase', part: 'mana', mana: n, source: 'SFD-117 支付任意数量的法力' }] : []
  },
  makeResolve: ({ controller, target }) => (): readonly GameEvent[] => {
    const n = parseAmount(target)
    return n > 0 ? [{ kind: 'gainResource', player: controller, energy: { '*': n } }] : []
  },
}

export const SFD_117: Card = {
  id: 'SFD-117', cardNo: 'SFD·117/221', name: '远古簇碑', category: 'equipment',
  domains: ['orange'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应][横置]付N法力换N点{A}(SFD_117_SPEC)' }],
}

                                                               
                                                
                                    
                                
                                                                          
                                                           
                                                    
export const SFD_083_CARD_EFFECT =
  '{{横置}}：{{反应}} — 支付任意数量的{{A}}来{{获得}}等量的法力。（获得费用资源的技能无法成为其他法术的反应目标。）'

export const SFD_083_SPEC: ActivatedSpec = {
  key: 'SFD-083:energyToMana',
  label: '{{反应}} {{横置}}:支付任意数量的任意符能,获得等量的法力',
  keywords: ['反应'],
  cost: {},
  tapSelf: true,
  fastResolve: true,
  target: 'custom',
  legalTargets: (state, controller): string[] => amountTargets(anyEnergyAvailable(state, controller)),
  costMods: (_s, _c, _self, target): readonly CostMod[] => {
    const n = parseAmount(target)
    return n > 0 ? [{ kind: 'increase', part: 'pips', pips: n, source: 'SFD-083 支付任意数量的{A}' }] : []
  },
  makeResolve: ({ controller, target }) => (): readonly GameEvent[] => {
    const n = parseAmount(target)
    return n > 0 ? [{ kind: 'gainResource', player: controller, mana: n }] : []
  },
}

export const SFD_083: Card = {
  id: 'SFD-083', cardNo: 'SFD·083/221', name: '海克斯异常体', category: 'equipment',
  domains: ['blue'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应][横置]付N点{A}换N法力(SFD_083_SPEC)' }],
}

                            
export const VARIABLE_AMOUNT_DEFIDS: readonly string[] = ['SFD-117', 'SFD-083']
