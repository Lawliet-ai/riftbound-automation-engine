                                                                        
                                                                     
                                                    
                                                  
                              
                                            
  
           
                                                                    
                                                                          
                                                                                     
                        
                                                                  
                       
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { canPayFromState } from '../../src/game/economy'
import { playBannedFor } from './longtail-12'                                                    
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { lockUnitDropToStandby } from '../../src/keywords/standby'                           
import { CARD_CATEGORIES } from '../cardCategories'
import { banishPlayCost, playFromEffectChoice, optionalExtraResolve, playUnitExtras } from './play-from-deck'                                                     

export const SFD_111_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '你可以选择将一名单位从手牌打出到你控制的一处战场，其费用减少{{3}}。'

export const SFD_111_PICK = 'assistPick'
export const SFD_111_DEST = 'assistDest'
export const SFD_111_SKIP = 'skip'
export const SFD_111_REDUCE = 3

   
                                                                    
                                                    
                                                           
                                                                  
                                                                
                                                                             
                                               
                                                   
   
export function unitsInHand(state: GameState, controller: PlayerId): string[] {
  return (state.zones[`hand:${controller}` as ZoneId]?.contents ?? [])
    .filter((oid) => CARD_CATEGORIES[state.objects[oid]?.defId ?? ''] === 'unit')
    .map((oid) => oid as string)
}

export const SFD_111_SPEC: PlaySpec = {
  defId: 'SFD-111', cardNo: 'SFD·111/221', name: '前来相助', kind: 'spell',
  cost: { mana: 2, pips: [['orange']] }, // ㊶ cardCosts 实测 2 法力 1 橙 pip
  keywords: ['待命', '迅捷'],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller, standbyBattlefield }: { movedCardOid: string; controller: PlayerId; standbyBattlefield?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[SFD_111_PICK] === undefined) {
                                                                               
                                                    
        const bfs = lockUnitDropToStandby(controlledBattlefields(state, controller), standbyBattlefield)                           
        const cands = unitsInHand(state, controller)
          .filter((oid) => bfs.some((z) => !playBannedFor(state, controller, state.objects[oid as ObjId]?.defId ?? '', z, oid)))
        if (cands.length === 0) return null                                     
        return {
          itemId: `spell:${movedCardOid}:SFD-111`, controller, key: SFD_111_PICK,
          prompt: '前来相助:可将一名单位从手牌打出到你控制的战场(费用减3)',
          candidates: [
            ...cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
            { id: SFD_111_SKIP, label: '不打出(「你可以选择」)' },
          ],
        }
      }
      const pick = chosen[SFD_111_PICK]
      if (pick === SFD_111_SKIP) return null
      if (chosen[SFD_111_DEST] !== undefined) {
                                                                                            
                                                                                        
                                                                                                    
                                                                              
        const pickDefId = state.objects[pick as ObjId]?.defId ?? ''
        return playFromEffectChoice(state, controller, pickDefId, {
          itemId: `spell:${movedCardOid}:SFD-111`, controller, key: SFD_111_DEST, prompt: '前来相助:打出到你控制的哪处战场?',
        }, chosen, banishPlayCost(pickDefId, SFD_111_REDUCE))
      }
                                                                                         
                                                      
      const pickDef = state.objects[pick as ObjId]?.defId ?? ''
      const dests = lockUnitDropToStandby(controlledBattlefields(state, controller), standbyBattlefield)                
        .filter((z) => !playBannedFor(state, controller, pickDef, z, pick))
      if (dests.length === 0) return null
      return {
        itemId: `spell:${movedCardOid}:SFD-111`, controller, key: SFD_111_DEST,
        prompt: '前来相助:打出到你控制的哪处战场?',
        candidates: dests.map((z) => ({ id: z, label: z })),
      }
    },
  makeResolve:
    ({ movedCardOid, controller, standbyBattlefield }: { movedCardOid: string; controller: PlayerId; standbyBattlefield?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const pick = chosen?.[SFD_111_PICK]
      const dest = chosen?.[SFD_111_DEST]
      if (pick === undefined || pick === SFD_111_SKIP || dest === undefined) return []
                              
      if (!unitsInHand(state, controller).includes(pick)) return []
      if (!lockUnitDropToStandby(controlledBattlefields(state, controller), standbyBattlefield).includes(dest)) return []                       
      const defId = state.objects[pick as ObjId]?.defId ?? ''
      if (playBannedFor(state, controller, defId, dest, pick)) return []                              
      const cost = banishPlayCost(defId, SFD_111_REDUCE)                              
      if (!canPayFromState(state, controller, cost)) return []                   
                                                                                                                
                                                                                                                                        
                                                                                                                       
      const x = optionalExtraResolve(state, controller, defId, SFD_111_DEST, chosen, cost)
      return [...x.preRest, {
        kind: 'playUnit',
        unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid(㊼ play-from-deck L319 同注)
        player: controller,
        play: { card: pick as ObjId, to: dest as ZoneId, cost, by: movedCardOid as ObjId, ...playUnitExtras(x) },
      } as GameEvent, ...x.post]
    },
}

export const SFD_111: Card = {
  id: 'SFD-111', cardNo: 'SFD·111/221', name: '前来相助', category: 'spell',
  domains: ['orange'], energy: 2, keywords: ['待命', '迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '可将一名单位从手牌打出到我控战场,费用减3(SFD_111_SPEC)' }],
}
