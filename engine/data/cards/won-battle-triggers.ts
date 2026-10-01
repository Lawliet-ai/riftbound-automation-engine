                                                                 
                                                               
                                                   
                                                 
                                          
                                                     
  
                            
                                                        
                                                       
                                                                 
                                                                  
                                                           
                                                                  
                                            
  
                 
                                                                
                                                    
                                                           
                                               
                                                     
                                         
                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'

   
                                        
                                            
                                                         
   
export function playerWonBattle(ev: GameEvent, controller: PlayerId): boolean {
  if (ev.kind !== 'battleEnd') return false
  const e = ev as { outcome: string; attacker: PlayerId; defender: PlayerId }
  if (e.outcome === 'attackerWins') return e.attacker === controller
  if (e.outcome === 'defenderWins') return e.defender === controller
  return false                
}

   
                                          
                                                                  
   
export function wonBattle(ev: GameEvent, selfOid: ObjId, controller: PlayerId): boolean {
  if (ev.kind !== 'battleEnd') return false
  const e = ev as { participants: readonly ObjId[] }
  if (!e.participants.includes(selfOid)) return false                     
  return playerWonBattle(ev, controller)
}

export interface WonBattleRow {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly category: 'unit' | 'legend'
  readonly domains: readonly string[]
  readonly cost: Cost
                                          
  readonly energy: number
                       
  readonly power: number
  readonly keywords: readonly string[]
                                              
  readonly scope: 'self' | 'you'
  readonly draw: number
  readonly cardEffect: string
}

                            
export const WON_BATTLE_DRAW = 1

export const WON_BATTLE_ROWS: readonly WonBattleRow[] = [
  {
    defId: 'UNL-114', cardNo: 'UNL-114/219', name: '奈德丽', category: 'unit',
    domains: ['orange'], cost: { mana: 3, pips: [['orange']] }, energy: 3, power: 4,
    keywords: ['伏击'],
    scope: 'self', // 「当**我**赢得一场战斗时」
    draw: WON_BATTLE_DRAW,
    cardEffect: '当我赢得一场战斗时，抽一张牌。',
  },
  {
    defId: 'SFD-185', cardNo: 'SFD·185/221', name: '荣耀行刑官', category: 'legend',
                                                             
    domains: ['red', 'purple'], cost: { mana: 0 }, energy: 0, power: 0,
    keywords: [],
    scope: 'you', // 「当**你**赢得一场战斗时」——它自己不在 participants 里
    draw: WON_BATTLE_DRAW,
    cardEffect: '当你赢得一场战斗时，抽一张牌。',
  },
]

   
                                 
                                                              
   
export function makeWonBattleTrigger(row: WonBattleRow, selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `${row.defId}:wonBattle`,
    event: 'battleEnd',
    by: 'any',
    when: [{
      kind: 'custom',
      test: (ev): boolean => (row.scope === 'self'
        ? wonBattle(ev, selfOid, controller)                
        : playerWonBattle(ev, controller)),  // 「你」:只看我方赢没赢
    }],
    effect: (): readonly GameEvent[] => [
      { kind: 'draw', player: controller, count: row.draw } as GameEvent,
    ],
  }, selfOid, controller)
}

export const WON_BATTLE_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(WON_BATTLE_ROWS.map((r) => [r.defId, (oid: ObjId, ctrl: PlayerId) => [makeWonBattleTrigger(r, oid, ctrl)]]))

export const WON_BATTLE_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(WON_BATTLE_ROWS.map((r) => [r.defId, r.keywords]))

                                                  
export const WON_BATTLE_UNIT_COST: Readonly<Record<string, Cost>> =
  Object.fromEntries(WON_BATTLE_ROWS.map((r) => [r.defId, r.cost]))

export const WON_BATTLE_CARDS: readonly Card[] = WON_BATTLE_ROWS.map((r) => ({
  id: r.defId, cardNo: r.cardNo, name: r.name, category: r.category,
  domains: r.domains, energy: r.energy, power: r.power, keywords: r.keywords,
                                                 
  playModes: r.category === 'legend' ? [] : [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: `${r.cardEffect}(WON_BATTLE_FACTORIES)` }],
}) as Card)
