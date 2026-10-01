                                                                     
                                                        
                           
                                                        
  
                                               
                                                                                      
                                           
                                                                          
                                                         
                                              
                                             
  
                                                   
                                                                     
                                                                                   
                                                                  
                                         
                                                                 
                                                                   
                                                          
                                                   
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { banishedBy } from '../../src/actions/banish'
import { fieldedUnits } from './activated-batch'
import { battlefieldUnits } from './diana-reactions'
import { playFromEffectChoice, unitDestinationResolve, optionalExtraResolve } from './play-from-deck'                                                         

export const SFD_200_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '放逐一名友方单位，然后让其拥有者将其打出，无视其费用。对战场上的一名敌方单位造成3点伤害。放逐此牌。'

                               
export const SFD_200_DAMAGE = 3
                                   
export const SFD_200_ALLY = 'blinkAlly'
export const SFD_200_FOE = 'blinkFoe'

   
                                                                  
   
export function blinkAllies(state: GameState, controller: PlayerId): readonly ObjId[] {
  return fieldedUnits(state, { of: controller, friendly: true })
}

   
                                                                  
   
export function blinkFoes(state: GameState, controller: PlayerId): readonly ObjId[] {
                                                                                                     
  return (battlefieldUnits(state) as unknown as readonly ObjId[])
    .filter((oid) => state.objects[oid]?.controller !== controller)
}

export const SFD_200_SPEC: PlaySpec = {
  defId: 'SFD-200', cardNo: 'SFD·200/221', name: '奥术跃迁',
  kind: 'spell',
                                                 
  cost: { mana: 3, pips: [['blue', 'purple']] },
  keywords: ['迅捷'], // §806/§308.1.a 我方回合或法术对决开环可打
  target: 'none',
  legalTargets: (): string[] => [],
                                                                      
                                                        
                                                                         
                                             
  choiceTiming: 'confirm',
                                            
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[SFD_200_ALLY] === undefined) {
        const cands = blinkAllies(state, controller)
                                                             
                                                        
                                                          
                                                                  
                                                                      
                                                                              
                                                                             
        return {
          itemId: `spell:${movedCardOid}:SFD-200`,
          controller,
          key: SFD_200_ALLY,
          prompt: '奥术跃迁:放逐哪名友方单位(其拥有者随后无视费用将其打出)',
          isTarget: true, // ★1782 放逐一名友方单位
          candidates: cands.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
        }
      }
      if (chosen[SFD_200_FOE] === undefined) {
        const cands = blinkFoes(state, controller)
                                                                  
                                                                    
        return {
          itemId: `spell:${movedCardOid}:SFD-200`,
          controller,
          key: SFD_200_FOE,
          prompt: `奥术跃迁:对战场上的哪名敌方单位造成 ${SFD_200_DAMAGE} 点伤害`,
          isTarget: true, // ★1782 对战场上的一名敌方单位造成3点伤害
          candidates: cands.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
        }
      }
      return null
    },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const out: GameEvent[] = []
      const ally = chosen?.[SFD_200_ALLY]
                                                                    
                                                                                                            
      if (ally !== undefined && state.objects[ally as ObjId] && blinkAllies(state, controller).includes(ally as ObjId)) {
        out.push({ kind: 'banish', target: ally as ObjId, by: movedCardOid as ObjId } as GameEvent)
      }
      const foe = chosen?.[SFD_200_FOE]
                                                                               
                                                                              
                                                           
      if (foe !== undefined && blinkFoes(state, controller).includes(foe as ObjId)) {
                                    
        out.push({
          kind: 'damage', target: foe as ObjId, amount: SFD_200_DAMAGE,
          source: movedCardOid as ObjId, sourcePlayer: controller,
        } as GameEvent)
      }
                                                               
                                                                  
                                                                                   
                                                                        
                                                            
                                                               
                                                                    
      const relayWillFire = out.some((e) => e.kind === 'banish')
      if (!relayWillFire) out.push({ kind: 'banish', target: movedCardOid as ObjId } as GameEvent)
      return out
    },
}

   
                                               
                                                                   
                                             
   
export const BLINK_TO = 'blinkTo'                          

export function makeBlinkPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-200:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-200',
    event: 'banished', by: 'any', // 认的是"我放逐的",不是"我引发的这批"(铁律153)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        const card = (ev as unknown as { card?: ObjId }).card
        return card !== undefined && banishedBy(state, selfOid).includes(card)
      },
    }],
                                                                                     
    nextChoice: (state: GameState, ev: GameEvent, chosen) => {
      if (chosen[BLINK_TO] !== undefined) return null
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o || !banishedBy(state, selfOid).includes(card as ObjId)) return null                                             
      return playFromEffectChoice(state, o.owner, o.defId, {
        itemId: `trig:SFD-200:play:${selfOid}`, controller: o.owner, key: BLINK_TO, prompt: '奥术跃迁:把它打出到哪里?',
      }, chosen)
    },
    effect: (state: GameState, ev: GameEvent, chosen): readonly GameEvent[] => {
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o) return []
                                                   
                                                                       
                                                          
                                                                           
                                                       
                                                                     
                                                                     
                                                             
      const selfNow = Object.entries(state.objects)
        .find(([, x]) => x.defId === 'SFD-200' && x.controller === controller
          && (String(x.zone).startsWith('chain') || String(x.zone).startsWith('discard')))?.[0]
                                                                                   
      const x = optionalExtraResolve(state, o.owner, o.defId, BLINK_TO, chosen)                              
      const dest = unitDestinationResolve(state, o.owner, o.defId, chosen?.[BLINK_TO], x.grant)                        
      return [
        ...(dest !== undefined ? [...x.pre, { kind: 'playFree', obj: card as ObjId, player: o.owner, to: dest, ...x.flags } as GameEvent, ...x.post] : []),
        { kind: 'banish', target: (selfNow ?? selfOid) as ObjId } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const SFD_200: Card = {
  id: 'SFD-200', cardNo: 'SFD·200/221', name: '奥术跃迁', category: 'spell',
  domains: ['blue', 'purple'], energy: 3, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '放逐一名友方单位,其拥有者无视费用打出;对战场上一名敌方单位造成3点;放逐此牌' }],
}
