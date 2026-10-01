                                                           
  
                                                
                                                    
  
                                 
                                                       
                                                              
                                       

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { playerTurnIndex } from '../../src/scoring/score'
import { ven132BansSpell } from './VEN-132'
import { warden070BansUnitPlay } from './OGN-070'

                                      
export const SFD_209_CARD_EFFECT = '每名玩家在各自的第三回合开始前，无法从此处得分。'
export const VEN_029_CARD_EFFECT = '我无法在你的第一、第二或第三个回合中被打出。'

                               
const SCORE_BLOCKS: Readonly<Record<string, (state: GameState, player: PlayerId) => boolean>> = {
                                                 
                                                           
  'SFD-209': (state, player) => playerTurnIndex(state, player) < 3, // 「第三回合开始前」= 严格小于 3
}
                                           
const PLAY_BANS: Readonly<Record<string, (state: GameState, player: PlayerId) => boolean>> = {
                                                          
  'VEN-029': (state, player) => playerTurnIndex(state, player) <= 3,
}

   
                                                   
                                                             
                                             
  
                                    
                                          
                                                
                                            
                                                                                           
                                                                                             
                                                                         
                        
                                                                                            
                                                         
                                                                                                    
                                                                            
                                                                                        
                                                                                                                     
                                   
   
const PLAY_BANS_AT: Readonly<Record<string, (state: GameState, player: PlayerId, to: string) => boolean>> = {
  'SFD-015': (state, player, to) =>
    !(state.conqueredBattlefieldsThisTurn?.[player as string] ?? []).includes(to),
}

   
                                                 
                                          
  
                                        
                                                        
                                                                              
                                                       
                                                         
                                                      
                             
                                              
                                                         
                                                             
                                                        
   
const STANDBY_BANS_DEFID = 'OGN-018'

                                                        
export function battlefieldOfStandby(zone: string): string | undefined {
  const m = /^standby:shared:(\d+)$/.exec(zone)
  return m ? `battlefield:shared:${m[1]}` : undefined
}

                                    
function standbyBanned(state: GameState, player: PlayerId, oid: string | undefined): boolean {
  if (oid === undefined) return false
  const o = state.objects[oid as ObjId]
  if (o === undefined) return false
  const bf = battlefieldOfStandby(o.zone as string)
  if (bf === undefined) return false                    
                                  
  return (state.zones[bf as ZoneId]?.contents ?? []).some((id) => {
    const u = state.objects[id]
    return u !== undefined && u.defId === STANDBY_BANS_DEFID && u.controller !== player
  })
}

export const OGN_018_CARD_EFFECT = '对手的{{待命}}卡牌无法在此处被翻开打出。'

export const OGN_018: Card = {
  id: 'OGN-018', cardNo: 'OGN·018/298', name: '诺克萨斯破坏者', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对手的待命卡牌无法在此处被翻开打出(playBannedFor 第五档)' }],
}

export const SFD_015_CARD_EFFECT = '你只能将我打出到你本回合征服的战场上。'

export const SFD_015: Card = {
  id: 'SFD-015', cardNo: 'SFD·015/221', name: '栖息的冥龙', category: 'unit',
  domains: ['red'], energy: 4, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '只能打出到你本回合征服的战场(playBannedFor)' }],
}

   
                                                         
                                                           
   
   
                                                     
                                                         
                                                                   
                                                              
                                               
  
                                         
                                     
                                                                
                                                      
                                                  
                                                   
   
const UNIT_SCORE_BLOCKS: Readonly<Record<string, (state: GameState, player: PlayerId) => boolean>> = {
  'SFD-060': (state, player) => Object.values(state.objects).some((o) =>
    o.defId === 'SFD-060'
    && state.zones[o.zone]?.kind === 'battlefield'                 
    && o.controller !== player), // 挡的是【对手】
}

                               
export const UNIT_SCORE_BLOCK_DEFIDS: readonly string[] = Object.keys(UNIT_SCORE_BLOCKS)

   
                                                 
  
                                 
                                                 
                                      
  
                                           
                                
                                                                 
                   
                 
                                                     
                                                              
                                             
                                                     
                                             
                                                           
                                                          
   
const UNIT_SCORE_DRAW_INSTEAD: Readonly<Record<string, (state: GameState, player: PlayerId) => boolean>> = {
  'VEN-053': (state, player) => {
                                
    const onField = Object.values(state.objects).some((o) => {
      if (o.defId !== 'VEN-053') return false
      const k = state.zones[o.zone]?.kind
      return k === 'battlefield' || k === 'base'
    })
    if (!onField) return false
                                                       
    const n = playerTurnIndex(state, player)
    return n === 1 || n === 2
  },
}

                              
export const UNIT_SCORE_DRAW_INSTEAD_DEFIDS: readonly string[] = Object.keys(UNIT_SCORE_DRAW_INSTEAD)

                                                 
export function scoreDrawInsteadAt(state: GameState, player: PlayerId, _battlefield: string): boolean {
  for (const f of Object.values(UNIT_SCORE_DRAW_INSTEAD)) if (f(state, player)) return true
  return false
}

export const VEN_053_CARD_EFFECT =
  '如果一名玩家将在其第一或第二个回合期间通过征服或据守获得1分，则改为该玩家抽一张牌。'
export const VEN_053: Card = {
  id: 'VEN-053', cardNo: 'VEN·053', name: '章獭', category: 'unit',
  domains: ['blue'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '各人第1-2回合的征服/据守得分改为抽一张牌(scoreDrawInsteadAt)' }],
}

   
                                                               
                                           
                                                           
                                                      
                                                             
   
export function scoreBlockedAnywhere(state: GameState, player: PlayerId): boolean {
  for (const f of Object.values(UNIT_SCORE_BLOCKS)) if (f(state, player)) return true
  return false
}

export function scoreBlockedAt(state: GameState, player: PlayerId, battlefield: string): boolean {
                                               
  if (scoreBlockedAnywhere(state, player)) return true
  const bc = state.battlefieldCards?.[battlefield]
  if (!bc) return false
  return SCORE_BLOCKS[bc.defId]?.(state, player) === true
}

                                          
const DEST_BANS: Readonly<Record<string, (state: GameState, player: PlayerId) => boolean>> = {
                               
                                                     
                                                                           
                                  
  'SFD-216': () => true,
}

   
                                 
                                                             
                                                         
                                                         
                                                                      
                                                                             
                                                                                     
                                                                                   
                                                                           
                                                                                                  
   
export function playBannedFor(
  state: GameState, player: PlayerId, defId: string, to: string,
                                      
                                          
                                              
                                                  
  oid?: string,
): boolean {
                                                              
                                                       
                                                             
                                        
                                                       
                                                               
  if (state.cannotPlayCardsThisTurn?.includes(player) === true) return true
  if (PLAY_BANS[defId]?.(state, player) === true) return true             
                                                        
                                             
                                                                  
  if (ven132BansSpell(state, player, defId)) return true
                                              
                                                    
  if (warden070BansUnitPlay(state, player, defId, to)) return true
                                              
  if (PLAY_BANS_AT[defId]?.(state, player, to) === true) return true
                                                  
  if (standbyBanned(state, player, oid)) return true
  const bc = state.battlefieldCards?.[to]
  return bc !== undefined && DEST_BANS[bc.defId]?.(state, player) === true               
}

                      
export const PLAY_BAN_AT_DEFIDS: readonly string[] = Object.keys(PLAY_BANS_AT)

export const SFD_216_CARD_EFFECT = '单位无法被打出到此处。'
export const SFD_216: Card = {
  id: 'SFD-216', cardNo: 'SFD·216/221', name: '落岩之径', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '单位无法被打出到此处(playBannedFor)' }],
}

                     
export const SFD_060_KEYWORDS: readonly string[] = ['法盾']
                                                              
export const SFD_060_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n'
  + '如果我位于战场上，则对手无法获得分数。'

export const SFD_060: Card = {
  id: 'SFD-060', cardNo: 'SFD·060/221', name: '缇亚娜·冕卫', category: 'unit',
  domains: ['green'], energy: 7, power: 4, keywords: [...SFD_060_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我在战场上时对手无法得分(UNIT_SCORE_BLOCKS)' }],
}

export const SFD_209: Card = {
  id: 'SFD-209', cardNo: 'SFD·209/221', name: '遗忘丰碑', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '各自第三回合开始前无法从此处得分(scoreBlockedAt)' }],
}
export const VEN_029: Card = {
  id: 'VEN-029', cardNo: 'VEN·029', name: '老老魄罗', category: 'unit',
  domains: ['green'], energy: 2, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的前三个回合内无法被打出(playBannedFor)' }],
}

                                 
export const LONGTAIL12_DEFIDS: readonly string[] = ['SFD-209', 'VEN-029', 'SFD-216', 'OGN-018']
                          
export const STANDBY_BAN_DEFIDS: readonly string[] = [STANDBY_BANS_DEFID]
export const SCORE_BLOCK_DEFIDS: readonly string[] = Object.keys(SCORE_BLOCKS)
export const PLAY_BAN_DEFIDS: readonly string[] = Object.keys(PLAY_BANS)
export const DEST_BAN_DEFIDS: readonly string[] = Object.keys(DEST_BANS)
