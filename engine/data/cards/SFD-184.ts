                                                                      
                                        
                             
                                           
                                        
                                                              
  
                                
                                                          
                                                
                                                             
                                                                  
                                           
                                                                               
                                                                             
                                                                       
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { fieldedUnits } from './activated-batch'
import { askMoveDestination, moveUnitEvents } from './enemy-move'
import { scoredHere } from './scored-here'
import { isEquipment } from '../../src/state/cardTypes'
import { attachedTo } from '../../src/state/attach'

export const SFD_184_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n移动一名友方单位。你可以选择为其贴附其控制者的最多一件武装。在本回合内，该单位拥有“当我征服一处战场时，你可以选择将我移动到我的基地”。'

export const SFD_184_DEST_KEY = 'pursuitDest'
export const SFD_184_GEAR_KEY = 'pursuitGear'
const SKIP = '__skip__'

                                                   
export function armamentCands184(state: GameState, targetOid: string): readonly string[] {
  const t = state.objects[targetOid as ObjId]
  if (t === undefined) return []
  return Object.values(state.objects)
    .filter((o) => isEquipment(o) && o.controller === t.controller
      && attachedTo(o) !== undefined && attachedTo(o) !== t.oid)
    .map((o) => o.oid as string)
}

export const SFD_184_SPEC: PlaySpec = {
  defId: 'SFD-184', cardNo: 'SFD·184/221', name: '冷酷追击', kind: 'spell',
  cost: { mana: 2, pips: [['red', 'orange']] },
  keywords: ['迅捷'], // ★时机权限写在 spec 上;印刷表侧另有一份登记(②)
  target: 'custom',
  legalTargets: (state, controller): string[] =>
    fieldedUnits(state, { of: controller, friendly: true }) as string[],
                                                                                     
                                                                          
                                                                                 
                                                                  
  choiceTiming: 'confirm',
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen) => {
    const destReq = askMoveDestination({
      state, chosen: chosen ?? {}, key: SFD_184_DEST_KEY, itemId: `play:${movedCardOid}`, controller, target,
      prompt: '冷酷追击:把这名友方单位移动到哪里?',
    })
    if (destReq) return destReq
                                          
    if (target !== undefined && (chosen ?? {})[SFD_184_GEAR_KEY] === undefined) {
      const cands = armamentCands184(state, target)
      if (cands.length > 0) {
        return { itemId: `play:${movedCardOid}`, controller, key: SFD_184_GEAR_KEY,
          prompt: '冷酷追击:为其贴附其控制者的哪件武装?(最多一件)',
          isTarget: true, // ★1782 为其贴附其控制者的一件武装
          candidates: [
            ...cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 贴附` })),
            { id: SKIP, label: '不贴' },
          ] }
      }
    }
    return null
  },
  makeResolve: ({ target, controller }) => (state, chosen): readonly GameEvent[] => {
    if (target === undefined) return []
    const o = state.objects[target as ObjId]
    if (o === undefined) return []
    const gear = (chosen ?? {})[SFD_184_GEAR_KEY]
    return [
                                                       
      ...moveUnitEvents(state, target, (chosen ?? {})[SFD_184_DEST_KEY]),
                                                                                  
                                                                   
      ...(gear !== undefined && gear !== SKIP && armamentCands184(state, target).includes(gear)
        ? [{ kind: 'attach', obj: gear as ObjId, to: o.oid, player: controller } as GameEvent]
        : []),
                                              
      { kind: 'grantConquerReturn', unit: o.oid } as GameEvent,
    ]
  },
}

   
                                       
                                                                       
                                    
                                                                                          
   
export function makeConquerReturn184Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-184grant:${selfOid}`, rawId: true,
    sourceDefId: 'SFD-184',
    event: 'conquer', by: 'you',
    mayChoose: true,
    when: [{ kind: 'custom', test: (ev, state) => scoredHere(state, selfOid, ev, ['conquer']) }],
    effect: (state): readonly GameEvent[] => {
      const o = state.objects[selfOid]
      if (o === undefined) return []
      return moveUnitEvents(state, selfOid as string, `base:${o.controller}`)
    },
  }, selfOid, controller)
}

export const SFD_184: Card = {
  id: 'SFD-184', cardNo: 'SFD·184/221', name: '冷酷追击', category: 'spell',
  domains: ['red', 'orange'], energy: 2, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动友方单位+可贴其控制者一件武装+本回合授予「征服可移回基地」(SFD_184_SPEC+grantedConquerReturnThisTurn)' }],
}
