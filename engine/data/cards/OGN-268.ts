                                                                 
                                        
                             
                                                          
  
                                
                                                             
                                                                     
                                                 
                                                                         
                                                 
                                                                            
                                                           
                                                                        
                                                      
                                                                       
                                                                     
  
                 
                                                     
                                                         
                                                                        
                                                            
                                                                 
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { Cost } from '../../src/state/runePool'
import { zonesByKind } from '../../src/state/gameState'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { unitsAtBattlefield } from './battlefields-extra'

export const OGN_268_CARD_EFFECT =
  '支付任意数量的{{A}}，对一处战场上的所有敌方单位造成等同于该数量的伤害。'

                            
export const OGN_268_AMOUNT_KEY = 'barrageAmount'
export const OGN_268_PLACE_KEY = 'barragePlace'

                                                                  
export function barrageCost(n: number): Cost {
  return { pips: Array.from({ length: n }, () => [] as readonly string[]) }
}

   
                                                 
                                            
                                                       
                               
  
                                                            
                                                  
                                                  
                                                            
                                          
                                                              
                                                  
                                                            
                                                         
   
export function maxBarrage(state: GameState, controller: PlayerId): number {
  let n = 0
                                                        
  while (n < 10 && couldPayWithReactionGains(state, controller, barrageCost(n + 1))) n += 1
  return n
}

                                        
export function barragePlaces(state: GameState): string[] {
  return zonesByKind(state, 'battlefield').map((z) => z.id as string)
}

                                                        
export function barrageVictims(state: GameState, bf: string, controller: PlayerId): string[] {
  return unitsAtBattlefield(state, bf)
    .filter((oid) => state.objects[oid]?.controller !== controller)
    .map((oid) => oid as string)
    .sort()
}

export const OGN_268_SPEC: PlaySpec = {
  defId: 'OGN-268', cardNo: 'OGN·268/298', name: '弹幕时间', kind: 'spell',
  cost: { mana: 1 }, // ⚠️ 打出费;上游 pips=0 ⇒ 一枚都不写(与效果里付的 {A} 是两笔账)
  keywords: ['迅捷'], // §806 时机权限(印刷表侧另有一份登记)
  target: 'none', // 两个选择都走问链
  legalTargets: (): string[] => [],
                                                                                                           
                                                                             
                                                   
                                                                                 
                                                      
                                           
  makeConfirmChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (chosen[OGN_268_PLACE_KEY] !== undefined) return null
      const places = barragePlaces(state)
      if (places.length === 0) return null
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: OGN_268_PLACE_KEY,
        prompt: '弹幕时间:轰哪一处战场?',
        isTarget: true, // ★1781 §355.7:「对一处战场上的所有敌方单位造成…伤害」
        candidates: places.map((z) => ({ id: z, label: z })),
      }
    },
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                        
      if (chosen[OGN_268_PLACE_KEY] === undefined) return null
                                              
      if (chosen[OGN_268_AMOUNT_KEY] !== undefined) return null
      const max = maxBarrage(state, controller)
      return {
        itemId: `play:${movedCardOid}`,
        controller,
        key: OGN_268_AMOUNT_KEY,
        prompt: '弹幕时间:支付几枚任意符能?(伤害等同于该数量)',
                                  
        candidates: Array.from({ length: max + 1 }, (_, i) => ({ id: String(i), label: `${i} 枚` })),
      }
    },
  makeResolve: ({ movedCardOid, controller }) => (state, chosen): readonly GameEvent[] => {
    const c = chosen ?? {}
    const n = Number(c[OGN_268_AMOUNT_KEY] ?? '0')
    const bf = c[OGN_268_PLACE_KEY]
    if (!Number.isFinite(n) || n <= 0 || bf === undefined) return []                       
                                                               
                                            
    if (!barragePlaces(state).includes(bf)) return []
                                                   
                                             
    if (!canPayFromState(state, controller, barrageCost(n))) return []
    const victims = barrageVictims(state, bf, controller)
    return [
                               
      { kind: 'spend', player: controller, cost: barrageCost(n) } as GameEvent,
      ...victims.map((oid): GameEvent => ({
        kind: 'damage',
        target: oid as ObjId,
        amount: n, // 「等同于该数量」
        source: movedCardOid as ObjId, // §428.5 这是**法术**造成的伤害
        sourcePlayer: controller,
      } as GameEvent)),
    ]
  },
}

export const OGN_268: Card = {
  id: 'OGN-268', cardNo: 'OGN·268/298', name: '弹幕时间', category: 'spell',
  domains: ['orange', 'purple'], energy: 1, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '付 N 枚{A},对一处战场所有敌方单位各 N 点(OGN_268_SPEC)' }],
}
