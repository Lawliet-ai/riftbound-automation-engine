                                                   
  
                                               
                                          
                                         
                                   
  
                                                  
                                         
                                                   
                                                                      
                                      
                                                                                  
  
                                                         
                                                                          
                                                            
                                                
                                                           
                                         
                                                
                                                                     

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { isTappedRune } from './tapped-runes'
import { objectHasCardTag } from '../cardTagQuery'
import { activateEvent } from './longtail-7'
import { GOLD_TOKEN } from './gear-triggers'                                   

                                                              
export const UNL_104_CARD_EFFECT = '当你打出我或其他“龙”属性单位时，让最多两枚符文变为活跃状态。'
                          
export const UNL_104_MAX = 2
const UNL_104_PREFIX = 'gemDragonRune'
export const DRAGON_TAG = '龙'

   
                     
                                                        
                                                           
                                   
                                                               
                                   
   
export function isDragonUnitPlay(state: GameState, unitOid: string | undefined): boolean {
  if (unitOid === undefined) return false
  const o = state.objects[unitOid as ObjId]
  return o !== undefined && objectHasCardTag(o, DRAGON_TAG)                       
}

                                             
export function tappedRunes(state: GameState): string[] {
  return Object.values(state.objects)
    .filter((o) => isTappedRune(o))                               
    .map((o) => o.oid as string)
    .sort()
}

export function makeUnl104PlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        multiSelectPicked(ctx.chosen, UNL_104_PREFIX)
          .slice(0, UNL_104_MAX)
          .map((oid) => ctx.state.objects[oid as ObjId])
          .map((o) => (o === undefined ? null : activateEvent(o)))
          .filter((e): e is GameEvent => e !== null),
    }],
  })
  return compileTrigger({
    id: 'UNL-104-runes',
    event: 'playUnit',
    by: 'you', // 「当【你】打出…时」——打出单位走批次 actor
    when: [{
      kind: 'custom',
      test: (ev, state): boolean => isDragonUnitPlay(state, (ev as { unit?: string }).unit),
    }],
                                                                   
    nextChoice: (state, _ev, chosen) => multiSelectChoice({
      itemId: `trig:UNL-104:${selfOid}`,
      controller,
      prefix: UNL_104_PREFIX,
      prompt: '温驯的宝石龙:让最多两枚符文变为活跃状态(可不选)',
      isTarget: true, // ★1782 让最多两枚符文变为活跃状态
      doneLabel: '够了,不再选',
      max: UNL_104_MAX,
      candidates: (st) => tappedRunes(st).map((oid) => ({
        id: oid,
        label: st.objects[oid as ObjId]?.defId ?? oid,
      })),
    })(state, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_104: Card = {
  id: 'UNL-104', cardNo: 'UNL-104/219', name: '温驯的宝石龙', category: 'unit',
  domains: ['orange'], energy: 8, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出龙属性单位时最多让两枚符文变活跃(makeUnl104PlayTrigger)' }],
}

                                                               
export const SFD_130_CARD_EFFECT = '每当我移动时，打出一个休眠的“金币”装备指示物。'

export function makeSfd130MoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'spawnToken', spec: GOLD_TOKEN,
      zone: (ctx) => `base:${ctx.controller}`, dormant: true, // 「【休眠的】金币装备指示物」
    }],
  })
  return compileTrigger({
    id: 'SFD-130-gold',
    event: 'unitMoved',
    by: 'any', // 效果驱动的移动里 actor 可能是对手;是不是「我」由 subjectIsSelf 判
    when: [{ kind: 'subjectIsSelf' }], // 「每当【我】移动时」
                                                   
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_130: Card = {
  id: 'SFD-130', cardNo: 'SFD·130/221', name: '寻宝猎人', category: 'unit',
  domains: ['purple'], energy: 2, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我移动时打出一个休眠金币指示物(makeSfd130MoveTrigger)' }],
}

             
export const LONGTAIL36_DEFIDS: readonly string[] = ['UNL-104', 'SFD-130']
