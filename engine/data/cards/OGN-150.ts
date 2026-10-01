                                                                       
                                                              
             
                                              
                                
                                          
                       
  
                                      
                                                     
                                                      
                                                      
                                                             
                                            
                                      
                                                                 
                                                                   
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { CostMod } from '../../src/game/costPipeline'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { buffCount } from '../../src/keywords/buff'

export const OGN_150_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{橙色}},让我以活跃状态进场。)\n'
  + '{{强攻}}(如果我是进攻方，则{{S}}+1。）\n'
  + '当你打出我时，可以选择消耗任意数量的增益作为额外费用。每消耗一个增益，就让我的费用减少{{橙色}}。'

export const OGN_150_KEYWORDS: readonly string[] = ['急速', '强攻']

                                                            
function buffedUnits(state: GameState, player: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const k = state.zones[o.zone]?.kind
      return (k === 'battlefield' || k === 'base') && o.controller === player && buffCount(o) > 0
    })
    .map((o) => o.oid as string)
    .sort()
}

export const OGN_150_EXTRA_COST: PlayExtraCost = {
  label: '消耗任意数量的增益(每个给我减一枚摧破符能)',
                                                                 
  available: (state, player) => buffedUnits(state, player).length > 0,
  options: (state, player) => buffedUnits(state, player)
    .map((_, i) => ({ id: String(i + 1), label: `消耗 ${i + 1} 个增益(减 ${i + 1} 枚摧破符能)` })),
  discount: (_state, _player, choice): readonly CostMod[] => {
    const n = choice === undefined ? 0 : Number(choice)
    return Number.isInteger(n) && n > 0
      ? [{ kind: 'reduce', part: 'pips', pips: n, source: 'OGN-150 海妖猎手' }]
      : []
  },
  payEvents: (state, player, choice): readonly GameEvent[] => {
    const n = choice === undefined ? 0 : Number(choice)
    if (!Number.isInteger(n) || n <= 0) return []
                                             
    return buffedUnits(state, player).slice(0, n)
      .map((oid): GameEvent => ({ kind: 'consumeBuff', target: oid as ObjId, by: player }))
  },
}

export const OGN_150: Card = {
  id: 'OGN-150', cardNo: 'OGN·150/298', name: '海妖猎手', category: 'unit',
  domains: ['orange'], energy: 3, power: 5, keywords: [...OGN_150_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可消耗任意数量增益,每个减一枚橙 pip(OGN_150_EXTRA_COST)' }],
}
