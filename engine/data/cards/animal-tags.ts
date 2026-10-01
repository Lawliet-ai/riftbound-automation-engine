                                                                
  
                                          
                                                                         
                                                          
                                              
                                               
                                           
  
                                                                       
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { objectCardTags } from '../cardTagQuery'
import { fieldedUnits, pumpEvent } from './activated-batch'

   
                                                  
                                                            
                                     
   
export const ANIMAL_TAGS: ReadonlySet<string> = new Set(['鸟类', '猫科', '犬形', '魄罗'])

   
                                                 
                                 
   
export function animalTagKinds(state: GameState, player: PlayerId): number {
  const seen = new Set<string>()
  for (const oid of fieldedUnits(state, { of: player, friendly: true })) {
    const o = state.objects[oid]
    if (!o) continue
                                                           
                                                 
    for (const t of objectCardTags(o)) if (ANIMAL_TAGS.has(t)) seen.add(t)
  }
  return seen.size
}

                                 
export function hasAllAnimalTags(state: GameState, player: PlayerId): boolean {
  return animalTagKinds(state, player) === ANIMAL_TAGS.size
}

                                                                
                                       
                                                       
                                 
                                                                                  
                                                                     
                                                           
export const UNL_046_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '选择一名单位。你的单位中每有一种以下属性标签，则所选择的单位便在本回合内获得{{S}}+1 — “鸟类”、“猫科”、“犬形”、“魄罗”。'
export const UNL_046_KEYWORDS: readonly string[] = ['反应']

export const UNL_046_SPEC: PlaySpec = {
  defId: 'UNL-046', cardNo: 'UNL-046/219', name: '动物之友', kind: 'spell',
  cost: { mana: 1 }, // 卡面核:1法力 + 0pip
  keywords: [...UNL_046_KEYWORDS],
  target: 'custom',
                                                                
                                                            
  legalTargets: (state: GameState): readonly string[] => fieldedUnits(state),
  makeResolve:
    ({ target, controller }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined) return []
      const n = animalTagKinds(state, controller)
                                             
      return n === 0 ? [] : [pumpEvent('UNL-046:might', target, n)]
    },
}

export const UNL_046: Card = {
  id: 'UNL-046', cardNo: 'UNL-046/219', name: '动物之友', category: 'spell',
  domains: ['green'], energy: 1, keywords: [...UNL_046_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应];一名单位本回合按四种动物标签的种类数 +N 战力(UNL_046_SPEC)' }],
}

                                                                
                
                                                             
                                                     
                                                     
                                                                                            
                                           
export const UNL_196_CARD_EFFECT =
  '我以活跃状态进场。\n' +
  '你的单位中每有一种以下属性标签，我的费用便减少{{1}} — “鸟类”、“猫科”、“犬形”、“魄罗”。\n' +
  '当我进攻时，如果你的单位具有以上全部四种属性标签，则{{眩晕}}此处的一名敌方单位。（使其在本回合内无法造成战斗伤害。）'
const UNL_196_PICK = 'jujuStun'

                                                  
export function makeJujuAttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'stun', target: { ref: 'chosen', key: UNL_196_PICK } }],
  })
  return compileTrigger({
    id: 'UNL-196-stun',
    event: 'attack',
    by: 'you',
    when: [
      { kind: 'subjectIsSelf' }, // 「当**我**进攻时」
                                                     
      { kind: 'custom', test: (_ev: GameEvent, state: GameState) => hasAllAnimalTags(state, controller) },
    ],
    choose: {
      key: UNL_196_PICK,
      prompt: '小菊!:眩晕此处的一名敌方单位',
                                                  
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, controller: 'opponent', isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_196: Card = {
  id: 'UNL-196', cardNo: 'UNL-196/219', name: '小菊！', category: 'unit',
  domains: ['green', 'yellow'], energy: 9, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '活跃进场;按四种动物标签的种类数减费;进攻时集齐四种则眩晕此处敌方单位' }],
}

   
                                                     
                                                            
                                                       
                                                      
                                                      
   
export const GRASS_TAGS: ReadonlySet<string> = new Set([...ANIMAL_TAGS, '艾翁'])
