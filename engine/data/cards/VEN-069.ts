                                                             
                                  
                  
                                    
                                                 
                                
  
          
                                
                                                           
                                                              
                                                                      
                                                                                    
                       
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isEmpowered } from '../../src/keywords/empower'
import { isUnit } from '../../src/state/cardTypes'

export const VEN_069_CARD_EFFECT =
  '当你打出我时，抽一张牌。\n{{强化3}}（支付{{3}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 你的法术和技能无法被无效化。如果你控制的法术或技能将给予其选作目标的一名单位-{{S}}，则其额外给予{{S}}-1。'

export function makeMelDrawTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-069:play:${selfOid}`, rawId: true, sourceDefId: 'VEN-069',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: () => [{ kind: 'draw', player: controller, count: 1 }],
  }, selfOid, controller)
}

   
                                    
                                
                                              
   
export function melSpellGuard(state: GameState, player: string): boolean {
  return Object.values(state.objects).some((o) =>
    (o.defId === 'VEN-069' || o.defId === 'VEN-069a')
    && o.controller === (player as PlayerId)
    && isUnit(o) && isEmpowered(o)
    && ['base', 'battlefield'].includes(state.zones[o.zone]?.kind as string))
}

export const VEN_069: Card = {
  id: 'VEN-069', cardNo: 'VEN·069', name: '梅尔', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: ['强化3'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '打出我时抽一张牌(makeMelDrawTrigger)' },
    { kind: 'passive', describe: '[强化3]§827 主动技能(通用工厂)' },
    { kind: 'passive', describe: '[已强化>]你的法术技能不可被无效化+负pump额外-1(melSpellGuard→setSpellGuardProvider)' },
  ],
}
