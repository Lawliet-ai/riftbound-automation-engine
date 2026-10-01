                                                                  
                           
                             
                                              
                     
  
                                    
                                                         
                                                                             
                                                             
                                                      
                                               
  
                                                                         
                                                           
                                                 
                                               
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameObject } from '../../src/state/object'
import type { ObjId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import { battlefieldUnits } from './diana-reactions'
import { spellTargetStillLegal } from './targetStillLegal'

export const VEN_008_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '你可以选择弃置一张手牌，作为打出此牌的额外费用。\n' +
  '对战场上的一名单位造成3点伤害。如果你支付了该额外费用，则改为对其造成5点伤害。'

export const VEN_008_BASE = 3
export const VEN_008_BOOSTED = 5

                                                    
export const VEN_008_EXTRA_COST: PlayExtraCost = {
  label: '弃置一张手牌(改为造成5点伤害)',
                             
  options: (state, player) => (state.zones[`hand:${player}`]?.contents ?? [])
    .map((oid) => state.objects[oid])
    .filter((o): o is GameObject => o !== undefined && o.defId !== 'VEN-008')
    .map((o) => ({ id: o.oid as string, label: o.defId })),
                                            
  payEvents: (state, _player, choice): readonly GameEvent[] => {
    const o = choice === undefined ? undefined : state.objects[choice as ObjId]
    return o === undefined ? [] : [{ kind: 'zoneChange', obj: o.oid, to: `discard:${o.owner}` as ZoneId }]
  },
}

export const VEN_008_SPEC: PlaySpec = {
  defId: 'VEN-008', cardNo: 'VEN·008', name: '无情打击', kind: 'spell',
  cost: { mana: 3 }, // cardCosts 实测:3 法力 0 pip(红)
  keywords: ['迅捷'],
  target: 'custom',
                                                     
  legalTargets: (state): string[] => battlefieldUnits(state).slice().sort(),
  makeResolve: ({ target, movedCardOid, controller, bonus }) => (state): readonly GameEvent[] => {
                                                     
    if (!spellTargetStillLegal(VEN_008_SPEC, state, controller, target, '', bonus === true)) return []
                                                      
    return [{
      kind: 'damage', target: target as ObjId,
      amount: bonus === true ? VEN_008_BOOSTED : VEN_008_BASE,
      source: movedCardOid as ObjId, sourcePlayer: controller,
    } ]
  },
}

export const VEN_008: Card = {
  id: 'VEN-008', cardNo: 'VEN·008', name: '无情打击', category: 'spell',
  domains: ['red'], energy: 3, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[迅捷];3点伤害,付了额外费(弃一张手牌)则改为5点(VEN_008_SPEC)' }],
}
