                                                                        
                                                                
                                             
                                 
                                   
                                                 
                               
                           
  
           
                                                                     
                                                               
                                                                
                                                                     
                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { becameActive } from './longtail-2'

export const VEN_088_PICK = 'hammerMode'
export const VEN_088_MODES = ['强攻2', '法盾2', '游走'] as const

export const VEN_088_CARD_EFFECT =
  '当我变为活跃状态时，选择一个给予我在本回合内的效果 —\n'
  + '- {{强攻2}}（如果我是进攻方，则{{S}}+2。）\n'
  + '- {{法盾2}}（对手必须支付{{A}}{{A}}才能将我选作法术或技能的目标。）\n'
  + '- {{游走}}（我可以向其他战场进行移动。）'

export function makeJayceHammerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-088:active:${selfOid}`, rawId: true, sourceDefId: 'VEN-088',
    event: 'statusChange',
    by: 'any', // 谁让我活跃的都算(卡文没写「你」,㊼ VEN-071 同注)
    when: [{ kind: 'subjectIsSelf' }, { kind: 'custom', test: becameActive }],
    nextChoice: (state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[VEN_088_PICK] !== undefined) return null
      if (state.objects[selfOid] === undefined) return null                      
      return {
        itemId: `trig:VEN-088:active:${selfOid}`, controller, key: VEN_088_PICK,
        prompt: '杰斯·举锤待发:选择一个本回合效果({{强攻2}}/{{法盾2}}/{{游走}})',
        candidates: VEN_088_MODES.map((m) => ({ id: m, label: `{{${m}}}` })), // 「选择一个」必选无 skip
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const mode = chosen?.[VEN_088_PICK]
      if (mode === undefined || !(VEN_088_MODES as readonly string[]).includes(mode)) return []
      if (state.objects[selfOid] === undefined) return []             
      return [{
        kind: 'addEffect',
        effect: {
          id: `VEN-088:grant:${mode}:${selfOid}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { oid: ObjId }) => x.oid === selfOid,
          modification: { kind: 'grantKeyword', keyword: mode }, // 「给予我在本回合内的效果」
        },
      } ]
    },
  }, selfOid, controller)
}

export const VEN_088: Card = {
  id: 'VEN-088', cardNo: 'VEN·088', name: '杰斯', category: 'unit',
  domains: ['orange'], energy: 4, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我变为活跃时三选一本回合关键词(makeJayceHammerTrigger)' }],
}
