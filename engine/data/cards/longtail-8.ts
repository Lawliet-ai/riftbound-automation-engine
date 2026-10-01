                                                   
  
                                        
                                                                
                    
                                                             
                                                    
                                                     
  
                                             
                                                                                             
                                                               
                                           
  
        
                                                          
                                                             
                        
                                           

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameObject } from '../../src/state/object'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'
import { nextInTurnOrder } from '../../src/loop/chainFepr'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { allDiscards } from '../../src/keywords/insight'                                             
import { isTappedRune } from './tapped-runes'
import { multiSelectChoice, multiSelectPicked, multiSelectPickedLegal } from '../../src/loop/multiSelect'
import { activateEvent } from './longtail-7'
import { ownerHandZone } from './enter-triggers-batch'
import { onField } from './activated-batch2'                         

                                                            
function playersFrom(state: GameState, p: PlayerId): readonly PlayerId[] {
  const out: PlayerId[] = [p]
  let cur = p
  while (out.length < state.players.length) {
    cur = nextInTurnOrder(state, cur)
    out.push(cur)
  }
  return out
}
   
                              
                                                
                                                                   
   
function askEachPlayer(args: {
  readonly itemId: string
  readonly prefix: string
  readonly order: readonly PlayerId[]
  readonly prompt: string
  readonly optional: boolean
     
                                                              
                                  
                                                  
                                                          
                                                        
     
  readonly candidates: (
    state: GameState, player: PlayerId, picked: readonly ObjId[],
  ) => readonly { readonly id: string; readonly label: string }[]
}): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null {
  return (state, chosen) => {
    for (const p of args.order) {
      const key = `${args.prefix}:${p}`
      if (chosen[key] !== undefined) continue         
                                                    
      const picked = pickedByEach(state, args.prefix, args.order, chosen)
      const cands = [...args.candidates(state, p, picked)]
      if (args.optional) cands.push({ id: 'skip', label: '不选(可选)' })                     
      if (cands.length === 0) continue                         
      return { itemId: args.itemId, controller: p, key, prompt: `${args.prompt}(${p})`, candidates: cands }
    }
    return null
  }
}
                                        
function pickedByEach(
  state: GameState, prefix: string, order: readonly PlayerId[], chosen?: Readonly<Record<string, string>>,
): readonly ObjId[] {
  return order
    .map((p) => chosen?.[`${prefix}:${p}`])
    .filter((v): v is string => v !== undefined && v !== 'skip')
    .map((v) => v as ObjId)
    .filter((oid) => state.objects[oid] !== undefined)
}

                                                                
                         
              
                                                
                                        
                                                   
                                                  
export const OGN_209_CARD_EFFECT = '每名玩家选择并摧毁一名自己的单位。'
const OGN_209_PREFIX = 'purge'
export const OGN_209_SPEC: PlaySpec = {
  defId: 'OGN-209', cardNo: 'OGN·209/298', name: '清理门户',
  kind: 'spell',
  cost: { mana: 2, pips: [['yellow']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      askEachPlayer({
        itemId: `play:${movedCardOid}`,
        prefix: OGN_209_PREFIX,
        order: playersFrom(state, controller), // 卡文没写从谁起,按回合顺序从打出者开始
        prompt: '清理门户:选择并摧毁一名自己的单位',
        optional: false, // ⚠️「必须」——不给 skip
        candidates: (st, p) => Object.values(st.objects)
          .filter((o) => isUnit(o) && onField(st, o) && o.controller === p)         
          .map((o) => ({ id: o.oid as string, label: o.defId })),
      })(state, chosen),
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
      pickedByEach(state, OGN_209_PREFIX, playersFrom(state, controller), chosen)
        .map((oid) => ({ kind: 'destroy', target: oid })), // ㊾
}
export const OGN_209: Card = {
  id: 'OGN-209', cardNo: 'OGN·209/298', name: '清理门户', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每名玩家必须摧毁一名自己的单位(OGN_209_SPEC)' }],
}

                                                                
                                       
                
                                           
                                                  
                                        
                              
export const OGN_187_CARD_EFFECT = '从下一名玩家开始，每名玩家可以选择让一名单位返回其所属的手牌。'
const OGN_187_PREFIX = 'gale'
export const OGN_187_SPEC: PlaySpec = {
  defId: 'OGN-187', cardNo: 'OGN·187/298', name: '飓风席卷',
  kind: 'spell',
  cost: { mana: 4, pips: [['purple']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      askEachPlayer({
        itemId: `play:${movedCardOid}`,
        prefix: OGN_187_PREFIX,
        order: playersFrom(state, nextInTurnOrder(state, controller)), // 「从下一名玩家开始」
        prompt: '飓风席卷:可以让一名单位返回其所属手牌',
        optional: true, // ⚠️「可以选择」
        candidates: (st) => Object.values(st.objects)
          .filter((o) => isUnit(o) && onField(st, o))                 
          .map((o) => ({ id: o.oid as string, label: o.defId })),
      })(state, chosen),
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
      pickedByEach(state, OGN_187_PREFIX, playersFrom(state, nextInTurnOrder(state, controller)), chosen)
        .map((oid) => ({ kind: 'zoneChange', obj: oid, to: ownerHandZone(state, oid) })), // ★383 收债
}
export const OGN_187: Card = {
  id: 'OGN-187', cardNo: 'OGN·187/298', name: '飓风席卷', category: 'spell',
  domains: ['purple'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '从下一名玩家起各可让一名单位回手(OGN_187_SPEC)' }],
}

                                                                
                                                        
                                           
                    
  
                                       
                                                                                
                                                                 
                                                                     
                                                                      
                                                                       
                                                                             
  
                                   
                                            
                                                              
                                                  
                                            
                                                                    
                                              
                                                            
export const OGN_237_CARD_EFFECT =
  '从下一名玩家开始，每名其他玩家选择一个不受你控制且未被此法术选中过的单位，然后摧毁选中的所有单位。'
const OGN_237_PREFIX = 'decree'

   
                                                
  
                                                                            
                                                          
                                                   
                                                    
                        
                                                           
   
function decreeOrder(state: GameState, controller: PlayerId): readonly PlayerId[] {
  return playersFrom(state, nextInTurnOrder(state, controller)).filter((p) => p !== controller)
}

export const OGN_237_SPEC: PlaySpec = {
  defId: 'OGN-237', cardNo: 'OGN·237/298', name: '国王诏令',
  kind: 'spell',
  cost: { mana: 6, pips: [['yellow'], ['yellow']] }, // 卡面核:6法力+**2黄pip**(先猜 1 枚被 registryCoverage 闸咬住)
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      askEachPlayer({
        itemId: `play:${movedCardOid}`,
        prefix: OGN_237_PREFIX,
        order: decreeOrder(state, controller), // 「从下一名玩家开始」+「每名**其他**玩家」
        prompt: '国王诏令:选择一个不受打出者控制、且尚未被选中的单位(将被摧毁)',
        optional: false, // ⚠️ 卡文没有「可以」⇒ **必须**选(§355.10.f)
        candidates: (st, _p, picked) => Object.values(st.objects)
          .filter((o) => isUnit(o) && onField(st, o)
            && o.controller !== controller                             
            && !picked.includes(o.oid))                                     
          .map((o) => ({ id: o.oid as string, label: o.defId })),
      })(state, chosen),
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
                                                                        
      pickedByEach(state, OGN_237_PREFIX, decreeOrder(state, controller), chosen)
        .map((oid) => ({ kind: 'destroy', target: oid })),
}

export const OGN_237: Card = {
  id: 'OGN-237', cardNo: 'OGN·237/298', name: '国王诏令', category: 'spell',
  domains: ['yellow'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '从下一名玩家起每名其他玩家各选一个非我方且未被选过的单位,一起摧毁(OGN_237_SPEC)' }],
}

                                                                
                                                  
                                                
                                                                            
                                                        
                                           

                                                                 
                            
                                                      
                                                       
                                                                          
                                                
                                                           
export const OGS_017_CARD_EFFECT = '在你回合结束时，让最多两枚符文变为活跃状态。'
const OGS_017_MAX = 2
const OGS_017_PREFIX = 'annieRune'
export function makeAnnieLegendTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGS-017:endOfTurn:${selfOid}`, rawId: true, sourceDefId: 'OGS-017',
    event: 'endOfTurn',
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 「你」回合结束时
                                                           
                                                           
    nextChoice: (state, _ev, chosen) => multiSelectChoice({
      itemId: `trig:OGS-017:${selfOid}`,
      controller,
      prefix: OGS_017_PREFIX,
      prompt: '黑暗之女:让最多两枚符文变为活跃状态(可不选,不限敌我)',
                                                                         
                                                        
      isTarget: true,
      doneLabel: '够了,不再选',
      max: OGS_017_MAX,
      candidates: (st) => Object.values(st.objects)
        // ⭐原注释留证:「与 longtail-36 的 tappedRunes 同判据(不限敌我)」—— ★1512 据它折到共用件
        .filter((o) => isTappedRune(o))
        .map((o) => ({ id: o.oid as string, label: o.defId }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    })(state, chosen),
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] =>
                                
      multiSelectPicked(chosen, OGS_017_PREFIX)
        .slice(0, OGS_017_MAX)
        .map((oid) => state.objects[oid as ObjId])
        .filter((o): o is NonNullable<typeof o> => o !== undefined && isTappedRune(o))
        .map((o) => activateEvent(o))
        .filter((e): e is GameEvent => e !== null),
  }, selfOid, controller)
}
export const OGS_017: Card = {
  id: 'OGS-017', cardNo: 'OGS·017/024', name: '黑暗之女', category: 'legend',
  domains: ['red', 'purple'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你回合结束时最多两枚符文变活跃,不限敌我(makeAnnieLegendTrigger)' }],
}

                                                                
                              
                                        
                                                     
                                       
export const VEN_103_CARD_EFFECT = '让最多两名单位从任意废牌堆返回其所属的手牌。'
const VEN_103_PREFIX = 'echoesPast'
const VEN_103_MAX = 2
                                                       
                                               
export function echoesPastCandidates(state: GameState): string[] {
                                      
  return allDiscards(state)
    .map((oid) => state.objects[oid])
    .filter((o): o is GameObject => o !== undefined && isUnit(o))
    .map((o) => o.oid as string)
}
export const VEN_103_SPEC: PlaySpec = {
  defId: 'VEN-103', cardNo: 'VEN·103', name: '往日阴影',
  kind: 'spell',
  cost: { mana: 3, pips: [['purple']] },
  keywords: [],
  targetlessChoice: true, // ★780:选择走问链 —— 漏了这行整张卡在真流程里一条动作都列不出来(★499 同款)
  target: 'custom',
  legalTargets: (): string[] => [],
  choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.10】废牌堆是公开区域、效果的对象 ⇒ 目标在打出时选定
  firstAskOptional: true, // ★1802c §355.13:卡文「让**最多两名**单位从任意废牌堆返回其所属手牌」⇒ 含 0
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (multiSelectPicked(chosen, VEN_103_PREFIX).length >= VEN_103_MAX) return null      
      return multiSelectChoice({
        itemId: `play:${movedCardOid}`,
        controller, // 挑的人始终是打出者(不是废牌堆的主人)
        prefix: VEN_103_PREFIX,
        prompt: '往日阴影:最多两名单位从任意废牌堆回到其所属手牌',
                                                                    
                                                 
        isTarget: true,
                                                                                                 
                                                                         
                                                                            
        candidates: (st) => echoesPastCandidates(st)
          .map((oid) => ({ id: oid, label: `${st.objects[oid as ObjId]?.defId ?? oid}` })),
      })(state, chosen)
    },
  makeResolve:
    () =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
                                                                       
      multiSelectPickedLegal(chosen, VEN_103_PREFIX, state, (st) => echoesPastCandidates(st))
        .slice(0, VEN_103_MAX)
        .map((oid) => state.objects[oid as ObjId])
        .filter((o): o is GameObject => o !== undefined)
        .map((o) => ({ kind: 'zoneChange', obj: o.oid, to: ownerHandZone(state, o.oid) })), // 所属者(★383 收债)
}
export const VEN_103: Card = {
  id: 'VEN-103', cardNo: 'VEN·103', name: '往日阴影', category: 'spell',
  domains: ['purple'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '最多两名单位从任意废牌堆回所属手牌(VEN_103_SPEC)' }],
}

                     
                                                       
export const LONGTAIL8_DEFIDS: readonly string[] = ['OGN-209', 'OGN-187', 'OGS-017', 'VEN-103']
