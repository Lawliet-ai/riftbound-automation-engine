                          
  
                
                                                          
                                                 
                                                               
                      

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { multiSelectChoice, multiSelectPicked, multiSelectPickedLegal } from '../../src/loop/multiSelect'
import { fieldedUnitCandidates } from './activated-batch'
import { isUnit } from '../../src/state/cardTypes'
import { selfOnBattlefield } from './backline-heroes'                                 
import { isMyTappedRune } from './tapped-runes'                          

                                                               
                             
                                
                                                 
export const OGN_201_CARD_EFFECT = '每名玩家弃置自己的所有手牌，然后抽四张牌。'
export const OGN_201_SPEC: PlaySpec = {
  defId: 'OGN-201', cardNo: 'OGN·201/298', name: '反转时间线',
  kind: 'spell',
  cost: { mana: 3, pips: [['purple']] },
  keywords: [],
  target: 'none', // §355.10.d 由流程自动选定,不算目标选取
  legalTargets: (): string[] => [],
  makeResolve: () => (state: GameState): readonly GameEvent[] => {
    const out: GameEvent[] = []
    for (const p of state.players) {
      for (const oid of state.zones[`hand:${p}`]?.contents ?? []) {
        out.push({ kind: 'zoneChange', obj: oid as ObjId, to: `discard:${p}` as never })
      }
    }
                               
    for (const p of state.players) out.push({ kind: 'draw', player: p, count: 4 })
    return out
  },
}
export const OGN_201: Card = {
  id: 'OGN-201', cardNo: 'OGN·201/298', name: '反转时间线', category: 'spell',
  domains: ['purple'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每名玩家弃光手牌然后抽四张(OGN_201_SPEC)' }],
}

                                                                
                       
                                                           
                             
                          
export const OGN_105_CARD_EFFECT = '对最多两名单位各造成6点伤害。'
const OGN_105_PREFIX = 'starfall'
const OGN_105_MAX = 2
export const OGN_105_SPEC: PlaySpec = {
  defId: 'OGN-105', cardNo: 'OGN·105/298', name: '星芒凝汇',
  kind: 'spell',
  cost: { mana: 6, pips: [['blue'], ['blue']] },
  keywords: [],
  targetlessChoice: true, // ★499:选择走问链(修跨轮 bug:不加这行真流程里列不出来)
  target: 'custom',
  legalTargets: (): string[] => [],
  choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.7】「对最多两名单位各造成6点伤害」= 打出时选目标
  firstAskOptional: true, // ★1802c §355.13:卡文「对**最多**两名单位各造成6点伤害」⇒ 含 0,无单位也能打
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                    
      if (multiSelectPicked(chosen, OGN_105_PREFIX).length >= OGN_105_MAX) return null
      return multiSelectChoice({
        itemId: `play:${movedCardOid}`,
        controller,
        prefix: OGN_105_PREFIX,
        prompt: '星芒凝汇:对最多两名单位各造成6点伤害',
                                                                                                                             
        isTarget: true, // 卡文「对最多两名单位各造成6点伤害」= §355.7 选取目标
        candidates: (st) => fieldedUnitCandidates(st, controller)
          .map((oid) => ({ id: oid, label: `${st.objects[oid]?.defId ?? oid}` })),
      })(state, chosen)
    },
  makeResolve: ({ controller, movedCardOid }: { controller: PlayerId; movedCardOid: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
                                                                    
      multiSelectPickedLegal(chosen, OGN_105_PREFIX, state, (st) => fieldedUnitCandidates(st, controller))
        .slice(0, OGN_105_MAX)
        // §428.5.c 归因:sourcePlayer 认【人】,source 认【是哪一张卡】——法术两样都要
        .map((oid) => ({ kind: 'damage', target: oid as ObjId, amount: 6, sourcePlayer: controller, source: movedCardOid as ObjId })),
}
export const OGN_105: Card = {
  id: 'OGN-105', cardNo: 'OGN·105/298', name: '星芒凝汇', category: 'spell',
  domains: ['blue'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对最多两名单位各造成6点伤害(OGN_105_SPEC)' }],
}

                                                               
                                         
                                                 
                         
                                         
                                              
                                                      
                                                          
                                                     
                                             
                                                        
                                                             
                                                                     
                                                      
                                                     
                                                                   
                                                      
                                                     
                                                
export const OGN_073_CARD_EFFECT = '在你的回合结束时，如果我位于战场上，则让最多四枚友方符文变为活跃状态。'
const OGN_073_MAX = 4
const OGN_073_PREFIX = 'sonaRune'
                                                                    
                                                 
                                                                      
                                                      
                                                                      
export function makeSonaTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                          
                                      
                                                               
  const effect = compileEffect({
    then: [{
      op: 'custom',
                                                                    
                                                         
      emit: (ctx): readonly GameEvent[] =>
        multiSelectPicked(ctx.chosen, OGN_073_PREFIX)
          .slice(0, OGN_073_MAX)
          .map((oid) => ctx.state.objects[oid as ObjId])
          // ★1511:判据折到共用件(⚠️★1509 那把尺子看不见【内联】的这一份)
          .filter((o): o is NonNullable<typeof o> =>
            o !== undefined && isMyTappedRune(o, ctx.controller))
          .map((o) => ({ kind: 'statusChange', target: o.oid, key: 'tapped', value: false })),
    }],
  })
  return compileTrigger({
    id: `OGN-073:endOfTurn:${selfOid}`, rawId: true, sourceDefId: 'OGN-073',
    event: 'endOfTurn',
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 「你的」回合结束时
                                                                    
    additionalCondition: (state) => selfOnBattlefield(state, selfOid),
                                                               
                                                          
    nextChoice: (state, _ev, chosen) => multiSelectChoice({
      itemId: `trig:OGN-073:${selfOid}`,
      controller,
      prefix: OGN_073_PREFIX,
      prompt: '娑娜:让最多四枚友方符文变为活跃状态(可不选)',
      isTarget: true, // ★1782 让四枚友方符文变为活跃状态
      doneLabel: '够了,不再选',
      max: OGN_073_MAX,
      candidates: (st) => Object.values(st.objects)
        .filter((o) => isMyTappedRune(o, controller))                  
        .map((o) => ({ id: o.oid as string, label: o.defId }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    })(state, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_073: Card = {
  id: 'OGN-073', cardNo: 'OGN·073/298', name: '娑娜', category: 'unit',
  domains: ['green'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我的回合结束且我在战场上时(★1503:在战场是【触发条件】),解除最多四枚友方符文的横置(makeSonaTrigger)' }],
}

                     
export const LONGTAIL5_DEFIDS: readonly string[] = ['OGN-201', 'OGN-105', 'OGN-073']
