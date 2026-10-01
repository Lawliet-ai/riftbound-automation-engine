                                                                        
                                                             
                                                  
                              
                                               
                                      
  
                                                           
                                                             
                                                         
                                                             
                                                                       
                                          
                                                                      
                                                        
                                                               
                                                              
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { fieldedUnits } from './activated-batch'                          
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const VEN_155_CARD_EFFECT =
  '当你从你的手牌以外的位置打出一张卡牌时，强化我。\n'
  + '{{迅捷>}}解除我的强化，{{横置}}：给予一名单位在本回合内{{强攻2}}。'
  + '（如果其为进攻方，则{{S}}+2。）'

                                       
export const VEN_155_GRANT = '强攻2'

                                                                   
export function makeRageHeartTrigger(selfOid: ObjId, controller: PlayerId, event: 'playUnit' | 'playSpell'): Trigger {
  return compileTrigger({
    id: `VEN-155-${event}:${selfOid}`, rawId: true, sourceDefId: 'VEN-155',
    event,
    by: 'you', // 「当【你】…打出」
    when: [{
      kind: 'custom',
                                                                  
      test: (ev): boolean => {
        const k = (ev as { readonly fromZoneKind?: string }).fromZoneKind
        return k !== undefined && k !== 'hand'
      },
    }],
    effect: (state: GameState): readonly GameEvent[] => {
      if (!state.objects[selfOid]) return []
                                                  
      return [{ kind: 'empower', target: selfOid } as GameEvent]
    },
  }, selfOid, controller)
}

                                                             
export const VEN_155_SPEC: ActivatedSpec = {
  key: 'VEN-155:pump',
  label: '{{迅捷}} 解除我的强化并{{横置}}:给予一名单位在本回合内{{强攻2}}',
  keywords: ['迅捷'],
  cost: {},
  tapSelf: true,
  unempowerSelf: true,
  target: 'custom',
  legalTargets: (state: GameState): string[] =>
    fieldedUnits(state), // ★1515:折到共用件(㊼ 「一名单位」零限定;判据逐字等价,含 §187.6 映像那一档)
  makeResolve: ({ target }: { target?: string }) => (state: GameState): readonly GameEvent[] => {
    if (target === undefined || !state.objects[target as ObjId]) return []
    return [{
      kind: 'addEffect',
      effect: {
        id: `VEN-155:pump:${target}`, duration: 'thisTurn', fromPassive: false,
        predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
        modification: { kind: 'grantKeyword', keyword: VEN_155_GRANT },
      },
    } as GameEvent]
  },
}

export const VEN_155: Card = {
  id: 'VEN-155', cardNo: 'VEN·155', name: '狂暴之心', category: 'legend',
  domains: ['purple', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '手牌以外打出卡牌⇒强化我(makeRageHeartTrigger×2);迅捷>解除强化+横置给一名单位本回合强攻2(VEN_155_SPEC)' },
  ],
}
