                          
  
                                      
                                                                  
                                                           
                                                                 
                                               
                
                                                           
                                                           
                                                           

import type { Card } from '../../src/dsl/card'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameObject } from '../../src/state/object'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import { isEquipment, isRune, isUnit } from '../../src/state/cardTypes'
import { multiSelectChoice, multiSelectPicked, multiSelectPickedLegal } from '../../src/loop/multiSelect'
import { hasDomain, DOMAIN_OF_EPITHET, domainIdOf } from './card-domain'                   
import { ownerHandZone } from './enter-triggers-batch'
import { onField } from './activated-batch2'                         

   
                      
                                                
                                          
   
export function activateEvent(o: GameObject): GameEvent | null {
  if (isUnit(o)) {
    return o.status.dormant === true
      ? { kind: 'statusChange', target: o.oid, key: 'dormant', value: false }
      : null                           
  }
  return o.status.tapped === true
    ? { kind: 'statusChange', target: o.oid, key: 'tapped', value: false }
    : null
}
                                  
export function isInactive(o: GameObject): boolean {
  return isUnit(o) ? o.status.dormant === true : o.status.tapped === true
}

                                                             
                      
                                        
                                   
                                                 
export const SFD_204_CARD_EFFECT = '让你的所有单位变为活跃状态。'
export const SFD_204_SPEC: PlaySpec = {
  defId: 'SFD-204', cardNo: 'SFD·204/221', name: '狩猎',
  kind: 'spell',
  cost: { mana: 1, pips: [['orange', 'purple'], ['orange', 'purple']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (state: GameState): readonly GameEvent[] =>
      Object.values(state.objects)
        .filter((o) => isUnit(o) && onField(state, o) && o.controller === controller)
        .map((o) => activateEvent(o))
        .filter((e): e is GameEvent => e !== null),
}
export const SFD_204: Card = {
  id: 'SFD-204', cardNo: 'SFD·204/221', name: '狩猎', category: 'spell',
  domains: ['orange', 'purple'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '让你的所有单位变为活跃状态(SFD_204_SPEC)' }],
}

                                                             
                            
                                           
                                                 
                                                      
export const VEN_150_CARD_EFFECT = '让最多四个单位、装备或符文变为活跃状态。'
const VEN_150_PREFIX = 'accelGate'
const VEN_150_MAX = 4
                                                       
                                        
export function accelGateCandidates(state: GameState): string[] {
  return Object.values(state.objects)
    .filter((o) => (isUnit(o) || isEquipment(o) || isRune(o)) && onField(state, o) && isInactive(o))
    .map((o) => o.oid as string)
}
export const VEN_150_SPEC: PlaySpec = {
  defId: 'VEN-150', cardNo: 'VEN·150', name: '加速之门',
  kind: 'spell',
  cost: { mana: 3, pips: [['blue', 'orange']] },
  keywords: [],
  targetlessChoice: true, // ★780:选择走问链 —— 漏了这行整张卡在真流程里一条动作都列不出来(★499 同款)
  target: 'custom',
  legalTargets: (): string[] => [],
  choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.7】「让最多四个单位、装备或符文变为活跃状态」= 打出时选目标
  firstAskOptional: true, // ★1802c §355.13:卡文「让**最多四个**单位、装备或符文变为活跃状态」⇒ 含 0
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (multiSelectPicked(chosen, VEN_150_PREFIX).length >= VEN_150_MAX) return null      
      return multiSelectChoice({
        itemId: `play:${movedCardOid}`,
        controller,
        prefix: VEN_150_PREFIX,
        prompt: '加速之门:让最多四个单位、装备或符文变为活跃状态',
        isTarget: true, // ★1782 让最多四个单位、装备或符文变为活跃状态
        candidates: (st) => accelGateCandidates(st)
          .map((oid) => ({ id: oid, label: `${st.objects[oid as ObjId]?.defId ?? oid}` })),
      })(state, chosen)
    },
  makeResolve:
    () =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
                                                                         
      multiSelectPickedLegal(chosen, VEN_150_PREFIX, state, (st) => accelGateCandidates(st))
        .slice(0, VEN_150_MAX)
        .map((oid) => state.objects[oid as ObjId])
        .filter((o): o is GameObject => o !== undefined)
        .map((o) => activateEvent(o))
        .filter((e): e is GameEvent => e !== null),
}
export const VEN_150: Card = {
  id: 'VEN-150', cardNo: 'VEN·150', name: '加速之门', category: 'spell',
  domains: ['blue', 'orange'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '最多四个单位/装备/符文变为活跃(VEN_150_SPEC)' }],
}

                                                                
                            
                                                   
                                                         
                          
export const OGS_002_CARD_EFFECT = '对一处战场的所有敌方单位各造成3点伤害。'
const OGS_002_ZONE = 'firestormZone'
const OGS_002_DAMAGE = 3
   
                                                                
                              
   
export function firestormBattlefields(state: GameState): string[] {
  const out: string[] = []
  for (const z of zonesByKind(state, 'battlefield')) out.push(z.id as string)
  return out
}
export const OGS_002_SPEC: PlaySpec = {
  defId: 'OGS-002', cardNo: 'OGS·002/024', name: '烈火风暴',
  kind: 'spell',
  cost: { mana: 6, pips: [['red']] },
  keywords: [],
                                                                  
  choiceTiming: 'confirm',
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (chosen[OGS_002_ZONE] !== undefined) return null            
      return {
        itemId: `play:${movedCardOid}`,
        key: OGS_002_ZONE,
        controller,
        prompt: '烈火风暴:选择一处战场',
        isTarget: true, // ★1782 对一处战场的**所有**敌方单位各造成3点伤害
        candidates: firestormBattlefields(state).map((z) => ({ id: z, label: z })),
      }
    },
  makeResolve:
    ({ controller, movedCardOid }: { controller: PlayerId; movedCardOid: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const zone = chosen?.[OGS_002_ZONE]
                                                         
      if (zone === undefined || !firestormBattlefields(state).includes(zone)) return []
      return (state.zones[zone as ZoneId]?.contents ?? [])
        .map((oid) => state.objects[oid])
        .filter((o): o is GameObject => o !== undefined && isUnit(o) && o.controller !== controller)
        .map((o) => ({ kind: 'damage', target: o.oid, amount: OGS_002_DAMAGE, sourcePlayer: controller, source: movedCardOid as ObjId }))                        
    },
}
export const OGS_002: Card = {
  id: 'OGS-002', cardNo: 'OGS·002/024', name: '烈火风暴', category: 'spell',
  domains: ['red'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对一处战场的所有敌方单位各3点伤害(OGS_002_SPEC)' }],
}

                                                                
                         
                                              
                                                  
                                         
export const SFD_147_CARD_EFFECT = '让所有单位和装备返回其所属的手牌。'
export const SFD_147_SPEC: PlaySpec = {
  defId: 'SFD-147', cardNo: 'SFD·147/221', name: '坠渊之流',
  kind: 'spell',
  cost: { mana: 8, pips: [['purple'], ['purple']] },
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: () => (state: GameState): readonly GameEvent[] =>
    Object.values(state.objects)
      .filter((o) => (isUnit(o) || isEquipment(o)) && onField(state, o))
      .map((o) => ({ kind: 'zoneChange', obj: o.oid, to: ownerHandZone(state, o.oid) })), // ★383 收债
}
export const SFD_147: Card = {
  id: 'SFD-147', cardNo: 'SFD·147/221', name: '坠渊之流', category: 'spell',
  domains: ['purple'], energy: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '所有单位和装备返回所属手牌(SFD_147_SPEC)' }],
}

                                                                
                                   
                                                              
                                            
                                                          
export const VEN_131_CARD_EFFECT = '摧毁一个具有混沌（{{紫色}}）特性的敌方单位或装备。'
                                                 
                                              
export function isChaos(defId: string): boolean {
  return hasDomain(defId, DOMAIN_OF_EPITHET['混沌']!)
}
export const VEN_131_SPEC: PlaySpec = {
  defId: 'VEN-131', cardNo: 'VEN·131', name: '团结箴言',
  kind: 'spell',
  cost: { mana: 2, pips: [['yellow']] },
  keywords: [],
  target: 'enemyUnit',
  legalTargets: (state: GameState, controller: PlayerId): readonly string[] =>
    Object.values(state.objects)
      .filter((o) => (isUnit(o) || isEquipment(o)) && onField(state, o)
        && o.controller !== controller && isChaos(domainIdOf(o)))                      
      .map((o) => o.oid as string),
  makeResolve:
    ({ target }: { target?: string }) =>
    (): readonly GameEvent[] =>
      target === undefined ? [] : [{ kind: 'destroy', target: target as ObjId }], // ㊾ 摧毁一律发 destroy
}
export const VEN_131: Card = {
  id: 'VEN-131', cardNo: 'VEN·131', name: '团结箴言', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '摧毁一个紫色特性的敌方单位或装备(VEN_131_SPEC)' }],
}

                                                     
export const LONGTAIL7_DEFIDS: readonly string[] = ['SFD-204', 'VEN-150', 'OGS-002', 'SFD-147', 'VEN-131']
