                                                                  
                                         
                                                                      
                    
           
                      
                      
                             
  
                                                
                                                                 
                                               
                                                               
                                                             
                                                       
                                                               
                                                    
                                                        
                                                               
                                                
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import { battlefieldUnits } from './diana-reactions'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                                   

export const UNL_182_CARD_EFFECT =
  '{{回响}} — 支付{{1}}/支付{{A}}/支付{{1}}和{{A}}（你可以选择支付各额外费用一次，以重复多次此法术效果。）\n' +
  '从以下中选择一个未选过的效果 —\n' +
  '- 抽一张牌。\n' +
  '- 对战场上的一名单位造成2点伤害。\n' +
  '- 对基地中的一名单位造成3点伤害。\n' +
  '- 让战场上的一名单位在本回合内{{S}}-4。'

                                                         
export const UNL_182_ECHOES: readonly Cost[] = [
  { mana: 1 },
  { pips: [[]] },
  { mana: 1, pips: [[]] },
]

                                                           
export function baseUnits(state: GameState): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'base') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                             
                                                                          
      if (o && isUnitDefId(o.defId) && isUnit(o)) out.push(oid as string)
    }
  }
  return out
}

                                                 
export function unl182Targets(state: GameState): string[] {
  return [
    'draw:-',
    ...battlefieldUnits(state).map((o) => `dmg2:${o}`),
    ...baseUnits(state).map((o) => `dmg3:${o}`),
    ...battlefieldUnits(state).map((o) => `weak:${o}`),
  ]
}

export const UNL_182_SPEC: PlaySpec = {
  defId: 'UNL-182', cardNo: 'UNL-182/219', name: '完美谢幕', kind: 'spell',
  cost: { mana: 4 }, // cardCosts 实测:4 法力 0 pip(红蓝双色只影响能不能进牌组,不进费用)
  keywords: ['回响'], // ② 卡面横幅印着 [回响] ⇒ spec 侧必须登(对账闸抓的就是这个)
  echoes: UNL_182_ECHOES,
  echoModeDistinct: true, // 「选择一个【未选过的】效果」
  target: 'enemyUnit', // 目标域自己在 legalTargets 里算(四类编码混在一张名单上)
  legalTargets: (state) => unl182Targets(state),
  makeResolve:
    ({ target: target0, controller, movedCardOid }) =>
    (state, _chosen, self): readonly GameEvent[] => {
                                                    
      const re = (self as { rechoice?: { target?: string } } | undefined)?.rechoice?.target
      const target = re === undefined ? target0
        : target0 !== undefined && target0.includes(':')
          ? `${target0.slice(0, target0.indexOf(':'))}:${re}` : re
      if (!target) return []
      const mode = target.includes(':') ? target.slice(0, target.indexOf(':')) : target
      const oid = target.includes(':') ? target.slice(target.indexOf(':') + 1) : ''
      if (mode === 'draw') return [{ kind: 'draw', player: controller as PlayerId, count: 1 } as GameEvent]
      if (state.objects[oid as ObjId] === undefined) return []                      
      if (mode === 'dmg2') {
        return [{ kind: 'damage', target: oid as ObjId, amount: 2, sourcePlayer: controller, source: movedCardOid as ObjId } as GameEvent]
      }
      if (mode === 'dmg3') {
        return [{ kind: 'damage', target: oid as ObjId, amount: 3, sourcePlayer: controller, source: movedCardOid as ObjId } as GameEvent]
      }
                       
      return [{
        kind: 'addEffect',
        effect: {
          id: `UNL-182:${oid}:${movedCardOid}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { oid: string }) => x.oid === oid,
          modification: { kind: 'addMight', delta: -4 },
        },
      } ]
    },
}

export const UNL_182: Card = {
  id: 'UNL-182', cardNo: 'UNL-182/219', name: '完美谢幕', category: 'spell',
  domains: ['red', 'blue'], energy: 4, keywords: ['回响'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '三份印刷回响({1}/{A}/{1}+{A})+ 四选一未选过的效果(UNL_182_SPEC)' },
  ],
}
