                      
  
                                                                                   
  
                               
                                                               
                                     
                                                
                                                        
                                 
                                            
                                                 

import type { Card } from '../../src/dsl/card'
import type { ObjId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'
import { resolveImplDefId } from '../variantAlias'                                  
import { pumpEvent } from './activated-batch'
import type { GameEvent } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import type { Trigger } from '../../src/dsl/trigger'                            
import { compileTrigger } from '../../src/dsl/triggerSpec'

                                                                                           
                                                           
                                                                     
                                                                                           
export const OGN_044_CARD_EFFECT = '你可以选择支付{{绿色}},作为打出我的额外费用。\n当你打出我时，如果你支付了该额外费用，则抽一张牌。'
                                                    

                                                      
                                                                  

   
                              
                                             
   
const PLAY_BONUS: Readonly<Record<string, PlayExtraCost>> = {
                                                                 
                                                                                                          
                                                                                                                                    
                                                                                  
                                                                           
  'OGN-044': {
    label: '额外支付 1 点翠意符能来抽一张牌(收益走打出触发入链)',
    cost: { mana: 0, pips: [['green']] },
  },
                                                            
                        
                                                               
                                                 
                                                             
                                                                  
                                                                   
                                             
                                                 
                                                       
                                                    
                                                                       
                                                                                                      
  'SFD-098': {
    label: '额外支付 1 法力来给予我增益(收益走打出触发入链)',
    cost: { mana: 1 },
  },
                                                                           
                                                  
                                                                  
                                                                                         
                                                                                           
                                                     
  'UNL-028': {
    label: '额外支付 1 点炽烈符能:让我变为活跃并本回合战力+2(收益走打出触发入链)',
    cost: { mana: 0, pips: [['red']] },
  },
                                                              
                                                                   
                                                   
                                                             
                                                             
                                                           
                                               
                                           
                                         
                                             
                                                  
                                                                     
                                                                                          
                                                                      
                                                                    
  'SFD-013': {
    label: '额外支付 1 法力和 1 点炽烈符能:对战场上的一名单位造成2点伤害(收益走打出触发入链)',
    cost: { mana: 1, pips: [['red']] },
  },
                                                                
                                                              
                                                                                                         
                                                                              
                                                                              
  'VEN-120': {
    label: '额外支付 1 点序理符能:眩晕战场上的一名敌方单位(收益走打出触发入链)',
    cost: { mana: 0, pips: [['yellow']] },
  },
                                                                                           
  'SFD-067': {
    label: '额外支付 1 点灵光符能:让一名单位本回合战力-2(收益走打出触发入链)',
    cost: { mana: 0, pips: [['blue']] },
  },
}

   
                   
                                                                     
                                                                  
                                
   
function unitOptions(
  state: GameState, player: PlayerId,
  opts: { readonly battlefieldOnly?: boolean; readonly enemyOnly?: boolean },
): readonly { readonly id: string; readonly label: string }[] {
  return Object.values(state.objects)
    .filter((o) => {
      if (!isUnit(o)) return false
      const k = state.zones[o.zone]?.kind
      if (opts.battlefieldOnly === true ? k !== 'battlefield' : !(k === 'battlefield' || k === 'base')) return false
      return opts.enemyOnly === true ? o.controller !== player : true
    })
    .map((o) => ({ id: o.oid as string, label: o.defId }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

                                      
export const SFD_013_DAMAGE = 2
                                                  
export const SFD_067_DELTA = 2

export const SFD_013_CARD_EFFECT =
  '你可以选择支付{{1}}和{{红色}}，作为打出我的额外费用。\n当你打出我时，如果你支付了该额外费用，则对战场上的一名单位造成2点伤害。'
export const VEN_120_CARD_EFFECT =
  '你可以选择支付{{黄色}}，作为打出我的额外费用。\n当你打出我时，如果你支付了该额外费用，则{{眩晕}}战场上的一名敌方单位。'
export const SFD_067_CARD_EFFECT =
  '你可以选择支付{{蓝色}}，作为打出我的额外费用。\n当你打出我时，如果你支付了该额外费用，则让一名单位本回合内{{S}}-2。'

export const SFD_013: Card = {
  id: 'SFD-013', cardNo: 'SFD·013/221', name: '爆破队学员', category: 'unit',
  domains: ['red'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可额外付{1}{红};付了则触发入链、对战场一名单位造成2伤(makeDemolitionistPlayTrigger,★1602)' }],
}
export const VEN_120: Card = {
  id: 'VEN-120', cardNo: 'VEN·120', name: '雷霆之怒 玛萨', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可额外付{黄};付了则触发入链、眩晕战场一名敌方单位(makeMasaPlayTrigger,★1601)' }],
}
   
                                                                  
                                                                
                                                                                               
                                                    
                                                                                         
   
export function makeMasaPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-120:play:${selfOid}`, rawId: true, sourceDefId: 'VEN-120',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['target'] !== undefined) return null
      const cands = unitOptions(state, controller, { battlefieldOnly: true, enemyOnly: true })
      if (cands.length === 0) return null                      
      return { itemId: `VEN-120:play:${selfOid}`, controller, key: 'target', isTarget: true,
        prompt: '玛萨:眩晕战场上的哪名敌方单位?',
        candidates: cands.map((c) => ({ id: c.id, label: `${c.label} 眩晕` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['target']
      if (t === undefined || state.objects[t as ObjId] === undefined) return []              
      return [{ kind: 'stun', target: t as ObjId } as GameEvent]
    },
  }, selfOid, controller)
}

   
                                                                          
                                                                                                      
                                                                                         
   
export function makeDemolitionistPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-013:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-013',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['target'] !== undefined) return null
      const cands = unitOptions(state, controller, { battlefieldOnly: true })
      if (cands.length === 0) return null                      
      return { itemId: `SFD-013:play:${selfOid}`, controller, key: 'target', isTarget: true,
        prompt: '爆破队学员:对战场上的哪名单位造成 2 点伤害?',
        candidates: cands.map((c) => ({ id: c.id, label: `${c.label} 受 2 伤` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['target']
      if (t === undefined || state.objects[t as ObjId] === undefined) return []              
      return [{ kind: 'damage', target: t as ObjId, amount: SFD_013_DAMAGE, source: selfOid, sourcePlayer: controller } as GameEvent]
    },
  }, selfOid, controller)
}

   
                                                                          
                                                                         
   
export function makeFrostCubPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-067:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-067',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['target'] !== undefined) return null
      const cands = unitOptions(state, controller, {})
      if (cands.length === 0) return null                      
      return { itemId: `SFD-067:play:${selfOid}`, controller, key: 'target', isTarget: true,
        prompt: '霜衣幼崽:让哪名单位本回合 S-2?',
        candidates: cands.map((c) => ({ id: c.id, label: `${c.label} S-2` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.['target']
      if (t === undefined || state.objects[t as ObjId] === undefined) return []              
      return [pumpEvent('SFD-067:bonus', t, -SFD_067_DELTA)]
    },
  }, selfOid, controller)
}

   
                                                                               
                                                         
   
export function makeLittleGuardianPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-044:play:${selfOid}`, rawId: true, sourceDefId: 'OGN-044',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
  }, selfOid, controller)
}

   
                                                                              
                                                                                                           
   
export function makeSeaMonkeyPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-098:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-098',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    effect: (state): readonly GameEvent[] =>
      state.objects[selfOid] === undefined ? [] : [{ kind: 'grantBuff', target: selfOid } as GameEvent], // 结算时我没了 ⇒ 落空
  }, selfOid, controller)
}

   
                                                                               
                                                                                     
   
export function makePykePlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-028:play:${selfOid}`, rawId: true, sourceDefId: 'UNL-028',
    event: 'playUnit', by: 'you',
    when: [
      { kind: 'subjectIsSelf' },
      { kind: 'custom', test: (ev) => (ev as { bonus?: boolean }).bonus === true },
    ],
    effect: (state): readonly GameEvent[] =>
      state.objects[selfOid] === undefined ? [] : [
        { kind: 'statusChange', target: selfOid, key: 'dormant', value: false } as GameEvent,
        pumpEvent('UNL-028:bonus', selfOid, UNL_028_PUMP),
      ],
  }, selfOid, controller)
}

export const SFD_067: Card = {
  id: 'SFD-067', cardNo: 'SFD·067/221', name: '霜衣幼崽', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可额外付{蓝};付了则触发入链、让一名单位本回合{S}-2(makeFrostCubPlayTrigger,★1602)' }],
}

                                    
export const UNL_028_PUMP = 2

export const SFD_098_CARD_EFFECT =
  '你可以选择支付{{1}}，作为打出我的额外费用。\n当你打出我时，如果你支付了该额外费用，则给予我增益。'
export const UNL_028_CARD_EFFECT =
  '你可以选择支付{{红色}}，作为打出我的额外费用。\n当你打出我时，如果你支付了该额外费用，则让我变为活跃状态，并让我本回合内{{S}}+2。'

export const SFD_098: Card = {
  id: 'SFD-098', cardNo: 'SFD·098/221', name: '船猿', category: 'unit',
  domains: ['orange'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可额外付{1};付了则触发入链、给予我增益(makeSeaMonkeyPlayTrigger,★1603)' }],
}
export const UNL_028: Card = {
  id: 'UNL-028', cardNo: 'UNL-028/219', name: '派克', category: 'unit',
  domains: ['red'], energy: 3, power: 2, keywords: ['待命', '游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可额外付{红};付了则触发入链、结算期让我变为活跃+本回合{S}+2(makePykePlayTrigger,★1603)' }],
}

                                                            
export function playBonusFor(defId: string): PlayExtraCost | undefined {
                                                              
                                                        
                                                                 
  return PLAY_BONUS[resolveImplDefId(defId, (x) => x in PLAY_BONUS)]
}

export const OGN_044: Card = {
  id: 'OGN-044', cardNo: 'OGN·044/298', name: '小小守护者', category: 'unit',
  domains: ['green'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可额外付{绿};付了则触发入链、抽一张(makeLittleGuardianPlayTrigger,★1604)' }],
}

             
export const LONGTAIL15_DEFIDS: readonly string[] = ['OGN-044']
export const PLAY_BONUS_DEFIDS: readonly string[] = Object.keys(PLAY_BONUS)
