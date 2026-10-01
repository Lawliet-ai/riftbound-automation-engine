                                                                      
                                                              
             
                                       
                
                        
                                             
  
                            
                                                                     
                              
                                                                
                                          
                                                                
                                                                    
                                                          
                                                      
                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const VEN_022_CARD_EFFECT =
  '当你打出此牌时，放逐你的手牌和废牌堆里的卡牌，然后{{燃烧7}}。\n'
  + '跳过你的抽牌阶段。\n'
  + '你可以选择从你的废牌堆中打出卡牌。\n'
  + '如果一张卡牌将从除你的主牌堆以外的任何位置进入你的废牌堆，则改为将其放逐。'

export const VEN_022_BURN = 7

                                             
function treasuresOf(state: GameState, player: PlayerId) {
  return Object.values(state.objects).filter((o) => {
    if (o.defId !== 'VEN-022' || o.controller !== player) return false
    const k = state.zones[o.zone]?.kind
    return k === 'base' || k === 'battlefield'
  })
}

                                           
export function makeTreasurePlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'VEN-022:play',
    event: 'playUnit', // 装备也走 PLAY_UNIT 通道打出(§149.2,㊼ OGN-212)
    by: 'any',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    effect: (state: GameState): readonly GameEvent[] => {
      const mine = [
        ...(state.zones[`hand:${controller}` as ZoneId]?.contents ?? []),
        ...(state.zones[`discard:${controller}` as ZoneId]?.contents ?? []),
      ]
      return [
        ...mine.map((oid): GameEvent => ({ kind: 'banish', target: oid, by: selfOid })),
        { kind: 'burn', player: controller, count: VEN_022_BURN } as GameEvent, // 「然后」
      ]
    },
  }, selfOid, controller)
}

                                                 
export function treasureSkipsDraw(state: GameState, player: PlayerId): boolean {
  return treasuresOf(state, player).length > 0
}

                                                                      
export function treasurePlaySources(state: GameState, player: PlayerId): readonly ObjId[] {
  if (treasuresOf(state, player).length === 0) return []
  return [...(state.zones[`discard:${player}` as ZoneId]?.contents ?? [])]
}

                                                
export function treasureBanishShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const t of Object.values(state.objects)) {
    if (t.defId !== 'VEN-022') continue
    const k = state.zones[t.zone]?.kind
    if (k !== 'base' && k !== 'battlefield') continue
    out.push({
      id: `VEN-022:banish:${t.oid}`,
      source: t.oid,
      controller: t.controller,
      intercepts: 'zoneChange',
      predicate: (ev: GameEvent, s: GameState) => {
        if (ev.kind !== 'zoneChange') return false
        const e = ev as unknown as { obj: ObjId; to: string }
        if (e.to !== `discard:${t.controller}`) return false                 
        const cur = s.objects[e.obj]?.zone
        const curZone = cur === undefined ? undefined : s.zones[cur]
                                                 
        return !(curZone?.kind === 'mainDeck' && curZone?.owner === t.controller)
      },
      rewrite: (ev: GameEvent) => {
        const e = ev as unknown as { obj: ObjId }
        return { kind: 'banish', target: e.obj, by: t.oid } 
      },
    })
  }
  return out
}

export const VEN_022: Card = {
  id: 'VEN-022', cardNo: 'VEN·022', name: '无尽秘藏', category: 'equipment',
  domains: ['red'], energy: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '打出时放逐手牌+废牌堆并燃烧7(makeTreasurePlayTrigger)' },
    { kind: 'passive', describe: '跳过你的抽牌阶段(treasureSkipsDraw)' },
    { kind: 'passive', describe: '可从你的废牌堆打出卡牌(treasurePlaySources)' },
    { kind: 'passive', describe: '进你的废牌堆(除自主牌堆)改为放逐(treasureBanishShields)' },
  ],
}
