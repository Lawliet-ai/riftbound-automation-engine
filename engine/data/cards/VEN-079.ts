                                                                            
                                                         
                                             
                                                   
                                 
                                                      
  
           
                                                                 
                                                                       
                                           
                                                                        
                                                            
                                                                      
                                                                    
                                                                         
                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isEmpowered } from '../../src/keywords/empower'
import { selfBattlefield } from '../../src/state/selfHere'
import { referencedMight } from './might-common'
import { pumpEvent } from './activated-batch'

export const VEN_079_PICK = 'soulHook'

export const VEN_079_CARD_EFFECT =
  '{{强化5橙色}}（支付{{5}}和{{橙色}}：强化我。仅在未强化时可用。）\n'
  + '{{已强化>}} 当我进攻或防守时，选择此处一名单位。在本回合内将我的战力提升至与其战力相同，然后给予我在本回合内{{S}}+1。'

   
                                                   
  
                                                                      
                                                                           
                                                             
                                
   
function unitsAtMyBattlefield(state: GameState, selfOid: ObjId): string[] {
  const here = selfBattlefield(state, selfOid)
  if (here === undefined) return []
  return (state.zones[here as never]?.contents ?? [])
    .map((oid) => state.objects[oid])
    .filter((o) => o !== undefined && isUnit(o))                                                           
    .map((o) => o!.oid as string)
}

function makeOneDamTrigger(selfOid: ObjId, controller: PlayerId, kind: 'attack' | 'defend'): Trigger {
  return compileTrigger({
    id: `VEN-079:${kind}:${selfOid}`, rawId: true, sourceDefId: 'VEN-079',
    event: kind,
    when: [{
      kind: 'custom',
                                                                          
      test: (ev: GameEvent, state: GameState): boolean => {
        const e = ev as { kind: string; unit?: string }
        if (e.unit !== (selfOid as string)) return false
        const me = state.objects[selfOid]
        return me !== undefined && isEmpowered(me)
      },
    }],
    nextChoice: (state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[VEN_079_PICK] !== undefined) return null
      const cands = unitsAtMyBattlefield(state, selfOid)
      if (cands.length === 0) return null                            
      return {
        itemId: `trig:VEN-079:${kind}:${selfOid}`, controller, key: VEN_079_PICK,
        prompt: '夺魂钩 妲姆:选择此处一名单位(战力提升至与其相同,再+1)',
        isTarget: true, // ★1782 选择此处一名战力大于我的单位
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}(战力 ${referencedMight(state, oid as ObjId)})` })),
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[VEN_079_PICK]
      if (pick === undefined) return []
                           
      if (!unitsAtMyBattlefield(state, selfOid).includes(pick)) return []
      if (state.objects[selfOid] === undefined) return []
      const value = referencedMight(state, pick as ObjId)                         
      return [
        { kind: 'addEffect', effect: {
          id: `VEN-079:set:${selfOid}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { oid: ObjId }) => x.oid === selfOid,
          modification: { kind: 'setMight', value }, // §477.1.a.1 特质层「提升至」
        } } ,
        pumpEvent('VEN-079:plus', selfOid as string, 1), // 「然后…{S}+1」(加成层在特质层后)
      ]
    },
  }, selfOid, controller)
}

export function makeDamTriggers(selfOid: ObjId, controller: PlayerId): Trigger[] {
  return [makeOneDamTrigger(selfOid, controller, 'attack'), makeOneDamTrigger(selfOid, controller, 'defend')]
}

export const VEN_079: Card = {
  id: 'VEN-079', cardNo: 'VEN·079', name: '夺魂钩 妲姆', category: 'unit',
  domains: ['orange'], energy: 5, power: 5, keywords: ['强化5橙色'], // → 工厂生成强化技能
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[强化5橙色];已强化>攻/防时选此处一名单位,战力提至相同再+1(makeDamTriggers)' }],
}
