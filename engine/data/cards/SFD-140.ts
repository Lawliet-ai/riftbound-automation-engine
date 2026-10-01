                                                             
                                  
                                             
                                         
  
                             
                                                                     
                                                 
                                                                    
                                              
                                                           
                                                            
                                                             
                                                                 
                                                                   
                                            
import type { Card } from '../../src/dsl/card'
import { scoredHere } from './scored-here'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import { spellNeedsTarget, type PlaySpec } from '../../src/loop/playSpec'                               
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { couldPayWithReactionGains } from '../../src/game/economy'
import { CARD_COSTS } from '../cardCosts'
import { printedCost } from './play-from-deck'
import { spellLegalTargets } from '../../src/loop/playSpec'

export const SFD_140_CARD_EFFECT =
  '当你打出我时，你可以选择从你的废牌堆中打出一个法力费用不高于{{3}}的法术，无需支付其法力费用（仍需支付所有符能费用）。打出该法术后，将其回收。'

let specProvider: ((defId: string) => PlaySpec | undefined) | null = null
                                               
export function setFizzSpecProvider(p: (defId: string) => PlaySpec | undefined): void {
  specProvider = p
}

                                               
                                                                
function fizzCandidates(
  state: GameState, controller: PlayerId,
  manaOk: (mana: number, state: GameState) => boolean = (m) => m <= 3,
): readonly { id: string; label: string }[] {
  const zone = state.zones[`discard:${controller}`]
  if (!zone || !specProvider) return []
  const out: { id: string; label: string }[] = []
  for (const oid of zone.contents) {
    const o = state.objects[oid]
    if (!o) continue
    const spec = specProvider(o.defId)
    if (!spec || spec.kind !== 'spell') continue
    const row = CARD_COSTS[o.defId]
    if (!row || !manaOk(row.mana, state)) continue                            
                                                
                                                         
                                                            
                                                        
                                                         
                                                                         
                                                                                 
                                                              
                                                                                       
                                                                           
    const pips = printedCost(o.defId).pips
    if (pips !== undefined && !couldPayWithReactionGains(state, controller, { mana: 0, pips })) continue
                               
    if (spellNeedsTarget(spec) && spellLegalTargets(spec, state, controller).length === 0) continue                                                         
    out.push({ id: oid as string, label: o.defId })
  }
  return out
}

export function makeFizzTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-140:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-140',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    mayChoose: true, // 「你可以选择」在效果开头 ⇒ §383.3.a 确认步决定(拒绝档在确认步,这里不再 skip)
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen['fizz'] === undefined) {
        const cands = fizzCandidates(state, controller)
        if (cands.length === 0) return null                               
        return { itemId: `SFD-140:play:${selfOid}`, controller, key: 'fizz',
          prompt: '菲兹:从你的废牌堆中打出一个法力费用不高于 3 的法术(免法力,仍付符能)', candidates: cands,
                                                                                     
                                                           
          isTarget: true }
      }
                                                   
      if (chosen['fizzTarget'] === undefined) {
        const o = state.objects[chosen['fizz'] as ObjId]
        const spec = o !== undefined ? specProvider?.(o.defId) : undefined
        if (!spec || !spellNeedsTarget(spec)) return null                               
        const targets = spellLegalTargets(spec, state, controller)
        if (targets.length === 0) return null                                 
        return { itemId: `SFD-140:play:${selfOid}`, controller, key: 'fizzTarget',
          prompt: '菲兹:为该法术选择目标', candidates: targets.map((t) => ({ id: t, label: t })),
          // ★1783 这一问【不标】isTarget:答案原样喂给 playSpellFromZone.target,信号由被打出的法术自己发(法术桶,chainFepr 的 effectPlayedSpellTargetSignals);这里再标会按技能重复计数(★1771/★1777 标它时法术那条路还不发信号)。
        }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const oid = chosen?.['fizz']
      if (oid === undefined) return []                            
      const o = state.objects[oid as ObjId]
      if (!o) return []
      const spec = specProvider?.(o.defId)
      if (spec === undefined) return []                                                    
                                                                           
      const fizzT = chosen?.['fizzTarget']
      if (spellNeedsTarget(spec) && (fizzT === undefined || !spellLegalTargets(spec, state, controller).includes(fizzT))) return []                                                                        
      return [{ kind: 'playSpellFromZone', player: controller, card: oid as ObjId,
        freeMana: true, recycleOnLeave: true,
        ...(chosen?.['fizzTarget'] !== undefined ? { target: chosen['fizzTarget'] } : {}) } as GameEvent]
    },
  }, selfOid, controller)
}

                                                                     
                                                                               
                            
                                              
                                     
                                                                  
                                                                     
                                       
export const OGN_112_CARD_EFFECT =
  '{{游走}}（我可以向其他战场进行移动。）\n' +
  '当我征服一处战场时，你可以选择从废牌堆中打出一张法力费用低于你当前分数的法术牌，无需支付其法力费用，然后将其回收（仍需支付所有符能费用）。'

export function makeKaisa112Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const manaOk = (m: number, st: GameState): boolean => m < (st.scores[controller] ?? 0)
  return compileTrigger({
    id: `OGN-112:conquer:${selfOid}`, rawId: true, sourceDefId: 'OGN-112',
    event: 'conquer', by: 'you',
    mayChoose: true, // 「你可以选择」紧跟时机从句(§383.3.a)
    when: [{ kind: 'custom', test: (ev, state) => scoredHere(state, selfOid, ev, ['conquer']) }],
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      if (chosen['kaisa'] === undefined) {
        const cands = fizzCandidates(state, controller, manaOk)
        if (cands.length === 0) return null                               
        return { itemId: `OGN-112:conquer:${selfOid}`, controller, key: 'kaisa',
          prompt: '卡莎:从废牌堆打出一张法力费低于你当前分数的法术(免法力,仍付符能)', candidates: cands,
          isTarget: true }                                                                
      }
      if (chosen['kaisaTarget'] === undefined) {
        const o = state.objects[chosen['kaisa'] as ObjId]
        const spec = o !== undefined ? specProvider?.(o.defId) : undefined
        if (!spec || !spellNeedsTarget(spec)) return null                               
        const targets = spellLegalTargets(spec, state, controller)
        if (targets.length === 0) return null
        return { itemId: `OGN-112:conquer:${selfOid}`, controller, key: 'kaisaTarget',
          prompt: '卡莎:为该法术选择目标', candidates: targets.map((t) => ({ id: t, label: t })),
          // ★1783 这一问【不标】isTarget:答案原样喂给 playSpellFromZone.target,信号由被打出的法术自己发(法术桶,chainFepr 的 effectPlayedSpellTargetSignals);这里再标会按技能重复计数(★1771/★1777 标它时法术那条路还不发信号)。
        }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const oid = chosen?.['kaisa']
      if (oid === undefined) return []
      const o = state.objects[oid as ObjId]
      if (!o) return []
      const spec = specProvider?.(o.defId)
      if (spec === undefined) return []                         
      const kaisaT = chosen?.['kaisaTarget']
      if (spellNeedsTarget(spec) && (kaisaT === undefined || !spellLegalTargets(spec, state, controller).includes(kaisaT))) return []                                         
      return [{ kind: 'playSpellFromZone', player: controller, card: oid as ObjId,
        freeMana: true, recycleOnLeave: true,
        ...(chosen?.['kaisaTarget'] !== undefined ? { target: chosen['kaisaTarget'] } : {}) } as GameEvent]
    },
  }, selfOid, controller)
}

const kaisa112 = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '卡莎', category: 'unit',
  domains: ['blue'], energy: 6, power: 6, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[游走]§810.1.b 可向其他战场移动' },
    { kind: 'passive', describe: '征服时可从废牌堆免法力打出费用低于当前分数的法术并回收(makeKaisa112Trigger)' },
  ],
})
export const OGN_112: Card = kaisa112('OGN-112', 'OGN·112/298')
export const OGN_112A: Card = kaisa112('OGN-112a', 'OGN·112a/298')

export const SFD_140: Card = {
  id: 'SFD-140', cardNo: 'SFD·140/221', name: '菲兹', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可从废牌堆免法力打出一个法力费≤3的法术,打后回收(makeFizzTrigger;§419.3 通道)' }],
}
