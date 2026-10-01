                                                                  
                                               
                                                        
  
                                                     
  
                                       
                                                                
                                                
                                                                                   
                                                   
                                    
                                                              
                                                    
                                                                 
                                          
                                                    
                                                                 
                                                                         
                                                                                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { EffectCtx } from '../../src/dsl/effectSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { onField } from './activated-batch2'
import { SHADOW_CLONE_TOKEN } from './shadow-clone'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       

export const VEN_112_CARD_EFFECT =
  '当我征服一处战场时，打出一名0{{S}}的“影分身”到你的基地。\n' +
  '{{迅捷>}}{{1}}{{紫色}}：将我和一名受你控制的“影分身”互相移动到对方的位置。'

                                                                                    
function conqueredHere(state: GameState, selfOid: ObjId, ev: GameEvent): boolean {
  if (ev.kind !== 'conquer') return false
  const me = state.objects[selfOid]
  return !!me && (me.zone as string) === (ev as unknown as { battlefield: string }).battlefield
    && me.controller === (ev as unknown as { player: PlayerId }).player
}

                                
export const VEN_112_HASTE_KEY = hasteKeyOf('VEN-112:clone')

                                            
export function makeZedConquerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] => {
      const x = spawnTokenHasteResolve(ctx.state, ctx.controller, SHADOW_CLONE_TOKEN, VEN_112_HASTE_KEY, ctx.chosen)                                                            
      return [...x.pre, {
        kind: 'spawnToken', spec: SHADOW_CLONE_TOKEN as never,
                                                               
        zone: `base:${ctx.controller}` as never, owner: ctx.controller, ...(x.ready ? { ready: true } : {}),
      } as GameEvent]
    } }],
  })
  return compileTrigger({
    id: `VEN-112:conquer:${selfOid}`,
    rawId: true, // id 已自带 selfOid
    event: 'conquer',
    by: 'you',
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => conqueredHere(state, selfOid, ev) }],
                                                        
    postChoice: (state, chosen) => spawnTokenHasteChoice(state, controller, SHADOW_CLONE_TOKEN, { itemId: `trig:VEN-112:conquer:${selfOid}`, key: VEN_112_HASTE_KEY, label: '影分身' }, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                   
export function ownShadowClones(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.defId === SHADOW_CLONE_TOKEN.defId && o.controller === controller && onField(state, o))
    .map((o) => o.oid as string)
    .sort()
}

                                                 
export const VEN_112_SPEC: ActivatedSpec = {
  key: 'VEN-112:swap',
  label: '{{迅捷}} 支付 1 法力和 1 点混沌符能:我与一名影分身互换位置',
  cost: { mana: 1, pips: [['purple']] }, // 冒号前的资源费(与打出费 5 是两笔账)
  keywords: ['迅捷'], // {迅捷>} = 这条技能的时机权限(§806)
  target: 'custom',
  legalTargets: (state, controller): string[] => ownShadowClones(state, controller),
  makeResolve: ({ selfOid, target }) => (state: GameState): readonly GameEvent[] => {
    const me = state.objects[selfOid as ObjId]
    const clone = target === undefined ? undefined : state.objects[target as ObjId]
    if (!me || !clone) return []                      
    if ((me.zone as string) === (clone.zone as string)) return []                              
                                                    
                                             
    const here = me.zone as string
    const there = clone.zone as string
    return [
      { kind: 'zoneChange', obj: me.oid, to: there as never },
      { kind: 'unitMoved', unit: me.oid, player: me.controller, from: here as never, to: there as never },
      { kind: 'zoneChange', obj: clone.oid, to: here as never },
      { kind: 'unitMoved', unit: clone.oid, player: clone.controller, from: there as never, to: here as never },
    ] as readonly GameEvent[]
  },
}

export const VEN_112: Card = {
  id: 'VEN-112', cardNo: 'VEN·112', name: '劫 - 禁忌之影', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '征服时出一只影分身到基地;[迅捷]付{1}{紫}与影分身互换位置(VEN_112_SPEC)' }],
}
