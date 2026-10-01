                                                                     
                                         
                                  
                 
               
                 
  
                                            
                                              
                                                    
                                                
                                                                    
                                                              
                                                   
                                                             
                                                
                                                                         
import { tappedRuneOids } from './tapped-runes'                          
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const SFD_049_CARD_EFFECT =
  '当你为我贴附一件武装时，从以下中选择一个本回合未选过的效果—\n' +
  '-让两枚符文变为活跃状态。\n' +
  '-召出一枚休眠的符文。\n' +
  '-给予一名友方单位增益。'

                                                              
export const APHELIOS_DEFIDS: readonly string[] = ['SFD-049']

export const SFD_049_ASK = 'apheliosPick'
export const SFD_049_UNIT = 'apheliosBuffTarget'

                          
export const SFD_049_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'ready2', label: '让两枚符文变为活跃状态' },
  { id: 'rune', label: '召出一枚休眠的符文' },
  { id: 'buff', label: '给予一名友方单位增益' },
]

export const SFD_049_READY = 2        
export const SFD_049_RUNE = 1        

                                   
export const modeLedgerKey = (player: string, defId: string): string => `${player}:${defId}`

                                  
export function apheliosOpen(state: GameState, controller: PlayerId): readonly { readonly id: string; readonly label: string }[] {
  const used = state.chosenModesThisTurn?.[modeLedgerKey(controller as string, 'SFD-049')] ?? []
  return SFD_049_OPTIONS.filter((o) => !used.includes(o.id))
}

                                          
export function friendlyFielded(state: GameState, controller: PlayerId): string[] {
  const out: string[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield' && z.kind !== 'base') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (o && o.controller === controller && !(o.defId as string).startsWith('rune:')) out.push(oid as string)
    }
  }
  return out
}

                                                                
const tappedRunes = tappedRuneOids

                                  
export function makeApheliosTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `SFD-049:attach:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'SFD-049',
    event: 'attach',
    when: [{
      kind: 'custom',
                                                           
      test: (ev: GameEvent) => {
        const e = ev as { kind: string; to?: string; player?: string }
        return e.kind === 'attach' && e.to === (selfOid as string)
          && (e.player === undefined || e.player === (controller as string))
      },
    }],
    nextChoice: (state: GameState, _ev, chosen): ChoiceRequest | null => {
      const open = apheliosOpen(state, controller)
      if (open.length === 0) return null                       
      if (chosen[SFD_049_ASK] === undefined) {
        return {
          itemId: `trig:${id}`, controller, key: SFD_049_ASK,
          prompt: '厄斐琉斯:选一个本回合未选过的效果',
          candidates: [...open],
        }
      }
                          
      if (chosen[SFD_049_ASK] === 'buff' && chosen[SFD_049_UNIT] === undefined) {
        const cands = friendlyFielded(state, controller)
        if (cands.length === 0) return null
        return {
          itemId: `trig:${id}`, controller, key: SFD_049_UNIT,
          prompt: '厄斐琉斯:给哪名友方单位增益',
          isTarget: true, // ★1782 给予一名友方单位增益
          candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        }
      }
      return null
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[SFD_049_ASK]
                                                  
      if (pick === undefined || !apheliosOpen(state, controller).some((o) => o.id === pick)) return []
                                                     
      const key = modeLedgerKey(controller as string, 'SFD-049')
                                                                                   
                                                                                                   
                                                                                         
                                                                    
      const note: GameEvent = { kind: 'noteChosenMode', player: controller, ledgerKey: key, mode: pick }
      if (pick === 'ready2') {
        const runes = tappedRunes(state, controller).slice(0, SFD_049_READY)
        return [note, ...runes.map((oid): GameEvent => ({ kind: 'statusChange', target: oid as ObjId, key: 'tapped', value: false }))]                                
      }
      if (pick === 'rune') {
        return [note, { kind: 'summonRune', player: controller, count: SFD_049_RUNE, dormant: true } as GameEvent]
      }
      const unit = chosen?.[SFD_049_UNIT]
      if (unit === undefined || state.objects[unit as ObjId] === undefined) return [note]
      return [note, { kind: 'grantBuff', target: unit as ObjId }]                                        
    },
  }, selfOid, controller)
}

export const SFD_049: Card = {
  id: 'SFD-049', cardNo: 'SFD·049/221', name: '厄斐琉斯', category: 'unit', // 英雄单位 → unit(§178)
  domains: ['green'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '贴附武装时三选一(本回合未选过):两枚符文活跃 / 召出休眠符文 / 给友方单位增益' },
  ],
}
