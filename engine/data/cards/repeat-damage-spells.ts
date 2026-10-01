                                                                 
          
                                                               
                                         
                                       
  
                                                    
                                
                                           
                                 
                                                      
                                                   
                                         
                                          
                                                                  
                                                              
                                  
                                                            
                                                                   
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import { multiSelectChoice, multiSelectPicked, multiSelectPickedLegal } from '../../src/loop/multiSelect'
import { fieldedUnitCandidates } from './activated-batch'

                                                                              
                                                                                  
                                                                               
export const OGN_029_CARD_EFFECT = '对一名单位造成3点伤害。\n对一名单位造成3点伤害。'
export const OGN_248_CARD_EFFECT =
  '对一名单位造成2点伤害。\n对一名单位造成2点伤害。\n对一名单位造成2点伤害。\n对一名单位造成2点伤害。\n对一名单位造成2点伤害。\n对一名单位造成2点伤害。'

                                                                                               
export const OGN_029_ERRATA = OGN_029_CARD_EFFECT
export const OGN_248_ERRATA = OGN_248_CARD_EFFECT

export const OGN_029_TIMES = 2
export const OGN_029_DAMAGE = 3
export const OGN_248_TIMES = 6
export const OGN_248_DAMAGE = 2

   
                                            
                                    
   
export function makeRepeatDamageSpec(opts: {
  readonly defId: string
  readonly cardNo: string
  readonly name: string
  readonly cost: PlaySpec['cost']
  readonly times: number
  readonly amount: number
  readonly keywords?: readonly string[]
}): PlaySpec {
  const prefix = `${opts.defId}:hit`
  return {
    defId: opts.defId, cardNo: opts.cardNo, name: opts.name, kind: 'spell',
    cost: opts.cost,
    keywords: opts.keywords ?? [],
    targetlessChoice: true, // ★499:选择走问链(修跨轮 bug)
    target: 'custom',
    legalTargets: (): string[] => [],
    choiceTiming: 'confirm', // ★1800【缺陷 257 · §355.7】「进行 N 次:对一名单位造成 X 点伤害」= 每次各选取目标,全在打出时选定
    makeNextChoice:
      ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
      (state: GameState, chosen: Readonly<Record<string, string>>) => {
        if (multiSelectPicked(chosen, prefix).length >= opts.times) return null              
        return multiSelectChoice({
          itemId: `play:${movedCardOid}`,
          controller,
          prefix,
          prompt: `${opts.name}:进行${opts.times}次,每次对一名单位造成${opts.amount}点伤害`,
          allowRepeat: true, // ★ 勘误展开成 N 条独立指示 ⇒ 同一个单位可以挨多下
          required: true, // ★「进行 N 次」不是「最多 N 次」⇒ 不给"够了"档
                                                                                                                               
          isTarget: true, // 卡文「对一名单位造成 N 点伤害」×N 次 = 每次各选取一次目标(§355.7)
          candidates: (st) => fieldedUnitCandidates(st, controller)
            .map((oid) => ({ id: oid, label: `${st.objects[oid]?.defId ?? oid}` })),
        })(state, chosen)
      },
    makeResolve: ({ controller, movedCardOid }: { controller: PlayerId; movedCardOid: string }) =>
      (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] =>
                                                                        
                                                              
        multiSelectPickedLegal(chosen, prefix, state, (st) => fieldedUnitCandidates(st, controller))
          .slice(0, opts.times)
          // §428.5.c 归因:sourcePlayer 认【人】、source 认【哪一张卡】
          .map((oid) => ({
            kind: 'damage', target: oid as ObjId, amount: opts.amount,
            sourcePlayer: controller, source: movedCardOid as ObjId,
          }) as GameEvent),
  }
}

export const OGN_029_SPEC: PlaySpec = makeRepeatDamageSpec({
  defId: 'OGN-029', cardNo: 'OGN·029/298', name: '星落',
  cost: { mana: 2, pips: [['red'], ['red']] }, // cardCosts 实测:2 法力 + 2 红 pip
  times: OGN_029_TIMES, amount: OGN_029_DAMAGE,
})

export const OGN_248_SPEC: PlaySpec = makeRepeatDamageSpec({
  defId: 'OGN-248', cardNo: 'OGN·248/298', name: '艾卡西亚暴雨',
                                                          
  cost: { mana: 7, pips: [['red', 'blue'], ['red', 'blue'], ['red', 'blue']] },
  times: OGN_248_TIMES, amount: OGN_248_DAMAGE,
})

export const OGN_029: Card = {
  id: 'OGN-029', cardNo: 'OGN·029/298', name: '星落', category: 'spell',
  domains: ['red'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '两次各对一名单位造成3点伤害(可重复选同一个)' }],
}

export const OGN_248: Card = {
  id: 'OGN-248', cardNo: 'OGN·248/298', name: '艾卡西亚暴雨', category: 'spell',
  domains: ['red', 'blue'], energy: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '六次各对一名单位造成2点伤害(可重复选同一个)' }],
}
