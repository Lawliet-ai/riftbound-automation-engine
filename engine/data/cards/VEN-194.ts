                                                                 
                                                                  
                                                  
                                                 
                                  
                                            
                                                                           
  
                                                         
                                 
                                                      
                                               
                                                                        
                                               
  
                                                                     
                                                                          
                                 
  
                                                      
                                                                  
                                                            
                                                     
                                                           
                                            
                                                      
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'

export const VEN_194_CARD_EFFECT =
  '{{强化2AA}}\n'
  + '支付{{1}}，{{横置}}：让一件装备变为活跃状态。 \n'
  + '{{已强化>}} 支付{{1}}，{{横置}}：让两件装备变为活跃状态。'

                       
export const VEN_194_SECOND_KEY = 'jayceSecondGear'

   
                                                  
                                                  
   
export function gearCandidates(state: GameState): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      if (o.baseTypes?.includes('equipment') !== true) return false
      const k = state.zones[o.zone]?.kind
      return k === 'battlefield' || k === 'base'
    })
    .map((o) => o.oid as string)
    .sort()
}

   
                                                        
                                                   
   
export function jayceSecondCandidates(state: GameState, firstOid: string | undefined): string[] {
  return gearCandidates(state).filter((oid) => oid !== firstOid)
}

                                             
export function isEmpowered(state: GameState, selfOid: string): boolean {
  return ((state.objects[selfOid as ObjId]?.counters ?? {})['empower'] ?? 0) > 0
}

   
                                                       
                                                
   
export function makeGuardianSpec(count: 1 | 2): ActivatedSpec {
  const key = count === 2 ? 'VEN-194:ready2' : 'VEN-194:ready1'
  return {
    key,
    label: count === 2
      ? '已强化,支付 1 法力并{{横置}}:让两件装备变为活跃状态'
      : '支付 1 法力并{{横置}}:让一件装备变为活跃状态',
    cost: { mana: 1 },
    tapSelf: true,
                                                            
    ...(count === 2 ? {
      available: (state: GameState, _c: PlayerId, selfOid: string) => isEmpowered(state, selfOid),
    } : {}),
    target: 'custom',
    legalTargets: (state: GameState) => {
      const cands = gearCandidates(state)
                                                         
      if (cands.length < count) return []
      return cands
    },
                                                                
                                                                   
    ...(count === 2 ? { choiceTiming: 'confirm' as const } : {}),
    ...(count === 2 ? {
      makeNextChoice: ({ selfOid, controller, target }: { selfOid: string; controller: PlayerId; target?: string }) =>
        (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
          if (chosen[VEN_194_SECOND_KEY] !== undefined) return null
                                       
          const cands = jayceSecondCandidates(state, target)
          if (cands.length === 0) return null
          return {
            itemId: `act:${selfOid}:${key}`,
            controller,
            key: VEN_194_SECOND_KEY,
            prompt: '未来守护者:让哪一件装备(第二件)变为活跃状态?',
            isTarget: true, // ★1782 让两件装备变为活跃状态
            candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
          }
        },
    } : {}),
    makeResolve: ({ target }: { target?: string }) => (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const out: GameEvent[] = []
                                                   
      if (target !== undefined && gearCandidates(state).includes(target)) {
        out.push({ kind: 'statusChange', target: target as ObjId, key: 'tapped', value: false } as GameEvent)
      }
                                                    
      if (count === 2) {
        const second = (chosen ?? {})[VEN_194_SECOND_KEY]
        if (second !== undefined && jayceSecondCandidates(state, target).includes(second)) {
          out.push({ kind: 'statusChange', target: second as ObjId, key: 'tapped', value: false } as GameEvent)
        }
      }
      return out
    },
  }
}

export const VEN_194_SPECS: readonly ActivatedSpec[] = [
  makeGuardianSpec(1), // 「支付{1},{横置}:让一件装备变为活跃状态。」
  makeGuardianSpec(2), // 「{已强化>} 支付{1},{横置}:让两件装备变为活跃状态。」
]

                                                           
export const VEN_194: Card = {
  id: 'VEN-194', cardNo: 'VEN·194', name: '未来守护者', category: 'legend',
  domains: ['blue', 'orange'], energy: 0,
                                                                
  keywords: ['强化2AA'], playModes: [],
  abilities: [{ kind: 'passive', describe: '付{1}+横置解一件装备;[已强化>]解两件(VEN_194_SPECS);[强化2AA]走§827工厂' }],
}
