                                                                      
                                                     
                                 
                                                    
                                                   
                            
  
            
                                                         
                                                               
                                                                
                                       
                                                                        
                                                            
                                                                
                                                            
                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec, PlayCtx } from '../../src/loop/playSpec'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'                          
import { isUnit } from '../../src/state/cardTypes'
import { compileEffect } from '../../src/dsl/effectSpec'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { groupSubsetChoice, groupSubsetApplied, controllerAtResolve, type GroupTargetSpec } from '../../src/loop/groupTargets'                   
import { topOfDeck } from '../../src/keywords/insight'
import { lookTakeRecycle, takenReal } from './batch-play-triggers'
import { onField } from './activated-batch2'

                                                                          
                                                         
                                                          
                                                                          
                                                                      
                                                                  
                                                                                  
                                                               
                                                         
                                                             

export const SFD_080_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '{{回响1蓝色}}（你可以选择支付此额外费用，以重复此法术效果。）\n' +
  '对同一位置的最多三名单位各造成1点伤害。'

export const SFD_080_MAX = 3
export const SFD_080_DAMAGE = 1
const BELLOWS_PREFIX = 'SFD-080:burn'

   
                       
                                             
                    
                                                    
   
export function bellowsCandidates(
  state: GameState, picked: readonly string[],
): readonly ObjId[] {
  const lockZone = picked.length === 0 ? undefined : state.objects[picked[0] as ObjId]?.zone
  return Object.values(state.objects)
    .filter((o) => onField(state, o) && isUnit(o) && (lockZone === undefined || o.zone === lockZone))
    .map((o) => o.oid)
    .sort()
}

   
                                                              
                                                      
                                                           
                                                            
   
function bellowsSpec(
  movedCardOid: string, controller: PlayerId, source: Readonly<Record<string, string>>, copy = 0,
): GroupTargetSpec {
  return {
    itemId: `play:${movedCardOid}`,
    controller,
                                                                  
    groupKey: echoCopyKey('bellows', copy),
    initial: multiSelectPicked(source, echoCopyKey(BELLOWS_PREFIX, copy)),
                                                      
    memberLegal: (st, o) => {
      const obj = st.objects[o as ObjId]
      return obj !== undefined && onField(st, obj) && isUnit(obj)
    },
    groupOk: (st, group) => {
      if (group.length === 0) return true                    
      return new Set(group.map((o) => String(st.objects[o as ObjId]?.zone ?? ''))).size === 1
    },
    prompt: '风箱炎息:这些目标已不再整体满足限制(不在同一位置)——从最初选定的单位里挑一个合法子集',
    label: (st, o) => `${st.objects[o as ObjId]?.defId ?? o}`,
  }
}

export const SFD_080_SPEC: PlaySpec = {
  defId: 'SFD-080', cardNo: 'SFD·080/221', name: '风箱炎息', kind: 'spell',
  cost: { mana: 1, pips: [['blue']] }, // cardCosts 实测:1 法力 + 1 蓝 pip
  echo: { mana: 1, pips: [['blue']] }, // §820 {{回响1蓝色}}
  keywords: ['迅捷', '回响'], // ② 卡面横幅两个都印着 ⇒ 三处都登(498 漏过一次)
  targetlessChoice: true, // ★499:选择走问链(修跨轮 bug:不加这行真流程里一条都列不出来)
  target: 'custom',
  legalTargets: (): string[] => [],
  firstAskOptional: true, // ★1802c §355.13:卡文「对同一位置的最多三名单位」⇒ 含 0
                                                       
                                                          
  makeConfirmChoice:
    ({ movedCardOid, controller, echoTimes }: PlayCtx) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                            
      for (let c = 0; c <= (echoTimes ?? 0); c++) {
        const prefix = echoCopyKey(BELLOWS_PREFIX, c)
                                                                     
        if (multiSelectPicked(chosen, prefix).length >= SFD_080_MAX) continue
        const q = multiSelectChoice({
          itemId: `play:${movedCardOid}`,
          controller,
          prefix,
          prompt: `风箱炎息:对同一位置的最多${SFD_080_MAX}名单位各造成${SFD_080_DAMAGE}点伤害`,
          isTarget: true, // ★1782 对同一位置的最多三名单位各造成1点伤害
                                                                 
          candidates: (st, picked) => bellowsCandidates(st, picked)
            .map((oid) => ({ id: oid as string, label: `${st.objects[oid]?.defId ?? oid}` })),
        })(state, chosen)
        if (q !== null) return q
      }
      return null
    },
                                                             
                                            
  makeNextChoice:
    ({ movedCardOid, controller, echoTimes }: PlayCtx) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                        
      for (let c = 0; c <= (echoTimes ?? 0); c++) {
                                                   
        if (multiSelectPicked(chosen, echoCopyKey(BELLOWS_PREFIX, c)).length === 0) continue
                                                                       
        const cur = controllerAtResolve(state, movedCardOid, controller)
        const q = groupSubsetChoice(bellowsSpec(movedCardOid, cur, chosen, c))(state, chosen)
        if (q !== null) return q
      }
      return null
    },
  makeResolve:
    ({ movedCardOid, controller, echoIndex }: PlayCtx) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem): readonly GameEvent[] => {
                                                                 
      const cur = (self?.controller ?? controller) as PlayerId
                                                       
      const copy = echoIndex ?? 0
                                                                          
                                                                 
                                                          
      const source = { ...(chosen ?? {}), ...(self?.frozenChoices ?? {}) }
      return groupSubsetApplied(state, chosen, bellowsSpec(movedCardOid, cur, source, copy))
        .map((oid) => ({
          kind: 'damage', target: oid as ObjId, amount: SFD_080_DAMAGE,
          source: movedCardOid as ObjId, sourcePlayer: controller,
        }))
    },
}

export const SFD_080: Card = {
  id: 'SFD-080', cardNo: 'SFD·080/221', name: '风箱炎息', category: 'spell',
  domains: ['blue'], energy: 1, keywords: ['迅捷', '回响'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[迅捷];回响1蓝;同一位置最多三名单位各1点(含基地、不分敌我)' }],
}

                                                                          
export const SFD_122_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '{{回响紫色}}（你可以选择支付此额外费用，以重复此法术效果。）\n' +
  '查看你主牌堆顶部的两张牌。抽取其中一张，然后回收另一张卡牌。'

export const SFD_122_LOOK = 2
export const SFD_122_PICK = 'foresightPick'

   
                                                                 
                                                                              
   
const echoCopyKey = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)

                                                
export function foresightCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return topOfDeck(state, controller, SFD_122_LOOK)
}

   
                                                       
                                                              
   
const foresightRunOf = (key: string) => compileEffect({ then: lookTakeRecycle(SFD_122_LOOK, key, { reveal: false }) })

export const SFD_122_SPEC: PlaySpec = {
  defId: 'SFD-122', cardNo: 'SFD·122/221', name: '预判攻势', kind: 'spell',
  cost: { mana: 0, pips: [['purple']] }, // cardCosts 实测:0 法力 + 1 紫 pip
  echo: { mana: 0, pips: [['purple']] }, // §820 {{回响紫色}}(只有一枚 pip,没有法力)
  keywords: ['迅捷', '回响'],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller, echoTimes }: PlayCtx) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                                                    
      for (let c = 0; c <= (echoTimes ?? 0); c++) {
        const key = echoCopyKey(SFD_122_PICK, c)
        if (chosen[key] !== undefined) continue                
        const cands = foresightCandidates(state, controller)
        if (cands.length === 0) continue                         
        return {
          itemId: `spell:${movedCardOid}:SFD-122`,
          controller,
          key,
          prompt: `预判攻势:从顶${SFD_122_LOOK}张里抽取一张(另一张回收)`,
                                                                  
          candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
      return null
    },
  makeResolve:
    ({ movedCardOid, controller, echoIndex }: PlayCtx) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const c = chosen ?? {}
                                                                  
      const key = echoCopyKey(SFD_122_PICK, echoIndex ?? 0)
                                                
      const pick = c[key]
      const ok = takenReal(pick) && (foresightCandidates(state, controller) as readonly string[]).includes(pick as string)
      const eff: Readonly<Record<string, string>> = ok ? c : {}
      return foresightRunOf(key)({
        state, controller, chosen: eff,
        selfOid: movedCardOid as ObjId,
        ev: { kind: 'playSpell', player: controller, cardOid: movedCardOid as ObjId } ,
      })
    },
}

export const SFD_122: Card = {
  id: 'SFD-122', cardNo: 'SFD·122/221', name: '预判攻势', category: 'spell',
  domains: ['purple'], energy: 0, keywords: ['迅捷', '回响'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[迅捷];回响紫;查看顶两张、抽一张、回收另一张(不发 revealed)' }],
}

export const ECHO_SPELL_CARDS_499: readonly Card[] = [SFD_080, SFD_122]
