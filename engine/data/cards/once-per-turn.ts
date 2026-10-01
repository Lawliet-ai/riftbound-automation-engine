                               
  
                                                               
                                       
                                         
  
                                   
                                                                 
                                                                  
                                                         
  
                                                                    
                                            
  
                                                  
                                                                
                                                
                                              
                                              

import type { Card } from '../../src/dsl/card'
import { victimIsSelf } from '../../src/keywords/lastRites'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import type { GameObject } from '../../src/state/object'
import { isEquipment, isToken } from '../../src/state/cardTypes'
import { zoneCategory } from '../../src/state/zones'
import { battleRoleOf } from '../../src/combat/battleRoles'
import { controlMap } from '../../src/state/battlefieldControl'                                                          
import { isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'
import { moveUnitEvents } from './enemy-move'
import { activateEvent, isInactive } from './longtail-7'
import type { DeathSnapshot } from '../../src/keywords/lastRites'
import { hereZoneOf } from './enter-triggers-batch'                         

                                                               
export const OGN_118_CARD_EFFECT = '每回合首次：当你的友方单位被摧毁时，抽一张牌。'

   
                                                          
                                                              
                               
   
export function makeOgn118Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'OGN-118-echo',
    event: 'destroyed',
    by: 'any',                 // 谁弄死的都算(卡文没写"被对手摧毁")
    oncePerTurn: true,         // §383.1 每回合首次
    nthType: true,             // §383.1.b 同一批里多个一起死,只算一次
                                                               
    when: [{ kind: 'custom', test: (ev): boolean => {
      const v = (ev as { victim?: DeathSnapshot }).victim
      return v !== undefined && v.controller === controller && v.types.includes('unit')
    } }],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 }],
  }, selfOid, controller)
}

export const OGN_118: Card = {
  id: 'OGN-118', cardNo: 'OGN·118/298', name: '残响之魂', category: 'unit',
  domains: ['blue'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合首次友方单位被摧毁时抽一张牌(makeOgn118Trigger)' }],
}

                                                               
export const VEN_002_CARD_EFFECT =
  '每回合首次，当我移动时，选择一名玩家。该玩家{{燃烧1}}。（该玩家将其主牌堆顶部的一张牌放入其废牌堆。）'
const VEN_002_PICK = 'whirlwindBurn'

   
                                    
                                                           
                                                   
                                                  
                                                         
                                                                  
                                                          
   
export function burnOne(state: GameState, player: string): readonly GameEvent[] {
  return [{ kind: 'burn', player: player as PlayerId, count: 1 } as GameEvent]
}

   
                                                 
                                                
   
export function makeVen002Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'VEN-002-whirlwind',
    event: 'unitMoved',
    by: 'any',                 // 对手推着我动也算(判「是不是我」靠 subjectIsSelf)
    oncePerTurn: true,
    nthType: true,
    when: [{ kind: 'subjectIsSelf' }], // 「当**我**移动时」
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen[VEN_002_PICK] !== undefined) return null            
      return {
        itemId: `trig:VEN-002:${selfOid}`,
        controller,
        key: VEN_002_PICK,
        prompt: '旋风剑客:选择一名玩家,让其燃烧1',
        candidates: state.players.map((p) => ({ id: p as string, label: p as string })),
                                                    
                                                                            
                                                                
        isTarget: true,
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const who = chosen?.[VEN_002_PICK]
      return who === undefined ? [] : burnOne(state, who)
    },
  }, selfOid, controller)
}

export const VEN_002: Card = {
  id: 'VEN-002', cardNo: 'VEN·002', name: '旋风剑客', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合首次我移动时选一名玩家燃烧1(makeVen002Trigger)' }],
}

             
export const ONCE_PER_TURN_DEFIDS: readonly string[] = ['OGN-118', 'VEN-002', 'OGN-162', 'VEN-068', 'SFD-148', 'UNL-174', 'UNL-215']

                                                     
  
                                                   
                                                 
                                          
                                    
                                        
  
                                               
                                                                       
                                                       
                                                              
                                                          
                                                         
  
                                             
                                                                  
                                                                          
                             
                                                                      

                                                        
export function inactiveObjectsExcept(state: GameState, selfOid: ObjId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.oid !== selfOid
      && zoneCategory(state.zones[o.zone]?.kind ?? 'hand') === 'fielded'
      && isInactive(o))
    .map((o) => o.oid as string)
    .sort()
}

                            
function askAwakenOther(selfOid: ObjId, controller: PlayerId, key: string, prompt: string): {
  readonly nextChoice: (state: GameState, ev: GameEvent, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
  readonly effect: (state: GameState, ev: GameEvent, chosen?: Readonly<Record<string, string>>) => readonly GameEvent[]
} {
  return {
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen[key] !== undefined) return null            
      const list = inactiveObjectsExcept(state, selfOid)
      if (list.length === 0) return null                    
      return {
        itemId: `trig:${key}:${selfOid}`,
        controller,
        key,
        prompt,
        isTarget: true, // ★1782 让一个其他休眠的物体变为活跃状态
        candidates: list.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[key]
      const o = pick === undefined ? undefined : state.objects[pick as ObjId]
      const e = o === undefined ? null : activateEvent(o)
      return e === null ? [] : [e]
    },
  }
}

                                                                   
export const OGN_162_CARD_EFFECT = '每回合首次：当我移动时，让一个其他休眠的物体变为活跃状态（包括传奇和符文）。'

export function makeOgn162Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const { nextChoice, effect } = askAwakenOther(selfOid, controller, 'missFortuneAwaken', '厄运小姐:让一个其他休眠的物体变为活跃状态')
  return compileTrigger({
    id: 'OGN-162-awaken',
    event: 'unitMoved',
    by: 'any',
    oncePerTurn: true,
    nthType: true,
    when: [{ kind: 'subjectIsSelf' }],
                                                 
    nextChoice,
    effect,
  }, selfOid, controller)
}

export const OGN_162: Card = {
  id: 'OGN-162', cardNo: 'OGN·162/298', name: '厄运小姐', category: 'unit',
  domains: ['orange'], energy: 5, power: 5, keywords: ['急速', '游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合首次我移动时唤醒一个其他休眠物体(makeOgn162Trigger)' }],
}

                                                                     
export const VEN_068_CARD_EFFECT =
  '当你打出我时，或每回合首次你打出一件非指示物装备时，你可以选择让除我以外且处于休眠状态的一个物体变为活跃状态。'

                                          
export function isNonTokenEquipment(o: GameObject | undefined): boolean {
  return o !== undefined && isEquipment(o) && !isToken(o)
}

                                                  
export function makeVen068PlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const { nextChoice, effect } = askAwakenOther(selfOid, controller, 'jayceAwakenSelf', '杰斯(打出我):唤醒一个除我以外的休眠物体')
  return compileTrigger({
    id: 'VEN-068-onPlaySelf',
    event: 'playUnit',
    by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」
    when: [{ kind: 'subjectIsSelf' }],
    nextChoice,
    effect,
  }, selfOid, controller)
}

                                       
export function makeVen068GearTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const { nextChoice, effect } = askAwakenOther(selfOid, controller, 'jayceAwakenGear', '杰斯(打出装备):唤醒一个除我以外的休眠物体')
  return compileTrigger({
    id: 'VEN-068-onGear',
    event: 'playUnit', // 装备也走 playUnit 通道
    by: 'you',
    oncePerTurn: true,
    nthType: true,
    mayChoose: true,
    when: [{ kind: 'custom', test: (ev, state): boolean =>
      isNonTokenEquipment(state.objects[(ev as { unit?: string }).unit as ObjId]) }],
    nextChoice,
    effect,
  }, selfOid, controller)
}

export const VEN_068: Card = {
  id: 'VEN-068', cardNo: 'VEN·068', name: '杰斯', category: 'unit',
  domains: ['blue'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时/每回合首次打出非指示物装备时,可唤醒一个其他休眠物体(makeVen068PlayTrigger/makeVen068GearTrigger)' }],
}

                                                          
                                                              
  
                                                             
                                                                    
  
                                                                                   
                                                                  
                                                                               
                                                           
                                                               
  
                                                   
                                                     
                                            
                                                 
                                                  
                                                                                     
                                                
                                                     

export const SFD_148_WIN_EFFECT = '每回合首次，当我赢得战斗时，你获得1分。'
export const SFD_148_DEATH_EFFECT = '当我在战斗中被摧毁时，选择一名对手，让其获得1分。'
const SFD_148_PICK = 'draavenOpponent'

                                                 
                                                                            
                                                       
import { wonBattle } from './won-battle-triggers'
export { wonBattle }                   

                               
export function makeSfd148WinTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'SFD-148-win',
    event: 'battleEnd',
    by: 'any', // 谁发起的战斗都算
    oncePerTurn: true,
    nthType: true,
    when: [{ kind: 'custom', test: (ev): boolean => wonBattle(ev, selfOid, controller) }],
    effect: (): readonly GameEvent[] => [{ kind: 'gainPoint', player: controller, amount: 1 }],
  }, selfOid, controller)
}

                                                    
export function makeSfd148DeathTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'SFD-148-death',
    event: 'destroyed',
    by: 'any',
                                                      
    when: [{ kind: 'custom', test: (ev): boolean => {
      const v = (ev as { victim?: DeathSnapshot }).victim
                                    
                                                    
                                                            
                                                                   
      return v !== undefined && victimIsSelf(v, selfOid) && battleRoleOf(v) !== null
    } }],
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen[SFD_148_PICK] !== undefined) return null     
      const foes = state.players.filter((p) => p !== controller)
      if (foes.length === 0) return null
      return {
        itemId: `trig:SFD-148:${selfOid}`,
        controller, // ★ 由【我】选(是"我"在选一名对手),与厄塔汗那条由对手作答的相反
        key: SFD_148_PICK,
        prompt: '德莱文:选择一名对手,让其获得1分',
        candidates: foes.map((p) => ({ id: p as string, label: p as string })),
                                                                        
                                                                             
                                                                          
        isTarget: true,
      }
    },
    effect: (_state, _ev, chosen): readonly GameEvent[] => {
      const who = chosen?.[SFD_148_PICK]
      return who === undefined ? [] : [{ kind: 'gainPoint', player: who as PlayerId, amount: 1 }]
    },
  }, selfOid, controller)
}

export const SFD_148: Card = {
  id: 'SFD-148', cardNo: 'SFD·148/221', name: '德莱文', category: 'unit',
  domains: ['purple'], energy: 6, power: 6, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合首次赢得战斗得1分(makeSfd148WinTrigger);在战斗中被摧毁时选一名对手让其得1分(makeSfd148DeathTrigger)' }],
}

                                                   
  
                                  
                                                  
                              
                                  
                                       
  
                           
                                                       
                                                      
                                                   
                                                                   
                                         
                                                             
                                             

                                                             
export const UNL_174_CARD_EFFECT =
  '每回合首次，当友方单位在你的开始阶段被摧毁时，每名对手必须摧毁自己的一名单位。'
const UNL_174_PREFIX = 'reversalShard'

                                                      
export function inMyStartPhase(state: GameState, controller: PlayerId): boolean {
  return state.phase === 'start' && state.activePlayer === controller
}

                                      
export function ownUnitsOnField(state: GameState, player: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === player && isUnit(o) && onField(state, o))
    .map((o) => o.oid as string)
    .sort()
}

   
                                         
                                                    
                                                          
   
export function makeUnl174Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const foesOf = (state: GameState): PlayerId[] => state.players.filter((p) => p !== controller)
  return compileTrigger({
    id: 'UNL-174-reversal',
    event: 'destroyed',
    by: 'any',
    oncePerTurn: true,
    nthType: true,
    when: [{ kind: 'custom', test: (ev, state): boolean => {
      const v = (ev as { victim?: DeathSnapshot }).victim
      return v !== undefined && v.controller === controller && v.types.includes('unit')
    } }],
                                              
    additionalCondition: (state) => inMyStartPhase(state, controller),
    nextChoice: (state, _ev, chosen) => {
      for (const foe of foesOf(state)) {
        const key = `${UNL_174_PREFIX}:${foe}`
        if (chosen[key] !== undefined) continue                  
        const cands = ownUnitsOnField(state, foe)
        if (cands.length === 0) continue                        
        return {
          itemId: `trig:UNL-174:${selfOid}`,
          controller: foe, // ★ 由【那名对手】作答
          key,
          prompt: '逆转碎片:你必须摧毁自己的一名单位',
          candidates: cands.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
        }
      }
      return null        
    },
    effect: (state, _ev, chosen): readonly GameEvent[] =>
      foesOf(state)
        .map((foe) => ({ foe, pick: chosen?.[`${UNL_174_PREFIX}:${foe}`] }))
        // ★1810 §359.3.e.5 同族卫生:结算这一刻重跑候选(㊼ 与 nextChoice 同一份 ownUnitsOnField)——
        //   同批连锁摧毁后已不在场的,不再发幽灵 destroy(缺陷 256 同族)。
        //   ⚠️ 不标判档不变:§355.10.f「必须」类不视为目标选取(e 的举例同形状)。
        .filter((x): x is { foe: PlayerId; pick: string } => x.pick !== undefined && ownUnitsOnField(state, x.foe).includes(x.pick as ObjId))
        // ⚠️ 摧毁的发起人是【那名对手自己】,归因别写成我
        .map((x) => ({ kind: 'destroy', target: x.pick as ObjId })),
  }, selfOid, controller)
}

export const UNL_174: Card = {
  id: 'UNL-174', cardNo: 'UNL-174/219', name: '逆转碎片', category: 'equipment',
  domains: ['yellow'], energy: 6, power: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合首次友方单位在我方开始阶段死亡→每名对手各摧毁自己一名单位(makeUnl174Trigger)' }],
}

                                                            
export const UNL_215_CARD_EFFECT =
  '每回合首次，当玩家在此处打出一名非指示物单位时，该玩家可以选择将自己在此处控制的另一名单位移动到其基地。'
const UNL_215_PICK = 'meteorSpringMove'

   
                                                       
                                               
                                                                            
                                                    
   
export function makeUnl215Trigger(bfZoneId: string, controller: PlayerId): Trigger {
  const playedAtHere = (state: GameState, ev: GameEvent): ObjId | undefined => {
    const u = (ev as { unit?: string }).unit
    const o = u === undefined ? undefined : state.objects[u as ObjId]
    if (o === undefined || !isUnit(o) || isToken(o)) return undefined            
    return (o.zone as string) === bfZoneId ? (o.oid as ObjId) : undefined
  }
  const others = (state: GameState, played: ObjId): string[] => {
    const p = state.objects[played]
    if (p === undefined) return []
    return Object.values(state.objects)
      .filter((o) => o.oid !== played && isUnit(o)
        && (o.zone as string) === bfZoneId && o.controller === p.controller)
      .map((o) => o.oid as string)
      .sort()
  }
  return compileTrigger({
    id: `UNL-215:${bfZoneId}:${controller}`,
    rawId: true,
    sourceDefId: 'UNL-215',
                                                      
    abilityKey: `UNL-215:${bfZoneId}`,
    event: 'playUnit',
    by: 'any', // 「当**玩家**…」不分敌我
    oncePerTurn: true,
    nthType: true,
    mayChoose: true, // 「该玩家**可以选择**」
    when: [{ kind: 'custom', test: (ev, state): boolean => playedAtHere(state, ev) !== undefined }],
    nextChoice: (state, ev, chosen): ChoiceRequest | null => {
      if (chosen[UNL_215_PICK] !== undefined) return null     
      const played = playedAtHere(state, ev)
      if (played === undefined) return null
      const who = state.objects[played]!.controller
      const list = others(state, played)
      if (list.length === 0) return null                       
                                                                   
                                                                     
                                                                  
                                                                            
                                                                             
                                                                    
                                                              
                                                         
                                                                  
                                                          
                                                            
      const bfController = controlMap(state)[bfZoneId]
      return {
        itemId: `trig:UNL-215:${bfZoneId}`,
        controller: who, // ★ 由【打出的那名玩家】作答
        key: UNL_215_PICK,
        prompt: '流星疗泉:可以选择把你在此处的另一名单位移回基地',
        candidates: list.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
        ...(who === bfController ? { isTarget: true } : {}),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[UNL_215_PICK]
      const o = pick === undefined ? undefined : state.objects[pick as ObjId]
                                                                    
      return o === undefined ? [] : moveUnitEvents(state, pick, `base:${o.controller}`)
    },
  }, null, controller)
}

export const UNL_215: Card = {
  id: 'UNL-215', cardNo: 'UNL-215/219', name: '流星疗泉', category: 'battlefield',
  domains: ['colorless'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '每回合首次有人在此处打出非指示物单位→该玩家可把此处另一名自己的单位移回基地(makeUnl215Trigger)' }],
}

                                                                   
                                      
  
                   
                                                             
                                                                             
                                                                
                                                                       
                                                                     
                                                        
                               
export const VEN_063_CARD_EFFECT = '每回合一次，当此处有一名敌方单位被摧毁时，召出一枚休眠的符文。'
                      
export const VEN_063_RUNES = 1

                                                
export function nasusRuneTrigger(
  ev: GameEvent, state: GameState, selfOid: ObjId, controller: PlayerId,
): boolean {
  const v = (ev as { victim?: DeathSnapshot }).victim
  if (v === undefined || !v.types.includes('unit')) return false            
  if (v.controller === controller) return false                               
  return v.zone === hereZoneOf(state, selfOid, controller)                       
}

export function makeVen063Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'VEN-063-rune',
    event: 'destroyed',
    by: 'any',          // 谁下的手都算(卡文没写"被你摧毁")
    oncePerTurn: true,  // §383.1 每回合一次
    nthType: true,      // §383.1.b 同一批里死好几个,只算一次
    when: [{ kind: 'custom', test: (ev, state): boolean => nasusRuneTrigger(ev, state, selfOid, controller) }],
    effect: (): readonly GameEvent[] => [
                                           
      { kind: 'summonRune', player: controller, count: VEN_063_RUNES, dormant: true },
    ],
  }, selfOid, controller)
}

export const VEN_063: Card = {
  id: 'VEN-063', cardNo: 'VEN·063', name: '内瑟斯', category: 'unit', // 英雄单位 → unit
  domains: ['blue'], energy: 5, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合一次,此处有敌方单位被摧毁→召出一枚休眠符文(makeVen063Trigger)' }],
}
