                                                                   
                                       
  
         
                                                             
                                                
                                                                             
                                                            
                                                           
                                                            
                                           
                                                            
                                                     
import type { Card } from '../../src/dsl/card'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const VEN_024_CARD_EFFECT = '当我参与的战斗结束时，如果我在本回合内未受到伤害，则抽一张牌。'
export const VEN_024_DRAW = 1

                                      
export function tookDamageThisTurn(state: { readonly damagedThisTurn?: Readonly<Record<string, true>> }, oid: string): boolean {
  return state.damagedThisTurn?.[oid] === true
}

export function makeCuddlyPoroTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                                       
                                                   
    guard: (ctx) => ctx.selfOid !== null
      && ctx.state.objects[ctx.selfOid] !== undefined
      && !tookDamageThisTurn(ctx.state, ctx.selfOid as string),
    then: [{ op: 'draw', count: VEN_024_DRAW }],
  })
  return compileTrigger({
    id: `VEN-024-draw:${selfOid}`,
    rawId: true,
    event: 'battleEnd',
    by: 'any', // 谁发起的战斗都算
    when: [
      { kind: 'custom', test: (ev) => ev.kind === 'battleEnd' && ev.participants.includes(selfOid) },
                                               
      { kind: 'custom', test: (_ev, state) => !tookDamageThisTurn(state, selfOid as string) },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_024: Card = {
  id: 'VEN-024', cardNo: 'VEN·024', name: '贴贴魄罗', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '参与的战斗结束时,若本回合未受伤则抽一张(makeCuddlyPoroTrigger)' }],
}
