                              
  
                             
                                                    
                                                   
                                                     
                                                 
                                         
  
                                                      
                                       
                                               
                                 

import type { Card, Domain } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { buffedUnitsOf, canConsumeBuff } from '../../src/keywords/buff'                                                               
import type { Trigger } from '../../src/dsl/trigger'
import { multiSelectChoice, multiSelectPicked, multiSelectPickedLegal } from '../../src/loop/multiSelect'                 
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { fieldedUnits } from './activated-batch'                                               
import { scoredHere } from './scored-here'                                   

   
                                  
                            
   
export const CONSUME_OWN_BUFF_COST = {
  label: '消耗我的增益',
                                                                               
  pay: (state: GameState, controller: PlayerId, selfOid: string): GameState | null => {
    if (!canConsumeBuff(state, selfOid as ObjId, controller)) return null                         
    return state
  },
  payEvents: (_state: GameState, controller: PlayerId, selfOid: string): readonly GameEvent[] =>
    [{ kind: 'consumeBuff', target: selfOid as ObjId, by: controller } as GameEvent],
}

                                                        
                                                                 
                                                             
                                         
                                                                             
                                                                               
                                               
                                                                  
                                                  
                                                                
                                               
                                                                
export const SETT_DEFIDS: readonly string[] = ['OGN-164', 'VEN-SP4']

   
                             
                                                       
                          
  
                                       
                                     
   
export const SETT_MIGHT = 4

export const makeSettMightSpec = (defId: string) => ({
  key: 'sett:consumeBuff',
  label: `消耗我的增益:我本回合内战力+${SETT_MIGHT}`,
  cost: {},
  extraCost: CONSUME_OWN_BUFF_COST,
  makeResolve: ({ selfOid }: { selfOid: string; controller: PlayerId; target?: string }) =>
    (): readonly GameEvent[] => [{
      kind: 'addEffect',
      effect: {
                                                      
        id: `${defId}:might:${selfOid}`,
        duration: 'thisTurn',
        fromPassive: false,
        predicate: (x: { oid: ObjId }) => x.oid === (selfOid as ObjId),
        modification: { kind: 'addMight', delta: SETT_MIGHT },
      },
    }],
})

                                       
export const SETT_MIGHT_SPEC = makeSettMightSpec('OGN-164')

                              
export const SETT_ACTIVATED: Readonly<Record<string, readonly ActivatedSpec[]>> =
  Object.fromEntries(SETT_DEFIDS.map((id) => [id, [makeSettMightSpec(id) as unknown as ActivatedSpec]]))

   
                                    
  
                                                         
                                                        
  
                                             
                                                      
                                                  
   
function settConquered(state: GameState, selfOid: ObjId, ev: GameEvent): boolean {
  if (ev.kind !== 'conquer') return false
                                                      
                                                    
  return scoredHere(state, selfOid, ev, ['conquer'])
}

export function makeSettBuffTriggers(defId: string, selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
                                                                
                                 
                                                                         
                                         
  const grantEffect = compileEffect({ then: [{ op: 'grantBuff', target: { ref: 'self' } }] })
  const grant: Trigger['effect'] = (state, ev, chosen) =>
    grantEffect({ state, selfOid, controller, ev, chosen: chosen ?? {} })
  const abilityKey = `${defId}:selfBuff:${selfOid}`
  return [
    compileTrigger({
      id: `${abilityKey}:play`, rawId: true, sourceDefId: defId,
      event: 'playUnit',
      abilityKey,
      when: [{ kind: 'subjectIsSelf' }], // 「当【我】被打出时」
      effect: grant,
    }, selfOid, controller),
    compileTrigger({
      id: `${abilityKey}:conquer`, rawId: true, sourceDefId: defId,
      event: 'conquer',
      abilityKey,
                                                                  
                                                              
      when: [{ kind: 'custom', test: (ev, state) => settConquered(state, selfOid, ev) }],
      effect: grant,
    }, selfOid, controller),
  ]
}

                                                      
export const SETT_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(SETT_DEFIDS.map((id) => [id, (oid: ObjId, ctrl: PlayerId) => makeSettBuffTriggers(id, oid, ctrl)]))

   
                                                                 
                                         
   
export const VEN_SP4: Card = {
  id: 'VEN-SP4', cardNo: 'VEN·SP4', name: '瑟提', category: 'unit', // 英雄单位 → unit
  domains: ['orange'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '与 OGN-164 同卡不同号:技能实现共用本文件的 SETT_* 一族' }],
}

                                                
  
              
                          
                                              
                     
                            
                                           
                        
  
                                                 
                                                            
                                
                                                            

                                   
export const CONSUME_BUFF_ALT_COST = {
  label: '消耗一个增益(无视本法术费用)',
  cost: {}, // 无视费用 ⇒ 改付之后不再付任何资源
  options: (state: GameState, controller: PlayerId): readonly { readonly id: string; readonly label: string }[] =>
    buffedUnitsOf(state, controller).map((oid) => ({
      id: oid as string,
      label: `消耗 ${state.objects[oid]?.defId ?? oid} 身上的增益`,
    })),
                                                               
                                                       
                                                   
                                                  
                                                                
                                                           
                                            
  pay: (state: GameState, controller: PlayerId, choice?: string): GameState | null => {
    if (choice === undefined) return null                        
    if (!canConsumeBuff(state, choice as ObjId, controller)) return null
    return state
  },
  payEvents: (_state: GameState, controller: PlayerId, choice?: string): readonly GameEvent[] =>
    choice === undefined ? [] : [{ kind: 'consumeBuff', target: choice as ObjId, by: controller } as GameEvent],
}

                              
export const PAIN_SPEC = {
  defId: 'OGN-146',
  cardNo: 'OGN·146/298',
  name: '痛殴',
  kind: 'spell' as const,
  cost: { mana: 2 },
  keywords: ['迅捷'],
  target: 'custom' as const,
  altCost: CONSUME_BUFF_ALT_COST,
                                                                
                                                            
  legalTargets: (state: GameState): readonly string[] => fieldedUnits(state),
  makeResolve:
    ({ target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (): readonly GameEvent[] =>
                                          
      target === undefined ? [] : [{ kind: 'statusChange', target: target as ObjId, key: 'dormant', value: false }],
}

                                    
export const GLORY_SPEC = {
  defId: 'OGN-207',
  cardNo: 'OGN·207/298',
  name: '荣耀召唤',
  kind: 'spell' as const,
  cost: { mana: 3 },
  keywords: ['反应'],
  target: 'custom' as const,
  altCost: CONSUME_BUFF_ALT_COST,
                                                                
                                                            
  legalTargets: (state: GameState): readonly string[] => fieldedUnits(state),
  makeResolve:
    ({ target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (): readonly GameEvent[] =>
      target === undefined ? [] : [{
        kind: 'addEffect',
        effect: {
          id: `OGN-207:might:${target}`,
          duration: 'thisTurn',
          fromPassive: false,
          predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
          modification: { kind: 'addMight', delta: 3 },
        },
      }],
}

                                                      
  
                                                 
                                               
                                         

   
                 
  
                         
                                                                                                          
                                                                     
                                                                              
  
                                                                     
                                             
                                                              
                                                       
                                                      
                                                              
                                          
                                
                                                                
   
function friendlyFieldedUnits(state: GameState, controller: PlayerId): readonly ObjId[] {
  return fieldedUnits(state, { of: controller, friendly: true })
}

   
                               
                                             
  
                                           
                                                        
                                                    
   
export function makeAlbusTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const PREFIX = 'albusBuff'
                                                       
                                                    
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: ({ chosen, state }): readonly GameEvent[] => {
                                                                             
                                                                     
        const live = new Set(buffedUnitsOf(state, controller).map((o) => o as string))
        const picked = multiSelectPicked(chosen, PREFIX).filter((oid) => live.has(oid))
        if (picked.length === 0) return []
        return [
          ...picked.map((oid): GameEvent => ({ kind: 'consumeBuff', target: oid as ObjId, by: controller })),
                                   
          { kind: 'summonRune', player: controller, count: picked.length, dormant: true },
        ]
      },
    }],
  })
  return {
    ...compileTrigger({
      id: 'OGN-230:runes',
      event: 'playUnit',
      when: [{ kind: 'subjectIsSelf' }], // 「当你打出【我】时」
      nextChoice: (state, _ev, chosen) =>
        multiSelectChoice({
          itemId: `trig:OGN-230:${selfOid}`,
          controller,
          prefix: PREFIX,
          prompt: '阿不思:可消耗任意数量的增益,每消耗一个召出一枚休眠符文',
          candidates: (st) =>
            buffedUnitsOf(st, controller).map((oid) => ({
              id: oid as string,
              label: `消耗 ${st.objects[oid]?.defId ?? oid} 身上的增益`,
            })),
        })(state, chosen),
      effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
    }, selfOid, controller),
    sourceDefId: 'OGN-230', // ⚠️ TriggerSpec 还收不到这个字段,编译后补回(界面要显示技能来源)
  }
}

   
                                   
                                               
                     
  
                                         
                                                 
   
                                                       
                                               
export function openActionCandidates(state: GameState, controller: PlayerId): string[] {
  return buffedUnitsOf(state, controller).map((oid) => oid as string)
}
export const OPEN_ACTION_SPEC = {
  defId: 'OGN-153',
  cardNo: 'OGN·153/298',
  name: '公开行动',
  kind: 'spell' as const,
                                                              
  cost: { mana: 5, pips: [['orange'], ['orange']] },
  keywords: ['迅捷'],
  target: 'none' as const,
  legalTargets: (): readonly string[] => [],
  choiceTiming: 'confirm' as const, // ★1800【缺陷 257 · §355.7】「选择任意数量拥有增益的友方单位」= 打出时选目标
  firstAskOptional: true as const, // ★1802c §355.13:卡文「选择**任意数量**拥有增益的友方单位」⇒ 含 0
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      multiSelectChoice({
        itemId: `play:${movedCardOid}`,
        controller,
        prefix: 'openAct',
        prompt: '公开行动:可选任意数量拥有增益的友方单位,消耗其增益让它变为活跃',
        isTarget: true, // ★1782 选择任意数量拥有增益的友方单位,消耗…增益,以此让**他们**变为活跃状态
        candidates: (st) =>
          openActionCandidates(st, controller).map((oid) => ({
            id: oid,
            label: `消耗 ${st.objects[oid as ObjId]?.defId ?? oid} 的增益并使其活跃`,
          })),
      })(state, chosen),
  makeResolve:
    ({ controller }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                            
                                                      
      const picked = multiSelectPickedLegal(chosen, 'openAct', state,
        (st) => openActionCandidates(st, controller))
      const evs: GameEvent[] = []
      for (const oid of picked) {
        evs.push({ kind: 'consumeBuff', target: oid as ObjId, by: controller })
        evs.push({ kind: 'statusChange', target: oid as ObjId, key: 'dormant', value: false })
      }
                                                    
      for (const oid of friendlyFieldedUnits(state, controller)) {
        evs.push({ kind: 'grantBuff', target: oid })
      }
      return evs
    },
}


                                                                  
                                                          
                                                                
                                                                  
                                                                 
                                              
                                                                          
                
const spellCard = (
  id: string, cardNo: string, name: string, domain: Domain, energy: number, keywords: readonly string[],
): Card => ({
  id, cardNo, name, category: 'spell',
  domains: [domain], energy, keywords, playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '消耗增益族法术(见同名 SPEC)' }],
})
                                  
export const OGN_146: Card = spellCard('OGN-146', 'OGN·146/298', '痛殴', 'orange', 2, ['迅捷'])
                                   
export const OGN_153: Card = spellCard('OGN-153', 'OGN·153/298', '公开行动', 'orange', 5, ['迅捷'])
                                    
export const OGN_207: Card = spellCard('OGN-207', 'OGN·207/298', '荣耀召唤', 'yellow', 3, ['反应'])

                                                                                                    
                                                                                                     
                                                                                                                      
export const OGN_146_CARD_EFFECT = '{{迅捷}}（可在你的回合或法术对决中打出。）\n打出此牌时，你可以选择消耗一个增益作为额外费用。若如此做，则无视此法术的费用。\n让一名单位变为活跃状态。'

                                                                                                      
                                                                                                                 
                                                                                                                                
export const OGN_207_CARD_EFFECT = '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n打出此牌时，你可以选择消耗一个增益作为额外费用。若如此做，则无视此法术的费用。\n给予一名单位在本回合内{{S}}+3。'
