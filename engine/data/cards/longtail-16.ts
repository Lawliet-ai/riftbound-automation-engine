                           
  
                                                         
                                                           
                                                      

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { multiSelectChoice, multiSelectPicked, multiSelectPickedLegal } from '../../src/loop/multiSelect'
import { fieldedUnitCandidates } from './activated-batch'
import { effectiveMight } from '../../src/state/might'
import { filterTargetable } from '../../src/keywords/untargetable'                           

                                                                    
                                                           
                                                    
                                    
                                                   
export const UNL_015_CARD_EFFECT = '抽一张牌，然后你和盟友每控制一处战场，你便抽一张牌。'
export const UNL_015_SPEC: PlaySpec = {
  defId: 'UNL-015', cardNo: 'UNL-015/219', name: '占山为王',
  kind: 'spell',
  cost: { mana: 3, pips: [['red']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState): readonly GameEvent[] => [
      { kind: 'draw', player: controller, count: 1 + controlledBattlefields(state, controller).length },
    ],
}
export const UNL_015: Card = {
  id: 'UNL-015', cardNo: 'UNL-015/219', name: '占山为王', category: 'spell',
  domains: ['red'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '抽1,每控制一处战场再抽1(UNL_015_SPEC)' }],
}

                                                                    
                                           
                                            
                                        
                                       
                                           
export const UNL_110_CARD_EFFECT = '选择两名单位，让这两名单位相互以自身战力给对方造成伤害。'
const UNL_110_PREFIX = 'clashOfTitans'
const UNL_110_MAX = 2
export const UNL_110_SPEC: PlaySpec = {
  defId: 'UNL-110', cardNo: 'UNL-110/219', name: '巨人之战',
  kind: 'spell',
  cost: { mana: 6, pips: [['orange'], ['orange']] },
  keywords: [],
  targetlessChoice: true, // ★780:选择走问链 —— 漏了这行整张卡在真流程里一条动作都列不出来(★499 同款)
  target: 'custom',
  legalTargets: (): string[] => [],
  choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.7】「选择两名单位」= 打出时选目标
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      const pickedCount = multiSelectPicked(chosen, UNL_110_PREFIX).length
      if (pickedCount >= UNL_110_MAX) return null        
                                                                    
                                                                       
                                                                       
                                                     
                                                               
                                                                    
        
                                                                           
                                                                                                   
                                                               
                                                                           
                                                       
                                   
                                                                                 
                                                                                           
                                                                         
                           
      if (pickedCount === 0
        && filterTargetable(state.objects, controller, fieldedUnitCandidates(state, controller)).length < UNL_110_MAX) return null
      return multiSelectChoice({
        itemId: `play:${movedCardOid}`,
        controller,
        prefix: UNL_110_PREFIX,
        prompt: '巨人之战:选择两名单位,让它们相互以自身战力互殴',
                                                                                                                             
        isTarget: true, // 卡文「选择两名单位」= §355.7 选取目标
                                                                
                                                                            
        minPicks: UNL_110_MAX,
        candidates: (st) => fieldedUnitCandidates(st, controller)
          .map((oid) => ({ id: oid, label: `${st.objects[oid]?.defId ?? oid}` })),
      })(state, chosen)
    },
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                                    
      const picked = multiSelectPickedLegal(chosen, UNL_110_PREFIX, state,
        (st) => fieldedUnitCandidates(st, controller)).slice(0, UNL_110_MAX)
      const [a, b] = picked.map((oid) => state.objects[oid as ObjId])
                       
                                                             
                                                           
                                                 
      if (!a || !b) return []
                                 
      const mightA = effectiveMight(a).reference
      const mightB = effectiveMight(b).reference
      return [
        { kind: 'damage', target: b.oid, amount: mightA, source: a.oid },
        { kind: 'damage', target: a.oid, amount: mightB, source: b.oid },
      ]
    },
}
export const UNL_110: Card = {
  id: 'UNL-110', cardNo: 'UNL-110/219', name: '巨人之战', category: 'spell',
  domains: ['orange'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选两名单位相互以自身战力互殴(UNL_110_SPEC)' }],
}

                                                                    
                                          
                                      
                                                    
export const SFD_047_CARD_EFFECT = '当你给予我增益时，让我变为活跃状态。'
export function makeApeElderTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'setStatus', target: { ref: 'self' }, key: 'dormant', value: false }],
  })
  return compileTrigger({
    id: `SFD-047:grantBuff:${selfOid}`, rawId: true, sourceDefId: 'SFD-047',
    event: 'grantBuff',
    by: 'you', // 「你」给予的
    when: [{ kind: 'subjectIsSelf' }], // 给的是【我】
    effect: (state: GameState, ev: GameEvent, chosen) =>
      effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_047: Card = {
  id: 'SFD-047', cardNo: 'SFD·047/221', name: '山猿老祖', category: 'unit',
  domains: ['green'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你给予我增益时我变为活跃(makeApeElderTrigger)' }],
}

                     
export const LONGTAIL16_DEFIDS: readonly string[] = ['UNL-015', 'UNL-110', 'SFD-047']

                                                          
                                                    
                                                                         
                                                  
