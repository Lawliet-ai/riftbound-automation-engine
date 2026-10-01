                          
  
                                               
                               
  
                                                     
                                                       
                                                 
                                  
                                                         
                                 
                                           
                                              
                                              
                                                                
                                                    
                                                          
  
                                 
                                                                                    
                                                              
                                                                    
                                                                         
                                                                

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { experienceOf } from '../../src/keywords/level'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import { makeDrawOnPlaySelfTrigger } from './combat-keywords'
import { fieldedUnits, pumpEvent } from './activated-batch'

   
                                          
                                                   
                                               
                                                
   
export function levelTier<T>(
  state: GameState,
  player: PlayerId,
  tiers: readonly (readonly [threshold: number, value: T])[],
): T | undefined {
  for (const [n, v] of tiers) if (levelReached(state, player, n)) return v
  return undefined
}

                                         
export function levelReached(state: GameState, player: PlayerId, n: number): boolean {
  return experienceOf(state, player) >= n
}

                                            
export const selfAtLevel = (n: number) =>
  (o: GameObject, self: GameObject, state: GameState): boolean =>
    o.oid === self.oid && levelReached(state, self.controller, n)

                                                      
export const LEVEL_ENTRY_READY: Readonly<Record<string, number>> = {
  'UNL-016': 3, // 焰爪:等级3 → {S}+1 并以活跃状态进场
  'UNL-151': 3, // 班德尔士兵:等级3 → 只有"以活跃状态进场"这一句
}

export const UNL_016_CARD_EFFECT =
  '{{狩猎2}}（当我征服或据守一处战场时，获得2经验。）\n{{等级3>}} 我获得{{S}}+1，并以活跃状态进场。（如果你拥有不少于3经验，则获得该效果。）'
export const UNL_094_CARD_EFFECT =
  '{{狩猎}}（当我征服或据守一处战场时，获得1经验。）\n{{等级6>}} 我获得{{S}}+1。（如果你拥有不少于6经验，则获得该效果。）'
export const UNL_098_CARD_EFFECT =
  '{{等级11>}} 我获得{{S}}+4。（如果你拥有不少于11经验，则获得该效果。）'
export const UNL_113_CARD_EFFECT =
  '{{狩猎2}}（当我征服或据守一处战场时，获得2经验。）\n{{等级6>}} 我获得{{法盾}}和{{游走}}。（如果你拥有不少于6经验，对手必须支付{{A}}才能将我选作法术或技能的目标，且我可以向其他战场进行移动。）'
export const UNL_047_CARD_EFFECT =
  '{{狩猎2}}（当我征服或据守一处战场时，获得2经验。）\n{{等级3>}} 我获得{{S}}+1和{{法盾}}。（如果你拥有不少于3经验，则获得该效果。对手必须支付{{A}}才能将拥有{{法盾}}的目标选作法术或技能的目标。）'
export const UNL_075_CARD_EFFECT =
  '{{狩猎2}}（当我征服或据守一处战场时，获得2经验。）\n{{等级3>}} 我获得{{S}}+1和{{游走}}。（如果你拥有不少于3经验，则获得该效果。拥有{{游走}}的单位可以向其他战场进行移动。）'
export const UNL_151_CARD_EFFECT =
  '{{等级3>}} 我以活跃状态进场。（如果你拥有不少于3经验，则获得该效果。）'

export const UNL_016: Card = {
  id: 'UNL-016', cardNo: 'UNL-016/219', name: '焰爪', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: ['狩猎2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级3:我+1 并活跃进场(GROUP_PASSIVES + ENTER_READY)' }],
}
export const UNL_094: Card = {
  id: 'UNL-094', cardNo: 'UNL-094/219', name: '晶手猎人', category: 'unit',
  domains: ['orange'], energy: 2, power: 2, keywords: ['狩猎'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级6:我+1(GROUP_PASSIVES)' }],
}
export const UNL_098: Card = {
  id: 'UNL-098', cardNo: 'UNL-098/219', name: '巨神峰先知', category: 'unit',
  domains: ['orange'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级11:我+4(GROUP_PASSIVES)' }],
}
export const UNL_113: Card = {
  id: 'UNL-113', cardNo: 'UNL-113/219', name: '易', category: 'unit', // 英雄单位 → unit
  domains: ['orange'], energy: 4, power: 4, keywords: ['狩猎2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级6:我获得[法盾]与[游走](GROUP_PASSIVES)' }],
}
export const UNL_151: Card = {
  id: 'UNL-151', cardNo: 'UNL-151/219', name: '班德尔士兵', category: 'unit',
  domains: ['yellow'], energy: 4, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级3:我以活跃状态进场(ENTER_READY)' }],
}

                                                 
        
                          
                              
                               
                            
                                                       
                                                                 
                                                                        
export const UNL_059_CARD_EFFECT =
  '{{等级3>}} 我的费用减少{{2}}和{{绿色}}。（如果你拥有不少于3经验，则获得该效果。）\n{{等级6>}} 改为我的费用减少{{4}}和{{绿色}}{{绿色}}。\n{{等级11>}} 改为我的费用减少{{6}}和{{绿色}}{{绿色}}{{绿色}}。\n{{等级16>}} 我无法被敌方法术和技能选作目标。'

                                                           
export function yiCostTier(state: GameState, player: PlayerId): { mana: number; pips: number; tag: string } | undefined {
  return levelTier(state, player, [
    [11, { mana: 6, pips: 3, tag: '等级11' }],
    [6, { mana: 4, pips: 2, tag: '等级6' }],
    [3, { mana: 2, pips: 1, tag: '等级3' }],
  ])
}

export const UNL_059: Card = {
  id: 'UNL-059', cardNo: 'UNL-059/219', name: '易', category: 'unit', // 英雄单位 → unit
  domains: ['green'], energy: 12, power: 12, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级3/6/11 三档减费(yiCostTier);等级16 敌方不可选我(GROUP_PASSIVES)' }],
}

                                                              
                                               
export const SFD_105_CARD_EFFECT = '敌方法术和技能无法将我选作目标。'
export const SFD_105: Card = {
  id: 'SFD-105', cardNo: 'SFD·105/221', name: '沙墟啸匪', category: 'unit',
  domains: ['orange'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '敌方法术和技能无法将我选作目标(GROUP_PASSIVES)' }],
}

                                                  
                                                         
                                                                          
                                            
                                                         
export const UNL_031_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n让一名单位在本回合内{{S}}+1。\n{{等级6>}} 改为让其本回合内{{S}}+3。（如果你拥有不少于6经验，则获得该效果。）'

                                          
export function combatExperienceDelta(state: GameState, player: PlayerId): number {
  return levelTier(state, player, [[6, 3]]) ?? 1
}

export const UNL_031_SPEC: PlaySpec = {
  defId: 'UNL-031', cardNo: 'UNL-031/219', name: '实战经验',
  kind: 'spell',
  cost: { mana: 1 }, // 1费 0pip(绿)
  keywords: ['反应'],
  target: 'enemyUnit', // 语义=场上任意单位(PlayTargetKind 暂无泛'unit',与罡风 OGN-169 同款取舍)
  legalTargets: (state) => fieldedUnits(state) as string[],
  makeResolve:
    ({ target, controller }) =>
    (state, _chosen, self): readonly GameEvent[] => {
      const t = (self?.rechoice?.target ?? target) as string | undefined
      if (t === undefined) return []
                                  
      return [pumpEvent(`UNL-031:${t}`, t, combatExperienceDelta(state, controller))]
    },
}
export const UNL_031: Card = {
  id: 'UNL-031', cardNo: 'UNL-031/219', name: '实战经验', category: 'spell',
  domains: ['green'], energy: 1, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '让一名单位本回合+1;等级6 改为 +3(UNL_031_SPEC)' }],
}

                                                
                                 
                                
                                                    
                                                                                  
                                                          
                              
                                                      
export function makeApprenticeDrawTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeDrawOnPlaySelfTrigger(
    'UNL-040-draw', selfOid, controller,
    (state) => levelReached(state, controller, 6),
  )
}

export const UNL_040_CARD_EFFECT =
  '{{狩猎}}（当我征服或据守一处战场时，获得1经验。）\n{{等级6>}} 当你打出我时，抽一张牌。（如果你拥有不少于6经验，则获得该效果。）'
export const UNL_040: Card = {
  id: 'UNL-040', cardNo: 'UNL-040/219', name: '无极学徒', category: 'unit',
  domains: ['green'], energy: 2, power: 2, keywords: ['狩猎'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '等级6:打出我时抽一张(makeApprenticeDrawTrigger)' }],
}

                                                 
const lizardFox = (id: string, cardNo: string, name: string, domain: 'green' | 'blue', desc: string): Card => ({
  id, cardNo, name, category: 'unit',
  domains: [domain], energy: 3, power: 3, keywords: ['狩猎2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: desc }],
})
export const UNL_047: Card = lizardFox('UNL-047', 'UNL-047/219', '踏苔蜥', 'green', '等级3:我+1 并获得[法盾](GROUP_PASSIVES)')
export const UNL_075: Card = lizardFox('UNL-075', 'UNL-075/219', '风行狐', 'blue', '等级3:我+1 并获得[游走](GROUP_PASSIVES)')

             
export const LEVEL_SELF_DEFIDS: readonly string[] =
  ['UNL-016', 'UNL-031', 'UNL-040', 'UNL-047', 'UNL-059', 'UNL-075', 'UNL-094', 'UNL-098', 'UNL-113', 'UNL-151']
