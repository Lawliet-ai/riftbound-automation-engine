                                                
  
        
                                            
                                                             
                                                                     
                                                                
  
                                                        
                                              

import { MINION } from './reprint-batch'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger, type Condition } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { attachedTo } from '../../src/state/attach'
import { destroyToOwnerDiscard } from '../../src/state/mutations'
import { banishedBy } from '../../src/actions/banish'
import { clearDamageDormantRecall } from '../../src/state/recall'
import { equipDefaultTargets } from '../../src/keywords/equip'
import { spendExperienceCost } from './spend-xp-buff-self'
import { CARD_NAMES } from '../cardNames'
import { isUnit } from '../../src/state/cardTypes'
import { unl078Sprite } from './UNL-078'
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                                            
import { hasteKeyOf } from './haste-key'                                                       

                                                   
function wearerScored(
  state: GameState,
  gearOid: ObjId,
  ev: GameEvent & { readonly player: PlayerId; readonly battlefield: string },
): boolean {
  const gear = state.objects[gearOid]
  if (!gear) return false
  const hostOid = attachedTo(gear)
  if (hostOid === undefined) return false                   
                                                                    
                                                                     
                                                
                                                               
                                        
  return scoredHere(state, hostOid, ev)
}

   
                                        
                                                                  
                                                         
                                                                
   

   
                                     
                                                            
   
export function makeBoneshiverTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                     
                                                
  const effect = compileEffect({
    then: [{
                                                        
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        ctx.ev.kind === 'conquer' ? [{ kind: 'summonRune', player: ctx.ev.player, count: 1, dormant: true }] : [],
    }],
  })
  return compileTrigger({
    id: 'SFD-118-conquer',
    event: 'conquer',
    by: 'you',
    activeZone: ['battlefield'], // 已贴附的武装位置随宿主(§434.4),宿主在战场它就在战场
    when: [{ kind: 'hostAtEventBattlefield' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

   
                                          
                                         
                                   
   
export function makeDoransRingTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
                                          
                                     
      { op: 'moveTo', target: { ref: 'chosen', key: 'discard' }, zone: () => `discard:${controller}` },
      { op: 'draw', count: 1 },
    ],
  })
  return compileTrigger({
    id: 'SFD-124-conquer',
    event: 'conquer',
    by: 'you',
    activeZone: ['battlefield'],
    when: [{ kind: 'hostAtEventBattlefield' }],
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen.discard !== undefined) return null
      const hand = state.zones[`hand:${controller}`]?.contents ?? []
      if (hand.length === 0) return null                            
      return {
        itemId: `trig:SFD-124-conquer:${selfOid}`,
        controller,
        key: 'discard',
        prompt: '多兰之戒:选择弃置一张手牌(然后抽一张牌)',
        candidates: hand.map((oid) => ({ id: oid, label: `弃置 ${state.objects[oid]?.defId ?? oid}` })),
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                                 
export const GOLD_TOKEN = {
  defId: 'token:金币',
  baseMight: 0,
  baseKeywords: [],
  baseTypes: ['equipment'],
  baseTags: [],
} as const

   
                                           
                                              
   
export function makeExtractionTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
                                                  
                                                                                            
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        ctx.ev.kind === 'conquer'
          ? [{ kind: 'spawnToken', spec: GOLD_TOKEN as never, zone: `base:${ctx.ev.player}` as never, owner: ctx.ev.player, dormant: true }]
          : [],
    }],
  })
  return compileTrigger({
    id: 'SFD-134-conquer',
    event: 'conquer',
    by: 'you',
    activeZone: ['battlefield'],
    when: [{ kind: 'hostAtEventBattlefield' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                 
export function makeAtlasTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
                                                           
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        if (ctx.ev.kind !== 'hold') return []
        const spawn = { kind: 'spawnToken', spec: GOLD_TOKEN as never, zone: `base:${ctx.ev.player}` as never, owner: ctx.ev.player, dormant: true } as const
        return [spawn, spawn]
      },
    }],
  })
  return compileTrigger({
    id: 'SFD-086-hold',
    event: 'hold',
    by: 'you',
    activeZone: ['battlefield'],
    when: [{ kind: 'hostAtEventBattlefield' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}



   
                                         
                                       
                                                     
   
                                                          
export const SFD_153_HASTE_KEY = hasteKeyOf('SFD-153:minion')

export function makeVanguardEyeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
                                           
                                                      
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        if (ctx.ev.kind !== 'unitMoved') return []
                                                                       
                                                                         
                                                                        
                                                                                                           
        const x = spawnTokenHasteResolve(ctx.state, ctx.ev.player, MINION, SFD_153_HASTE_KEY, ctx.chosen)
        return [...x.pre, { kind: 'spawnToken', spec: MINION, zone: ctx.ev.to as never, owner: ctx.ev.player, ...(x.ready ? { ready: true } : {}) }]
      },
    }],
  })
  return compileTrigger({
    id: 'SFD-153-move',
    event: 'unitMoved',
    by: 'you',
    activeZone: ['battlefield', 'base'], // 宿主可动向基地,武装随行后仍要能触发
    when: [{ kind: 'subjectIsHost' }],
                                                                               
    nextChoice: (state, ev, chosen) => ev.kind === 'unitMoved' ? spawnTokenHasteChoice(state, ev.player, MINION, { itemId: `trig:SFD-153-move:${selfOid}`, key: SFD_153_HASTE_KEY, label: '随从' }, chosen) : null,
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

   
                                           
                                                           
   
export function makePendulumBladeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                              
                                                  
                                                                       
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'eventSubject' }, delta: 2, duration: 'thisTurn', id: `VEN-011:${selfOid}` }],
  })
  return compileTrigger({
    id: 'VEN-011-move',
    event: 'unitMoved',
    by: 'you',
    activeZone: ['battlefield', 'base'],
    when: [
      { kind: 'subjectIsHost' },
                             
      { kind: 'custom', test: (ev, state) => ev.kind === 'unitMoved' && state.zones[ev.to as never]?.kind === 'battlefield' },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}


                             
function enemiesAtHostBattlefield(state: GameState, gearOid: ObjId): readonly ObjId[] {
  const gear = state.objects[gearOid]
  const hostOid = gear ? attachedTo(gear) : undefined
  const host = hostOid ? state.objects[hostOid] : undefined
  if (!host) return []
  const z = state.zones[host.zone]
  if (!z || z.kind !== 'battlefield') return []
  return z.contents.filter((oid) => {
    const o = state.objects[oid]
    return !!o && o.controller !== host.controller && !o.defId.startsWith('rune:') && !o.baseTypes?.includes('equipment')
  })
}

   
                                            
                                               
   
export function makeRecurveBowTriggers(selfOid: ObjId, controller: PlayerId): Trigger[] {
                                                     
  const effect = compileEffect({
    then: [{ op: 'damage', target: { ref: 'chosen', key: 'target' }, amount: 2 }],
  })
  return (['attack', 'defend'] as const).map((timing) => compileTrigger({
    id: `SFD-016-${timing}`,
    event: timing,
    activeZone: ['battlefield'],
    when: [{ kind: 'subjectIsHost' }],
    nextChoice: (state: GameState, _ev: GameEvent, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen.target !== undefined) return null
      const cands = enemiesAtHostBattlefield(state, selfOid)
      if (cands.length === 0) return null                
      return {
        itemId: `trig:SFD-016-${timing}:${selfOid}`,
        controller,
        key: 'target',
        isTarget: true, // ★1783 「对此处的一名敌方单位造成2点伤害」(卡文见 data/卡面数据补录.json)
        prompt: '反曲之弓:选择此处一名敌方单位,对其造成2点伤害',
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid]?.defId ?? oid}` })),
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller))
}

   
                                             
                                           
   
export function makeHearthCloakTriggers(selfOid: ObjId, controller: PlayerId): Trigger[] {
  const effect = compileEffect({
    then: [{
                                                                       
                                                   
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        enemiesAtHostBattlefield(ctx.state, selfOid).map((oid) => ({ kind: 'damage', target: oid, amount: 2, source: selfOid })),
    }],
  })
  return (['attack', 'defend'] as const).map((timing) => compileTrigger({
    id: `SFD-190-${timing}`,
    event: timing,
    activeZone: ['battlefield'],
    when: [{ kind: 'subjectIsHost' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller))
}

   
                                  
                                           
   
export function makeThornmailTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
                                                                          
                                                              
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const gear = ctx.state.objects[selfOid]
        const hostOid = gear ? attachedTo(gear) : undefined
        return hostOid === undefined ? [] : [{ kind: 'grantBuff', target: hostOid }]
      },
    }],
  })
  return compileTrigger({
    id: 'SFD-108-conquer',
    event: 'conquer',
    by: 'you',
    activeZone: ['battlefield'],
    when: [{ kind: 'hostAtEventBattlefield' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

   
                                              
                                                      
                                                         
                                                             
                                                                         
   
export function trinityBonus(state: GameState, player: PlayerId, battlefield: string, kind: 'conquer' | 'hold'): number {
  if (kind !== 'hold') return 0
  let bonus = 0
  for (const o of Object.values(state.objects)) {
    if (o.defId !== 'SFD-115') continue
    if (wearerScored(state, o.oid, { kind: 'hold', player, battlefield })) bonus += 1
  }
  return bonus
}

   
                                   
                                               
                                                
                                                              
                           
                                                      
   
export function guardianAngelSave(state: GameState, hostOid: ObjId): GameState | null {
  const ga = Object.values(state.objects).find(
    (o) => o.defId === 'SFD-051' && (o.status as { attachedTo?: ObjId }).attachedTo === hostOid,
  )
  const host = state.objects[hostOid]
  if (!ga || !host) return null
             
  let s = destroyToOwnerDiscard(state, ga.oid)
                                                                       
  return clearDamageDormantRecall(s, hostOid)
}

   
                                                         
                                        
                                          
                                             
                                   
                            
   
export function makeBlightedAxeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                          
  const hostOf = (state: GameState): ObjId | undefined => {
    const gear = state.objects[selfOid]
    return gear ? attachedTo(gear) : undefined
  }
  const effect = compileEffect({
    then: [{
                                                                 
                                                                      
                                                    
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const hostOid = hostOf(ctx.state)
        if (hostOid === undefined) return []
        return [
          { kind: 'detach', obj: selfOid },
          { kind: 'damage', target: hostOid, amount: 4, source: selfOid },
        ]
      },
    }],
  })
  return compileTrigger({
    id: 'UNL-019-eot',
    event: 'endOfTurn',
    by: 'you',
    activeZone: ['battlefield', 'base'],
                              
    when: [
      { kind: 'eventPlayerIs', side: 'you' },
                                                               
                                           
      { kind: 'custom', test: (_ev, state) => hostOf(state) !== undefined },
    ],
                                                   
    additionalCondition: (state) => {
      const hostOid = hostOf(state)
      return hostOid !== undefined && !state.unitsConqueredThisTurn.includes(hostOid)
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                               
                                                            
                                             

                                                     
export const SHEPHERD_EQUIP_SPEC = {
  key: 'equip:xp',
  label: '{{装配}} — 消耗1经验:贴附到你控制的一名单位', // 卡面逐字:「[装配] — 消耗1经验」(破折号两侧留空格,别读成「一」)
  cost: {},
  target: 'custom' as const,
                                                             
  extraCost: spendExperienceCost(1),
  legalTargets: (state: GameState, controller: PlayerId, selfOid: string) => [...equipDefaultTargets(state, controller, selfOid as ObjId)],
  makeResolve: ({ selfOid, controller, target }: { selfOid: string; controller: PlayerId; target?: string }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'attach', obj: selfOid as ObjId, to: target as ObjId, player: controller }],
}

                                   
export function makeShepherdPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                                              
    then: [{ op: 'custom', emit: (): readonly GameEvent[] => [{ kind: 'gainResource', player: controller, experience: 1 }] }],
  })
  return compileTrigger({
    id: 'UNL-158-play',
    event: 'playUnit', // 装备也走 PLAY_UNIT 通道打出(§149.2 打到基地)
    by: 'you',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

   
                                                                    
                                               
                            
                                                                         
                                                   
                                                           
                               
   
export function makeRequiemPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] =>
      Object.values(ctx.state.objects)
        .filter((o) => {
          const k = ctx.state.zones[o.zone]?.kind
          return (k === 'battlefield' || k === 'base')
            && isUnit(o)                                                        
            && o.controller === controller                
        })
        .map((o) => ({ kind: 'statusChange', target: o.oid, key: 'dormant', value: false } as GameEvent)),
    }],
  })
  return compileTrigger({
    id: 'SFD-192-play',
    event: 'playUnit', // 装备也走 PLAY_UNIT 通道打出(§149.2;㊼ UNL-158 同款)
    by: 'you',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                              
export const BLACK_CLEAVER_EQUIP_SPEC = {
  key: 'equip:sacrifice',
  label: '{{装配}} — 支付 1 点序理符能,摧毁一名友方单位:贴附到你控制的一名单位', // 卡面逐字:「[装配]—支付[黄色],摧毁一名友方单位。」
  cost: { pips: [['yellow']] },
  target: 'custom' as const,
  extraCost: {
    label: '摧毁一名友方单位',
                                       
    options: (state: GameState, controller: PlayerId) =>
      Object.values(state.objects)
        .filter((o) => o.controller === controller && isUnit(o) && (state.zones[o.zone]?.kind === 'battlefield' || state.zones[o.zone]?.kind === 'base'))
        .map((o) => ({ id: o.oid as string, label: `摧毁〈${CARD_NAMES[o.defId] ?? o.defId}〉` })), // ⚠️ 卡号不是人话:牌手看到的必须是卡名
                                                                                             
                                                                                     
                                                                         
                                                        
                                                                                                         
    pay: (state: GameState, _c: PlayerId, _self: string, choice?: string): GameState | null =>
      (!choice || !state.objects[choice as ObjId]) ? null : state,
    payEvents: (_state: GameState, controller: PlayerId, _self: string, choice?: string): readonly GameEvent[] =>
      choice === undefined ? [] : [{ kind: 'destroy', target: choice as ObjId, sourcePlayer: controller } ],
                                                     
    asEvents: (state: GameState, controller: PlayerId, _self: string, choice?: string): readonly GameEvent[] | null =>
      (!choice || !state.objects[choice as ObjId]) ? null : [{ kind: 'destroy', target: choice as ObjId, sourcePlayer: controller }],
  },
  legalTargets: (state: GameState, controller: PlayerId, selfOid: string) => [...equipDefaultTargets(state, controller, selfOid as ObjId)],
  makeResolve: ({ selfOid, controller, target }: { selfOid: string; controller: PlayerId; target?: string }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'attach', obj: selfOid as ObjId, to: target as ObjId, player: controller }],
}

   
                          
                                                         
  
                                                              
                                                    
                                                   
                                                
                                                                
                                                
                                                         
                                    
   
export const Z_DRIVE_RECALL_SPEC = {
  key: 'zdrive:recall',
  label: '支付 3 法力和 1 点灵光符能,放逐此牌:无视费用打出所有被它放逐的单位',
  cost: { mana: 3, pips: [['blue']] },
  extraCost: {
    label: '放逐此牌',
                                                               
                                                            
                                                      
                                                             
                                                                 
                                                   
                                                                                 
                                         
                                                        
                                      
                                                         
                                                                         
    pay: (state: GameState, _c: PlayerId, selfOid: string): GameState | null =>
      state.objects[selfOid as ObjId] ? state : null,
    payEvents: (state: GameState, _c: PlayerId, selfOid: string): readonly GameEvent[] =>
      state.objects[selfOid as ObjId] ? [{ kind: 'banish', target: selfOid as ObjId } as GameEvent] : [],
  },
                                                                      
                                                          
  makeNextChoice: ({ selfOid, controller }: { selfOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      for (const oid of banishedBy(state, selfOid as ObjId)) {
        const key = `to:${oid}`
        if (chosen[key] !== undefined) continue
        const o = state.objects[oid]
        if (!o) continue
        const q = playFromEffectChoice(state, controller, o.defId, {
          itemId: `act:${selfOid}:zdrive:recall`, controller, key, prompt: `Z型驱动:把 ${CARD_NAMES[o.defId] ?? o.defId} 打出到哪里?`,
        }, chosen)
        if (q !== null) return q
      }
      return null
    },
  makeResolve: ({ selfOid, controller }: { selfOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
      banishedBy(state, selfOid as ObjId).flatMap((oid) => {
        const o = state.objects[oid]
        if (!o) return []
        const x = optionalExtraResolve(state, controller, o.defId, `to:${oid}`, chosen)                                 
        const dest = unitDestinationResolve(state, controller, o.defId, chosen?.[`to:${oid}`], x.grant)                                          
        if (dest === undefined) return []
        return [...x.pre, { kind: 'playFree' as const, obj: oid, player: controller, to: dest, ...x.flags } as GameEvent, ...x.post]
      }),
}

   
                                                        
                                             
                            
   
import { unitLastRitesEffect } from './last-rites-units'
import { lastRitesChoiceEffect } from './last-rites-choices'
import { scoredHere } from './scored-here'                                   

export function gearLastRitesEffect(snap: {
  readonly oid: ObjId
                                                 
  readonly defId?: string
     
                                                      
                                                                                      
     
  readonly copiedDefId?: string
     
                                                            
                                                                      
     
  readonly riteFrom?: 'self' | { readonly gearOid: ObjId; readonly defId: string }
  readonly controller: PlayerId
  readonly attachedDefIds: readonly string[]
  readonly attached?: readonly { readonly oid: ObjId; readonly defId: string }[]
  readonly postDeathOid?: ObjId
}, chosen?: Readonly<Record<string, string>>, state?: GameState): readonly GameEvent[] {
  const out: GameEvent[] = []
                                                         
                                                      
                                                                     
                                                                    
  const unsplit = snap.riteFrom === undefined
  const selfRite = unsplit || snap.riteFrom === 'self'
  const gearRite = typeof snap.riteFrom === 'object' ? snap.riteFrom : undefined
                                                      
                                                     
                                                      
                                                             
                                                                  
                                                                                 
                                                                                      
                                              
                                                                               
                                                     
  if (selfRite && snap.defId === 'UNL-078') out.push(...unl078Sprite(snap.controller))               
                                                            
                                                
  if (selfRite) out.push(...unitLastRitesEffect(snap, chosen, state))
                                            
                                    
  if (selfRite) out.push(...lastRitesChoiceEffect(snap, chosen, state))
                                                       
                                       
                             
  const attachedAll = snap.attached ?? snap.attachedDefIds.map((defId) => ({ oid: snap.oid, defId }))
  const attached = unsplit
    ? attachedAll                    
    : gearRite === undefined
      ? []                           
      : attachedAll.filter((a) => String(a.oid) === String(gearRite.gearOid) && a.defId === gearRite.defId)
  for (const { oid: gearOid, defId } of attached) {
                                
    if (defId === 'SFD-172') out.push({ kind: 'draw', player: snap.controller, count: 1 })
                               
                                                       
                                             
                                                         
                                                            
                                                      
    if (defId === 'SFD-090' && snap.postDeathOid !== undefined) {
      out.push({ kind: 'banish', target: snap.postDeathOid, by: gearOid })
    }
  }
  return out
}
