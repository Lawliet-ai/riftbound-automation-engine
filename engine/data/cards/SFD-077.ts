                                                                     
                                         
                                              
            
                     
             
  
                                               
                                                  
                                  
                                                              
                                                         
                                                                 
                                                       
                                                                                 
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import { baseUnits } from './UNL-182'
import { CARD_CATEGORIES } from '../cardCategories'
import { isEquipment } from '../../src/state/cardTypes'                                                        

export const SFD_077_CARD_EFFECT =
  '{{回响4蓝色}}（你可以选择支付此额外费用，以重复此法术效果，并做出不同的选择。）\n' +
  '选择一个效果 — \n' +
  '-对基地中的一名单位造成4点伤害。\n' +
  '-摧毁一件装备。'

                                                                                                                                                             
export function fieldedEquipment(state: GameState): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield' && z.kind !== 'base') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (isEquipment(o) || (o !== undefined && CARD_CATEGORIES[o.defId] === 'equipment')) out.push(oid as string)                                                                             
    }
  }
  return out
}

                 
export function sfd077Targets(state: GameState): string[] {
  return [
    ...baseUnits(state).map((o) => `dmg4:${o}`),
    ...fieldedEquipment(state).map((o) => `wreck:${o}`),
  ]
}

export const SFD_077_SPEC: PlaySpec = {
  defId: 'SFD-077', cardNo: 'SFD·077/221', name: '火箭轰击', kind: 'spell',
  cost: { mana: 4, pips: [['blue']] }, // cardCosts 实测:4 法力 + 1 蓝 pip
  keywords: ['回响'], // ② 卡面横幅印着 [回响] ⇒ 三处都要登
  echo: { mana: 4, pips: [['blue']] }, // 印刷回响 {4}{蓝色}(单份)
                                                   
  target: 'enemyUnit',
  legalTargets: (state) => sfd077Targets(state),
  makeResolve:
    ({ target: target0, controller, movedCardOid }) =>
    (state, _chosen, self): readonly GameEvent[] => {
                                             
      const re = (self as { rechoice?: { target?: string } } | undefined)?.rechoice?.target
      const target = re === undefined ? target0
        : target0 !== undefined && target0.includes(':')
          ? `${target0.slice(0, target0.indexOf(':'))}:${re}` : re
      if (!target || !target.includes(':')) return []
      const mode = target.slice(0, target.indexOf(':'))
      const oid = target.slice(target.indexOf(':') + 1)
      if (state.objects[oid as ObjId] === undefined) return []                      
      if (mode === 'dmg4') {
        return [{ kind: 'damage', target: oid as ObjId, amount: 4, sourcePlayer: controller, source: movedCardOid as ObjId } as GameEvent]
      }
      return [{ kind: 'destroy', target: oid as ObjId } as GameEvent]                
    },
}

export const SFD_077: Card = {
  id: 'SFD-077', cardNo: 'SFD·077/221', name: '火箭轰击', category: 'spell',
  domains: ['blue'], energy: 4, keywords: ['回响'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[回响4蓝色] + 二选一(基地单位4伤 / 摧毁一件装备)(SFD_077_SPEC)' },
  ],
}
