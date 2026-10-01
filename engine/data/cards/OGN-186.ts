                                                             
                               
                                
  
                                                   
                                          
                                                                        
                                                                                
                                                                               
                                                               
                                                     
                                                                             
                                                      
                                                                              
                                                           
                                                         
                                                                                    
  
                                               
                                     
                                                                        
                                            
                              
import type { Card } from '../../src/dsl/card'
import { victimIsSelf } from '../../src/keywords/lastRites'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import type { ActivatedSpec } from '../../src/loop/playSpec'

export const OGN_186_CARD_EFFECT =
  '当此牌离场时，抽一张牌，然后召出一枚休眠的符文。\n支付{{紫色}}，{{横置}}：摧毁此牌。'

const OGN_186_ABILITY = 'OGN-186:leaveField'

                                              
function leaveFieldEffect(controller: PlayerId): readonly GameEvent[] {
  return [
    { kind: 'draw', player: controller, count: 1 },
    { kind: 'summonRune', player: controller, count: 1, dormant: true }, // §430.2 休眠召出
  ]
}

                                                          
function justLandedIn(state: GameState, zoneId: ZoneId | undefined, selfOid: ObjId): boolean {
  const z = zoneId === undefined ? undefined : state.zones[zoneId]
  return z !== undefined && z.contents[z.contents.length - 1] === selfOid
}

const ON_FIELD_KINDS = ['base', 'battlefield'] as const
const isFieldZone = (state: GameState, zoneId: ZoneId | undefined): boolean => {
  const k = zoneId === undefined ? undefined : state.zones[zoneId]?.kind
  return k !== undefined && (ON_FIELD_KINDS as readonly string[]).includes(k)
}

   
                                                           
                                       
   
export function makeOwnerlessTreasureTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const base = { sourceOid: selfOid, sourceDefId: 'OGN-186', controller, abilityKey: OGN_186_ABILITY }
  return [
                                                              
    {
      ...base, id: `OGN-186:destroyed:${selfOid}`, event: 'destroyed', by: 'any',
      filter: (ev: GameEvent): boolean =>
        victimIsSelf((ev as { victim?: { oid?: ObjId; postDeathOid?: ObjId } }).victim, selfOid),
      effect: (): readonly GameEvent[] => leaveFieldEffect(controller),
    },
                                                        
    {
      ...base, id: `OGN-186:banished:${selfOid}`, event: 'banished', by: 'any',
      filter: (ev: GameEvent): boolean => (ev as { card?: ObjId }).card === selfOid,
      effect: (): readonly GameEvent[] => leaveFieldEffect(controller),
    },
                                              
    {
      ...base, id: `OGN-186:left:${selfOid}`, event: 'zoneChange', by: 'any',
      filter: (ev: GameEvent, state: GameState): boolean => {
        const e = ev as { from?: ZoneId; to?: ZoneId; defId?: string }
        if (e.defId !== 'OGN-186') return false
        if (!isFieldZone(state, e.from)) return false                
        if (isFieldZone(state, e.to)) return false              
        return justLandedIn(state, e.to, selfOid)
      },
      effect: (): readonly GameEvent[] => leaveFieldEffect(controller),
    },
  ]
}

   
                      
                                                                      
                                                       
                            
   
export const OGN_186_SPEC: ActivatedSpec = {
  key: 'OGN-186:sacrifice',
  label: '支付 1 点混沌符能并{{横置}}:摧毁此牌',
  cost: { pips: [['purple']] },
  tapSelf: true,
  target: 'none',
  makeResolve: ({ selfOid, controller }) => (): readonly GameEvent[] =>
    [{ kind: 'destroy', target: selfOid as ObjId, sourcePlayer: controller }],
}

export const OGN_186: Card = {
  id: 'OGN-186', cardNo: 'OGN·186/298', name: '无主宝藏', category: 'equipment',
  domains: ['purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '离场时抽1并召出一枚休眠符文;付{紫}+横置:摧毁此牌(OGN_186_SPEC)' }],
}
