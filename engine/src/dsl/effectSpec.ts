                                   
  
                                             
                             
  
                                      
  
                                                         
                                                   
                                                         
                                  
                                                   
  
                                           
                                        

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import type { GameEvent } from '../loop/events'
import type { Cost } from '../state/runePool'
import type { ChoiceRequest } from '../loop/chain'                   
import type { TokenSpec } from '../state/mutations'                              
import type { Duration } from '../effects/continuousView'
import { canPayFromState } from '../game/economy'
import { attachedTo } from '../state/attach'
import { resolveSelector, type Selector } from './selector'
import { experienceOf } from '../keywords/level'
import { computeSnapshotDelta } from '../effects/continuousView'                       
import { effectiveMight } from '../state/might'

                             
export type Ref =
  | { readonly ref: 'self' }                                             
  | { readonly ref: 'controller' }                                  
  | { readonly ref: 'eventSubject' }                                                         
  | { readonly ref: 'chosen'; readonly key: string }                      
  | { readonly ref: 'oid'; readonly oid: ObjId }                      
  /**
   * 武装的「我」= 穿戴者(宿主)。§150.2 未贴附时没有"我" ⇒ 解析为 undefined,对应 op 发空事件。
   * ⚠️ 与 `self` 是两回事:`self` 是武装这张卡本身(如「让此牌横置」),`host` 是它贴着的那名单位。
   */
  | { readonly ref: 'host' }
  /** forEach 里的「当前这一个」。不在 forEach 里解析为 undefined ⇒ 对应 op 发空事件。 */
  | { readonly ref: 'each' }

                                   
export interface NonResourceCost {
                                                 
  readonly dormantSelf?: boolean
     
                                           
                                               
                                                                   
     
  readonly experience?: number
}

export interface CostSpec {
  readonly resource?: Cost
  readonly nonResource?: NonResourceCost
     
                                           
                                       
     
  readonly canPayNonResource?: (state: GameState, selfOid: ObjId, controller: PlayerId) => boolean
}

                                                                           
export type Op =
     
             
                                                      
                                          
     
     
                                       
                                                           
                                       
                                    
                                                
     
  | { readonly op: 'draw'; readonly count: number | ((ctx: EffectCtx) => number) }
  /**
   * §730.1 获得经验。经验是【资源】不是物体(§731),走 gainResource 这一条通道
   * —— 狩猎也走它,别另开一路(㊼)。amount 同样可按盘面现算。
   */
  | { readonly op: 'gainExperience'; readonly amount: number | ((ctx: EffectCtx) => number) }
  | { readonly op: 'setStatus'; readonly target: Ref; readonly key: string; readonly value: boolean }
  /**
   * §428 摧毁。
   * ⚠️ `sourcePlayer` 默认【不带】:带上归因会让对手的「当你摧毁…」类触发跟着响,
   *    那是行为改动,不该在重构里顺手发生(第116轮 agent 提醒)。
   *    要归因就显式写,别让它默认发生。
   */
  | { readonly op: 'destroy'; readonly target: Ref; readonly sourcePlayer?: Ref }
  /**
   * 造成伤害。
   * ⚠️ amount 支持按盘面现算(与 draw.count / insight.count 同一种写法,不另起第二种):
   *    「造成等同于我战力的伤害」这类点数取决于**结算那一刻**的战力(§359.3.e.12:
   *    源若已离场,战力视为"无" ⇒ 现算函数自己判空返回 0)。
   */
  | { readonly op: 'damage'; readonly target: Ref; readonly amount: number | ((ctx: EffectCtx) => number) }
  | { readonly op: 'grantBuff'; readonly target: Ref }
  /**
   * §702.2.b 消耗增益(移除【单个】增益指示物)。常被当费用用(㊹)。
   * ⚠️ by 给了就按 §702.2.b.2 校验"只能消耗自己控制的单位上的";
   *    §702.2.b.1 没增益就消耗不了 —— 原语里两条都在,无操作时静默返回,
   *    所以【当费用用时必须另有 guard 把关】(铁律70),别指望它报错。
   */
  | { readonly op: 'consumeBuff'; readonly target: Ref; readonly by?: Ref }
  /**
   * 移动到某区。
   * ⚠️ zone 收得到【被移动的那个 oid】:卡文常写「返回【其所属】的手牌」——那是 owner 不是 controller,
   *    弹回对手的单位时两者不同(吟风翼 SFD-138 就是这个形状)。
   */
  | { readonly op: 'moveTo'; readonly target: Ref
      ; readonly zone: (ctx: EffectCtx, moved: ObjId) => string
      ; readonly placement?: 'top' | 'bottom' }
  /**
   * §185 打出/创建一枚指示物。
   * ⚠️ zone 收的是整个 ctx 而不是光一个 controller:卡文常写「在【此处】打出一名…」,
   *    「此处」= 我这张卡被打出到的位置,只有 ctx 才查得到(第130轮由三张"在此处打出"的卡逼出来)。
   */
  | { readonly op: 'spawnToken'; readonly spec: unknown; readonly zone: (ctx: EffectCtx) => string
      ; readonly dormant?: boolean; readonly ready?: boolean
      /** ★1398【缺陷 176 B4 · DSL 钩】给这枚指示物配急速问口(雷克塞 SFD-029 + QA 270):问侧 `effectHasteChoice`、结算侧 compileEffect 走收口点;`ready: true` 的行空转不问。 */
      ; readonly haste?: SpawnTokenHasteOpt }
  /** 「给予我在本回合内[强攻2]」这类:持续效果给关键词。 */
  | { readonly op: 'grantKeyword'; readonly target: Ref; readonly keyword: string; readonly duration: Duration
      ; readonly id: string }
  /** 「本回合内[M]+N」/「[M]-N(不低于X)」。 */
  | { readonly op: 'addMight'; readonly target: Ref; readonly delta: number; readonly duration: Duration
      ; readonly id: string; readonly floor?: number }
  /** §423 眩晕(已被眩晕的不会再眩晕一次,由原语负责)。 */
  | { readonly op: 'stun'; readonly target: Ref }
  /** §427 放逐;by=放逐者实例(§427.3 放逐账本按实例记)。 */
  | { readonly op: 'banish'; readonly target: Ref; readonly by?: Ref }
  /** 「本回合内无法移动/无法进攻」这类限制。 */
  | { readonly op: 'restrict'; readonly target: Ref; readonly restriction: string
      ; readonly duration: Duration; readonly id: string }
  /**
   * 「返回【其所属】的手牌」——卡文最常见的弹回写法。
   * ★⚠️ 回的是 **owner 的**手牌不是 controller 的:弹被自己夺控的敌方单位时两者不同,
   *    弹回自己手上就是白送对手一张牌。这个坑第121轮在吟风翼上写对过一次,
   *    固化成一等动作免得每张卡各写一遍 zone 回调再各错一次(㊼)。
   */
  | { readonly op: 'bounceToOwnerHand'; readonly target: Ref }
  /**
   * 「将…移动到其基地」。
   * ★⚠️ 这是 §446.1 的**真移动**(「常驻牌从场上的任意位置移动至场上的另一位置,即算作移动」),
   *    基地是场上位置 ⇒ 除了改区,**必须补一条 unitMoved 信号**,否则「当我移动时」类的卡收不到。
   *    §446.2 明说"改换区域这件事本身不构成移动",所以引擎不会替你推断——由效果自己发
   *    (与控潮者 OGN-199 同款做法)。少发这条不会报错,只会让一整族触发静默失灵。
   * ⚠️ 回的是【其】基地(owner 的),不是我的基地。
   */
  | { readonly op: 'moveToOwnBase'; readonly target: Ref }
  /**
   * 「将…移动到【某处战场】」——场上位置之间的移动。
   * ★⚠️ 与 `moveTo` 的区别是承重的:`moveTo` 只发 `zoneChange`,那是给
   *    "去手牌/废牌堆/牌堆"这类**跨界**用的;而 §446.1「常驻牌从场上的任意位置
   *    移动至场上的另一位置,即算作移动」⇒ 场上→场上**必须补发 `unitMoved`**,
   *    否则「当我移动时」「当我移动到一处战场时」这些触发全都收不到(铁律63)。
   *    用错了盘面看起来一模一样,只有那些触发静默失灵 —— 最难发现的一类。
   * ⚠️ 已经在目标战场上的不再移动一次(§446 同区不算移动)。
   */
  | { readonly op: 'moveOnField'; readonly target: Ref; readonly zone: (ctx: EffectCtx) => string }
  /** §471 得分。 */
  | { readonly op: 'gainPoint'; readonly amount: number }
  /** §430 召出符文;dormant=「休眠的」。 */
  | { readonly op: 'summonRune'; readonly count: number; readonly dormant?: boolean }
  /**
   * §436 洞察 N;recycleAll=不给选、全回收到底。
   * ⚠️ count 支持按盘面现算:「查看顶4张…回收其余」里"其余"是几张,**取决于玩家有没有拿走一张**
   *    (拿了剩3、没拿剩4)。写死会在玩家放弃选择时少回收一张,牌堆顺序从此错位。
   */
  | {
      readonly op: 'insight'
      readonly count: number | ((ctx: EffectCtx) => number)
      readonly recycleAll?: boolean
         
                                             
                                                   
                                       
                                                         
         
      readonly recycle?: (ctx: EffectCtx) => readonly ObjId[]
    }
  /** §441 强化。 */
  | { readonly op: 'empower'; readonly target: Ref }
  /** 装不进积木的老实写函数(比装成假积木好)。 */
  /**
   * 「让【所有】…」「对【所有】…各造成N点伤害」——按选择器逐个跑一遍子动作。
   *
   * ⚠️ 子动作里用 `{ ref: 'each' }` 指代当前这一个。
   * ⚠️ 逐个求值都用【同一个】结算前快照 state:卡文说的是"对所有X各做一次",
   *    不是"做完一个再看剩下谁还符合"。要是边做边重算,前一个的效果会把后一个筛掉
   *    (「所有不高于2[M]的单位返回手牌」弹走第一个后盘面就变了)。
   *    §355 的选取是一次性的,这里照办。
   */
  | { readonly op: 'forEach'; readonly selector: Selector; readonly then: readonly Op[] }
  | { readonly op: 'custom'; readonly emit: (ctx: EffectCtx) => readonly GameEvent[] }

export interface EffectCtx {
  readonly state: GameState
                                                                   
  readonly selfOid: ObjId | null
  readonly controller: PlayerId
  readonly ev: GameEvent
  readonly chosen: Readonly<Record<string, string>>
                                                                         
  readonly eachOid?: ObjId
}

export interface EffectSpec {
     
                                    
                                      
                                                   
     
  readonly guard?: (ctx: EffectCtx) => boolean
                                      
  readonly cost?: CostSpec
                   
  readonly then: readonly Op[]
}

                                                                  
function subjectOf(ev: GameEvent): ObjId | undefined {
  const e = ev as { target?: ObjId; unit?: ObjId; obj?: ObjId }
  return e.target ?? e.unit ?? e.obj
}

   
                                
                                                        
                                                    
   
function alive(ctx: EffectCtx, oid: ObjId | undefined): ObjId | undefined {
  return oid && ctx.state.objects[oid] ? oid : undefined
}
function resolveRef(r: Ref, ctx: EffectCtx): ObjId | undefined {
  switch (r.ref) {
    case 'self': return ctx.selfOid ?? undefined
    case 'controller': return undefined                             
    case 'eventSubject': return alive(ctx, subjectOf(ctx.ev))
    case 'chosen': return alive(ctx, ctx.chosen[r.key] as ObjId | undefined)
    case 'oid': return alive(ctx, r.oid)
    case 'host': return alive(ctx, ctx.selfOid ? attachedTo(ctx.state.objects[ctx.selfOid]) : undefined)
    case 'each': return alive(ctx, ctx.eachOid)
  }
}

function emitOp(o: Op, ctx: EffectCtx): readonly GameEvent[] {
  switch (o.op) {
    case 'draw': {
      const n = typeof o.count === 'function' ? o.count(ctx) : o.count
      return n > 0 ? [{ kind: 'draw', player: ctx.controller, count: n }] : []
    }
    case 'gainExperience': {
      const n = typeof o.amount === 'function' ? o.amount(ctx) : o.amount
      return n > 0 ? [{ kind: 'gainResource', player: ctx.controller, experience: n }] : []
    }
    case 'setStatus': {
      const t = resolveRef(o.target, ctx)
      return t ? [{ kind: 'statusChange', target: t, key: o.key, value: o.value }] : []
    }
    case 'destroy': {
      const t = resolveRef(o.target, ctx)
                                                        
      if (!t) return []
      const blame = o.sourcePlayer ? ctx.controller : undefined            
      return [{ kind: 'destroy', target: t, ...(blame ? { sourcePlayer: blame } : {}) }]
    }
    case 'damage': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      const amount = typeof o.amount === 'function' ? o.amount(ctx) : o.amount
      if (amount <= 0) return []                               
                                                              
                                                            
                                       
      return [{ kind: 'damage', target: t, amount, sourcePlayer: ctx.controller, ...(ctx.selfOid ? { source: ctx.selfOid } : {}) }]
    }
    case 'consumeBuff': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      return [{ kind: 'consumeBuff', target: t, ...(o.by ? { by: ctx.controller } : {}) }]
    }
    case 'grantBuff': {
      const t = resolveRef(o.target, ctx)
      return t ? [{ kind: 'grantBuff', target: t }] : []
    }
    case 'moveTo': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      const to = o.zone(ctx, t) as ZoneId
      return [{ kind: 'zoneChange', obj: t, to, ...(o.placement ? { placement: o.placement } : {}) }]
    }
    case 'spawnToken':
      return [{
        kind: 'spawnToken', spec: o.spec as never, zone: o.zone(ctx) as never,
        owner: ctx.controller, ...(o.dormant ? { dormant: true } : {}), ...(o.ready ? { ready: true } : {}),
      }]
    case 'grantKeyword': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      return [{
        kind: 'addEffect',
        effect: {
          id: `${o.id}:${t}`, duration: o.duration, fromPassive: false,
          predicate: (x) => x.oid === t,
          modification: { kind: 'grantKeyword', keyword: o.keyword },
        },
      }]
    }
    case 'addMight': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
                                                             
                                              
                                         
                                                                
                                                                
                                                               
                                                             
                                                 
      let delta = o.delta
      if (o.floor !== undefined) {
        const cur = ctx.state.objects[t as ObjId]
        if (cur) delta = computeSnapshotDelta(effectiveMight(cur).actual, o.delta, o.floor)
        if (delta === 0) return []
      }
      return [{
        kind: 'addEffect',
        effect: {
          id: `${o.id}:${t}`, duration: o.duration, fromPassive: false,
          predicate: (x) => x.oid === t,
                                                              
          modification: { kind: 'addMight', delta },
        },
      }]
    }
    case 'stun': {
      const t = resolveRef(o.target, ctx)
      return t ? [{ kind: 'stun', target: t }] : []
    }
    case 'banish': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      const by = o.by ? resolveRef(o.by, ctx) : (ctx.selfOid ?? undefined)
      return [{ kind: 'banish', target: t, ...(by ? { by } : {}) }]
    }
    case 'restrict': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      return [{
        kind: 'addEffect',
        effect: {
          id: `${o.id}:${t}`, duration: o.duration, fromPassive: false,
          predicate: (x) => x.oid === t,
          modification: { kind: 'addRestriction', restriction: o.restriction } as never,
        },
      }]
    }
    case 'bounceToOwnerHand': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      const owner = ctx.state.objects[t]?.owner
      if (!owner) return []
      return [{ kind: 'zoneChange', obj: t, to: `hand:${owner}` as ZoneId }]
    }
    case 'moveOnField': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      const obj = ctx.state.objects[t]
      if (!obj) return []
      const to = o.zone(ctx) as ZoneId
      if (!ctx.state.zones[to]) return []
      if ((obj.zone as string) === (to as string)) return []               
      return [
        { kind: 'zoneChange', obj: t, to },
                                         
                                                                                  
                                                                                                             
        { kind: 'unitMoved', unit: t, player: obj.controller, from: obj.zone, to },
      ]
    }
    case 'moveToOwnBase': {
      const t = resolveRef(o.target, ctx)
      if (!t) return []
      const o2 = ctx.state.objects[t]
      if (!o2) return []
      const to = `base:${o2.owner}` as ZoneId
      if ((o2.zone as string) === (to as string)) return []                       
      return [
        { kind: 'zoneChange', obj: t, to },
                                                                                    
        { kind: 'unitMoved', unit: t, player: o2.controller, from: o2.zone, to }, // §446.1 补移动信号
      ]
    }
    case 'gainPoint':
      return [{ kind: 'gainPoint', player: ctx.controller, amount: o.amount }]
    case 'summonRune':
      return [{ kind: 'summonRune', player: ctx.controller, count: o.count, ...(o.dormant ? { dormant: true } : {}) }]
    case 'insight': {
      const n = typeof o.count === 'function' ? o.count(ctx) : o.count
      if (n <= 0) return []
      const picked = o.recycle?.(ctx) ?? []
      return [{
        kind: 'insight', player: ctx.controller, count: n,
        ...(o.recycleAll ? { recycleAll: true } : {}),
        ...(picked.length > 0 ? { recycle: picked } : {}),
      }]
    }
    case 'empower': {
      const t = resolveRef(o.target, ctx)
      return t ? [{ kind: 'empower', target: t }] : []
    }
    case 'forEach': {
                                                 
                                
      const targets = resolveSelector(ctx.state, o.selector, ctx.controller,
        { ev: ctx.ev, ...(ctx.selfOid !== null ? { selfOid: ctx.selfOid } : {}) })
      const out: GameEvent[] = []
      for (const t of targets) {
        for (const sub of o.then) out.push(...emitOp(sub, { ...ctx, eachOid: t }))
      }
      return out
    }
    case 'custom':
      return o.emit(ctx)
  }
}

                                                                                          
                                                                                                                              
export interface SpawnTokenHasteOpt { readonly key: string; readonly label?: string }
   
                                                                                                
                                                                                                                
                                                         
   
export interface SpawnTokenHasteHooks {
                                        
  readonly choice: (state: GameState, owner: PlayerId, spec: TokenSpec, base: { readonly itemId: string; readonly key: string; readonly label?: string }, chosen: Readonly<Record<string, string>> | undefined, alsoDue?: Cost) => ChoiceRequest | null
                                                                           
  readonly resolve: (state: GameState, owner: PlayerId, spec: TokenSpec, key: string, chosen: Readonly<Record<string, string>> | undefined, alsoDue?: Cost) => { readonly ready: boolean; readonly pre: readonly GameEvent[] }
                                                    
  readonly paidSoFar: (chosen: Readonly<Record<string, string>> | undefined, keys: readonly string[]) => Cost | undefined
                                                  
  readonly costTimes: (n: number) => Cost | undefined
}
let hasteHooks: SpawnTokenHasteHooks | null = null
                                       
export function setSpawnTokenHasteHooks(h: SpawnTokenHasteHooks | null): void {
  hasteHooks = h
}
                                                                                 
function hasteOps(spec: EffectSpec): readonly { readonly spec: TokenSpec; readonly haste: SpawnTokenHasteOpt }[] {
  const out: { spec: TokenSpec; haste: SpawnTokenHasteOpt }[] = []
  for (const o of spec.then) if (o.op === 'spawnToken' && o.haste !== undefined && o.ready !== true) out.push({ spec: o.spec as TokenSpec, haste: o.haste })
  return out
}
                                                                                                                     
function assertHasteShape(spec: EffectSpec): void {
  const keys = hasteOps(spec).map((h) => h.haste.key)
  if (keys.length > 0 && spec.cost?.resource !== undefined) throw new Error('★1398 DSL 急速钩不接带自带资源费的 EffectSpec:两笔要合成一笔付(缺陷 175),照 ★1397 SFD-207 手写两份形状')
  if (new Set(keys).size !== keys.length) throw new Error('★1398 同一条 EffectSpec 里的急速 key 必须各不相同(多枚用 hasteKeyOf(base, i) 序号键)')
  for (const o of spec.then) if (o.op === 'forEach' && o.then.some((x) => x.op === 'spawnToken' && x.haste !== undefined)) throw new Error('★1398 forEach 里的 spawnToken 不接急速钩(枚数结算期才知道,问不出序号键)')
}
   
                                                                                                 
                                                                                 
   
export function effectHasteChoice(spec: EffectSpec, state: GameState, controller: PlayerId, chosen: Readonly<Record<string, string>>): ChoiceRequest | null {
  if (hasteHooks === null) return null
  const before: string[] = []
  for (const h of hasteOps(spec)) {
    const q = hasteHooks.choice(state, controller, h.spec, { itemId: `effect:${h.haste.key}`, key: h.haste.key, ...(h.haste.label !== undefined ? { label: h.haste.label } : {}) }, chosen, hasteHooks.paidSoFar(chosen, before))
    if (q !== null) return q
    before.push(h.haste.key)
  }
  return null
}
                                                        
export function effectHasHaste(spec: EffectSpec): boolean {
  return hasteOps(spec).length > 0
}

                               
export function canAffordEffect(spec: EffectSpec, state: GameState, selfOid: ObjId | null, controller: PlayerId): boolean {
  const c = spec.cost
  if (!c) return true
                                                          
  if (c.resource && !canPayFromState(state, controller, c.resource)) return false
  if (c.canPayNonResource && (selfOid === null || !c.canPayNonResource(state, selfOid, controller))) return false
                                                        
  if (c.nonResource?.experience && experienceOf(state, controller) < c.nonResource.experience) return false
  return true
}

   
                                    
                                             
   
export function compileEffect(spec: EffectSpec): (ctx: EffectCtx) => readonly GameEvent[] {
  assertHasteShape(spec)                            
  return (ctx) => {
    if (spec.guard && !spec.guard(ctx)) return []             
    if (!canAffordEffect(spec, ctx.state, ctx.selfOid, ctx.controller)) return []              
    const out: GameEvent[] = []
    const c = spec.cost
                                              
    const xp = c?.nonResource?.experience
    if (c?.resource || xp) {
      out.push({
        kind: 'spend', player: ctx.controller, cost: c?.resource ?? {},
        ...(xp ? { experience: xp } : {}),
      })
    }
    if (c?.nonResource?.dormantSelf && ctx.selfOid !== null) {
                                                     
      out.push({ kind: 'statusChange', target: ctx.selfOid, key: 'tapped', value: true })                                      
    }
                                                                              
                                                                           
    let hastePaid = 0
    for (const o of spec.then) {
      if (o.op === 'spawnToken' && o.haste !== undefined && o.ready !== true && hasteHooks !== null) {
        const x = hasteHooks.resolve(ctx.state, ctx.controller, o.spec as TokenSpec, o.haste.key, ctx.chosen, hasteHooks.costTimes(hastePaid))
        if (x.ready) hastePaid++
        out.push(...x.pre, ...emitOp(x.ready ? { ...o, ready: true } : o, ctx))
      } else out.push(...emitOp(o, ctx))
    }
    return out
  }
}
