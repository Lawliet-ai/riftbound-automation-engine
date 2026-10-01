                                                          
                                                    
                                                            

import type { GameState } from '../../src/state/gameState'
import type { Card } from '../../src/dsl/card'
import type { PlayerId } from '../../src/state/ids'

                                                              
export const OGN_181_CARD_EFFECT = '{{横置}}：让另一张友方装备、单位或正面朝下的卡牌返回其所属的手牌。'

                                                
export function satchelTargets(state: GameState, controller: PlayerId, selfOid: string): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield' && z.kind !== 'base' && z.kind !== 'standby') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (!o || oid === selfOid || o.controller !== controller || o.defId.startsWith('rune:')) continue
      out.push(oid)
    }
  }
  return out
}

export const OGN_181: Card = {
  id: 'OGN-181',
  cardNo: 'OGN·181/298',
  name: '奇妙行囊',
  category: 'equipment',
  domains: ['purple'],
  energy: 2,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[E]:弹回另一张友方装备/单位/待命卡(ActivatedSpec 于 registry 注册)' }],
}
