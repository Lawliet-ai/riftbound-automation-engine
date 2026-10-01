                                                 
  
                                      
                                                          
                                                         
                                                                    
                                                         
                                                           
                             
                                                
                                                              
                                               
                                                          
                                         
                                                      
                                 
                                                    
                                                           
                                   
                                                 
  
                    
                                                      
                                       
                                                              
                                                           

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import type { Cost } from '../state/runePool'
import { isFieldedExceptStandby, zoneCategory } from '../state/zones'
import type { Trigger } from '../dsl/trigger'
                                                                       
import { passiveDefId } from '../../data/passiveIdentity'
import type { GameEvent } from '../loop/events'

export const FORGE = '百炼'
                                          
export const ARMAMENT_TAG = '武装'

                          
export function hasForge(keywords: readonly string[] | undefined): boolean {
  return (keywords ?? []).includes(FORGE)
}

   
                                  
                              
   
export function forgeTriggerCount(keywords: readonly string[] | undefined): number {
  return (keywords ?? []).filter((k) => k === FORGE).length
}

   
                                                               
                                                                                     
                                                                                
                                                
                                                                                                   
   
function fielded(state: GameState, o: GameObject): boolean {
  const kind = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(kind)
}

   
                                      
                                                           
                            
   
export function forgeChoices(
  state: GameState,
  controller: PlayerId,
  hasTag: (defId: string, tag: string) => boolean,
): readonly GameObject[] {
  return Object.values(state.objects).filter(
    (o) => o.controller === controller && fielded(state, o) && hasTag(o.defId, ARMAMENT_TAG),
  )
}

   
                                           
                                          
                                               
   
export function reduceByOneAnyPip(cost: Cost): Cost {
  const pips = cost.pips ?? []
  const i = pips.findIndex((p) => p.length === 0)
  if (i < 0) return cost                          
  return { ...cost, pips: [...pips.slice(0, i), ...pips.slice(i + 1)] }
}

   
                                               
  
                                                   
                                          
  
                                                    
                                                           
                                                               
                                                                       
                                                  
   
export interface ForgeCostCtx {
  readonly state: GameState
  readonly player: PlayerId
                                                        
  readonly gearOid: ObjId
                                                         
  readonly forgeUnitOid: ObjId
}

   
                                                          
                          
                                                          
   
                                                       
export interface HandwrittenEquip {
  readonly cost: Cost
  readonly extraCost?: {
    readonly label: string
    readonly options?: (state: GameState, controller: PlayerId, selfOid: string) => readonly { readonly id: string; readonly label: string }[]
    readonly asEvents?: (state: GameState, controller: PlayerId, selfOid: string, choice?: string) => readonly GameEvent[] | null
  }
}

interface ForgeCandidate {
  readonly oid: ObjId
  readonly defId: string
  readonly cost: Cost
  readonly extra?: HandwrittenEquip['extraCost']
}

export function forgePayableCost(
  defId: string,
  equipCostOf: (defId: string) => Cost | undefined,
): Cost | null {
  const base = equipCostOf(defId)
  if (!base) return null              
  return reduceByOneAnyPip(base)                  
}

   
                                            
                                           
   
export function forgeAttachTarget(forgeUnitOid: ObjId): ObjId {
  return forgeUnitOid
}

   
                                           
  
                                                 
                                                 
  
                                                          
                                               
                          
                                           
                                                    
   
export function makeForgeTriggers(
  state: GameState,
  deps: {
                                                          
    readonly sourcesOf: (o: GameObject) => readonly string[]
    readonly hasTag: (defId: string, tag: string) => boolean
                                                                  
    readonly equipCostOf: (defId: string, ctx?: ForgeCostCtx) => Cost | undefined
    readonly canPay: (state: GameState, player: PlayerId, cost: Cost) => boolean
       
                                                                   
                                                               
       
    readonly handwrittenEquipOf?: (defId: string) => HandwrittenEquip | undefined
  },
): Trigger[] {
  const out: Trigger[] = []
  for (const o of Object.values(state.objects)) {
    const n = forgeTriggerCount(deps.sourcesOf(o))
    if (n === 0) continue
    const selfOid = o.oid
    const controller = o.controller
                                         
    const payable = (st: GameState): ForgeCandidate[] =>
      forgeChoices(st, controller, deps.hasTag)
        .map((g) => {
                                                                  
                                                           
          const c = forgePayableCost(g.defId, (d) =>
            deps.equipCostOf(d, { state: st, player: controller, gearOid: g.oid, forgeUnitOid: selfOid }))
          if (c !== null) return { oid: g.oid, defId: g.defId, cost: c }
                                                                           
          const hw = deps.handwrittenEquipOf?.(g.defId)
          if (!hw) return null                      
          const extra = hw.extraCost
          if (extra !== undefined && extra.asEvents === undefined) return null                          
          if (extra?.options !== undefined && extra.options(st, controller, g.oid as string).length === 0) return null              
          if (extra !== undefined && extra.options === undefined && extra.asEvents?.(st, controller, g.oid as string) === null) return null
                                                                           
          return { oid: g.oid, defId: g.defId, cost: reduceByOneAnyPip({ mana: hw.cost.mana ?? 0, pips: hw.cost.pips ?? [] }), extra }
        })
        .filter((x): x is ForgeCandidate => x !== null && deps.canPay(st, controller, x.cost))
    for (let i = 0; i < n; i++) {
      const key = `forge${i}`
      out.push({
        id: `forge:${selfOid}:${i}`,
        sourceOid: selfOid,
        sourceDefId: passiveDefId(o),
        controller,
        event: 'playUnit',
        filter: (ev) => ev.kind === 'playUnit' && ev.unit === selfOid,
        nextChoice: (st, _ev, chosen) => {
          if (chosen[key] !== undefined) {
                                                           
            const payKey = `${key}:pay`
            if (chosen[key] === 'skip' || chosen[payKey] !== undefined) return null
            const g = payable(st).find((x) => (x.oid as string) === chosen[key])
            const opts = g?.extra?.options?.(st, controller, g.oid as string) ?? []
            if (!g || opts.length === 0) return null
            return {
              itemId: `trig:forge:${selfOid}:${i}:pay`,
              controller,
              key: payKey,
              prompt: `[百炼]装配 ${g.defId}:${g.extra?.label ?? '支付费用'}`,
              candidates: opts,
            }
          }
          const cands = payable(st).map((g) => ({ id: g.oid as string, label: `装配 ${g.defId}(费用减[A])` }))
          if (cands.length === 0) return null                  
          return {
            itemId: `trig:forge:${selfOid}:${i}`,
            controller,
            key,
            prompt: '[百炼]:可选一件你控制的武装装配到我身上(费用减[A])',
            candidates: [...cands, { id: 'skip', label: '不装配(可选)' }],
          }
        },
        effect: (st, _ev, chosen): readonly GameEvent[] => {
          const pick = chosen?.[key]
          if (!pick || pick === 'skip') return []
          const g = payable(st).find((x) => (x.oid as string) === pick)
          if (!g) return []                                        
          const extraEvents = g.extra?.asEvents?.(st, controller, g.oid as string, chosen?.[`${key}:pay`]) ?? []
          if (extraEvents === null) return []                              
          return [
            { kind: 'spend', player: controller, cost: g.cost },
            ...extraEvents, // ★1663 非资源费用(消耗经验 / 摧毁 / 回收)与资源费同属付费步骤,在贴附之前
            { kind: 'attach', obj: g.oid, to: forgeAttachTarget(selfOid), player: controller },
          ]
        },
      })
    }
  }
  return out
}
