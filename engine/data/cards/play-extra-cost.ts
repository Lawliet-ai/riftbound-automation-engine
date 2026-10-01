                           
  
                                                                  
                                                                        
  
                                                                          
                            
                                                          
                                               
                                                          
                                                
                                             
                                             
                                                          
                                                            
                                                     
  
                                                          
                                           
  
                                                          
                                                                
                                                     
                                    
                                                                   
                                             
                                        

import type { Card } from '../../src/dsl/card'
import { OGN_150_EXTRA_COST } from './OGN-150'        
import { OGN_231_EXTRA_COST } from './OGN-231'        
import { enemyUnitsOnField } from './enemy-move'
import { openBattlefields } from '../../src/state/battlefieldControl'
import { selfBattlefield } from '../../src/state/selfHere'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { moveUnitEvents } from './enemy-move'
import { grantKeywordEvent } from './activated-batch'
import { fieldedUnits } from './activated-batch'                                           
import { scoredHere as scoredHereFn } from './scored-here'
import type { GameState } from '../../src/state/gameState'
import { allDiscards } from '../../src/keywords/insight'                      
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import type { CostMod } from '../../src/game/costPipeline'
import { experienceOf } from '../../src/keywords/level'
import { UNL_122_EXTRA_COST } from './extra-cost-501'                     
import { UNL_166_EXTRA_COST } from './extra-cost-502'                              
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { CARD_COSTS } from '../cardCosts'
import { isEquipment, isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'
import { returnToOwnerHand } from './enter-triggers-batch'
import { destroyableEquipment } from './OGN-056'

                                               
function friendlyOnField(
  state: GameState, player: PlayerId, is: (o: GameObject | undefined) => boolean,
): { readonly id: string; readonly label: string }[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === player && is(o) && onField(state, o))
    .map((o) => ({ id: o.oid as string, label: o.defId }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

                                                                
export const OGN_208_CARD_EFFECT = '你必须摧毁一名友方单位，作为打出我的额外费用。'

                                                                 
                                                      
export const friendlyUnitOptions = (state: GameState, player: PlayerId): readonly { readonly id: string; readonly label: string }[] =>
  friendlyOnField(state, player, isUnit)
export const destroyChosenEvents = (_state: GameState, player: PlayerId, choice?: string): readonly GameEvent[] =>
  choice === undefined ? [] : [{ kind: 'destroy', target: choice as ObjId, sourcePlayer: player }]

export const OGN_208_EXTRA_COST: PlayExtraCost = {
  label: '摧毁一名友方单位(打出我的额外费用)',
  required: true,
  options: friendlyUnitOptions,
  payEvents: destroyChosenEvents,
}

export const OGN_208: Card = {
  id: 'OGN-208', cardNo: 'OGN·208/298', name: '冷血贵族', category: 'unit',
  domains: ['yellow'], energy: 4, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我必须摧毁一名友方单位作额外费用(OGN_208_EXTRA_COST)' }],
}

                                                              
export const SFD_044_CARD_EFFECT = '你必须将一件友方装备返回其所属的手牌，作为打出我的额外费用。'

export const SFD_044_EXTRA_COST: PlayExtraCost = {
  label: '将一件友方装备返回其所属的手牌(打出我的额外费用)',
  required: true,
  options: (state, player) => friendlyOnField(state, player, isEquipment),
  payEvents: (state, _player, choice): readonly GameEvent[] => {
                                        
    return returnToOwnerHand(state, choice)                              
  },
}

export const SFD_044: Card = {
  id: 'SFD-044', cardNo: 'SFD·044/221', name: '军团军需官', category: 'unit',
  domains: ['green'], energy: 3, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我必须把一件友方装备退回所属手牌作额外费用(SFD_044_EXTRA_COST)' }],
}

                                                      
  
                                                                          
                                                         
                                                  
                                                                     
                                                                   

                                                                   
function flatManaDiscount(mana: number, source: string): readonly CostMod[] {
  return [{ kind: 'reduce', part: 'mana', mana, source }]
}

                                                              
export const OGN_002_CARD_EFFECT = '打出我时，你可以选择弃置一张手牌作为额外费用。若如此做，则我的费用减少{{2}}。'
                
export const OGN_002_DISCOUNT = 2

export const OGN_002_EXTRA_COST: PlayExtraCost = {
  label: '弃置一张手牌,让我的费用减少 2 法力',
                         
                                                           
                                                                 
  options: (state, player) => (state.zones[`hand:${player}`]?.contents ?? [])
    .map((oid) => state.objects[oid])
    .filter((o): o is GameObject => o !== undefined && o.defId !== 'OGN-002')
    .map((o) => ({ id: o.oid as string, label: o.defId })),
                                                  
  payEvents: (state, _player, choice): readonly GameEvent[] => {
    const o = choice === undefined ? undefined : state.objects[choice as ObjId]
    return o === undefined ? [] : [{ kind: 'zoneChange', obj: o.oid, to: `discard:${o.owner}` as ZoneId }]
  },
  discount: () => flatManaDiscount(OGN_002_DISCOUNT, 'OGN-002 粗鲁的海盗'),
}

export const OGN_002: Card = {
  id: 'OGN-002', cardNo: 'OGN·002/298', name: '粗鲁的海盗', category: 'unit',
  domains: ['red'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可弃一张手牌让费用减2(OGN_002_EXTRA_COST)' }],
}

                                                               
export const UNL_178_CARD_EFFECT =
  '你可以选择消耗3经验，作为打出我的额外费用，以此让我的费用减少{{3}}。'
export const UNL_178_DISCOUNT = 3
                   
export const UNL_178_XP = 3

export const UNL_178_EXTRA_COST: PlayExtraCost = {
  label: '消耗3经验,让我的费用减少 3 法力',
                                                   
                                                                  
                                                 
                                                  
                                                                    
                                                    
  available: (state, player) => experienceOf(state, player) >= UNL_178_XP,
  discount: () => flatManaDiscount(UNL_178_DISCOUNT, 'UNL-178 波比'),
                                              
  payEvents: (_state, player): readonly GameEvent[] =>
    [{ kind: 'spend', player, cost: {}, experience: UNL_178_XP }],
}

export const UNL_178: Card = {
  id: 'UNL-178', cardNo: 'UNL-178/219', name: '波比', category: 'unit', // 英雄单位 → unit
  domains: ['yellow'], energy: 6, power: 5, keywords: ['伏击', '壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可消耗3经验让费用减3(UNL_178_EXTRA_COST)' }],
}

                                                               
                                      
                                                                     
export const UNL_170_CARD_EFFECT =
  '你可以选择摧毁一名友方单位，作为打出我的额外费用。若如此做，则该单位每有1点法力费用，'
  + '我的法力费用便减少{{1}}，该单位每有1点符能费用，我的符能费用便减少{{黄色}}。'
export const UNL_170_ATTACK_EFFECT = '当我进攻时，防守方必须摧毁其在此处的一名单位。'
const UNL_170_VICTIM = 'ornnDefenderVictim'

   
                                              
                                                           
                                                     
                                                                           
                                                                   
                                                              
                                                 
                                                         
   
export const UNL_170_EXTRA_COST: PlayExtraCost = {
  label: '摧毁一名友方单位,按它的费用给我减免',
  options: friendlyUnitOptions,   // 与 OGN-208 同一份候选(㊼)
  payEvents: destroyChosenEvents, // 与 OGN-208 同一个付法(㊼)
  discount: (state, _player, choice): readonly CostMod[] => {
    const o = choice === undefined ? undefined : state.objects[choice as ObjId]
    const row = o === undefined ? undefined : CARD_COSTS[o.defId]
    if (row === undefined) return []
    const src = 'UNL-170 厄塔汗'
    return [
      ...(row.mana > 0 ? [{ kind: 'reduce' as const, part: 'mana' as const, mana: row.mana, source: src }] : []),
      ...(row.pips > 0 ? [{ kind: 'reduce' as const, part: 'pips' as const, pips: row.pips, source: src }] : []),
    ]
  },
}

   
                                        
                                                           
                                                 
                                               
                                                
                                                    
                                
   
export function makeUnl170AttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const defenderOf = (state: GameState): PlayerId | undefined =>
    state.players.find((p) => p !== controller)
                                                  
                                                                                                 
  const victims = (state: GameState): string[] => {
    const bf = selfBattlefield(state, selfOid)
    const def = defenderOf(state)
    if (bf === undefined || def === undefined) return []
    return Object.values(state.objects)
      .filter((o) => (o.zone as string) === bf && isUnit(o) && o.controller === def)
      .map((o) => o.oid as string)
      .sort()
  }
  return compileTrigger({
    id: 'UNL-170-attack',
    event: 'attack',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当**我**进攻时」
    nextChoice: (state, _ev, chosen) => {
      if (chosen[UNL_170_VICTIM] !== undefined) return null            
      const list = victims(state)
      const def = defenderOf(state)
      if (list.length === 0 || def === undefined) return null
      return {
        itemId: `trig:UNL-170:${selfOid}`,
        controller: def, // ★ 由【防守方】作答,不是我
        key: UNL_170_VICTIM,
        prompt: '厄塔汗:你必须摧毁你在此处的一名单位',
        candidates: list.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[UNL_170_VICTIM]
                                                                      
                                                 
                                           
      if (pick === undefined || !victims(state).includes(pick)) return []
                                             
      return [{ kind: 'destroy', target: pick as ObjId }]
    },
  }, selfOid, controller)
}

export const UNL_170: Card = {
  id: 'UNL-170', cardNo: 'UNL-170/219', name: '厄塔汗', category: 'unit',
  domains: ['yellow'], energy: 10, power: 7, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可摧毁一名友方单位按其费用减免(UNL_170_EXTRA_COST);进攻时防守方摧毁自己一名单位(makeUnl170AttackTrigger)' }],
}

                                                                  
const destroyableEquipmentOf = (state: GameState, player: PlayerId): readonly ObjId[] =>
  destroyableEquipment(state, player)
                                 
const destroyableEquipmentAll = (state: GameState): readonly ObjId[] =>
  destroyableEquipment(state)

                                                                 
                                
                                      
                                            
                                                     
                                                           
                                                          
                                                               
export const SFD_160_EXTRA_COST: PlayExtraCost = {
  label: '摧毁一件友方装备(打出我的额外费用)',
                         
  options: (state, player) => destroyableEquipmentOf(state, player)
    .map((oid) => ({ id: oid as string, label: `摧毁 ${state.objects[oid]?.defId ?? oid}` })),
  available: (state, player) => destroyableEquipmentOf(state, player).length > 0,
                                                             
  payEvents: (state, _player, choice) => {
    const o = choice === undefined ? undefined : state.objects[choice as ObjId]
    return o === undefined ? [] : [{ kind: 'destroy', target: o.oid } as GameEvent]
  },
}

export const SFD_160: Card = {
  id: 'SFD-160', cardNo: 'SFD·160/221', name: '祖安混混', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '可摧毁一件友方装备作为额外费用(SFD_160_EXTRA_COST)' },
    { kind: 'passive', describe: '付了额外费则摧毁一件装备(makeThugTrigger;ev.bonus 判)' },
  ],
}

export function makeThugTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-160:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-160',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
                                             
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
                                                               
    nextChoice: (state, _ev, chosen) => {
      if (chosen['gear'] !== undefined) return null
      const cands = destroyableEquipmentAll(state)
      if (cands.length === 0) return null                                    
      return { itemId: `SFD-160:play:${selfOid}`, controller, key: 'gear',
        prompt: '祖安混混:摧毁一件装备(敌我皆可)',
        candidates: cands.map((oid) => ({ id: oid as string, label: `摧毁 ${state.objects[oid]?.defId ?? oid}` })),
                                                                      
                                             
                                                             
        isTarget: true }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['gear']
      if (t === undefined || !state.objects[t as ObjId]) return []
      return [{ kind: 'destroy', target: t as ObjId } as GameEvent]
    },
  }, selfOid, controller)
}

                                                          
                                                      
                                
                                        
                                                     
                                                                    
                                                                         
                                                                         
export const UNL_052_CARD_EFFECT =
  '你可以选择支付{{绿色}}，作为打出我的额外费用。\n' +
  '当你打出我时，如果你支付了该额外费用，则{{眩晕}}一名敌方单位。\n' +
  '当我据守一处战场时，则你本回合下一次打出一名单位时，让其变为活跃状态，并给予其{{增益}}。'

export const UNL_052_EXTRA_COST: PlayExtraCost = {
  label: '额外支付 1 点翠意符能(付了则眩晕一名敌方单位)',
                                  
  cost: { mana: 0, pips: [['green']] },
}

                                  
export function makeNamiPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-052:play:${selfOid}`, rawId: true, sourceDefId: 'UNL-052',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['foe'] !== undefined) return null
      const cands = enemyUnitsOnField(state, controller)
      if (cands.length === 0) return null                      
      return { itemId: `UNL-052:play:${selfOid}`, controller, key: 'foe',
        prompt: '娜美:眩晕一名敌方单位',
        candidates: cands.map((oid) => ({ id: oid, label: `眩晕 ${state.objects[oid as ObjId]?.defId ?? oid}` })),
                                                        
                                                                           
        isTarget: true }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['foe']
      if (t === undefined || !state.objects[t as ObjId]) return []
      return [{ kind: 'stun', target: t as ObjId } as GameEvent]
    },
  }, selfOid, controller)
}

                                                     
export function makeNamiHoldTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-052:hold:${selfOid}`, rawId: true, sourceDefId: 'UNL-052',
    event: 'hold', by: 'you',
    when: [{ kind: 'custom', test: (ev, state) => scoredHereFn(state, selfOid, ev, ['hold']) }],
    effect: (): readonly GameEvent[] =>
      [{ kind: 'grantNextUnitReadyBuff', player: controller } as GameEvent],
  }, selfOid, controller)
}

export const UNL_052: Card = {
  id: 'UNL-052', cardNo: 'UNL-052/219', name: '娜美', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '可选额外费{绿色};付了则眩晕一名敌方(makeNamiPlayTrigger)' },
    { kind: 'passive', describe: '据守→本回合下一次打出单位 ready+buff(makeNamiHoldTrigger;第二十本账)' },
  ],
}

                                                              
                                                      
                               
                                       
                             
                                                                         
                                                
                                                                   
                                                
                                                    
export const VEN_101_CARD_EFFECT =
  '你可以选择支付{{1}}，作为打出我的额外费用。\n' +
  '当你打出我时，如果你支付了该额外费用，则从任意废牌堆中放逐一张牌，以此给予一名单位在本回合内{{强攻2}}。'

export const VEN_101_EXTRA_COST: PlayExtraCost = {
  label: '额外支付 1 法力(付了则放逐废牌堆一张牌给单位本回合{{强攻2}})',
  cost: { mana: 1 },
}

                                     
                                                                                     
                                                       
                                              
                                       
                                                                              

                                   
export function allUnitsOnField101(state: GameState): readonly string[] {
                                                                                      
                                                        
                                                            
                                                                                      
                                                                              
                                           
                                                              
                                 
  return fieldedUnits(state)
}

export function makeWindMonkTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-101:play:${selfOid}`, rawId: true, sourceDefId: 'VEN-101',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['card'] === undefined) {
        const cands = allDiscards(state)
        if (cands.length === 0) return null                     
        return { itemId: `VEN-101:play:${selfOid}`, controller, key: 'card',
          prompt: '劲风修士:从任意废牌堆放逐一张牌',
          candidates: cands.map((oid) => ({ id: oid, label: `放逐 ${state.objects[oid as ObjId]?.defId ?? oid}` })) }
      }
      if (chosen['unit'] === undefined) {
        const cands = allUnitsOnField101(state)
        if (cands.length === 0) return null
        return { itemId: `VEN-101:play:${selfOid}`, controller, key: 'unit',
          prompt: '劲风修士:给予一名单位本回合{{强攻2}}',
          candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 获得{{强攻2}}` })),
                                                                           
                                                                             
          isTarget: true }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const card = chosen?.['card']
      const unit = chosen?.['unit']
                                                       
      if (card === undefined || !state.objects[card as ObjId]) return []
      const out: GameEvent[] = [{ kind: 'banish', target: card as ObjId, by: selfOid } as GameEvent]
      if (unit !== undefined && state.objects[unit as ObjId]) {
        out.push(grantKeywordEvent(`VEN-101:${selfOid}`, unit, '强攻2'))
      }
      return out
    },
  }, selfOid, controller)
}

export const VEN_101: Card = {
  id: 'VEN-101', cardNo: 'VEN·101', name: '劲风修士', category: 'unit',
  domains: ['purple'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '可选额外费{1};付了则放逐废牌堆一张牌给单位本回合[强攻2](makeWindMonkTrigger 两问)' },
  ],
}

                                                                            
                                                        
                                     
                                                 
                                                                       
                                                                
                                  
                                                                   
                                                                    
                                                       
                                                         
                                                           
                                                           
export const SFD_079_CARD_EFFECT =
  '你可以选择让你的传奇卡牌进入休眠状态，作为打出我的额外费用。\n' +
  '当你打出我时，如果你支付了该额外费用，则可以将你任意数量的单位移动到一处开放的战场。'

                                      
export function myLegendOid(state: GameState, player: PlayerId): string | undefined {
  return (state.zones[`legend:${player}`]?.contents ?? [])[0] as string | undefined
}

export const SFD_079_EXTRA_COST: PlayExtraCost = {
  label: '让你的传奇进入休眠(打出我的额外费用)',
                                        
  available: (state, player) => {
    const oid = myLegendOid(state, player)
    return oid !== undefined && state.objects[oid as ObjId]?.status.dormant !== true
  },
  payEvents: (state, player) => {
    const oid = myLegendOid(state, player)
    return oid === undefined ? [] : [{ kind: 'statusChange', target: oid as ObjId, key: 'dormant', value: true } as GameEvent]
  },
}

export const SFD_079_PREFIX = 'bard079m'

                                         
export function makeBardTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-079:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-079',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['bf'] === undefined) {
        const open = openBattlefields(state)
        if (open.length === 0) return null                            
        return { itemId: `SFD-079:play:${selfOid}`, controller, key: 'bf',
          prompt: '巴德:选一处开放的战场',
          candidates: open.map((z) => ({ id: z as string, label: z as string })) }
      }
                                               
      return multiSelectChoice({
        itemId: `SFD-079:play:${selfOid}`, controller, prefix: SFD_079_PREFIX,
        prompt: '巴德:选要移过去的单位(可不选)',
        isTarget: true, // ★1782 将你任意数量的单位移动到一处开放的战场
        candidates: (st, picked) => Object.values(st.objects)
          .filter((o) => {
            const k = st.zones[o.zone]?.kind
                                                                                                                
                                                                                                                            
            return (k === 'battlefield' || k === 'base') && isUnit(o)
              && o.controller === controller && (o.zone as string) !== chosen['bf']
              && !picked.includes(o.oid as string)
          })
          .map((o) => ({ id: o.oid as string, label: `移动 ${o.defId}` })),
      })(state, chosen)
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const bf = chosen?.['bf']
      if (bf === undefined) return []
      return multiSelectPicked(chosen ?? {}, SFD_079_PREFIX)
        .flatMap((oid) => moveUnitEvents(state, oid, bf))
    },
  }, selfOid, controller)
}

const bard = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '巴德', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '可选额外费=传奇休眠;付了则移任意数量我方单位到开放战场(makeBardTrigger)' },
  ],
})
export const SFD_079: Card = bard('SFD-079', 'SFD·079/221')
export const SFD_228: Card = bard('SFD-228', 'SFD·228/221')

                                                              
                                                                        
                                                     
            
                                      
                                                    
                                   
                                                                  
                                                                               
                                                     
                                                                        
                                                                        
                                                           
                                  
export const SFD_109_CARD_EFFECT =
  '{{百炼}}\n你可以选择支付{{橙色}}{{橙色}}，作为打出我的额外费用。\n' +
  '当你打出我时，如果你支付了该额外费用，则可以将一件敌方装备移动到你的基地。你控制这件装备，直到我离场为止。如果它是一件武装，则将其贴附到我身上。'

export const SFD_109_EXTRA_COST: PlayExtraCost = {
  label: '额外支付 2 点摧破符能(付了则可夺一件敌方装备)',
                                  
  cost: { mana: 0, pips: [['orange'], ['orange']] },
}

                                                   
export function enemyGearOnField109(state: GameState, controller: PlayerId): readonly string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const zk = state.zones[o.zone]?.kind
      return isEquipment(o) && o.controller !== controller && (zk === 'base' || zk === 'battlefield')
    })
    .map((o) => o.oid as string)
}

                                                    
export function makeAkshan109Trigger(
  selfOid: ObjId, controller: PlayerId, isArmament: (defId: string) => boolean,
): Trigger {
  return compileTrigger({
    id: `SFD-109:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-109',
    event: 'playUnit', by: 'you',
    mayChoose: true, // 「则**可以**将一件敌方装备…」条件从句后效果句首(㊵)
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['gear'] !== undefined) return null
      const cands = enemyGearOnField109(state, controller)
      if (cands.length === 0) return null                      
      return { itemId: `SFD-109:play:${selfOid}`, controller, key: 'gear',
        prompt: '阿克尚:夺取哪件敌方装备?(武装贴我身上,其余移到你的基地)',
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 夺取` })),
                                                                      
                                             
        isTarget: true }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const g = chosen?.['gear']
      if (g === undefined) return []
      const gear = state.objects[g as ObjId]
      if (gear === undefined) return []                
      const returnTo = gear.controller          
      return [
        { kind: 'changeController', target: gear.oid, player: controller } as GameEvent, // ㊿ 先夺控
        ...(isArmament(gear.defId)
          ? [{ kind: 'attach', obj: gear.oid, to: selfOid, player: controller } as GameEvent]
          : [{ kind: 'zoneChange', obj: gear.oid, to: `base:${controller}` } as GameEvent]),
        { kind: 'delayedTrigger', add: {
          kind: 'returnGearOnLeave', id: `SFD-109:${selfOid}:${gear.oid}`,
          controller, sourceDefId: 'SFD-109',
          watch: selfOid, gear: gear.oid, returnTo,
        } } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const SFD_109: Card = {
  id: 'SFD-109', cardNo: 'SFD·109/221', name: '阿克尚', category: 'unit',
  domains: ['orange'], energy: 4, power: 4, keywords: ['百炼'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[百炼];可选额外费{橙}{橙};付了则夺一件敌方装备(武装贴我)直到我离场(makeAkshan109Trigger+returnGearOnLeave)' }],
}

export const PLAY_EXTRA_COSTS: Readonly<Record<string, PlayExtraCost>> = {
  'UNL-122': UNL_122_EXTRA_COST, // ★第501轮 新月禁卫:本回合打出过法术才可付{紫}以活跃状态进场
  'UNL-166': UNL_166_EXTRA_COST, // ★第502轮 追猎雪狼:必须摧毁一名友方四动物标签单位,可打出至该单位所在的战场
  'SFD-109': SFD_109_EXTRA_COST, // ★第460轮 阿克尚:可选{橙}{橙}(收益走触发)
  'OGN-208': OGN_208_EXTRA_COST,
  'SFD-044': SFD_044_EXTRA_COST,
  'OGN-002': OGN_002_EXTRA_COST,
  'UNL-178': UNL_178_EXTRA_COST,
  'UNL-170': UNL_170_EXTRA_COST,
  'OGN-150': OGN_150_EXTRA_COST, // ★739 海妖猎手:消耗N增益各减一枚橙
  'OGN-231': OGN_231_EXTRA_COST, // ★739 莱卓斯:摧毁N友方各减一枚黄
  'SFD-160': SFD_160_EXTRA_COST, // ★第436轮 祖安混混:可选摧毁友方装备(收益走触发,不占 events)
  'UNL-052': UNL_052_EXTRA_COST, // ★第443轮 娜美:可选{绿色}(收益眩晕走触发)
  'VEN-101': VEN_101_EXTRA_COST, // ★第444轮 劲风修士:可选{1}(收益放逐+强攻走触发)
  'SFD-079': SFD_079_EXTRA_COST, // ★第446轮 巴德:可选传奇休眠(收益移动走触发)
  'SFD-228': SFD_079_EXTRA_COST, // ★第446轮 巴德再版(同文同一份)
}

                                
export const PLAY_EXTRA_COST_DEFIDS: readonly string[] = Object.keys(PLAY_EXTRA_COSTS)
