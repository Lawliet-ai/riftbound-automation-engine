                                 
  
                                    
  
                                                   
                                                                         
                                                          
                                                             
                                                     
                                          
  
                                                                  
                                                                       
                                                   
                                                                
                                       
  
                                                             
                                                               
                  
                                                  
                                                                       
                                                                                       
                                                          

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ObjId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { attachedTo } from '../../src/state/attach'
import { variantSiblings } from '../variantAlias'

                                                            
export function isSpellOrAbilityDamage(ev: GameEvent): ev is GameEvent & { kind: 'damage'; target: ObjId; amount: number } {
  return ev.kind === 'damage' && (ev as { combat?: true }).combat !== true
}

   
                                              
                                                    
                                                                
                                                
                                                                     
                                    
   
export function boostableDamage(ev: GameEvent): ev is GameEvent & { kind: 'damage'; target: ObjId; amount: number } {
                                                       
                                                     
  if ((ev as { fromSplitPool?: boolean }).fromSplitPool === true) return false
  return isSpellOrAbilityDamage(ev) && (ev as { amount: number }).amount > 0
}

                                                               
                                                        
export const OGN_296_CARD_EFFECT = '法术和技能对此处的单位造成的伤害+1（每段伤害都+1）。'

   
                                                 
                                            
                                                 
                                                         
                                              
                                             
                                                    
   
export function makeVoidGateShield(bfZoneId: string): ReplacementShield {
  return {
    id: `OGN-296:${bfZoneId}`,
    source: null,
    controller: null,
    intercepts: 'damage',
    predicate: (ev: GameEvent, state: GameState): boolean => {
      if (!boostableDamage(ev)) return false                           
      const victim = state.objects[ev.target]
      return !!victim && isUnit(victim) && (victim.zone as string) === bfZoneId
    },
    rewrite: (ev: GameEvent): GameEvent =>
      ev.kind === 'damage' ? { ...ev, amount: ev.amount + 1 } : ev,
  }
}

export const OGN_296: Card = {
  id: 'OGN-296', cardNo: 'OGN·296/298', name: '虚空之门', category: 'battlefield',
  domains: ['colorless'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '以此处单位为目标的法术/技能伤害+1(makeVoidGateShield)' }],
}

                                                                
export const OGS_001_CARD_EFFECT = '你的法术和技能造成的伤害+1（每段伤害都+1）。'

   
                                                
                                       
                                    
                                                          
  
                                                          
                                                                 
                                             
                                         
                                                                
   
export function damageOwner(ev: GameEvent, state: GameState): string | undefined {
  if (ev.kind !== 'damage') return undefined
  const e = ev as { sourcePlayer?: string; source?: ObjId }
  if (e.sourcePlayer !== undefined) return e.sourcePlayer
  return e.source !== undefined ? (state.objects[e.source]?.controller as string | undefined) : undefined
}

export function makeAnnieShield(selfOid: string, controller: string): ReplacementShield {
  return {
    id: `OGS-001:${selfOid}`,
    source: selfOid as ObjId,
    controller: controller as never,
    intercepts: 'damage',
    predicate: (ev: GameEvent, state: GameState): boolean =>
      boostableDamage(ev) && damageOwner(ev, state) === controller, // ★863 §715.4 同上
    rewrite: (ev: GameEvent): GameEvent =>
      ev.kind === 'damage' ? { ...ev, amount: ev.amount + 1 } : ev,
  }
}

export const OGS_001: Card = {
  id: 'OGS-001', cardNo: 'OGS·001/024', name: '安妮', category: 'unit', // 英雄单位 → unit
  domains: ['red'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的法术和技能造成的伤害+1(makeAnnieShield)' }],
}

                                                               
export const OGN_032_CARD_EFFECT = '{{横置}}：本回合内你打出的下一个法术造成的伤害+1（每段伤害都+1）。'

   
                                     
                                    
                                           
  
                                     
                                                                     
                                                                        
                                                  
                                                        
                                                                        
                                          
                                      
   
export function makeGrimoireShield(player: string, armedSpellOid: string): ReplacementShield {
  return {
    id: `OGN-032:${player}:${armedSpellOid}`,
    source: armedSpellOid as ObjId,
    controller: player as never,
    intercepts: 'damage',
    predicate: (ev: GameEvent): boolean =>
      boostableDamage(ev) && (ev as { source?: string }).source === armedSpellOid, // ★863 §715.4 同上
    rewrite: (ev: GameEvent): GameEvent =>
      ev.kind === 'damage' ? { ...ev, amount: ev.amount + 1 } : ev,
  }
}

                                        
export const OGN_032_SPEC: ActivatedSpec = {
  key: 'OGN-032:markNextSpell',
  label: '{{横置}}:本回合内你打出的下一个法术造成的伤害+1', // ★896 勘误现行(时限账早已有:spellDamageBonus 回合末清)
  cost: {},
  tapSelf: true,
  target: 'none',
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'grantNextSpellDamage', player: controller } as GameEvent],
}

export const OGN_032: Card = {
  id: 'OGN-032', cardNo: 'OGN·032/298', name: '邪鸦魔典', category: 'equipment',
  domains: ['red'], energy: 3, power: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置]:你打出的下一个法术伤害+1(OGN_032_SPEC)' }],
}

                                                              
                                                               
                                                
               
export const SFD_191_CARD_EFFECT = '你的法术和技能造成的伤害+3（如果已贴附此牌）。'
                      
export const SFD_191_BOOST = 3

   
                                           
                                                             
                                          
                                                                             
                                               
                                                             
                                                                   
                                                    
                                                     
                                                                  
                                                                                   
                                                                                                 
                                                                            
   
export function makeDoomCrownShield(gearOid: string, gearController: string, hostController: string): ReplacementShield {
  return {
    id: `SFD-191:${gearOid}`,
                                                          
                                      
    source: gearOid as ObjId,
    controller: gearController as never,
    intercepts: 'damage',
    predicate: (ev: GameEvent, state: GameState): boolean =>
      boostableDamage(ev) && damageOwner(ev, state) === hostController,
    rewrite: (ev: GameEvent): GameEvent =>
      ev.kind === 'damage' ? { ...ev, amount: ev.amount + SFD_191_BOOST } : ev,
  }
}

                                                               
const DOOM_CROWN_IDS: ReadonlySet<string> = new Set(variantSiblings('SFD-191'))

   
                      
                                                              
   
export function damageBoostShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
                                                            
                                              
  for (const [zid, bc] of Object.entries(state.battlefieldCards ?? {})) {
    if (bc.defId === 'OGN-296') out.push(makeVoidGateShield(zid))
  }
                                                        
  for (const o of Object.values(state.objects)) {
    if (o.defId !== 'OGS-001') continue
    const k = state.zones[o.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') continue
    out.push(makeAnnieShield(o.oid as string, o.controller as string))
  }
                                                        
                                                 
  for (const o of Object.values(state.objects)) {
    if (!DOOM_CROWN_IDS.has(o.defId)) continue
    const hostOid = attachedTo(o)
    if (hostOid === undefined) continue
    const host = state.objects[hostOid]
    if (!host) continue
    const hc = (host.derived?.controller ?? host.controller) as string
    out.push(makeDoomCrownShield(o.oid as string, o.controller as string, hc))
  }
                                              
                                                  
  for (const [player, led] of Object.entries(state.spellDamageBonus ?? {})) {
    if (led.armed !== undefined) out.push(makeGrimoireShield(player, led.armed))
  }
  return out
}

   
                                                                   
                                                  
                                               
                                                         
                                                                      
   
export function splitPoolBoost(
  state: GameState, source: string, sourcePlayer: string, sampleTarget: string | undefined,
): number {
  if (sampleTarget === undefined) return 0
  let ev: GameEvent = { kind: 'damage', target: sampleTarget as ObjId, amount: 1,
    source: source as ObjId, sourcePlayer: sourcePlayer as never } as GameEvent
  for (const sh of damageBoostShields(state)) {
    if (sh.intercepts === 'damage' && sh.predicate(ev, state)) {
      const next = sh.rewrite(ev, state)
      if (next !== null) ev = next
    }
  }
  return ((ev as { amount?: number }).amount ?? 1) - 1
}

             
export const DAMAGE_BOOST_DEFIDS: readonly string[] = ['OGN-296', 'OGS-001', 'OGN-032', 'SFD-191']           

   
                                      
                                       
                                                      
   
export const DAMAGE_BOOST_PENDING: readonly string[] = []
