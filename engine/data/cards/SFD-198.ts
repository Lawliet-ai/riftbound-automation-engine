                                                              
                                                                      
                                
                                                           
                      
                                                      
                       
                                                     
                                 
  
                                          
                                                       
                                                           
                                                           
                                                          
                                                      
  
                                                   
                                                               
                                                      
                                                      
                                                              
                                                                
  
               
                                                                       
                                                                  
                        
                                                              
                                                    
                                                                             
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { forgeArmaments } from './SFD-208'                       
import { SAND_SOLDIER_TOKEN, tokenDropZones } from './token-spells'
import { spawnTokenHasteChoice, spawnTokenHasteResolve, hastePaidSoFar, hasteCostTimes } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       

export const SFD_198_CARD_EFFECT =
  '你每控制一件武装，便打出一名2{{S}}的“黄沙士兵”。然后进行一次：让其中最多两名“黄沙士兵”变为活跃状态。'

                                             
export const SFD_198_UPSTREAM_STALE_EFFECT =
  '你每控制一件武装，便打出一名2{{S}}的“黄沙士兵”。然后让两名“黄沙士兵”变为活跃状态。'

                                  
export const SFD_198_MAX_READY = 2

   
                                                                   
                                                           
   
export const sandTagOf = (cardOid: string): string => `SFD-198:${cardOid}`

                                            
export function armamentCount198(state: GameState, controller: PlayerId): number {
  return forgeArmaments(state, controller).length
}

   
                                           
                                                                        
                                                          
   
export function sandSoldiersFrom198(state: GameState, tag: string): string[] {
  return Object.values(state.objects)
    .filter((o) => o.counters[tag] === 1
      && (state.zones[o.zone]?.kind === 'battlefield' || state.zones[o.zone]?.kind === 'base')
      && o.status.dormant === true)
    .map((o) => o.oid as string)
    .sort()
}

                                               
export const SFD_198_SKIP = 'skip'

                                                                      
export const sfd198HasteKey = (i: number): string => hasteKeyOf('SFD-198:sand', i)
export const sfd198HasteKeys = (n: number): readonly string[] => Array.from({ length: n }, (_, i) => sfd198HasteKey(i + 1))

   
                                                    
                                                      
                                                           
                                                            
                                                                                         
   
export function makeSandRallyItem(cardOid: string, controller: PlayerId): ChainItem {
  const id = `SFD-198-rally:${cardOid}`
  const tag = sandTagOf(cardOid)
  const ask = (state: GameState, key: string, taken: readonly string[]): ChoiceRequest | null => {
    const cands = sandSoldiersFrom198(state, tag).filter((oid) => !taken.includes(oid))
    if (cands.length === 0) return null                    
    return {
      itemId: id, controller, key,
      prompt: '沙兵现身:让本次打出的哪一名黄沙士兵变为活跃?(最多两名,可以不选)',
      isTarget: true, // ★1782 让两名"黄沙士兵"变为活跃状态
      candidates: [
        ...cands.map((oid) => ({ id: oid, label: oid })),
        { id: SFD_198_SKIP, label: '不选' }, // 「**最多**」两名 ⇒ 下界是 0
      ],
    }
  }
  return {
    id, controller, kind: 'triggered', status: 'pending',
    nextChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
      if (chosen['ready1'] === undefined) return ask(state, 'ready1', [])
                                      
      if (chosen['ready1'] === SFD_198_SKIP) return null
      if (chosen['ready2'] === undefined) return ask(state, 'ready2', [chosen['ready1']!])
      return null
    },
    resolve: (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const live = sandSoldiersFrom198(state, tag)
      const picked = [chosen?.['ready1'], chosen?.['ready2']]
        .filter((x): x is string => x !== undefined)
        // ㊺ 结算这一刻再筛一道:答完到结算之间它可能已离场/已经活跃。
        // ⚠️【铁律222·598 破坏验证实测】这里**不必**再写一句 `x !== SFD_198_SKIP` ——
        //   那个哨兵**本来就不是任何物件的 oid**,`live.includes` 天然把它挡在外面
        //   (与海兽钓钩 OGN·242 里那句同一个道理,那边也是删掉的)。写了就是冗余 guard:
        //   刀砍掉它红 0 条,正是"被这一行盖住"的实证。
        .filter((oid) => live.includes(oid))
                                           
      return picked.slice(0, SFD_198_MAX_READY).map((oid): GameEvent => (
        { kind: 'statusChange', target: oid as ObjId, key: 'dormant', value: false } 
      ))
    },
  }
}

export const SFD_198_SPEC: PlaySpec = {
  defId: 'SFD-198', cardNo: 'SFD·198/221', name: '沙兵现身', kind: 'spell',
                                                                   
                                                                        
  cost: { mana: 6, pips: [['green', 'yellow']] },
  keywords: [],
                                                      
                                                          
                                                   
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): readonly string[] => tokenDropZones(state, controller),
                                                                                             
                                                                                                            
  makeNextChoice: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
      if (target === undefined) return null
      const keys = sfd198HasteKeys(armamentCount198(state, controller))
      for (let i = 0; i < keys.length; i++) {
        const q = spawnTokenHasteChoice(state, controller, SAND_SOLDIER_TOKEN, { itemId: `play:${movedCardOid}`, key: keys[i]!, label: '黄沙士兵' }, chosen, hastePaidSoFar(chosen, keys.slice(0, i)))
        if (q !== null) return q
      }
      return null
    },
  makeResolve: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) => (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    if (target === undefined) return []
    const n = armamentCount198(state, controller)
    const tag = sandTagOf(movedCardOid as string)
    const out: GameEvent[] = []
    const pre: GameEvent[] = []                                                              
    let paid = 0
    const keys = sfd198HasteKeys(n)
                                               
    for (let i = 0; i < n; i++) {
      const x = spawnTokenHasteResolve(state, controller, SAND_SOLDIER_TOKEN, keys[i]!, chosen, hasteCostTimes(paid))                                     
      if (x.ready) paid++
      pre.push(...x.pre)
      out.push({
        kind: 'spawnToken', spec: SAND_SOLDIER_TOKEN, zone: target as ZoneId, owner: controller,
        tag, // §185 关联标记:第二段靠它认出「**其中**」
        ...(x.ready ? { ready: true } : {}), // ★1393 付了急速 ⇒ 活跃进场(§805.6);第二段只认休眠的 ⇒ 它自然不在「其中」候选里
      } )
    }
                                                     
                                                      
    if (n > 0) {
      out.push({ kind: 'enqueueItem', item: makeSandRallyItem(movedCardOid as string, controller) } )
    }
    return [...pre, ...out]
  },
}

export const SFD_198: Card = {
  id: 'SFD-198', cardNo: 'SFD·198/221', name: '沙兵现身', category: 'spell',
  domains: ['green', 'yellow'], energy: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每控制一件武装打出一名黄沙士兵;然后进行一次:其中最多两名变活跃(SFD_198_SPEC)' }],
}
