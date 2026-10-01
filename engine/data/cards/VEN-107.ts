                                                                       
                                        
                                                       
  
                                          
                                                                          
                                 
                                                 
  
                
                                                                          
                                                    
                                                                       
                                 
                                                          
  
                                                     
                                                                 
                                                        
                                      
  
                                      
                                                      
                                    
  
                                                                 
                                                                                  
                                                                     
                                                       
                                                                          
                                                            
                                                               
                                                                                    
                                                            
                                                        
                                                             
                                                                                       
                                                                             
                                                         
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChainItem } from '../../src/loop/chain'                            
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { referencedMight, totalReferencedMight } from './might-common'
import { CARD_COSTS } from '../cardCosts'                                
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { enemyUnitsOnField } from './enemy-move'
import { ownerHandZone } from './enter-triggers-batch'
import { hasDomain, domainIdOf } from './card-domain'                   
import { groupSubsetChoice, groupSubsetApplied, controllerAtResolve, type GroupTargetSpec } from '../../src/loop/groupTargets'                                               

export const VEN_107_CARD_EFFECT =
  '将任意数量的具有序理（{{黄色}}）特性的敌方单位返回其所属的手牌，这些单位总计战力不得高于5。'

                 
export const VEN_107_PREFIX = 'discordPick'
                                      
export const VEN_107_LIMIT = 5
                 
export const ORDER_DOMAIN = 'yellow'
   
                                                                 
                                                                          
   
export const VEN_107_GROUP = 'discord'

   
                
                                                        
                                                                 
                                                         
   
export function hasOrderDomain(defId: string): boolean {
  return hasDomain(defId, ORDER_DOMAIN)
}

                                                              
                              
export { referencedMight } from './might-common'

   
                                                          
                                                    
   
export function discordMemberOk(state: GameState, controller: PlayerId, oid: string): boolean {
  return enemyUnitsOnField(state, controller).includes(oid)
    && hasOrderDomain(domainIdOf(state.objects[oid as ObjId]))                      
}

   
                                              
                                                               
                                         
                                                     
                                                      
                                                       
   
export function discordGroupOk(state: GameState, sub: readonly string[]): boolean {
  if (sub.length === 0) return true                    
  return totalReferencedMight(state, sub) <= VEN_107_LIMIT
}

   
                                             
                             
   
export function discordCandidates(
  state: GameState, controller: PlayerId, picked: readonly string[],
): string[] {
  return enemyUnitsOnField(state, controller)
    .filter((oid) => !picked.includes(oid))
    .filter((oid) => discordMemberOk(state, controller, oid))
    .filter((oid) => discordGroupOk(state, [...picked, oid]))
}

                                                                    
function discordSpec(
  itemId: string, controller: PlayerId, source: Readonly<Record<string, string>>,
): GroupTargetSpec {
  return {
    itemId, controller, groupKey: VEN_107_GROUP,
    initial: multiSelectPicked(source, VEN_107_PREFIX),
    memberLegal: (st, o) => discordMemberOk(st, controller, o),
    groupOk: discordGroupOk,
    prompt: `不和箴言:这些目标已不再整体满足限制(总计战力超过 ${VEN_107_LIMIT})——从最初选定的敌方单位里挑一个合法子集`,
    label: (st, o) => `${st.objects[o as ObjId]?.defId ?? o}(战力 ${referencedMight(st, o)})`,
  }
}

export const VEN_107_SPEC: PlaySpec = {
  defId: 'VEN-107', cardNo: 'VEN·107', name: '不和箴言', kind: 'spell',
  cost: { mana: 1, pips: [['purple']] },
  keywords: [],
  target: 'none', // 选谁是**打出时(确认期)**多选出来的,不在打出动作上锁定(★1800 提前)
  legalTargets: (): string[] => [],
  firstAskOptional: true, // ★1802c §355.13:卡文「将**任意数量**的…敌方单位返回其所属的手牌」⇒ 含 0
                                                        
                                                                    
  makeConfirmChoice: ({ movedCardOid, controller }) => (state, chosen) =>
    multiSelectChoice({
      itemId: `play:${movedCardOid}`,
      controller,
      prefix: VEN_107_PREFIX,
      prompt: `不和箴言:把哪名序理敌方单位送回手牌?(总计战力不超过 ${VEN_107_LIMIT})`,
      isTarget: true, // ★1782 将任意数量的…敌方单位返回其所属的手牌
                                     
      candidates: (st, picked) => discordCandidates(st, controller, picked).map((oid) => ({
        id: oid,
        label: `${st.objects[oid as ObjId]?.defId ?? oid}(${referencedMight(st, oid)}[S])`,
      })),
    })(state, chosen),
                                                              
  makeNextChoice: ({ movedCardOid, controller }) => (state, chosen) => {
                                                                   
                                                                                     
    const cur = controllerAtResolve(state, movedCardOid, controller)
    return groupSubsetChoice(discordSpec(`play:${movedCardOid}`, cur, chosen))(state, chosen)
  },
  makeResolve: ({ movedCardOid, controller }) => (state, chosen, self?: ChainItem): readonly GameEvent[] => {
                                                                            
                                                               
    const source: Readonly<Record<string, string>> = { ...(chosen ?? {}), ...(self?.frozenChoices ?? {}) }
                                                                          
                                                             
    const cur = (self?.controller ?? controller) as PlayerId
    const out: GameEvent[] = []
                                                                                 
    for (const oid of groupSubsetApplied(state, chosen, discordSpec(`play:${movedCardOid}`, cur, source))) {
                                             
      out.push({ kind: 'zoneChange', obj: oid as ObjId, to: ownerHandZone(state, oid) } as GameEvent)
    }
    return out
  },
}

export const VEN_107: Card = {
  id: 'VEN-107', cardNo: 'VEN·107', name: '不和箴言', category: 'spell',
  domains: ['purple'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '把总计战力≤5 的序理敌方单位送回其拥有者手牌(VEN_107_SPEC)' }],
}
