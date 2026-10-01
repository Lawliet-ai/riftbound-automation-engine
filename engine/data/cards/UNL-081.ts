                                             
                         
                               
                                     
                                           
                                                 
                                                      
                                                               
                                                                                     
                                                              
                                                               
                                                          
                                                          
                                                                                          

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import { isFieldedExceptStandby } from '../../src/state/zones'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { StaticEffect } from '../../src/effects/continuousView'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                                  
import { hasteKeyOf } from './haste-key'                                                       
import { spawnToken, type TokenSpec } from '../../src/state/mutations'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'

export const UNL_081_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{瞬息}}（在我控制者的下个开始阶段开始时，结算得分之前将我摧毁。）\n' +
  '当你打出我时，在此处打出两名“映像”。然后进行一次：它们变为我的复制体。'

                                              
export const MIRROR_TOKEN: TokenSpec = { defId: 'token:映像', baseMight: 0, baseKeywords: [] }                                                                                           

                           
export const SERVITOR_MIRROR_COUNT = 2
                                      
export const UNL_081_HASTE_KEYS = [hasteKeyOf('UNL-081:mirror', 1), hasteKeyOf('UNL-081:mirror', 2)] as const

   
                                                  
                                                                 
   
export function spawnServitorMirrors(
  state: GameState,
  battlefieldZone: ZoneId,
  controller: PlayerId,
  count: number = SERVITOR_MIRROR_COUNT,
): { state: GameState; tokenOids: ObjId[] } {
  let s = state
  const tokenOids: ObjId[] = []
  for (let i = 0; i < count; i++) {
    const r = spawnToken(s, MIRROR_TOKEN, battlefieldZone, controller)
    s = r.state
    tokenOids.push(r.oid)
  }
  return { state: s, tokenOids }
}

                                                                 
export function makeCopyEffect(targetOid: ObjId, sourceOid: ObjId): Omit<StaticEffect, 'timestamp'> {
  return {
    id: `UNL-081-copy:${targetOid}<-${sourceOid}`,
    duration: 'permanent', // 复制随物件存在;映像离场即消亡,无需回合末失效
    fromPassive: true, // 非快照(复制是持续替换,非一次性加减计算)
    predicate: (o) => o.oid === targetOid,
    modification: { kind: 'copyOf', sourceOid }, // §477.1.b.1 特质层复制
  }
}

   
                                           
                                                               
                                                                 
   
export function mirrorsBecomeCopies(
  state: GameState,
  tokenOids: readonly ObjId[],
  sourceOid: ObjId,
  deps: ReduceDeps = {},
): GameState {
  const events: GameEvent[] = tokenOids.map((oid) => ({
    kind: 'addEffect',
    effect: makeCopyEffect(oid, sourceOid),
  }))
                                              
  return applyEvents(state, events, deps).state
}

                                                                  
function mirrorTag(selfOid: ObjId): string {
  return `mirror-of:${selfOid}`
}

   
                                                   
                                                              
                                                
   
export function makeServitorCopyItem(selfOid: ObjId, controller: PlayerId): ChainItem {
  const tag = mirrorTag(selfOid)
  return {
    id: `UNL-081-embed-copy:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    resolve: (state): readonly GameEvent[] =>
      Object.values(state.objects)
        .filter((o) => o.counters[tag] === 1 && isFielded(state, o))                 
        .map((o) => ({ kind: 'addEffect', effect: makeCopyEffect(o.oid, selfOid) })),
  }
}

                                     
function isFielded(state: GameState, o: { zone: ZoneId }): boolean {
  return isFieldedExceptStandby(state.zones[o.zone]?.kind)
}

   
                                                         
                                                        
                                         
   
export function makeServitorPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                    
                                                                 
                                                                      
                                          
                                                   
                                
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] => {
      const state = ctx.state
      const self = state.objects[selfOid]
      if (!self) return []
      const tag = mirrorTag(selfOid)
                                                                        
                                                                                              
      const x1 = spawnTokenHasteResolve(state, controller, MIRROR_TOKEN, UNL_081_HASTE_KEYS[0], ctx.chosen)
      const x2 = spawnTokenHasteResolve(state, controller, MIRROR_TOKEN, UNL_081_HASTE_KEYS[1], ctx.chosen, hasteCostTimes(x1.ready ? 1 : 0))
      return [
        ...x1.pre, ...x2.pre,
        { kind: 'spawnToken', spec: MIRROR_TOKEN, zone: self.zone, owner: controller, tag, ...(x1.ready ? { ready: true } : {}) }, // 映像1
        { kind: 'spawnToken', spec: MIRROR_TOKEN, zone: self.zone, owner: controller, tag, ...(x2.ready ? { ready: true } : {}) }, // 映像2
                                                                                                         
                                                                                   
        { kind: 'enqueueItem', item: makeServitorCopyItem(selfOid, controller) }, // §388.1 内嵌复制触发入链
      ]
    } }],
  })
  return compileTrigger({
    id: 'UNL-081-play', // 编译层拼成 `UNL-081-play:${selfOid}`
    event: 'playUnit',
    by: 'you', // 当【你】打出我时
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」:只写 by:'you' 挡不住队友被打出(第112轮)
                                                                                           
    postChoice: (state, chosen) => state.objects[selfOid] === undefined ? null
      : spawnTokenHasteChoice(state, controller, MIRROR_TOKEN, { itemId: `trig:UNL-081-play:${selfOid}`, key: UNL_081_HASTE_KEYS[0], label: '映像' }, chosen)
        ?? spawnTokenHasteChoice(state, controller, MIRROR_TOKEN, { itemId: `trig:UNL-081-play:${selfOid}`, key: UNL_081_HASTE_KEYS[1], label: '映像' }, chosen, hastePaidSoFar(chosen, [UNL_081_HASTE_KEYS[0]])),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_081: Card = {
  id: 'UNL-081',
  cardNo: 'UNL-081/219',
  name: '赐面守侍',
  category: 'unit',
  domains: ['blue'], // 艾欧尼亚 · 蓝域
  energy: 2,
  power: 1,
  keywords: ['待命', '瞬息'], // §811 待命 + §816 瞬息
  playModes: [{ kind: 'standard' }, { kind: 'hidden' }], // 可标准打出或待命
  abilities: [{ kind: 'triggered', trigger: makeServitorPlayTrigger('SELF' as ObjId, 'SELF' as PlayerId) }],
}
