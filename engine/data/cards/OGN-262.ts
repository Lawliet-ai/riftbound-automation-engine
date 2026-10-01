                                                                 
                                                                    
                             
                                               
                              
                           
  
                                                                     
                                                             
                                                        
                                       
                                                       
                                                                                
                                                                                                                                                 
                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                             
import { spellTargetStillLegal } from './targetStillLegal'

export const OGN_262_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '眩晕任意战场上的一名敌方单位。你可以选择将一名友方单位移动至该敌方单位的战场上。'
  + '（被眩晕的单位在本回合内无法造成战斗伤害。）'

export const OGN_262_PICK = 'zenithMover'

                                                
export function zenithTargets(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => state.zones[o.zone]?.kind === 'battlefield'
      && isUnit(o)                                                                      
      && o.controller !== controller)
    .map((o) => o.oid as string)
    .sort()
}

   
                                                              
                                         
                                                           
   
export function zenithMovers(state: GameState, controller: PlayerId, dest: string | undefined): string[] {
  if (dest === undefined) return []
  return Object.values(state.objects)
    .filter((o) => isUnit(o) && o.controller === controller
      && (o.zone as string) !== dest
      && ['battlefield', 'base'].includes(state.zones[o.zone]?.kind as string))
    .map((o) => o.oid as string)
    .sort()
}

export const OGN_262_SPEC: PlaySpec = {
  defId: 'OGN-262', cardNo: 'OGN·262/298', name: '天顶之刃', kind: 'spell',
  cost: { mana: 3, pips: [['green'], ['yellow']] }, // ㊶ cardCosts 实测 3 法力 2pip 双色 ⇒ 一绿一黄(★648)
  keywords: ['迅捷'],
                                                           
                                                                         
                                                            
  choiceTiming: 'confirm',
  firstAskOptional: true, // ★1802c §355.13:第一问是「你**可以选择**将一名友方单位移动至…」⇒ 含 0
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => zenithTargets(state, controller),
  makeNextChoice:
    ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
    if (target === undefined || chosen[OGN_262_PICK] !== undefined) return null
                                                   
    if (!spellTargetStillLegal(OGN_262_SPEC, state, controller, target)) return null
    const dest = state.objects[target as ObjId]?.zone
    if (dest === undefined || state.zones[dest]?.kind !== 'battlefield') return null                 
                                       
    const cands = zenithMovers(state, controller, dest)
    if (cands.length === 0) return null
    return {
      itemId: `spell:${movedCardOid}:OGN-262`, controller, key: OGN_262_PICK,
      prompt: '天顶之刃:可选择将一名友方单位移动至该敌方单位的战场',
      isTarget: true, // ★1781 §355.7:「将一名友方单位移动至…」
      candidates: [
        ...cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
        { id: 'skip', label: '不移动(「可以选择」)' }, // 「可以」⇒ skip 档
      ],
    }
  },
  makeResolve:
    ({ controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                                 
    if (!spellTargetStillLegal(OGN_262_SPEC, state, controller, target)) return []
    const foe = state.objects[target as ObjId]
    if (!foe) return []                                     
    const out: GameEvent[] = [{ kind: 'stun', target: target as ObjId } as GameEvent]
    const mover = chosen?.[OGN_262_PICK]
    if (mover === undefined || mover === 'skip') return out
    const me = state.objects[mover as ObjId]
    const dest = foe.zone
                                                            
                                                                          
    if (!me || state.zones[dest]?.kind !== 'battlefield' || !zenithMovers(state, controller, dest).includes(mover)) return out
    out.push({ kind: 'zoneChange', obj: me.oid, to: dest as ZoneId } as GameEvent)
    out.push({ kind: 'unitMoved', unit: me.oid, player: me.controller, from: me.zone, to: dest as ZoneId } as GameEvent)          
    return out
  },
}

export const OGN_262: Card = {
  id: 'OGN-262', cardNo: 'OGN·262/298', name: '天顶之刃', category: 'spell',
  domains: ['green', 'yellow'], energy: 3, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '眩晕战场上一名敌方单位;可选移一名友方单位到该战场(OGN_262_SPEC)' }],
}
