                                                                        
                                                  
                                                       
  
                                                    
                                                             
                                              
                                                  
                            
  
                         
                                                      
                    
                                                                  
                                                                     
                                                               
                                               
                                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec, PlayCtx } from '../../src/loop/playSpec'
import { effectiveMight } from '../../src/state/might'
import { battlefieldUnits } from './diana-reactions'
import { fieldedUnits } from './activated-batch'
import { mutualPairs } from './spell-bonus-batch'

                                                                          
export const SFD_114_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '{{回响3}}（你可以选择支付此额外费用，以重复此法术效果。）\n' +
  '选择任意一名友方单位，和战场上的一名敌方单位。让这两名单位相互以自身战力给对方造成伤害。'

                                                             
export function marchPairs(state: GameState, controller: PlayerId): string[] {
  return mutualPairs(state, controller, { mineOnBattlefield: false, foeOnBattlefield: true })
}

                                                             
export function mutualDamage(
  state: GameState, target: string, sourceOid: string, controller: PlayerId,
): readonly GameEvent[] {
  if (!target.startsWith('pair:')) return []
  const [, a, b] = target.split(':')
  const oa = a === undefined ? undefined : state.objects[a as ObjId]
  const ob = b === undefined ? undefined : state.objects[b as ObjId]
  if (oa === undefined || ob === undefined || a === undefined || b === undefined) return []
  const ma = effectiveMight(oa).reference
  const mb = effectiveMight(ob).reference
  return [
                                                                  
                                                                 
                                                        
                                                                  
                                                                 
                                                                                  
                                         
    { kind: 'damage', target: b as ObjId, amount: ma, source: a as ObjId, sourcePlayer: oa.controller } ,
    { kind: 'damage', target: a as ObjId, amount: mb, source: b as ObjId, sourcePlayer: ob.controller } ,
  ]
}

export const SFD_114_SPEC: PlaySpec = {
  defId: 'SFD-114', cardNo: 'SFD·114/221', name: '行军号令', kind: 'spell',
  cost: { mana: 3 }, // cardCosts 实测:3 法力 0 pip(橙)
  echo: { mana: 3 }, // §820 {{回响3}} —— 轴早通,只差这一行(SFD-031 同款)
                                                     
                                                                
  keywords: ['迅捷', '回响'],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => marchPairs(state, controller),
  makeResolve: ({ target, movedCardOid, controller }: PlayCtx) => (state: GameState): readonly GameEvent[] =>
    target === undefined ? [] : mutualDamage(state, target, movedCardOid, controller),
}

export const SFD_114: Card = {
  id: 'SFD-114', cardNo: 'SFD·114/221', name: '行军号令', category: 'spell',
  domains: ['orange'], energy: 3, keywords: ['迅捷', '回响'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[迅捷];回响3;一友(含基地)一敌(限战场)互相以战力造成伤害' }],
}

                                                                          
export const SFD_023_CARD_EFFECT =
  '{{回响2红色}}（你可以选择支付此额外费用，以重复此法术效果。）\n' +
  '对战场上的一名单位造成2点伤害，然后对最多另一名单位造成2点伤害。'

export const SFD_023_DAMAGE = 2

   
                                  
                                               
                                                        
                                   
   
export function beamTargets(state: GameState, controller: PlayerId): string[] {
  const first = [...battlefieldUnits(state)].sort() as string[]
  const second = fieldedUnits(state).map((o) => o as string).sort()                   
  const out: string[] = []
  for (const f of first) {
    out.push(`beam:${f}`)                 
    for (const s of second) if (s !== f) out.push(`beam:${f}:${s}`)                
  }
  return out
}

export const SFD_023_SPEC: PlaySpec = {
  defId: 'SFD-023', cardNo: 'SFD·023/221', name: '透体圣光', kind: 'spell',
  cost: { mana: 2, pips: [['red']] }, // cardCosts 实测:2 法力 + 1 红 pip
  echo: { mana: 2, pips: [['red']] }, // §820 {{回响2红色}}
  keywords: ['回响'], // ② 卡面横幅印着 [回响](它没有[迅捷])
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => beamTargets(state, controller),
  makeResolve: ({ target, movedCardOid, controller }: PlayCtx) => (state: GameState): readonly GameEvent[] => {
    if (target === undefined || !target.startsWith('beam:')) return []
    const [, a, b] = target.split(':')
    const hit = (oid: string | undefined): readonly GameEvent[] =>
      oid === undefined || state.objects[oid as ObjId] === undefined
        ? []
        : [{
          kind: 'damage', target: oid as ObjId, amount: SFD_023_DAMAGE,
          source: movedCardOid as ObjId, sourcePlayer: controller,
        } ]
                                     
    return [...hit(a), ...hit(b)]
  },
}

export const SFD_023: Card = {
  id: 'SFD-023', cardNo: 'SFD·023/221', name: '透体圣光', category: 'spell',
  domains: ['red'], energy: 2, keywords: ['回响'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '回响2红;战场上一名单位2点,然后最多另一名(含基地)2点' }],
}

export const ECHO_SPELL_CARDS_498: readonly Card[] = [SFD_114, SFD_023]
