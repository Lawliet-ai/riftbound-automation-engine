                                                                     
                                         
                                
                     
                
              
                     
  
                                              
                                                                    
                                                            
                                                                   
                                                                        
                                                                      
                                                                               
                                        
                                            
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { CONSUME_OWN_BUFF_COST } from './buff-consumers'
import { battlefieldUnits } from './diana-reactions'
import { grantKeywordEvent } from './activated-batch'

export const OGN_157_CARD_EFFECT =
  '消耗我的增益：从以下中选择一个你本回合内尚未选过的效果-\n' +
  '·对战场上的一名单位造成2点伤害。\n' +
  '·眩晕战场上的一名单位。\n' +
  '·让我变为活跃状态。\n' +
  '·使我本回合内获得{{游走}}。'

export const OGN_157_DAMAGE = 2
export const OGN_157_KEYWORD = '游走'

                      
export const OGN_157_MODES: readonly string[] = ['dmg2', 'stun', 'ready', 'prowl']

                                                   
export const udyrLedgerKey = (player: string): string => `${player}:OGN-157`

                   
export function udyrOpenModes(state: GameState, controller: PlayerId): readonly string[] {
  const used = state.chosenModesThisTurn?.[udyrLedgerKey(controller as string)] ?? []
  return OGN_157_MODES.filter((m) => !used.includes(m))
}

   
                                       
                                               
   
export function udyrTargets(state: GameState, controller: PlayerId, selfOid: string): string[] {
  const open = udyrOpenModes(state, controller)
  const out: string[] = []
  if (open.includes('dmg2')) out.push(...battlefieldUnits(state).map((o) => `dmg2:${o}`))
  if (open.includes('stun')) out.push(...battlefieldUnits(state).map((o) => `stun:${o}`))
  if (open.includes('ready')) out.push('ready:-')
  if (open.includes('prowl')) out.push('prowl:-')
  void selfOid
  return out
}

export const UDYR_SPEC: ActivatedSpec = {
  key: 'udyr:consumeBuff',
  label: '消耗我的增益,四选一(本回合未选过):2点伤害 / 眩晕 / 我变活跃 / 我获得{{游走}}',
  cost: {}, // §204.1.b 冒号前没有资源费 —— 别想当然补一个(瑟提那条的原话)
  extraCost: CONSUME_OWN_BUFF_COST, // 形态①:消耗我自己的增益
  target: 'custom',
  legalTargets: (state, controller, selfOid) => udyrTargets(state, controller, selfOid),
  makeResolve:
    ({ selfOid, controller, target }: { selfOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      if (!target || !target.includes(':')) return []
      const mode = target.slice(0, target.indexOf(':'))
      const oid = target.slice(target.indexOf(':') + 1)
                                   
      if (!udyrOpenModes(state, controller).includes(mode)) return []
                                                          
                                                                
      const note: GameEvent = {
        kind: 'noteChosenMode', player: controller, ledgerKey: udyrLedgerKey(controller as string), mode,
      }
      if (mode === 'ready') {
                                       
                                                                                       
      return [note, { kind: 'statusChange', target: selfOid as ObjId, key: 'dormant', value: false }]                    
      }
      if (mode === 'prowl') {
        return [note, grantKeywordEvent(`OGN-157:prowl:${selfOid}`, selfOid as ObjId, OGN_157_KEYWORD)]
      }
      if (state.objects[oid as ObjId] === undefined) return [note]                     
      if (mode === 'dmg2') {
        return [note, {
          kind: 'damage', target: oid as ObjId, amount: OGN_157_DAMAGE,
          sourcePlayer: controller, source: selfOid as ObjId,
        } as GameEvent]
      }
      return [note, { kind: 'stun', target: oid as ObjId } as GameEvent]                
    },
}

export const OGN_157: Card = {
  id: 'OGN-157', cardNo: 'OGN·157/298', name: '乌迪尔', category: 'unit', // 英雄单位 → unit(§178)
  domains: ['orange'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[消耗我的增益]四选一(本回合未选过):2伤 / 眩晕 / 我变活跃 / 我获得[游走](UDYR_SPEC)' },
  ],
}
