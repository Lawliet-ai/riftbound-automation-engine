                      
  
                                                     
                                                          
  
                                       
                                                        
                          
                                                  
                                               
                                                           
                                       

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { enemyControlledBattlefields, openBattlefields } from '../../src/state/battlefieldControl'
import { isUnit } from '../../src/state/cardTypes'
import { battleRoleOf } from '../../src/combat/battleRoles'                   
import { resolveImplDefId, variantSiblings } from '../variantAlias'

export const OGN_176_CARD_EFFECT = '你可以选择将我打出到一处开放的战场。'
                                                   
export const OGN_174_CARD_EFFECT = '{{预知}}\n你可以选择将我打出到一处开放的战场。'
export const SFD_093_CARD_EFFECT = '你可以选择将我打出到敌方控制的战场。'
   
                                           
                                                    
                         
                       
                                                              
                                                    
   
   
                                                                                  
                                  
                                  
                                      
                                                        
                                                               
                                                                  
                                                              
   
export const UNL_117_CARD_EFFECT = '{{狩猎2}}（当我征服或据守一处战场时，获得2经验。）\n如果一处战场上的敌方单位落单，则可以将我打出至该战场。\n如果一处战场上的敌方单位落单，则可以将友方单位打出至该战场。'

export const OGN_193_ERRATA = '你可以选择将我打出到一处开放的战场。  \n友方单位可以被打出到开放的战场。'
                                                                                      
                                                                         
                                                                                          
export const OGN_193_CARD_EFFECT = OGN_193_ERRATA

                         
const EXTRA_PLAY_ZONES: Readonly<Record<string, (state: GameState, player: PlayerId) => readonly string[]>> = {
  'OGN-176': (state) => openBattlefields(state),                     // §170.11.c 开放 = 无单位且无人控制
                                                  
                                           
  'SFD-025': (state, player) => myAttackingBattlefields(state, player),
  'SFD-025a': (state, player) => myAttackingBattlefields(state, player),
  'SFD-093': (state, player) => enemyControlledBattlefields(state, player),
                                                    
                                                   
                                                                       
  'OGN-161': (state, player) => enemyControlledBattlefields(state, player),
                                                    
                                            
                                                
                                            
  'OGN-174': (state) => openBattlefields(state),
                                                      
                                             
  'OGN-193': (state) => openBattlefields(state),
                                               
                                                          
                                             
                               
                                                      
                                                      
  'VEN-115': (state) => openBattlefields(state),
                                              
  'UNL-117': (state, player) => lonelyEnemyBattlefields(state, player),
}

   
                                                          
                                   
                                       
  
                                            
                                                    
                                              
                                                 
                                 
                                                      
                                                                     
                                                                    
   
const BOARD_WIDE_EXTRA_PLAY_ZONES: Readonly<Record<string, (state: GameState, player: PlayerId) => readonly string[]>> = {
  'OGN-193': (state, player) => (iControlOnField(state, player, 'OGN-193') ? openBattlefields(state) : []),
                                                  
  'UNL-117': (state, player) => (iControlOnField(state, player, 'UNL-117') ? lonelyEnemyBattlefields(state, player) : []),
}

   
                               
                                                        
                                                      
   
export function lonelyEnemyBattlefields(state: GameState, player: PlayerId): readonly string[] {
  const out: string[] = []
  for (const [zid, z] of Object.entries(state.zones)) {
    if (z?.kind !== 'battlefield') continue
    const byCtrl = new Map<string, number>()
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (o !== undefined && isUnit(o)) byCtrl.set(o.controller, (byCtrl.get(o.controller) ?? 0) + 1)
    }
    for (const [ctrl, n] of byCtrl) {
      if (ctrl !== player && n === 1) { out.push(zid); break }
    }
  }
  return out
}

   
                                            
                                    
                                                
                                         
                                                  
                                                    
                                                 
                                                
   
export function myAttackingBattlefields(state: GameState, player: PlayerId): readonly string[] {
  const out: string[] = []
  for (const [zid, z] of Object.entries(state.zones)) {
    if (z?.kind !== 'battlefield') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (o !== undefined && isUnit(o) && o.controller === player
        && battleRoleOf(o) === 'attacking') { out.push(zid); break }
    }
  }
  return out
}

   
                                      
                                             
                                   
                                                                   
                                                 
                                         
   
function iControlOnField(state: GameState, player: PlayerId, defId: string): boolean {
  const group = new Set(variantSiblings(defId))
  return Object.values(state.objects).some((o) => {
    if (!group.has(o.defId) || o.controller !== player) return false
    const kind = state.zones[o.zone]?.kind
    return kind === 'battlefield' || kind === 'base'
  })
}

                                                                
export function extraPlayZonesFor(state: GameState, player: PlayerId, defId: string): readonly string[] {
                                                  
                                                                 
                                                      
                                                                   
  const own = EXTRA_PLAY_ZONES[resolveImplDefId(defId, (x) => x in EXTRA_PLAY_ZONES)]?.(state, player) ?? []
  const wide = Object.values(BOARD_WIDE_EXTRA_PLAY_ZONES).flatMap((f) => f(state, player))
  return wide.length === 0 ? own : [...new Set([...own, ...wide])]
}

                           
export const BOARD_WIDE_EXTRA_PLAY_ZONE_DEFIDS: readonly string[] = Object.keys(BOARD_WIDE_EXTRA_PLAY_ZONES)

                                                 
export const SFD_025_KEYWORDS: readonly string[] = ['反应', '强攻2']
export const SFD_025_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算，并能打出到你控制的战场。）\n'
  + '{{强攻2}}（如果我是进攻方，则{{S}}+2。）\n'
  + '我可以被打出到你正在进攻的战场。'

export const SFD_025: Card = {
  id: 'SFD-025', cardNo: 'SFD·025/221', name: '雷恩加尔', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [...SFD_025_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可被打出到我正在进攻的战场(EXTRA_PLAY_ZONES)' }],
}
                                         
export const SFD_025A: Card = { ...SFD_025, id: 'SFD-025a', cardNo: 'SFD·025a/221·P' }

                     
export const OGN_161_KEYWORDS: readonly string[] = ['法盾']
export const OGN_161_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我作为法术或技能的目标。）\n'
  + '你可以选择将我打出到敌方控制的战场。'

export const OGN_161: Card = {
  id: 'OGN-161', cardNo: 'OGN·161/298', name: '亡花掠食者', category: 'unit',
  domains: ['orange'], energy: 8, power: 8, keywords: [...OGN_161_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可打出到敌方控制的战场(EXTRA_PLAY_ZONES,与 SFD-093 同判据)' }],
}

export const OGN_176: Card = {
  id: 'OGN-176', cardNo: 'OGN·176/298', name: '鬼祟的水手', category: 'unit',
  domains: ['purple'], energy: 3, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可打出到开放的战场(extraPlayZonesFor)' }],
}
export const SFD_093: Card = {
  id: 'SFD-093', cardNo: 'SFD·093/221', name: '无畏先锋', category: 'unit',
  domains: ['orange'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可打出到敌方控制的战场(extraPlayZonesFor)' }],
}

             
export const OGN_174: Card = {
  id: 'OGN-174', cardNo: 'OGN·174/298', name: '大塞斥候', category: 'unit',
  domains: ['purple'], energy: 6, power: 5, keywords: ['预知'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[预知];可打出到开放的战场(extraPlayZonesFor)' }],
}

                                 
export const OGN_193: Card = {
  id: 'OGN-193', cardNo: 'OGN·193/298', name: '厄运小姐', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我可打出到开放战场;我在场上时友方单位亦可(extraPlayZonesFor 两条轴)' }],
}

                                              
export const UNL_117: Card = {
  id: 'UNL-117', cardNo: 'UNL-117/219', name: '恐怖蛛怪', category: 'unit',
  domains: ['orange'], energy: 6, power: 6, keywords: ['狩猎2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[狩猎2];敌方落单战场:我可打出至该处;我在场上时友方单位亦可(extraPlayZonesFor 两条轴)' }],
}

                      
export const LONGTAIL19_DEFIDS: readonly string[] = ['OGN-176', 'SFD-093', 'OGN-174', 'OGN-193', 'UNL-117', 'SFD-025', 'SFD-025a', 'OGN-161']
export const EXTRA_PLAY_ZONE_DEFIDS: readonly string[] = Object.keys(EXTRA_PLAY_ZONES)
