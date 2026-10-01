                                                                
                                        
                                             
  
                                          
                                           
                                                
                                                                               
                                                          
  
                                                                       
                                                                       
                                                       
                                                   
                                                               
  
                                           
                                                                   
                                                                    
                                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'

export const UNL_045_CARD_EFFECT =
  '{{迅捷>}} 将你控制的一名单位变为休眠状态，{{横置}}：将你控制的另一名单位移动到你因此技能而休眠的单位的所在位置。'

                                                       
export function dormantCostOptions(state: GameState, controller: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && onField(state, o) && o.status.dormant !== true)
    .map((o) => o.oid)
    .sort()
}

                                                
export function movableUnits(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && onField(state, o))
    .map((o) => o.oid as string)
    .sort()
}

export const UNL_045_SPEC: ActivatedSpec = {
  key: 'UNL-045:signpost',
  label: '{{迅捷}} 让一名单位休眠 + {{横置}}:把另一名单位移到它那儿',
  cost: {}, // 冒号前没有资源费 —— 两截都是非资源费
  keywords: ['迅捷'], // {迅捷>} = 这条技能的时机权限(§806)
  tapSelf: true, // 「{横置}」那一截
  extraCost: {
    label: '将你控制的一名单位变为休眠状态',
    options: (state: GameState, controller: PlayerId) =>
      dormantCostOptions(state, controller).map((oid) => ({
        id: oid as string, label: `让 ${state.objects[oid]?.defId ?? oid} 休眠`,
      })),
                                                           
    pay: (state: GameState, controller: PlayerId, _self: string, choice?: string): GameState | null => {
      if (choice === undefined) return null
      const o = state.objects[choice as ObjId]
                                                           
      if (!o || o.controller !== controller || !isUnit(o) || !onField(state, o) || o.status.dormant === true) return null
      return {
        ...state,
        objects: { ...state.objects, [choice]: { ...o, status: { ...o.status, dormant: true } } },
      }
    },
  },
  target: 'custom',
  legalTargets: (state, controller): string[] => movableUnits(state, controller),
  makeResolve: ({ target, extraChoice, controller }) => (state: GameState): readonly GameEvent[] => {
    if (target === undefined || extraChoice === undefined) return []
    const mover = state.objects[target as ObjId]
    const anchor = state.objects[extraChoice as ObjId]                    
    if (!mover || !anchor) return []                   
    if (mover.controller !== controller) return []          
    const to = anchor.zone as string
                                 
                                                         
                                                                    
                                                     
    if ((mover.zone as string) === to) return []
    return [
      { kind: 'zoneChange', obj: mover.oid, to: to as never },
      { kind: 'unitMoved', unit: mover.oid, player: mover.controller, from: mover.zone, to: to as never },
    ] as readonly GameEvent[]
  },
}

export const UNL_045: Card = {
  id: 'UNL-045', cardNo: 'UNL-045/219', name: '被遗忘的路标', category: 'equipment',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[迅捷] 休眠一名单位+横置:把另一名单位移到它那儿(UNL_045_SPEC)' }],
}
