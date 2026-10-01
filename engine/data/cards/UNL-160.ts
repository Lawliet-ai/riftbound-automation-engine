                                                                          
                                                                    
                                                        
                                              
                        
  
               
                                                                            
                                          
                                                           
                                                                         
                                                        
                                          
                                                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { selfOnBattlefield } from './backline-heroes'                             
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { WAR_HAWK_TOKEN } from './reprint-batch'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, tokenHasteCost } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       
                                           
export const UNL_160_HASTE_KEYS = [hasteKeyOf('UNL-160:hawks', 1), hasteKeyOf('UNL-160:hawks', 2)] as const

export const UNL_160_CARD_EFFECT =
  '{{横置}}：打出两名1{{S}}的“战鹰”，它们拥有{{法盾}}。我必须位于战场上才能使用此技能。'
  + '（对手必须支付{{A}}才能将拥有{{法盾}}的目标选作法术或技能的目标。）'

                                                            
                                                                    
                                                              
const onBattlefield = (state: GameState, _c: PlayerId, selfOid: string): boolean =>
  selfOnBattlefield(state, selfOid)

export const UNL_160_SPEC: ActivatedSpec = {
  key: 'UNL-160:hawks',
  label: '{{横置}} 打出两名战力 1 的战鹰(带{{法盾}})',
  cost: {}, // 冒号前只有 {横置}
  tapSelf: true,
  target: 'none',
  available: onBattlefield,
                                                                                                       
  makeNextChoice: ({ selfOid, controller }) => (state, chosen) => {
    const base = { itemId: `act:${selfOid}:UNL-160:hawks`, label: '战鹰' }
    return spawnTokenHasteChoice(state, controller, WAR_HAWK_TOKEN, { ...base, key: UNL_160_HASTE_KEYS[0] }, chosen)
      ?? spawnTokenHasteChoice(state, controller, WAR_HAWK_TOKEN, { ...base, key: UNL_160_HASTE_KEYS[1] }, chosen, hastePaidSoFar(chosen, [UNL_160_HASTE_KEYS[0]]))
  },
  makeResolve: ({ controller }: { controller: PlayerId }) => (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                    
    const x1 = spawnTokenHasteResolve(state, controller, WAR_HAWK_TOKEN, UNL_160_HASTE_KEYS[0], chosen)
    const x2 = spawnTokenHasteResolve(state, controller, WAR_HAWK_TOKEN, UNL_160_HASTE_KEYS[1], chosen, x1.ready ? tokenHasteCost() : undefined)                    
    return [
      ...x1.pre, ...x2.pre, // §204.1.b 费用在前:答付的那几枚各一条 spend [1][A]
      { kind: 'spawnToken', spec: WAR_HAWK_TOKEN, zone: asZoneId(`base:${controller}`), owner: controller, ...(x1.ready ? { ready: true } : {}) } as GameEvent,
      { kind: 'spawnToken', spec: WAR_HAWK_TOKEN, zone: asZoneId(`base:${controller}`), owner: controller, ...(x2.ready ? { ready: true } : {}) } as GameEvent,
      // ★1258【缺陷 160】这里【不再】手写补发 `playUnit` —— ★1154 起产地 `reduce.ts tokenPlaySignal` 已按 spawnToken 前后差集派生
      //   (带 `at` 落点、doubler 落两枚就派两条);卡自己再补一条就是【双发】,「当你打出一名单位时」的听众按一名单位收两次钱、给两次收益。
    ]
  },
}

export const UNL_160: Card = {
  id: 'UNL-160', cardNo: 'UNL-160/219', name: '绵绵魄罗', category: 'unit',
  domains: ['yellow'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '横置:打出两名带法盾的1[S]战鹰;必须在战场才能用(UNL_160_SPEC)' }],
}
