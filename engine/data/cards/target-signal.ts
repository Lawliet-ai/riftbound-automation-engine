                                                
  
                                                
                                          
                                          
                                                            
  
                                                
                                                           
                                                                     
                                                
                                                                       
                     
                                              
                                                  

import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import type { GameState } from '../../src/state/gameState'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { pumpEvent } from './activated-batch'

export const SFD_057_CARD_EFFECT = '当你选择我为目标或让我变为活跃状态时，让我本回合内{{S}}+1。'

                                                  
                                              
                                                       
                             
                                                            
                                                 
                                                                                
const bump = (selfOid: ObjId, defId: string): readonly GameEvent[] =>
  [pumpEvent(defId, selfOid as string, 1)]

                                     
export function makeSfd057TargetedTrigger(
  selfOid: ObjId, controller: PlayerId, defId = 'SFD-057',
): Trigger {
  return compileTrigger({
    id: `${defId}-targeted`,
    event: 'targeted', by: 'any',
    when: [{ kind: 'custom', test: (ev): boolean => {
      const e = ev as { chooser?: PlayerId; target?: string }
                              
      return e.chooser === controller && e.target === (selfOid as string)
    } }],
    effect: (): readonly GameEvent[] => bump(selfOid, defId),
  }, selfOid, controller)
}

                                                   
export function makeSfd057ReadyTrigger(
  selfOid: ObjId, controller: PlayerId, defId = 'SFD-057',
): Trigger {
  return compileTrigger({
    id: `${defId}-ready`,
    event: 'statusChange', by: 'any',
    when: [{ kind: 'custom', test: (ev): boolean => {
      const e = ev as { target?: string; key?: string; value?: boolean }
      return e.target === (selfOid as string) && e.key === 'dormant' && e.value === false
    } }],
    effect: (): readonly GameEvent[] => bump(selfOid, defId),
  }, selfOid, controller)
}

                                         
export function makeIreliaTriggers(defId: string): (oid: ObjId, ctrl: PlayerId) => readonly Trigger[] {
  return (oid, ctrl) => [
    makeSfd057TargetedTrigger(oid, ctrl, defId),
    makeSfd057ReadyTrigger(oid, ctrl, defId),
  ]
}

const irelia = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '艾瑞莉娅', category: 'unit',
  domains: ['green'], energy: 5, power: 4, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [],
})
export const SFD_057: Card = irelia('SFD-057', 'SFD·057/221')
                                                               
export const VEN_174: Card = irelia('VEN-174', 'VEN·174')

                      
export const TARGET_SIGNAL_DEFIDS: readonly string[] = ['SFD-057', 'SFD-199', 'VEN-174']

                                                                        
                                                 
                           
  
                                                                 
                         
                                                      
                                                                              
                                                       
                                 
                                                                        
                                                    
export const SFD_199_THRESHOLD = 2

export const SFD_199_CARD_EFFECT =
  '{{横置}}：{{反应}} — 抽一张牌。只有当你在本回合内，两次将敌方单位或装备选为法术或单位技能的目标后，才能使用此技能。'

   
                                                         
                                                           
   
export function enemyTargetedCount(state: GameState, player: PlayerId): number {
  const t = state.enemyTargetedThisTurn?.[player]
  return t === undefined ? 0 : t.spell + t.unitAbility
}

export const SFD_199_ACTIVATED: ActivatedSpec = {
  key: 'SFD-199:scout',
  label: '{{横置}}:抽一张牌(本回合已两次将敌方单位或装备选为目标)',
  cost: {},
  tapSelf: true,
  keywords: ['反应'], // §813 权限轴:可在反应窗口激活
  available: (state: GameState, controller: PlayerId): boolean =>
    enemyTargetedCount(state, controller) >= SFD_199_THRESHOLD,
  makeResolve: ({ controller }: { selfOid: string; controller: PlayerId }) => (): readonly GameEvent[] =>
    [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
}

export const SFD_199: Card = {
  id: 'SFD-199', cardNo: 'SFD·199/221', name: '探险家', category: 'legend',
  domains: ['blue', 'purple'], energy: 0, power: 0, keywords: [], playModes: [], abilities: [],
}
