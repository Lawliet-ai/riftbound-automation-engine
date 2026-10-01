                                                                  
                                                                
                                                 
                             
                                                    
                           
  
                                                                    
                                   
                                                                       
                                                                    
                                                    
                                                              
                                         
                                                            
                             
                                                                   
                                                             
                                                         
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { topOfDeck } from '../../src/keywords/insight'
import { voidSproutChoice, voidSproutRecycleEvents } from './SFD-018'        
import { makeBanishPlayRelay, type BanishPlayShape } from './play-from-deck'

export const OGN_025_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '每名对手展示其主牌堆顶部的一张牌。你从中选择一张，将其放逐，然后当作自己的牌打出，'
  + '无视费用。然后回收其余的卡牌。'

                               
export const OGN_025_PICK = 'furyPick'

                                                      
export const OGN_025_SHAPE: BanishPlayShape = {
  defId: 'OGN-025', reduceMana: 0, accepts: 'permanent', acceptsSpells: true, freeAll: true,
}

                                             
export function furyShown(state: GameState, controller: PlayerId): readonly { player: PlayerId, card: ObjId }[] {
  return state.players
    .filter((p) => p !== controller)
    .flatMap((p) => topOfDeck(state, p, 1).map((card) => ({ player: p, card })))
}

export const OGN_025_SPEC: PlaySpec = {
  defId: 'OGN-025', cardNo: 'OGN·025/298', name: '暴怒冲动', kind: 'spell',
  cost: { mana: 4, pips: [['red'], ['red']] }, // ㊶ cardCosts 实测 4 法力 **2 枚红 pip**(★592 分野:pips=2)
  keywords: ['迅捷'],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                                  
                                                                      
    for (const p of state.players.filter((x) => x !== controller)) {
      const vq = voidSproutChoice(state, p, chosen)
      if (vq) return { ...vq, itemId: `spell:${movedCardOid}:OGN-025` }
    }
    if (chosen[OGN_025_PICK] !== undefined) return null
    const shown = furyShown(state, controller).filter(({ player, card }) =>
      !voidSproutRecycleEvents(state, player, chosen).some((e) => (e as unknown as { objs: readonly string[] }).objs[0] === (card as string)))                  
    if (shown.length === 0) return null                 
    return {
      itemId: `spell:${movedCardOid}:OGN-025`,
      controller,
      key: OGN_025_PICK,
                                            
      prompt: '暴怒冲动:选择一张放逐并当作自己的牌打出(无视费用)',
      candidates: shown.map(({ card }) => ({
        id: card as string, label: state.objects[card]?.defId ?? (card as string),
      })),
    }
  },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    const shownAll = furyShown(state, controller)
    if (shownAll.length === 0) return []               
    const out: GameEvent[] = []
                                       
    const sprouted: string[] = []
    for (const p of state.players.filter((x) => x !== controller)) {
      const rec = voidSproutRecycleEvents(state, p, chosen)
      if (rec.length > 0) { out.push(...rec); sprouted.push((rec[0] as unknown as { objs: readonly string[] }).objs[0]!) }
    }
    const shown = shownAll.filter(({ card }) => !sprouted.includes(card as string))
                                                          
    for (const p of state.players.filter((x) => x !== controller)) {
      const cards = shown.filter((s2) => s2.player === p).map((s2) => s2.card)
      if (cards.length > 0) out.push({ kind: 'revealed', player: p, cards } as GameEvent)
    }
    const pick = chosen?.[OGN_025_PICK]
    const took = pick !== undefined && shown.some((s2) => (s2.card as string) === pick)
                                                          
    if (took) out.push({ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent)
                                                    
    for (const { player, card } of shown) {
      if ((card as string) === pick) continue
      out.push({ kind: 'recycle', player, objs: [card] } as GameEvent)
    }
    return out
  },
}

                                                                            
export function makeFuryPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(OGN_025_SHAPE, selfOid, controller)
}

export const OGN_025: Card = {
  id: 'OGN-025', cardNo: 'OGN·025/298', name: '暴怒冲动', category: 'spell',
  domains: ['red'], energy: 4, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每名对手展示顶1,选一张放逐并当作自己的牌全免打出,其余回收(两段接力;OGN_025_SHAPE.freeAll)' }],
}
