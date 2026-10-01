                                                                
                                                   
                                                
                                                     
  
                                
                                                          
                                                                 
                                                              
                                                          
                                                           
                                                   
  
                                                                  
                                                       
                                                                  
                                                                    
                                                                
                                                   
                                                      
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { StaticEffect } from '../../src/effects/continuousView'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChainItem } from '../../src/loop/chain'
import type { GameObject } from '../../src/state/object'
import { isUnit } from '../../src/state/cardTypes'

export const VEN_137_CARD_EFFECT =
  '{{装配1黄色}}（支付{{1}}和{{黄色}}：将此牌贴附到你控制的一名单位上。）\n'
  + '此牌贴附到单位上时，选择另一名友方单位。装配此牌的单位在此牌贴附期间变为所选单位的复制体。'

const isFielded = (state: GameState, o: GameObject | undefined): boolean => {
  if (!o) return false
  const k = state.zones[o.zone]?.kind
  return k === 'battlefield' || k === 'base'
}

                                           
export function glassesCopyCandidates(state: GameState, controller: PlayerId, hostTarget: string): string[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller
      && isUnit(o)
      && isFielded(state, o)
      && (o.oid as string) !== hostTarget)
    .map((o) => o.oid as string)
    .sort()
}

   
                                  
                                                      
                                                     
   
export function glassesCopyEffect(hostOid: string, gearOid: string, sourceOid: string): Omit<StaticEffect, 'timestamp'> {
  return {
    id: `VEN-137-copy:${gearOid}:${hostOid}<-${sourceOid}`,
    duration: 'permanent', fromPassive: true,
    predicate: (o: GameObject, state: GameState): boolean => {
      if ((o.oid as string) !== hostOid) return false
      const g = state.objects[gearOid as ObjId]
      return g !== undefined && (g.status.attachedTo as string | undefined) === hostOid
    },
    modification: { kind: 'copyOf', sourceOid: sourceOid as ObjId },
  }
}

   
                                                      
                                                              
   
export function suspiciousGlassesRewrite(sp: ActivatedSpec): ActivatedSpec {
  return {
    ...sp,
    makeNextChoice:
      ({ selfOid, controller, target }: { selfOid: string; controller: PlayerId; target?: string }) =>
      (state: GameState, chosen: Readonly<Record<string, string>>) => {
        if (chosen['copy'] !== undefined || target === undefined) return null
        const cands = glassesCopyCandidates(state, controller, target)
        if (cands.length === 0) return null                       
        return {
          itemId: `equip:${selfOid}:VEN-137`, controller, key: 'copy', isTarget: true, // §355.6 「选择」=目标
          prompt: '可疑的眼镜:选择另一名友方单位(装配单位在贴附期间变为其复制体)',
          candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        }
      },
    makeResolve:
      (ctx: { selfOid: string; controller: PlayerId; target?: string }) =>
      (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem): readonly GameEvent[] => {
        const base = sp.makeResolve(ctx as never)(state, chosen, self)                      
        if (base.length === 0 || ctx.target === undefined) return base              
        const src = chosen?.['copy']
                                                            
        if (src === undefined || !isFielded(state, state.objects[src as ObjId])) return base
                                                                 
        return [...base, { kind: 'addEffect', effect: glassesCopyEffect(ctx.target, ctx.selfOid, src) } ]
      },
  }
}
