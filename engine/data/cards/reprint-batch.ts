                    
  
                              
                                                
                                                                      
                                   
                                                       
  
                      
                                                          
                                                              
                                                               
                                                                         
                                               
                                  
  
                                               
                                                                         
                                                         

import type { Card } from '../../src/dsl/card'
import { victimIsSelf } from '../../src/keywords/lastRites'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasteChoice, type EffectSpec } from '../../src/dsl/effectSpec'                 
import { hasteKeyOf } from './haste-key'                                                                       
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { eventBattlefield } from '../../src/state/selfHere'            
import { SUBJECT_IS_UNIT } from './notTokenGuard1154'

                                      
export const MINION = { defId: 'token:随从', baseMight: 1, baseTypes: ['unit'] as const, baseTags: ['随从'] as const }                                               

   
                                             
  
                                      
                                                                              
                                                              
                                                    
                                                          
                             
   
export const WAR_HAWK_TOKEN = {
  defId: 'token:战鹰', baseMight: 1, baseTypes: ['unit'] as const, baseKeywords: ['法盾'] as const,
  baseTags: ['鸟类'] as const,// §187 标签(读口在 cardTagQuery.TOKEN_TAGS,这里保持一致)
}

                                                                          
                                       
                                    
  
                                                           
                                           
                                          
                                                 
                                                                          
export const OGN_251_CARD_EFFECT = '在你的回合开始阶段，如果你的手牌不足两张，则再抽一张牌。'

                               
function handSizeOf(state: GameState, p: PlayerId): number {
  return state.zones[`hand:${p}`]?.contents.length ?? 0
}

export function makeJinxLegendTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    guard: (ctx) => handSizeOf(ctx.state, ctx.controller) < 2,
    then: [{ op: 'draw', count: 1 }],
  })
  return compileTrigger({
    id: `OGN-251:startPhase:${selfOid}`, rawId: true, sourceDefId: 'OGN-251',
    event: 'startPhase',
                                                     
                                                                             
                                                              
                                                  
    by: 'any',
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 「【你的】回合开始阶段」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
const jinxLegend = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '暴走萝莉', category: 'legend',
  domains: ['red', 'purple'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你的开始阶段手牌<2则多抽一张(makeJinxLegendTrigger)' }],
})
export const OGN_251: Card = jinxLegend('OGN-251', 'OGN·251/298')

                                                                          
                                                  
                                                   
  
                                                    
                                                                    
                                                      
                                                    
                                                                          
export const OGN_119_CARD_EFFECT = '当我进攻或防守时，让此处的一名敌方单位在本回合内{{S}}-2，不得低于1{{S}}。'

export function makeAhriDreamerTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const effect = compileEffect({
    then: [{
      op: 'addMight', target: { ref: 'chosen', key: 'foe' }, delta: -2, floor: 1,
      duration: 'thisTurn', id: `OGN-119:${selfOid}`,
    }],
  })
  return (['attack', 'defend'] as const).map((event) => compileTrigger({
    id: `OGN-119:${event}:${selfOid}`, rawId: true, sourceDefId: 'OGN-119',
    abilityKey: `OGN-119:might:${selfOid}`, // ⑧ 一卡多时机共用一个 abilityKey
    event, by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻或防守时」
    choose: {
      key: 'foe', prompt: '阿狸:让此处的一名敌方单位本回合内战力-2(不低于 1)',
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent', isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller))
}
const ahriDreamer = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '阿狸', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻/防守时此处一名敌方单位[M]-2(不低于1)(makeAhriDreamerTriggers)' }],
})
export const OGN_119: Card = ahriDreamer('OGN-119', 'OGN·119/298')

                                                                          
                             
                                                
  
                                                                
                                                      
                                                              
                                             
                                                                          
export const OGN_255_CARD_EFFECT = '当敌方单位进攻你控制的战场时，让其本回合内{{S}}-1，不得低于1{{S}}。'

export function makeNineTailsLegendTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'addMight', target: { ref: 'eventSubject' }, delta: -1, floor: 1,
      duration: 'thisTurn', id: `OGN-255:${selfOid}`,
    }],
  })
  return compileTrigger({
    id: `OGN-255:attack:${selfOid}`, rawId: true, sourceDefId: 'OGN-255',
    event: 'attack',
    by: 'opponent', // 「【敌方】单位进攻」
    when: [{
      kind: 'custom',
                                
                                                      
                                                                      
      test: (ev, state) => {
        if ((ev as { unit?: unknown }).unit === undefined) return false
        const bf = eventBattlefield(ev as { battlefield?: unknown })                                   
        return bf !== undefined && controlledBattlefields(state, controller).includes(bf)
      },
    }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
const nineTails = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '九尾妖狐', category: 'legend',
  domains: ['green', 'blue'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '敌方单位进攻我控制的战场时其[M]-1(不低于1)(makeNineTailsLegendTrigger)' }],
})
export const OGN_255: Card = nineTails('OGN-255', 'OGN·255/298')

                                                                          
                              
                                   
  
                                                             
                                              
                 
                                                                          
export const UNL_183_CARD_EFFECT = '当你打出一名单位时，让一名单位本回合内{{S}}+1。'

export function makeRengarLegendTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'addMight', target: { ref: 'chosen', key: 'unit' }, delta: 1,
      duration: 'thisTurn', id: `UNL-183:${selfOid}`,
    }],
  })
  return compileTrigger({
    id: `UNL-183:playUnit:${selfOid}`, rawId: true, sourceDefId: 'UNL-183',
    event: 'playUnit', by: 'you',
                                                               
                                                      
    when: [SUBJECT_IS_UNIT],
    choose: {
      key: 'unit', prompt: '傲之追猎者:让一名单位本回合内战力+1',
      selector: { type: 'unit', fielded: true, isTarget: true }, // 敌我不限、位置不限
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
const rengarLegend = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '傲之追猎者', category: 'legend',
  domains: ['red', 'orange'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你打出单位时让一名单位本回合[M]+1(makeRengarLegendTrigger)' }],
})
export const UNL_183: Card = rengarLegend('UNL-183', 'UNL-183/219')

                                                                          
                                                 
                                  
                                
  
                                                  
                                       
                         
                                                             
                                                     
                                                                          
export const OGN_246_CARD_EFFECT =
  '如果我在场上，则每当你的另一名非“随从”单位被摧毁时，打出一名1{{S}}的“随从”到你的基地。'

                                       
export const OGN_246_HASTE_KEY = hasteKeyOf('OGN-246:minion')
export function makeViktorLeaderTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                               
  const effSpec: EffectSpec = {
    then: [{ op: 'spawnToken', spec: MINION, zone: (ctx) => `base:${ctx.controller}`, haste: { key: OGN_246_HASTE_KEY, label: '随从' } }],
  }
  const effect = compileEffect(effSpec)
  return compileTrigger({
    id: `OGN-246:destroyed:${selfOid}`, rawId: true, sourceDefId: 'OGN-246',
    event: 'destroyed',
    by: 'any', // 「被摧毁」不问是谁下的手
    when: [
      { kind: 'victimIs', portrait: { types: ['unit'], side: 'friendly' } }, // ①「你的」单位
      {
        kind: 'custom',
        test: (ev) => {
          const v = (ev as { victim?: { oid: ObjId; defId: string; postDeathOid?: ObjId } }).victim
          if (!v) return false
                                                                  
          if (victimIsSelf(v, selfOid)) return false                          
          return v.defId !== MINION.defId                                
        },
      },
    ],
    postChoice: (state, chosen) => effectHasteChoice(effSpec, state, controller, chosen), // ★1399 落点写死基地不问 ⇒ 只问急速
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
const viktorLeader = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '维克托', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的另一名非随从单位被摧毁时打出一个随从到基地(makeViktorLeaderTrigger)' }],
})
export const OGN_246: Card = viktorLeader('OGN-246', 'OGN·246/298')

                                   
export const REPRINT_BATCH_DEFIDS: readonly string[] = [
  'OGN-251', 'OGN-301', 'FND-251',
  'OGN-119', 'SFD-227',
  'OGN-255', 'OGN-303',
  'UNL-183', 'UNL-227',
  'OGN-246', 'ARC-006',
]
