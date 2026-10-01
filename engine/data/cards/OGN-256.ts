                                                                       
                                                                    
                                                  
                              
                                     
  
           
                                                                      
                                                                  
                                                       
                                                  
                                                                                   
  
                                                                   
                                                           
                                                                          
                                                         
                                                                          
                                                   
                                                    
                                                                   
                                                                       
                                                                
                                                              
                                                            
                                                                 
                                        
                                    
                                                           
                                                       
                                                                     
                                       
                                                            
                                                 
                                                              
                                                                              
                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { referencedMight } from './might-common'
import { groupSubsetChoice, groupSubsetApplied, controllerAtResolve, type GroupTargetSpec } from '../../src/loop/groupTargets'

export const OGN_256_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '摧毁一处战场中任意数量的单位，这些单位总计战力不得高于4。'

export const OGN_256_ZONE = 'foxZone'
export const OGN_256_PICKS = ['fox1', 'fox2', 'fox3', 'fox4'] as const                  
export const OGN_256_STOP = 'stop'
export const OGN_256_BUDGET = 4

                                                        
const FOX_GROUP_KEY = 'fox'

                                                                    
function spentBudget(state: GameState, chosen: Readonly<Record<string, string>>): number {
  let sum = 0
  for (const k of OGN_256_PICKS) {
    const v = chosen[k]
    if (v !== undefined && v !== OGN_256_STOP && state.objects[v as ObjId]) sum += referencedMight(state, v as ObjId)
  }
  return sum
}

   
                                                             
                                                                                 
                                                                           
                                            
   
export function foxPicked(chosen: Readonly<Record<string, string>>): string[] {
  return OGN_256_PICKS
    .map((k) => chosen[k])
    .filter((v): v is string => v !== undefined && v !== OGN_256_STOP)
}

   
                                              
                                                                     
                                                      
                                                                   
   
export function foxGroupOk(state: GameState, group: readonly string[]): boolean {
  if (group.length === 0) return true                    
  const zs = new Set(group.map((o) => String(state.objects[o as ObjId]?.zone ?? '')))
  if (zs.size !== 1) return false
  const z = state.zones[[...zs][0] as never]
  if (!z || z.kind !== 'battlefield') return false                  
  return group.reduce((n, o) => n + referencedMight(state, o as ObjId), 0) <= OGN_256_BUDGET
}

                                                         
function foxSpec(
  movedCardOid: string, controller: PlayerId, source: Readonly<Record<string, string>>,
): GroupTargetSpec {
  return {
    itemId: `spell:${movedCardOid}:OGN-256`,
    controller,
    groupKey: FOX_GROUP_KEY,
    initial: foxPicked(source),
    memberLegal: (st, o) => isUnit(st.objects[o as ObjId]),
    groupOk: foxGroupOk,
    prompt: '妖异狐火:这些目标已不再整体满足限制(总计战力超过4，或不在同一处战场)——从最初选定的目标里挑一个合法子集',
    label: (st, o) => `${st.objects[o as ObjId]?.defId ?? o}(战力 ${referencedMight(st, o as ObjId)})`,
  }
}

                                                 
function foxCandidates(state: GameState, zone: string, chosen: Readonly<Record<string, string>>): string[] {
  const z = state.zones[zone as never]
  if (!z || z.kind !== 'battlefield') return []
  const taken = foxPicked(chosen)
  return z.contents
    .map((oid) => state.objects[oid])
    .filter((o) => o !== undefined && isUnit(o)                                                                     
      && !taken.includes(o.oid as string)
      && foxGroupOk(state, [...taken, o.oid as string]))                
    .map((o) => o!.oid as string)
}

export const OGN_256_SPEC: PlaySpec = {
  defId: 'OGN-256', cardNo: 'OGN·256/298', name: '妖异狐火', kind: 'spell',
  cost: { mana: 3 }, // ㊶ cardCosts 实测 3 法力 **0 pip**
  keywords: ['待命', '迅捷'],
  target: 'none',
  legalTargets: (): string[] => [],
                                                           
                                                                  
  makeConfirmChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[OGN_256_ZONE] === undefined) {
        return {
          itemId: `spell:${movedCardOid}:OGN-256`, controller, key: OGN_256_ZONE,
          prompt: '妖异狐火:选择一处战场(摧毁其中总计战力不高于4的任意数量单位)',
          candidates: zonesByKind(state, 'battlefield').map((z) => ({ id: z.id as string, label: z.id as string })),
        }
      }
                                                                     
                              
      const taken = OGN_256_PICKS.map((k) => chosen[k]).filter((x): x is string => x !== undefined)
      if (taken.includes(OGN_256_STOP)) return null
      const next = OGN_256_PICKS.find((k) => chosen[k] === undefined)
      if (next === undefined) return null
      const cands = foxCandidates(state, chosen[OGN_256_ZONE]!, chosen)
      if (cands.length === 0) return null                   
      return {
        itemId: `spell:${movedCardOid}:OGN-256`, controller, key: next,
        prompt: `妖异狐火:选要摧毁的单位(已用 ${spentBudget(state, chosen)}/${OGN_256_BUDGET} 战力预算,可停止)`,
        isTarget: true, // ★1782 摧毁一处战场中**任意数量的单位**
        candidates: [
          ...cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}(战力 ${referencedMight(state, oid as ObjId)})` })),
          { id: OGN_256_STOP, label: '不再选(「任意数量」可为0)' },
        ],
      }
    },
                                                             
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                        
      if (chosen[OGN_256_ZONE] === undefined) return null
                                                                     
                                                                                       
      const cur = controllerAtResolve(state, movedCardOid, controller)
      return groupSubsetChoice(foxSpec(movedCardOid, cur, chosen))(state, chosen)
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem): readonly GameEvent[] => {
                                                                              
                                                                 
      const source: Readonly<Record<string, string>> = { ...(chosen ?? {}), ...(self?.frozenChoices ?? {}) }
      if (source[OGN_256_ZONE] === undefined) return []
                                                                            
                                                               
      const cur = (self?.controller ?? controller) as PlayerId
      const spec = foxSpec(movedCardOid, cur, source)
      const out: GameEvent[] = []
      for (const oid of groupSubsetApplied(state, chosen, spec)) {
                                                                     
        out.push({ kind: 'destroy', target: oid as ObjId, source: movedCardOid as ObjId, sourcePlayer: controller } as GameEvent)
      }
      return out
    },
}

export const OGN_256: Card = {
  id: 'OGN-256', cardNo: 'OGN·256/298', name: '妖异狐火', category: 'spell',
  domains: ['green', 'blue'], energy: 3, keywords: ['待命', '迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一处战场,摧毁总计战力≤4的任意数量单位(OGN_256_SPEC)' }],
}
