                                                     
  
                            
                                                                       
                                 
                                                                                   
                                                        
                                                                    
  
                                        
                                                            
                                                      
                                                       
                                  
                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { delayedTriggerId, delayedTriggersOf, type DelayedTrigger } from '../../src/effects/delayedTriggers'
import { confirmedCountThisTurn } from '../../src/keywords/rally'
import { fieldedUnits } from './activated-batch'
import { isUnit } from '../../src/state/cardTypes'
import { isFieldedKind } from '../../src/state/zones'                                        
import { moveUnitEvents } from './enemy-move'
import type { EventKind } from '../../src/loop/events'
import type { PlayerId } from '../../src/state/ids'
import { victimIsSelf } from '../../src/keywords/lastRites'
import { GOLD_TOKEN } from './gear-triggers'
import { controlledRuneCount } from '../../src/game/economy'
import { battlefieldUnits } from './diana-reactions'
import { wonBattle } from './once-per-turn'
import { pumpEvent } from './activated-batch'
import { ownFieldedUnits } from './OGN-023'
import { spellTargetStillLegal } from './targetStillLegal'

   
                                                       
                                    
                                                    
                                                         
   
export function delayedTriggerTriggers(state: GameState): readonly Trigger[] {
  return delayedTriggersOf(state)
    .filter((d) => stillRelevant(state, d))
    .flatMap((d) => {
      switch (d.kind) {
        case 'destroyAnyDamaged': return makeDecree(d)
        case 'goldOnDestroy': return makeGoldOnDestroy(d)
        case 'drawIfDestroyedByCard': return makeDrawIfDestroyedByCard(d)
        case 'expIfDestroyedByCard': return makeExpIfDestroyedByCard(d)
        case 'runeOnDestroy': return makeRuneOnDestroy(d)
        case 'expOnBattleWin': return makeExpOnBattleWin(d)
        case 'buffFriendlyPlayed': return makeRally(d)
        case 'readyRunesAtTurnEnd': return makeReadyRunes(d)
        case 'empowerFlipAtTurnEnd': return makeEmpowerFlip(d)               
        case 'moveEnemyAtNextMain': return makeMoveEnemy050(d)              
        case 'loseControlAtTurnEnd': return makeLoseControl202(d)               
        case 'returnGearOnLeave': return makeReturnGear109(d)                                 
        default: return makeGuillotine(d)
      }
    })
}

   
                      
                                           
                                          
                                                                     
                                                              
                               
   
function stillRelevant(state: GameState, d: DelayedTrigger): boolean {
  switch (d.kind) {
    case 'destroyOnNextDamage': return state.objects[d.target] !== undefined
                                                   
                                         
    case 'readyRunesAtTurnEnd': return true
    case 'goldOnDestroy': return true
    case 'drawIfDestroyedByCard': return true                      
    case 'expIfDestroyedByCard': return true                    
                         
    case 'runeOnDestroy': return true
                                               
    case 'expOnBattleWin': return state.objects[d.target] !== undefined
                                                            
    case 'empowerFlipAtTurnEnd': return state.objects[d.target] !== undefined
                                            
    case 'moveEnemyAtNextMain': return true
                                                                 
    case 'loseControlAtTurnEnd': return state.objects[d.target] !== undefined
                                                     
    case 'returnGearOnLeave': return state.objects[d.gear] !== undefined
    default: return true
  }
}

                                             
function makeTrigger(
  d: DelayedTrigger,
  event: EventKind,
  test: (ev: GameEvent, state: GameState) => boolean,
  effect: ReturnType<typeof compileEffect>,
): Trigger {
  return compileTrigger({
    id: `${d.sourceDefId}:delayed:${d.id}`, rawId: true, sourceDefId: d.sourceDefId,
    event,
    by: 'any', // 挨打的可以是任何人的单位 ⇒ 绝不能写 by:'you'(铁律153)
    when: [{ kind: 'custom', test }],
    effect: (st, ev, chosen) =>
      effect({ state: st, selfOid: null, controller: d.controller, ev, chosen: chosen ?? {} }),
  }, null, d.controller)                                    
}

                                   
function makeGuillotine(d: DelayedTrigger & { target: ObjId }): Trigger {
  const effect = compileEffect({
                                        
    guard: (ctx) => ctx.state.objects[d.target] !== undefined,
    then: [{
      op: 'custom',
      emit: (): readonly GameEvent[] => [
                                                    
                                                        
        { kind: 'delayedTrigger', clear: d.id },
                                                                    
        { kind: 'destroy', target: d.target, sourcePlayer: d.controller, sourceCardId: d.sourceDefId },
      ],
    }],
  })
  return makeTrigger(d, 'damage', (ev) =>
                                                          
    ev.kind === 'damage' && (ev.target as string) === (d.target as string) && ev.amount > 0, effect)
}

   
                                                
                        
                                                            
                                         
                                           
   
function makeDecree(d: DelayedTrigger): Trigger {
  const victimOf = (ev: GameEvent): ObjId | undefined =>
    ev.kind === 'damage' ? (ev.target as ObjId) : undefined
  const isDamagedUnit = (ev: GameEvent, state: GameState): boolean => {
    const v = victimOf(ev)
    if (v === undefined || !(ev.kind === 'damage' && ev.amount > 0)) return false
    const o = state.objects[v]
    return o !== undefined && isUnit(o)
  }
  const effect = compileEffect({
    guard: (ctx) => isDamagedUnit(ctx.ev as GameEvent, ctx.state),
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const v = victimOf(ctx.ev as GameEvent)
                                    
        return v === undefined ? [] : [{ kind: 'destroy', target: v, sourcePlayer: d.controller, sourceCardId: d.sourceDefId }]
      },
    }],
  })
  return makeTrigger(d, 'damage', isDamagedUnit, effect)
}

                                                           
                              
                                   
                                                     
  
                                            
                                          
                                                    
                                                                    
                                                                   
                                          
                                                               
                                                      
export const OGN_254_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '选择一名单位，在它本回合下次受到伤害时，将其摧毁。\n' +
  '{{鼓舞}}—改为立即将其摧毁。（如果你在本回合内已打出过其他卡牌，则发动此效果。）'

export const OGN_254_KEYWORDS: readonly string[] = ['迅捷']

                                     
export function ogn254RallyActive(state: GameState, controller: Parameters<typeof confirmedCountThisTurn>[1]): boolean {
  return confirmedCountThisTurn(state, controller) - 1 >= 1
}

export const OGN_254_SPEC: PlaySpec = {
  defId: 'OGN-254', cardNo: 'OGN·254/298', name: '诺克萨斯断头台',
  kind: 'spell',
  cost: { mana: 4, pips: [['red', 'yellow']] }, // 1 枚 pip,红或黄都付得起
  keywords: [...OGN_254_KEYWORDS],
  target: 'custom',
  legalTargets: (state: GameState): string[] => [...fieldedUnits(state)] as string[],
  makeResolve:
    ({ target, controller }: { target?: string; controller: Parameters<typeof confirmedCountThisTurn>[1] }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined || state.objects[target as ObjId] === undefined) return []           
      if (ogn254RallyActive(state, controller)) {
        return [{ kind: 'destroy', target: target as ObjId }]                 
      }
      const rec: DelayedTrigger = {
        id: delayedTriggerId('destroyOnNextDamage', 'OGN-254', target as ObjId),
        kind: 'destroyOnNextDamage', target: target as ObjId, controller, sourceDefId: 'OGN-254',
      }
      return [{ kind: 'delayedTrigger', add: rec }]
    },
}

export const OGN_254: Card = {
  id: 'OGN-254', cardNo: 'OGN·254/298', name: '诺克萨斯断头台', category: 'spell',
  domains: ['red', 'yellow'], energy: 4, keywords: [...OGN_254_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名单位,本回合它下次受伤时摧毁;鼓舞则立即摧毁(OGN_254_SPEC)' }],
}

                                                                     
                              
                                    
  
                                          
                                                  
                                            
                                                                     
                                                               
export const OGN_221_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n在本回合内，每当任意单位承受伤害时，直接将它摧毁。'

export const OGN_221_KEYWORDS: readonly string[] = ['迅捷']

export const OGN_221_SPEC: PlaySpec = {
  defId: 'OGN-221', cardNo: 'OGN·221/298', name: '帝国谕令',
  kind: 'spell',
  cost: { mana: 5, pips: [['yellow'], ['yellow']] },
  keywords: [...OGN_221_KEYWORDS],
  target: 'none',
  legalTargets: (): string[] => [], // ★1323 去掉 `as unknown as` 之后 tsc 才看得见这处(`target:'none'` 不读它,但类型必填)
  makeResolve:
    ({ controller }: { controller: Parameters<typeof confirmedCountThisTurn>[1] }) =>
    (): readonly GameEvent[] => [{
      kind: 'delayedTrigger',
      add: {
        id: delayedTriggerId('destroyAnyDamaged', 'OGN-221'),
        kind: 'destroyAnyDamaged', controller, sourceDefId: 'OGN-221',
      },
    }],
}

export const OGN_221: Card = {
  id: 'OGN-221', cardNo: 'OGN·221/298', name: '帝国谕令', category: 'spell',
  domains: ['yellow'], energy: 5, keywords: [...OGN_221_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合每当任意单位承受伤害就摧毁它(OGN_221_SPEC)' }],
}

   
                                                    
                                                                 
                                                                             
                                       
                                                                 
   
function makeGoldOnDestroy(d: DelayedTrigger & { target: ObjId }): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => [
        { kind: 'delayedTrigger', clear: d.id },
        {
          kind: 'spawnToken', spec: GOLD_TOKEN as never,
          zone: `base:${ctx.controller}` as never, owner: ctx.controller, dormant: true,
        },
      ],
    }],
  })
                                                                         
                                                      
                                                            
                                                          
  return makeTrigger(d, 'destroyed', (ev) =>
    ev.kind === 'destroyed' && victimIsSelf(ev.victim, d.target), effect)
}

   
                                                      
                                                                 
                                                                  
                                              
                                           
                                         
                        
   
function makeRiderIfDestroyedByCard(
  d: DelayedTrigger & { target: ObjId; byCard: string; count: number },
  reward: (controller: string, count: number) => GameEvent,
): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => [
        { kind: 'delayedTrigger', clear: d.id },
        reward(ctx.controller as string, d.count),
      ],
    }],
  })
  return makeTrigger(d, 'destroyed', (ev) =>
    ev.kind === 'destroyed'
    && victimIsSelf(ev.victim, d.target)
    && ((ev as { byCards?: readonly string[] }).byCards ?? []).includes(d.byCard), effect)
}

                                          
function makeDrawIfDestroyedByCard(
  d: DelayedTrigger & { target: ObjId; byCard: string; count: number },
): Trigger {
  return makeRiderIfDestroyedByCard(d, (player, count) =>
    ({ kind: 'draw', player: player as PlayerId, count } ))
}

   
                                                       
                                                                 
   
function makeExpIfDestroyedByCard(
  d: DelayedTrigger & { target: ObjId; byCard: string; count: number },
): Trigger {
  return makeRiderIfDestroyedByCard(d, (player, count) =>
    ({ kind: 'gainResource', player: player as PlayerId, experience: count } ))
}

   
                                               
                                    
                 
                                                                  
                                                                  
   
function makeRally(d: DelayedTrigger): Trigger {
  const subjectOf = (ev: GameEvent): ObjId | undefined =>
    ev.kind === 'playUnit' ? (ev.unit as ObjId) : undefined
  const isFriendlyUnit = (ev: GameEvent, state: GameState): boolean => {
    if (ev.kind !== 'playUnit' || ev.player !== d.controller) return false
    const o = state.objects[subjectOf(ev) as ObjId]
    return o !== undefined && isUnit(o)
  }
  const effect = compileEffect({
    guard: (ctx) => isFriendlyUnit(ctx.ev as GameEvent, ctx.state),
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const u = subjectOf(ctx.ev as GameEvent)
        return u === undefined ? [] : [{ kind: 'grantBuff', target: u }]
      },
    }],
  })
  return makeTrigger(d, 'playUnit', isFriendlyUnit, effect)
}

                                                                      
                                                   
                                                  
  
                                                 
                                                      
                                                   
export const UNL_073_CARD_EFFECT =
  '对一名敌方单位造成3点伤害。当该单位在本回合被摧毁时，打出一个休眠的“金币”装备指示物。' +
  '（其具有“{{反应>}} 摧毁此牌，{{横置}}：{{获得}}{{A}}。”）'

                                 
export const UNL_073_DAMAGE = 3

                                     
export function enemyFieldedUnits(state: GameState, controller: PlayerId): string[] {
  return [...fieldedUnits(state)].filter((oid) => state.objects[oid as ObjId]?.controller !== controller)
}

export const UNL_073_SPEC: PlaySpec = {
  defId: 'UNL-073', cardNo: 'UNL-073/219', name: '致命华彩',
  kind: 'spell', cost: { mana: 4 }, keywords: [],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => enemyFieldedUnits(state, controller),
  makeResolve:
    ({ target, controller, selfOid }: { target?: string; controller: PlayerId; selfOid?: ObjId }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined || state.objects[target as ObjId] === undefined) return []           
      return [
        {
          kind: 'delayedTrigger',
          add: {
            id: delayedTriggerId('goldOnDestroy', 'UNL-073', target as ObjId),
            kind: 'goldOnDestroy', target: target as ObjId, controller, sourceDefId: 'UNL-073',
          },
        },
                                                           
                                           
                                                                           
        {
          kind: 'damage', target: target as ObjId, amount: UNL_073_DAMAGE,
          sourcePlayer: controller, source: selfOid,
        },
      ]
    },
}

export const UNL_073: Card = {
  id: 'UNL-073', cardNo: 'UNL-073/219', name: '致命华彩', category: 'spell',
  domains: ['blue'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对敌方单位造成3点伤害;它本回合被摧毁则出一个休眠金币(UNL_073_SPEC)' }],
}

                                                                     
                              
                                                               
                
  
                                                                         
                                          
                             
export const SFD_166_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '在本回合内，每当一名友方单位被打出时，给予其增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）\n' +
  '抽一张牌。'

export const SFD_166_KEYWORDS: readonly string[] = ['迅捷']

export const SFD_166_SPEC: PlaySpec = {
  defId: 'SFD-166', cardNo: 'SFD·166/221', name: '集结部队',
  kind: 'spell', cost: { mana: 2 }, keywords: [...SFD_166_KEYWORDS],
  target: 'none',
  legalTargets: (): string[] => [], // ★1323 去掉 `as unknown as` 之后 tsc 才看得见这处(`target:'none'` 不读它,但类型必填)
  makeResolve:
    ({ controller }: { controller: PlayerId }) =>
    (): readonly GameEvent[] => [
      {
        kind: 'delayedTrigger',
        add: {
          id: delayedTriggerId('buffFriendlyPlayed', 'SFD-166'),
          kind: 'buffFriendlyPlayed', controller, sourceDefId: 'SFD-166',
        },
      },
      { kind: 'draw', player: controller, count: 1 },
    ],
}

export const SFD_166: Card = {
  id: 'SFD-166', cardNo: 'SFD·166/221', name: '集结部队', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: [...SFD_166_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合每有友方单位被打出就给它增益;并抽一张牌(SFD_166_SPEC)' }],
}

   
                                              
                                                                  
                            
   
   
                                                       
                                              
                                                          
                                        
                                           
   
function makeReadyRunes(d: DelayedTrigger & { targets: readonly ObjId[] }): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => [
        { kind: 'delayedTrigger', clear: d.id }, // 一次性:先摘
        ...d.targets
          .filter((oid) => ctx.state.objects[oid] !== undefined)
          .map((oid) => ({ kind: 'statusChange', target: oid, key: 'tapped', value: false, count: 1 } as GameEvent)),
      ],
    }],
  })
  return makeTrigger(d, 'endOfTurn', () => true, effect)
}

                                                          
function makeEmpowerFlip(d: DelayedTrigger & { target: ObjId; toEmpower: boolean }): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const out: GameEvent[] = [{ kind: 'delayedTrigger', clear: d.id } as GameEvent]                 
        if (ctx.state.objects[d.target] !== undefined) {
          out.push({ kind: d.toEmpower ? 'empower' : 'disempower', target: d.target } as GameEvent)
        }
        return out
      },
    }],
  })
  return makeTrigger(d, 'endOfTurn', () => true, effect)
}

   
                                                        
                                                           
                                                            
                                                                           
   
function enemyCands050(state: GameState, d: DelayedTrigger & { battlefield: string }): readonly string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const zk = state.zones[o.zone]?.kind
      return isUnit(o) && o.controller !== d.controller
        && (zk === 'battlefield' || zk === 'base') && (o.zone as string) !== d.battlefield
    })
    .map((o) => o.oid as string)
}

   
                                                
                                                                          
                                                               
                                         
   
   
                                        
                                                               
                                                                    
                                                                      
                                                
   
function makeReturnGear109(d: DelayedTrigger & { watch: ObjId; gear: ObjId; returnTo: PlayerId }): Trigger[] {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const out: GameEvent[] = [{ kind: 'delayedTrigger', clear: d.id } as GameEvent]          
        if (ctx.state.objects[d.gear] !== undefined) {
          out.push({ kind: 'changeController', target: d.gear, player: d.returnTo } as GameEvent)
        }
        return out
      },
    }],
  })
  const base = { id: '', rawId: true as const, sourceDefId: d.sourceDefId }
  return [
    compileTrigger({ ...base, id: `${d.sourceDefId}:delayed:${d.id}:destroyed`,
      event: 'destroyed', by: 'any',
      when: [{ kind: 'custom', test: (ev) => victimIsSelf((ev as { victim?: { oid?: ObjId; postDeathOid?: ObjId } }).victim, d.watch) }],
      effect: (state, ev, chosen) => effect({ state, selfOid: null, controller: d.controller, ev, chosen: chosen ?? {} }),
    }, null, d.controller),
    compileTrigger({ ...base, id: `${d.sourceDefId}:delayed:${d.id}:banished`,
      event: 'banished', by: 'any',
      when: [{ kind: 'custom', test: (ev) => (ev as { card?: ObjId }).card === d.watch }],
      effect: (state, ev, chosen) => effect({ state, selfOid: null, controller: d.controller, ev, chosen: chosen ?? {} }),
    }, null, d.controller),
    compileTrigger({ ...base, id: `${d.sourceDefId}:delayed:${d.id}:left`,
      event: 'zoneChange', by: 'any',
      when: [{ kind: 'custom', test: (ev, state) => {
        const e = ev as { obj?: ObjId; from?: unknown; to?: unknown }
        if (e.obj !== d.watch) return false
        const fk = state.zones[e.from as never]?.kind
        const tk = state.zones[e.to as never]?.kind
                                                                               
                                                                    
                                                      
                                                                         
        return isFieldedKind(fk) && !isFieldedKind(tk)
      } }],
      effect: (state, ev, chosen) => effect({ state, selfOid: null, controller: d.controller, ev, chosen: chosen ?? {} }),
    }, null, d.controller),
  ]
}

function makeLoseControl202(d: DelayedTrigger & { target: ObjId; returnTo: PlayerId }): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const out: GameEvent[] = [{ kind: 'delayedTrigger', clear: d.id } as GameEvent]          
        if (ctx.state.objects[d.target] !== undefined) {
          out.push({ kind: 'changeController', target: d.target, player: d.returnTo } as GameEvent)
          out.push({ kind: 'recall', target: d.target } as GameEvent)
        }
        return out
      },
    }],
  })
  return makeTrigger(d, 'endOfTurn', () => true, effect)
}

function makeMoveEnemy050(d: DelayedTrigger & { battlefield: string }): Trigger {
  return compileTrigger({
    id: `${d.sourceDefId}:delayed:${d.id}`, rawId: true, sourceDefId: d.sourceDefId,
    event: 'mainPhaseStart', by: 'you',
    mayChoose: true,
    when: [{ kind: 'custom', test: (ev) => (ev as { player?: string }).player === d.controller }],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['enemy'] !== undefined) return null
      const cands = enemyCands050(state, d)
      if (cands.length === 0) return null                                        
      return { itemId: `trig:${d.sourceDefId}:delayed:${d.id}`, controller: d.controller, key: 'enemy',
        prompt: '娅希拉:将哪名敌方单位移动到她据守过的战场?',
        isTarget: true, // ★1782 将一名敌方单位移动到此战场
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as never]?.defId ?? oid} 移过去` })) }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const out: GameEvent[] = [{ kind: 'delayedTrigger', clear: d.id } as GameEvent]          
      const enemy = chosen?.['enemy']
      if (enemy !== undefined && state.objects[enemy as never] !== undefined) {
        out.push(...moveUnitEvents(state, enemy, d.battlefield))
      }
      return out
    },
  }, null, d.controller)
}

function makeRuneOnDestroy(d: DelayedTrigger & { target: ObjId }): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => [
        { kind: 'delayedTrigger', clear: d.id }, // 一次性:先摘(铁律176)
        { kind: 'summonRune', player: ctx.controller, count: 1, dormant: true },
      ],
    }],
  })
  return makeTrigger(d, 'destroyed', (ev) =>
    ev.kind === 'destroyed' && victimIsSelf(ev.victim, d.target), effect)
}

   
                                                
                                                                                     
                                                                
                       
                                                               
            
                                                             
   
function makeExpOnBattleWin(d: DelayedTrigger & { target: ObjId }): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => [
        { kind: 'delayedTrigger', clear: d.id },
        { kind: 'gainResource', player: ctx.controller, experience: UNL_095_EXP },
      ],
    }],
  })
  return makeTrigger(d, 'battleEnd', (ev) => wonBattle(ev, d.target, d.controller), effect)
}

                                                                   
                                                 
                                   
  
                                                         
                        
                                                                    
                                            
                            
                                                              
export const VEN_146_CARD_EFFECT =
  '对战场上的一名单位造成4点伤害。如果你控制的符文不少于七枚，则改为对其造成7点伤害。' +
  '当该单位在本回合内被摧毁时，召出一枚休眠的符文。'

                                                  
export const VEN_146_DAMAGE = 4
export const VEN_146_BIG_DAMAGE = 7
export const VEN_146_RUNE_THRESHOLD = 7

                              
export function ven146Damage(state: GameState, controller: PlayerId): number {
  return controlledRuneCount(state, controller) >= VEN_146_RUNE_THRESHOLD ? VEN_146_BIG_DAMAGE : VEN_146_DAMAGE
}

export const VEN_146_SPEC: PlaySpec = {
  defId: 'VEN-146', cardNo: 'VEN·146', name: '汲魂痛击',
  kind: 'spell', cost: { mana: 4 }, keywords: [],
  target: 'custom',
  legalTargets: (state: GameState): string[] => battlefieldUnits(state),
  makeResolve:
    ({ target, controller, selfOid }: { target?: string; controller: PlayerId; selfOid?: ObjId }) =>
    (state: GameState): readonly GameEvent[] => {
                                                                  
                                                
      if (!spellTargetStillLegal(VEN_146_SPEC, state, controller, target, selfOid ?? '')) return []
      return [
        {
          kind: 'delayedTrigger',
          add: {
            id: delayedTriggerId('runeOnDestroy', 'VEN-146', target as ObjId),
            kind: 'runeOnDestroy', target: target as ObjId, controller, sourceDefId: 'VEN-146',
          },
        },
        {
          kind: 'damage', target: target as ObjId, amount: ven146Damage(state, controller),
          sourcePlayer: controller, source: selfOid,
        },
      ]
    },
}

export const VEN_146: Card = {
  id: 'VEN-146', cardNo: 'VEN·146', name: '汲魂痛击', category: 'spell',
  domains: ['green', 'blue'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '战场上一名单位吃4点(符文≥7则7点);它本回合被摧毁则召出休眠符文(VEN_146_SPEC)' }],
}

                                                                      
                              
                                                    
  
                                               
                                                                
export const UNL_095_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '让一名友方单位本回合内{{S}}+3。当该单位在本回合赢得一场战斗时，获得2经验。'

export const UNL_095_KEYWORDS: readonly string[] = ['迅捷']
export const UNL_095_PUMP = 3
export const UNL_095_EXP = 2

export const UNL_095_SPEC: PlaySpec = {
  defId: 'UNL-095', cardNo: 'UNL-095/219', name: '视死如归',
  kind: 'spell', cost: { mana: 2 }, keywords: [...UNL_095_KEYWORDS],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => ownFieldedUnits(state, controller),
  makeResolve:
    ({ target, controller }: { target?: string; controller: PlayerId }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined || state.objects[target as ObjId] === undefined) return []           
      return [
        pumpEvent('UNL-095', target, UNL_095_PUMP),
        {
          kind: 'delayedTrigger',
          add: {
            id: delayedTriggerId('expOnBattleWin', 'UNL-095', target as ObjId),
            kind: 'expOnBattleWin', target: target as ObjId, controller, sourceDefId: 'UNL-095',
          },
        },
      ]
    },
}

export const UNL_095: Card = {
  id: 'UNL-095', cardNo: 'UNL-095/219', name: '视死如归', category: 'spell',
  domains: ['orange'], energy: 2, keywords: [...UNL_095_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '友方单位本回合+3力;它本回合赢一场战斗则获2经验(UNL_095_SPEC)' }],
}
