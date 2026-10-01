                                                                 
                                                           
                                                   
  
                                    
                                           
                                                            
                                                              
                                                                
                                                                  
                                                                      
                                          
  
                               
                                  
                                                              
                              
                                                               
                                                                       
                                                         
                                                          
                                          
                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import type { GameObject } from '../../src/state/object'
import { isUnit } from '../../src/state/cardTypes'
import { effectiveMight } from '../../src/state/might'
import { battlefieldUnits } from './diana-reactions'
import { fieldedUnits } from './activated-batch'                             
import { onField } from './activated-batch2'

                                                                            
export const OGN_048_PRINTED =
  '{{反应}}\n抽一张牌。你可以选择让一名友方单位变为休眠状态作为额外费用，以此再抽一张牌。'
                                   
export const OGN_048_ERRATA =
  '{{反应}}\n你可以选择让一名友方单位变为休眠状态作为额外费用。若如此做，则抽两张牌。否则，抽一张牌。'

                                                                                                
                                                      
                                                                                                                  
export const OGN_048_CARD_EFFECT = OGN_048_ERRATA
export const OGN_048_DRAW_PAID = 2
export const OGN_048_DRAW_FREE = 1

                                                          
export function meditateVictims(state: GameState, player: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === player && isUnit(o) && onField(state, o) && o.status.dormant !== true)
    .map((o) => o.oid)
    .sort()
}

export const OGN_048_EXTRA_COST: PlayExtraCost = {
  label: '让一名友方单位变为休眠状态(改为抽两张牌)',
                             
  options: (state, player) => meditateVictims(state, player)
    .map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
  payEvents: (state, _player, choice): readonly GameEvent[] => {
    const o = choice === undefined ? undefined : state.objects[choice as ObjId]
    return o === undefined
      ? []
      : [{ kind: 'statusChange', target: o.oid, key: 'dormant', value: true } ]
  },
  // ⚠️ **不给 `events`** —— 勘误把它改成了「若如此做则抽两张,否则抽一张」,
  //   收益不是"额外再抽一张",而是**换掉抽牌张数** ⇒ 由 spec 读 `ctx.bonus` 定(495 的通道)。
}

export const OGN_048_SPEC: PlaySpec = {
  defId: 'OGN-048', cardNo: 'OGN·048/298', name: '冥想', kind: 'spell',
  cost: { mana: 2 }, // cardCosts 实测:2 法力 0 pip(绿)
  keywords: ['反应'],
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller, bonus }) => (): readonly GameEvent[] =>
    [{ kind: 'draw', player: controller, count: bonus === true ? OGN_048_DRAW_PAID : OGN_048_DRAW_FREE } as GameEvent],
}

export const OGN_048: Card = {
  id: 'OGN-048', cardNo: 'OGN·048/298', name: '冥想', category: 'spell',
  domains: ['green'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应];休眠一名友方单位则抽两张,否则抽一张(OGN_048_SPEC)' }],
}

                                                                            
export const VEN_083_CARD_EFFECT =
  '打出此牌时，你可以选择支付{{橙色}}作为额外费用。\n' +
  '选择一名友方单位和一名敌方单位。如果你支付了该额外费用，则给予该友方单位在本回合内{{S}}+2。' +
  '这两名单位相互以自身战力给对方造成伤害。'

export const VEN_083_BUFF = 2

                                                             
export const VEN_083_EXTRA_COST: PlayExtraCost = {
  label: '支付摧破符能(给友方单位本回合战力+2)',
  cost: { pips: [['orange']] },
}

   
                                                               
  
                                                             
                                                            
                                                    
                                                           
                                                   
                                           
   
export function mutualPairs(
  state: GameState, controller: PlayerId,
  opts: { readonly mineOnBattlefield: boolean; readonly foeOnBattlefield: boolean },
): string[] {
  const pick = (friendly: boolean, onlyBf: boolean): string[] => {
    const ids = onlyBf
      ? battlefieldUnits(state).filter((oid) => {
        const o = state.objects[oid as ObjId]
        return o !== undefined && (friendly ? o.controller === controller : o.controller !== controller)
      }) as string[]
      : fieldedUnits(state, { of: controller, friendly }).map((o) => o as string)
    return [...ids].sort()
  }
  const mine = pick(true, opts.mineOnBattlefield)
  const foes = pick(false, opts.foeOnBattlefield)
  const out: string[] = []
  for (const m of mine) for (const f of foes) out.push(`pair:${m}:${f}`)
  return out
}

                                               
export function ragePairs(state: GameState, controller: PlayerId): string[] {
  return mutualPairs(state, controller, { mineOnBattlefield: false, foeOnBattlefield: false })
}

export const VEN_083_SPEC: PlaySpec = {
  defId: 'VEN-083', cardNo: 'VEN·083', name: '暴走', kind: 'spell',
  cost: { mana: 3 }, // cardCosts 实测:3 法力 0 pip(橙)
  keywords: [],
  target: 'custom',
  legalTargets: (state, controller): string[] => ragePairs(state, controller),
  makeResolve: ({ target, movedCardOid, controller, bonus }) => (state): readonly GameEvent[] => {
    if (target === undefined || !target.startsWith('pair:')) return []
    const [, mineOid, foeOid] = target.split(':')
    const me = mineOid === undefined ? undefined : state.objects[mineOid as ObjId]
    const foe = foeOid === undefined ? undefined : state.objects[foeOid as ObjId]
    if (me === undefined || foe === undefined || mineOid === undefined || foeOid === undefined) return []
    const out: GameEvent[] = []
                                                       
    if (bonus === true) {
      out.push({
        kind: 'addEffect',
        effect: {
          id: `VEN-083:buff:${mineOid}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { oid: string }) => x.oid === mineOid,
          modification: { kind: 'addMight', delta: VEN_083_BUFF },
        },
      } )
    }
                                              
                                                        
                                               
    const myMight = effectiveMight(me).reference + (bonus === true ? VEN_083_BUFF : 0)
    const foeMight = effectiveMight(foe).reference
    out.push(
                                                                  
                                                                 
                                                        
                                                                  
                                                                 
                                                                                  
                                         
      { kind: 'damage', target: foeOid as ObjId, amount: myMight, source: mineOid as ObjId, sourcePlayer: me?.controller as PlayerId } ,
      { kind: 'damage', target: mineOid as ObjId, amount: foeMight, source: foeOid as ObjId, sourcePlayer: foe?.controller as PlayerId } ,
    )
    return out
  },
}

export const VEN_083: Card = {
  id: 'VEN-083', cardNo: 'VEN·083', name: '暴走', category: 'spell',
  domains: ['orange'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '一友一敌互相以战力造成伤害;付了{橙}则友方本回合+2(VEN_083_SPEC)' }],
}

                                                     
export const SPELL_BONUS_COSTS: Readonly<Record<string, PlayExtraCost>> = {
  'OGN-048': OGN_048_EXTRA_COST,
  'VEN-083': VEN_083_EXTRA_COST,
}

                           
export const SPELL_BONUS_CARDS: readonly Card[] = [OGN_048, VEN_083]
export type { GameObject }
