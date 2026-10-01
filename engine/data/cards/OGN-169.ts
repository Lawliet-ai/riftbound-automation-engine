                                                        
                                                    
                                                      

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import { effectiveMight } from '../../src/state/might'
import { isUnitDefId } from '../cardKinds'
import { isUnit } from '../../src/state/cardTypes'                                         

export const OGN_169_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '让战场上一名不高于3{{S}}的单位返回其所属的手牌。'

                                     
export function galeTargets(state: GameState): ObjId[] {
  const out: ObjId[] = []
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'battlefield') continue
    for (const oid of z.contents) {
      const o = state.objects[oid]
                                                           
                                                                          
                                                      
      if (o && isUnitDefId(o.defId) && isUnit(o) && effectiveMight(o).actual <= 3) out.push(oid as ObjId)
    }
  }
  return out
}

export const OGN_169: Card = {
  id: 'OGN-169',
  cardNo: 'OGN·169/298',
  name: '罡风',
  category: 'spell',
  domains: ['purple'],
  energy: 1,
  keywords: ['反应'],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '弹回战场上一名≤3[M]单位(PlaySpec 于 registry 注册)' }],
}
