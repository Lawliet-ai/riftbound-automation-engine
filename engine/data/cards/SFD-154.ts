                                                                         
                                                            
                                                  
                                                  
                   
                                                
                                  
  
           
                                                                    
                                                            
                                                                                            
                                                                                                        
                                                                                                                                                         
                                                                                                                 
                                                        
                                                                     
                                                                   
                                                  
                                                                              
                                                                      
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { canPayFromState, couldPayWithReactionGains } from '../../src/game/economy'
import { SAND_SOLDIER_TOKEN } from './token-spells'
import type { GameObject } from '../../src/state/object'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                                                                                
import { hasteKeyOf } from './haste-key'                         
import { lockUnitDropToStandby } from '../../src/keywords/standby'                           
import { controlledBattlefields } from '../../src/state/battlefieldControl'

   
                                                                   
                                                                                  
                             
   
function guardSoldierDrop(state: GameState, controller: PlayerId, standbyBattlefield: string | undefined): string | undefined {
  if (standbyBattlefield === undefined) return `base:${controller}`
  return lockUnitDropToStandby([`base:${controller}`, ...controlledBattlefields(state, controller)], standbyBattlefield)[0]
}

export const SFD_154_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n'
  + '打出一名2{{S}}的“黄沙士兵”。然后进行一次：你可以选择支付{{黄色}}，以此让其变为活跃状态。'

export const SFD_154_PICK = 'guardPay'
const YELLOW_PIP = { pips: [['yellow']] } as const
                            
export const SFD_154_HASTE_KEY = hasteKeyOf('SFD-154:sand')
                                                                                                   
export const guardSoldierTag = (selfOid: ObjId): string => `SFD-154:soldier:${selfOid}`
                                                 
function guardSoldierOf(state: GameState, tag: string): GameObject | undefined {
  return Object.values(state.objects).find((o) => o.defId === SAND_SOLDIER_TOKEN.defId && o.counters[tag] === 1)
}

                                                   
export function makeGuardActivateItem(selfOid: ObjId, controller: PlayerId): ChainItem {
  const tag = guardSoldierTag(selfOid)                                        
  return {
    id: `SFD-154-embed-activate:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
    sourceDefId: 'SFD-154',
    nextChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen[SFD_154_PICK] !== undefined) return null           
      const s = guardSoldierOf(state, tag)
      if (!s) return null              
      if (s.status.dormant !== true) return null                                                           
                                         
                                                               
                                                            
                                                                       
                                                          
                                                                                       
                                                                      
      if (!couldPayWithReactionGains(state, controller, YELLOW_PIP as never)) return null
      return {
        itemId: `SFD-154-embed-activate:${selfOid}`, controller, key: SFD_154_PICK,
        prompt: '护驾!:是否支付 1 点序理符能,以此让该黄沙士兵变为活跃状态?',
        candidates: [
          { id: 'pay', label: '支付 1 点序理符能,让其变为活跃状态' },
          { id: 'skip', label: '不支付(保持休眠)' },
        ],
      }
    },
    resolve: (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      if (chosen?.[SFD_154_PICK] !== 'pay') return []                
      const s = guardSoldierOf(state, tag)
      if (!s) return []
      if (s.status.dormant !== true) return []                      
                                                               
      if (!canPayFromState(state, controller, YELLOW_PIP as never)) return []
      return [
        { kind: 'spend', player: controller, cost: YELLOW_PIP } , // §204.1.b 费用在前
        { kind: 'statusChange', target: s.oid, key: 'dormant', value: false } as GameEvent, // 「变为活跃状态」
      ]
    },
  }
}

export const SFD_154_SPEC: PlaySpec = {
  defId: 'SFD-154', cardNo: 'SFD·154/221', name: '护驾！', kind: 'spell',
  cost: { mana: 3 }, // ㊶ cardCosts 实测 3 法力 **0 pip**
  keywords: ['待命'],
  target: 'none',
  legalTargets: (): string[] => [],
                                                                                                  
  makeNextChoice: ({ movedCardOid, controller, standbyBattlefield }: { movedCardOid: string; controller: PlayerId; standbyBattlefield?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) =>
      guardSoldierDrop(state, controller, standbyBattlefield) === undefined ? null : spawnTokenHasteChoice(state, controller, SAND_SOLDIER_TOKEN, { itemId: `play:${movedCardOid}`, key: SFD_154_HASTE_KEY, label: '黄沙士兵' }, chosen),
  makeResolve:
    ({ movedCardOid, controller, standbyBattlefield }: { movedCardOid: string; controller: PlayerId; standbyBattlefield?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    const drop = guardSoldierDrop(state, controller, standbyBattlefield)                
    if (drop === undefined) return []
    const tag = guardSoldierTag(movedCardOid as ObjId)                                                           
    const x = spawnTokenHasteResolve(state, controller, SAND_SOLDIER_TOKEN, SFD_154_HASTE_KEY, chosen)                                                      
    return [
      ...x.pre,
      { kind: 'spawnToken', spec: SAND_SOLDIER_TOKEN, zone: asZoneId(drop), owner: controller, tag, ...(x.ready ? { ready: true } : {}) } as GameEvent,
                                                                                                         
                                                                                   
      { kind: 'enqueueItem', item: makeGuardActivateItem(movedCardOid as ObjId, controller) } as GameEvent,
    ]
  },
}

export const SFD_154: Card = {
  id: 'SFD-154', cardNo: 'SFD·154/221', name: '护驾！', category: 'spell',
  domains: ['yellow'], energy: 3, keywords: ['待命'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出2[S]黄沙士兵;内嵌:可付[黄]让其活跃(makeGuardActivateItem)' }],
}
