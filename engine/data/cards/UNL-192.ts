                                                                    
                           
                                        
                                           
                                  
  
                          
                                 
                                                                   
                                                                               
                                      
                                                        
                                                             
                                                           
                                                 
                                                      
                                                         
                       
                                        
                                            
                                                                       
  
                                                    
                                                   
                                                      
  
                                                
                                                                
                                            
                                                    
                                                                        
                                                         
                                                            
                                                          
                                                                  
                                                                    
                                                                                  
                                                           
                                                              
                                                                           
                                                           
                                                                                 
                                                                                 
                                                                                       
                                                                              
                                                                            
                                                                                
import { splitPoolBoost } from './damage-boost'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { splitDamageChoice, splitDropChoice, splitDamageEvents, splitTally } from './damage-split'
import { effectiveMight } from '../../src/state/might'
import { damageVictims } from './damage-spells'

export const UNL_192_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '选择一名友方单位。该单位对战场上的敌方单位合计造成等同于其战力的伤害，'
  + '可在多名敌方单位之间分摊。每有一名单位因此被摧毁，则进行一次：获得1经验。'

                                                            
                                                         
export const UNL_192_KEYWORDS: readonly string[] = ['迅捷']

export const UNL_192_ATTACKER_KEY = 'UNL-192:attacker'
export const UNL_192_HIT_PREFIX = 'UNL-192:hit'
                                              
export const UNL_192_TARGETS_PREFIX = 'UNL-192:tgt'
                                                   
export const UNL_192_DROP_PREFIX = 'UNL-192:drop'

                                               
export function unl192Attackers(state: GameState, controller: PlayerId): readonly string[] {
                                                       
  return damageVictims('oneAnywhere', state, controller)
    .filter((oid) => state.objects[oid as ObjId]?.controller === controller)
    .sort()
}

   
                                            
                             
   
export function unl192Budget(state: GameState, attacker: string | undefined): number {
  if (attacker === undefined) return 0
  const o = state.objects[attacker as ObjId]
  if (o === undefined) return 0
  return Math.max(0, effectiveMight(o).actual)
}

   
                               
                                      
   
export const unl192Tally = splitTally

   
                                          
                                                             
                                                                 
                                            
                                     
                                                                       
                                                                
   
export function unl192ConfirmChoice(
  { movedCardOid, controller }: { movedCardOid: string; controller: PlayerId },
) {
  return (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
    const itemId = `play:${movedCardOid}`
    const attacker = chosen[UNL_192_ATTACKER_KEY]
    if (attacker === undefined) {
      const cands = unl192Attackers(state, controller)
      if (cands.length === 0) return null
      return {
        itemId, controller, key: UNL_192_ATTACKER_KEY,
        prompt: '阿尔法突袭:选择一名友方单位(由它造成伤害)',
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
                                                                           
                                                                            
                                                                                          
                                                                   
                                                                                    
        isTarget: true,
      }
    }
    const budget = unl192Budget(state, attacker)
    if (budget <= 0) return null
                                                                        
                                                                        
                                                                                                    
                                                                                
                                                                                            
                                                                                         
    if (chosen[`${UNL_192_TARGETS_PREFIX}0`] === undefined
      && damageVictims('oneEnemyOnBattlefield', state, controller).length === 0) {
      return {
        itemId, controller,
        key: `${UNL_192_TARGETS_PREFIX}0`,
        prompt: `阿尔法突袭:选定目标(最多${budget}名战场上的敌方单位;分多少留到结算时定)`,
        isTarget: true,
        candidates: [],
      }
    }
                                                                   
    return multiSelectChoice({
      itemId, controller, prefix: UNL_192_TARGETS_PREFIX,
      prompt: `阿尔法突袭:选定目标(最多${budget}名战场上的敌方单位;分多少留到结算时定)`,
      max: budget,
                                                             
                                                              
                                                                 
                                              
                                                                           
                                                                      
                                                                   
                                                          
      minPicks: 1,
                                                                     
                                                                             
                                                    
      isTarget: true,
      candidates: (st: GameState, picked: readonly string[]) => damageVictims('oneEnemyOnBattlefield', st, controller)
        .filter((oid) => !picked.includes(oid))
        .map((oid) => ({ id: oid, label: `${st.objects[oid as ObjId]?.defId ?? oid}` })),
    })(state, chosen)
  }
}

   
                                              
                                                          
  
                                                              
                                                                         
                                                     
                                                                 
                                                            
                                               
                                                                        
                                                             
                                                                         
                                                                                     
                                                           
                                        
                                                     
                                                                     
   
export function unl192ConfirmSignals(
  { movedCardOid, controller }: { movedCardOid: string; controller: PlayerId },
) {
  return (_state: GameState, chosen: Readonly<Record<string, string>>): readonly GameEvent[] =>
    unl192FrozenTargets(chosen).map((oid) => ({
      kind: 'targeted', chooser: controller, target: oid as ObjId,
      sourceKind: 'spell', sourceOid: movedCardOid as ObjId,
    } as GameEvent))
}

                                                 
export const unl192FrozenTargets = (chosen: Readonly<Record<string, string>> | undefined): readonly string[] =>
  multiSelectPicked(chosen, UNL_192_TARGETS_PREFIX)

                                       
export const unl192DroppedTargets = (chosen: Readonly<Record<string, string>> | undefined): readonly string[] =>
  multiSelectPicked(chosen, UNL_192_DROP_PREFIX)

   
                                      
                                                
                                                                    
                                           
   
export const unl192LiveTargets = (chosen: Readonly<Record<string, string>> | undefined): readonly string[] => {
  const dropped = unl192DroppedTargets(chosen)
  return unl192FrozenTargets(chosen).filter((oid) => !dropped.includes(oid))
}

export const UNL_192_SPEC: PlaySpec = {
  defId: 'UNL-192',
  cardNo: 'UNL-192/219',
  name: '阿尔法突袭',
  kind: 'spell',
                                                                  
  cost: { mana: 3, pips: [['green', 'orange']] },
  keywords: [...UNL_192_KEYWORDS],
  targetlessChoice: true, // ★499:选择走问链
  target: 'custom',
  legalTargets: (): string[] => [],
                                                    
  makeConfirmChoice: unl192ConfirmChoice,
                                                                               
                                                                  
                                                  
                                                                 
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
      (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
        const itemId = `play:${movedCardOid}`
                                                                           
        const attacker = chosen[UNL_192_ATTACKER_KEY]
        if (attacker === undefined) return null
                                                       
                                                            
        const budget = unl192Budget(state, attacker)
          + (unl192Budget(state, attacker) > 0
            ? splitPoolBoost(state, attacker as string, controller as string, damageVictims('oneEnemyOnBattlefield', state, controller)[0])
            : 0)
                                                              
                                                           
                                                        
        if (budget <= 0) return null
        const frozen = unl192FrozenTargets(chosen)
                                                                  
                                              
                                                                 
                                                                  
                                                            
                                                        
                                                                
                                                         
                                                    
        if (frozen.length > budget) {
          const drop = splitDropChoice({ itemId, controller, frozen, budget, prefix: UNL_192_DROP_PREFIX })(state, chosen)
          if (drop !== null) return drop
        }
                                                
        const live = unl192LiveTargets(chosen)
                                                             
        return splitDamageChoice({
          itemId,
          controller,
          prefix: UNL_192_HIT_PREFIX,
          prompt: `阿尔法突袭:把合计${budget}点伤害分摊给战场上的敌方单位(每次1点)`,
          budget,
                                                                               
                                                           
                                             
                                                                 
                                                      
          candidates: (st) => damageVictims('oneEnemyOnBattlefield', st, controller)
            .filter((oid) => live.includes(oid)),
                                                                 
          mustFeed: live,
        })(state, chosen)
      },
  makeResolve:
    ({ controller }: { controller: PlayerId; movedCardOid: string }) =>
      (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
        const attacker = chosen?.[UNL_192_ATTACKER_KEY]
                                  
        const budget = unl192Budget(state, attacker)
          + (unl192Budget(state, attacker) > 0
            ? splitPoolBoost(state, attacker as string, controller as string, damageVictims('oneEnemyOnBattlefield', state, controller)[0])
            : 0)
                                                              
                                                                      
                                            
        if (attacker === undefined || budget <= 0) return []
                                                                
        const srcDefId = state.objects[attacker as ObjId]?.defId
        if (srcDefId === undefined) return []
                                                      
        return splitDamageEvents({
          picks: multiSelectPicked(chosen, UNL_192_HIT_PREFIX),
          budget,
          sourcePlayer: controller,
          source: attacker, // ★②来源是【那名友方单位】,不是这张法术
          rider: (oid) => [{
            kind: 'delayedTrigger',
            add: {
              id: `expIfDestroyedByCard:UNL-192:${oid}`,
              kind: 'expIfDestroyedByCard',
              target: oid as ObjId,
              byCard: srcDefId, // ★归因也认那名单位的 defId
              count: 1, // 「每有一名…则进行一次:获得**1**经验」
              controller,
              sourceDefId: 'UNL-192',
            },
          } ],
        })
      },
}

export const UNL_192_CARD: Card = {
  id: 'UNL-192', cardNo: 'UNL-192/219', name: '阿尔法突袭', category: 'spell',
  domains: ['green', 'orange'], energy: 3, keywords: [...UNL_192_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名友方单位，它向战场上的敌方单位分摊合计等同其战力的伤害；每有一名因此被摧毁则获得1经验(UNL_192_SPEC)' }],
}
