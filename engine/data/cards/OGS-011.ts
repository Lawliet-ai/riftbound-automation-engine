                                                                  
                                        
                                      
                           
  
                                                          
                                                                     
                                                            
                                                                 
  
                                                         
                                            
                                                 
  
                            
                               
                                                   
                                     
                                                           
  
                                             
                                                                       
                       
                                                          
                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ObjId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { multiSelectChoice, multiSelectPickedLegal } from '../../src/loop/multiSelect'
import { fieldedUnits } from './activated-batch'
import { moveUnitEvents } from './enemy-move'

export const OGS_011_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n将最多两名友方单位从战场上移动到基地。'

                              
export const OGS_011_PREFIX = 'blinkPick'
                                 
export const OGS_011_MAX = 2

   
                         
                                                                     
                                                
                                                                                 
                                                            
                                                                
                                                          
                                                                             
                                                                             
                                                                     
                                   
                                                             
                                         
   
export function blinkCandidates(state: GameState, controller: PlayerId): string[] {
  return (fieldedUnits(state, { of: controller, friendly: true }) as string[])
    .filter((oid) => state.zones[state.objects[oid as ObjId]!.zone]?.kind === 'battlefield')
}

export const OGS_011_SPEC: PlaySpec = {
  defId: 'OGS-011', cardNo: 'OGS·011/024', name: '闪现', kind: 'spell',
  cost: { mana: 2 },
                                                   
  keywords: ['反应'],
  target: 'none', // 谁被移动是**打出时(确认期)**多选出来的,不在打出动作上锁定(★1800 提前)
  legalTargets: (): string[] => [], // 无打出目标(㊳ `PlaySpec` 要求必填)
  choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.7】「将最多两名友方单位从战场上移动到基地」= 打出时选目标
  firstAskOptional: true, // ★1802c §355.13:卡文「将**最多**两名友方单位…移动到基地」⇒ 含 0
  makeNextChoice: ({ movedCardOid, controller }) => (state, chosen) =>
    multiSelectChoice({
      itemId: `play:${movedCardOid}`,
      controller,
      prefix: OGS_011_PREFIX,
      max: OGS_011_MAX, // ★「最多两名」——问满两个就收口
      prompt: '闪现:把哪名友方单位从战场撤回基地?',
      isTarget: true, // ★1781 §355.7:「将最多两名友方单位从战场上移动到基地」
      candidates: (st) => blinkCandidates(st, controller).map((oid) => ({
        id: oid,
        label: `撤回 ${st.objects[oid as ObjId]?.defId ?? oid}`,
      })),
    })(state, chosen),
                                                                   
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const evs: GameEvent[] = []
                                                                
                                            
    for (const oid of multiSelectPickedLegal(chosen, OGS_011_PREFIX, state,
      (st) => blinkCandidates(st, controller))) {
      const o = state.objects[oid as ObjId]
      if (o === undefined) continue                             
      evs.push(...moveUnitEvents(state, oid, `base:${o.controller}`))
    }
    return evs
  },
}

export const OGS_011: Card = {
  id: 'OGS-011', cardNo: 'OGS·011/024', name: '闪现', category: 'spell',
  domains: ['purple'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '最多两名友方单位从战场撤回基地(OGS_011_SPEC)' }],
}
