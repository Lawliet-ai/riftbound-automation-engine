                                                                    
                                        
                                         
                                                  
  
                                                     
                                                    
                                              
                                             
                                                                                       
                                               
                                       
  
                                 
                                         
                                                          
                                                                    
  
                                                            
                                                                               
                                                                 
                                                                
                                                                
                                           
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { PlaySpec } from '../../src/loop/playSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { resolveSelector } from '../../src/dsl/selector'
import { lookTakeRecycle, takenReal, LOOK_TOP3_UNIT } from './batch-play-triggers'
import { voidSproutChoice } from './SFD-018'        

export const UNL_032_CARD_EFFECT =
  '查看你主牌堆顶部的三张牌。你可以选择从中展示一名单位，并抽取该卡牌。回收其余的卡牌。'

                                         
export const UNL_032_LOOK = 3
export const UNL_032_ECHO = 2
                       
export const UNL_032_PICK = 'dragonPick'
export const UNL_032_SKIP = 'skip'

   
                                                                   
                                                                              
   
const echoCopyKey = (base: string, copy: number): string => (copy === 0 ? base : `${base}:echo:${copy + 1}`)

   
                                                                     
                                 
   
export function dragonDuoCandidates(state: GameState, controller: PlayerId): readonly string[] {
  return resolveSelector(state, LOOK_TOP3_UNIT, controller) as unknown as readonly string[]
}

   
                                         
                                                              
   
const runOf = (key: string) => compileEffect({ then: lookTakeRecycle(UNL_032_LOOK, key) })

export const UNL_032_SPEC: PlaySpec = {
  defId: 'UNL-032', cardNo: 'UNL-032/219', name: '龙虎双雄', kind: 'spell',
  cost: { mana: 2 }, // 卡面 2 法力,上游 pips=0 ⇒ 一枚都不写
  echo: { mana: UNL_032_ECHO }, // §820 [回响2];**不进** `CARD_KEYWORDS`
  keywords: [], // ⚠️ 卡文横幅只有 [回响2] ⇒ 印刷关键词是空的
  target: 'none', // 唯一的选择走问链
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller, echoTimes }: { movedCardOid: string; controller: PlayerId; echoTimes?: number }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
                                                                    
      for (let c = 0; c <= (echoTimes ?? 0); c++) {
        const key = echoCopyKey(UNL_032_PICK, c)
        if (chosen[key] !== undefined) continue                
        const cands = dragonDuoCandidates(state, controller)
                                                           
        if (cands.length === 0) continue
        return {
          itemId: `spell:${movedCardOid}:UNL-032`,
          controller,
          key,
          prompt: `龙虎双雄:从顶${UNL_032_LOOK}张里展示并抽取一名单位`,
          candidates: [
            ...cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
            { id: UNL_032_SKIP, label: '不选' }, // 「你可以选择」
          ],
        }
      }
      return voidSproutChoice(state, controller, chosen)                      
    },
  makeResolve:
    ({ movedCardOid, controller, echoIndex }: { movedCardOid: string; controller: PlayerId; echoIndex?: number }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const c = chosen ?? {}
                                                                  
      const key = echoCopyKey(UNL_032_PICK, echoIndex ?? 0)
                                                    
                                           
      const pick = c[key]
      const ok = takenReal(pick) && dragonDuoCandidates(state, controller).includes(pick as string)
      const eff: Readonly<Record<string, string>> = ok ? c : { ...c, [key]: UNL_032_SKIP }
                                                                     
      const ev: GameEvent = { kind: 'playSpell', player: controller, cardOid: movedCardOid as ObjId } as GameEvent
      return runOf(key)({ state, selfOid: movedCardOid as ObjId, controller, ev, chosen: eff })
    },
}

export const UNL_032: Card = {
  id: 'UNL-032', cardNo: 'UNL-032/219', name: '龙虎双雄', category: 'spell',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '查顶3张取一名单位进手牌,其余回收;[回响2](UNL_032_SPEC)' }],
}
