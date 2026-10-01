                                                               
  
                                                          
                                       
                                                              
                                                              
                                           
                                                          
  
                                                                             
                                               
                          
  
                                                               
                                                                                          
                                                                          
                                                              
                                                       
                                                     
                                                     
                                                                
                                                                 
                  
                                              
                                                                 
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { GOLD_TOKEN } from './gear-triggers'
import { MINION, WAR_HAWK_TOKEN } from './reprint-batch'
import { ROBOT_TOKEN } from './token-spells'                                        
import { LAST_RITES, lastRitesTextDefId } from '../../src/keywords/lastRites'
import type { GameState } from '../../src/state/gameState'
import { resolveImplDefId } from '../variantAlias'                                  
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { MIGHTY_THRESHOLD } from './longtail-35'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { TokenSpec } from '../../src/state/mutations'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                                                                                               
import { hasteKeyOf } from './haste-key'                                                       
import { isUnit } from '../../src/state/cardTypes'                                                         

                                                  
export interface LastRitesSnap {
  readonly oid: ObjId
                                                             
  readonly defId?: string
     
                                                             
                                                                 
     
  readonly copiedDefId?: string
  readonly controller: PlayerId
     
                                           
                                                     
                                 
     
  readonly hereOtherAllies?: readonly ObjId[]
     
                                                   
                                                                                    
     
  readonly might?: number
                                                        
  readonly zone?: string
     
                                               
                                                          
     
  readonly hereOtherUnits?: readonly ObjId[]
                                                         
  readonly phaseAtDeath?: string
                                                                     
  readonly postDeathOid?: ObjId
  readonly activePlayerAtDeath?: PlayerId
     
                                                   
                                                                 
                                                    
     
  readonly counters?: Readonly<Record<string, number>>
}

   
                                                        
  
                                               
                                                    
                                      
                                              
                                               
                                               
                                                        
   
const tokenAt = (spec: unknown, controller: PlayerId, dormant = false): GameEvent => ({
  kind: 'spawnToken',
  spec,
  zone: `base:${controller}`,
  owner: controller,
  ...(dormant ? { dormant: true } : {}),
}) as GameEvent

   
                                                
                                                
                                                             
                                                 
   
const aloneDraw = (snap: LastRitesSnap): readonly GameEvent[] =>
  (snap.hereOtherAllies ?? []).length > 0
    ? []
    : [{ kind: 'draw', player: snap.controller, count: 1 } as GameEvent]

   
                                            
  
                                                        
                              
                                                     
                                
                                                      
                                                                         
   
const notAloneDraw = (snap: LastRitesSnap): readonly GameEvent[] =>
  (snap.hereOtherAllies ?? []).length > 0
    ? [{ kind: 'draw', player: snap.controller, count: 1 } as GameEvent]
    : []

   
                                      
                                                        
                                                           
                                                 
   
const mightyDrawTwo = (snap: LastRitesSnap): readonly GameEvent[] =>
  (snap.might ?? 0) >= MIGHTY_THRESHOLD
    ? [{ kind: 'draw', player: snap.controller, count: SFD_167_DRAW } as GameEvent]
    : []

   
                                              
  
                                          
                                                    
                                                                    
                                              
                                                                      
                                                   
   
const KOGMAW_DAMAGE = 4
const kogmawBlast = (snap: LastRitesSnap): readonly GameEvent[] =>
  (snap.zone ?? '').startsWith('battlefield')
    ? (snap.hereOtherUnits ?? []).map((oid): GameEvent => ({
        kind: 'damage', target: oid, amount: KOGMAW_DAMAGE, sourcePlayer: snap.controller,
      } as GameEvent))
    : []

   
                                          
  
                                                               
                                                          
                                                      
                                                
                                                  
   
const LELIANA_BONUS_PHASE = 'start'
const phaseScaledDraw = (snap: LastRitesSnap): readonly GameEvent[] => {
  const myStart = snap.phaseAtDeath === LELIANA_BONUS_PHASE
    && snap.activePlayerAtDeath === snap.controller
  return [{ kind: 'draw', player: snap.controller, count: myStart ? 2 : 1 } as GameEvent]
}

   
                          
                                
                                 
                                     
                                                                       
   
export const UNIT_LAST_RITES: Readonly<Record<string,
  (snap: LastRitesSnap, chosen?: Readonly<Record<string, string>>, state?: GameState) => readonly GameEvent[]>> = {
  'OGN-096': (snap) => [{ kind: 'draw', player: snap.controller, count: 1 } as GameEvent],
  'OGN-216': (snap) => [
    { kind: 'summonRune', player: snap.controller, count: 1, dormant: true } as GameEvent,
  ],
                                                      
                                                         
                                    
  'SFD-155': (snap) => [tokenAt(GOLD_TOKEN, snap.controller, true)],
  'OGN-239': (snap) => [
    tokenAt(MINION, snap.controller), tokenAt(MINION, snap.controller), tokenAt(MINION, snap.controller),
  ],
  'SFD-021': (snap) => [tokenAt(ROBOT_TOKEN, snap.controller), tokenAt(ROBOT_TOKEN, snap.controller)],
                                                                  
                                          
                                                                         
                                                     
                                                              
                                                   
                                                                           
  'UNL-221': aloneDraw,
  'SFD-036': aloneDraw,
                                                           
                                        
                                                               
                                                                     
                                                                
                                                 
                                                           
                                           
                                                                   
  'VEN-128': (snap) => (snap.counters?.['empower'] ?? 0) > 0
    ? [tokenAt(MINION, snap.controller), tokenAt(MINION, snap.controller)]
    : [],
  'UNL-152': (snap) => [
    { kind: 'summonRune', player: snap.controller, count: 1, dormant: true } as GameEvent,
  ],
                                                                
  'UNL-156': notAloneDraw,
                                                          
  'SFD-167': mightyDrawTwo,
                                                                       
                                                              
                                                                  
                                                    
                                                                              
  'UNL-153': (snap) => [tokenAt(WAR_HAWK_TOKEN, snap.controller)],
                                           
                                                                     
                                              
                                                
  'OGN-075': (snap) => [
    { kind: 'summonRune', player: snap.controller, count: 1, dormant: true } as GameEvent,
    { kind: 'summonRune', player: snap.controller, count: 1, dormant: true } as GameEvent,
    { kind: 'draw', player: snap.controller, count: 1 } as GameEvent,
  ],
                                                            
                                                   
  'OGN-190': kogmawBlast,
                                                        
  'UNL-172': phaseScaledDraw,
                                                              
                                   
                                                               
                                                        
                                 
                                                                               
  'OGN-110': (snap, _chosen, state) => state === undefined ? [] :
    Object.values(state.objects)
      .filter((o) => (o.defId as string).startsWith('rune:') && o.controller === snap.controller
        && ['base', 'battlefield'].includes(state.zones[o.zone]?.kind as string))
      .map((o) => ({ kind: 'statusChange', target: o.oid, key: 'tapped', value: false, count: 1 } as GameEvent)),
}

                       
export const UNIT_LAST_RITES_DEFIDS: readonly string[] = Object.keys(UNIT_LAST_RITES).sort()

   
                                                   
                                                            
   
export const UNIT_LAST_RITES_BASE_PERFORM: Readonly<Record<string,
  (snap: LastRitesSnap) => (state: GameState, deps?: ReduceDeps) => GameState | null>> = {
                                                             
                                             
    
                                                         
                                                            
                              
                                                                 
                                                               
                                                         
                                                     
                                                 
                                                                   
                                         
                                                      
                                                                         
                                                        
  'OGN-110': (snap) => (state, deps) => {
    const oid = snap.postDeathOid
    if (oid === undefined) return null
    const o = state.objects[oid]
    if (!o || state.zones[o.zone]?.kind !== 'discard') return null
                                                                              
    const evs1426: readonly GameEvent[] = [{ kind: 'recycle', objs: [oid], player: o.owner } as GameEvent]
    return deps?.triggerSource
      ? landAndEnqueueTriggers(state, evs1426, deps.triggerSource, snap.controller, deps)
      : applyEvents(state, evs1426, deps ?? {}).state
  },
}

                                                               
export function unitLastRitesBasePerform(snap: LastRitesSnap): ((state: GameState) => GameState | null) | undefined {
                                                                 
                                               
  const tid = lastRitesTextDefId(snap)
  const make = tid === undefined
    ? undefined
    : UNIT_LAST_RITES_BASE_PERFORM[resolveImplDefId(tid, (x) => x in UNIT_LAST_RITES_BASE_PERFORM)]
  return make === undefined ? undefined : make(snap)
}

                                                                           
function unitLastRitesImplOf(snap: LastRitesSnap): string | undefined {
                                                           
                                                  
                                              
                                              
  const tid = lastRitesTextDefId(snap)
  if (tid === undefined) return undefined
  const impl = resolveImplDefId(tid, (x) => x in UNIT_LAST_RITES)
  return impl in UNIT_LAST_RITES ? impl : undefined
}

                                                                         
export function unitLastRitesHasteKey(implDefId: string, i: number): string {
  return hasteKeyOf(`${implDefId}:rites`, i)
}

                                                                                                  
function unitTokenLabel(spec: TokenSpec): string | undefined {
  if (spec.defId === MINION.defId) return '随从'
  if (spec.defId === ROBOT_TOKEN.defId) return '机器人'
  if (spec.defId === WAR_HAWK_TOKEN.defId) return '战鹰'
  return undefined
}

   
                                                                                 
                                                                                                           
                                                                                           
                                                                
                                            
                                                                                         
   
export function unitLastRitesHasteChoice(
  snap: LastRitesSnap, itemId: string, state: GameState, chosen: Readonly<Record<string, string>>,
): ChoiceRequest | null {
  const impl = unitLastRitesImplOf(snap)
  const make = impl === undefined ? undefined : UNIT_LAST_RITES[impl]
  if (impl === undefined || make === undefined) return null
  const keys: string[] = []
  for (const ev of make(snap, chosen, state)) {
    if (ev.kind !== 'spawnToken' || !isUnit(ev.spec)) continue
    const key = unitLastRitesHasteKey(impl, keys.length + 1)
    const label = unitTokenLabel(ev.spec)
    const q = spawnTokenHasteChoice(state, ev.owner, ev.spec, { itemId, key, ...(label !== undefined ? { label } : {}) }, chosen, hastePaidSoFar(chosen, keys))
    if (q !== null) return q
    keys.push(key)
  }
  return null
}

                                                                                                                                     
function unitLastRitesTokensResolved(
  evs: readonly GameEvent[], implDefId: string, state: GameState, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] {
  const out: GameEvent[] = []
  let i = 0
  let paid = 0
  for (const ev of evs) {
    if (ev.kind !== 'spawnToken' || !isUnit(ev.spec)) { out.push(ev); continue }                                         
    i += 1
    const x = spawnTokenHasteResolve(state, ev.owner, ev.spec, unitLastRitesHasteKey(implDefId, i), chosen, hasteCostTimes(paid))
    if (x.ready) paid += 1
    out.push(...x.pre, x.ready ? { ...ev, ready: true } : ev)
  }
  return out
}

   
                                               
                                                  
   
export function unitLastRitesEffect(
  snap: LastRitesSnap, chosen?: Readonly<Record<string, string>>, state?: GameState,
): readonly GameEvent[] {
                                                                      
  const impl = unitLastRitesImplOf(snap)
  const make = impl === undefined ? undefined : UNIT_LAST_RITES[impl]
  if (impl === undefined || make === undefined) return []
  const evs = make(snap, chosen, state)
                                                                              
                                                                                 
  return state === undefined || chosen === undefined ? evs : unitLastRitesTokensResolved(evs, impl, state, chosen)
}

                                                                            
import type { Card } from '../../src/dsl/card'

export const OGN_110_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{蓝色}}，让我以活跃状态进场。）\n' +
  '{{绝念}}—回收我，以此让你的所有符文变为活跃状态。（当我被摧毁后，发动此效果。）'
export const OGN_110: Card = {
  id: 'OGN-110', cardNo: 'OGN·110/298', name: '艾克', category: 'unit',
  domains: ['blue'], energy: 5, power: 5, keywords: ['急速', '绝念'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[急速]§805 可选额外费{1}+{蓝}(通用通道)' },
    { kind: 'passive', describe: '[绝念]回收我(基础费,UNIT_LAST_RITES_BASE_PERFORM)+全符文活跃(UNIT_LAST_RITES)' },
  ],
}

export const VEN_128_CARD_EFFECT =
  '{{强化1黄色}}（支付{{1}}和{{黄色}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}}{{>绝念>}} 打出两名1{{S}}的"随从"到你的基地。（当我在已强化状态下被摧毁时，发动此效果。）'
export const VEN_128: Card = {
  id: 'VEN-128', cardNo: 'VEN·128', name: '诺克萨斯使节', category: 'unit',
  domains: ['yellow'], energy: 2, power: 2, keywords: ['强化1黄色', '绝念'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[强化1黄色]§827 通用工厂出主动技能' },
    { kind: 'passive', describe: '已强化时的条件[绝念]:出两名随从到基地(UNIT_LAST_RITES 行内判 counters.empower)' },
  ],
}

export const OGN_096_CARD_EFFECT = '{{绝念}}—抽一张牌。（当我被摧毁后，发动此效果。）'
export const OGN_216_CARD_EFFECT = '{{绝念}}—召出一枚休眠的符文。（当我被摧毁后，发动此效果。）'

export const OGN_096: Card = {
  id: 'OGN-096', cardNo: 'OGN·096/298', name: '警觉的哨兵', category: 'unit',
  domains: ['blue'], energy: 2, power: 1, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]被摧毁后抽一张牌(UNIT_LAST_RITES)' }],
}
export const OGN_216: Card = {
  id: 'OGN-216', cardNo: 'OGN·216/298', name: '侦察飞鹰', category: 'unit',
  domains: ['yellow'], energy: 2, power: 1, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]被摧毁后召出一枚休眠符文(UNIT_LAST_RITES)' }],
}
                                                            
export const SFD_155_CARD_EFFECT = '{{绝念}} — 打出一个休眠的“金币”装备指示物。（当我被摧毁后，发动此效果。）'
export const OGN_239_CARD_EFFECT = '{{绝念}}—打出三名1{{S}}的“随从”到你的基地。（当我被摧毁后，发动此效果。）'
export const SFD_021_CARD_EFFECT = '{{绝念}}—打出两名3{{S}}的“机器人”到你的基地。（当我被摧毁后，发动此效果。）'

export const SFD_155: Card = {
  id: 'SFD-155', cardNo: 'SFD·155/221', name: '诚实掮客', category: 'unit',
  domains: ['yellow'], energy: 2, power: 2, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]被摧毁后打出一个休眠金币(UNIT_LAST_RITES)' }],
}
export const OGN_239: Card = {
  id: 'OGN-239', cardNo: 'OGN·239/298', name: '机械戏法师', category: 'unit',
  domains: ['yellow'], energy: 5, power: 4, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]被摧毁后打出三名随从到基地(UNIT_LAST_RITES)' }],
}
export const SFD_021: Card = {
  id: 'SFD-021', cardNo: 'SFD·021/221', name: '铁甲先锋', category: 'unit',
  domains: ['red'], energy: 6, power: 6, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]被摧毁后打出两名机器人到基地(UNIT_LAST_RITES)' }],
}

                                                       
                                                        
export const UNL_221_CARD_EFFECT = '{{绝念}} — 当我被摧毁时，如果此处没有其他友方单位，则抽一张牌。'
export const SFD_036_CARD_EFFECT = '{{绝念}} — 当我被摧毁时，如果此处没有其他友方单位，则抽一张牌。（当我被摧毁后，发动此效果。）'

const POORO: Omit<Card, 'id' | 'cardNo'> = {
  name: '哀哀魄罗', category: 'unit',
  domains: ['green'], energy: 2, power: 2, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]此处无其他友方单位时抽一张牌(UNIT_LAST_RITES)' }],
}
export const UNL_221: Card = { ...POORO, id: 'UNL-221', cardNo: 'UNL-221/219' }
export const SFD_036: Card = { ...POORO, id: 'SFD-036', cardNo: 'SFD·036/221' }

                                                                            
                              
export const SFD_167_DRAW = 2
                                                           
export const UNL_152_KEYWORDS: readonly string[] = ['强攻', LAST_RITES]

export const UNL_152_CARD_EFFECT = '{{强攻}}（如果我是进攻方，则{{S}}+1。） {{绝念>}} 召出一枚休眠的符文。（当我被摧毁后，发动此效果。）'
export const UNL_156_CARD_EFFECT = '{{绝念>}} 如果我被摧毁时未处于落单状态，则抽一张牌。（当我被摧毁后，发动此效果。所在位置没有其他友方单位时，即视为“落单”。）'
export const SFD_167_CARD_EFFECT = '{{绝念}} — 如果我为{{强力}}单位，则抽两张牌。（当我被摧毁后，发动此效果。战力达到5或以上时，即为强力单位。）'

export const UNL_152: Card = {
  id: 'UNL-152', cardNo: 'UNL-152/219', name: '黑色玫瑰要员', category: 'unit',
  domains: ['yellow'], energy: 3, power: 2, keywords: UNL_152_KEYWORDS, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '印刷[强攻];[绝念]召出一枚休眠符文(UNIT_LAST_RITES)' }],
}
export const UNL_156: Card = {
  id: 'UNL-156', cardNo: 'UNL-156/219', name: '忠忠魄罗', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]未落单则抽一张牌(UNIT_LAST_RITES)' }],
}
export const SFD_167: Card = {
  id: 'SFD-167', cardNo: 'SFD·167/221', name: '无名英雄', category: 'unit',
  domains: ['yellow'], energy: 2, power: 2, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]死时为强力单位则抽两张牌(UNIT_LAST_RITES)' }],
}

                                                                            
                                   
export const OGN_075_RUNES = 2

export const UNL_153_CARD_EFFECT = '{{绝念>}} 打出一名1{{S}}的“战鹰”到你的基地，它拥有{{法盾}}。（当我被摧毁后，发动此效果。）'
export const OGN_075_CARD_EFFECT = '{{急速}}（你可以选择额外支付{{1}}和{{绿色}}，让我以活跃状态进场。） {{绝念}}—召出两枚休眠的符文，再抽一张牌。（当我被摧毁后，发动此效果。）'

export const UNL_153: Card = {
  id: 'UNL-153', cardNo: 'UNL-153/219', name: '腐泥疏浚工', category: 'unit',
  domains: ['yellow'], energy: 2, power: 1, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]打出一名带法盾的1[S]战鹰到基地(UNIT_LAST_RITES)' }],
}
export const OGN_075: Card = {
  id: 'OGN-075', cardNo: 'OGN·075/298', name: '美味仙灵', category: 'unit',
  domains: ['green'], energy: 7, power: 6, keywords: ['急速', LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '印刷[急速];[绝念]召两枚休眠符文再抽一张(UNIT_LAST_RITES)' }],
}

                                                                  
export { KOGMAW_DAMAGE, LELIANA_BONUS_PHASE }

export const OGN_190_CARD_EFFECT = '{{绝念}}-对我所处战场上的所有单位各造成4点伤害。（当我被摧毁后，发动此效果。）'
export const UNL_172_CARD_EFFECT = '{{强攻}}（如果我是进攻方，则{{S}}+1。） {{绝念>}} 抽一张牌。若此时是你的开始阶段，则改为抽两张牌。（当我被摧毁后，发动此效果。）'

export const OGN_190: Card = {
  id: 'OGN-190', cardNo: 'OGN·190/298', name: '克格莫 - 腐蚀巨口', category: 'unit',
  domains: ['purple'], energy: 3, power: 1, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]对我所处战场上所有单位各打4点(UNIT_LAST_RITES)' }],
}
export const UNL_172: Card = {
  id: 'UNL-172', cardNo: 'UNL-172/219', name: '乐芙兰 - 残影之殇', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: ['强攻', LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '印刷[强攻];[绝念]抽1,我的开始阶段则改抽2(UNIT_LAST_RITES)' }],
}

export const UNIT_LAST_RITES_CARDS: readonly Card[] = [
  OGN_096, OGN_216, SFD_155, OGN_239, SFD_021, UNL_221, SFD_036,
  UNL_152, UNL_156, SFD_167, UNL_153, OGN_075, OGN_190, UNL_172,
]
