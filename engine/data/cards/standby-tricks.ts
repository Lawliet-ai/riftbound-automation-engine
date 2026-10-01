                                     
                                                            
                                                         
                                                      
                                                              
                                                                 
                                                  
                                                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { effectiveMight } from '../../src/state/might'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                                   
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                                                                                                      
                                                                                   
                                            
export const OGN_199_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当你打出我时，你可以选择一名在其他位置受你控制的单位。把我移动到其所在位置，将其移动到我原来的位置。'
                                                                                                                        
export const SFD_145_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n让同一处战场上的两名单位在本回合内战力互换。'
export const OGN_264_CARD_EFFECT =
  '让最多两张{{待命}}卡牌从废牌堆里返回你的手牌。在本回合内，你可以无视费用地正面朝下布置待命卡牌。'
export const OGN_183_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n查看你主牌堆顶部的三张牌。选择其中一张加入手牌，并回收其余的卡牌。'
export const UNL_125_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n弃置一张手牌，然后抽两张牌。'

                                        
function friendliesElsewhere(state: GameState, controller: PlayerId, myZone: string): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if ((z.kind !== 'battlefield' && z.kind !== 'base') || z.id === myZone) continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                         
                                
      if (o && o.controller === controller && isUnitDefId(o.defId) && isUnit(o)) out.push(oid)
    }
  }
  return out
}

                            
export function makeTideTurnerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                       
                                             
                                                           
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: ({ state, chosen }): readonly GameEvent[] => {
        const t = chosen['swap']
        if (!t) return []                                               
        const me = state.objects[selfOid]
        const other = state.objects[t]
        if (!me || !other) return []
                                                  
                                                    
                                                      
                                              
        const myZone = me.zone
        const otherZone = other.zone
        return [
          { kind: 'zoneChange', obj: selfOid, to: otherZone as never }, // 我→其所在位置
          { kind: 'zoneChange', obj: t as never, to: myZone as never }, // 其→我原来的位置
          { kind: 'unitMoved', unit: selfOid, player: controller, from: myZone as never, to: otherZone as never },
          { kind: 'unitMoved', unit: t as never, player: controller, from: otherZone as never, to: myZone as never },
        ]
      },
    }],
  })
  return compileTrigger({
    id: 'OGN-199-swap',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」
                                               
                                                        
                                                      
                                       
                                                   
                                                 
                                                                
                                                                 
                                                                            
    mayChoose: true,
    nextChoice: (state, _ev, chosen) => {
      if (chosen['swap'] !== undefined) return null
      const me = state.objects[selfOid]
      if (!me) return null
      const cands = friendliesElsewhere(state, controller, me.zone).map((oid) => ({ id: oid, label: `与 ${state.objects[oid]?.defId ?? oid} 互换位置` }))
      if (cands.length === 0) return null
      return { itemId: `trig:OGN-199-swap:${selfOid}`, controller, key: 'swap', prompt: '控潮者:可与另一处位置一名己方单位互换位置', candidates: cands,
        isTarget: true, // ★1782 选择受你控制的一名单位
        }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_199: Card = {
  id: 'OGN-199', cardNo: 'OGN·199/298', name: '控潮者', category: 'unit', domains: ['purple'],
  energy: 2, power: 2, keywords: ['待命'], playModes: [{ kind: 'standard' }, { kind: 'hidden' }],
  abilities: [{ kind: 'passive', describe: '打出时可与另一处己方单位换位(makeTideTurnerTrigger)' }],
}
export const SFD_145: Card = {
  id: 'SFD-145', cardNo: 'SFD·145/221', name: '换换乐', category: 'spell', domains: ['purple'],
  energy: 2, keywords: ['待命', '迅捷'], playModes: [{ kind: 'standard' }, { kind: 'hidden' }],
  abilities: [{ kind: 'passive', describe: '同战场两单位本回合战力互换(PlaySpec)' }],
}
export const OGN_264: Card = {
  id: 'OGN-264', cardNo: 'OGN·264/298', name: '游击战', category: 'spell', domains: ['blue', 'purple'],
  energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '废堆待命卡≤2返手+本回合免费布置(PlaySpec)' }],
}
export const OGN_183: Card = {
  id: 'OGN-183', cardNo: 'OGN·183/298', name: '卡牌骗术', category: 'spell', domains: ['purple'],
  energy: 1, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '看顶3取1回收其余(PlaySpec)' }],
}
export const UNL_125: Card = {
  id: 'UNL-125', cardNo: 'UNL-125/219', name: '月神恩赐', category: 'spell', domains: ['purple'],
  energy: 3, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '弃1然后抽2(PlaySpec)' }],
}

                                   
export function sameBfPairs(state: GameState): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield') continue
                                                               
                                                        
    const units = z.contents.filter((oid) => { const o = state.objects[oid]; return o && isUnitDefId(o.defId) && isUnit(o) })
    for (let i = 0; i < units.length; i++)
      for (let j = i + 1; j < units.length; j++) {
                                                                 
                                                               
                                                              
        const a = units[i]!
        const b = units[j]!
        out.push(a < b ? `swap:${a}:${b}` : `swap:${b}:${a}`)
      }
  }
  return out
}

                     
export function standbyCardsInDiscard(state: GameState, player: PlayerId, hasStandby: (defId: string) => boolean): string[] {
  const z = state.zones[`discard:${player}`]
  if (!z) return []
  return z.contents.filter((oid) => { const o = state.objects[oid]; return o && hasStandby(o.defId) })
}
