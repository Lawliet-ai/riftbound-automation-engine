                                                                 
                                                                 
                                                               
                                                            
                                                                          
                                                                          
                                                                               
  
                                            
                                                                                                   
                                                                                
                                                                    
                                                   
  
                          
                                                               
                                                           
                                                       
                                                          
                                                 
                                                                         
                                                                            
                                                                                  
                                                                
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { TriggerSpec } from '../../src/dsl/triggerSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit, isEquipment } from '../../src/state/cardTypes'
import { grantKeywordEvent, pumpEvent } from './activated-batch'
import { isRallyActive } from '../../src/keywords/rally'
import { isEmpowered } from '../../src/keywords/empower'
import { onField } from './activated-batch2'
import { typesOf } from '../../src/state/cardTypes'
import { MINION } from './reprint-batch'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                                          
import { hasteKeyOf } from './haste-key'                                                       
import type { ChoiceRequest } from '../../src/loop/chain'                          
import { hasCardTag, objectHasCardTag } from '../cardTagQuery'
import { LAST_RITES } from '../../src/keywords/lastRites'
import { enemyUnitsOnField } from './enemy-move'
import type { GameObject } from '../../src/state/object'

                          
export interface EnterCtx {
  readonly state: GameState
  readonly selfOid: ObjId
  readonly controller: PlayerId
  readonly chosen: Readonly<Record<string, string>>
}

export interface EnterTriggerRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly domain: string
  readonly cost: Cost
                                                
  readonly energy: number
  readonly power: number
  readonly keywords: readonly string[]
                                        
  readonly mayChoose?: boolean
                               
  readonly choose?: TriggerSpec['choose']
     
                                             
                                                          
                                                        
                              
     
  readonly chooses?: TriggerSpec['chooses']
     
                                                          
                                                
                                                       
     
  readonly condition?: (ctx: EnterCtx) => boolean
     
                                          
                                        
                                                                    
                                                                          
                                                  
                                  
                                                               
     
  readonly gate?: (state: GameState, selfOid: ObjId, controller: PlayerId) => boolean
     
                                                                                   
                                                                   
     
  readonly postChoice?: (ctx: EnterCtx) => ChoiceRequest | null
                  
  readonly effect: (ctx: EnterCtx) => readonly GameEvent[]
  readonly cardEffect: string
}

                                                          
   
                                                
                                                               
                                                  
   
export function hereZoneOf(state: GameState, selfOid: ObjId, controller: PlayerId): string {
  return (state.objects[selfOid]?.zone as string | undefined) ?? `base:${controller}`
}

   
                                                    
  
                                                    
                                          
                                                          
                                                      
                                                           
                           
  
                                                                              
                                                                
                                
   
export function alliesHereExceptSelf(state: GameState, controller: PlayerId, selfOid: ObjId): ObjId[] {
  const me = state.objects[selfOid]
  if (!me) return []
                                   
  const kind = state.zones[me.zone]?.kind
  if (kind !== 'battlefield' && kind !== 'base') return []
  return Object.values(state.objects)
    .filter((o) => o.oid !== selfOid        
      && o.zone === me.zone        
      && o.controller === controller        
      && isUnit(o))
    .map((o) => o.oid)
    .sort()
}

                                                                                      
                              
                                                                  
                           
                                                                                                    
                                                                           
                                                                                               
                                                                        
                                                    
                                                                          
                                

                                                             
function moveEvents(state: GameState, oid: string, to: ZoneId): readonly GameEvent[] {
  const o = state.objects[oid as ObjId]
  if (!o || (o.zone as string) === (to as string)) return []
  return [
    { kind: 'zoneChange', obj: o.oid, to } as GameEvent,
    { kind: 'unitMoved', unit: o.oid, player: o.controller, from: o.zone, to } as GameEvent,
  ]
}

                                               
export const VEN_058_GEAR_MIN = 3
                                 
export function otherGearIControl(state: GameState, controller: PlayerId, selfOid: ObjId): ObjId[] {
  return Object.values(state.objects)
    .filter((o) => o.oid !== selfOid
      && o.controller === controller
      && isEquipment(o)
      && (state.zones[o.zone]?.kind === 'battlefield' || state.zones[o.zone]?.kind === 'base'))
    .map((o) => o.oid)
    .sort()
}

export const OGN_137_RUNES = 1
export const UNL_034_EXP = 2
                                          
export const UNL_053_DRAW = 1

                                                                    
                                                        
export const OGN_116_DELTA = 3
                                                                  
export const OGN_116_FLOOR = 1
                                          
export const UNL_116_GAP = 3
                             
export const UNL_116_EXP = 3

   
                                          
  
                                                 
                                                       
                                                     
   
export function opponentNearWin(state: GameState, controller: PlayerId): boolean {
  return state.players.some((p) => p !== controller
    && state.winTarget - (state.scores[p as string] ?? 0) <= UNL_116_GAP)
}
export const UNL_012_KEYWORD = '强攻'

                                                                           
                                              
export const OGN_016_DELTA = 2
                                                   
export const OGN_020_DISCARD = 2
export const OGN_020_DRAW = 2
                              
export const OGN_020_KEYS: readonly string[] = ['d1', 'd2']
   
                                                    
                                                                   
                                          
   
   
                                            
                                                               
                                                      
                                                 
                                      
                                              
                                                            
                                                    
                                                
                                                               
                                                           
   
export const VEN_082_KEYS: readonly string[] = ['off', 'on']
                               
export const VEN_082_TYPES: readonly string[] = ['legend', 'unit', 'equipment']

const VEN_082_CHOOSES = [
  {
    key: VEN_082_KEYS[0]!, prompt: '黑心商人:解除【你控制的】哪个物体的强化?',
    selector: {
      type: 'any', controller: 'you',
      filter: (o: GameObject) => isEmpowered(o),
    },
  },
  {
    key: VEN_082_KEYS[1]!, prompt: '黑心商人:以此强化哪个传奇 / 单位 / 装备?',
                                                         
                                                           
    when: (_st: GameState, chosen: Readonly<Record<string, string>>) => chosen[VEN_082_KEYS[0]!] !== undefined,
    selector: {
      type: 'any',
                                                       
                                                            
      isTarget: true,
      filter: (o: GameObject, st: GameState) =>
        (onField(st, o) || st.zones[o.zone]?.kind === 'legend') && typesOf(o).some((t) => VEN_082_TYPES.includes(t)), // ★1104 缺陷 76:「传奇」住在传奇区,onField 只认战场/基地 ⇒ 传奇从来不在候选里
    },
  },
] as TriggerSpec['chooses']

const OGN_020_CHOOSES = OGN_020_KEYS.map((key, i) => ({
  key,
  prompt: `垃圾场小霸王:弃置手牌(第 ${i + 1} / ${OGN_020_DISCARD} 张)`,
  selector: { type: 'any', zone: 'hand', owner: 'you' },
  excludeChosen: OGN_020_KEYS.slice(0, i),
})) as TriggerSpec['chooses']

   
                                             
                                                               
                                                      
                                     
                                                                
                                                                      
                                                                              
                                              
                                       
   
export function returnToOwnerHand(state: GameState, oid: string | undefined): readonly GameEvent[] {
  const o = oid === undefined ? undefined : state.objects[oid as ObjId]
  return o === undefined ? [] : [{ kind: 'zoneChange', obj: o.oid, to: ownerHandZone(state, o.oid) } as GameEvent]
}

   
                                                 
                               
                                                                                
                                                                            
                                              
                                     
                                                               
                                                        
                                      
   
export function ownerHandZone(state: GameState, oid: string | undefined, fallback?: PlayerId): ZoneId {
  const o = oid === undefined ? undefined : state.objects[oid as ObjId]
  return `hand:${o?.owner ?? fallback}` as ZoneId
}

                                              
export const OGN_218_HASTE_KEYS = [hasteKeyOf('OGN-218:minion', 1), hasteKeyOf('OGN-218:minion', 2)] as const

export const ENTER_TRIGGER_ROWS: readonly EnterTriggerRow[] = [
  {
    defId: 'OGN-137', cardNo: 'OGN·137/298', name: '雷爪氏族熊人', domain: 'orange',
    cost: { mana: 7 }, energy: 7, power: 6, keywords: ['壁垒'],
    cardEffect: '当你打出我时，召出一枚休眠的符文。',
    effect: ({ controller }) => [
                                                           
      { kind: 'summonRune', player: controller, count: OGN_137_RUNES, dormant: true } as GameEvent,
    ],
  },
  {
                                                                       
                                                            
                                                                      
                                                              
                                                                     
                                             
                                
    defId: 'OGN-116', cardNo: 'OGN·116/298', name: '千尾监视者', domain: 'blue',
    cost: { mana: 7, pips: [['blue']] }, energy: 7, power: 7, keywords: ['急速'],
    cardEffect: '当你打出我时，让所有敌方单位本回合内{{S}}-3，不得低于1{{S}}。',
    effect: ({ state, controller }) => enemyUnitsOnField(state, controller)
      .map((oid) => pumpEvent('OGN-116:weaken', oid, -OGN_116_DELTA, OGN_116_FLOOR)),
  },
  {
                                                                   
                                                             
                 
                                                                    
                                                                 
                                                                            
                                                              
                                                              
                                                                  
                                                                        
    defId: 'UNL-116', cardNo: 'UNL-116/219', name: '波比 - 刚毅典范', domain: 'orange',
    cost: { mana: 5 }, energy: 5, power: 5, keywords: ['法盾'],
    condition: ({ state, controller }) => opponentNearWin(state, controller),
    effect: ({ selfOid, controller }) => [
      { kind: 'statusChange', target: selfOid, key: 'dormant', value: false } as GameEvent,
      { kind: 'gainResource', player: controller, experience: UNL_116_EXP } as GameEvent,
    ],
    cardEffect: '当你打出我时，如果对手得分距离胜利得分不超过3分，则让我变为活跃状态，并获得3经验。',
  },
  {
                                                                        
                                                 
                                                              
                                                   
                                                          
                                                       
    defId: 'UNL-053', cardNo: 'UNL-053/219', name: '迅捷蟹', domain: 'green',
    cost: { mana: 2 }, energy: 2, power: 0, keywords: [LAST_RITES],
    cardEffect: '当你打出我时，抽一张牌。',
    effect: ({ controller }) => [
      { kind: 'draw', player: controller, count: UNL_053_DRAW } as GameEvent,
    ],
  },
  {
    defId: 'UNL-034', cardNo: 'UNL-034/219', name: '暖春之使', domain: 'green',
    cost: { mana: 4, pips: [['green']] }, energy: 4, power: 4, keywords: ['狩猎'],
    cardEffect: '当你打出我时，获得2经验。',
    effect: ({ controller }) => [
      { kind: 'gainResource', player: controller, experience: UNL_034_EXP } as GameEvent,
    ],
  },
  {
    defId: 'UNL-012', cardNo: 'UNL-012/219', name: '布罗梅因领主', domain: 'red',
    cost: { mana: 5, pips: [['red']] }, energy: 5, power: 5, keywords: ['伏击'],
    cardEffect: '当你打出我时，让你此处的其他单位本回合内获得{{强攻}}。',
    effect: ({ state, controller, selfOid }) =>
      alliesHereExceptSelf(state, controller, selfOid)
        .map((oid) => grantKeywordEvent('UNL-012:rally', oid as string, UNL_012_KEYWORD)),
  },
  {
    defId: 'OGN-191', cardNo: 'OGN·191/298', name: '疯狂海寇', domain: 'purple',
    cost: { mana: 5 }, energy: 5, power: 4, keywords: ['壁垒'],
    cardEffect: '当你打出我时，将一名单位从战场上移动到其所属的基地。',
                                                        
    choose: { key: 'u', prompt: '疯狂海寇:把一名单位赶回其基地', selector: { type: 'unit', zone: 'battlefield', isTarget: true } },
    effect: ({ state, chosen }) => {
      const oid = chosen['u']
      const o = oid === undefined ? undefined : state.objects[oid as ObjId]
                                                  
      return o === undefined ? [] : moveEvents(state, oid!, `base:${o.controller}` as ZoneId)
    },
  },
  {
    defId: 'UNL-021', cardNo: 'UNL-021/219', name: '阴森药剂师', domain: 'red',
    cost: { mana: 3 }, energy: 3, power: 3, keywords: ['伏击'],
    cardEffect: '当你打出我时，你可以选择让一名战场上的友方单位返回其所属的手牌。',
                                                 
    mayChoose: true,
    choose: {
      key: 'u', prompt: '阴森药剂师:让一名战场上的友方单位返回其所属的手牌',
                                                             
                                                                   
                                                  
      selector: { type: 'unit', zone: 'battlefield', controller: 'you', isTarget: true },
    },
                                                                   
    effect: ({ state, chosen }) => returnToOwnerHand(state, chosen['u']),
  },
                           
  {
                                                                           
    defId: 'VEN-017', cardNo: 'VEN·017', name: '莫甘娜', domain: 'red',
    cost: { mana: 5, pips: [['red']] }, energy: 5, power: 5, keywords: ['伏击'],
    cardEffect: '当你打出我时，对一名单位造成伤害，其数量等同于该单位上已标记的伤害数值。',
    choose: { key: 'u', prompt: '莫甘娜:对一名单位造成等同于其已标记伤害的伤害', selector: { type: 'unit', fielded: true, isTarget: true } },
    effect: ({ state, chosen, selfOid, controller }) => {
      const oid = chosen['u']
      const o = oid === undefined ? undefined : state.objects[oid as ObjId]
      if (o === undefined) return []
                                                                   
                                                             
      const amount = o.damage
      if (amount <= 0) return []
      return [{
        kind: 'damage', target: o.oid, amount,
        source: selfOid, sourcePlayer: controller, // 族闸:两个归属都要
      } as GameEvent]
    },
  },
  {
    defId: 'VEN-058', cardNo: 'VEN·058', name: '散装机械魄罗', domain: 'blue',
    cost: { mana: 2 }, energy: 2, power: 2, keywords: [],
                                                             
                                              
    cardEffect: '当你打出我时，如果你控制着不少于三件其他装备，则抽一张牌。',
    condition: ({ state, controller, selfOid }) =>
      otherGearIControl(state, controller, selfOid).length >= VEN_058_GEAR_MIN,
    effect: ({ controller }) => [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
  },
                                       
  {
    defId: 'OGN-217', cardNo: 'OGN·217/298', name: '崔法利求战者', domain: 'yellow',
    cost: { mana: 2 }, energy: 2, power: 2,
                                                                          
                                                                    
                                    
    keywords: [],
                                                        
                                                                   
                                                                  
    gate: (state, selfOid) => isRallyActive(state, state.objects[selfOid]),
    effect: ({ selfOid }) => [{ kind: 'grantBuff', target: selfOid } as GameEvent],
    cardEffect:
      '{{鼓舞}}—当你打出我时，给予我增益。（如果我未拥有增益，则我获得一个{{S}}+1增益。如果你在本回合内已打出过其他卡牌，则发动此效果。）',
  },
                                                                       
                                                         
                             
                                                                                    
                                                               
                                                                    
                                                      
  {
    defId: 'OGN-243', cardNo: 'OGN·243/298', name: '德莱厄斯', domain: 'yellow',
    cost: { mana: 6, pips: [['yellow']] }, energy: 6, power: 6,
                                                                                   
    keywords: [],
                                                              
    gate: (state, selfOid) => isRallyActive(state, state.objects[selfOid]),
                                                         
    effect: ({ selfOid }) => [
      { kind: 'statusChange', target: selfOid, key: 'dormant', value: false } as GameEvent,
    ],
    cardEffect:
      '{{鼓舞}}—当你打出我时，让我变为活跃状态。（如果你在本回合内已打出过其他卡牌，则发动此效果。）',
  },
  {
    defId: 'OGN-218', cardNo: 'OGN·218/298', name: '先锋队长', domain: 'yellow',
    cost: { mana: 3, pips: [['yellow']] }, energy: 3, power: 3,
                                                           
    keywords: [],
                                        
    gate: (state, selfOid) => isRallyActive(state, state.objects[selfOid]),
                                                                      
    postChoice: ({ state, selfOid, controller, chosen }) =>
      spawnTokenHasteChoice(state, controller, MINION, { itemId: `trig:OGN-218:enter:${selfOid}`, key: OGN_218_HASTE_KEYS[0], label: '随从' }, chosen)
        ?? spawnTokenHasteChoice(state, controller, MINION, { itemId: `trig:OGN-218:enter:${selfOid}`, key: OGN_218_HASTE_KEYS[1], label: '随从' }, chosen, hastePaidSoFar(chosen, [OGN_218_HASTE_KEYS[0]])),
                                   
                                                                          
                                                 
    effect: ({ state, selfOid, controller, chosen }) => {
      const zone = hereZoneOf(state, selfOid, controller) as ZoneId
                                                                                  
      const x1 = spawnTokenHasteResolve(state, controller, MINION, OGN_218_HASTE_KEYS[0], chosen)
      const x2 = spawnTokenHasteResolve(state, controller, MINION, OGN_218_HASTE_KEYS[1], chosen, hasteCostTimes(x1.ready ? 1 : 0))
      return [
        ...x1.pre, ...x2.pre,
        { kind: 'spawnToken', spec: MINION, zone, owner: controller, ...(x1.ready ? { ready: true } : {}) } as GameEvent,
        { kind: 'spawnToken', spec: MINION, zone, owner: controller, ...(x2.ready ? { ready: true } : {}) } as GameEvent,
      ]
    },
    cardEffect:
      '{{鼓舞}}—当你打出我时，在此处额外打出两名1{{S}}的“随从”。（当你打出我时，如果你在本回合内已打出过其他卡牌，则发动此效果。）',
  },
                                                                  
  {
    defId: 'OGN-016', cardNo: 'OGN·016/298', name: '危险二人组', domain: 'red',
    cost: { mana: 3 }, energy: 3, power: 3,
                                                                            
    keywords: [],
    gate: (state, selfOid) => isRallyActive(state, state.objects[selfOid]),
                                                
                                                                   
    choose: { key: 'u', prompt: '危险二人组:让一名单位本回合内战力+2', selector: { type: 'unit', fielded: true, isTarget: true } },
    effect: ({ chosen }) => {
      const oid = chosen['u']
                                                                 
      return oid === undefined ? [] : [pumpEvent('OGN-016:pump', oid, OGN_016_DELTA)]
    },
    cardEffect: '{{鼓舞}}—当你打出我时，让一名单位本回合内{{S}}+2。（如果你在本回合内已打出过其他卡牌，则发动此效果。）',
  },
                                                                      
                                                    
                             
                                                                
                                                                    
                                                     
                                                                    
                                                                             
  {
    defId: 'OGN-003', cardNo: 'OGN·003/298', name: '炼金太保', domain: 'red',
    cost: { mana: 2 }, energy: 2, power: 2,
    keywords: ['强攻2'],
                                                                      
    choose: {
      key: 'd', prompt: '炼金太保:弃置一张手牌',
      selector: { type: 'any', zone: 'hand', owner: 'you' },
    },
    effect: ({ state, controller, chosen }) => {
      const oid = chosen['d']
      if (oid === undefined) return []
                                                               
      const hand = state.zones[`hand:${controller}` as ZoneId]?.contents ?? []
      if (!hand.includes(oid as ObjId)) return []
                                                                  
      return [{ kind: 'zoneChange', obj: oid as ObjId, to: `discard:${controller}` as ZoneId } as GameEvent]
    },
    cardEffect: '{{强攻2}}（如果我是进攻方，则{{S}}+2。）\n当你打出我时，弃置一张手牌。',
  },
                                                                    
                                                            
                                                                    
                                                     
                                                   
                                     
                                                                     
                                            
  {
    defId: 'VEN-082', cardNo: 'VEN·082', name: '黑心商人', domain: 'orange',
    cost: { mana: 4 }, energy: 4, power: 4, keywords: [],
    mayChoose: true, // §383.3.a「你可以选择」在效果开头
    chooses: VEN_082_CHOOSES,
    effect: ({ state, controller, chosen }) => {
      const off = chosen[VEN_082_KEYS[0]!]
      const on = chosen[VEN_082_KEYS[1]!]
      if (off === undefined || on === undefined) return []
                                                 
      const src = state.objects[off as ObjId]
      if (src === undefined || !isEmpowered(src) || src.controller !== controller) return []
      return [
        { kind: 'disempower', target: off as ObjId } as GameEvent,
        { kind: 'empower', target: on as ObjId } as GameEvent,
      ]
    },
    cardEffect: '当你打出我时，你可以选择解除一个受你控制的物体的强化，以此强化一个传奇、单位、或装备。',
  },
  {
    defId: 'OGN-020', cardNo: 'OGN·020/298', name: '垃圾场小霸王', domain: 'red',
    cost: { mana: 5, pips: [['red']] }, energy: 5, power: 5,
    keywords: [], // 同上:[鼓舞] 不进印刷表
    gate: (state, selfOid) => isRallyActive(state, state.objects[selfOid]),
                                                                   
                                                                   
    chooses: OGN_020_CHOOSES,
    effect: ({ state, controller, chosen }) => {
      const hand = state.zones[`hand:${controller}` as ZoneId]?.contents ?? []
      const picked = OGN_020_KEYS
        .map((k) => chosen[k])
        .filter((x): x is string => x !== undefined)
        // ⚠️ 结算这一刻再筛一次:选完到结算之间那张牌可能已经不在手里了(范本 VEN-168)
        .filter((oid) => hand.includes(oid as ObjId))
      return [
                                                                    
        ...picked.map((oid): GameEvent => ({
          kind: 'zoneChange', obj: oid as ObjId, to: `discard:${controller}` as ZoneId,
        } as GameEvent)),
                                                 
                                                       
                                             
        { kind: 'draw', player: controller, count: OGN_020_DRAW } as GameEvent,
      ]
    },
    cardEffect: '{{鼓舞}}—当你打出我时，弃置两张手牌，然后抽两张牌。（如果你在本回合内已打出过其他卡牌，则发动此效果。）',
  },
                                                
                                               
                                                                                      
                                        
  {
    defId: 'VEN-115', cardNo: 'VEN·115', name: '海洋亚龙', domain: 'purple',
    cost: { mana: 8, pips: [['purple'], ['purple']] }, energy: 8, power: 7, keywords: [],
    cardEffect:
      '你可以选择将我打出到一处开放的战场。\n'
      + '当你打出我时，你可以选择让一名非“龙”属性的单位返回其所属的手牌。',
                                                         
    mayChoose: true,
    choose: {
      key: 'u', prompt: '海洋亚龙:让一名非「龙」属性的单位返回其所属的手牌',
                                            
                                                               
                                                                 
                                                                      
                                                            
                                                                     
                                                       
      selector: { type: 'unit', fielded: true, filter: (o: GameObject) => !objectHasCardTag(o, '龙'), isTarget: true },
    },
                                            
    effect: ({ state, chosen }) => returnToOwnerHand(state, chosen['u']),
  },
]

   
                                  
                                                                             
                                           
   
export function makeEnterTrigger(row: EnterTriggerRow, selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `${row.defId}:enter`,
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
                                                        
    ...(row.gate !== undefined
      ? { additionalCondition: (state: GameState): boolean => row.gate!(state, selfOid, controller) }
      : {}),
                                                 
                                                                  
                                                         
    ...(row.mayChoose === true ? { mayChoose: row.mayChoose } : {}),
    ...(row.choose !== undefined ? { choose: row.choose } : {}),
    ...(row.chooses !== undefined ? { chooses: row.chooses } : {}), // 第351轮:多问
                                                                   
    ...(row.postChoice !== undefined ? { postChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => row.postChoice!({ state, selfOid, controller, chosen }) } : {}),
    effect: (state, _ev, chosen) => {
      const ctx: EnterCtx = { state, selfOid, controller, chosen: chosen ?? {} }
                                                  
      if (row.condition !== undefined && !row.condition(ctx)) return []
      return row.effect(ctx)
    },
  }, selfOid, controller)
}

export const ENTER_TRIGGER_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(ENTER_TRIGGER_ROWS.map((r) => [r.defId, (oid: ObjId, ctrl: PlayerId) => [makeEnterTrigger(r, oid, ctrl)]]))

export const ENTER_TRIGGER_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(ENTER_TRIGGER_ROWS.map((r) => [r.defId, r.keywords]))

export const ENTER_TRIGGER_UNIT_COST: Readonly<Record<string, Cost>> =
  Object.fromEntries(ENTER_TRIGGER_ROWS.map((r) => [r.defId, r.cost]))

export const ENTER_TRIGGER_CARDS: readonly Card[] = ENTER_TRIGGER_ROWS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: 'unit',
  domains: [r.domain], energy: r.energy, power: r.power, keywords: r.keywords,
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `当你打出我时:${r.cardEffect}(ENTER_TRIGGER_FACTORIES)` }],
}) as Card)
