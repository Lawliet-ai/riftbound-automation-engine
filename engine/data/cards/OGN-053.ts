                                                                    
                                                     
                        
                                              
                                   
  
                                                                           
                                                            
                                                   
                                              
                                                     
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                              

export const OGN_053_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '给予一名友方单位增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）\n'
  + '在本回合内，所有增益可额外给予友方单位{{S}}+1。'

export const OGN_053_SPEC: PlaySpec = {
  defId: 'OGN-053', cardNo: 'OGN·053/298', name: '秘奥义！慈悲度魂落', kind: 'spell',
  cost: { mana: 3 }, // ㊶ cardCosts 实测 3 法力 0 pip
  keywords: ['待命', '迅捷'],
  target: 'custom',
                                   
  legalTargets: (state: GameState, controller: PlayerId): string[] =>
    Object.values(state.objects)
      .filter((o) => o.controller === controller
        && isUnit(o)                                                                                                             
        && ((k) => k === 'battlefield' || k === 'base')(state.zones[o.zone]?.kind))
      .map((o) => o.oid as string)
      .sort(),
  makeResolve:
    ({ controller, target }: { controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
    const evs: GameEvent[] = []
                                                  
    if (target !== undefined && state.objects[target as ObjId] !== undefined) {
      evs.push({ kind: 'grantBuff', target: target as ObjId } as GameEvent)
    }
    evs.push({ kind: 'buffBonus', player: controller, delta: 1 } as GameEvent)             
    return evs
  },
}

export const OGN_053: Card = {
  id: 'OGN-053', cardNo: 'OGN·053/298', name: '秘奥义！慈悲度魂落', category: 'spell',
  domains: ['green'], energy: 3, keywords: ['待命', '迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '给一名友方单位增益;本回合所有增益额外给友方+1(OGN_053_SPEC+buffBonusThisTurn)' }],
}
