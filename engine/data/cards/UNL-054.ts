                                                                      
                                        
                                               
  
                                              
                                                                           
                                                                                
  
                    
                                                                    
                                                  
                                                     
                                                      
                                                                      
                                                        
  
                           
                                                      
                                                            
                                       
                                                         
                                    
  
                                                                                               
                                                                                    
                                                                                  
                                                                 
  
                                                   
                                                          
                                                        
                                                                      
                                         
                                                                                 
                                              
                                                                                    
                                              
                                                               
                                                            
                                                                           
                                                                                 
                                                            
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChainItem } from '../../src/loop/chain'                            
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { zonesByKind } from '../../src/state/gameState'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { enemyUnitsOnField, moveUnitEvents } from './enemy-move'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { addCosts, type Cost } from '../../src/state/runePool'
import { PATROL_SURCHARGE, patrolTaxApplies } from './UNL-163'                    
import { referencedMight, totalReferencedMight } from './might-common'
import { groupSubsetChoice, groupSubsetApplied, controllerAtResolve, type GroupTargetSpec } from '../../src/loop/groupTargets'                                              

export const UNL_054_CARD_EFFECT =
  '移动任意数量的敌方单位到同一位置，这些单位的控制者必须相同且总计战力不超过 8。'

                 
export const UNL_054_PREFIX = 'tentaclePick'
                 
export const UNL_054_DEST_KEY = 'tentacleDest'
                                      
export const UNL_054_LIMIT = 8

   
                                                        
   
export function tentacleMemberOk(state: GameState, controller: PlayerId, oid: string): boolean {
  return enemyUnitsOnField(state, controller).includes(oid)
}

   
                                                  
                                                                            
                                                             
                                                  
   
export function tentacleGroupOk(state: GameState, sub: readonly string[]): boolean {
  if (sub.length === 0) return true                    
  const ctrls = sub.map((o) => state.objects[o as ObjId]?.controller)
  const allSame = ctrls.every((c) => c !== undefined && c === ctrls[0])
  return allSame && totalReferencedMight(state, sub) <= UNL_054_LIMIT
}

   
                                            
                                                           
   
export function tentacleCandidates(
  state: GameState, controller: PlayerId, picked: readonly string[],
): string[] {
  return enemyUnitsOnField(state, controller)
    .filter((oid) => !picked.includes(oid))
    .filter((oid) => tentacleGroupOk(state, [...picked, oid]))
}

                                                                    
function tentacleSpec(
  itemId: string, controller: PlayerId, source: Readonly<Record<string, string>>,
): GroupTargetSpec {
  return {
    itemId, controller, groupKey: 'tentacle',
    initial: multiSelectPicked(source, UNL_054_PREFIX),
    memberLegal: (st, o) => tentacleMemberOk(st, controller, o),
    groupOk: tentacleGroupOk,
    prompt: '顽皮触手:这些目标已不再整体满足限制(控制者不同，或总计战力超过 8)——从最初选定的敌方单位里挑一个合法子集',
    label: (st, o) => `${st.objects[o as ObjId]?.defId ?? o}(战力 ${referencedMight(st, o)})`,
  }
}

   
                                 
                                                   
   
export function tentacleDestinations(state: GameState, picked: readonly string[]): string[] {
  const owner = state.objects[picked[0] as ObjId]?.controller
  if (owner === undefined) return []
  return [`base:${owner}`, ...zonesByKind(state, 'battlefield').map((z) => z.id as string)]
}

                                       
export const UNL_054_PATROL_PAY = 'patrolPay:'

   
                                                      
                                                  
                                       
   
function patrolPayChoice(
  state: GameState, controller: PlayerId, itemId: string,
  picked: readonly string[], to: string, chosen: Readonly<Record<string, string>>,
): { itemId: string; controller: PlayerId; key: string; prompt: string; candidates: { id: string; label: string }[] } | null {
  if (!patrolTaxApplies(state, controller, to)) return null
  let committed: Cost = { mana: 0 }
  for (let i = 1; i < picked.length; i++) { // 「除第一名单位外的每名」= 从第二名起
    const oid = picked[i]!
    const key = `${UNL_054_PATROL_PAY}${oid}`
    const prior = chosen[key]
    if (prior !== undefined) {
      if (prior === 'yes') committed = addCosts(committed, PATROL_SURCHARGE)
      continue
    }
                                                               
                                                       
                                                          
                                             
                                                                
                                                            
                                                                
                                                 
    if (!couldPayWithReactionGains(state, controller, addCosts(committed, PATROL_SURCHARGE))) continue         
    return {
      itemId, controller, key,
      prompt: `搜魔人巡管:为第 ${i + 1} 名(${state.objects[oid as ObjId]?.defId ?? oid})额外支付 1 点任意符能?(不付则该名不移动)`,
      candidates: [{ id: 'yes', label: '支付 1 点任意符能' }, { id: 'no', label: '不付(该名不移动)' }],
    }
  }
  return null
}

export const UNL_054_SPEC: PlaySpec = {
  defId: 'UNL-054', cardNo: 'UNL-054/219', name: '顽皮触手', kind: 'spell',
  cost: { mana: 4, pips: [['green']] },
  keywords: [],
  target: 'none', // 选谁、去哪都是问链问出来的
  legalTargets: (): string[] => [],
                                                                   
                                                         
                                              
                                 
                                                                        
                                                      
                                                                      
  firstAskOptional: true, // §355.13:「任意数量」含 0 ⇒ 无目标也能打出
                                                                                                     
                                                                         
                                                         
                                                                                     
                                                    
                                             
  makeConfirmChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      const itemId = `play:${movedCardOid}`
                                          
      const pick = multiSelectChoice({
        itemId, controller, prefix: UNL_054_PREFIX,
        prompt: `顽皮触手:移动哪些敌方单位?(同一控制者,总计战力不超过 ${UNL_054_LIMIT})`,
        isTarget: true, // ★1782 将任意数量的敌方单位移动到同一位置
        candidates: (st, picked) => tentacleCandidates(st, controller, picked).map((oid) => ({
          id: oid,
          label: `${st.objects[oid as ObjId]?.defId ?? oid}(战力 ${referencedMight(st, oid)})`,
        })),
      })(state, chosen)
      if (pick) return pick
                                 
      const picked = multiSelectPicked(chosen, UNL_054_PREFIX)
                                                                     
                                                                       
                                                     
      if (picked.length === 0) return null
                                               
      if (chosen[UNL_054_DEST_KEY] !== undefined) return null
      const dests = tentacleDestinations(state, picked)
      if (dests.length === 0) return null
      return {
        itemId, controller, key: UNL_054_DEST_KEY,
        prompt: '顽皮触手:把它们全都移动到哪一处位置?',
        candidates: dests.map((z) => ({ id: z, label: z })),
      }
    },
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      const picked = multiSelectPicked(chosen, UNL_054_PREFIX)
      if (picked.length === 0) return null
      const dest = chosen[UNL_054_DEST_KEY]
                                        
      if (dest === undefined) return null
      const itemId = `play:${movedCardOid}`
                                                                     
                                                                                       
      const cur = controllerAtResolve(state, movedCardOid, controller)
      const spec = tentacleSpec(itemId, cur, chosen)
                                                   
      const sub = groupSubsetChoice(spec)(state, chosen)
      if (sub) return sub
                                                                   
                                                                   
      return patrolPayChoice(state, controller, itemId, groupSubsetApplied(state, chosen, spec), dest, chosen)
    },
  makeResolve: ({ movedCardOid, controller }) => (state, chosen, self?: ChainItem): readonly GameEvent[] => {
    const to = (chosen ?? {})[UNL_054_DEST_KEY]
    if (to === undefined) return []
                                                                          
    const cur = (self?.controller ?? controller) as PlayerId
                                                                                              
    const subset = groupSubsetApplied(state, chosen, tentacleSpec(`play:${movedCardOid}`, cur, chosen ?? {}))
    const out: GameEvent[] = []
    const taken: string[] = []
                                                    
                                                       
                                        
    const tax = patrolTaxApplies(state, controller, to)
    let committed: Cost = { mana: 0 }
    for (const oid of subset) {
      taken.push(oid)
      if (tax && taken.length >= 2) {
        const next = addCosts(committed, PATROL_SURCHARGE)
        const agreed = (chosen ?? {})[`${UNL_054_PATROL_PAY}${oid}`] === 'yes'
        if (!agreed || !canPayFromState(state, controller, next)) continue                 
        committed = next
        out.push({ kind: 'spend', player: controller, cost: PATROL_SURCHARGE } as GameEvent)
      }
      out.push(...moveUnitEvents(state, oid, to))                        
    }
    return out
  },
}

export const UNL_054: Card = {
  id: 'UNL-054', cardNo: 'UNL-054/219', name: '顽皮触手', category: 'spell',
  domains: ['green'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '把同控制者、总计战力≤8 的敌方单位聚到同一位置(UNL_054_SPEC)' }],
}
